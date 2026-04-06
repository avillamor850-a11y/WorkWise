<?php

namespace Tests\Unit\Services;

use App\Models\GigJob;
use App\Models\User;
use App\Services\AIJobMatchingService;
use App\Services\GroqBatchJsonClient;
use App\Services\RecommendationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Bug Condition Exploration Test for AI Recommendations Timeout Fix
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 * 
 * Property 1: Bug Condition - Slow Connection API Completion
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * GOAL: Surface counterexamples that demonstrate the bug exists
 * 
 * Scoped PBT Approach: Tests network latency between 12-30 seconds
 */
class RecommendationServiceBugConditionTest extends TestCase
{
    use RefreshDatabase;

    private RecommendationService $service;
    private User $gigWorker;
    private GigJob $job;

    protected function setUp(): void
    {
        parent::setUp();

        // Configure Groq API
        config([
            'services.groq.api_key' => 'test-key',
            'services.groq.base_url' => 'https://api.groq.com/openai/v1',
        ]);

        // Create test user and job
        $this->gigWorker = User::factory()->create([
            'user_type' => 'gig_worker',
            'name' => 'Test Worker',
        ]);

        $this->job = GigJob::factory()->create([
            'title' => 'Test Job',
            'description' => 'Test job description',
            'status' => 'open',
        ]);

        // Initialize service
        $aiJobMatchingService = $this->app->make(AIJobMatchingService::class);
        $groqBatch = $this->app->make(GroqBatchJsonClient::class);
        $this->service = new RecommendationService($aiJobMatchingService, $groqBatch);
    }

    /** Groq worker recommendations use one batched JSON array per HTTP response. */
    protected function groqWorkerBatchResponse(int $score, string $reason): array
    {
        return [
            'choices' => [
                [
                    'message' => [
                        'content' => json_encode([[
                            'job_id' => $this->job->id,
                            'score' => $score,
                            'reason' => $reason,
                        ]]),
                    ],
                ],
            ],
        ];
    }

    /**
     * Test Case 1: API call with 15-second latency should complete successfully with retry
     * 
     * Expected on UNFIXED code: FAILS - timeout at 12 seconds, no retry
     * Expected on FIXED code: PASSES - retries and completes within 30 seconds
     */
    public function test_slow_connection_15_second_latency_completes_with_retry(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // Simulate 15-second latency: first call times out, second call succeeds
        Http::fake([
            'api.groq.com/*' => Http::sequence()
                ->push(null, 408) // First attempt: timeout (simulating 12s timeout)
                ->push($this->groqWorkerBatchResponse(85, 'Good match for the role.'), 200), // Second attempt: success
        ]);

        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

        // Expected behavior: API call completes successfully with retry
        $this->assertNotEmpty($recommendations, 'Should return recommendations after retry');
        $this->assertGreaterThan(0, count($recommendations), 'Should have at least one recommendation');
        
        // Verify AI-powered recommendations (not fallback)
        if (!empty($recommendations)) {
            $firstRec = $recommendations[0];
            $this->assertArrayHasKey('score', $firstRec, 'Should have score (not fallback)');
            $this->assertArrayHasKey('reason', $firstRec, 'Should have reason (not fallback)');
            $this->assertGreaterThan(70, $firstRec['score'], 'Should have high score from AI (not fallback)');
        }
    }

    /**
     * Test Case 2: API call with 20-second latency should complete with extended timeout
     * 
     * Expected on UNFIXED code: FAILS - timeout at 12 seconds, exhausts 18s budget
     * Expected on FIXED code: PASSES - completes within 30s timeout and 45s budget
     */
    public function test_slow_connection_20_second_latency_completes_within_budget(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // Simulate 20-second latency: first two calls timeout, third succeeds
        Http::fake([
            'api.groq.com/*' => Http::sequence()
                ->push(null, 408) // First attempt: timeout
                ->push(null, 408) // Second attempt: timeout
                ->push($this->groqWorkerBatchResponse(78, 'Decent fit.'), 200), // Third attempt: success
        ]);

        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

        // Expected behavior: Completes within extended budget
        $this->assertNotEmpty($recommendations, 'Should return recommendations within extended budget');
        
        if (!empty($recommendations)) {
            $firstRec = $recommendations[0];
            $this->assertArrayHasKey('score', $firstRec, 'Should have score');
            $this->assertGreaterThan(0, $firstRec['score'], 'Should have positive score');
        }
    }

