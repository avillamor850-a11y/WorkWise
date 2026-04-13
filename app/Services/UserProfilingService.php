<?php

namespace App\Services;

use App\Models\Bid;
use App\Models\GigJob;
use App\Models\Message;
use App\Models\Project;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;

class UserProfilingService
{
    public function recomputeForUser(User $user): UserProfile
    {
        $windowStart = now()->subDays(30);

        $traits = $this->buildTraits($user, $windowStart);
        $segments = $this->buildSegments($user, $traits);

        return UserProfile::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'completeness_score' => (int) $traits['completeness_score'],
                'activity_score_30d' => (int) $traits['activity_score_30d'],
                'intent_score' => (int) $traits['intent_score'],
                'traits' => $traits,
                'segments' => $segments,
                'computed_at' => now(),
            ]
        );
    }

    public function recomputeForUserId(int $userId): ?UserProfile
    {
        $user = User::query()->find($userId);
        if (! $user) {
            return null;
        }

        return $this->recomputeForUser($user);
    }

    public function getOrBuildSummary(User $user): array
    {
        $profile = UserProfile::query()->where('user_id', $user->id)->first();
        if (! $profile) {
            $profile = $this->recomputeForUser($user);
        }

        return [
            'completeness_score' => (int) $profile->completeness_score,
            'activity_score_30d' => (int) $profile->activity_score_30d,
            'intent_score' => (int) $profile->intent_score,
            'segments' => (array) ($profile->segments ?? []),
            'computed_at' => $profile->computed_at?->toIso8601String(),
        ];
    }

    private function buildTraits(User $user, Carbon $windowStart): array
    {
        $completenessScore = $this->computeCompletenessScore($user);

        $messagesSent30d = Message::query()
            ->where('sender_id', $user->id)
            ->where('created_at', '>=', $windowStart)
            ->count();

        $projectsCompleted30d = Project::query()
            ->where(function ($query) use ($user) {
                $query->where('employer_id', $user->id)
                    ->orWhere('gig_worker_id', $user->id);
            })
            ->where('status', 'completed')
            ->where('updated_at', '>=', $windowStart)
            ->count();

        $jobsPosted30d = 0;
        $bidsSubmitted30d = 0;
        $bidsReceived30d = 0;
        $hasResume = ! empty($user->resume_file);
        $hasPortfolio = ! empty($user->portfolio_link);

        if ($user->user_type === 'employer') {
            $jobsPosted30d = GigJob::query()
                ->where('employer_id', $user->id)
                ->where('created_at', '>=', $windowStart)
                ->count();

            $bidsReceived30d = Bid::query()
                ->whereHas('job', function ($query) use ($user) {
                    $query->where('employer_id', $user->id);
                })
                ->where('created_at', '>=', $windowStart)
                ->count();
        }

        if ($user->user_type === 'gig_worker') {
            $bidsSubmitted30d = Bid::query()
                ->where('gig_worker_id', $user->id)
                ->where('created_at', '>=', $windowStart)
                ->count();
        }

        $rawActivity = ($messagesSent30d * 2) + ($projectsCompleted30d * 5) + ($jobsPosted30d * 4) + ($bidsSubmitted30d * 4);
        $activityScore30d = min(100, $rawActivity);

        $intentScore = $this->computeIntentScore(
            $user,
            $completenessScore,
            $jobsPosted30d,
            $bidsSubmitted30d,
            $bidsReceived30d,
            $messagesSent30d,
            $hasResume,
            $hasPortfolio
        );

        return [
            'user_type' => $user->user_type,
            'tenure_days' => (int) $user->created_at?->diffInDays(now()),
            'is_profile_completed_flag' => (bool) $user->profile_completed,
            'has_resume' => $hasResume,
            'has_portfolio_link' => $hasPortfolio,
            'jobs_posted_30d' => $jobsPosted30d,
            'bids_submitted_30d' => $bidsSubmitted30d,
            'bids_received_30d' => $bidsReceived30d,
            'messages_sent_30d' => $messagesSent30d,
            'projects_completed_30d' => $projectsCompleted30d,
            'completeness_score' => $completenessScore,
            'activity_score_30d' => $activityScore30d,
            'intent_score' => $intentScore,
        ];
    }

    private function computeCompletenessScore(User $user): int
    {
        $score = 0;

        if (! empty($user->first_name) && ! empty($user->last_name) && ! empty($user->email)) {
            $score += 25;
        }
        if (! empty($user->bio)) {
            $score += 15;
        }
        if (! empty($user->profile_picture) || ! empty($user->profile_photo)) {
            $score += 10;
        }
        if (! empty($user->country) || ! empty($user->city)) {
            $score += 10;
        }

        if ($user->user_type === 'gig_worker') {
            if (! empty($user->professional_title)) {
                $score += 10;
            }
            if (! empty($user->skills_with_experience)) {
                $score += 15;
            }
            if (! empty($user->resume_file)) {
                $score += 15;
            }
        } elseif ($user->user_type === 'employer') {
            if (! empty($user->company_name)) {
                $score += 10;
            }
            if (! empty($user->primary_hiring_needs) || ! empty($user->primary_hiring_skills)) {
                $score += 15;
            }
            if (! empty($user->typical_project_budget) || ! empty($user->hiring_frequency)) {
                $score += 15;
            }
        }

        return min(100, $score);
    }

    private function computeIntentScore(
        User $user,
        int $completenessScore,
        int $jobsPosted30d,
        int $bidsSubmitted30d,
        int $bidsReceived30d,
        int $messagesSent30d,
        bool $hasResume,
        bool $hasPortfolio
    ): int {
        if ($user->user_type === 'employer') {
            $raw = (int) round(
                ($completenessScore * 0.35) +
                (min(20, $jobsPosted30d) * 2.0) +
                (min(20, $bidsReceived30d) * 1.5) +
                (min(20, $messagesSent30d) * 1.0)
            );

            return min(100, $raw);
        }

        if ($user->user_type === 'gig_worker') {
            $assetBonus = ($hasResume ? 8 : 0) + ($hasPortfolio ? 7 : 0);
            $raw = (int) round(
                ($completenessScore * 0.40) +
                (min(20, $bidsSubmitted30d) * 2.0) +
                (min(20, $messagesSent30d) * 1.2) +
                $assetBonus
            );

            return min(100, $raw);
        }

        return min(100, (int) round($completenessScore * 0.6));
    }

    private function buildSegments(User $user, array $traits): array
    {
        $segments = [];

        $tenure = (int) ($traits['tenure_days'] ?? 0);
        $intent = (int) ($traits['intent_score'] ?? 0);
        $activity = (int) ($traits['activity_score_30d'] ?? 0);

        if ($tenure <= 14) {
            $segments[] = 'new_user';
        }

        if ($user->user_type === 'employer' && $intent >= 65) {
            $segments[] = 'ready_to_hire';
        }

        if ($user->user_type === 'gig_worker' && $intent >= 65) {
            $segments[] = 'active_seeker';
        }

        if ($activity < 20 && $tenure > 14) {
            $segments[] = 'at_risk_inactive';
        }

        if (empty($segments)) {
            $segments[] = 'steady_user';
        }

        return array_values(array_unique($segments));
    }
}
