<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\PaymentService;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Carbon\Carbon;

class AutoReleaseCompletedProjects extends Command
{
    protected $signature = 'projects:auto-release-completed';

    protected $description = 'Auto-release payment for projects completed by gig worker but not approved by employer within the configured period';

    public function handle(): int
    {
        $days = config('project.auto_release_after_days', 14);
        if ($days <= 0) {
            $this->info('Auto-release is disabled (project.auto_release_after_days is 0 or not set).');
            return self::SUCCESS;
        }

        $cutoff = Carbon::now()->subDays($days);
        $projects = Project::where('status', 'completed')
            ->where('employer_approved', false)
            ->where('payment_released', false)
            ->whereNotNull('completed_at')
            ->where('completed_at', '<=', $cutoff)
            ->with(['employer', 'gigWorker', 'job'])
            ->get();

        if ($projects->isEmpty()) {
            $this->info('No projects eligible for auto-release.');
            return self::SUCCESS;
        }

        $paymentService = app(PaymentService::class);
        $notificationService = app(NotificationService::class);
        $released = 0;

        foreach ($projects as $project) {
            try {
                $project->update([
                    'employer_approved' => true,
                    'approved_at' => now(),
                ]);
                $result = $paymentService->releasePayment($project);
                if ($result['success']) {
                    $released++;
                    $jobTitle = $project->job ? $project->job->title : 'Project #' . $project->id;
                    $data = [
                        'project_id' => $project->id,
                        'project_title' => $jobTitle,
                        'auto_released_at' => now()->toIso8601String(),
                        'days_waited' => $days,
                    ];
                    if ($project->employer) {
                        $notificationService->createAutoReleaseNotification($project->employer, array_merge($data, ['recipient_role' => 'employer']));
                    }
                    if ($project->gigWorker) {
                        $notificationService->createAutoReleaseNotification($project->gigWorker, array_merge($data, ['recipient_role' => 'gig_worker']));
                    }
                    $this->info("Auto-released project #{$project->id} ({$jobTitle}).");
                } else {
                    $this->warn("Project #{$project->id}: release failed - " . ($result['error'] ?? 'unknown'));
                }
            } catch (\Throwable $e) {
                $this->error("Project #{$project->id}: " . $e->getMessage());
                \Log::error('Auto-release failed for project', [
                    'project_id' => $project->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $this->info("Auto-release complete: {$released} of {$projects->count()} projects released.");
        return self::SUCCESS;
    }
}
