<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        session(['selected_user_type' => 'gig_worker']);
        $response = $this->get('/register');
        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        session(['selected_user_type' => 'gig_worker']);

        $response = $this->post('/register', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'user_type' => 'gig_worker',
            'terms_agreed' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('gig-worker.onboarding', absolute: false));
    }
}
