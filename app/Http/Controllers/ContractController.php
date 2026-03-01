<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractSignature;
use App\Models\Project;
use App\Services\ContractService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ContractController extends Controller
{
    protected ContractService $contractService;

    public function __construct(ContractService $contractService)
    {
        $this->contractService = $contractService;
    }

    /**
     * Display a listing of contracts for the authenticated user
     */
    public function index(): Response
    {
        $user = auth()->user();
        
        $contracts = Contract::where(function ($query) use ($user) {
            $query->where('employer_id', $user->id)
                  ->orWhere('gig_worker_id', $user->id);
        })
        ->with(['employer', 'gigWorker', 'job', 'project', 'signatures'])
        ->orderBy('created_at', 'desc')
        ->paginate(10);

        return Inertia::render('Contracts/Index', [
            'contracts' => $contracts,
            'userRole' => $user->user_type
        ]);
    }

    /**
     * Show the form for creating a direct contract
     */
    public function create(Request $request): Response
    {
        $user = auth()->user();
        
        if ($user->user_type !== 'employer') {
            abort(403, 'Only employers can create direct contracts.');
        }

        $gigWorkerId = $request->query('gig_worker_id');
        $price = $request->query('price', '');

        $gigWorker = null;
        if ($gigWorkerId) {
            $gigWorker = \App\Models\User::where('user_type', 'gig_worker')->find($gigWorkerId);
        }

        $jobs = \App\Models\GigJob::where('employer_id', $user->id)
                    ->where('status', 'open')
                    ->select('id', 'title', 'budget_min', 'budget_max', 'budget_type')
                    ->get();

        return Inertia::render('Contracts/Create', [
            'gigWorker' => $gigWorker,
            'price' => $price,
            'jobs' => $jobs,
            'user' => $user
        ]);
    }

    /**
     * Store a direct contract
     */
    public function store(Request $request): RedirectResponse
    {
        $user = auth()->user();
        if ($user->user_type !== 'employer') {
            return redirect()->back()->withErrors(['message' => 'Unauthorized']);
        }

        $validated = $request->validate([
            'gig_worker_id' => 'required|exists:users,id',
            'job_id' => 'required|exists:gig_jobs,id',
            'agreed_amount' => 'required|numeric|min:0',
            'estimated_days' => 'required|integer|min:1',
            'scope_of_work' => 'required|string|min:50'
        ]);

        $job = \App\Models\GigJob::findOrFail($validated['job_id']);
        if ($job->employer_id !== $user->id) {
            return redirect()->back()->withErrors(['message' => 'Unauthorized job']);
        }

        if ($user->escrow_balance < $validated['agreed_amount']) {
            return redirect()->back()->withErrors([
                'error_type' => 'insufficient_escrow',
                'required_amount' => $validated['agreed_amount'],
                'current_balance' => $user->escrow_balance,
                'message' => 'Insufficient escrow balance to create this contract.'
            ]);
        }

        try {
            \DB::beginTransaction();

            $platformFee = $validated['agreed_amount'] * 0.05;
            $netAmount = $validated['agreed_amount'] - $platformFee;

            $job->update(['status' => 'in_progress']);

            $project = Project::create([
                'job_id' => $job->id,
                'employer_id' => $user->id,
                'gig_worker_id' => $validated['gig_worker_id'],
                'bid_id' => null,
                'agreed_amount' => $validated['agreed_amount'],
                'agreed_duration_days' => $validated['estimated_days'],
                'deadline' => now()->addDays((int) $validated['estimated_days']),
                'platform_fee' => $platformFee,
                'net_amount' => $netAmount,
                'status' => 'active',
                'started_at' => now(),
            ]);

            $user->decrement('escrow_balance', $validated['agreed_amount']);

            \App\Models\Transaction::create([
                'project_id' => $project->id,
                'payer_id' => $user->id,
                'payee_id' => $validated['gig_worker_id'],
                'amount' => $validated['agreed_amount'],
                'platform_fee' => $platformFee,
                'net_amount' => $netAmount,
                'type' => 'escrow',
                'status' => 'completed',
                'stripe_payment_intent_id' => 'escrow_' . time(),
                'stripe_charge_id' => 'charge_' . time(),
                'description' => 'Escrow payment for direct hire project #' . $project->id,
                'processed_at' => now(),
            ]);

            $contract = $this->contractService->createDirectContract(
                $project,
                $validated['scope_of_work'],
                $validated['agreed_amount']
            );

            // Send notifications
            app(\App\Services\NotificationService::class)->createContractSigningNotification(
                \App\Models\User::find($validated['gig_worker_id']),
                [
                    'job_title' => $job->title,
                    'contract_id' => $contract->id,
                    'project_id' => $project->id
                ]
            );

            \DB::commit();

            return redirect()->route('contracts.sign', $contract->id)
                ->with('success', 'Contract created! Taking you to sign…');
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Direct contract creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()->withErrors([
                'message' => 'Failed to create contract. Please try again.'
            ]);
        }
    }

    /**
     * Display the specified contract
     */
    public function show(Contract $contract): Response
    {
        $user = auth()->user();

        // Check if user is authorized to view this contract
        if ($contract->employer_id !== $user->id && $contract->gig_worker_id !== $user->id) {
            abort(403, 'Unauthorized to view this contract');
        }

        $userRole = $contract->getUserRole($user->id);

        // Additional check: Gig workers can only view contract after employer has signed
        if ($userRole === 'gig_worker' && !$contract->canGigWorkerAccess()) {
            abort(403, 'Contract is not available for viewing until the employer signs first');
        }

        $contract->load([
            'employer',
            'gigWorker',
            'job',
            'project',
            'bid',
            'signatures'
        ]);

        $canSign = $contract->canUserSign($user->id);
        $nextSigner = $contract->getNextSigner();

        // Explicitly pass party data so name/email always display (avoids serialization key issues)
        $employer = $contract->employer ? [
            'id' => $contract->employer->id,
            'first_name' => $contract->employer->first_name,
            'last_name' => $contract->employer->last_name,
            'email' => $contract->employer->email,
            'phone' => $contract->employer->phone,
            'location' => $contract->employer->location ?? $contract->employer->barangay,
        ] : null;
        $gigWorker = $contract->gigWorker ? [
            'id' => $contract->gigWorker->id,
            'first_name' => $contract->gigWorker->first_name,
            'last_name' => $contract->gigWorker->last_name,
            'email' => $contract->gigWorker->email,
            'phone' => $contract->gigWorker->phone,
            'location' => $contract->gigWorker->location ?? $contract->gigWorker->barangay,
        ] : null;

        return Inertia::render('Contracts/Show', [
            'contract' => $contract,
            'employer' => $employer,
            'gigWorker' => $gigWorker,
            'userRole' => $userRole,
            'canSign' => $canSign,
            'nextSigner' => $nextSigner,
            'hasUserSigned' => $contract->hasUserSigned($user->id)
        ]);
    }

    /**
     * Show contract signing form
     */
    public function sign(Contract $contract): Response
    {
        $user = auth()->user();

        \Log::info('Contract signing attempt', [
            'contract_id' => $contract->id,
            'contract_contract_id' => $contract->contract_id,
            'user_id' => $user->id,
            'user_role' => $user->user_type,
            'contract_employer_id' => $contract->employer_id,
            'contract_gig_worker_id' => $contract->gig_worker_id,
            'contract_status' => $contract->status,
            'user_can_sign' => $contract->canUserSign($user->id),
            'user_role_in_contract' => $contract->getUserRole($user->id),
            'has_user_signed' => $contract->hasUserSigned($user->id)
        ]);

        $userRole = $contract->getUserRole($user->id);

        // Additional check: Gig workers can only sign after employer has signed
        if ($userRole === 'gig_worker' && !$contract->canGigWorkerAccess()) {
            \Log::warning('Gig worker trying to sign before employer', [
                'contract_id' => $contract->id,
                'user_id' => $user->id,
                'employer_signed' => $contract->hasEmployerSigned()
            ]);

            // Load contract relationships for proper display
            $contract->load([
                'employer',
                'gigWorker',
                'job',
                'project',
                'bid',
                'signatures'
            ]);

            // Return Inertia response with waiting flag for modal handling
            return Inertia::render('Contracts/OptimizedSign', [
                'contract' => $contract,
                'userRole' => $userRole,
                'user' => $user,
                'waitingForEmployer' => true,
                'employerName' => $contract->employer ? $contract->employer->first_name . ' ' . $contract->employer->last_name : 'the employer'
            ]);
        }

        // Check authorization
        if (!$contract->canUserSign($user->id)) {
            \Log::warning('Contract signing authorization failed', [
                'contract_id' => $contract->id,
                'user_id' => $user->id,
                'reason' => 'canUserSign returned false'
            ]);
            abort(403, 'You are not authorized to sign this contract or have already signed it');
        }

        $contract->load([
            'employer',
            'gigWorker',
            'job',
            'project',
            'bid',
            'signatures'
        ]);

        return Inertia::render('Contracts/OptimizedSign', [
            'contract' => $contract,
            'userRole' => $userRole,
            'user' => $user
        ]);
    }

    /**
     * Process contract signature
     */
    public function processSignature(Request $request, Contract $contract): JsonResponse
    {
        $user = auth()->user();

        // Enhanced validation
        $request->validate([
            'full_name' => 'required|string|max:255|min:2',
            'browser_info' => 'nullable|array',
            'browser_info.userAgent' => 'nullable|string',
            'browser_info.language' => 'nullable|string',
            'browser_info.platform' => 'nullable|string',
            'browser_info.timestamp' => 'nullable|string',
        ]);

        // Additional security checks
        $fullName = trim($request->full_name);
        if (empty($fullName) || strlen($fullName) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid full name for the signature'
            ], 422);
        }

        $userRole = $contract->getUserRole($user->id);

        // Additional check: Gig workers can only sign after employer has signed
        if ($userRole === 'gig_worker' && !$contract->canGigWorkerAccess()) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot sign this contract until the employer signs first',
                'waiting_for_employer' => true,
                'employer_name' => $contract->employer ? $contract->employer->first_name . ' ' . $contract->employer->last_name : 'the employer'
            ], 200); // Return 200 instead of 403 for modal handling
        }

        // Check authorization
        if (!$contract->canUserSign($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to sign this contract or have already signed it'
            ], 403);
        }

        try {
            \DB::beginTransaction();

            $userRole = $contract->getUserRole($user->id);

            // Ensure contract relationships are loaded
            $contract->load([
                'employer',
                'gigWorker',
                'job',
                'project',
                'bid',
                'signatures'
            ]);

            // Create signature
            $signature = ContractSignature::createSignature(
                $contract,
                $user,
                $request->full_name,
                $userRole,
                [
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'browser_info' => $request->browser_info,
                    'contract_version_hash' => hash('sha256', serialize($contract->toArray()))
                ]
            );

            // Update contract status
            $this->contractService->updateContractAfterSignature($contract, $userRole);

            \DB::commit();

            $contract->refresh();

            // Check if contract has a valid project
            $redirectUrl = route('contracts.show', $contract);
            if ($contract->isFullySigned() && $contract->project_id) {
                $redirectUrl = route('projects.show', $contract->project_id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Contract signed successfully!',
                'contract_status' => $contract->status,
                'redirect_url' => $redirectUrl
            ]);

        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Contract signing failed', [
                'contract_id' => $contract->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to sign contract. Please try again. Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download contract PDF
     */
    public function downloadPdf(Contract $contract)
    {
        $user = auth()->user();

        // Check authorization
        if ($contract->employer_id !== $user->id && $contract->gig_worker_id !== $user->id) {
            abort(403, 'Unauthorized to download this contract');
        }

        // Generate PDF if not exists or contract is fully signed and PDF is outdated
        if (!$contract->pdf_path || ($contract->isFullySigned() && !$contract->pdf_generated_at)) {
            $this->contractService->generateContractPdf($contract);
            $contract->refresh();
        }

        // Use Storage facade to get the correct path from public disk
        if (!$contract->pdf_path || !Storage::disk('public')->exists($contract->pdf_path)) {
            abort(404, 'Contract PDF not found');
        }

        return response()->download(
            Storage::disk('public')->path($contract->pdf_path),
            "WorkWise_Contract_{$contract->contract_id}.pdf"
        );
    }

    /**
     * Cancel contract (only if not fully signed)
     */
    public function cancel(Request $request, Contract $contract): JsonResponse
    {
        $user = auth()->user();

        // Only employer can cancel, and only if not fully signed
        if ($contract->employer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the employer can cancel the contract'
            ], 403);
        }

        if ($contract->isFullySigned()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel a fully signed contract'
            ], 400);
        }

        $request->validate([
            'cancellation_reason' => 'required|string|max:500'
        ]);

        try {
            $contract->update([
                'status' => 'cancelled'
            ]);

            // Update project status
            $contract->project->update([
                'status' => 'cancelled',
                'completion_notes' => 'Contract cancelled: ' . $request->cancellation_reason
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Contract cancelled successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Contract cancellation failed', [
                'contract_id' => $contract->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel contract'
            ], 500);
        }
    }

    /**
     * Update contract signature (simplified for testing)
     */
    public function updateSignature(Request $request, Contract $contract)
    {
        $user = auth()->user();

        // Validate request
        $validated = $request->validate([
            'status' => 'nullable|string|in:pending_employer_signature,pending_gig_worker_signature,fully_executed,cancelled',
            'agree' => 'required|boolean',
        ]);

        // Check if user is authorized
        if ($contract->employer_id !== $user->id && $contract->gig_worker_id !== $user->id) {
            abort(403, 'Unauthorized to sign this contract');
        }

        // Update signature timestamp based on user role
        if ($validated['agree'] === true) {
            $userRole = $contract->getUserRole($user->id);
            
            if ($userRole === 'employer') {
                $contract->employer_signed_at = now();
                $contract->save();
            } elseif ($userRole === 'gig_worker') {
                $contract->gig_worker_signed_at = now();
                $contract->save();
            }
        }

        return redirect()->route('contracts.show', $contract)
            ->with('success', 'Contract signed successfully');
    }
}
