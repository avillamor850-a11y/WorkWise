<?php

namespace App\Jobs;

use App\Models\ResumeScreening;
use App\Models\User;
use App\Services\AIService;
use App\Services\ResumeTextExtractionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\PendingDispatch;
use Illuminate\Foundation\Queue\Queueable;

class ProcessResumeScreeningJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $gigWorkerId,
        public array $context = []
    ) {
    }

    /**
     * Queue resume screening. In local dev, if the default queue is not "sync",
     * force the sync connection so analysis runs without `php artisan queue:work`.
     */
    public static function dispatchScreening(int $gigWorkerId, array $context = []): PendingDispatch
    {
        $pending = static::dispatch($gigWorkerId, $context);

        if (app()->environment('local') && config('queue.default') !== 'sync') {
            $pending->onConnection('sync');
        }

        return $pending;
    }

    public function handle(AIService $aiService, ResumeTextExtractionService $resumeTextExtractionService): void
    {
        $worker = User::find($this->gigWorkerId);
        // #region agent log
        @file_put_contents(base_path('debug-2e90a4.log'), json_encode([
            'sessionId' => '2e90a4',
            'runId' => 'initial',
            'hypothesisId' => 'H1',
            'location' => 'ProcessResumeScreeningJob::handle:entry',
            'message' => 'resume_screening_job_entry',
            'data' => [
                'gig_worker_id' => $this->gigWorkerId,
                'worker_found' => (bool) $worker,
                'has_resume_file' => !empty($worker?->resume_file),
                'user_type' => $worker?->user_type,
            ],
            'timestamp' => round(microtime(true) * 1000),
        ]) . "\n", FILE_APPEND | LOCK_EX);
        // #endregion
        if (! $worker || $worker->user_type !== 'gig_worker' || empty($worker->resume_file)) {
            return;
        }

        $resumeHash = hash('sha256', (string) $worker->resume_file);
        $existing = ResumeScreening::query()
            ->where('gig_worker_id', $worker->id)
            ->where('resume_hash', $resumeHash)
            ->where('status', 'success')
            ->first();
        // #region agent log
        @file_put_contents(base_path('debug-2e90a4.log'), json_encode([
            'sessionId' => '2e90a4',
            'runId' => 'initial',
            'hypothesisId' => 'H1',
            'location' => 'ProcessResumeScreeningJob::handle:cache_check',
            'message' => 'existing_screening_lookup',
            'data' => [
                'gig_worker_id' => $worker->id,
                'resume_path' => (string) $worker->resume_file,
                'resume_hash' => $resumeHash,
                'existing_success_found' => (bool) $existing,
                'existing_screened_at' => $existing?->screened_at?->toIso8601String(),
            ],
            'timestamp' => round(microtime(true) * 1000),
        ]) . "\n", FILE_APPEND | LOCK_EX);
        // #endregion

        if ($existing) {
            return;
        }

        $screening = ResumeScreening::updateOrCreate(
            [
                'gig_worker_id' => $worker->id,
                'resume_hash' => $resumeHash,
            ],
            [
                'resume_path' => (string) $worker->resume_file,
                'status' => 'processing',
                'error_message' => null,
            ]
        );

        $resumeText = $resumeTextExtractionService->extractFromStoredPath((string) $worker->resume_file);
        // #region agent log
        @file_put_contents(base_path('debug-2e90a4.log'), json_encode([
            'sessionId' => '2e90a4',
            'runId' => 'initial',
            'hypothesisId' => 'H2',
            'location' => 'ProcessResumeScreeningJob::handle:inputs',
            'message' => 'resume_screening_inputs',
            'data' => [
                'gig_worker_id' => $worker->id,
                'resume_text_len' => mb_strlen((string) $resumeText),
            ],
            'timestamp' => round(microtime(true) * 1000),
        ]) . "\n", FILE_APPEND | LOCK_EX);
        // #endregion

        if (trim((string) $resumeText) === '') {
            $msg = 'Could not extract text from the uploaded resume file.';
            $screening->update([
                'status' => 'failed',
                'screening_result' => [
                    'summary' => $msg,
                    'context' => [
                        'job_id' => $this->context['job_id'] ?? null,
                    ],
                ],
                'extracted_skills' => [],
                'experience_summary' => '',
                'strengths' => '',
                'gaps' => '',
                'confidence' => 0.0,
                'error_message' => $msg,
                'screened_at' => now(),
            ]);

            return;
        }

        $result = $aiService->generateResumeScreening([
            'user_id' => $worker->id,
            'worker_name' => trim(($worker->first_name ?? '').' '.($worker->last_name ?? '')),
            'resume_text' => $resumeText,
        ]);

        $payload = (array) ($result['data'] ?? []);
        // #region agent log
        @file_put_contents(base_path('debug-2e90a4.log'), json_encode([
            'sessionId' => '2e90a4',
            'runId' => 'initial',
            'hypothesisId' => 'H4',
            'location' => 'ProcessResumeScreeningJob::handle:result',
            'message' => 'resume_screening_result_summary',
            'data' => [
                'gig_worker_id' => $worker->id,
                'success' => (bool) ($result['success'] ?? false),
                'status' => ($result['success'] ?? false) ? 'success' : 'failed',
                'extracted_skills_count' => count((array) ($payload['extracted_skills'] ?? [])),
                'summary_has_unrelated' => str_contains(strtolower((string) ($payload['summary'] ?? '')), 'unrelated'),
            ],
            'timestamp' => round(microtime(true) * 1000),
        ]) . "\n", FILE_APPEND | LOCK_EX);
        // #endregion
        $screening->update([
            'status' => ($result['success'] ?? false) ? 'success' : 'failed',
            'screening_result' => array_merge($payload, [
                'context' => [
                    'job_id' => $this->context['job_id'] ?? null,
                ],
            ]),
            'extracted_skills' => (array) ($payload['extracted_skills'] ?? []),
            'experience_summary' => (string) ($payload['experience_summary'] ?? ''),
            'strengths' => (string) ($payload['strengths'] ?? ''),
            'gaps' => (string) ($payload['gaps'] ?? ''),
            'confidence' => (float) ($payload['confidence'] ?? 0),
            'error_message' => isset($result['error']) ? (string) $result['error'] : null,
            'screened_at' => now(),
        ]);
    }
}
