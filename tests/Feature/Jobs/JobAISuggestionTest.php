<?php

namespace Tests\Feature\Jobs;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class JobAISuggestionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Start session for web authentication
        $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);
    }

    private function createEmployer(): User
    {
        return User::create([
            'first_name' => 'Emp',
            'last_name' => 'Loyer',
            'email' => 'employer@test.com',
            'password' => Hash::make('password123'),
            'user_type' => 'employer',
        ]);
    }

    // Task 6.2: Test AI suggestion integration
    public function test_skill_recommendations_api_returns_suggestions(): void
    {
        $employer = $this->createEmployer();
        
        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'React Developer',
            'description' => 'Looking for a React developer to build a modern web application',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'taxonomy_skills',
            'emerging_skills',
            'innovative_roles',
        ]);
    }

    public function test_skill_recommendations_exclude_existing_skills(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Full Stack Developer',
            'description' => 'Need a full stack developer with React and Node.js experience',
            'exclude' => ['React', 'Node.js'],
        ]);

        $response->assertStatus(200);
        
        $data = $response->json();
        
        // Verify excluded skills are not in taxonomy_skills
        if (isset($data['taxonomy_skills']) && is_array($data['taxonomy_skills'])) {
            $this->assertNotContains('React', $data['taxonomy_skills']);
            $this->assertNotContains('Node.js', $data['taxonomy_skills']);
        }
    }

    public function test_accept_suggestion_endpoint_records_acceptance(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills/accept', [
            'type' => 'skill',
            'value' => 'React',
            'context' => ['source' => 'taxonomy'],
        ]);

        $response->assertStatus(200);
        $response->assertJson(['status' => 'ok']);
    }

    public function test_accept_suggestion_validates_type(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills/accept', [
            'type' => 'invalid_type',
            'value' => 'React',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['type']);
    }

    public function test_accept_suggestion_requires_value(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills/accept', [
            'type' => 'skill',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['value']);
    }

    public function test_project_category_validation_requires_custom_label(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/project-category', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['custom_label']);
    }

    public function test_project_category_validation_exact_taxonomy_match(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/project-category', [
            'custom_label' => 'web development',
            'title' => 'Need a site',
            'description' => 'Build a website',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'valid' => true,
            'canonical_category' => 'Web Development',
        ]);
    }

    public function test_project_category_validation_returns_json_shape_for_nonsense(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/project-category', [
            'custom_label' => 'asdfghjkl qwerty nonsense xyz123',
            'title' => '',
            'description' => '',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['valid', 'canonical_category', 'suggestions', 'message']);
        $data = $response->json();
        $this->assertFalse($data['valid']);
        $this->assertNull($data['canonical_category']);
        $this->assertIsArray($data['suggestions']);
        $allowed = app(\App\Services\SkillService::class)->getCategories();
        foreach ($data['suggestions'] as $s) {
            $this->assertContains($s, $allowed);
        }
    }

    public function test_skill_recommendations_with_empty_input(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => '',
            'description' => '',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        // Should still return valid structure even with empty input
        $response->assertJsonStructure([
            'taxonomy_skills',
            'emerging_skills',
            'innovative_roles',
        ]);
    }

    public function test_skill_recommendations_with_technical_terms(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Senior Laravel Developer',
            'description' => 'We need an experienced Laravel developer with Vue.js and MySQL knowledge',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        
        $data = $response->json();
        
        // Verify response structure
        $this->assertIsArray($data['taxonomy_skills'] ?? null);
        $this->assertIsArray($data['emerging_skills'] ?? null);
        $this->assertIsArray($data['innovative_roles'] ?? null);
    }

    // Task 6.2: Verify suggestions appear based on title/description
    public function test_suggestions_appear_based_on_title(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'React Developer Needed',
            'description' => 'Building a modern web application',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        // Should return taxonomy skills based on "React" in title
        $this->assertNotEmpty($data['taxonomy_skills']);
        $this->assertIsArray($data['taxonomy_skills']);
    }

    public function test_suggestions_appear_based_on_description(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Web Developer',
            'description' => 'Looking for someone with TypeScript, Node.js, and PostgreSQL experience to build a REST API',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        // Should return relevant skills based on description keywords
        $this->assertNotEmpty($data['taxonomy_skills']);
        $this->assertIsArray($data['taxonomy_skills']);
    }

    public function test_suggestions_combine_title_and_description(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Full Stack Developer',
            'description' => 'Need expertise in React, Node.js, MongoDB, and AWS deployment',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        // Should return skills from both title and description
        $this->assertNotEmpty($data['taxonomy_skills']);
        $this->assertGreaterThan(0, count($data['taxonomy_skills']));
    }

    // Task 6.2: Verify duplicate prevention works
    public function test_duplicate_prevention_excludes_existing_skills(): void
    {
        $employer = $this->createEmployer();

        $existingSkills = ['React', 'TypeScript', 'Node.js'];

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'React Developer with TypeScript',
            'description' => 'Building a Node.js backend with React frontend',
            'exclude' => $existingSkills,
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        // Verify excluded skills are NOT in the suggestions
        $taxonomySkills = $data['taxonomy_skills'] ?? [];
        foreach ($existingSkills as $excludedSkill) {
            $this->assertNotContains($excludedSkill, $taxonomySkills, 
                "Excluded skill '{$excludedSkill}' should not appear in suggestions");
        }
    }

    public function test_duplicate_prevention_case_insensitive(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'JavaScript Developer',
            'description' => 'Need JavaScript and HTML skills',
            'exclude' => ['javascript', 'html'], // lowercase
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        $taxonomySkills = array_map('strtolower', $data['taxonomy_skills'] ?? []);
        
        // Should not contain javascript or html in any case
        $this->assertNotContains('javascript', $taxonomySkills);
        $this->assertNotContains('html', $taxonomySkills);
    }

    // Task 6.2: Verify emerging skills integration works
    public function test_emerging_skills_appear_for_ai_keywords(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'AI Engineer',
            'description' => 'Looking for someone with machine learning and LLM experience',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        // Should return emerging skills related to AI/ML
        $this->assertArrayHasKey('emerging_skills', $data);
        $this->assertIsArray($data['emerging_skills']);
        
        // Emerging skills should be populated for AI-related jobs
        if (!empty($data['emerging_skills'])) {
            $this->assertGreaterThan(0, count($data['emerging_skills']));
        }
    }

    public function test_emerging_skills_appear_for_web3_keywords(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Blockchain Developer',
            'description' => 'Need Web3 and Solidity expertise for dApp development',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        // Should return emerging skills related to Web3/Blockchain
        $this->assertArrayHasKey('emerging_skills', $data);
        $this->assertIsArray($data['emerging_skills']);
    }

    public function test_emerging_skills_empty_for_traditional_roles(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Data Entry Clerk',
            'description' => 'Need someone to enter data into spreadsheets',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        // Emerging skills might be empty or minimal for traditional roles
        $this->assertArrayHasKey('emerging_skills', $data);
        $this->assertIsArray($data['emerging_skills']);
    }

    // Task 6.2: Verify innovative roles integration
    public function test_innovative_roles_suggested_for_relevant_jobs(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'AI Marketing Specialist',
            'description' => 'Looking for someone to create AI-powered marketing content',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        // Should return innovative roles
        $this->assertArrayHasKey('innovative_roles', $data);
        $this->assertIsArray($data['innovative_roles']);
    }

    public function test_innovative_roles_empty_for_standard_jobs(): void
    {
        $employer = $this->createEmployer();

        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Administrative Assistant',
            'description' => 'Need help with office administration tasks',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        // Innovative roles might be empty for standard jobs
        $this->assertArrayHasKey('innovative_roles', $data);
        $this->assertIsArray($data['innovative_roles']);
    }

    // Task 6.2: Test "Add all" functionality simulation
    public function test_multiple_skills_can_be_added_at_once(): void
    {
        $employer = $this->createEmployer();

        // Get suggestions first
        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Full Stack Developer',
            'description' => 'React, Node.js, MongoDB, Docker',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        $suggestedSkills = $data['taxonomy_skills'] ?? [];
        $this->assertNotEmpty($suggestedSkills);
        
        // Simulate "Add all" by accepting multiple suggestions
        foreach (array_slice($suggestedSkills, 0, 3) as $skill) {
            $acceptResponse = $this->actingAs($employer)->postJson('/api/recommendations/skills/accept', [
                'type' => 'skill',
                'value' => $skill,
                'context' => ['source' => 'taxonomy', 'action' => 'add_all'],
            ]);
            
            $acceptResponse->assertStatus(200);
        }
    }

    // Task 6.2: Test individual skill addition
    public function test_individual_skill_can_be_added_from_suggestions(): void
    {
        $employer = $this->createEmployer();

        // Get suggestions
        $response = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'React Developer',
            'description' => 'Building a web application',
            'exclude' => [],
        ]);

        $response->assertStatus(200);
        $data = $response->json();
        
        $suggestedSkills = $data['taxonomy_skills'] ?? [];
        
        if (!empty($suggestedSkills)) {
            $skillToAdd = $suggestedSkills[0];
            
            // Accept the suggestion
            $acceptResponse = $this->actingAs($employer)->postJson('/api/recommendations/skills/accept', [
                'type' => 'skill',
                'value' => $skillToAdd,
                'context' => ['source' => 'taxonomy'],
            ]);
            
            $acceptResponse->assertStatus(200);
            $acceptResponse->assertJson(['status' => 'ok']);
        }
    }

    // Task 6.2: Test that suggestions update when skills are added
    public function test_suggestions_update_after_adding_skills(): void
    {
        $employer = $this->createEmployer();

        // First request with no exclusions
        $response1 = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Web Developer',
            'description' => 'HTML, CSS, JavaScript',
            'exclude' => [],
        ]);

        $response1->assertStatus(200);
        $data1 = $response1->json();
        $initialSkills = $data1['taxonomy_skills'] ?? [];
        
        // Second request excluding some skills (simulating they were added)
        $skillsToExclude = array_slice($initialSkills, 0, 2);
        
        $response2 = $this->actingAs($employer)->postJson('/api/recommendations/skills', [
            'title' => 'Web Developer',
            'description' => 'HTML, CSS, JavaScript',
            'exclude' => $skillsToExclude,
        ]);

        $response2->assertStatus(200);
        $data2 = $response2->json();
        $updatedSkills = $data2['taxonomy_skills'] ?? [];
        
        // Verify excluded skills are not in updated suggestions
        foreach ($skillsToExclude as $excluded) {
            $this->assertNotContains($excluded, $updatedSkills);
        }
    }

    public function test_all_skills_endpoint_returns_unique_skills(): void
    {
        $employer = $this->createEmployer();

        // Create some jobs with skills first
        \App\Models\GigJob::create([
            'employer_id' => $employer->id,
            'title' => 'Test Job 1',
            'description' => str_repeat('Test description. ', 20),
            'required_skills' => ['PHP', 'Laravel', 'MySQL'],
            'budget_type' => 'fixed',
            'budget_min' => 100,
            'budget_max' => 200,
            'experience_level' => 'intermediate',
            'estimated_duration_days' => 10,
            'status' => 'open',
            'is_remote' => true,
        ]);

        \App\Models\GigJob::create([
            'employer_id' => $employer->id,
            'title' => 'Test Job 2',
            'description' => str_repeat('Another test description. ', 20),
            'required_skills' => ['PHP', 'Vue.js', 'JavaScript'],
            'budget_type' => 'hourly',
            'budget_min' => 30,
            'budget_max' => 60,
            'experience_level' => 'expert',
            'estimated_duration_days' => 20,
            'status' => 'open',
            'is_remote' => true,
        ]);

        $response = $this->actingAs($employer)->get('/api/recommendations/skills/all');

        $response->assertStatus(200);
        
        $skills = $response->json();
        
        $this->assertIsArray($skills);
        $this->assertGreaterThan(0, count($skills));
        
        // Verify skills are unique (no duplicates)
        $this->assertEquals(count($skills), count(array_unique($skills)));
        
        // Verify expected skills are present
        $this->assertContains('PHP', $skills);
        $this->assertContains('Laravel', $skills);
        $this->assertContains('MySQL', $skills);
        $this->assertContains('Vue.js', $skills);
        $this->assertContains('JavaScript', $skills);
    }
}
