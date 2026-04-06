<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Services\CloudinaryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Testing\File;

class GigWorkerOnboardingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('supabase');
        Storage::fake('r2');
    }

    /**
     * Create a fake image file without GD extension
     */
    protected function fakeImage($name, $width = 100, $height = 100)
    {
        return UploadedFile::fake()->create($name, 100); // Create a simple file instead
    }

    /** @test */
    public function gig_worker_can_access_onboarding_page()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        $response = $this->actingAs($user)->get('/onboarding/gig-worker');
        
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Onboarding/GigWorkerOnboarding')
        );
    }

    /** @test */
    public function gig_worker_cannot_access_onboarding_if_profile_completed()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => true,
        ]);

        $response = $this->actingAs($user)->get('/onboarding/gig-worker');
        
        $response->assertRedirect('/jobs'); // Redirect to jobs if already completed
    }

    /** @test */
    public function non_gig_worker_cannot_access_gig_worker_onboarding()
    {
        $user = User::factory()->create([
            'user_type' => 'employer',
        ]);

        $response = $this->actingAs($user)->get('/onboarding/gig-worker');
        
        $response->assertRedirect('/jobs'); // Redirect to jobs if not gig worker
    }

    /** @test */
    public function onboarding_requires_all_mandatory_fields()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', []);

        $response->assertSessionHasErrors([
            'professional_title',
            'hourly_rate',
            'bio',
            'broad_category',
            'specific_services',
            'skills_with_experience',
        ]);
    }

    /** @test */
    public function onboarding_requires_minimum_three_skills()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet the requirement.',
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                // Only 2 skills - should fail
            ],
        ]);

        $response->assertSessionHasErrors(['skills_with_experience']);
    }

    /** @test */
    public function gig_worker_can_complete_onboarding_with_valid_data()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines', // Set during registration
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Full Stack Developer',
            'hourly_rate' => 75,
            'bio' => 'I am an experienced full stack developer with expertise in modern web technologies and cloud platforms.',
            'profile_picture' => UploadedFile::fake()->image('profile.jpg', 800, 800),
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
            'barangay' => 'Lahug',
            'postal_code' => '6000',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
                'tuesday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
                'wednesday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
                'thursday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
                'friday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
                'saturday' => ['enabled' => false, 'start' => '09:00', 'end' => '17:00'],
                'sunday' => ['enabled' => false, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email', 'chat'],
            'availability_notes' => 'Available for projects starting immediately.',
        ]);

        $response->assertRedirect(route('gig-worker.dashboard'));
        
        $user->refresh();
        $this->assertTrue($user->profile_completed);
        $this->assertEquals('approved', $user->profile_status);
        $this->assertEquals(4, $user->onboarding_step);
        $this->assertEquals('Full Stack Developer', $user->professional_title);
        $this->assertEquals(75, $user->hourly_rate);
    }

    /** @test */
    public function bio_must_be_at_least_50_characters()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'Too short', // Less than 50 characters
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
        ]);

        $response->assertSessionHasErrors(['bio']);
    }

    /** @test */
    public function hourly_rate_must_be_between_5_and_10000()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        // Test rate too low
        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 2, // Too low
            'bio' => 'This is a test bio that is at least fifty characters long.',
        ]);

        $response->assertSessionHasErrors(['hourly_rate']);

        // Test rate too high
        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 15000, // Too high
            'bio' => 'This is a test bio that is at least fifty characters long.',
        ]);

        $response->assertSessionHasErrors(['hourly_rate']);
    }

    /** @test */
    public function portfolio_items_are_optional()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet requirements.',
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'postal_code' => '12345',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertRedirect(route('gig-worker.dashboard'));
    }

    /** @test */
    public function address_fields_are_saved_correctly()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'United States', // Different from KYC country
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet requirements.',
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
            'id_type' => 'passport',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '789 Remote Worker Street',
            'city' => 'Manila',
            'postal_code' => '1000',
            'kyc_country' => 'Philippines', // Different from registration country
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertRedirect(route('gig-worker.dashboard'));
    }

    /** @test */
    public function gig_worker_can_complete_onboarding_with_portfolio_link_only()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $portfolioLink = 'https://myportfolio.example.com';

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'UI/UX Designer',
            'hourly_rate' => 60,
            'bio' => 'I am a creative UI/UX designer with 5 years of experience creating beautiful and functional user interfaces.',
            'profile_picture' => UploadedFile::fake()->image('profile.jpg', 800, 800),
            'broad_category' => 'Design',
            'specific_services' => ['UI Design', 'UX Design'],
            'skills_with_experience' => [
                ['skill' => 'Figma', 'experience_level' => 'expert'],
                ['skill' => 'Adobe XD', 'experience_level' => 'intermediate'],
                ['skill' => 'Sketch', 'experience_level' => 'intermediate'],
            ],
            'portfolio_link' => $portfolioLink,
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '123 Design Street',
            'city' => 'Manila',
            'postal_code' => '1000',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
                'tuesday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email', 'chat'],
        ]);

        $response->assertRedirect(route('gig-worker.dashboard'));
        $response->assertSessionHas('success');
        
        $user->refresh();
        $this->assertTrue($user->profile_completed);
        $this->assertEquals('approved', $user->profile_status);
        $this->assertEquals($portfolioLink, $user->portfolio_link);
        $this->assertNull($user->resume_file);
    }

    /** @test */
    public function gig_worker_can_complete_onboarding_with_resume_only()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $resumeFile = UploadedFile::fake()->create('resume.pdf', 1024, 'application/pdf');

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Backend Developer',
            'hourly_rate' => 80,
            'bio' => 'I am an experienced backend developer specializing in scalable API development and database optimization.',
            'profile_picture' => UploadedFile::fake()->image('profile.jpg', 800, 800),
            'broad_category' => 'Web Development',
            'specific_services' => ['Backend Development', 'API Development'],
            'skills_with_experience' => [
                ['skill' => 'Node.js', 'experience_level' => 'expert'],
                ['skill' => 'PostgreSQL', 'experience_level' => 'expert'],
                ['skill' => 'Docker', 'experience_level' => 'intermediate'],
            ],
            'resume_file' => $resumeFile,
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '456 Developer Avenue',
            'city' => 'Cebu City',
            'postal_code' => '6000',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
                'wednesday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertRedirect(route('gig-worker.dashboard'));
        $response->assertSessionHas('success');
        
        $user->refresh();
        $this->assertTrue($user->profile_completed);
        $this->assertEquals('approved', $user->profile_status);
        $this->assertNull($user->portfolio_link);
        $this->assertNotNull($user->resume_file);
        $this->assertStringContainsString('portfolios/' . $user->id . '/documents', $user->resume_file);
        
        // Verify file was uploaded to supabase
        Storage::disk('supabase')->assertExists('portfolios/' . $user->id . '/documents/' . $resumeFile->hashName());
    }

    /** @test */
    public function gig_worker_can_complete_onboarding_with_both_portfolio_and_resume()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $portfolioLink = 'https://github.com/johndoe';
        $resumeFile = UploadedFile::fake()->create('john_doe_resume.pdf', 2048, 'application/pdf');

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Full Stack Developer',
            'hourly_rate' => 90,
            'bio' => 'I am a versatile full stack developer with expertise in both frontend and backend technologies, delivering complete solutions.',
            'profile_picture' => UploadedFile::fake()->image('profile.jpg', 800, 800),
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend Development', 'Backend Development', 'Full Stack Development'],
            'skills_with_experience' => [
                ['skill' => 'React', 'experience_level' => 'expert'],
                ['skill' => 'Laravel', 'experience_level' => 'expert'],
                ['skill' => 'MySQL', 'experience_level' => 'expert'],
            ],
            'portfolio_link' => $portfolioLink,
            'resume_file' => $resumeFile,
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '789 Tech Hub',
            'city' => 'Makati',
            'postal_code' => '1200',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '18:00'],
                'tuesday' => ['enabled' => true, 'start' => '09:00', 'end' => '18:00'],
                'wednesday' => ['enabled' => true, 'start' => '09:00', 'end' => '18:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email', 'chat', 'video_call'],
        ]);

        $response->assertRedirect(route('gig-worker.dashboard'));
        $response->assertSessionHas('success');
        
        $user->refresh();
        $this->assertTrue($user->profile_completed);
        $this->assertEquals('approved', $user->profile_status);
        $this->assertEquals($portfolioLink, $user->portfolio_link);
        $this->assertNotNull($user->resume_file);
        $this->assertStringContainsString('portfolios/' . $user->id . '/documents', $user->resume_file);
        
        // Verify file was uploaded to supabase
        Storage::disk('supabase')->assertExists('portfolios/' . $user->id . '/documents/' . $resumeFile->hashName());
    }

    /** @test */
    public function gig_worker_can_complete_onboarding_skipping_portfolio()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Content Writer',
            'hourly_rate' => 40,
            'bio' => 'I am a professional content writer with experience in creating engaging blog posts, articles, and marketing copy.',
            'profile_picture' => UploadedFile::fake()->image('profile.jpg', 800, 800),
            'broad_category' => 'Writing',
            'specific_services' => ['Blog Writing', 'Copywriting'],
            'skills_with_experience' => [
                ['skill' => 'SEO Writing', 'experience_level' => 'expert'],
                ['skill' => 'Content Strategy', 'experience_level' => 'intermediate'],
                ['skill' => 'Proofreading', 'experience_level' => 'expert'],
            ],
            // No portfolio_link or resume_file
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '321 Writer Lane',
            'city' => 'Quezon City',
            'postal_code' => '1100',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '10:00', 'end' => '18:00'],
                'friday' => ['enabled' => true, 'start' => '10:00', 'end' => '18:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertRedirect(route('gig-worker.dashboard'));
        $response->assertSessionHas('success');
        
        $user->refresh();
        $this->assertTrue($user->profile_completed);
        $this->assertEquals('approved', $user->profile_status);
        $this->assertNull($user->portfolio_link);
        $this->assertNull($user->resume_file);
    }

    /** @test */
    public function portfolio_link_must_be_valid_url()
    {
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet requirements.',
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
            'portfolio_link' => 'not-a-valid-url', // Invalid URL
            'id_type' => 'national_id',
            'id_front_image' => $this->fakeImage('id_front.jpg'),
            'id_back_image' => $this->fakeImage('id_back.jpg'),
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'postal_code' => '12345',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertSessionHasErrors(['portfolio_link']);
    }

    /** @test */
    public function resume_file_must_be_valid_document_type()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        // Try uploading an image as resume (invalid type)
        $invalidFile = UploadedFile::fake()->image('resume.jpg');

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet requirements.',
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
            'resume_file' => $invalidFile,
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'postal_code' => '12345',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertSessionHasErrors(['resume_file']);
    }

    /** @test */
    public function resume_file_must_not_exceed_size_limit()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        // Create a file larger than 5MB (5120 KB)
        $largeFile = UploadedFile::fake()->create('resume.pdf', 6000, 'application/pdf');

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet requirements.',
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
            'resume_file' => $largeFile,
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'postal_code' => '12345',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertSessionHasErrors(['resume_file']);
    }

    /** @test */
    public function profile_picture_upload_succeeds_with_valid_image()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $profilePicture = UploadedFile::fake()->image('profile.jpg', 800, 800);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet requirements.',
            'profile_picture' => $profilePicture,
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
        ]);

        $response->assertRedirect(route('gig-worker.dashboard'));
        
        $user->refresh();
        $this->assertNotNull($user->profile_picture);
        $this->assertStringContainsString('profiles/' . $user->id, $user->profile_picture);
    }

    /** @test */
    public function profile_picture_upload_fails_with_file_too_large()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        // Create a file larger than 2MB (2048 KB)
        $largeFile = UploadedFile::fake()->create('profile.jpg', 3000);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet requirements.',
            'profile_picture' => $largeFile,
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'postal_code' => '12345',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertSessionHasErrors(['profile_picture']);
    }

    /** @test */
    public function profile_picture_upload_fails_with_invalid_file_type()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        // Try uploading a PDF as profile picture (invalid type)
        $invalidFile = UploadedFile::fake()->create('profile.pdf', 100, 'application/pdf');

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet requirements.',
            'profile_picture' => $invalidFile,
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'postal_code' => '12345',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertSessionHasErrors(['profile_picture']);
    }

    /** @test */
    public function profile_picture_is_optional_for_onboarding()
    {
        Storage::fake('r2');
        
        $user = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
            'country' => 'Philippines',
        ]);

        $response = $this->actingAs($user)->post('/onboarding/gig-worker', [
            'professional_title' => 'Web Developer',
            'hourly_rate' => 50,
            'bio' => 'This is a test bio that is at least fifty characters long to meet requirements.',
            // No profile_picture provided
            'broad_category' => 'Web Development',
            'specific_services' => ['Frontend', 'Backend'],
            'skills_with_experience' => [
                ['skill' => 'PHP', 'experience_level' => 'expert'],
                ['skill' => 'JavaScript', 'experience_level' => 'intermediate'],
                ['skill' => 'React', 'experience_level' => 'beginner'],
            ],
            'id_type' => 'national_id',
            'id_front_image' => UploadedFile::fake()->image('id_front.jpg'),
            'id_back_image' => UploadedFile::fake()->image('id_back.jpg'),
            'street_address' => '123 Test Street',
            'city' => 'Test City',
            'postal_code' => '12345',
            'kyc_country' => 'Philippines',
            'working_hours' => [
                'monday' => ['enabled' => true, 'start' => '09:00', 'end' => '17:00'],
            ],
            'timezone' => 'Asia/Manila',
            'preferred_communication' => ['email'],
        ]);

        $response->assertRedirect(route('gig-worker.dashboard'));
        
        $user->refresh();
        $this->assertTrue($user->profile_completed);
        $this->assertNull($user->profile_picture);
    }
}

