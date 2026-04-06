<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminReportController extends Controller
{
    /**
     * Legacy /admin/reports URL: Inertia page Admin/Reports/Index was never shipped.
     * Escrow and mandatory transaction reports live on /admin/reports/transactions.
     */
    public function index(Request $request): RedirectResponse
    {
        // #region agent log
        file_put_contents(base_path('debug-6fa68d.log'), json_encode(['sessionId' => '6fa68d', 'runId' => 'post-fix', 'hypothesisId' => 'H1', 'location' => 'AdminReportController.php:index:entry', 'message' => 'admin reports index entered', 'data' => ['path' => $request->path(), 'query' => $request->query()], 'timestamp' => round(microtime(true) * 1000)])."\n", FILE_APPEND | LOCK_EX);
        file_put_contents(base_path('debug-6fa68d.log'), json_encode(['sessionId' => '6fa68d', 'runId' => 'post-fix', 'hypothesisId' => 'H1-fix', 'location' => 'AdminReportController.php:index:redirect', 'message' => 'redirect to admin.reports.transactions', 'data' => ['target' => 'admin.reports.transactions'], 'timestamp' => round(microtime(true) * 1000)])."\n", FILE_APPEND | LOCK_EX);
        // #endregion

        return redirect()->route('admin.reports.transactions', $request->query());
    }

    /**
     * Show specific report details
     */
    public function show(Report $report): Response
    {
        $report->load([
            'reporter:id,first_name,last_name,email',
            'reportedUser:id,first_name,last_name,email,user_type,profile_status',
            'project:id,title,status,agreed_amount,created_at',
            'project.job:id,title'
        ]);

        // Get related reports involving the same users
        $relatedReports = Report::where(function ($query) use ($report) {
            $query->where('reporter_id', $report->reporter_id)
                  ->orWhere('reported_user_id', $report->reported_user_id);
        })
        ->where('id', '!=', $report->id)
        ->with(['reporter', 'reportedUser'])
        ->latest()
        ->limit(5)
        ->get();

        return Inertia::render('Admin/Reports/Show', [
            'report' => $report,
            'relatedReports' => $relatedReports,
        ]);
    }

    /**
     * Update report status
     */
    public function updateStatus(Request $request, Report $report)
    {
        $request->validate([
            'status' => 'required|in:pending,investigating,resolved,dismissed',
            'admin_notes' => 'nullable|string|max:1000',
            'action_taken' => 'nullable|string|max:500',
        ]);

        $report->update([
            'status' => $request->status,
            'admin_notes' => $request->admin_notes,
            'action_taken' => $request->action_taken,
            'resolved_at' => $request->status === 'resolved' ? now() : null,
            'resolved_by' => auth()->id(),
        ]);

        // If report is resolved and involves fraud, consider suspending the reported user
        if ($request->status === 'resolved' && $report->type === 'fraud') {
            $reportedUser = $report->reportedUser;
            if ($reportedUser) {
                // Check if user has multiple fraud reports
                $fraudReports = Report::where('reported_user_id', $reportedUser->id)
                    ->where('type', 'fraud')
                    ->where('status', 'resolved')
                    ->count();

                if ($fraudReports >= 3) {
                    $reportedUser->update(['profile_status' => 'rejected']);
                }
            }
        }

        return back()->with('success', 'Report status updated successfully.');
    }

    /**
     * Get fraud analytics
     */
    public function fraudAnalytics(): Response
    {
        $driver = DB::connection()->getDriverName();
        
        // Database-specific date formatting
        $monthFormat = $driver === 'pgsql' 
            ? "TO_CHAR(created_at, 'YYYY-MM')" 
            : "DATE_FORMAT(created_at, '%Y-%m')";
            
        $hourExtract = $driver === 'pgsql' 
            ? "EXTRACT(HOUR FROM created_at)" 
            : "HOUR(created_at)";

        $analytics = [
            'fraud_reports_by_month' => Report::where('type', 'fraud')
                ->selectRaw("{$monthFormat} as month, COUNT(*) as count")
                ->groupBy('month')
                ->orderBy('month', 'desc')
                ->limit(12)
                ->get(),

            'top_reported_users' => User::whereHas('reportsReceived', function ($query) {
                $query->where('type', 'fraud')
                      ->where('status', '!=', 'dismissed');
            })
            ->withCount(['reportsReceived as fraud_reports' => function ($query) {
                $query->where('type', 'fraud');
            }])
            ->having('fraud_reports', '>', 0)
            ->orderBy('fraud_reports', 'desc')
            ->limit(10)
            ->get(),

            'fraud_patterns' => [
                'by_type' => Report::where('type', 'fraud')
                    ->selectRaw('description, COUNT(*) as frequency')
                    ->groupBy('description')
                    ->orderBy('frequency', 'desc')
                    ->limit(10)
                    ->get(),

                'by_time' => Report::where('type', 'fraud')
                    ->selectRaw("{$hourExtract} as hour, COUNT(*) as count")
                    ->groupBy('hour')
                    ->orderBy('hour')
                    ->get(),
            ],

            'prevention_metrics' => [
                'resolved_fraud_reports' => Report::where('type', 'fraud')->where('status', 'resolved')->count(),
                'dismissed_fraud_reports' => Report::where('type', 'fraud')->where('status', 'dismissed')->count(),
                'users_suspended_for_fraud' => User::where('profile_status', 'rejected')
                    ->whereHas('reportsReceived', function ($query) {
                        $query->where('type', 'fraud')->where('status', 'resolved');
                    })
                    ->count(),
            ],
        ];

        return Inertia::render('Admin/Reports/Analytics', [
            'analytics' => $analytics,
        ]);
    }

    /**
     * Bulk update reports
     */
    public function bulkUpdate(Request $request)
    {
        $request->validate([
            'report_ids' => 'required|array',
            'report_ids.*' => 'exists:reports,id',
            'status' => 'required|in:pending,investigating,resolved,dismissed',
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        Report::whereIn('id', $request->report_ids)->update([
            'status' => $request->status,
            'admin_notes' => $request->admin_notes,
            'resolved_at' => $request->status === 'resolved' ? now() : null,
            'resolved_by' => auth()->id(),
        ]);

        return back()->with('success', count($request->report_ids) . ' reports updated successfully.');
    }
}
