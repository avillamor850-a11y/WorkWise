<?php

namespace App\Jobs;

use App\Services\UserProfilingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RecomputeUserProfileJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $userId) {}

    public function handle(UserProfilingService $profilingService): void
    {
        $profilingService->recomputeForUserId($this->userId);
    }
}
