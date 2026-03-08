<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Project;
use App\Models\Transaction;
use App\Models\Bid;
use App\Models\Review;
use App\Models\GigJob;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class AnalyticsController extends Controller
{
    /**
     * Display analytics dashboard
     */
    public function index(): Response
    {
        $user = auth()->user();

        \Log::info('Analytics index accessed', ['user_id' => $user->id, 'user_type' => $user->user_type]);

        if ($user->isFreelancer()) {
            return $this->freelancerAnalytics();
        } else {
            return $this->clientAnalytics();
        }
    }

    /**
     * Freelancer analytics dashboard
     */
    private function freelancerAnalytics(): Response
    {
        $user = auth()->user();
        
        // Overview stats
        $totalEarnings = $user->paymentsReceived()
            ->where('type', 'release')
            ->where('status', 'completed')
            ->sum('net_amount');
            
        $completedProjects = $user->freelancerProjects()
            ->where('status', 'completed')
            ->count();
            
        $averageRating = $user->receivedReviews()->avg('rating') ?? 0;
        
        $activeProjects = $user->freelancerProjects()
            ->whereIn('status', ['active', 'in_progress'])
            ->count();

        // Monthly earnings for chart - Database agnostic
        $dateSql = $this->getDateExtractionSql();
        $monthlyEarnings = $user->paymentsReceived()
            ->where('type', 'release')
            ->where('status', 'completed')
            ->where('created_at', '>=', Carbon::now()->subMonths(12))
            ->selectRaw("{$dateSql['month']} as month, {$dateSql['year']} as year, SUM(net_amount) as total")
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'period' => Carbon::create($item->year, $item->month)->format('M Y'),
                    'earnings' => (float) $item->total
                ];
            });

        // Ensure we have data for the last 12 months
        if ($monthlyEarnings->isEmpty()) {
            $monthlyEarnings = collect([
                ['period' => Carbon::now()->format('M Y'), 'earnings' => 0]
            ]);
        }

        // Project completion rate
        $totalBids = $user->bids()->count();
        $acceptedBids = $user->bids()->where('status', 'accepted')->count();
        $bidSuccessRate = $totalBids > 0 ? ($acceptedBids / $totalBids) * 100 : 0;

        // Recent projects
        $recentProjects = $user->freelancerProjects()
            ->with(['job:id,title', 'client:id,first_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Skills performance
        $skillsPerformance = $this->getFreelancerSkillsPerformance($user);

        // Ensure we have some skills data
        if ($skillsPerformance->isEmpty()) {
            $skillsPerformance = collect([
                ['skill' => 'No data', 'projects' => 0, 'earnings' => 0]
            ]);
        }

        return Inertia::render('Analytics/FreelancerDashboard', [
            'overview' => [
                'total_earnings' => $totalEarnings,
                'completed_projects' => $completedProjects,
                'average_rating' => round($averageRating, 1),
                'active_projects' => $activeProjects,
                'bid_success_rate' => round($bidSuccessRate, 1)
            ],
            'monthly_earnings' => $monthlyEarnings,
            'recent_projects' => $recentProjects,
            'skills_performance' => $skillsPerformance
        ]);
    }

    /**
     * Client analytics dashboard
     */
    private function clientAnalytics(): Response
    {
        $user = auth()->user();
        
        // Overview stats
        $totalSpent = $user->paymentsMade()
            ->where('type', 'release')
            ->where('status', 'completed')
            ->sum('amount');
            
        $completedProjects = $user->employerProjects()
            ->where('status', 'completed')
            ->count();
            
        $activeJobs = $user->postedJobs()
            ->where('status', 'open')
            ->count();
            
        $totalFreelancersHired = $user->employerProjects()
            ->distinct('freelancer_id')
            ->count();

        // Monthly spending for chart - Database agnostic
        $dateSql = $this->getDateExtractionSql();
        $monthlySpending = $user->paymentsMade()
            ->where('type', 'release')
            ->where('status', 'completed')
            ->where('created_at', '>=', Carbon::now()->subMonths(12))
            ->selectRaw("{$dateSql['month']} as month, {$dateSql['year']} as year, SUM(amount) as total")
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'period' => Carbon::create($item->year, $item->month)->format('M Y'),
                    'spending' => (float) $item->total
                ];
            });

        // Ensure we have data for the last 12 months
        if ($monthlySpending->isEmpty()) {
            $monthlySpending = collect([
                ['period' => Carbon::now()->format('M Y'), 'spending' => 0]
            ]);
        }

        // Project success rate
        $totalProjects = $user->employerProjects()->count();
        $successfulProjects = $user->employerProjects()
            ->where('status', 'completed')
            ->where('employer_approved', true)
            ->count();
        $projectSuccessRate = $totalProjects > 0 ? ($successfulProjects / $totalProjects) * 100 : 0;

        // Recent projects
        $recentProjects = $user->employerProjects()
            ->with(['job:id,title', 'freelancer:id,first_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Hiring insights
        $hiringInsights = $this->getClientHiringInsights($user);

        return Inertia::render('Analytics/ClientDashboard', [
            'overview' => [
                'total_spent' => $totalSpent,
                'completed_projects' => $completedProjects,
                'active_jobs' => $activeJobs,
                'freelancers_hired' => $totalFreelancersHired,
                'project_success_rate' => round($projectSuccessRate, 1)
            ],
            'monthly_spending' => $monthlySpending,
            'recent_projects' => $recentProjects,
            'hiring_insights' => $hiringInsights
        ]);
    }

    /**
     * Detailed earnings report for freelancers
     */
    public function earnings(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->isFreelancer()) {
            abort(403, 'Access denied');
        }

        $period = $request->get('period', '12months');
        $startDate = $this->getStartDate($period);

        $earnings = $user->paymentsReceived()
            ->where('type', 'release')
            ->where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->with(['project.job:id,title', 'project.client:id,first_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $summary = [
            'total_earnings' => $earnings->sum('net_amount'),
            'total_fees' => $earnings->sum('platform_fee'),
            'average_project_value' => $earnings->avg('net_amount'),
            'projects_count' => $earnings->count()
        ];

        return Inertia::render('Analytics/Earnings', [
            'earnings' => $earnings,
            'summary' => $summary,
            'period' => $period
        ]);
    }

    /**
     * Detailed projects report
     */
    public function projects(Request $request)
    {
        $user = auth()->user();
        $period = $request->get('period', '12months');
        $startDate = $this->getStartDate($period);

        if ($user->isFreelancer()) {
            $projects = $user->freelancerProjects()
                ->where('created_at', '>=', $startDate)
                ->with(['job:id,title', 'client:id,first_name,last_name', 'reviews'])
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        } else {
            $projects = $user->employerProjects()
                ->where('created_at', '>=', $startDate)
                ->with(['job:id,title', 'freelancer:id,first_name,last_name', 'reviews'])
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        }

        return Inertia::render('Analytics/Projects', [
            'projects' => $projects,
            'period' => $period,
            'user_type' => $user->user_type
        ]);
    }

    /**
     * Performance metrics
     */
    public function performance(Request $request)
    {
        $user = auth()->user();
        
        if ($user->isFreelancer()) {
            return $this->freelancerPerformance($request);
        } else {
            return $this->clientPerformance($request);
        }
    }

    /**
     * Export analytics data
     */
    public function export(Request $request)
    {
        try {
            $user = auth()->user();
            $type = $request->get('type', 'earnings');
            $period = $request->get('period', '12months');
            $format = $request->get('format', 'csv');

            \Log::info('Export requested', ['user_id' => $user->id, 'type' => $type, 'period' => $period]);

            $startDate = $this->getStartDate($period);

            if ($user->isFreelancer()) {
                return $this->exportFreelancerData($user, $type, $startDate, $format);
            } else {
                return $this->exportClientData($user, $type, $startDate, $format);
            }
        } catch (\Exception $e) {
            \Log::error('Export failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Export failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get freelancer skills performance
     */
    private function getFreelancerSkillsPerformance($user)
    {
        // Analyze which skills generate most income
        $skills = $user->skills ?? [];
        $skillsData = [];
        
        foreach ($skills as $skill) {
            $projectsWithSkill = $user->freelancerProjects()
                ->whereHas('job', function($query) use ($skill) {
                    $query->whereJsonContains('required_skills', $skill);
                })
                ->where('status', 'completed')
                ->count();
                
            $earningsFromSkill = $user->paymentsReceived()
                ->whereHas('project.job', function($query) use ($skill) {
                    $query->whereJsonContains('required_skills', $skill);
                })
                ->where('type', 'release')
                ->where('status', 'completed')
                ->sum('net_amount');
                
            $skillsData[] = [
                'skill' => $skill,
                'projects' => $projectsWithSkill,
                'earnings' => (float) $earningsFromSkill
            ];
        }
        
        return collect($skillsData)->sortByDesc('earnings')->take(10)->values();
    }

    /**
     * Get client hiring insights
     */
    private function getClientHiringInsights($user)
    {
        // Database agnostic date difference calculation
        $dateSql = $this->getDateExtractionSql();
        $avgProjectDuration = $user->employerProjects()
            ->whereNotNull('completed_at')
            ->whereNotNull('started_at')
            ->selectRaw("AVG({$dateSql['date_diff']}) as avg_duration")
            ->value('avg_duration');

        $repeatFreelancers = $user->employerProjects()
            ->select('freelancer_id')
            ->groupBy('freelancer_id')
            ->havingRaw('COUNT(*) > 1')
            ->count();

        return [
            'avg_project_duration' => round($avgProjectDuration ?? 0, 1),
            'repeat_freelancers' => $repeatFreelancers,
            'avg_project_cost' => $user->employerProjects()->avg('agreed_amount') ?? 0
        ];
    }

    /**
     * Get start date based on period
     */
    private function getStartDate($period)
    {
        switch ($period) {
            case '1month':
                return Carbon::now()->subMonth();
            case '3months':
                return Carbon::now()->subMonths(3);
            case '6months':
                return Carbon::now()->subMonths(6);
            case '12months':
            default:
                return Carbon::now()->subMonths(12);
        }
    }

    /**
     * Freelancer performance metrics
     */
    private function freelancerPerformance($request)
    {
        // Implementation for detailed freelancer performance
        return Inertia::render('Analytics/FreelancerPerformance');
    }

    /**
     * Client performance metrics
     */
    private function clientPerformance($request)
    {
        // Implementation for detailed client performance
        return Inertia::render('Analytics/ClientPerformance');
    }

    /**
     * Export freelancer data
     */
    private function exportFreelancerData($user, $type, $startDate, $format)
    {
        if ($type === 'earnings') {
            $data = $user->paymentsReceived()
                ->where('type', 'release')
                ->where('status', 'completed')
                ->where('created_at', '>=', $startDate)
                ->with(['project.job:id,title', 'project.client:id,first_name,last_name'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($earning) {
                    return [
                        'Date' => $earning->created_at->format('Y-m-d'),
                        'Project' => $earning->project->job->title ?? 'Untitled Project',
                        'Client' => ($earning->project->client->first_name ?? '') . ' ' . ($earning->project->client->last_name ?? ''),
                        'Amount' => $earning->amount,
                        'Platform Fee' => $earning->platform_fee,
                        'Net Amount' => $earning->net_amount,
                        'Status' => $earning->status
                    ];
                });

            // Calculate summary data for earnings
            $totalEarnings = $data->sum('Amount');
            $totalFees = $data->sum('Platform Fee');
            $netAmount = $data->sum('Net Amount');
            $totalProjects = $data->count();

            return $this->generatePdfResponse($data, 'earnings-pdf', [
                'user' => $user,
                'period' => $this->getPeriodLabel($startDate),
                'generatedAt' => now(),
                'totalEarnings' => $totalEarnings,
                'totalFees' => $totalFees,
                'netAmount' => $netAmount,
                'totalProjects' => $totalProjects
            ], "freelancer_earnings_" . now()->format('Y-m-d'));

        } else {
            // Projects export
            $data = $user->freelancerProjects()
                ->where('created_at', '>=', $startDate)
                ->with(['job:id,title', 'client:id,first_name,last_name'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($project) {
                    return [
                        'Project' => $project->job->title ?? 'Untitled Project',
                        'Client' => ($project->client->first_name ?? '') . ' ' . ($project->client->last_name ?? ''),
                        'Amount' => $project->agreed_amount,
                        'Status' => $project->status,
                        'Started' => $project->started_at ? $project->started_at->format('Y-m-d') : '',
                        'Completed' => $project->completed_at ? $project->completed_at->format('Y-m-d') : '',
                        'Created' => $project->created_at->format('Y-m-d')
                    ];
                });

            // Calculate summary data for projects
            $totalProjects = $data->count();
            $completedProjects = $data->where('Status', 'completed')->count();
            $activeProjects = $data->whereIn('Status', ['active', 'in_progress'])->count();
            $totalValue = $data->sum('Amount');

            return $this->generatePdfResponse($data, 'projects-pdf', [
                'user' => $user,
                'userRole' => 'freelancer',
                'period' => $this->getPeriodLabel($startDate),
                'generatedAt' => now(),
                'totalProjects' => $totalProjects,
                'completedProjects' => $completedProjects,
                'activeProjects' => $activeProjects,
                'totalValue' => $totalValue
            ], "freelancer_projects_" . now()->format('Y-m-d'));
        }
    }

    /**
     * Export client data
     */
    private function exportClientData($user, $type, $startDate, $format)
    {
        if ($type === 'spending') {
            $data = $user->paymentsMade()
                ->where('type', 'release')
                ->where('status', 'completed')
                ->where('created_at', '>=', $startDate)
                ->with(['project.job:id,title', 'project.freelancer:id,first_name,last_name'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($payment) {
                    return [
                        'Date' => $payment->created_at->format('Y-m-d'),
                        'Project' => $payment->project->job->title ?? 'Untitled Project',
                        'Freelancer' => ($payment->project->freelancer->first_name ?? '') . ' ' . ($payment->project->freelancer->last_name ?? ''),
                        'Amount' => $payment->amount,
                        'Platform Fee' => $payment->platform_fee,
                        'Status' => $payment->status
                    ];
                });

            // Calculate summary data for spending
            $totalSpending = $data->sum('Amount');
            $totalFees = $data->sum('Platform Fee');
            $totalProjects = $data->count();
            $averageSpending = $totalProjects > 0 ? $totalSpending / $totalProjects : 0;

            return $this->generatePdfResponse($data, 'spending-pdf', [
                'user' => $user,
                'period' => $this->getPeriodLabel($startDate),
                'generatedAt' => now(),
                'totalSpending' => $totalSpending,
                'totalFees' => $totalFees,
                'totalProjects' => $totalProjects,
                'averageSpending' => $averageSpending
            ], "client_spending_" . now()->format('Y-m-d'));

        } else {
            // Projects export
            $data = $user->employerProjects()
                ->where('created_at', '>=', $startDate)
                ->with(['job:id,title', 'freelancer:id,first_name,last_name'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($project) {
                    return [
                        'Project' => $project->job->title ?? 'Untitled Project',
                        'Freelancer' => ($project->freelancer->first_name ?? '') . ' ' . ($project->freelancer->last_name ?? ''),
                        'Amount' => $project->agreed_amount,
                        'Status' => $project->status,
                        'Started' => $project->started_at ? $project->started_at->format('Y-m-d') : '',
                        'Completed' => $project->completed_at ? $project->completed_at->format('Y-m-d') : '',
                        'Created' => $project->created_at->format('Y-m-d')
                    ];
                });

            // Calculate summary data for projects
            $totalProjects = $data->count();
            $completedProjects = $data->where('Status', 'completed')->count();
            $activeProjects = $data->whereIn('Status', ['active', 'in_progress'])->count();
            $totalValue = $data->sum('Amount');

            return $this->generatePdfResponse($data, 'projects-pdf', [
                'user' => $user,
                'userRole' => 'client',
                'period' => $this->getPeriodLabel($startDate),
                'generatedAt' => now(),
                'totalProjects' => $totalProjects,
                'completedProjects' => $completedProjects,
                'activeProjects' => $activeProjects,
                'totalValue' => $totalValue
            ], "client_projects_" . now()->format('Y-m-d'));
        }
    }

    /**
     * Generate PDF response
     */
    private function generatePdfResponse($data, $template, $additionalData, $filename)
    {
        $pdfData = array_merge([
            'data' => $data
        ], $additionalData);

        $pdf = Pdf::loadView("analytics.{$template}", $pdfData)
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isRemoteEnabled' => true,
                'isHtml5ParserEnabled' => true,
                'isPhpEnabled' => true
            ]);

        return $pdf->download("{$filename}.pdf");
    }

    /**
     * Get period label for display
     */
    private function getPeriodLabel($startDate)
    {
        $months = Carbon::now()->diffInMonths($startDate);

        if ($months <= 1) {
            return 'Last Month';
        } elseif ($months <= 3) {
            return 'Last 3 Months';
        } elseif ($months <= 6) {
            return 'Last 6 Months';
        } else {
            return 'Last 12 Months';
        }
    }

    /**
     * Get database-specific date extraction SQL
     */
    private function getDateExtractionSql()
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return [
                'month' => "strftime('%m', created_at)",
                'year' => "strftime('%Y', created_at)",
                'date_diff' => "julianday(completed_at) - julianday(started_at)"
            ];
        } elseif ($driver === 'pgsql') {
            // PostgreSQL
            return [
                'month' => 'EXTRACT(MONTH FROM created_at)',
                'year' => 'EXTRACT(YEAR FROM created_at)',
                'date_diff' => 'EXTRACT(EPOCH FROM (completed_at - started_at))/86400'
            ];
        } else {
            // MySQL
            return [
                'month' => 'MONTH(created_at)',
                'year' => 'YEAR(created_at)',
                'date_diff' => 'DATEDIFF(completed_at, started_at)'
            ];
        }
    }
}
