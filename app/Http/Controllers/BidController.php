<?php

namespace App\Http\Controllers;

use App\Models\Bid;
use App\Models\GigJob;
use App\Models\ImmutableAuditLog;
use App\Services\ContractService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use App\Models\Project;
use App\Models\Transaction;

class BidController extends Controller
{
    protected ContractService $contractService;
    protected NotificationService $notificationService;

    public function __construct(
        ContractService $contractService,
        NotificationService $notificationService
    ) {
        $this->contractService = $contractService;
        $this->notificationService = $notificationService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $user = auth()->user();

        if ($user->user_type === 'gig_worker') {
            // Show gig worker's bids
            $bids = Bid::with(['job.employer'])
                ->where('gig_worker_id', $user->id)
                ->latest()
                ->paginate(10);

            // #region agent log
            try {
                $sample = collect($bids->items())->take(3)->map(function ($bid) {
                    $jobArray = $bid->job ? $bid->job->toArray() : [];
                    return [
                        'bid_id' => $bid->id,
                        'job_id' => $bid->job?->id,
                        'budget_min' => $bid->job?->budget_min,
                        'budget_max' => $bid->job?->budget_max,
                        'budget_type' => $bid->job?->budget_type,
                        'budget_display_accessor' => $bid->job?->budget_display,
                        'has_budget_display_in_array' => array_key_exists('budget_display', $jobArray),
                    ];
                })->values()->all();

                file_put_contents(
                    base_path('debug-75cf24.log'),
                    json_encode([
                        'sessionId' => '75cf24',
                        'runId' => 'run1',
                        'hypothesisId' => 'H1,H2',
                        'location' => 'BidController@index',
                        'message' => 'Gig worker bids payload sample',
                        'data' => [
                            'count' => $bids->count(),
                            'sample' => $sample,
                        ],
                        'timestamp' => round(microtime(true) * 1000),
                    ]) . "\n",
                    FILE_APPEND | LOCK_EX
                );
            } catch (\Throwable $e) {
                // keep logging non-blocking
            }
            // #endregion
        } else {
            // Show bids on employer's jobs
            $bids = Bid::with(['job', 'gigWorker'])
                ->whereHas('job', function ($query) use ($user) {
                    $query->where('employer_id', $user->id);
                })
                ->latest()
                ->paginate(10);
        }

        return Inertia::render('Bids/Index', [
            'bids' => $bids,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'job_id' => 'required|exists:gig_jobs,id',
            'bid_amount' => 'required|numeric|min:0',
            'proposal_message' => 'required|string|min:50',
            'estimated_days' => 'required|integer|min:1',
        ]);

        $job = GigJob::findOrFail($validated['job_id']);

        // Check if job is still open
        if (!$job->isOpen()) {
            return back()->withErrors(['job' => 'This job is no longer accepting bids.']);
        }

        // Check if user is a gig worker
        if (auth()->user()->user_type !== 'gig_worker') {
            return back()->withErrors(['user' => 'Only gig workers can submit bids.']);
        }

        // Check if gig worker already has an active bid on this job
        $existingBid = Bid::where('job_id', $job->id)
            ->where('gig_worker_id', auth()->id())
            ->whereNotIn('status', ['rejected', 'withdrawn'])
            ->first();

        if ($existingBid) {
            return back()->withErrors(['bid' => 'You already have an active bid for this job.']);
        }

        $validated['gig_worker_id'] = auth()->id();

        $bid = Bid::create($validated);

        ImmutableAuditLog::createLog(
            'bids',
            'CREATE',
            (int) $bid->id,
            auth()->id(),
            'user',
            null,
            [
                'job_id' => $validated['job_id'],
                'submitted_at' => $bid->submitted_at?->toISOString() ?? now()->toISOString(),
            ],
            null,
            $request->ip(),
            ['user_agent' => $request->userAgent()],
            $request->session()->getId()
        );

        return redirect()->route('jobs.show', $job)
            ->with('success', 'Your bid has been submitted successfully!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Bid $bid): Response
    {
        $bid->load([
            'job.employer',
            'gigWorker' => function ($query) {
                $query->select([
                    'id', 'first_name', 'last_name', 'profile_picture',
                    'professional_title', 'bio', 'skills_with_experience',
                    'portfolio_link', 'resume_file', 'average_rating'
                ]);
            }
        ]);

        // Check if user can view this bid
        $user = auth()->user();
        if ($bid->gig_worker_id !== $user->id && $bid->job->employer_id !== $user->id) {
            abort(403);
        }

        return Inertia::render('Bids/Show', [
            'bid' => $bid,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Bid $bid)
    {
        // Validate request
        $request->validate([
            'status' => 'required|in:accepted,rejected'
        ]);

        // Only job owner can accept/reject bids
        if ($bid->job->employer_id !== auth()->id()) {
            return back()->withErrors(['error' => 'You are not authorized to perform this action.']);
        }

        // Can only update pending bids
        if (!$bid->isPending()) {
            return back()->withErrors(['error' => 'You can only update pending bids.']);
        }

        try {
            DB::beginTransaction();

            if ($request->status === 'accepted') {
                // Check client balance
                $client = auth()->user();
                if ($client->escrow_balance < $bid->bid_amount) {
                    DB::rollBack();
                    return back()->with([
                        'error' => 'Insufficient escrow balance to accept this proposal.',
                        'error_type' => 'insufficient_escrow',
                        'required_amount' => $bid->bid_amount,
                        'current_balance' => $client->escrow_balance
                    ]);
                }

                // Reject other bids and notify bidders
                $rejectedBids = Bid::where('job_id', $bid->job_id)
                    ->where('id', '!=', $bid->id)
                    ->where('status', 'pending')
                    ->get();

                foreach ($rejectedBids as $rejectedBid) {
                    $rejectedBid->update(['status' => 'rejected']);

                    // Notify rejected bidders
                    $this->notificationService->createBidStatusNotification(
                        $rejectedBid->gigWorker,
                        'rejected',
                        [
                            'job_id' => $bid->job_id,
                            'job_title' => $bid->job->title,
                            'contract_id' => null
                        ]
                    );
                }

                // Update job status
                $bid->job->update(['status' => 'in_progress']);

                // Calculate fees
                $platformFee = $bid->bid_amount * 0.05; // 5% platform fee
                $netAmount = $bid->bid_amount - $platformFee;

                // Create project
                $project = Project::create([
                    'job_id' => $bid->job_id,
                    'employer_id' => $bid->job->employer_id,
                    'gig_worker_id' => $bid->gig_worker_id,
                    'bid_id' => $bid->id,
                    'agreed_amount' => $bid->bid_amount,
                    'agreed_duration_days' => $bid->estimated_days,
                    'deadline' => $bid->estimated_days ? now()->addDays($bid->estimated_days) : null,
                    'platform_fee' => $platformFee,
                    'net_amount' => $netAmount,
                    'status' => 'active',
                    'started_at' => now(),
                ]);

                // Deduct from employer balance
                $client->decrement('escrow_balance', $bid->bid_amount);

                // Create transaction record
                Transaction::create([
                    'project_id' => $project->id,
                    'payer_id' => $client->id,
                    'payee_id' => $bid->gig_worker_id,
                    'amount' => $bid->bid_amount,
                    'platform_fee' => $platformFee,
                    'net_amount' => $netAmount,
                    'type' => 'escrow',
                    'status' => 'completed',
                    'stripe_payment_intent_id' => 'escrow_' . time(),
                    'stripe_charge_id' => 'charge_' . time(),
                    'description' => 'Escrow payment for project #' . $project->id,
                    'processed_at' => now(),
                ]);

                // Create contract
                $contract = $this->contractService->createContractFromBid($project, $bid);

                // Send notifications to both gig worker and employer
                $this->notificationService->createContractSigningNotification($bid->gigWorker, [
                    'job_title' => $bid->job->title,
                    'contract_id' => $contract->id,
                    'project_id' => $project->id
                ]);

                $this->notificationService->createContractSigningNotification($client, [
                    'job_title' => $bid->job->title,
                    'contract_id' => $contract->id,
                    'project_id' => $project->id
                ]);

                // Send messaging capability notifications to both parties
                $employerName = $client->first_name . ' ' . $client->last_name;
                $gigWorkerName = $bid->gigWorker->first_name . ' ' . $bid->gigWorker->last_name;

                $this->notificationService->createBidAcceptedMessagingNotification($bid->gigWorker, [
                    'job_title' => $bid->job->title,
                    'other_user_name' => $employerName,
                    'other_user_id' => $client->id,
                    'project_id' => $project->id,
                    'bid_id' => $bid->id
                ]);

                $this->notificationService->createBidAcceptedMessagingNotification($client, [
                    'job_title' => $bid->job->title,
                    'other_user_name' => $gigWorkerName,
                    'other_user_id' => $bid->gig_worker_id,
                    'project_id' => $project->id,
                    'bid_id' => $bid->id
                ]);

                // Update bid status
                $bid->update([
                    'status' => 'accepted',
                    'accepted_at' => now()
                ]);

                DB::commit();

                // Return with success and redirect to contract
                return back()->with([
                    'success' => 'Proposal accepted successfully!',
                    'redirect' => route('contracts.sign', $contract->id)
                ]);

            } else {
                // Just update status to rejected
                $bid->update(['status' => 'rejected']);
                DB::commit();

                return back()->with('success', 'Proposal declined successfully.');
            }

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Bid acceptance failed', [
                'bid_id' => $bid->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return back()->withErrors(['error' => 'Failed to update bid status: ' . $e->getMessage()]);
        }
    }

    /**
     * Update the specified resource in storage (for gig workers).
     */
    public function updateStatus(Request $request, Bid $bid)
    {
        // Only gig worker can update their own bid
        if ($bid->gig_worker_id !== auth()->id()) {
            abort(403);
        }

        // Can only update pending bids
        if (!$bid->isPending()) {
            return back()->withErrors(['bid' => 'You can only update pending bids.']);
        }

        // Validate request
        $request->validate([
            'bid_amount' => 'required|numeric|min:0',
            'proposal_message' => 'required|string|min:50',
            'estimated_days' => 'required|integer|min:1',
        ]);

        $bid->update($request->only(['bid_amount', 'proposal_message', 'estimated_days']));

        return back()->with('success', 'Bid updated successfully!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Bid $bid)
    {
        // Only gig worker can withdraw their own bid
        if ($bid->gig_worker_id !== auth()->id()) {
            abort(403);
        }

        // Can only withdraw pending bids
        if (!$bid->isPending()) {
            return back()->withErrors(['bid' => 'You can only withdraw pending bids.']);
        }

        $bid->update(['status' => 'withdrawn']);

        return back()->with('success', 'Bid withdrawn successfully!');
    }
}
