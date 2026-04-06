<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminIdVerificationNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_notify_admins_creates_notification_for_each_admin_when_subject_submits_id(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin2 = User::factory()->create(['is_admin' => true]);
        $worker = User::factory()->create([
            'is_admin' => false,
            'user_type' => 'gig_worker',
        ]);

        app(NotificationService::class)->notifyAdminsIdVerificationSubmitted($worker);

        $this->assertSame(2, Notification::where('type', 'admin_id_verification_pending')->count());
        $this->assertTrue(Notification::where('user_id', $admin->id)->where('type', 'admin_id_verification_pending')->exists());
        $this->assertTrue(Notification::where('user_id', $admin2->id)->where('type', 'admin_id_verification_pending')->exists());

        $first = Notification::where('user_id', $admin->id)->where('type', 'admin_id_verification_pending')->first();
        $this->assertNotNull($first);
        $this->assertStringContainsString((string) $worker->email, $first->message);
        $this->assertNotEmpty($first->action_url);
    }

    public function test_notify_admins_skips_subject_when_subject_is_admin(): void
    {
        $adminReviewer = User::factory()->create(['is_admin' => true]);
        $adminSubmitter = User::factory()->create(['is_admin' => true]);

        app(NotificationService::class)->notifyAdminsIdVerificationSubmitted($adminSubmitter);

        $this->assertSame(1, Notification::where('type', 'admin_id_verification_pending')->count());
        $this->assertTrue(Notification::where('user_id', $adminReviewer->id)->exists());
        $this->assertFalse(Notification::where('user_id', $adminSubmitter->id)->exists());
    }
}
