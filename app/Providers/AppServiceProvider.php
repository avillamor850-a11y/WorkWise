<?php

namespace App\Providers;

use App\Jobs\RecomputeUserProfileJob;
use App\Models\Bid;
use App\Models\GigJob;
use App\Models\Message;
use App\Models\Project;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Password complexity for registration and password reset
        Password::defaults(function () {
            return Password::min(8)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols();
        });

        // Force HTTPS in production
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);

        // Lightweight profiling triggers from core user actions.
        Message::created(function (Message $message): void {
            RecomputeUserProfileJob::dispatch($message->sender_id);
            RecomputeUserProfileJob::dispatch($message->receiver_id);
        });

        Bid::created(function (Bid $bid): void {
            RecomputeUserProfileJob::dispatch($bid->gig_worker_id);

            $job = $bid->job;
            if ($job && $job->employer_id) {
                RecomputeUserProfileJob::dispatch($job->employer_id);
            }
        });

        GigJob::created(function (GigJob $job): void {
            RecomputeUserProfileJob::dispatch($job->employer_id);
        });

        Project::created(function (Project $project): void {
            RecomputeUserProfileJob::dispatch($project->employer_id);
            RecomputeUserProfileJob::dispatch($project->gig_worker_id);
        });
    }
}
