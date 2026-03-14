<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EmployerOnboardingSimplificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $employer;

    protected function setUp(): void
    {
        parent::setUp();

        // Create an employer user who hasn't completed onboarding
        $this->employer = User::factory()->create([
            'user_type' => 'employer',
            'profile_completed' => false,
            'profile_status' => 'pending',
            'email_verified_at' => now(),
        ]);

        // Fake R2 storage
        Storage::fake('r2');
    }

    /**
     * Test that employer onboarding page loads with correct data
     * Requirements: 1.1, 6.1
     */
    public function test_employer_onboarding_page_loads_correctly(): void
    {
        $response = $this->actingAs($this->employer)
            ->get(route('employer.onboarding'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Onboarding/EmployerOnboarding')
            ->has('user')
            ->has('industries')
            ->has('serviceCategories')
        );
    }

    /**
     * Test that Step 3 (Verification) fields are not validated
     * Requirements: 1.2, 1.3, 5.1, 5.2
     */
    public function test_verification_fields_not_required(): void
    {
        $validData = $this->getValidEmployerData();

        // Ensure we're NOT sending verification fields
        unset($validData['business_registration_document']);
        unset($validData['tax_id']);

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $validData);

        $response->assertRedirect(route('employer.dashboard'));
        $response->assertSessionHas('success');

        // Verify profile is completed
        $this->employer->refresh();
        $this->assertTrue($this->employer->profile_completed);
        $this->assertEquals('approved', $this->employer->profile_status);
    }

    /**
     * Test successful 2-step employer onboarding without profile picture
     * Requirements: 1.1, 1.4, 6.1, 6.2, 7.1
     */
    public function test_employer_onboarding_succeeds_without_profile_picture(): void
    {
        $data = $this->getValidEmployerData();
        unset($data['profile_picture']); // No profile picture

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertRedirect(route('employer.dashboard'));
        $response->assertSessionHas('success');

        // Verify user data was saved correctly
        $this->employer->refresh();
        $this->assertTrue($this->employer->profile_completed);
        $this->assertEquals('approved', $this->employer->profile_status);
        $this->assertEquals($data['company_size'], $this->employer->company_size);
        $this->assertEquals($data['industry'], $this->employer->industry);
        $this->assertEquals($data['company_description'], $this->employer->company_description);
        $this->assertEquals($data['primary_hiring_needs'], $this->employer->primary_hiring_needs);
        $this->assertEquals($data['typical_project_budget'], $this->employer->typical_project_budget);
        $this->assertNull($this->employer->profile_picture);
    }

    /**
     * Test successful 2-step employer onboarding with profile picture
     * Requirements: 1.1, 1.4, 6.1, 6.2, 7.1
     */
    public function test_employer_onboarding_succeeds_with_profile_picture(): void
    {
        $data = $this->getValidEmployerData();
        $data['profile_picture'] = UploadedFile::fake()->image('profile.jpg', 800, 800)->size(1024);

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertRedirect(route('employer.dashboard'));
        $response->assertSessionHas('success');

        // Verify user data was saved
        $this->employer->refresh();
        $this->assertTrue($this->employer->profile_completed);
        $this->assertEquals('approved', $this->employer->profile_status);
        $this->assertNotNull($this->employer->profile_picture);
    }

    /**
     * Test that profile_status is set to 'approved' after completion
     * Requirements: 1.4, 7.1, 7.2
     */
    public function test_profile_status_set_to_approved(): void
    {
        $data = $this->getValidEmployerData();

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertRedirect(route('employer.dashboard'));

        $this->employer->refresh();
        $this->assertEquals('approved', $this->employer->profile_status);
        $this->assertTrue($this->employer->profile_completed);
    }

    /**
     * Test redirect to employer dashboard after successful onboarding
     * Requirements: 1.4, 7.3
     */
    public function test_redirects_to_employer_dashboard(): void
    {
        $data = $this->getValidEmployerData();

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertRedirect(route('employer.dashboard'));
        $response->assertSessionHas('success');
    }

    /**
     * Test Step 1 validation (Company Info)
     * Requirements: 6.1, 6.2, 6.7
     */
    public function test_step1_validation_company_info(): void
    {
        $data = $this->getValidEmployerData();
        
        // Missing required Step 1 fields
        unset($data['company_size']);
        unset($data['industry']);
        unset($data['company_description']);

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertSessionHasErrors(['company_size', 'industry', 'company_description']);
    }

    /**
     * Test Step 2 validation (Hiring Needs)
     * Requirements: 6.1, 6.2, 6.7
     */
    public function test_step2_validation_hiring_needs(): void
    {
        $data = $this->getValidEmployerData();
        
        // Missing required Step 2 fields
        unset($data['primary_hiring_needs']);
        unset($data['typical_project_budget']);
        unset($data['typical_project_duration']);
        unset($data['preferred_experience_level']);
        unset($data['hiring_frequency']);

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertSessionHasErrors([
            'primary_hiring_needs',
            'typical_project_budget',
            'typical_project_duration',
            'preferred_experience_level',
            'hiring_frequency'
        ]);
    }

    /**
     * Test company description minimum length validation
     * Requirements: 6.7
     */
    public function test_company_description_minimum_length(): void
    {
        $data = $this->getValidEmployerData();
        $data['company_description'] = 'Too short'; // Less than 50 characters

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertSessionHasErrors(['company_description']);
    }

    /**
     * Test that at least one hiring need is required
     * Requirements: 6.7
     */
    public function test_at_least_one_hiring_need_required(): void
    {
        $data = $this->getValidEmployerData();
        $data['primary_hiring_needs'] = []; // Empty array

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertSessionHasErrors(['primary_hiring_needs']);
    }

    /**
     * Test that completed employers are redirected to dashboard
     * Requirements: 7.1, 7.2
     */
    public function test_completed_employers_redirected_to_dashboard(): void
    {
        $this->employer->update([
            'profile_completed' => true,
            'profile_status' => 'approved'
        ]);

        $response = $this->actingAs($this->employer)
            ->get(route('employer.onboarding'));

        $response->assertRedirect(route('employer.dashboard'));
    }

    /**
     * Test that non-employers cannot access employer onboarding
     * Requirements: 7.1
     */
    public function test_non_employers_cannot_access_onboarding(): void
    {
        $gigWorker = User::factory()->create([
            'user_type' => 'gig_worker',
            'profile_completed' => false,
        ]);

        $response = $this->actingAs($gigWorker)
            ->get(route('employer.onboarding'));

        $response->assertRedirect(route('jobs.index'));
    }

    /**
     * Test skip onboarding functionality
     * Requirements: 7.1, 7.2
     */
    public function test_skip_onboarding(): void
    {
        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.skip'));

        $response->assertRedirect(route('employer.dashboard'));
        $response->assertSessionHas('info');

        $this->employer->refresh();
        $this->assertTrue($this->employer->profile_completed);
        $this->assertEquals('approved', $this->employer->profile_status);
    }

    /**
     * Test backward compatibility - existing employers with legacy data
     * Requirements: 7.4, 7.5
     */
    public function test_backward_compatibility_with_legacy_data(): void
    {
        // Create employer with legacy verification data
        $legacyEmployer = User::factory()->create([
            'user_type' => 'employer',
            'profile_completed' => true,
            'profile_status' => 'approved',
            'business_registration_document' => 'https://example.com/old-doc.pdf',
            'tax_id' => '12-3456789',
        ]);

        // Verify legacy data is preserved
        $this->assertNotNull($legacyEmployer->business_registration_document);
        $this->assertNotNull($legacyEmployer->tax_id);

        // Verify they're redirected to dashboard (already completed)
        $response = $this->actingAs($legacyEmployer)
            ->get(route('employer.onboarding'));

        $response->assertRedirect(route('employer.dashboard'));
    }

    /**
     * Test that optional company name can be null
     * Requirements: 6.1
     */
    public function test_company_name_is_optional(): void
    {
        $data = $this->getValidEmployerData();
        $data['company_name'] = null;

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertRedirect(route('employer.dashboard'));
        
        $this->employer->refresh();
        $this->assertNull($this->employer->company_name);
        $this->assertTrue($this->employer->profile_completed);
    }

    /**
     * Test that company website is optional
     * Requirements: 6.1
     */
    public function test_company_website_is_optional(): void
    {
        $data = $this->getValidEmployerData();
        $data['company_website'] = null;

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertRedirect(route('employer.dashboard'));
        
        $this->employer->refresh();
        $this->assertNull($this->employer->company_website);
        $this->assertTrue($this->employer->profile_completed);
    }

    /**
     * Test that primary_hiring_needs must be from the allowed service list
     */
    public function test_primary_hiring_needs_rejects_invalid_services(): void
    {
        $data = $this->getValidEmployerData();
        $data['step'] = 4;
        $data['primary_hiring_needs'] = ['Invalid Service Not In List'];

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertSessionHasErrors();
        $errors = session('errors');
        $this->assertTrue(
            $errors->has('primary_hiring_needs.0') || $errors->has('primary_hiring_needs'),
            'Expected validation error for invalid service'
        );
    }

    /**
     * Test that valid service names are normalized to canonical casing
     */
    public function test_primary_hiring_needs_normalized_to_canonical_names(): void
    {
        $data = $this->getValidEmployerData();
        $data['step'] = 4;
        $data['primary_hiring_needs'] = ['web development', 'content writing', 'SEO & Digital Marketing'];

        $response = $this->actingAs($this->employer)
            ->post(route('employer.onboarding.store'), $data);

        $response->assertSessionHasNoErrors();
        $this->employer->refresh();
        $this->assertEqualsCanonicalizing(
            ['Web Development', 'Content Writing', 'SEO & Digital Marketing'],
            $this->employer->primary_hiring_needs
        );
    }

    /**
     * Helper method to get valid employer onboarding data
     */
    protected function getValidEmployerData(): array
    {
        return [
            // Step 1: Company Information
            'company_name' => 'Test Company Inc.',
            'company_size' => '11-50',
            'industry' => 'Technology & IT',
            'company_website' => 'https://testcompany.com',
            'company_description' => 'We are a technology company focused on building innovative solutions for businesses. Our team specializes in web and mobile development.',
            
            // Step 2: Hiring Preferences
            'primary_hiring_needs' => ['Web Development', 'UI/UX Design', 'Content Writing'],
            'typical_project_budget' => '2000-5000',
            'typical_project_duration' => 'medium_term',
            'preferred_experience_level' => 'intermediate',
            'hiring_frequency' => 'regular',
        ];
    }
}
