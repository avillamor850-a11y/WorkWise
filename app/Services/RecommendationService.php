<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\GigJob;
use App\Models\User;
use App\Services\AIJobMatchingService;

class RecommendationService
{
    private AIJobMatchingService $aiJobMatchingService;
    private ?string $apiKey;
    private string $baseUrl;
    private string $certPath;
    private bool $isConfigured;

    private array $models;

    private const REVIEW_SNIPPET_LIMIT = 5;
    private const REVIEW_COMMENT_MAX_LEN = 200;
    private const CACHE_TTL_HOURS = 24;
    private const MAX_PROCESS_TIME = 20;
    /** Max seconds for employer recommendation loop (must stay under PHP time_limit to avoid fatal) */
    private const EMPLOYER_REQUEST_DEADLINE_SEC = 50;
    private const EMPLOYER_WORKER_LIMIT = 12;
    private const WORKER_JOB_LIMIT = 15;

    public function __construct(AIJobMatchingService $aiJobMatchingService)
    {
        $this->aiJobMatchingService = $aiJobMatchingService;
        $this->apiKey = config('services.groq.api_key');
        $this->baseUrl = rtrim(config('services.groq.base_url', 'https://api.groq.com/openai/v1'), '/');
        $this->certPath = base_path('cacert.pem');
        $this->isConfigured = !empty($this->apiKey);

        $this->models = [
            ['name' => 'llama-3.3-70b-versatile', 'temperature' => 1.0, 'max_completion_tokens' => 1024, 'top_p' => 1.0],
            ['name' => 'meta-llama/llama-4-scout-17b-16e-instruct', 'temperature' => 1.0, 'max_completion_tokens' => 1024, 'top_p' => 1.0],
            ['name' => 'meta-llama/llama-4-maverick-17b-128e-instruct', 'temperature' => 1.0, 'max_completion_tokens' => 1024, 'top_p' => 1.0],
            ['name' => 'qwen/qwen3-32b', 'temperature' => 0.6, 'max_completion_tokens' => 4096, 'top_p' => 0.95],
            ['name' => 'llama-3.1-8b-instant', 'temperature' => 1.0, 'max_completion_tokens' => 1024, 'top_p' => 1.0],
        ];

        if (!$this->isConfigured) {
            Log::warning('GROQ_API_KEY not configured. AI Recommendation will use fallback.');
        }
    }

    /**
     * Get job skills text for prompts (required + preferred)
     */
    private function getJobSkillsForPrompt(GigJob $job): array
    {
        $skillsReqs = $job->skills_requirements;
        if (is_string($skillsReqs)) {
            $skillsReqs = json_decode($skillsReqs, true);
        }
        if (!is_array($skillsReqs)) {
            $skillsReqs = [];
        }

        if (!empty($skillsReqs)) {
            $required = array_filter($skillsReqs, fn($s) => is_array($s) && (($s['importance'] ?? 'required') === 'required'));
            $preferred = array_filter($skillsReqs, fn($s) => is_array($s) && (($s['importance'] ?? 'required') === 'preferred'));
            $allNames = array_values(array_filter(array_map(function ($s) {
                $name = is_array($s) ? ($s['skill'] ?? $s[0] ?? '') : $s;
                return trim((string) $name);
            }, $skillsReqs)));
            return [
                'required' => array_values($required),
                'preferred' => array_values($preferred),
                'all_skill_names' => $allNames,
            ];
        }

        $raw = $job->required_skills ?? [];
        if (is_string($raw)) {
            $raw = json_decode($raw, true) ?? [];
        }
        $names = array_values(array_filter(array_map(function ($s) {
            if (is_string($s)) return trim($s);
            if (is_array($s)) return trim((string)($s['skill'] ?? $s[0] ?? ''));
            return '';
        }, (array) $raw)));
        $level = $job->experience_level ?? 'intermediate';
        $required = array_map(fn($n) => ['skill' => $n, 'experience_level' => $level, 'importance' => 'required'], $names);
        return ['required' => $required, 'preferred' => [], 'all_skill_names' => $names];
    }

