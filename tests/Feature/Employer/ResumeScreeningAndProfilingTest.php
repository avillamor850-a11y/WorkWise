<?php

namespace Tests\Feature\Employer;

use App\Jobs\ProcessResumeScreeningJob;
use App\Models\ResumeScreening;
use App\Models\User;
use App\Services\AIService;
use App\Services\ResumeTextExtractionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ResumeScreeningAndProfilingTest extends TestCase
{
    use RefreshDatabase;

    public function test_gig_worker_profile_update_dispatches_resume_screening_job(): void
    {
        Queue::fake();
        Storage::fake('supabase');

        $worker = User::factory()->create([
            'user_type' => 'gig_worker',
            'first_name' => 'Dev',
            'last_name' => 'Worker',
        ]);

        $this->withoutMiddleware()->actingAs($worker)->post(route('gig-worker.profile.update'), [
            'first_name' => 'Dev',
            'last_name' => 'Worker',
            'resume_file' => UploadedFile::fake()->create('resume.pdf', 20, 'application/pdf'),
            'skills_with_experience' => json_encode([
                ['skill' => 'Laravel', 'experience_level' => 'intermediate'],
            ]),
        ])->assertRedirect(route('gig-worker.profile'));

        Queue::assertPushed(ProcessResumeScreeningJob::class);
    }

    public function test_resume_screening_job_persists_success_payload(): void
    {
        Storage::fake('public');

        $worker = User::factory()->create([
            'user_type' => 'gig_worker',
            'resume_file' => '/storage/resumes/tester/resume.txt',
            'skills_with_experience' => [
                ['skill' => 'Laravel', 'experience_level' => 'expert'],
            ],
        ]);

        Storage::disk('public')->put(
            'resumes/tester/resume.txt',
            "Jane Developer\nSkills: Laravel, PHP, MySQL.\nFive years building web applications.\n"
        );

        $fakeAi = new class extends AIService {
            public function generateResumeScreening(array $resumeData): array
            {
                return [
                    'success' => true,
                    'data' => [
                        'extracted_skills' => ['Laravel', 'PHP'],
                        'experience_summary' => '5 years full-stack',
                        'strengths' => 'Strong backend foundation',
                        'gaps' => 'No major gaps',
                        'confidence' => 88.0,
                        'summary' => 'Good fit profile',
                    ],
                ];
            }
        };
        $this->app->instance(AIService::class, $fakeAi);

        $job = new ProcessResumeScreeningJob($worker->id);
        $job->handle($this->app->make(AIService::class), $this->app->make(ResumeTextExtractionService::class));

        $screening = ResumeScreening::query()->where('gig_worker_id', $worker->id)->latest('id')->first();
        $this->assertNotNull($screening);
        $this->assertSame('success', $screening->status);
        $this->assertSame(['Laravel', 'PHP'], $screening->extracted_skills);
    }

    public function test_resume_screening_job_marks_failed_on_ai_failure(): void
    {
        Storage::fake('public');

        $worker = User::factory()->create([
            'user_type' => 'gig_worker',
            'resume_file' => '/storage/resumes/tester/fail.txt',
        ]);

        Storage::disk('public')->put('resumes/tester/fail.txt', 'Some resume body text for extraction.');

        $fakeAi = new class extends AIService {
            public function generateResumeScreening(array $resumeData): array
            {
                return [
                    'success' => false,
                    'data' => [
                        'extracted_skills' => [],
                        'experience_summary' => 'N/A',
                        'strengths' => 'N/A',
                        'gaps' => 'N/A',
                        'confidence' => 20.0,
                        'summary' => 'Fallback screening',
                    ],
                    'error' => 'simulated failure',
                ];
            }
        };
        $this->app->instance(AIService::class, $fakeAi);

        $job = new ProcessResumeScreeningJob($worker->id);
        $job->handle($this->app->make(AIService::class), $this->app->make(ResumeTextExtractionService::class));

        $screening = ResumeScreening::query()->where('gig_worker_id', $worker->id)->latest('id')->first();
        $this->assertNotNull($screening);
        $this->assertSame('failed', $screening->status);
        $this->assertSame('simulated failure', $screening->error_message);
    }

    public function test_resume_screening_job_fails_when_no_text_extracted_without_calling_ai(): void
    {
        Storage::fake('public');

        $worker = User::factory()->create([
            'user_type' => 'gig_worker',
            'resume_file' => '/storage/resumes/tester/empty.txt',
        ]);

        Storage::disk('public')->put('resumes/tester/empty.txt', '');

        $this->mock(AIService::class, function ($mock) {
            $mock->shouldNotReceive('generateResumeScreening');
        });

        $job = new ProcessResumeScreeningJob($worker->id);
        $job->handle($this->app->make(AIService::class), $this->app->make(ResumeTextExtractionService::class));

        $screening = ResumeScreening::query()->where('gig_worker_id', $worker->id)->latest('id')->first();
        $this->assertNotNull($screening);
        $this->assertSame('failed', $screening->status);
        $this->assertSame('Could not extract text from the uploaded resume file.', $screening->error_message);
    }

    public function test_employer_endpoints_return_screening_and_insights_shapes(): void
    {
        $employer = User::factory()->create([
            'user_type' => 'employer',
            'primary_hiring_needs' => ['Web Development'],
            'preferred_experience_level' => 'intermediate',
            'typical_project_budget' => '2000-5000',
        ]);
        $worker = User::factory()->create(['user_type' => 'gig_worker']);
        ResumeScreening::query()->create([
            'gig_worker_id' => $worker->id,
            'status' => 'success',
            'resume_hash' => hash('sha256', 'x'),
            'screening_result' => ['summary' => 'Test summary'],
            'extracted_skills' => ['Laravel'],
            'screened_at' => now(),
        ]);

        $this->actingAs($employer)
            ->get(route('employer.workers.resume-screening', $worker))
            ->assertOk()
            ->assertJsonStructure([
                'worker_id',
                'screening',
            ]);

        $this->actingAs($employer)
            ->get(route('employer.profiling-insights'))
            ->assertOk()
            ->assertJsonStructure([
                'generated_with_ai',
                'insights',
                'context',
                'informational_only',
                'generated_at',
            ]);
    }

    public function test_legacy_workers_route_redirects_to_gig_worker_profile(): void
    {
        $employer = User::factory()->create(['user_type' => 'employer']);
        $worker = User::factory()->create(['user_type' => 'gig_worker']);

        $this->actingAs($employer)
            ->get(route('workers.show', $worker))
            ->assertRedirect(route('gig-worker.profile.show', $worker));
    }

    public function test_refresh_endpoint_queues_job_and_enforces_cooldown(): void
    {
        Queue::fake();
        Cache::flush();

        $employer = User::factory()->create(['user_type' => 'employer']);
        $worker = User::factory()->create([
            'user_type' => 'gig_worker',
            'resume_file' => '/storage/resumes/tester/refresh.pdf',
        ]);

        $this->actingAs($employer)
            ->post(route('employer.workers.resume-screening.refresh', $worker), ['job_id' => 123])
            ->assertOk()
            ->assertJson(['status' => 'queued']);

        Queue::assertPushed(ProcessResumeScreeningJob::class);

        $this->actingAs($employer)
            ->post(route('employer.workers.resume-screening.refresh', $worker))
            ->assertStatus(429)
            ->assertJson([
                'status' => 'cooldown',
                'retry_after_seconds' => 3,
            ]);
    }

    public function test_resume_screening_endpoint_handles_missing_table_gracefully(): void
    {
        Schema::drop('resume_screenings');

        $employer = User::factory()->create(['user_type' => 'employer']);
        $worker = User::factory()->create([
            'user_type' => 'gig_worker',
            'resume_file' => '/storage/resumes/tester/missing-table.pdf',
        ]);

        $this->actingAs($employer)
            ->get(route('employer.workers.resume-screening', $worker))
            ->assertOk()
            ->assertJson([
                'worker_id' => $worker->id,
                'screening' => null,
            ]);
    }

    public function test_profile_summary_endpoint_returns_expected_shape_for_authenticated_user(): void
    {
        $worker = User::factory()->create([
            'user_type' => 'gig_worker',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'bio' => 'Backend developer',
            'professional_title' => 'Laravel Developer',
            'skills_with_experience' => [
                ['skill' => 'Laravel', 'experience_level' => 'intermediate'],
            ],
        ]);

        $this->actingAs($worker)
            ->get(route('profile.summary'))
            ->assertOk()
            ->assertJsonStructure([
                'user_id',
                'user_type',
                'profile_summary' => [
                    'completeness_score',
                    'activity_score_30d',
                    'intent_score',
                    'segments',
                    'computed_at',
                ],
            ]);
    }

    public function test_profile_pages_include_profile_summary_prop(): void
    {
        $worker = User::factory()->create([
            'user_type' => 'gig_worker',
            'first_name' => 'Dev',
            'last_name' => 'User',
        ]);

        $this->actingAs($worker)
            ->get(route('gig-worker.profile'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/GigWorkerProfile')
                ->has('profileSummary.completeness_score')
                ->has('profileSummary.activity_score_30d')
                ->has('profileSummary.intent_score')
                ->has('profileSummary.segments')
            );

        $employer = User::factory()->create([
            'user_type' => 'employer',
            'first_name' => 'Employer',
            'last_name' => 'User',
        ]);

        $this->actingAs($employer)
            ->get(route('employer.profile'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/EmployerProfile')
                ->has('profileSummary.completeness_score')
                ->has('profileSummary.activity_score_30d')
                ->has('profileSummary.intent_score')
                ->has('profileSummary.segments')
            );
    }
}
