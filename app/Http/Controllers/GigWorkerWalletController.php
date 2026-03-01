<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GigWorkerWalletController extends Controller
{
    /**
     * Show gig worker earnings / wallet (total, pending, balance, transactions).
     */
    public function index(Request $request): Response
    {
        $user = auth()->user();

        if ($user->user_type !== 'gig_worker') {
            abort(403, 'Only gig workers can access the earnings page.');
        }

        // Total earnings: sum of released payments (net_amount) received
        $totalEarnings = (float) Transaction::where('payee_id', $user->id)
            ->where('type', 'release')
            ->where('status', 'completed')
            ->sum('net_amount');

        // Pending earnings: projects where gig worker is assigned and payment not yet released
        $pendingPaymentsQuery = Project::where('gig_worker_id', $user->id)
            ->where('payment_released', false)
            ->whereIn('status', ['active', 'completed']);
        $pendingEarnings = (float) (clone $pendingPaymentsQuery)->get()->sum('net_amount');

        // Available balance (earnings already released land in escrow_balance for gig workers)
        $availableBalance = (float) ($user->escrow_balance ?? 0);

        // Completed projects (payment released) for display
        $completedProjects = Project::where('gig_worker_id', $user->id)
            ->where('payment_released', true)
            ->with(['job:id,title', 'employer:id,first_name,last_name'])
            ->orderBy('payment_released_at', 'desc')
            ->limit(20)
            ->get();

        // Pending payments (not yet released) for display
        $pendingPayments = Project::where('gig_worker_id', $user->id)
            ->where('payment_released', false)
            ->whereIn('status', ['active', 'completed'])
            ->with(['job:id,title', 'employer:id,first_name,last_name'])
            ->orderBy('updated_at', 'desc')
            ->get();

        // Recent release transactions for "Recent Payments Received"
        $transactions = Transaction::where('payee_id', $user->id)
            ->where('type', 'release')
            ->where('status', 'completed')
            ->with(['project.job:id,title', 'payer:id,first_name,last_name'])
            ->orderBy('processed_at', 'desc')
            ->limit(50)
            ->get();

        return Inertia::render('Freelancer/Wallet', [
            'totalEarnings' => $totalEarnings,
            'pendingEarnings' => $pendingEarnings,
            'availableBalance' => $availableBalance,
            'completedProjects' => $completedProjects,
            'pendingPayments' => $pendingPayments,
            'transactions' => ['data' => $transactions],
            'currency' => ['symbol' => '₱', 'code' => 'PHP'],
        ]);
    }
}
