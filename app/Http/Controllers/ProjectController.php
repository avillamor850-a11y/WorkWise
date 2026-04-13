<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Review;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display a listing of projects for the authenticated user
     */
    public function index(): Response
    {
        $user = auth()->user();

        if ($user->isEmployer()) {
            $projects = Project::where('employer_id', $user->id)
                ->with(['job', 'gigWorker', 'transactions'])
                ->orderBy('created_at', 'desc')
                ->paginate(10);
        } else {
            $projects = Project::where('gig_worker_id', $user->id)
                ->with(['job', 'employer', 'transactions'])
                ->orderBy('created_at', 'desc')
                ->paginate(10);
        }

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
        ]);
    }

    /**
     * Display the specified project
     */
    public function show(Project $project): Response
    {
        $user = auth()->user();

        // Check if user is authorized to view this project
        if ($project->employer_id !== $user->id && $project->gig_worker_id !== $user->id) {
            abort(403);
        }

        $project->load([
            'job',
            'employer',
            'gigWorker',
            'transactions',
            'reviews' => fn ($q) => $q->with('reviewer:id,first_name,last_name,profile_picture'),
            'messages' => function ($query) {
                $query->orderBy('created_at', 'desc')->limit(10);
            },
        ]);

        return Inertia::render('Projects/Show', [
            'project' => $project,
            'isEmployer' => $user->isEmployer(),
            'hasPayment' => $project->transactions()->where('type', 'escrow')->where('status', 'completed')->exists(),
            'canReview' => $project->isCompleted() && ! $project->reviews()->where('reviewer_id', $user->id)->exists(),
            'autoReleaseDays' => config('project.auto_release_after_days', 14),
        ]);
    }

    /**
     * Mark project as completed
     */
    public function complete(Request $request, Project $project)
    {
        // Ensure user is the gig worker
        if ($project->gig_worker_id !== auth()->id()) {
            return back()->with('error', 'Only the gig worker can mark a project as complete.');
        }

        // Validate request
        try {
            $validated = $request->validate([
                'completion_notes' => 'required|string|max:1000',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        try {
            // Check if project is already completed
            if ($project->isCompleted()) {
                return back()->with('error', 'Project is already marked as complete.');
            }

            // Update project
            $project->update([
                'status' => 'completed',
                'completed_at' => now(),
                'completion_notes' => $validated['completion_notes'],
            ]);

            // Notify employer so they review and approve (and payment can be released)
            try {
                $project->loadMissing(['employer', 'job']);
                if ($project->employer) {
                    app(\App\Services\NotificationService::class)->createProjectCompletionNotification($project->employer, [
                        'project_id' => $project->id,
                        'project_title' => $project->job ? $project->job->title : 'Project #'.$project->id,
                    ]);
                }
            } catch (\Throwable $e) {
                \Log::warning('Failed to send project completion notification to employer', [
                    'project_id' => $project->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return back()->with('success', 'Project marked as complete! The employer will be notified to review and approve your work.');

        } catch (\Exception $e) {
            \Log::error('Failed to complete project', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Failed to complete project. Please try again.');
        }
    }

    /**
     * Gig worker: request admin review (employer has not approved completion).
     */
    public function requestAdminReview(Request $request, Project $project)
    {
        if ($project->gig_worker_id !== auth()->id()) {
            return back()->with('error', 'Only the gig worker for this project can request admin review.');
        }
        if ($project->status !== 'completed') {
            return back()->with('error', 'Project must be marked complete before requesting admin review.');
        }
        if ($project->payment_released) {
            return back()->with('error', 'Payment has already been released.');
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $project->update([
            'admin_review_requested_at' => now(),
            'admin_review_request_notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Admin review requested. An admin will review and can release your payment if appropriate.');
    }

    /**
     * Approve completed project (client only)
     */
    public function approve(Project $project)
    {
        // Only employer can approve
        if ($project->employer_id !== auth()->id()) {
            return back()->with('error', 'Only the employer can approve project completion.');
        }

        if (! $project->isCompleted()) {
            return back()->withErrors(['project' => 'Project must be completed first.']);
        }

        try {
            $project->update([
                'employer_approved' => true,
                'approved_at' => now(),
            ]);

            // Automatically release payment upon approval
            $paymentService = app(\App\Services\PaymentService::class);
            $paymentResult = $paymentService->releasePayment($project);

            \Log::info('Payment release attempt', [
                'project_id' => $project->id,
                'payment_result' => $paymentResult,
            ]);

            if ($paymentResult['success']) {
                return back()->with('success', 'Project approved and payment automatically released to gig worker!');
            } else {
                \Log::warning('Project approved but payment release failed', [
                    'project_id' => $project->id,
                    'payment_error' => $paymentResult['error'] ?? 'Unknown error',
                ]);

                return back()->with('success', 'Project approved! Payment release is being processed.');
            }
        } catch (\Exception $e) {
            \Log::error('Failed to approve project', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Failed to approve project. Please try again.');
        }
    }

    /**
     * Request revision
     */
    public function requestRevision(Request $request, Project $project)
    {
        // #region agent log
        @file_put_contents(base_path('debug-ea6a57.log'), json_encode([
            'sessionId' => 'ea6a57',
            'runId' => 'post-fix',
            'hypothesisId' => 'H1_H3',
            'location' => 'ProjectController.php:requestRevision:entry',
            'message' => 'Request revision entry context',
            'data' => [
                'project_id' => $project->id,
                'auth_user_id' => auth()->id(),
                'db_connection' => config('database.default'),
                'db_database' => config('database.connections.'.config('database.default').'.database'),
            ],
            'timestamp' => round(microtime(true) * 1000),
        ]).PHP_EOL, FILE_APPEND);
        // #endregion

        // Only employer can request revision
        if ($project->employer_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'revision_notes' => 'required|string|max:1000',
        ]);

        // Add revision to milestones
        $milestones = $project->milestones ?? [];
        $milestones[] = [
            'type' => 'revision_requested',
            'notes' => $request->revision_notes,
            'requested_at' => now()->toISOString(),
            'requested_by' => auth()->id(),
        ];

        // #region agent log
        @file_put_contents(base_path('debug-ea6a57.log'), json_encode([
            'sessionId' => 'ea6a57',
            'runId' => 'post-fix',
            'hypothesisId' => 'H1_H2',
            'location' => 'ProjectController.php:requestRevision:beforeUpdate',
            'message' => 'Before project update with milestones',
            'data' => [
                'project_id' => $project->id,
                'has_milestones_column' => \Illuminate\Support\Facades\Schema::hasColumn('projects', 'milestones'),
                'milestones_count' => is_array($milestones) ? count($milestones) : null,
            ],
            'timestamp' => round(microtime(true) * 1000),
        ]).PHP_EOL, FILE_APPEND);
        // #endregion

        try {
            $project->update([
                'status' => 'active', // Back to active for revisions
                'milestones' => $milestones,
            ]);

            // #region agent log
            @file_put_contents(base_path('debug-ea6a57.log'), json_encode([
                'sessionId' => 'ea6a57',
                'runId' => 'post-fix',
                'hypothesisId' => 'H2',
                'location' => 'ProjectController.php:requestRevision:afterUpdate',
                'message' => 'Project update succeeded',
                'data' => [
                    'project_id' => $project->id,
                ],
                'timestamp' => round(microtime(true) * 1000),
            ]).PHP_EOL, FILE_APPEND);
            // #endregion
        } catch (\Throwable $e) {
            // #region agent log
            @file_put_contents(base_path('debug-ea6a57.log'), json_encode([
                'sessionId' => 'ea6a57',
                'runId' => 'post-fix',
                'hypothesisId' => 'H1_H2',
                'location' => 'ProjectController.php:requestRevision:updateException',
                'message' => 'Project update failed',
                'data' => [
                    'project_id' => $project->id,
                    'exception_class' => get_class($e),
                    'exception_message' => $e->getMessage(),
                ],
                'timestamp' => round(microtime(true) * 1000),
            ]).PHP_EOL, FILE_APPEND);
            // #endregion
            throw $e;
        }

        // Notify gig worker so they can review requested revisions
        try {
            $project->loadMissing(['gigWorker', 'job', 'employer']);
            if ($project->gigWorker) {
                $employerName = trim(($project->employer->first_name ?? '').' '.($project->employer->last_name ?? ''));
                if ($employerName === '') {
                    $employerName = $project->employer->name ?? 'The employer';
                }

                app(\App\Services\NotificationService::class)->createProjectRevisionRequestedNotification($project->gigWorker, [
                    'project_id' => $project->id,
                    'project_title' => $project->job ? $project->job->title : 'Project #'.$project->id,
                    'revision_notes' => $request->revision_notes,
                    'employer_id' => $project->employer_id,
                    'employer_name' => $employerName,
                ]);
            }
        } catch (\Throwable $e) {
            \Log::warning('Failed to send project revision request notification to gig worker', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
            ]);
        }

        return back()->with('success', 'Revision requested. The gig worker has been notified.');
    }

    /**
     * Cancel project
     */
    public function cancel(Request $request, Project $project)
    {
        // Only employer can cancel, and only if no payment released
        if ($project->employer_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        if ($project->payment_released) {
            return back()->withErrors(['project' => 'Cannot cancel project after payment has been released.']);
        }

        $request->validate([
            'cancellation_reason' => 'required|string|max:500',
        ]);

        $project->update([
            'status' => 'cancelled',
            'completion_notes' => 'Cancelled by client: '.$request->cancellation_reason,
        ]);

        return back()->with('success', 'Project cancelled. Refund will be processed if payment was made.');
    }

    /**
     * Submit review for project
     */
    public function review(Request $request, Project $project)
    {
        // Ensure user is involved in this project
        if ($project->employer_id !== auth()->id() && $project->gig_worker_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        // Ensure project is completed
        if (! $project->isCompleted()) {
            return back()->withErrors(['review' => 'Project must be completed before leaving a review.']);
        }

        // Ensure user hasn't already reviewed
        if ($project->reviews()->where('reviewer_id', auth()->id())->exists()) {
            return back()->withErrors(['review' => 'You have already reviewed this project.']);
        }

        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'criteria_ratings' => 'nullable|array',
            'criteria_ratings.communication' => 'nullable|integer|min:1|max:5',
            'criteria_ratings.quality' => 'nullable|integer|min:1|max:5',
            'criteria_ratings.timeliness' => 'nullable|integer|min:1|max:5',
        ]);

        // Determine who is being reviewed
        $revieweeId = auth()->id() === $project->employer_id
            ? $project->gig_worker_id
            : $project->employer_id;

        $review = Review::create([
            'project_id' => $project->id,
            'reviewer_id' => auth()->id(),
            'reviewee_id' => $revieweeId,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'criteria_ratings' => $request->criteria_ratings,
        ]);

        // Log the review creation for debugging
        \Log::info('Review created successfully', [
            'review_id' => $review->id,
            'project_id' => $project->id,
            'reviewer_id' => auth()->id(),
            'reviewee_id' => $revieweeId,
            'rating' => $request->rating,
        ]);

        return back()->with('success', 'Review submitted successfully!')
            ->with('showThankYou', true)
            ->with('reviewSubmitted', true);
    }
}