    /**
     * Normalize worker skills to array of [skill, experience_level]
     */
    private function normalizeWorkerSkills($skills): array
    {
        if (is_null($skills)) return [];
        if (is_string($skills)) {
            $decoded = json_decode($skills, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $skills = $decoded;
            } else {
                return [['skill' => trim($skills), 'experience_level' => 'intermediate']];
            }
        }
        if (!is_array($skills)) return [];
        $result = [];
        foreach ($skills as $s) {
            if (is_string($s)) {
                if (trim($s) !== '') $result[] = ['skill' => trim($s), 'experience_level' => 'intermediate'];
            } elseif (is_array($s)) {
                $name = trim((string)($s['skill'] ?? $s[0] ?? ''));
                $level = $s['experience_level'] ?? $s[1] ?? 'intermediate';
                if ($name !== '') $result[] = ['skill' => $name, 'experience_level' => (string)$level];
            }
        }
        return $result;
    }

    /**
     * Build review snippets for prompt (last N reviews, comment truncated)
     */
    private function getReviewSnippets(User $user, string $relation = 'receivedReviews'): string
    {
        $reviews = $user->{$relation}()
            ->orderByDesc('created_at')
            ->limit(self::REVIEW_SNIPPET_LIMIT)
            ->get(['rating', 'comment']);

        if ($reviews->isEmpty()) {
            return 'No reviews yet.';
        }

        $lines = [];
        foreach ($reviews as $r) {
            $comment = $r->comment ? \Illuminate\Support\Str::limit($r->comment, self::REVIEW_COMMENT_MAX_LEN) : '(no comment)';
            $lines[] = "Rating: {$r->rating}/5 — {$comment}";
        }
        return implode("\n", $lines);
    }

