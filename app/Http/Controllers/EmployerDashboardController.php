<?php

namespace App\Http\Controllers;

use App\Models\GigJob;
use App\Models\Bid;
use App\Models\Project;
use App\Models\User;
use App\Models\Skill;
use App\Models\Review;
use App\Models\Notification;
use App\Services\NotificationManager;
use App\Services\DeadlineTracker;
use App\Services\NotificationService;
use App\Services\EmployerAnalyticsService;
use App\Services\ActivityService;
use App\Services\SearchService;
use App\Services\ExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployerDashboardController extends Controller
{
    protected NotificationManager $notificationManager;
    protected DeadlineTracker $deadlineTracker;
    protected NotificationService $notificationService;
    protected EmployerAnalyticsService $analyticsService;
    protected ActivityService $activityService;
    protected SearchService $searchService;
    protected ExportService $exportService;

    public function __construct(
        NotificationManager $notificationManager,
        DeadlineTracker $deadlineTracker,
        NotificationService $notificationService,
        EmployerAnalyticsService $analyticsService,
        ActivityService $activityService,
        SearchService $searchService,
        ExportService $exportService
    ) {
        $this->notificationManager = $notificationManager;
        $this->deadlineTracker = $deadlineTracker;
        $this->notificationService = $notificationService;
        $this->analyticsService = $analyticsService;
        $this->activityService = $activityService;
        $this->searchService = $searchService;
        $this->exportService = $exportService;
    }

    public function index(Request $request)
    {
        $user = $request->user();

        // #region agent log
        file_put_contents(base_path('debug-849b3f.log'), json_encode(['sessionId'=>'849b3f','hypothesisId'=>'H1,H2,H5','location'=>'EmployerDashboardController::index','message'=>'index entered','data'=>['hasUser'=>!!$user,'user_type'=>$user->user_type ?? null],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND | LOCK_EX);
        // #endregion

        if ($user->user_type !== 'employer') {
            return redirect()->route('dashboard');
        }

        $search = $request->input('search', '');
        $skillsFilter = $request->input('skills', []);
        $skillsFilter = is_array($skillsFilter) ? $skillsFilter : (is_string($skillsFilter) ? array_filter(explode(',', $skillsFilter)) : []);
        $sort = $request->input('sort', 'latest_registered'); // latest_registered | best_match | most_relevant

        $query = User::query()
            ->where('user_type', 'gig_worker')
            ->with(['skills']);

        // Search by name, professional title, or skills
        if ($search !== '') {
            $term = '%' . trim($search) . '%';
            $query->where(function ($q) use ($term) {
                $driver = DB::connection()->getDriverName();
                $nameExpr = $driver === 'mysql'
                    ? "CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))"
                    : "(COALESCE(first_name,'') || ' ' || COALESCE(last_name,''))";
                $q->whereRaw("{$nameExpr} LIKE ?", [$term])
                    ->orWhere('professional_title', 'LIKE', $term)
                    ->orWhere('bio', 'LIKE', $term)
                    ->orWhereHas('skills', function ($sq) use ($term) {
                        $sq->where('name', 'LIKE', $term);
                    });
            });
        }

        // Filter by skills (worker must have at least one of the selected skills)
        if (!empty($skillsFilter)) {
            $query->whereHas('skills', function ($q) use ($skillsFilter) {
                $q->whereIn('name', $skillsFilter);
            });
        }

        // Employer's job required skills for "Best for Me" ranking (from database)
        $requiredSkillNames = $this->getEmployerRequiredSkillNames($user);
        $bestMatchHasSkills = !empty($requiredSkillNames);

        if ($sort === 'best_match' && $bestMatchHasSkills) {
            // Rank by how many of the employer's job skills the worker has (skill_user + skills tables)
            $placeholders = implode(',', array_fill(0, count($requiredSkillNames), '?'));
            $subSql = "(SELECT COUNT(*) FROM skill_user su INNER JOIN skills s ON s.id = su.skill_id WHERE su.user_id = users.id AND s.name IN ({$placeholders}))";
            $query->select('users.*')->selectRaw("{$subSql} AS skill_match_count", $requiredSkillNames);
            $query->orderByDesc(DB::raw('skill_match_count'));
        } elseif ($sort === 'most_relevant') {
            // Rank by system analysis: average rating (reviews) + completed projects count from database
            $query->select('users.*');
            $query->withCount(['gigWorkerProjects as completed_projects_count' => function ($q) {
                $q->where('status', 'completed');
            }]);
            $query->selectSub(
                \App\Models\Review::query()
                    ->selectRaw('COALESCE(AVG(rating), 0)')
                    ->whereColumn('reviewee_id', 'users.id'),
                'avg_rating'
            );
            $query->orderByDesc('avg_rating')->orderByDesc('completed_projects_count');
        } else {
            // Latest Registered: order by created_at from database
            $query->orderByDesc('created_at');
        }

        $workers = $query->paginate(12)->withQueryString();

        $workers->getCollection()->transform(function ($worker) use ($user) {
            return $this->formatGigWorkerForDashboard($worker, $user);
        });

        $allSkills = Skill::orderBy('name')->pluck('name')->values()->all();

        // #region agent log
        file_put_contents(base_path('debug-849b3f.log'), json_encode(['sessionId'=>'849b3f','hypothesisId'=>'H2','location'=>'EmployerDashboardController::index','message'=>'returning Inertia Employer/Dashboard','data'=>['workersCount'=>$workers->count()],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND | LOCK_EX);
        // #endregion
        return Inertia::render('Employer/Dashboard', [
            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'user_type' => $user->user_type,
                    'profile_picture' => $this->supabaseUrl($user->profile_picture ?? $user->profile_photo),
                    'profile_photo' => $this->supabaseUrl($user->profile_photo ?? $user->profile_picture),
                    'profile_completed' => $user->profile_completed,
                    'id_verification_status' => [
                        'is_verified' => $user->isIDVerified(),
                        'has_id_front' => !empty($user->id_front_image),
                        'has_id_back' => !empty($user->id_back_image),
                        'status' => $user->id_verification_status,
                    ]
                ]
            ],
            'workers' => $workers,
            'filterOptions' => [
                'skills' => $allSkills,
            ],
            'filters' => [
                'search' => $search,
                'skills' => $skillsFilter,
                'sort' => $sort,
            ],
            'bestMatchHasSkills' => $bestMatchHasSkills,
        ]);
    }

    /**
     * Get required skill names from employer's posted jobs (for Best for Me matching)
     */
    private function getEmployerRequiredSkillNames(User $employer): array
    {
        $jobs = GigJob::where('employer_id', $employer->id)
            ->whereIn('status', ['open', 'draft'])
            ->latest()
            ->limit(20)
            ->get(['id', 'skills_requirements']);

        $names = [];
        foreach ($jobs as $job) {
            $req = $job->skills_requirements;
            if (!is_array($req)) {
                continue;
            }
            foreach ($req as $item) {
                $name = is_array($item) ? ($item['skill'] ?? $item['name'] ?? null) : $item;
                if ($name && trim((string) $name) !== '') {
                    $names[] = trim((string) $name);
                }
            }
        }
        return array_values(array_unique($names));
    }

    /**
     * Format a gig worker for the dashboard card using profile data saved in the database.
     * Uses the same profile source as the gig worker profile page (skills_with_experience, etc.).
     */
    private function formatGigWorkerForDashboard(User $worker, User $authUser): array
    {
        // Use skills from skills_with_experience (saved profile) first, then fallback to skill_user relation
        $skillNames = $this->getSkillNamesFromProfile($worker);

        return [
            'id' => $worker->id,
            'first_name' => $worker->first_name,
            'last_name' => $worker->last_name,
            'full_name' => trim($worker->first_name . ' ' . $worker->last_name) ?: $worker->name,
            'professional_title' => $worker->professional_title,
            'bio' => $worker->bio ? \Illuminate\Support\Str::limit($worker->bio, 160) : null,
            'skills' => $skillNames,
            'hourly_rate' => $worker->hourly_rate !== null ? (string) $worker->hourly_rate : null,
            'portfolio_link' => $worker->portfolio_link ?? null,
            'profile_picture' => $this->supabaseUrl($worker->profile_picture ?? $worker->profile_photo ?? $worker->avatar),
            'profile_url' => route('gig-worker.profile.show', $worker->id),
            'created_at' => $worker->created_at?->toIso8601String(),
        ];
    }

    /**
     * Get skill names from the gig worker's saved profile (skills_with_experience) or skill_user relation.
     */
    private function getSkillNamesFromProfile(User $worker): array
    {
        $raw = $worker->skills_with_experience ?? [];
        if (is_array($raw) && !empty($raw)) {
            return array_values(array_filter(array_map(function ($item) {
                $name = is_array($item) ? ($item['skill'] ?? $item['name'] ?? null) : $item;
                return $name ? trim((string) $name) : null;
            }, $raw)));
        }
        if ($worker->relationLoaded('skills') && $worker->skills->isNotEmpty()) {
            return $worker->skills->pluck('name')->map(fn ($n) => (string) $n)->values()->all();
        }
        return [];
    }

    /**
     * Convert a stored '/supabase/...' path to a browser-accessible URL.
     * Files are served through the app proxy at /storage/supabase/{path}.
     */
    private function supabaseUrl(?string $stored): ?string
    {
        if (!$stored || !is_string($stored)) {
            return null;
        }
        $stored = trim($stored);
        if ($stored === '') {
            return null;
        }
        if (str_starts_with($stored, 'http://') || str_starts_with($stored, 'https://')) {
            return $stored;
        }
        $path = ltrim(str_replace('/supabase/', '', $stored), '/');
        if ($path === '') {
            return null;
        }
        return url('/storage/supabase/' . $path);
    }

    private function getJobsSummary($user)
    {
        $jobs = GigJob::where('employer_id', $user->id)
            ->select('status', 'created_at')
            ->get();

        return [
            'total' => $jobs->count(),
            'active' => $jobs->where('status', 'open')->count(),
            'completed' => $jobs->where('status', 'completed')->count(),
            'draft' => $jobs->where('status', 'draft')->count(),
            'recent' => $jobs->where('created_at', '>=', now()->subDays(30))->count(),
            'jobs' => GigJob::where('employer_id', $user->id)
                ->withCount(['bids'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(function ($job) {
                    return [
                        'id' => $job->id,
                        'title' => $job->title,
                        'status' => $job->status,
                        'created_at' => $job->created_at,
                        'bids_count' => $job->bids_count,
                        'budget_type' => $job->budget_type,
                        'budget_min' => $job->budget_min,
                        'budget_max' => $job->budget_max,
                    ];
                })
        ];
    }

    private function getProposalsReceived($user)
    {
        return Bid::whereHas('job', function ($query) use ($user) {
                $query->where('employer_id', $user->id);
            })
            ->with(['job', 'gigWorker'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($bid) {
                return [
                    'id' => $bid->id,
                    'job_title' => $bid->job->title,
                    'job_id' => $bid->job->id,
                    'freelancer_name' => $bid->gigWorker->first_name . ' ' . $bid->gigWorker->last_name,
                    'freelancer_id' => $bid->gigWorker->id,
                    'bid_amount' => $bid->bid_amount,
                    'proposal_message' => $bid->proposal_message,
                    'estimated_days' => $bid->estimated_days,
                    'submitted_at' => $bid->submitted_at,
                    'status' => $bid->status,
                ];
            });
    }

    private function getActiveContracts($user)
    {
        return Project::where('employer_id', $user->id)
            ->where('contract_signed', true)
            ->whereIn('status', ['active', 'in_progress'])
            ->with(['gigWorker', 'job'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($project) {
                return [
                    'id' => $project->id,
                    'job_title' => $project->job->title,
                    'freelancer_name' => $project->gigWorker->first_name . ' ' . $project->gigWorker->last_name,
                    'freelancer_id' => $project->gigWorker->id,
                    'agreed_amount' => $project->agreed_amount,
                    'status' => $project->status,
                    'started_at' => $project->started_at,
                    'progress_percentage' => $project->getProgressPercentageAttribute(),
                    'payment_released' => $project->payment_released,
                    'contract_signed_at' => $project->contract_signed_at,
                ];
            });
    }

    /**
     * Get notifications data for dashboard
     */
    private function getNotificationsData($user)
    {
        return [
            'recent' => $this->notificationManager->getRelevantNotifications($user),
            'escrow' => $this->notificationManager->getEscrowAlerts($user),
            'deadlines' => $this->notificationManager->getUpcomingDeadlines($user),
            'messages' => $this->notificationManager->getMessageNotifications($user),
            'unreadCount' => $this->notificationService->getUnreadCount($user)
        ];
    }

    /**
     * Get notification service instance
     */
    protected function getNotificationService(): NotificationService
    {
        return $this->notificationService;
    }

    /**
     * Search across all employer data
     */
    public function search(Request $request)
    {
        $user = $request->user();

        // Ensure only employers can access this
        if ($user->user_type !== 'employer') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = $request->get('q', '');
        $filters = $request->get('filters', []);

        if (empty($query) && empty($filters)) {
            return response()->json([
                'results' => [],
                'total' => 0,
                'suggestions' => $this->searchService->getSuggestions($user, ''),
                'filters' => $this->searchService->getAdvancedFilters($user)
            ]);
        }

        $results = $this->searchService->search($user, $query, $filters);

        return response()->json([
            'results' => $results,
            'query' => $query,
            'filters' => $filters,
            'suggestions' => $this->searchService->getSuggestions($user, $query),
            'available_filters' => $this->searchService->getAdvancedFilters($user)
        ]);
    }

    /**
     * Get search suggestions
     */
    public function getSuggestions(Request $request)
    {
        $user = $request->user();

        if ($user->user_type !== 'employer') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = $request->get('q', '');

        return response()->json([
            'suggestions' => $this->searchService->getSuggestions($user, $query)
        ]);
    }

    /**
     * Get available filters
     */
    public function getFilters(Request $request)
    {
        $user = $request->user();

        if ($user->user_type !== 'employer') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'filters' => $this->searchService->getAdvancedFilters($user),
            'stats' => $this->searchService->getSearchStats($user)
        ]);
    }

    /**
     * Export dashboard data
     */
    public function export(Request $request)
    {
        $user = $request->user();

        // Ensure only employers can access this
        if ($user->user_type !== 'employer') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $format = $request->get('format', 'csv');
        $type = $request->get('type', 'all');
        $filters = $request->get('filters', []);

        // Validate format
        if (!in_array($format, ['csv', 'json', 'pdf'])) {
            return response()->json(['error' => 'Invalid export format'], 400);
        }

        // Validate type
        if (!in_array($type, ['all', 'jobs', 'proposals', 'contracts', 'notifications', 'deadlines', 'analytics'])) {
            return response()->json(['error' => 'Invalid export type'], 400);
        }

        try {
            switch ($format) {
                case 'csv':
                    $content = $this->exportService->exportToCSV($user, $type, $filters);
                    $filename = "export_{$type}_" . now()->format('Y-m-d_H-i-s') . '.csv';
                    $mimeType = 'text/csv';
                    break;

                case 'json':
                    $content = $this->exportService->exportToJSON($user, $type, $filters);
                    $filename = "export_{$type}_" . now()->format('Y-m-d_H-i-s') . '.json';
                    $mimeType = 'application/json';
                    break;

                case 'pdf':
                    $content = $this->exportService->exportToPDF($user);
                    $filename = "export_report_" . now()->format('Y-m-d_H-i-s') . '.json'; // PDF data as JSON
                    $mimeType = 'application/json';
                    break;

                default:
                    return response()->json(['error' => 'Unsupported format'], 400);
            }

            return response($content, 200, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Export failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available export formats
     */
    public function getExportFormats(Request $request)
    {
        $user = $request->user();

        if ($user->user_type !== 'employer') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'formats' => $this->exportService->getAvailableFormats(),
            'types' => $this->exportService->getAvailableTypes()
        ]);
    }

    /**
     * Get export preview
     */
    public function getExportPreview(Request $request)
    {
        $user = $request->user();

        if ($user->user_type !== 'employer') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $type = $request->get('type', 'all');
        $filters = $request->get('filters', []);

        try {
            $data = $this->exportService->getExportData($user, $type, $filters);
            $summary = $this->exportService->getExportSummary($user, $type, $filters);

            return response()->json([
                'preview' => array_slice($data, 0, 10), // Show first 10 records
                'total_records' => count($data),
                'summary' => $summary,
                'headers' => $this->exportService->getCSVHeaders($type)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Preview failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}