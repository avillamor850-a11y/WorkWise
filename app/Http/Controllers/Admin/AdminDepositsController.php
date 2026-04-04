<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deposit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminDepositsController extends Controller
{
    /**
     * Apply list/export filters. Only accepts known status and Y-m-d dates so bad query params cannot break SQL drivers.
     */
    private function applyDepositFilters(Request $request, Builder $query): void
    {
        $status = $request->query('status');
        if (is_string($status) && in_array($status, ['pending', 'completed', 'failed'], true)) {
            $query->where('status', $status);
        }

        $from = $request->query('date_from');
        if (is_string($from) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
            $query->whereDate('created_at', '>=', $from);
        }

        $to = $request->query('date_to');
        if (is_string($to) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            $query->whereDate('created_at', '<=', $to);
        }
    }

    /**
     * List all user-added funds (employer deposits) for the platform owner.
     */
    public function index(Request $request): Response
    {
        $query = Deposit::with('user:id,first_name,last_name,email');
        $this->applyDepositFilters($request, $query);

        $deposits = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();

        $stats = [
            'total_completed' => (float) Deposit::where('status', 'completed')->sum('amount'),
            'total_pending' => (float) Deposit::where('status', 'pending')->sum('amount'),
            'total_failed' => (float) Deposit::where('status', 'failed')->sum('amount'),
            'count_completed' => Deposit::where('status', 'completed')->count(),
            'count_pending' => Deposit::where('status', 'pending')->count(),
            'count_failed' => Deposit::where('status', 'failed')->count(),
        ];

        // #region agent log
        @file_put_contents(
            base_path('debug-fe5f63.log'),
            json_encode([
                'sessionId' => 'fe5f63',
                'hypothesisId' => 'H_dep',
                'location' => 'AdminDepositsController::index',
                'message' => 'deposits_index_ok',
                'data' => [
                    'paginator_total' => $deposits->total(),
                    'current_page' => $deposits->currentPage(),
                ],
                'timestamp' => round(microtime(true) * 1000),
                'runId' => 'post-fix',
            ])."\n",
            FILE_APPEND | LOCK_EX
        );
        // #endregion

        return Inertia::render('Admin/Deposits/Index', [
            'deposits' => $deposits,
            'stats' => $stats,
            'filters' => $request->only(['status', 'date_from', 'date_to']),
        ]);
    }

    /**
     * CSV export of deposits (same filters as index).
     */
    public function export(Request $request): StreamedResponse
    {
        $query = Deposit::with('user:id,first_name,last_name,email');
        $this->applyDepositFilters($request, $query);
        $rows = $query->orderBy('created_at', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="deposits_export_'.now()->format('Y-m-d').'.csv"',
        ];

        $callback = function () use ($rows) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Created', 'User', 'Email', 'Amount', 'Currency', 'Status', 'Stripe Payment Intent']);

            foreach ($rows as $deposit) {
                $u = $deposit->user;
                fputcsv($file, [
                    $deposit->id,
                    $deposit->created_at?->format('Y-m-d H:i:s'),
                    $u ? trim($u->first_name.' '.$u->last_name) : '',
                    $u?->email ?? '',
                    (string) $deposit->amount,
                    $deposit->currency,
                    $deposit->status,
                    $deposit->stripe_payment_intent_id ?? '',
                ]);
            }

            fclose($file);
        };

        // #region agent log
        @file_put_contents(
            base_path('debug-fe5f63.log'),
            json_encode([
                'sessionId' => 'fe5f63',
                'hypothesisId' => 'H_dep',
                'location' => 'AdminDepositsController::export',
                'message' => 'deposits_export',
                'data' => ['row_count' => $rows->count()],
                'timestamp' => round(microtime(true) * 1000),
                'runId' => 'post-fix',
            ])."\n",
            FILE_APPEND | LOCK_EX
        );
        // #endregion

        return response()->stream($callback, 200, $headers);
    }
}
