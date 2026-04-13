<?php

namespace Tests\Unit\Services;

use App\Services\AIService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AIServiceResumeScreeningTest extends TestCase
{
    public function test_resume_screening_uses_configured_groq_resume_model(): void
    {
        config([
            'services.groq.api_key' => 'test-groq-key',
            'services.groq.base_url' => 'https://api.groq.com/openai/v1',
            'services.groq.resume_model' => 'meta-llama/llama-4-scout-17b-16e-instruct',
        ]);

        Http::fake([
            'api.groq.com/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'extracted_skills' => ['PHP', 'Laravel'],
                            'experience_summary' => '5 years experience',
                            'strengths' => 'Backend development',
                            'gaps' => 'No certifications listed',
                            'confidence' => 89,
                            'summary' => 'Strong resume fit for backend roles.',
                        ]),
                    ],
                ]],
            ], 200),
        ]);

        $service = new AIService();
        $result = $service->generateResumeScreening([
            'worker_name' => 'Jane Developer',
            'resume_text' => 'Experienced Laravel developer with strong PHP background.',
        ]);

        $recorded = Http::recorded();
        $this->assertNotEmpty($recorded);
        $request = $recorded[0][0];

        $this->assertStringEndsWith('/chat/completions', $request->url());
        $this->assertSame('meta-llama/llama-4-scout-17b-16e-instruct', $request->data()['model'] ?? null);
        $this->assertArrayHasKey('name_match', $result['data']);
        $this->assertArrayHasKey('name_match_confidence', $result['data']);
        $this->assertArrayHasKey('name_match_note', $result['data']);
        $this->assertArrayHasKey('resume_candidate_name', $result['data']);
    }

    public function test_resume_screening_fallback_returns_low_confidence_when_ai_not_configured(): void
    {
        config([
            'services.groq.api_key' => null,
            'services.groq.base_url' => 'https://api.groq.com/openai/v1',
        ]);

        $service = new AIService();
        $result = $service->generateResumeScreening([
            'resume_text' => 'Sample resume text content for fallback validation.',
        ]);

        $this->assertFalse($result['success']);
        $this->assertSame(20.0, $result['data']['confidence']);
        $this->assertFalse($result['data']['name_match']);
        $this->assertSame(0.0, $result['data']['name_match_confidence']);
        $this->assertSame('AI service not configured', $result['error']);
    }

    public function test_employer_profiling_insights_uses_70b_model(): void
    {
        config([
            'services.groq.api_key' => 'test-groq-key',
            'services.groq.base_url' => 'https://api.groq.com/openai/v1',
        ]);

        Http::fake([
            'api.groq.com/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'insights' => ['Insight 1', 'Insight 2', 'Insight 3'],
                        ]),
                    ],
                ]],
            ], 200),
        ]);

        $service = new AIService();
        $service->generateEmployerProfilingInsights(
            ['primary_hiring_needs' => ['Web Development']],
            ['recent_screenings_count' => 2]
        );

        $recorded = Http::recorded();
        $this->assertNotEmpty($recorded);
        $request = $recorded[0][0];
        $this->assertSame('llama-3.3-70b-versatile', $request->data()['model'] ?? null);
    }
}
