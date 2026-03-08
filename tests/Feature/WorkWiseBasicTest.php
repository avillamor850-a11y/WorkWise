<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\GigJob;
use App\Models\Bid;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkWiseBasicTest extends TestCase
{
    use RefreshDatabase;

    public function test_welcome_page_loads(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
    }

    public function test_user_can_register_as_freelancer(): void
    {
        session(['selected_user_type' => 'gig_worker']);

        $response = $this->post('/register', [
            'first_name' => 'Test',
            'last_name' => 'Freelancer',
            'email' => 'freelancer@test.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'user_type' => 'gig_worker',
            'terms_agreed' => true,
        ]);

        $response->assertRedirect(route('gig-worker.onboarding', absolute: false));
        $this->assertDatabaseHas('users', [
            'email' => 'freelancer@test.com',
            'user_type' => 'gig_worker',
        ]);
    }

    public function test_user_can_register_as_client(): void
    {
        session(['selected_user_type' => 'employer']);

        $response = $this->post('/register', [
            'first_name' => 'Test',
            'last_name' => 'Client',
            'email' => 'client@test.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'user_type' => 'employer',
            'terms_agreed' => true,
        ]);

        $response->assertRedirect(route('employer.onboarding', absolute: false));
        $this->assertDatabaseHas('users', [
            'email' => 'client@test.com',
            'user_type' => 'employer',
        ]);
    }

    public function test_client_can_create_job(): void
    {
        $client = User::factory()->create(['user_type' => 'client']);

        $response = $this->actingAs($client)->post('/jobs', [
            'title' => 'Test Job',
            'description' => 'This is a test job description.',
            'required_skills' => ['PHP', 'Laravel'],
            'budget_type' => 'fixed',
            'budget_min' => 1000,
            'budget_max' => 2000,
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 30,
            'is_remote' => true,
        ]);

        $this->assertDatabaseHas('gig_jobs', [
            'title' => 'Test Job',
            'employer_id' => $client->id,
        ]);
    }

    public function test_freelancer_can_submit_bid(): void
    {
        $client = User::factory()->create(['user_type' => 'client']);
        $freelancer = User::factory()->create(['user_type' => 'freelancer']);

        $job = GigJob::factory()->create([
            'employer_id' => $client->id,
            'title' => 'Test Job',
            'status' => 'open',
        ]);

        $response = $this->actingAs($freelancer)->post('/bids', [
            'job_id' => $job->id,
            'bid_amount' => 1500,
            'proposal_message' => 'This is a test proposal message that is long enough to meet the minimum requirements.',
            'estimated_days' => 25,
        ]);

        $this->assertDatabaseHas('bids', [
            'job_id' => $job->id,
            'freelancer_id' => $freelancer->id,
            'bid_amount' => 1500,
        ]);
    }

    public function test_jobs_index_page_loads(): void
    {
        $response = $this->get('/jobs');
        $response->assertStatus(200);
    }

    public function test_authenticated_user_can_access_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/dashboard');
        $response->assertStatus(200);
    }

    public function test_role_selection_page_loads(): void
    {
        $response = $this->get('/role-selection');
        $response->assertStatus(200);
    }

    public function test_role_selection_redirects_to_register(): void
    {
        $response = $this->post('/role-selection', [
            'user_type' => 'gig_worker'
        ]);

        $response->assertRedirect('/register');
        $this->assertEquals('gig_worker', session('selected_user_type'));
    }

    public function test_register_redirects_to_role_selection_without_session(): void
    {
        $response = $this->get('/register');
        $response->assertRedirect('/role-selection');
    }

    /**
     * Duplicate request handling: repeated join with same user_type in short time
     * does not create duplicate entries and returns consistent success.
     */
    public function test_join_handles_duplicate_request_idempotent(): void
    {
        $payload = ['user_type' => 'gig_worker'];

        $first = $this->postJson('/role-selection', $payload);
        $first->assertStatus(200)
            ->assertJson(['status' => 'ok', 'user_type' => 'gig_worker']);
        $this->assertEquals('gig_worker', session('selected_user_type'));

        $second = $this->postJson('/role-selection', $payload);
        $second->assertStatus(200)
            ->assertJson(['status' => 'already_selected', 'user_type' => 'gig_worker']);
        $this->assertEquals('gig_worker', session('selected_user_type'));
    }
}
