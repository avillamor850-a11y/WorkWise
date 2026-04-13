<?php

namespace Tests\Feature\Projects;

use App\Models\Bid;
use App\Models\GigJob;
use App\Models\Notification;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectRevisionRequestNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_employer_request_revision_creates_gig_worker_notification(): void
    {
        [$employer, $gigWorker, $project] = $this->createProjectForRevisionFlow();

        $response = $this->actingAs($employer)->post(
            route('projects.requestRevision', $project),
            ['revision_notes' => 'Please update the dashboard chart labels and spacing.']
        );

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Revision requested. The gig worker has been notified.');

        $project->refresh();
        $this->assertSame('active', $project->status);
        $this->assertIsArray($project->milestones);
        $this->assertNotEmpty($project->milestones);
        $milestones = $project->milestones;
        $latestMilestone = end($milestones);
        $this->assertSame('revision_requested', $latestMilestone['type'] ?? null);
        $this->assertSame('Please update the dashboard chart labels and spacing.', $latestMilestone['notes'] ?? null);

        $notification = Notification::query()
            ->where('user_id', $gigWorker->id)
            ->where('type', 'project_revision_requested')
            ->latest('id')
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString((string) $project->id, (string) $notification->action_url);
        $this->assertStringContainsString('requested revisions', $notification->message);
        $this->assertSame($project->id, $notification->data['project_id'] ?? null);
        $this->assertSame($employer->id, $notification->data['employer_id'] ?? null);
    }

    public function test_non_employer_cannot_request_project_revision(): void
    {
        [, $gigWorker, $project] = $this->createProjectForRevisionFlow();

        $response = $this->actingAs($gigWorker)->post(
            route('projects.requestRevision', $project),
            ['revision_notes' => 'Trying unauthorized revision request']
        );

        $response->assertRedirect(route('dashboard'));

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $gigWorker->id,
            'type' => 'project_revision_requested',
        ]);
    }

    /**
     * @return array{0: User, 1: User, 2: Project}
     */
    private function createProjectForRevisionFlow(): array
    {
        $employer = User::factory()->create(['user_type' => 'employer']);
        $gigWorker = User::factory()->create(['user_type' => 'gig_worker']);

        $job = GigJob::factory()->create([
            'employer_id' => $employer->id,
            'title' => 'UI Improvement Sprint',
        ]);

        $bid = Bid::factory()->create([
            'job_id' => $job->id,
            'gig_worker_id' => $gigWorker->id,
            'status' => 'accepted',
        ]);

        $project = Project::factory()->create([
            'job_id' => $job->id,
            'bid_id' => $bid->id,
            'employer_id' => $employer->id,
            'gig_worker_id' => $gigWorker->id,
            'status' => 'completed',
            'completed_at' => now(),
            'milestones' => [],
        ]);

        return [$employer, $gigWorker, $project];
    }
}
