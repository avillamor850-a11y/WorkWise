<?php

namespace Tests\Feature\Jobs;

use App\Models\GigJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class JobsIndexSortTest extends TestCase
{
    use RefreshDatabase;

    public function test_jobs_index_sorts_by_created_at_ascending(): void
    {
        $employer = User::factory()->create([
            'user_type' => 'employer',
            'profile_status' => 'approved',
        ]);

        $jobOlder = GigJob::factory()->create([
            'employer_id' => $employer->id,
            'status' => 'open',
            'hidden_by_admin' => false,
        ]);
        $jobOlder->forceFill(['created_at' => now()->subDays(3)])->saveQuietly();

        $jobNewer = GigJob::factory()->create([
            'employer_id' => $employer->id,
            'status' => 'open',
            'hidden_by_admin' => false,
        ]);
        $jobNewer->forceFill(['created_at' => now()->subDay()])->saveQuietly();

        $gigWorker = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_status' => 'approved',
        ]);

        $response = $this->actingAs($gigWorker)->get('/jobs?direction=asc');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Jobs/Index')
            ->where('filters.direction', 'asc')
            ->where('jobs.data.0.id', $jobOlder->id)
            ->where('jobs.data.1.id', $jobNewer->id)
        );
    }

    public function test_jobs_index_sorts_by_created_at_descending(): void
    {
        $employer = User::factory()->create([
            'user_type' => 'employer',
            'profile_status' => 'approved',
        ]);

        $jobOlder = GigJob::factory()->create([
            'employer_id' => $employer->id,
            'status' => 'open',
            'hidden_by_admin' => false,
        ]);
        $jobOlder->forceFill(['created_at' => now()->subDays(3)])->saveQuietly();

        $jobNewer = GigJob::factory()->create([
            'employer_id' => $employer->id,
            'status' => 'open',
            'hidden_by_admin' => false,
        ]);
        $jobNewer->forceFill(['created_at' => now()->subDay()])->saveQuietly();

        $gigWorker = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_status' => 'approved',
        ]);

        $response = $this->actingAs($gigWorker)->get('/jobs?direction=desc');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Jobs/Index')
            ->where('filters.direction', 'desc')
            ->where('jobs.data.0.id', $jobNewer->id)
            ->where('jobs.data.1.id', $jobOlder->id)
        );
    }

    public function test_jobs_index_defaults_to_desc_for_invalid_direction(): void
    {
        $employer = User::factory()->create([
            'user_type' => 'employer',
            'profile_status' => 'approved',
        ]);

        $jobOlder = GigJob::factory()->create([
            'employer_id' => $employer->id,
            'status' => 'open',
            'hidden_by_admin' => false,
        ]);
        $jobOlder->forceFill(['created_at' => now()->subDays(3)])->saveQuietly();

        $jobNewer = GigJob::factory()->create([
            'employer_id' => $employer->id,
            'status' => 'open',
            'hidden_by_admin' => false,
        ]);
        $jobNewer->forceFill(['created_at' => now()->subDay()])->saveQuietly();

        $gigWorker = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_status' => 'approved',
        ]);

        $response = $this->actingAs($gigWorker)->get('/jobs?direction=invalid');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Jobs/Index')
            ->where('filters.direction', 'desc')
            ->where('jobs.data.0.id', $jobNewer->id)
            ->where('jobs.data.1.id', $jobOlder->id)
        );
    }
}
