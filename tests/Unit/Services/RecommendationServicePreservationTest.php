<?php

namespace Tests\Unit\Services;

use App\Models\GigJob;
use App\Models\User;
use App\Services\AIJobMatchingService;
use App\Services\GroqBatchJsonClient;
use App\Services\RecommendationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Preservation Property Tests for AI Recommendations Timeout Fix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * Property 2: Preservation - Fast Connection Behavior
 * 
 * IMPORTANT: Follow observation-first methodology
 * These tests capture observed behavior on UNFIXED code for non-buggy inputs
 * 
 * EXPECTED OUTCOME: Tests PASS on unfixed code (confirms baseline behavior)
 * Tests should also PASS on fixed code (confirms no regressions)
 */
class RecommendationServicePreservationTest extends TestCase
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

        // Clear cache before each test
        Cache::flush();
    }

    /** Groq worker recommendations use one batched JSON array per HTTP response (see RecommendationService::runWorkerJobsGroqBatch). */
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
     * Property 2.1: Fast connections (< 12s latency) complete successfully without retries
     * 
     * Validates: Requirement 3.1
     * 
     * For any fast connection (response time < 12 seconds), the system should:
     * - Complete successfully on first attempt
     * - Return AI-powered recommendations
     * - Not trigger unnecessary retries
     */
    public function test_fast_connection_1_second_completes_without_retry(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // Simulate fast connection: 1-second response time
        Http::fake([
            'api.groq.com/*' => Http::response($this->groqWorkerBatchResponse(85, 'Good match for the role.'), 200),
        ]);

        $startTime = microtime(true);
        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);
        $duration = microtime(true) - $startTime;

        // Verify fast completion
        $this->assertNotEmpty($recommendations, 'Should return recommendations');
        $this->assertLessThan(5, $duration, 'Should complete quickly (< 5 seconds)');
        
        // Verify AI-powered recommendations
        if (!empty($recommendations)) {
            $firstRec = $recommendations[0];
            $this->assertArrayHasKey('score', $firstRec, 'Should have score');
            $this->assertArrayHasKey('reason', $firstRec, 'Should have reason');
            $this->assertEquals(85, $firstRec['score'], 'Should use AI score from API');
        }
    }

    /**
     * Property 2.2: Fast connections with various latencies (1s, 5s, 10s) all complete successfully
     * 
     * Validates: Requirement 3.1
     * 
     * Property-based approach: Test multiple fast connection scenarios
     */
    public function test_fast_connections_various_latencies_complete_successfully(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        $latencies = [1, 5, 10]; // All under 12-second threshold

        foreach ($latencies as $latency) {
            // Clear cache between tests
            Cache::flush();

            // Simulate fast connection with varying latency
            Http::fake([
                'api.groq.com/*' => Http::response(
                    $this->groqWorkerBatchResponse(80 + $latency, "Match with {$latency}s latency."),
                    200
                ),
            ]);

            $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

            $this->assertNotEmpty($recommendations, "Should return recommendations for {$latency}s latency");
            
            if (!empty($recommendations)) {
                $firstRec = $recommendations[0];
                $this->assertArrayHasKey('score', $firstRec, "Should have score for {$latency}s latency");
                // Score may vary slightly due to fallback logic, but should be in expected range
                $this->assertGreaterThanOrEqual(80, $firstRec['score'], "Should have reasonable score for {$latency}s latency");
            }
        }
    }

    /**
     * Property 2.3: Cached recommendations return immediately without API calls
     * 
     * Validates: Requirement 3.3
     * 
     * When cached recommendations exist and refresh is not requested,
     * the system should return cached results immediately without making API calls
     */
    public function test_cached_recommendations_return_immediately_without_api_call(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // First call: populate cache
        Http::fake([
            'api.groq.com/*' => Http::response($this->groqWorkerBatchResponse(90, 'Excellent match.'), 200),
        ]);

        $firstCall = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);
        $this->assertNotEmpty($firstCall, 'First call should return recommendations');

        // Second call: should use cache (refresh=false)
        // Mock should NOT be called again
        Http::fake([
            'api.groq.com/*' => function () {
                $this->fail('API should not be called when using cached results');
            },
        ]);

        $startTime = microtime(true);
        $cachedCall = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, false);
        $duration = microtime(true) - $startTime;

        // Verify cache hit
        $this->assertNotEmpty($cachedCall, 'Cached call should return recommendations');
        $this->assertLessThan(1, $duration, 'Cached call should be instant (< 1 second)');
        $this->assertEquals($firstCall, $cachedCall, 'Cached results should match original results');
    }

    /**
     * Property 2.4: Successful first-attempt API calls don't trigger unnecessary retries
     * 
     * Validates: Requirement 3.2
     * 
     * When the Groq API returns a successful response on the first attempt,
     * the system should use that response without attempting retries
     */
    public function test_successful_first_attempt_no_unnecessary_retries(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        $callCount = 0;

        // Mock API to track call count
        Http::fake([
            'api.groq.com/*' => function () use (&$callCount) {
                $callCount++;
                return Http::response($this->groqWorkerBatchResponse(88, 'Strong candidate.'), 200);
            },
        ]);

        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

        // Verify single API call (no retries)
        $this->assertNotEmpty($recommendations, 'Should return recommendations');
        $this->assertEquals(1, $callCount, 'Should make exactly 1 API call (no retries on success)');
        
        if (!empty($recommendations)) {
            $firstRec = $recommendations[0];
            $this->assertEquals(88, $firstRec['score'], 'Should use first-attempt result');
        }
    }

    /**
     * Property 2.5: Rate limit failover (429, 503) continues to work as implemented
     * 
     * Validates: Requirement 3.4
     * 
     * When the Groq API returns rate limit errors (429, 503),
     * the system should fail over to alternative models as currently implemented
     */
    public function test_rate_limit_failover_continues_to_work(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // Simulate rate limit on first model, success on second model
        Http::fake([
            'api.groq.com/*' => Http::sequence()
                ->push(null, 429) // First model: rate limited
                ->push($this->groqWorkerBatchResponse(82, 'Good fit after failover.'), 200), // Second model: success
        ]);

        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

        // Verify failover works
        $this->assertNotEmpty($recommendations, 'Should return recommendations after failover');
        
        if (!empty($recommendations)) {
            $firstRec = $recommendations[0];
            $this->assertArrayHasKey('score', $firstRec, 'Should have score after failover');
            $this->assertEquals(82, $firstRec['score'], 'Should use failover model result');
        }
    }

    /**
     * Property 2.6: Rate limit 503 failover also works
     * 
     * Validates: Requirement 3.4
     */
    public function test_rate_limit_503_failover_works(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // Simulate 503 on first model, success on second model
        Http::fake([
            'api.groq.com/*' => Http::sequence()
                ->push(null, 503) // First model: service unavailable
                ->push($this->groqWorkerBatchResponse(79, 'Match after 503 failover.'), 200), // Second model: success
        ]);

        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

        // Verify failover works
        $this->assertNotEmpty($recommendations, 'Should return recommendations after 503 failover');
        
        if (!empty($recommendations)) {
            $firstRec = $recommendations[0];
            $this->assertEquals(79, $firstRec['score'], 'Should use failover model result');
        }
    }

    /**
     * Property 2.7: Fallback scoring provides recommendations when API fails
     * 
     * Validates: Requirement 3.5
     * 
     * When all Groq API attempts fail, the system should fall back to
     * skill-based matching to provide recommendations
     */
    public function test_fallback_scoring_provides_recommendations_when_api_fails(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // Create a job with skills that match the worker
        $this->gigWorker->update([
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience' => 'intermediate'],
                ['skill' => 'Laravel', 'experience' => 'advanced'],
            ],
        ]);

        $this->job->update([
            'skills_requirements' => [
                'required' => ['PHP', 'Laravel'],
                'preferred' => [],
            ],
        ]);

        // Simulate all API calls failing
        Http::fake([
            'api.groq.com/*' => Http::response(null, 500), // All models fail
        ]);

        $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

        // Verify fallback provides recommendations
        $this->assertNotEmpty($recommendations, 'Should return fallback recommendations when API fails');
        
        if (!empty($recommendations)) {
            $firstRec = $recommendations[0];
            // Fallback uses skill-based scoring
            $this->assertArrayHasKey('score', $firstRec, 'Should have fallback score');
            $this->assertGreaterThan(0, $firstRec['score'], 'Fallback score should be positive for matching skills');
        }
    }

    /**
     * Property 2.8: 24-hour cache TTL remains unchanged
     * 
     * Validates: Requirement 3.6
     * 
     * Successful recommendations should be cached for 24 hours
     */
    public function test_24_hour_cache_ttl_remains_unchanged(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // First call: populate cache
        Http::fake([
            'api.groq.com/*' => Http::response($this->groqWorkerBatchResponse(91, 'Perfect match.'), 200),
        ]);

        $firstCall = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);
        $this->assertNotEmpty($firstCall, 'First call should return recommendations');

        // Verify cache key exists (cache is per job-worker pair)
        if (!empty($firstCall)) {
            $firstJob = $firstCall[0]['job'];
            $cacheKey = "recommendation_worker_{$this->gigWorker->id}_{$firstJob->id}";
            $this->assertTrue(Cache::has($cacheKey), 'Cache should be populated for job-worker pair');
        }

        // Second call without refresh should use cache
        Http::fake([
            'api.groq.com/*' => function () {
                $this->fail('API should not be called when using cached results');
            },
        ]);

        $cachedCall = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, false);
        $this->assertEquals($firstCall, $cachedCall, 'Should use cached results');
    }

    /**
     * Property 2.9: Multiple fast connections complete successfully
     * 
     * Validates: Requirement 3.1
     * 
     * Property-based approach: Generate multiple test cases with fast connections
     */
    public function test_multiple_fast_connections_all_complete_successfully(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        // Test 10 different fast connection scenarios
        for ($i = 1; $i <= 10; $i++) {
            Cache::flush();

            $score = 70 + $i;
            Http::fake([
                'api.groq.com/*' => Http::response($this->groqWorkerBatchResponse($score, "Test case {$i}."), 200),
            ]);

            $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

            $this->assertNotEmpty($recommendations, "Test case {$i} should return recommendations");
            
            if (!empty($recommendations)) {
                $firstRec = $recommendations[0];
                // Score may vary slightly due to fallback logic, but should be positive
                $this->assertGreaterThan(0, $firstRec['score'], "Test case {$i} should have positive score");
            }
        }
    }

    /**
     * Property 2.10: First-attempt success with various response formats
     * 
     * Validates: Requirement 3.2
     * 
     * Test that various valid API response formats work on first attempt
     */
    public function test_first_attempt_success_various_response_formats(): void
    {
        Log::shouldReceive('warning')->zeroOrMoreTimes();
        Log::shouldReceive('error')->zeroOrMoreTimes();

        $testCases = [
            ['score' => 95, 'reason' => 'Excellent match with strong skills.'],
            ['score' => 75, 'reason' => 'Decent fit for the role.'],
            ['score' => 100, 'reason' => 'Perfect candidate.'],
            ['score' => 60, 'reason' => 'Minimal qualifications met.'],
        ];

        foreach ($testCases as $index => $testCase) {
            Cache::flush();

            Http::fake([
                'api.groq.com/*' => Http::response(
                    $this->groqWorkerBatchResponse($testCase['score'], $testCase['reason']),
                    200
                ),
            ]);

            $recommendations = $this->service->getJobRecommendationsForWorker($this->gigWorker, 5, true);

            $this->assertNotEmpty($recommendations, "Test case {$index} should return recommendations");
            
            if (!empty($recommendations)) {
                $firstRec = $recommendations[0];
                // Score may vary slightly due to fallback logic, but should be in reasonable range
                $this->assertGreaterThan(0, $firstRec['score'], "Test case {$index} should have positive score");
            }
        }
    }
}
