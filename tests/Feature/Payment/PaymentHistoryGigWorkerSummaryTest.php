<?php

namespace Tests\Feature\Payment;

use App\Models\Bid;
use App\Models\GigJob;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentHistoryGigWorkerSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_gig_worker_payment_history_shows_pending_net_and_platform_fee_for_active_job(): void
    {
        $employer = User::factory()->create(['user_type' => 'employer', 'profile_status' => 'approved']);
        $worker = User::factory()->create(['user_type' => 'gig_worker', 'profile_status' => 'approved']);

        $job = GigJob::factory()->create(['employer_id' => $employer->id]);
        $bid = Bid::factory()->create([
            'job_id' => $job->id,
            'gig_worker_id' => $worker->id,
            'bid_amount' => 500.00,
            'status' => 'accepted',
        ]);

        Project::factory()->create([
            'employer_id' => $employer->id,
            'gig_worker_id' => $worker->id,
            'job_id' => $job->id,
            'bid_id' => $bid->id,
            'status' => 'active',
            'agreed_amount' => 500.00,
            'platform_fee' => 25.00,
            'net_amount' => 475.00,
            'payment_released' => false,
        ]);

        $response = $this->actingAs($worker)->get(route('payment.history'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('summary.pending_releases', 475)
            ->where('summary.platform_fees', 25)
            ->where('summary.total_earned', 0));
    }
}
