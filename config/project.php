<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Auto-release after days
    |--------------------------------------------------------------------------
    | If the gig worker marks the project complete but the employer does not
    | approve within this many days, payment is automatically released to the
    | gig worker. Set to 0 to disable auto-release.
    */
    'auto_release_after_days' => (int) env('PROJECT_AUTO_RELEASE_AFTER_DAYS', 14),
];
