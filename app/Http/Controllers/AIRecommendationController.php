<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\MatchService;
use App\Services\RecommendationService;
use App\Models\GigJob;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Http;
use App\Services\AIJobMatchingService;

class AIRecommendationController extends Controller
{
    private MatchService $matchService;
    private RecommendationService $recommendationService;

    public function __construct(MatchService $matchService, RecommendationService $recommendationService)
    {
        $this->matchService = $matchService;
        $this->recommendationService = $recommendationService;
    }

    /**
     * Show employer-specific AI matches
     */
    public function employerMatches(Request $request): Response
    {
        $user = auth()->user();
        if ($user->user_type !== 'employer') {
            return redirect()->route('ai.recommendations');
        }

        $recommendations = [];
        $singleJobId = null;

        try {
            set_time_limit(25);

            $refresh = $request->query('refresh') === '1';
            $requestedJobId = $request->query('job_id');

            if ($requestedJobId) {
                $job = $user->postedJobs()
                    ->where('status', 'open')
                    ->where('id', $requestedJobId)
                    ->first();

                if ($job) {
                    $singleJobId = $job->id;
                    $recommendations[$job->id] = [
                        'job' => $job,
                        'matches' => $this->matchService->getJobMatches($job, 5, $refresh)
                    ];
                }
            }
            // When no job_id: do not load any matches; employer must choose a job first
        } catch (\Exception $e) {
            \Log::error('Employer AI matches error: ' . $e->getMessage());
        }

        $openJobs = $user->postedJobs()->where('status', 'open')->orderByDesc('created_at')->get(['id', 'title', 'created_at']);

        // Add encrypted context token to each match so "View Profile" uses ?ctx= instead of raw query params
        foreach ($recommendations as $jobId => $data) {
            $job = $data['job'];
            $budgetDisplay = ($job->budget_min !== null && $job->budget_max !== null)
                ? "₱{$job->budget_min} - ₱{$job->budget_max}"
                : 'Negotiable';
            $token = encrypt([
                'job_id' => $job->id,
                'job_title' => $job->title ?? '',
                'job_budget' => $budgetDisplay,
            ]);
            $recommendations[$jobId]['matches'] = array_map(function ($m) use ($token) {
                $m['profile_context_token'] = $token;
                return $m;
            }, $data['matches']);
        }

        return Inertia::render('AI/AimatchEmployer', [
            'recommendations' => $recommendations,
            'skills' => $this->getUniqueSkills(),
            'singleJobId' => $singleJobId,
            'openJobs' => $openJobs,
        ]);
    }

    /**
     * Show gig worker-specific AI job matches
     */
    public function gigWorkerMatches(): Response
    {
        $user = auth()->user();
        if ($user->user_type !== 'gig_worker') {
            return redirect()->route('ai.recommendations');
        }

        $recommendations = [];
        try {
            set_time_limit(25);
            $refresh = request()->query('refresh') === '1';
            $recommendations = $this->matchService->getRecommendedJobs($user, 5, $refresh);
        } catch (\Exception $e) {
            \Log::error('Gig worker AI recommendations error: ' . $e->getMessage());
        }

        return Inertia::render('AI/AimatchGigWorker', [
            'recommendations' => $recommendations,
            'skills' => $this->getUniqueSkills(),
        ]);
    }

    /**
     * Show employer-specific AI recommendations (Competence + Trust).
     * Separate from aimatch/employer which is competence-only.
     */
    public function employerRecommendations(Request $request): Response
    {
        $user = auth()->user();
        if ($user->user_type !== 'employer') {
            return redirect()->route('ai.recommendations');
        }

        $recommendations = [];
        $singleJobId = null;

        try {
            set_time_limit(25);
            $refresh = in_array($request->query('refresh'), [1, '1', true], true);
            $requestedJobId = $request->query('job_id');

            if ($requestedJobId) {
                $job = $user->postedJobs()
                    ->where('status', 'open')
                    ->where('id', $requestedJobId)
                    ->first();

                if ($job) {
                    $singleJobId = $job->id;
                    $matches = $this->recommendationService->getJobRecommendationsForEmployer($job, 5, $refresh);
                    $recommendations[$job->id] = [
                        'job' => $job,
                        'matches' => $matches,
                    ];
                }
            }
            // When no job_id: do not load any matches; employer must choose a job first
        } catch (\Exception $e) {
            \Log::error('Employer AI recommendations error: ' . $e->getMessage());
        }

        $openJobs = $user->postedJobs()->where('status', 'open')->orderByDesc('created_at')->get(['id', 'title', 'created_at']);

        foreach ($recommendations as $jobId => $data) {
            $job = $data['job'];
            $budgetDisplay = ($job->budget_min !== null && $job->budget_max !== null)
                ? "₱{$job->budget_min} - ₱{$job->budget_max}"
                : 'Negotiable';
            $token = encrypt([
                'job_id' => $job->id,
                'job_title' => $job->title ?? '',
                'job_budget' => $budgetDisplay,
            ]);
            $recommendations[$jobId]['matches'] = array_map(function ($m) use ($token) {
                $m['profile_context_token'] = $token;
                return $m;
            }, $data['matches']);
        }

        return Inertia::render('AI/RecommendationsEmployer', [
            'recommendations' => $recommendations,
            'skills' => $this->getUniqueSkills(),
            'singleJobId' => $singleJobId,
            'openJobs' => $openJobs,
        ]);
    }

