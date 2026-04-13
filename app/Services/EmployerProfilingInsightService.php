<?php

namespace App\Services;

use App\Models\ResumeScreening;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class EmployerProfilingInsightService
{
    public function __construct(
        protected AIService $aiService,
        protected EmployerAnalyticsService $employerAnalyticsService
    ) {}

    public function getInsightsForEmployer(User $employer): array
    {
        $tableExists = Schema::hasTable('resume_screenings');

        // #region agent log
        @file_put_contents(base_path('debug-fdc02e.log'), json_encode([
            'sessionId' => 'fdc02e',
            'runId' => 'initial',
            'hypothesisId' => 'H1,H2,H3',
            'location' => 'EmployerProfilingInsightService::getInsightsForEmployer',
            'message' => 'insights_entry',
            'data' => [
                'employer_id' => $employer->id ?? null,
                'default_connection' => config('database.default'),
                'resume_screenings_table_exists' => $tableExists,
            ],
            'timestamp' => round(microtime(true) * 1000),
        ])."\n", FILE_APPEND | LOCK_EX);
        // #endregion

        if (! $tableExists) {
            // #region agent log
            @file_put_contents(base_path('debug-fdc02e.log'), json_encode([
                'sessionId' => 'fdc02e',
                'runId' => 'post-fix',
                'hypothesisId' => 'H1,H3',
                'location' => 'EmployerProfilingInsightService::getInsightsForEmployer',
                'message' => 'resume_screenings_missing_fallback_branch',
                'data' => [
                    'employer_id' => $employer->id ?? null,
                ],
                'timestamp' => round(microtime(true) * 1000),
            ])."\n", FILE_APPEND | LOCK_EX);
            // #endregion

            $employerData = [
                'user_id' => $employer->id,
                'primary_hiring_needs' => (array) ($employer->primary_hiring_needs ?? []),
                'typical_project_budget' => $employer->typical_project_budget,
                'preferred_experience_level' => $employer->preferred_experience_level,
                'hiring_frequency' => $employer->hiring_frequency,
                'analytics' => $this->employerAnalyticsService->getPerformanceMetrics($employer),
            ];

            $ai = $this->aiService->generateEmployerProfilingInsights($employerData, [
                'recent_screenings_count' => 0,
                'successful_screenings_count' => 0,
                'avg_screening_confidence' => 0,
                'top_screened_skills' => [],
                'resume_screening_ready' => false,
            ]);

            return [
                'generated_with_ai' => (bool) ($ai['success'] ?? false),
                'insights' => (array) ($ai['insights'] ?? []),
                'context' => [
                    'recent_screenings_count' => 0,
                    'successful_screenings_count' => 0,
                    'avg_screening_confidence' => 0,
                    'top_screened_skills' => [],
                    'resume_screening_ready' => false,
                ],
                'informational_only' => true,
                'generated_at' => now()->toIso8601String(),
            ];
        }

        $screenings = ResumeScreening::query()
            ->latest('screened_at')
            ->limit(100)
            ->get(['id', 'status', 'confidence', 'extracted_skills', 'screened_at']);

        // #region agent log
        @file_put_contents(base_path('debug-fdc02e.log'), json_encode([
            'sessionId' => 'fdc02e',
            'runId' => 'initial',
            'hypothesisId' => 'H1,H2',
            'location' => 'EmployerProfilingInsightService::getInsightsForEmployer',
            'message' => 'screenings_query_completed',
            'data' => [
                'screenings_count' => $screenings->count(),
            ],
            'timestamp' => round(microtime(true) * 1000),
        ])."\n", FILE_APPEND | LOCK_EX);
        // #endregion

        $screeningContext = [
            'recent_screenings_count' => $screenings->count(),
            'successful_screenings_count' => $screenings->where('status', 'success')->count(),
            'avg_screening_confidence' => round((float) ($screenings->avg('confidence') ?? 0), 2),
            'top_screened_skills' => $this->topSkills($screenings),
        ];

        $employerData = [
            'user_id' => $employer->id,
            'primary_hiring_needs' => (array) ($employer->primary_hiring_needs ?? []),
            'typical_project_budget' => $employer->typical_project_budget,
            'preferred_experience_level' => $employer->preferred_experience_level,
            'hiring_frequency' => $employer->hiring_frequency,
            'analytics' => $this->employerAnalyticsService->getPerformanceMetrics($employer),
        ];

        $ai = $this->aiService->generateEmployerProfilingInsights($employerData, $screeningContext);

        return [
            'generated_with_ai' => (bool) ($ai['success'] ?? false),
            'insights' => (array) ($ai['insights'] ?? []),
            'context' => $screeningContext,
            'informational_only' => true,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function topSkills(Collection $screenings): array
    {
        $counts = [];
        foreach ($screenings as $screening) {
            foreach ((array) ($screening->extracted_skills ?? []) as $skill) {
                $name = trim((string) $skill);
                if ($name === '') {
                    continue;
                }
                $counts[$name] = ($counts[$name] ?? 0) + 1;
            }
        }
        arsort($counts);

        return array_slice(array_keys($counts), 0, 8);
    }
}
