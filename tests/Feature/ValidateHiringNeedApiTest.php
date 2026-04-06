<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ValidateHiringNeedApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_validate_hiring_need(): void
    {
        $response = $this->postJson('/api/onboarding/validate-hiring-need', [
            'description' => 'Web design for small business',
        ]);

        $response->assertStatus(401);
    }

    public function test_validates_description_required(): void
    {
        $user = User::factory()->create([
            'user_type' => 'employer',
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($user)->postJson('/api/onboarding/validate-hiring-need', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['description']);
    }

    public function test_accepts_when_groq_key_missing(): void
    {
        $user = User::factory()->create([
            'user_type' => 'employer',
            'email_verified_at' => now(),
        ]);

        $prev = getenv('GROQ_API_KEY');
        putenv('GROQ_API_KEY');

        try {
            $response = $this->actingAs($user)->postJson('/api/onboarding/validate-hiring-need', [
                'description' => 'Licensed electrical inspections',
            ]);

            $response->assertOk()
                ->assertJson([
                    'valid' => true,
                ])
                ->assertJsonStructure(['valid', 'message']);
        } finally {
            if ($prev !== false) {
                putenv('GROQ_API_KEY='.$prev);
            } else {
                putenv('GROQ_API_KEY');
            }
        }
    }

    public function test_groq_yes_response_marks_valid(): void
    {
        $user = User::factory()->create([
            'user_type' => 'employer',
            'email_verified_at' => now(),
        ]);

        $prev = getenv('GROQ_API_KEY');
        putenv('GROQ_API_KEY=fake-test-key');

        try {
            Http::fake([
                'https://api.groq.com/openai/v1/chat/completions' => Http::response([
                    'choices' => [
                        ['message' => ['content' => 'yes']],
                    ],
                ], 200),
            ]);

            $response = $this->actingAs($user)->postJson('/api/onboarding/validate-hiring-need', [
                'description' => 'Corporate event photography',
            ]);

            $response->assertOk()
                ->assertJson([
                    'valid' => true,
                ]);
        } finally {
            if ($prev !== false) {
                putenv('GROQ_API_KEY='.$prev);
            } else {
                putenv('GROQ_API_KEY');
            }
        }
    }

    public function test_groq_no_response_marks_invalid(): void
    {
        $user = User::factory()->create([
            'user_type' => 'employer',
            'email_verified_at' => now(),
        ]);

        $prev = getenv('GROQ_API_KEY');
        putenv('GROQ_API_KEY=fake-test-key');

        try {
            Http::fake([
                'https://api.groq.com/openai/v1/chat/completions' => Http::response([
                    'choices' => [
                        ['message' => ['content' => 'no']],
                    ],
                ], 200),
            ]);

            $response = $this->actingAs($user)->postJson('/api/onboarding/validate-hiring-need', [
                'description' => 'asdfghjkl nonsense spam',
            ]);

            $response->assertOk()
                ->assertJson([
                    'valid' => false,
                ]);
        } finally {
            if ($prev !== false) {
                putenv('GROQ_API_KEY='.$prev);
            } else {
                putenv('GROQ_API_KEY');
            }
        }
    }
}