    /**
     * Test Case 3: Multiple jobs with slow connections should complete within MAX_PROCESS_TIME
     * 
     * Expected on UNFIXED code: FAILS - loop terminates at 20s with incomplete results
     * Expected on FIXED code: PASSES - completes all jobs within 60s MAX_PROCESS_TIME
     */
    public function test_multiple_jobs_slow_connection_completes_all_recommendations(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        GigJob::factory()->count(5)->create([
            'status' => 'open',
        ]);

        $jobIds = GigJob::query()->where('status', 'open')->orderBy('id')->pluck('id')->all();
        $rows = [];
        foreach ($jobIds as $i => $jid) {
            $rows[] = [
                'job_id' => (int) $jid,
                'score' => 70 + min($i, 4),
                'reason' => "Match for job {$jid}.",
            ];
        }

        // Batched scoring: one Groq round-trip after an initial failed attempt
        Http::fake([
            'api.groq.com/*' => Http::sequence()
                ->push(null, 408)
                ->push(['choices' => [['message' => ['content' => json_encode($rows)]]]], 200),
        ]);

        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 10, true);

        // Expected behavior: All jobs processed within extended time limit
        $this->assertGreaterThanOrEqual(5, count($recommendations), 
            'Should process all 5 jobs within extended MAX_PROCESS_TIME (60s)');
    }

    /**
     * Test Case 4: Transient network issue should trigger retry logic
     * 
     * Expected on UNFIXED code: FAILS - no retry, falls back immediately
     * Expected on FIXED code: PASSES - retries and succeeds
     */
    public function test_transient_network_issue_triggers_retry(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // Simulate transient network issue: timeout then success
        Http::fake([
            'api.groq.com/*' => Http::sequence()
                ->push(null, 408) // Transient timeout
                ->push($this->groqWorkerBatchResponse(92, 'Excellent match.'), 200), // Retry succeeds
        ]);

        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

        // Expected behavior: Retry succeeds, returns AI recommendations
        $this->assertNotEmpty($recommendations, 'Should retry and return recommendations');
        
        if (!empty($recommendations)) {
            $firstRec = $recommendations[0];
            $this->assertArrayHasKey('score', $firstRec, 'Should use score after retry');
            $this->assertArrayHasKey('reason', $firstRec, 'Should use reason after retry');
            $this->assertGreaterThan(80, $firstRec['score'], 'Should have high score (not fallback)');
        }
    }

    /**
     * Test Case 5: Model failover with slow connections should complete within extended budget
     * 
     * Expected on UNFIXED code: FAILS - exhausts 18s budget during failover
     * Expected on FIXED code: PASSES - completes within 45s budget with retries
     */
    public function test_model_failover_slow_connection_completes_within_extended_budget(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // Simulate first model times out, second model succeeds after retry
        Http::fake([
            'api.groq.com/*' => Http::sequence()
                ->push(null, 408) // First model, first attempt: timeout
                ->push(null, 408) // First model, second attempt: timeout
                ->push(null, 503) // Second model, first attempt: rate limited (triggers failover)
                ->push($this->groqWorkerBatchResponse(88, 'Strong candidate.'), 200), // Second model: success
        ]);

        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

        // Expected behavior: Completes with model failover and retries
        $this->assertNotEmpty($recommendations, 'Should complete with model failover and retries');
        
        if (!empty($recommendations)) {
            $firstRec = $recommendations[0];
            $this->assertArrayHasKey('score', $firstRec, 'Should have score after failover');
            $this->assertGreaterThan(0, $firstRec['score'], 'Should have positive score after failover');
        }
    }
}
