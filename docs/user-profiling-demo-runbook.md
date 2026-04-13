# User Profiling Demo Runbook

## Goal
Show that user profiling is behavior-driven, visible in UI, and persisted.

## Setup
1. Run `php artisan migrate`.
2. Start app server and queue worker:
   - `php artisan serve`
   - `php artisan queue:work`
3. Log in as a gig worker test account.

## Baseline Capture
1. Open `GET /api/profile/summary` while authenticated.
2. Record:
   - `completeness_score`
   - `activity_score_30d`
   - `intent_score`
   - `segments`
   - `computed_at`
3. Open profile page and capture the new **Profile Insights** card.

## Trigger Behavior
Perform at least two actions:
1. Send a bid to an open job.
2. Send one or more messages.
3. Optionally update profile details (bio, skills, resume).

## Verify Update
1. Refresh `GET /api/profile/summary`.
2. Confirm `computed_at` changed.
3. Confirm `activity_score_30d` and `intent_score` increased or changed.
4. Confirm segment badges and CTA in profile UI reflect current segment.

## Employer Variant
1. Log in as employer.
2. Capture profile summary baseline and dashboard profiling snapshot.
3. Post a job and send messages.
4. Re-check summary and confirm score/segment updates.

## Evidence Checklist
- Before/after API JSON screenshots.
- Before/after profile card screenshots.
- Segment-driven CTA visible in UI.
- Queue worker running during behavior triggers.
