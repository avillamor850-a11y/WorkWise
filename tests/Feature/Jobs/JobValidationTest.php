<?php

namespace Tests\Feature\Jobs;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class JobValidationTest extends TestCase
{
    use RefreshDatabase;

    private function createEmployer(): User
    {
        return User::create([
            'first_name' => 'Emp',
            'last_name' => 'Loyer',
            'email' => 'employer@jobs.test',
            'password' => Hash::make('password123'),
            'user_type' => 'employer',
        ]);
    }

    public function test_description_minimum_boundary_valid_when_skills_requirements_provided(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $desc = str_repeat('a', 100); // min:100

        $response = $this->post('/jobs', [
            'title' => 'Boundary Test Job',
            'description' => $desc,
            'required_skills' => ['PHP'],
            'skills_requirements' => [
                ['skill' => 'PHP', 'experience_level' => 'beginner', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 5,
            'budget_max' => 10,
            'experience_level' => 'beginner',
            'estimated_duration_days' => 1,
            'is_remote' => true,
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('gig_jobs', [
            'title' => 'Boundary Test Job',
            'employer_id' => $employer->id,
        ]);
    }

    public function test_budget_minimum_boundary_fails_below_five(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $desc = str_repeat('a', 120);

        $response = $this->post('/jobs', [
            'title' => 'Budget Fail',
            'description' => $desc,
            'required_skills' => ['PHP'],
            'skills_requirements' => [
                ['skill' => 'PHP', 'experience_level' => 'beginner', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 4,
            'budget_max' => 10,
            'experience_level' => 'beginner',
            'estimated_duration_days' => 1,
            'is_remote' => true,
        ]);

        $response->assertSessionHasErrors(['budget_min']);
    }

    public function test_required_skills_is_auto_populated_from_skills_requirements(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $desc = str_repeat('a', 120);

        $response = $this->post('/jobs', [
            'title' => 'Auto Map',
            'description' => $desc,
            'skills_requirements' => [
                ['skill' => 'PHP', 'experience_level' => 'intermediate', 'importance' => 'required'],
                ['skill' => 'Laravel', 'experience_level' => 'expert', 'importance' => 'required'],
            ],
            // intentionally omit required_skills - it should be auto-populated
            'budget_type' => 'fixed',
            'budget_min' => 50,
            'budget_max' => 100,
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 7,
            'is_remote' => true,
        ]);

        $response->assertStatus(302);

        $job = \App\Models\GigJob::where('title', 'Auto Map')->firstOrFail();
        
        // Verify skills_requirements is stored
        $this->assertNotEmpty($job->skills_requirements);
        $this->assertEquals('PHP', $job->skills_requirements[0]['skill']);
        $this->assertEquals('intermediate', $job->skills_requirements[0]['experience_level']);
        $this->assertEquals('required', $job->skills_requirements[0]['importance']);
        
        // Verify required_skills is auto-populated for backward compatibility
        $this->assertNotEmpty($job->required_skills);
        $this->assertContains('PHP', $job->required_skills);
        $this->assertContains('Laravel', $job->required_skills);
    }

    public function test_experience_level_is_derived_from_skills_requirements_when_omitted(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Derived Experience Job',
            'description' => str_repeat('a', 120),
            'skills_requirements' => [
                ['skill' => 'PHP', 'experience_level' => 'expert', 'importance' => 'required'],
                ['skill' => 'Laravel', 'experience_level' => 'expert', 'importance' => 'required'],
                ['skill' => 'Vue.js', 'experience_level' => 'intermediate', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 50,
            'budget_max' => 100,
            'estimated_duration_days' => 7,
            'is_remote' => true,
        ]);

        $response->assertStatus(302);
        $job = \App\Models\GigJob::where('title', 'Derived Experience Job')->firstOrFail();
        // Derived from required skills: most common is expert (2), so job.experience_level should be expert
        $this->assertEquals('expert', $job->experience_level);
    }

    // Task 6.1: Test job creation flow
    public function test_create_job_with_only_required_skills(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'React Developer Needed',
            'description' => str_repeat('Looking for an experienced React developer to build a modern web application. ', 3),
            'skills_requirements' => [
                ['skill' => 'React', 'experience_level' => 'intermediate', 'importance' => 'required'],
                ['skill' => 'JavaScript', 'experience_level' => 'expert', 'importance' => 'required'],
                ['skill' => 'CSS', 'experience_level' => 'beginner', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 500,
            'budget_max' => 1000,
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 14,
            'is_remote' => true,
        ]);

        $response->assertStatus(302);
        
        $job = \App\Models\GigJob::where('title', 'React Developer Needed')->firstOrFail();
        
        // Verify skills_requirements is stored correctly
        $this->assertNotEmpty($job->skills_requirements);
        $this->assertCount(3, $job->skills_requirements);
        $this->assertEquals('React', $job->skills_requirements[0]['skill']);
        $this->assertEquals('intermediate', $job->skills_requirements[0]['experience_level']);
        $this->assertEquals('required', $job->skills_requirements[0]['importance']);
        
        // Verify required_skills is auto-populated for backward compatibility
        $this->assertNotEmpty($job->required_skills);
        $this->assertContains('React', $job->required_skills);
        $this->assertContains('JavaScript', $job->required_skills);
        $this->assertContains('CSS', $job->required_skills);
    }

    public function test_create_job_with_required_and_preferred_skills(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Full Stack Developer',
            'description' => str_repeat('Need a full stack developer with strong backend and frontend skills. ', 3),
            'skills_requirements' => [
                ['skill' => 'Laravel', 'experience_level' => 'expert', 'importance' => 'required'],
                ['skill' => 'Vue.js', 'experience_level' => 'intermediate', 'importance' => 'required'],
                ['skill' => 'MySQL', 'experience_level' => 'intermediate', 'importance' => 'preferred'],
                ['skill' => 'Docker', 'experience_level' => 'beginner', 'importance' => 'preferred'],
                ['skill' => 'AWS', 'experience_level' => 'beginner', 'importance' => 'preferred'],
            ],
            'budget_type' => 'hourly',
            'budget_min' => 50,
            'budget_max' => 100,
            'experience_level' => 'expert',
            'estimated_duration_days' => 30,
            'is_remote' => true,
        ]);

        $response->assertStatus(302);
        
        $job = \App\Models\GigJob::where('title', 'Full Stack Developer')->firstOrFail();
        
        // Verify skills_requirements includes both required and preferred skills
        $this->assertCount(5, $job->skills_requirements);
        
        // Verify required skills
        $requiredSkills = array_filter($job->skills_requirements, fn($s) => $s['importance'] === 'required');
        $this->assertCount(2, $requiredSkills);
        
        // Verify preferred skills
        $preferredSkills = array_filter($job->skills_requirements, fn($s) => $s['importance'] === 'preferred');
        $this->assertCount(3, $preferredSkills);
        
        // Verify required_skills includes all from skills_requirements
        $this->assertContains('Laravel', $job->required_skills);
        $this->assertContains('Vue.js', $job->required_skills);
        $this->assertContains('MySQL', $job->required_skills);
        $this->assertContains('Docker', $job->required_skills);
        $this->assertContains('AWS', $job->required_skills);
    }

    public function test_validation_prevents_submission_without_skills(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'No Skills Job',
            'description' => str_repeat('This job has no skills specified. ', 5),
            'skills_requirements' => [], // Empty skills
            'budget_type' => 'fixed',
            'budget_min' => 100,
            'budget_max' => 200,
            'experience_level' => 'beginner',
            'estimated_duration_days' => 7,
            'is_remote' => true,
        ]);

        $response->assertSessionHasErrors(['skills_requirements']);
    }

    public function test_skills_requirements_structure_validation(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        // Test with invalid experience level
        $response = $this->post('/jobs', [
            'title' => 'Invalid Experience Level',
            'description' => str_repeat('Testing invalid experience level. ', 5),
            'skills_requirements' => [
                ['skill' => 'PHP', 'experience_level' => 'invalid_level', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 100,
            'budget_max' => 200,
            'experience_level' => 'beginner',
            'estimated_duration_days' => 7,
            'is_remote' => true,
        ]);

        $response->assertSessionHasErrors(['skills_requirements.0.experience_level']);
    }

    public function test_skills_requirements_importance_validation(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        // Test with invalid importance
        $response = $this->post('/jobs', [
            'title' => 'Invalid Importance',
            'description' => str_repeat('Testing invalid importance level. ', 5),
            'skills_requirements' => [
                ['skill' => 'PHP', 'experience_level' => 'intermediate', 'importance' => 'invalid_importance'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 100,
            'budget_max' => 200,
            'experience_level' => 'beginner',
            'estimated_duration_days' => 7,
            'is_remote' => true,
        ]);

        $response->assertSessionHasErrors(['skills_requirements.0.importance']);
    }

    public function test_job_creation_with_empty_location(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Remote Job No Location',
            'description' => str_repeat('This is a remote job with no specific location. ', 5),
            'skills_requirements' => [
                ['skill' => 'PHP', 'experience_level' => 'intermediate', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 100,
            'budget_max' => 200,
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 7,
            'is_remote' => true,
            'location' => '', // Empty location
        ]);

        $response->assertStatus(302);
        
        $job = \App\Models\GigJob::where('title', 'Remote Job No Location')->firstOrFail();
        $this->assertEquals('', $job->location);
    }

    public function test_job_creation_with_custom_location(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Job With Custom Location',
            'description' => str_repeat('This job has a custom location specified. ', 5),
            'skills_requirements' => [
                ['skill' => 'JavaScript', 'experience_level' => 'expert', 'importance' => 'required'],
            ],
            'budget_type' => 'hourly',
            'budget_min' => 50,
            'budget_max' => 100,
            'experience_level' => 'expert',
            'estimated_duration_days' => 14,
            'is_remote' => false,
            'location' => 'New York, USA',
        ]);

        $response->assertStatus(302);
        
        $job = \App\Models\GigJob::where('title', 'Job With Custom Location')->firstOrFail();
        $this->assertEquals('New York, USA', $job->location);
    }

    public function test_job_creation_without_location_field(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Job Without Location Field',
            'description' => str_repeat('This job does not include location field at all. ', 5),
            'skills_requirements' => [
                ['skill' => 'Python', 'experience_level' => 'intermediate', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 200,
            'budget_max' => 400,
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 10,
            'is_remote' => true,
            // location field not included at all
        ]);

        $response->assertStatus(302);
        
        $job = \App\Models\GigJob::where('title', 'Job Without Location Field')->firstOrFail();
        $this->assertNull($job->location);
    }

    // Task 7.3: Test form submission and validation
    public function test_submit_form_with_all_valid_data(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Complete Valid Job Posting',
            'description' => str_repeat('This is a comprehensive job description with all required fields properly filled out. ', 3),
            'project_category' => 'Web Development',
            'skills_requirements' => [
                ['skill' => 'React', 'experience_level' => 'intermediate', 'importance' => 'required'],
                ['skill' => 'TypeScript', 'experience_level' => 'expert', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 500,
            'budget_max' => 1000,
            'experience_level' => 'intermediate',
            'job_complexity' => 'moderate',
            'estimated_duration_days' => 14,
            'deadline' => now()->addDays(30)->format('Y-m-d'),
            'location' => 'Remote',
            'is_remote' => true,
        ]);

        $response->assertStatus(302);
        $response->assertRedirect();
        $response->assertSessionHas('success');
        
        $this->assertDatabaseHas('gig_jobs', [
            'title' => 'Complete Valid Job Posting',
            'employer_id' => $employer->id,
            'budget_min' => 500,
            'budget_max' => 1000,
        ]);
    }

    public function test_submit_form_with_invalid_budget_max_less_than_min(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Invalid Budget Job',
            'description' => str_repeat('This job has an invalid budget where max is less than min. ', 3),
            'skills_requirements' => [
                ['skill' => 'PHP', 'experience_level' => 'intermediate', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 1000,
            'budget_max' => 500, // Max less than min - should fail
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 7,
            'is_remote' => true,
        ]);

        $response->assertSessionHasErrors(['budget_max']);
    }

    public function test_submit_form_with_invalid_budget_below_minimum(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Budget Below Minimum',
            'description' => str_repeat('This job has a budget below the minimum allowed value. ', 3),
            'skills_requirements' => [
                ['skill' => 'JavaScript', 'experience_level' => 'beginner', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 3, // Below minimum of 5
            'budget_max' => 10,
            'experience_level' => 'beginner',
            'estimated_duration_days' => 5,
            'is_remote' => true,
        ]);

        $response->assertSessionHasErrors(['budget_min']);
    }

    public function test_submit_form_with_short_description(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Job With Short Description',
            'description' => 'Too short', // Less than 100 characters
            'skills_requirements' => [
                ['skill' => 'Vue.js', 'experience_level' => 'intermediate', 'importance' => 'required'],
            ],
            'budget_type' => 'hourly',
            'budget_min' => 25,
            'budget_max' => 50,
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 10,
            'is_remote' => true,
        ]);

        $response->assertSessionHasErrors(['description']);
    }

    public function test_submit_form_with_exactly_100_character_description(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        // Create exactly 100 character description
        $description = str_repeat('a', 100);

        $response = $this->post('/jobs', [
            'title' => 'Job With Minimum Description',
            'description' => $description,
            'skills_requirements' => [
                ['skill' => 'Laravel', 'experience_level' => 'expert', 'importance' => 'required'],
            ],
            'budget_type' => 'fixed',
            'budget_min' => 100,
            'budget_max' => 200,
            'experience_level' => 'expert',
            'estimated_duration_days' => 7,
            'is_remote' => true,
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('gig_jobs', [
            'title' => 'Job With Minimum Description',
            'employer_id' => $employer->id,
        ]);
    }

    public function test_error_messages_display_correctly_for_multiple_validation_failures(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => '', // Missing title
            'description' => 'Short', // Too short
            'skills_requirements' => [], // No skills
            'budget_type' => 'fixed',
            'budget_min' => 2, // Below minimum
            'budget_max' => 1, // Less than min
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 0, // Invalid
            'is_remote' => true,
        ]);

        $response->assertSessionHasErrors([
            'title',
            'description',
            'skills_requirements',
            'budget_min',
            'budget_max',
            'estimated_duration_days',
        ]);
    }

    public function test_validation_error_messages_are_descriptive(): void
    {
        $employer = $this->createEmployer();
        $this->actingAs($employer);

        $response = $this->post('/jobs', [
            'title' => 'Test Job',
            'description' => 'Short description',
            'skills_requirements' => [],
            'budget_type' => 'fixed',
            'budget_min' => 100,
            'budget_max' => 50,
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 7,
            'is_remote' => true,
        ]);

        $response->assertSessionHasErrors();
        
        // Verify that error messages exist and are not empty
        $errors = session('errors');
        $this->assertNotNull($errors);
        $this->assertTrue($errors->has('description'));
        $this->assertTrue($errors->has('skills_requirements'));
        $this->assertTrue($errors->has('budget_max'));
    }
}