    /**
     * Show gig worker-specific AI job recommendations (Relevance + Quality).
     * Separate from aimatch/gig-worker which is competence-only.
     */
    public function gigWorkerRecommendations(Request $request): Response
    {
        $user = auth()->user();
        if ($user->user_type !== 'gig_worker') {
            return redirect()->route('ai.recommendations');
        }

        $recommendations = [];
        $hasError = false;
        try {
            set_time_limit(25);
            $refresh = in_array($request->query('refresh'), [1, '1', true], true);
            $recommendations = $this->recommendationService->getJobRecommendationsForWorker($user, 10, $refresh);
        } catch (\Exception $e) {
            \Log::error('Gig worker AI recommendations (quality) error: ' . $e->getMessage());
            $hasError = true;
        }

        return Inertia::render('AI/RecommendationsGigWorker', [
            'recommendations' => $recommendations,
            'skills' => $this->getUniqueSkills(),
            'hasError' => $hasError,
        ]);
    }

    /**
     * Normalize a single skill element to a trimmed string.
     * Handles both flat strings and nested arrays (e.g. ['skill' => 'PHP'] or ['PHP', 'intermediate']).
     */
    private function normalizeSkillElement(mixed $skill): string
    {
        if (is_string($skill)) {
            return trim($skill);
        }
        if (is_array($skill)) {
            $name = $skill['skill'] ?? $skill[0] ?? '';
            return trim((string) $name);
        }
        return '';
    }

    /**
     * Helper to get unique skills from jobs
     */
    private function getUniqueSkills(): array
    {
        $skills = collect(
            GigJob::query()
                ->whereNotNull('required_skills')
                ->pluck('required_skills')
                ->toArray()
        )
            ->filter()
            ->reduce(function (array $unique, $skillSet) {
                $skillsArray = is_array($skillSet)
                    ? $skillSet
                    : (json_decode($skillSet, true) ?: []);

                foreach ($skillsArray as $skill) {
                    $trimmed = $this->normalizeSkillElement($skill);
                    if ($trimmed === '') continue;
                    $normalized = strtolower($trimmed);
                    if (!array_key_exists($normalized, $unique)) {
                        $unique[$normalized] = $trimmed;
                    }
                }
                return $unique;
            }, []);

        return collect($skills)
            ->values()
            ->sort(fn ($a, $b) => strcasecmp($a, $b))
            ->values()
            ->all();
    }

    /**
     * Show AI recommendations page (Legacy redirect/handler)
     */
    public function index(): Response
    {
        $user = auth()->user();
        
        if ($user->user_type === 'employer') {
            return $this->employerMatches();
        }
        
        return $this->gigWorkerMatches();
    }

    /**
     * Test Groq API connectivity (unified AI provider)
     */
    public function testConnection()
    {
        try {
            $apiKey = env('GROQ_API_KEY');
            $baseUrl = 'https://api.groq.com/openai/v1';
            $certPath = base_path('cacert.pem');

            if (empty($apiKey)) {
                return response()->json([
                    'success' => false,
                    'message' => 'GROQ_API_KEY is not configured in .env file'
                ]);
            }

            $response = Http::withToken($apiKey)
                ->withOptions([
                    'verify' => file_exists($certPath) ? $certPath : true,
                ])
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->timeout(15)
                ->post($baseUrl . '/chat/completions', [
                    'model' => 'llama-3.1-8b-instant',
                    'messages' => [
                        ['role' => 'system', 'content' => 'You are a helpful assistant.'],
                        ['role' => 'user', 'content' => 'Hi, this is a test message.']
                    ],
                    'max_tokens' => 10,
                ]);

            $data = $response->json();

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Groq API connection successful',
                    'data' => $data
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Groq API request failed',
                'error' => $data
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Groq API connection failed',
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Retrieve all unique required skills across all jobs.
     */
    public function allSkills()
    {
        $skills = collect(
            GigJob::query()
                ->whereNotNull('required_skills')
                ->pluck('required_skills')
                ->toArray()
        )
            ->filter()
            ->reduce(function (array $unique, $skillSet) {
                $skillsArray = is_array($skillSet)
                    ? $skillSet
                    : (json_decode($skillSet, true) ?: []);

                foreach ($skillsArray as $skill) {
                    $trimmed = $this->normalizeSkillElement($skill);

                    if ($trimmed === '') {
                        continue;
                    }

                    $normalized = strtolower($trimmed);

                    if (!array_key_exists($normalized, $unique)) {
                        $unique[$normalized] = $trimmed;
                    }
                }

                return $unique;
            }, []);

        $skills = collect($skills)
            ->values()
            ->sort(fn ($a, $b) => strcasecmp($a, $b))
            ->values()
            ->all();

        return response()->json($skills);
    }

    public function recommendSkills(Request $request)
    {
        $validated = $request->validate([
            'title' => 'nullable|string',
            'description' => 'nullable|string',
            'exclude' => 'array',
            'exclude.*' => 'string',
        ]);

        $title = $validated['title'] ?? '';
        $description = $validated['description'] ?? '';
        $exclude = $validated['exclude'] ?? [];

        $service = app(AIJobMatchingService::class);
        $result = $service->recommend($title, $description, $exclude);

        return response()->json($result);
    }

    public function acceptSuggestion(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|string|in:skill,role',
            'value' => 'required|string',
            'context' => 'nullable|array',
        ]);

        $service = app(AIJobMatchingService::class);
        $service->recordAcceptance($validated['type'], $validated['value'], $validated['context'] ?? []);

        return response()->json(['status' => 'ok']);
    }
}
