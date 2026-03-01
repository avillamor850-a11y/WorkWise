<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Transaction;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(
        private PaymentService $paymentService
    ) {}

    /**
     * Show payment page for project
     */
    public function show(Project $project): Response
    {
        // Ensure user is the client for this project
        if ($project->client_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        return Inertia::render('Payment/Show', [
            'project' => $project->load(['job', 'freelancer', 'acceptedBid']),
            'testCards' => $this->paymentService->getTestCards(),
            'stripeKey' => config('services.stripe.key')
        ]);
    }

    /**
     * Create payment intent for escrow
     */
    public function createPaymentIntent(Request $request, Project $project): JsonResponse
    {
        // Ensure user is the client
        if ($project->client_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $result = $this->paymentService->createEscrowPayment($project);

        if (!$result['success']) {
            return response()->json(['error' => $result['error']], 400);
        }

        return response()->json([
            'success' => true,
            'client_secret' => $result['client_secret'],
            'payment_intent_id' => $result['payment_intent_id']
        ]);
    }

    /**
     * Confirm payment
     */
    public function confirmPayment(Request $request)
    {
        $request->validate([
            'payment_intent_id' => 'required|string'
        ]);

        $result = $this->paymentService->confirmEscrowPayment($request->payment_intent_id);

        if ($result['success']) {
            return redirect()->route('projects.show', ['project' => $request->project_id])
                ->with('success', 'Payment completed successfully! Funds are now in escrow.');
        }

        return back()->withErrors(['payment' => $result['error']]);
    }

    /**
     * Release payment to freelancer
     */
    public function releasePayment(Request $request, Project $project): JsonResponse
    {
        // Ensure user is the client
        if ($project->client_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Ensure project is completed
        if (!$project->isCompleted()) {
            return response()->json(['error' => 'Project must be completed before releasing payment'], 400);
        }

        $result = $this->paymentService->releasePayment($project);

        if (!$result['success']) {
            return response()->json(['error' => $result['error']], 400);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Refund payment to client
     */
    public function refundPayment(Request $request, Project $project): JsonResponse
    {
        // Ensure user is the client
        if ($project->client_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $result = $this->paymentService->refundPayment(
            $project,
            $request->input('reason', 'requested_by_customer')
        );

        if (!$result['success']) {
            return response()->json(['error' => $result['error']], 400);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Show payment history
     */
    public function history(): Response
    {
        $user = auth()->user();
        $transactions = $this->paymentService->getPaymentHistory($user->id);

        if ($user->user_type === 'employer') {
            $escrowBalance = (float) ($user->escrow_balance ?? 0);
            $totalSpent = (float) Transaction::where('payer_id', $user->id)
                ->where('type', 'release')
                ->where('status', 'completed')
                ->sum('amount');
            $activeEscrow = (float) Project::where('employer_id', $user->id)
                ->where('status', 'active')
                ->sum('agreed_amount');
            $summary = [
                'escrow_balance' => $escrowBalance,
                'total_spent' => $totalSpent,
                'active_escrow' => $activeEscrow,
                'transaction_count' => count($transactions),
            ];
        } else {
            $totalEarned = (float) collect($transactions)->where('is_incoming', true)->where('type', 'release')->sum('net_amount');
            $pendingReleases = (float) Project::where('gig_worker_id', $user->id)
                ->where('status', 'completed')
                ->where('payment_released', false)
                ->sum('net_amount');
            $platformFees = (float) collect($transactions)->sum('platform_fee');
            $summary = [
                'total_earned' => $totalEarned,
                'pending_releases' => $pendingReleases,
                'platform_fees' => $platformFees,
                'transaction_count' => count($transactions),
            ];
        }

        return Inertia::render('Payment/History', [
            'transactions' => $transactions,
            'summary' => $summary,
        ]);
    }

    /**
     * Show transaction details
     */
    public function transaction(Transaction $transaction): Response
    {
        // Ensure user is involved in this transaction
        if ($transaction->payer_id !== auth()->id() && $transaction->payee_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        return Inertia::render('Payment/Transaction', [
            'transaction' => $transaction->load(['project.job', 'payer', 'payee'])
        ]);
    }

    /**
     * Handle deposit request (for testing)
     */
    public function deposit(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        // In a real application, this would redirect to a payment gateway
        // For testing purposes, we simply redirect with a 302 status
        return redirect()->route('employer.wallet.index')
            ->with('success', 'Redirecting to payment gateway...');
    }
}