    /**
     * Employer: get recommended workers for a job (Competence + Trust)
     */
    public function getJobRecommendationsForEmployer(GigJob $job, int $limit = 5, bool $refresh = false): array
    {
        $logPath = base_path('debug-385a6b.log');
        try {
            $rankedMatches = $this->aiJobMatchingService->findMatchingFreelancers($job, self::EMPLOYER_WORKER_LIMIT);
            $bidderIds = $job->bids()->pluck('gig_worker_id')->toArray();
            $workers = $rankedMatches->pluck('gig_worker')->filter(fn($w) => !in_array($w->id, $bidderIds))->values();

            // #region agent log
            @file_put_contents($logPath, json_encode(['sessionId'=>'385a6b','hypothesisId'=>'S1','location'=>'RecommendationService::getJobRecommendationsForEmployer','message'=>'workers loaded','data'=>['workers_count'=>$workers->count()],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND | LOCK_EX);
            // #endregion

            $jobSkills = $this->getJobSkillsForPrompt($job);
            // #region agent log
            @file_put_contents($logPath, json_encode(['sessionId'=>'385a6b','hypothesisId'=>'S2','location'=>'RecommendationService::getJobRecommendationsForEmployer','message'=>'after getJobSkillsForPrompt','data'=>['required_count'=>count($jobSkills['required']??[])],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND | LOCK_EX);
            // #endregion
            $jobText = $this->buildJobText($job, $jobSkills);
            // #region agent log
            @file_put_contents($logPath, json_encode(['sessionId'=>'385a6b','hypothesisId'=>'S3','location'=>'RecommendationService::getJobRecommendationsForEmployer','message'=>'after buildJobText','data'=>['jobText_len'=>strlen($jobText)],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND | LOCK_EX);
            // #endregion

            $matches = [];
            $startTime = microtime(true);
            $deadline = $startTime + self::EMPLOYER_REQUEST_DEADLINE_SEC;
            $workerIndex = 0;
            foreach ($workers as $worker) {
                if (microtime(true) >= $deadline) {
                    Log::warning('RecommendationService employer deadline', ['job_id' => $job->id, 'matches_so_far' => count($matches)]);
                    break;
                }
                if ((microtime(true) - $startTime) > self::MAX_PROCESS_TIME) {
                    Log::warning('RecommendationService employer timeout', ['job_id' => $job->id]);
                    break;
                }
                // #region agent log
                if ($workerIndex === 0) {
                    @file_put_contents($logPath, json_encode(['sessionId'=>'385a6b','hypothesisId'=>'S4','location'=>'RecommendationService::getJobRecommendationsForEmployer','message'=>'first worker start','data'=>['worker_id'=>$worker->id],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND | LOCK_EX);
                }
                $workerIndex++;
                // #endregion
                $result = $this->getWorkerRecommendationScore($job, $jobText, $jobSkills, $worker, $refresh, $deadline);
                if ($result['success'] && $result['score'] > 0) {
                    $matches[] = [
                        'gig_worker' => $worker,
                        'score' => $result['score'],
                        'reason' => $result['reason'],
                    ];
                }
                if (count($matches) >= $limit * 2 && ($result['score'] ?? 0) >= 70) {
                    break;
                }
            }

            usort($matches, fn($a, $b) => $b['score'] - $a['score']);
            return array_slice($matches, 0, $limit);
        } catch (\Throwable $e) {
            @file_put_contents($logPath, json_encode(['sessionId'=>'385a6b','hypothesisId'=>'S5','location'=>'RecommendationService::getJobRecommendationsForEmployer','message'=>'catch','data'=>['exception'=>get_class($e),'msg'=>substr($e->getMessage(),0,200),'file'=>$e->getFile(),'line'=>$e->getLine()],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND | LOCK_EX);
            throw $e;
        }
    }

    /**
     * Single worker recommendation score for employer (competence + trust)
     * @param float|null $deadline Optional Unix timestamp; if within 12s of deadline, skip Groq and use fallback
     */
    private function getWorkerRecommendationScore(GigJob $job, string $jobText, array $jobSkills, User $worker, bool $refresh, ?float $deadline = null): array
    {
        $cacheKey = "recommendation_employer_{$job->id}_{$worker->id}";
        if (!$refresh && Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        if (!$this->isConfigured) {
            return $this->fallbackEmployerScore($job, $jobSkills, $worker);
        }

        if ($deadline !== null && microtime(true) >= $deadline - 12) {
            return $this->fallbackEmployerScore($job, $jobSkills, $worker);
        }

        $workerSkills = $this->normalizeWorkerSkills($worker->skills_with_experience);
        $workerSkillsText = $this->formatSkillsForPrompt($workerSkills);
        $avgRating = round($worker->receivedReviews()->avg('rating') ?? 0, 1);
        $idVerified = $worker->isIDVerified() ? 'Yes' : 'No';
        $reviewSnippets = $this->getReviewSnippets($worker);

        $workerText = "Worker: {$worker->professional_title}\n"
            . "Skills: {$workerSkillsText}\n"
            . "Hourly rate: ₱" . ($worker->hourly_rate ?? 'Not set') . "\n"
            . "Bio: " . \Illuminate\Support\Str::limit($worker->bio ?? 'None', 150) . "\n"
            . "--- TRUST ---\n"
            . "Average rating from employers: {$avgRating}/5\n"
            . "ID verified: {$idVerified}\n"
            . "Recent review excerpts:\n{$reviewSnippets}";

        $systemPrompt = 'You are an expert hiring advisor for Philippine freelance platforms. '
            . 'Evaluate each candidate on: (1) COMPETENCE: skills and experience match for the job; (2) TRUST: reliability from ratings, ID verification, and review content (e.g. "fast", "good communication", "accurate"). '
            . 'Score 0-100 combining both. Protect the employer from unskilled or unreliable workers. '
            . 'Format your response exactly as: Score: <number>\nReason: <2-3 sentences covering competence and trust>';

        $userPrompt = "JOB:\n{$jobText}\n\nCANDIDATE:\n{$workerText}\n\nProvide Score and Reason.";

        $result = $this->callGroq($systemPrompt, $userPrompt, 'employer');
        if ($result !== null) {
            Cache::put($cacheKey, $result, now()->addHours(self::CACHE_TTL_HOURS));
            return $result;
        }

        return $this->fallbackEmployerScore($job, $jobSkills, $worker);
    }

    private function buildJobText(GigJob $job, array $jobSkills): string
    {
        $req = $jobSkills['required'];
        $reqText = empty($req) ? implode(', ', $jobSkills['all_skill_names']) : implode(', ', array_map(fn($s) => ($s['skill'] ?? '') . ' (' . ($s['experience_level'] ?? '') . ')', $req));
        $pref = $jobSkills['preferred'] ?? [];
        $prefText = empty($pref) ? '' : "\nPreferred: " . implode(', ', array_map(fn($s) => $s['skill'] ?? '', $pref));
        return "Title: {$job->title}\nDescription: " . \Illuminate\Support\Str::limit($job->description ?? '', 300)
            . "\nRequired skills: {$reqText}{$prefText}\nExperience: {$job->experience_level}\nBudget: ₱{$job->budget_min} - ₱{$job->budget_max}";
    }

    private function formatSkillsForPrompt(array $skills): string
    {
        if (empty($skills)) return 'None listed';
        return implode(', ', array_map(fn($s) => ($s['skill'] ?? '') . ' (' . ($s['experience_level'] ?? 'intermediate') . ')', $skills));
    }

    private function fallbackEmployerScore(GigJob $job, array $jobSkills, User $worker): array
    {
        $workerSkills = $this->normalizeWorkerSkills($worker->skills_with_experience);
        $jobNames = array_map('strtolower', $jobSkills['all_skill_names'] ?? []);
        $workerNames = array_map(fn($s) => strtolower($s['skill'] ?? ''), $workerSkills);
        $matchCount = count(array_intersect($jobNames, $workerNames));
        $total = max(1, count($jobNames));
        $score = (int) min(100, round(($matchCount / $total) * 70));
        $avgRating = $worker->receivedReviews()->avg('rating') ?? 0;
        $score += (int) min(30, round($avgRating * 6)); // rating contribution
        if ($worker->isIDVerified()) $score = min(100, $score + 5);
        $reason = "Skills match: {$matchCount}/{$total} required. Average rating: " . round($avgRating, 1) . "/5.";
        if ($worker->isIDVerified()) $reason .= ' ID verified.';
        return ['score' => min(100, $score), 'reason' => $reason, 'success' => true];
    }

    /**
     * Gig worker: get recommended jobs (Relevance + Quality)
     */
    public function getJobRecommendationsForWorker(User $gigWorker, int $limit = 5, bool $refresh = false): array
    {
        $query = GigJob::with(['employer' => fn($q) => $q->with(['receivedReviews' => fn($r) => $r->latest()->limit(self::REVIEW_SNIPPET_LIMIT)])])
            ->where('status', 'open')
            ->where(fn($q) => $q->whereNotNull('required_skills')->orWhereNotNull('skills_requirements'))
            ->latest();

        $jobs = $query->limit(self::WORKER_JOB_LIMIT)->get();

        // #region agent log
        $logPath = base_path('debug-2a3dda.log');
        $logLine = json_encode(['sessionId' => '2a3dda', 'hypothesisId' => 'A', 'location' => 'RecommendationService.php:getJobRecommendationsForWorker', 'message' => 'Job pool for worker', 'data' => ['worker_id' => $gigWorker->id, 'pool_size' => $jobs->count(), 'job_ids' => $jobs->pluck('id')->toArray(), 'total_open_with_skills' => GigJob::where('status', 'open')->where(fn($q) => $q->whereNotNull('required_skills')->orWhereNotNull('skills_requirements'))->count()], 'timestamp' => round(microtime(true) * 1000)]) . "\n";
        @file_put_contents($logPath, $logLine, FILE_APPEND);
        // #endregion

        $workerSkills = $this->normalizeWorkerSkills($gigWorker->skills_with_experience);
        $workerText = "Worker profile: {$gigWorker->professional_title}\nSkills: " . $this->formatSkillsForPrompt($workerSkills)
            . "\nRate: ₱" . ($gigWorker->hourly_rate ?? 'Not set');

        $matches = [];
        $startTime = microtime(true);
        $deadline = $startTime + self::MAX_PROCESS_TIME;

        foreach ($jobs as $job) {
            if ((microtime(true) - $startTime) > self::MAX_PROCESS_TIME) {
                Log::warning('RecommendationService worker timeout', ['gig_worker_id' => $gigWorker->id]);
                // #region agent log
                $logLine = json_encode(['sessionId' => '2a3dda', 'hypothesisId' => 'D', 'location' => 'RecommendationService.php:worker_loop', 'message' => 'Timeout hit', 'data' => ['processed' => count($matches), 'job_count' => $jobs->count()], 'timestamp' => round(microtime(true) * 1000)]) . "\n";
                @file_put_contents($logPath, $logLine, FILE_APPEND);
                // #endregion
                break;
            }

            $result = $this->getJobRecommendationScoreForWorker($job, $gigWorker, $workerText, $refresh, $deadline);
            // #region agent log
            $logLine = json_encode(['sessionId' => '2a3dda', 'hypothesisId' => 'B', 'location' => 'RecommendationService.php:worker_loop', 'message' => 'Job scored', 'data' => ['job_id' => $job->id, 'score' => $result['score'] ?? null, 'success' => $result['success'] ?? false, 'added' => ($result['success'] && ($result['score'] ?? 0) > 0)], 'timestamp' => round(microtime(true) * 1000)]) . "\n";
            @file_put_contents($logPath, $logLine, FILE_APPEND);
            // #endregion
            if ($result['success'] && $result['score'] > 0) {
                $matches[] = [
                    'job' => $job,
                    'score' => $result['score'],
                    'reason' => $result['reason'],
                ];
            }
            if (count($matches) >= $limit * 2 && ($result['score'] ?? 0) >= 70) {
                break;
            }
        }

        usort($matches, fn($a, $b) => $b['score'] - $a['score']);
        $returned = array_slice($matches, 0, $limit);
        // #region agent log
        $logLine = json_encode(['sessionId' => '2a3dda', 'hypothesisId' => 'A', 'location' => 'RecommendationService.php:getJobRecommendationsForWorker', 'message' => 'Returned recommendations', 'data' => ['match_count' => count($returned), 'returned_job_ids' => array_map(fn($m) => $m['job']->id, $returned)], 'timestamp' => round(microtime(true) * 1000)]) . "\n";
        @file_put_contents($logPath, $logLine, FILE_APPEND);
        // #endregion
        return $returned;
    }

    /**
     * Single job recommendation score for worker (relevance + quality)
     */
    private function getJobRecommendationScoreForWorker(GigJob $job, User $gigWorker, string $workerText, bool $refresh, ?float $deadline = null): array
    {
        $cacheKey = "recommendation_worker_{$gigWorker->id}_{$job->id}";
        if (!$refresh && Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);
            // #region agent log
            $logPath = base_path('debug-2a3dda.log');
            $logLine = json_encode(['sessionId' => '2a3dda', 'hypothesisId' => 'C', 'location' => 'RecommendationService.php:getJobRecommendationScoreForWorker', 'message' => 'Cache hit', 'data' => ['job_id' => $job->id, 'worker_id' => $gigWorker->id, 'cached_score' => $cached['score'] ?? null], 'timestamp' => round(microtime(true) * 1000)]) . "\n";
            @file_put_contents($logPath, $logLine, FILE_APPEND);
            // #endregion
            return $cached;
        }

        if (!$this->isConfigured) {
            return $this->fallbackWorkerScore($job, $gigWorker);
        }

        if ($deadline !== null && microtime(true) >= $deadline) {
            return $this->fallbackWorkerScore($job, $gigWorker);
        }

        $jobSkills = $this->getJobSkillsForPrompt($job);
        $jobText = $this->buildJobText($job, $jobSkills);

        $employer = $job->employer;
        $employerRating = $employer ? round($employer->receivedReviews()->avg('rating') ?? 0, 1) : 0;
        $employerSnippets = $employer ? $this->getReviewSnippets($employer) : 'No reviews yet.';

        $qualityText = "Employer average rating (from workers they hired): {$employerRating}/5\n"
            . "Budget: ₱{$job->budget_min} - ₱{$job->budget_max}\n"
            . "What workers said about this employer:\n{$employerSnippets}";

        $systemPrompt = 'You are an expert career advisor for Philippine freelance workers. '
            . 'Evaluate each job on: (1) RELEVANCE: match to the worker\'s skills and experience; (2) QUALITY: employer reputation from ratings and review content (fair pay, communication, timeliness). '
            . 'Score 0-100. Protect the worker from bad employers or low-quality posts. '
            . 'Format exactly: Score: <number>\nReason: <2-3 sentences covering relevance and quality>';

        $userPrompt = "WORKER PROFILE:\n{$workerText}\n\nJOB:\n{$jobText}\n\n--- EMPLOYER QUALITY ---\n{$qualityText}\n\nProvide Score and Reason.";

        $result = $this->callGroq($systemPrompt, $userPrompt, 'worker');
        if ($result !== null) {
            // When Groq returns 0, use fallback if it gives a positive score so exact skill matches still appear (log evidence: jobs 22,21,20,18 got 0 from Groq)
            if (($result['score'] ?? 0) === 0) {
                $fallback = $this->fallbackWorkerScore($job, $gigWorker);
                if (($fallback['score'] ?? 0) > 0) {
                    $result = $fallback;
                }
            }
            Cache::put($cacheKey, $result, now()->addHours(self::CACHE_TTL_HOURS));
            return $result;
        }

        return $this->fallbackWorkerScore($job, $gigWorker);
    }

    private function fallbackWorkerScore(GigJob $job, User $gigWorker): array
    {
        $jobSkills = $this->getJobSkillsForPrompt($job);
        $workerSkills = $this->normalizeWorkerSkills($gigWorker->skills_with_experience);
        $jobNames = array_map('strtolower', $jobSkills['all_skill_names'] ?? []);
        $workerNames = array_map(fn($s) => strtolower($s['skill'] ?? ''), $workerSkills);
        $matchCount = count(array_intersect($jobNames, $workerNames));
        $total = max(1, count($jobNames));
        $score = (int) min(100, round(($matchCount / $total) * 70));
        $employer = $job->employer;
        if ($employer) {
            $avg = $employer->receivedReviews()->avg('rating') ?? 0;
            $score = min(100, $score + (int) round($avg * 6));
        }
        $reason = "Relevance: {$matchCount}/{$total} skills. Employer rating: " . ($employer ? round($employer->receivedReviews()->avg('rating') ?? 0, 1) : 'N/A') . "/5.";
        $result = ['score' => min(100, $score), 'reason' => $reason, 'success' => true];
        // #region agent log
        if ($result['score'] === 0) {
            $logPath = base_path('debug-2a3dda.log');
            $logLine = json_encode(['sessionId' => '2a3dda', 'hypothesisId' => 'E', 'location' => 'RecommendationService.php:fallbackWorkerScore', 'message' => 'Zero score', 'data' => ['job_id' => $job->id, 'job_skill_names' => $jobNames, 'worker_skill_names' => $workerNames, 'match_count' => $matchCount, 'total' => $total], 'timestamp' => round(microtime(true) * 1000)]) . "\n";
            @file_put_contents($logPath, $logLine, FILE_APPEND);
        }
        // #endregion
        return $result;
    }

    /**
     * Call Groq with failover
     */
    /** Max seconds for a single callGroq attempt (avoids one call exhausting request time via model failover) */
    private const GROQ_CALL_MAX_SEC = 18;

    private function callGroq(string $systemPrompt, string $userPrompt, string $context): ?array
    {
        $callStart = microtime(true);
        foreach ($this->models as $modelConfig) {
            if (microtime(true) - $callStart > self::GROQ_CALL_MAX_SEC) {
                Log::warning('RecommendationService Groq call time cap reached', ['context' => $context]);
                return null;
            }
            try {
                $response = Http::withToken($this->apiKey)
                    ->withOptions(['verify' => file_exists($this->certPath) ? $this->certPath : true])
                    ->timeout(12)
                    ->post($this->baseUrl . '/chat/completions', [
                        'model' => $modelConfig['name'],
                        'messages' => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user', 'content' => $userPrompt],
                        ],
                        'temperature' => $modelConfig['temperature'],
                        'max_completion_tokens' => $modelConfig['max_completion_tokens'],
                        'top_p' => $modelConfig['top_p'],
                        'stream' => false,
                    ]);

                if (!$response->successful()) {
                    if (in_array($response->status(), [429, 503])) {
                        Log::warning("Groq model {$modelConfig['name']} rate limited, failover...");
                    }
                    continue;
                }

                $data = $response->json();
                $content = $data['choices'][0]['message']['content'] ?? '';
                if ($content === '') continue;

                if (preg_match('/Score:\s*(\d+)/i', $content, $m) && preg_match('/Reason:\s*(.+?)(?=\n\n|\n*$)/ims', $content, $r)) {
                    return [
                        'score' => min(100, (int) $m[1]),
                        'reason' => trim($r[1] ?? 'No explanation.'),
                        'success' => true,
                    ];
                }
            } catch (\Exception $e) {
                Log::error("RecommendationService Groq failed [{$context}]", ['model' => $modelConfig['name'], 'error' => $e->getMessage()]);
            }
        }

        return null;
    }
}
