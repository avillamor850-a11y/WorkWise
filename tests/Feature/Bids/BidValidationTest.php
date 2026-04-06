<?php

namespace Tests\Feature\Bids;

use App\Models\GigJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BidValidationTest extends TestCase
{
    use RefreshDatabase;

    private function setupUsersAndJob(): array
    {
        $employer = User::create([
            'first_name' => 'Emp',
            'last_name' => 'Loyer',
            'email' => 'employer@bids.test',
            'password' => Hash::make('password123'),
            'user_type' => 'employer',
            'profile_status' => 'approved',
        ]);

        $worker = User::create([
            'first_name' => 'Gig',
            'last_name' => 'Worker',
            'email' => 'worker@bids.test',
            'password' => Hash::make('password123'),
            'user_type' => 'gig_worker',
            'profile_status' => 'approved',
        ]);

        $job = GigJob::create([
            'employer_id' => $employer->id,
            'title' => 'Test Job',
            'description' => str_repeat('d', 120),
            'required_skills' => ['PHP'],
            'budget_type' => 'fixed',
            'budget_min' => 100,
            'budget_max' => 200,
            'experience_level' => 'beginner',
            'estimated_duration_days' => 10,
            'status' => 'open',
        ]);

        return [$employer, $worker, $job];
    }

    public function test_proposal_message_minimum_boundary_valid_at_50_chars(): void
    {
        [$_, $worker, $job] = $this->setupUsersAndJob();

        $this->actingAs($worker);

        $msg = str_repeat('x', 50);
        $response = $this->post('/bids', [
            'job_id' => $job->id,
            'bid_amount' => 50,
            'proposal_message' => $msg,
            'estimated_days' => 5,
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('bids', [
            'job_id' => $job->id,
            'gig_worker_id' => $worker->id,
        ]);
    }

    public function test_proposal_message_fails_below_50_chars(): void
    {
        [$_, $worker, $job] = $this->setupUsersAndJob();

        $this->actingAs($worker);

        $msg = str_repeat('x', 49);
        $response = $this->post('/bids', [
            'job_id' => $job->id,
            'bid_amount' => 50,
            'proposal_message' => $msg,
            'estimated_days' => 5,
        ]);

        $response->assertSessionHasErrors(['proposal_message']);
    }
}


