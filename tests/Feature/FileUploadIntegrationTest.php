<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Services\FileUploadService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Integration tests for file upload flows in onboarding
 * Tests Requirements: 1.1, 1.3, 1.4, 2.1, 2.2
 */
class FileUploadIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('r2');
    }

    /**
     * Helper method to get valid gig worker onboarding data
     */
    protected function getValidGigWorkerData(array $overrides = []): array
    {
        return array_merge([
            'professional_title' => 'Full Stack Developer',
            'hourly_rate' => 75,
            'bio' => 'I am an experienced full stack developer with expertise in modern web technologies and cloud platforms.',
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend Development', 'Backend Development'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'expert'],
                ['skill' => 'React', 'experience_level' => 'intermediate'],
            ],
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg', 1024, 768),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg', 1024, 768),
            'street_address' => '456 Developer Avenue',
            'city' => 'Cebu City',
            'postal_code' => '6000',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ], $overrides);
    }

    /**
     * Helper method to get valid employer onboarding data
     */
    protected function getValidEmployerData(array $overrides = []): array
    {
        return array_merge([
            'company_name' => 'Tech Solutions Inc',
            'company_description' => 'We are a leading technology company specializing in innovative software solutions for businesses.',
            'industry' => 'Technology',
            'company_size' => '11-50',
            'primary_hiring_needs' => ['Web Development', 'Mobile Development'],
            'typical_project_budget' => '2000-5000',
            'typical_project_duration' => 'medium_term',
            'preferred_experience_level' => 'intermediate',
            'hiring_frequency' => 'regular',
            'street_address' => '123 Business Street',
            'city' => 'Manila',
            'postal_code' => '1000',
            'country' => 'Philippines',
        ], $overrides);
    }

    /** @test */
    public function successful_profile_picture_upload_in_gig_worker_onboarding()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $profilePicture = UploadedFile::fake()->image('profile.jpg', 800, 800)->size(1500);

        $data = $this->getValidGigWorkerData([
            'profile_picture' => $profilePicture,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);

        $response->assertRedirect('/jobs');
        $response->assertSessionHas('success');

        $user->refresh();
        
        // Verify profile picture was uploaded
        $this->assertNotNull($user->profile_picture);
        
        // Verify at least one file exists in the profiles directory for this user
        $files = Storage::disk('r2')->files('profiles/' . $user->id);
        $this->assertGreaterThan(0, count($files), 'No files found in profiles directory');
    }

    /** @test */
    public function profile_picture_upload_failure_handling()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        // Create a file that exceeds the size limit (2MB)
        $largeFile = UploadedFile::fake()->image('profile.jpg', 2000, 2000)->size(3000);

        $data = $this->getValidGigWorkerData([
            'profile_picture' => $largeFile,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);

        // Should have validation error for profile picture
        $response->assertSessionHasErrors(['profile_picture']);
        
        $user->refresh();
        
        // Profile should not be completed
        $this->assertFalse($user->profile_completed);
        $this->assertNull($user->profile_picture);
    }

    /** @test */
    public function id_image_uploads_front_and_back()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $idFrontImage = UploadedFile::fake()->image('id_front.jpg', 1024, 768)->size(800);
        $idBackImage = UploadedFile::fake()->image('id_back.jpg', 1024, 768)->size(800);

        $data = $this->getValidGigWorkerData([
            'id_front_image' => $idFrontImage,
            'id_back_image' => $idBackImage,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);

        $response->assertRedirect('/jobs');
        
        $user->refresh();
        
        // Verify both ID images were uploaded
        $this->assertNotNull($user->id_front_image);
        $this->assertNotNull($user->id_back_image);
        
        // Verify files exist in storage (at least 2 files in id_verification directory)
        $files = Storage::disk('r2')->files('id_verification/' . $user->id);
        $this->assertGreaterThanOrEqual(2, count($files), 'Expected at least 2 ID verification files');
    }

    /** @test */
    public function resume_file_upload()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $resumeFile = UploadedFile::fake()->create('resume.pdf', 2048, 'application/pdf');

        $data = $this->getValidGigWorkerData([
            'resume_file' => $resumeFile,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);

        $response->assertRedirect('/jobs');
        
        $user->refresh();
        
        // Verify resume file was uploaded
        $this->assertNotNull($user->resume_file);
        
        // Verify file exists in storage
        $files = Storage::disk('r2')->files('portfolios/' . $user->id . '/documents');
        $this->assertGreaterThan(0, count($files), 'No resume file found in portfolios/documents directory');
    }

    /** @test */
    public function employer_profile_picture_upload()
    {
        $user = User::factory()->create([
            'user_type' => 'employer',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $profilePicture = UploadedFile::fake()->image('company_logo.jpg', 800, 800)->size(1500);

        $data = $this->getValidEmployerData([
            'profile_picture' => $profilePicture,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/employer', $data);

        $response->assertRedirect('/jobs');
        
        $user->refresh();
        
        // Verify profile picture was uploaded
        $this->assertNotNull($user->profile_picture);
        
        // Verify file exists in storage
        $files = Storage::disk('r2')->files('profiles/' . $user->id);
        $this->assertGreaterThan(0, count($files), 'No profile picture found in profiles directory');
    }

    /** @test */
    public function business_registration_document_upload()
    {
        $user = User::factory()->create([
            'user_type' => 'employer',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $businessDoc = UploadedFile::fake()->create('business_registration.pdf', 2048, 'application/pdf');

        $data = $this->getValidEmployerData([
            'business_registration_document' => $businessDoc,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/employer', $data);

        $response->assertRedirect('/jobs');
        
        $user->refresh();
        
        // Verify business registration document was uploaded
        $this->assertNotNull($user->business_registration_document);
        
        // Verify file exists in storage
        $files = Storage::disk('r2')->files('business_documents/' . $user->id);
        $this->assertGreaterThan(0, count($files), 'No business document found in business_documents directory');
    }

    /** @test */
    public function file_size_validation()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        // Test profile picture exceeding 2MB limit
        $largeProfilePicture = UploadedFile::fake()->image('profile.jpg')->size(3000);

        $data = $this->getValidGigWorkerData([
            'profile_picture' => $largeProfilePicture,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);
        $response->assertSessionHasErrors(['profile_picture']);

        // Test resume file exceeding 5MB limit
        $largeResume = UploadedFile::fake()->create('resume.pdf', 6000, 'application/pdf');

        $data = $this->getValidGigWorkerData([
            'resume_file' => $largeResume,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);
        $response->assertSessionHasErrors(['resume_file']);
    }

    /** @test */
    public function file_type_validation()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        // Test invalid file type for profile picture (should be image)
        $invalidProfilePicture = UploadedFile::fake()->create('profile.txt', 100, 'text/plain');

        $data = $this->getValidGigWorkerData([
            'profile_picture' => $invalidProfilePicture,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);
        $response->assertSessionHasErrors(['profile_picture']);

        // Test invalid file type for resume (should be pdf, doc, or docx)
        $invalidResume = UploadedFile::fake()->image('resume.jpg');

        $data = $this->getValidGigWorkerData([
            'resume_file' => $invalidResume,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);
        $response->assertSessionHasErrors(['resume_file']);

        // Test invalid file type for ID images (should be image)
        $invalidIdImage = UploadedFile::fake()->create('id.pdf', 100, 'application/pdf');

        $data = $this->getValidGigWorkerData([
            'id_front_image' => $invalidIdImage,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);
        $response->assertSessionHasErrors(['id_front_image']);
    }

    /** @test */
    public function onboarding_completion_with_all_files()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $profilePicture = UploadedFile::fake()->image('profile.jpg', 800, 800);
        $idFrontImage = UploadedFile::fake()->image('id_front.jpg', 1024, 768);
        $idBackImage = UploadedFile::fake()->image('id_back.jpg', 1024, 768);
        $resumeFile = UploadedFile::fake()->create('resume.pdf', 2048, 'application/pdf');

        $data = $this->getValidGigWorkerData([
            'profile_picture' => $profilePicture,
            'id_front_image' => $idFrontImage,
            'id_back_image' => $idBackImage,
            'resume_file' => $resumeFile,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);

        $response->assertRedirect('/jobs');
        $response->assertSessionHas('success');
        
        $user->refresh();
        
        // Verify onboarding is completed
        $this->assertTrue($user->profile_completed);
        $this->assertEquals('approved', $user->profile_status);
        
        // Verify all files were uploaded
        $this->assertNotNull($user->profile_picture);
        $this->assertNotNull($user->id_front_image);
        $this->assertNotNull($user->id_back_image);
        $this->assertNotNull($user->resume_file);
        
        // Verify all files exist in storage
        $profileFiles = Storage::disk('r2')->files('profiles/' . $user->id);
        $this->assertGreaterThan(0, count($profileFiles), 'No profile picture found');
        
        $idFiles = Storage::disk('r2')->files('id_verification/' . $user->id);
        $this->assertGreaterThanOrEqual(2, count($idFiles), 'Expected at least 2 ID verification files');
        
        $resumeFiles = Storage::disk('r2')->files('portfolios/' . $user->id . '/documents');
        $this->assertGreaterThan(0, count($resumeFiles), 'No resume file found');
    }

    /** @test */
    public function onboarding_completion_without_optional_files()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        // Only include required ID images, no profile picture or resume
        $idFrontImage = UploadedFile::fake()->image('id_front.jpg', 1024, 768);
        $idBackImage = UploadedFile::fake()->image('id_back.jpg', 1024, 768);

        $data = $this->getValidGigWorkerData([
            'id_front_image' => $idFrontImage,
            'id_back_image' => $idBackImage,
            // No profile_picture
            // No resume_file
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', $data);

        $response->assertRedirect('/jobs');
        $response->assertSessionHas('success');
        
        $user->refresh();
        
        // Verify onboarding is completed even without optional files
        $this->assertTrue($user->profile_completed);
        $this->assertEquals('approved', $user->profile_status);
        
        // Verify required files were uploaded
        $this->assertNotNull($user->id_front_image);
        $this->assertNotNull($user->id_back_image);
        
        // Verify optional files are null
        $this->assertNull($user->profile_picture);
        $this->assertNull($user->resume_file);
        
        // Verify required files exist in storage
        $idFiles = Storage::disk('r2')->files('id_verification/' . $user->id);
        $this->assertGreaterThanOrEqual(2, count($idFiles), 'Expected at least 2 ID verification files');
    }
}
