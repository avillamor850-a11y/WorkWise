<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    private ?string $apiKey;
    private string $baseUrl;
    /** Model for match explanations and success predictions (higher quality) */
    private string $modelExplanations;
    /** Model for skill recommendations (faster) */
    private string $modelRecommendations;
    /** Model dedicated for resume screening (resume-only analysis) */
    private string $modelResumeScreening;

    public function __construct()
    {
        $this->apiKey = config('services.groq.api_key', env('GROQ_API_KEY'));
        $this->baseUrl = rtrim((string) config('services.groq.base_url', 'https://api.groq.com/openai/v1'), '/');
        // Align with MatchService: 70b for quality, 8b-instant for speed
        $this->modelExplanations = 'llama-3.3-70b-versatile';
        $this->modelRecommendations = 'llama-3.1-8b-instant';
        $this->modelResumeScreening = (string) config(
            'services.groq.resume_model',
            'meta-llama/llama-4-scout-17b-16e-instruct'
        );
    }

    /**
     * Generate AI-powered match explanation for job-freelancer pairing
     */
    public function generateMatchExplanation(array $jobData, array $freelancerData, float $matchScore): string
    {
        try {
            $prompt = $this->buildMatchExplanationPrompt($jobData, $freelancerData, $matchScore);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->modelExplanations,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are an expert AI recruiter specializing in Philippine freelance talent matching. Your expertise is in analyzing technical skills compatibility and experience level alignment. Focus exclusively on SKILLS MATCH and EXPERIENCE LEVEL compatibility. Provide detailed analysis of: 1) Direct skills overlap, 2) Related/complementary skills, 3) Experience level alignment, 4) Potential skill gaps. Always use professional, encouraging language. Use Philippine Peso (₱) for budget mentions.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => 200,
                'temperature' => 0.7
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['choices'][0]['message']['content'] ?? 'AI analysis completed successfully.';
            }

            Log::warning('AI service response not successful', [
                'status' => $response->status(),
                'response' => $response->body()
            ]);

            return $this->getFallbackExplanation($jobData, $freelancerData, $matchScore);

        } catch (\Exception $e) {
            Log::error('AI service error', [
                'error' => $e->getMessage(),
                'job_id' => $jobData['id'] ?? null,
                'freelancer_id' => $freelancerData['id'] ?? null
            ]);

            return $this->getFallbackExplanation($jobData, $freelancerData, $matchScore);
        }
    }

    /**
     * Generate AI-powered skill recommendations for freelancer
     */
    public function generateSkillRecommendations(array $freelancerData, array $marketTrends): array
    {
        try {
            $prompt = $this->buildSkillRecommendationPrompt($freelancerData, $marketTrends);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->modelRecommendations,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are an expert AI career development advisor specializing in Philippine freelance market trends. Focus on technical skills analysis and experience level progression. Provide specific, actionable skill recommendations based on: 1) Current market demand analysis, 2) Skills compatibility with existing profile, 3) Experience level appropriate learning paths, 4) Industry trends and emerging technologies. Always prioritize skills that complement existing expertise.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => 250,
                'temperature' => 0.7
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $content = $data['choices'][0]['message']['content'] ?? '';

                return [
                    'success' => true,
                    'recommendations' => $this->parseSkillRecommendations($content),
                    'raw_response' => $content
                ];
            }

            return [
                'success' => false,
                'recommendations' => [],
                'error' => 'AI service unavailable'
            ];

        } catch (\Exception $e) {
            Log::error('AI skill recommendation error', [
                'error' => $e->getMessage(),
                'freelancer_id' => $freelancerData['id'] ?? null
            ]);

            return [
                'success' => false,
                'recommendations' => [],
                'error' => 'Service temporarily unavailable'
            ];
        }
    }

    /**
     * Generate AI-powered project success predictions
     */
    public function generateSuccessPrediction(array $jobData, array $freelancerData): array
    {
        try {
            $prompt = $this->buildSuccessPredictionPrompt($jobData, $freelancerData);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->modelExplanations,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are an expert AI project management consultant specializing in Philippine freelance project success prediction. Focus on technical skills compatibility and experience level alignment. Analyze: 1) Skills match quality and completeness, 2) Experience level appropriateness, 3) Technical complexity vs expertise alignment, 4) Learning curve and adaptation potential. Provide realistic success probabilities based on skills and experience compatibility.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => 150,
                'temperature' => 0.6
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $content = $data['choices'][0]['message']['content'] ?? '';

                return [
                    'success' => true,
                    'prediction' => $this->parseSuccessPrediction($content),
                    'raw_response' => $content
                ];
            }

            return [
                'success' => false,
                'prediction' => null,
                'error' => 'Prediction service unavailable'
            ];

        } catch (\Exception $e) {
            Log::error('AI success prediction error', [
                'error' => $e->getMessage(),
                'job_id' => $jobData['id'] ?? null,
                'freelancer_id' => $freelancerData['id'] ?? null
            ]);

            return [
                'success' => false,
                'prediction' => null,
                'error' => 'Service temporarily unavailable'
            ];
        }
    }

    /**
     * Build prompt for match explanation
     */
    private function buildMatchExplanationPrompt(array $jobData, array $freelancerData, float $matchScore): string
    {
        return sprintf(
            "Analyze this job-freelancer match:\n\n" .
            "JOB DETAILS:\n" .
            "Title: %s\n" .
            "Description: %s\n" .
            "Required Skills: %s\n" .
            "Experience Level: %s\n" .
            "Budget: %s\n\n" .
            "FREELANCER DETAILS:\n" .
            "Name: %s\n" .
            "Skills: %s\n" .
            "Experience Level: %s\n" .
            "Bio: %s\n" .
            "Match Score: %.1f%%\n\n" .
            "Provide a concise explanation (2-3 sentences) of why this freelancer is a %s match for this job, focusing on skills and experience compatibility.",
            $jobData['title'] ?? 'N/A',
            $jobData['description'] ?? 'N/A',
            implode(', ', $jobData['required_skills'] ?? []),
            $jobData['experience_level'] ?? 'Not specified',
            $jobData['budget_range'] ?? 'Not specified',
            $freelancerData['name'] ?? 'N/A',
            implode(', ', $freelancerData['skills'] ?? []),
            $freelancerData['experience_level'] ?? 'Not specified',
            $freelancerData['bio'] ?? 'Not provided',
            $matchScore * 100,
            $matchScore >= 0.8 ? 'excellent' : ($matchScore >= 0.6 ? 'good' : 'moderate')
        );
    }

    /**
     * Build prompt for skill recommendations
     */
    private function buildSkillRecommendationPrompt(array $freelancerData, array $marketTrends): string
    {
        return sprintf(
            "Based on this freelancer's profile and current market trends, recommend 3-4 specific skills to learn:\n\n" .
            "FREELANCER PROFILE:\n" .
            "Current Skills: %s\n" .
            "Experience Level: %s\n" .
            "Bio: %s\n\n" .
            "MARKET TRENDS:\n" .
            "High Demand Skills: %s\n" .
            "Emerging Technologies: %s\n\n" .
            "Provide specific, actionable skill recommendations that complement their existing skills and align with market demand.",
            implode(', ', $freelancerData['skills'] ?? []),
            $freelancerData['experience_level'] ?? 'Not specified',
            $freelancerData['bio'] ?? 'Not provided',
            implode(', ', $marketTrends['high_demand'] ?? []),
            implode(', ', $marketTrends['emerging'] ?? [])
        );
    }

    /**
     * Build prompt for success prediction
     */
    private function buildSuccessPredictionPrompt(array $jobData, array $freelancerData): string
    {
        return sprintf(
            "Predict the success probability of this freelancer-job pairing:\n\n" .
            "JOB: %s (%s, %s)\n" .
            "FREELANCER: %s (%s experience)\n" .
            "Required Skills: %s\n" .
            "Freelancer Skills: %s\n\n" .
            "Provide a realistic success probability (percentage) and 2-3 key factors that will determine success or failure.",
            $jobData['title'] ?? 'N/A',
            $jobData['experience_level'] ?? 'Any level',
            $jobData['budget_range'] ?? 'Budget not specified',
            $freelancerData['name'] ?? 'N/A',
            $freelancerData['experience_level'] ?? 'Not specified',
            implode(', ', $jobData['required_skills'] ?? []),
            implode(', ', $freelancerData['skills'] ?? [])
        );
    }

    /**
     * Parse skill recommendations from AI response
     */
    private function parseSkillRecommendations(string $content): array
    {
        // Extract skills from AI response (simple parsing)
        $recommendations = [];

        // Look for bullet points or numbered lists
        if (preg_match_all('/(?:^|\n)(?:[-*•]|\d+\.)\s*([^\n]+)/', $content, $matches)) {
            foreach ($matches[1] as $match) {
                $skill = trim($match);
                if (strlen($skill) > 3) {
                    $recommendations[] = $skill;
                }
            }
        }

        // If no structured list found, split by sentences
        if (empty($recommendations)) {
            $sentences = preg_split('/[.!?]+/', $content, -1, PREG_SPLIT_NO_EMPTY);
            foreach ($sentences as $sentence) {
                $sentence = trim($sentence);
                if (strlen($sentence) > 20 && strlen($sentence) < 100) {
                    $recommendations[] = $sentence;
                }
            }
        }

        return array_slice($recommendations, 0, 5); // Limit to 5 recommendations
    }

    /**
     * Parse success prediction from AI response
     */
    private function parseSuccessPrediction(string $content): ?array
    {
        // Look for percentage in the response
        if (preg_match('/(\d+)%/', $content, $matches)) {
            $percentage = (int) $matches[1];

            // Extract key factors
            $factors = [];
            if (preg_match_all('/(?:^|\n)(?:[-*•]|\d+\.)\s*([^\n]+)/', $content, $matches)) {
                foreach ($matches[1] as $match) {
                    $factors[] = trim($match);
                }
            }

            return [
                'probability' => min(100, max(0, $percentage)),
                'factors' => array_slice($factors, 0, 3)
            ];
        }

        return null;
    }

    /**
     * Get fallback explanation when AI service fails
     */
    private function getFallbackExplanation(array $jobData, array $freelancerData, float $matchScore): string
    {
        $scorePercentage = round($matchScore * 100);

        if ($scorePercentage >= 80) {
            return "This freelancer shows excellent compatibility with the job requirements based on their skills and experience level.";
        } elseif ($scorePercentage >= 60) {
            return "This freelancer demonstrates good alignment with the project needs and has relevant experience for the role.";
        } else {
            return "This freelancer has some relevant skills but may need additional training or experience for optimal project success.";
        }
    }

    /**
     * Check if AI service is available and configured
     */
    public function isAvailable(): bool
    {
        return !empty($this->apiKey);
    }

    /**
     * Generate AI-powered resume screening output from normalized resume data.
     * Inputs are resume-only: pass `resume_text` extracted from the uploaded file (and optional `user_id` for logging).
     */
    public function generateResumeScreening(array $resumeData): array
    {
        if (trim((string) ($resumeData['resume_text'] ?? '')) === '') {
            return $this->fallbackResumeScreening($resumeData, 'No resume text extracted');
        }

        if (! $this->isAvailable()) {
            return $this->fallbackResumeScreening($resumeData, 'AI service not configured');
        }

        try {
            $prompt = $this->buildResumeScreeningPrompt($resumeData);
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->modelResumeScreening,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are an AI recruiter. You receive only text extracted from a candidate\'s resume document. Base every output field strictly on that resume text only—do not use profile data or facts not present in the text, except you may compare the extracted candidate name against the provided expected worker name. Return ONLY strict JSON with keys: extracted_skills(array of strings), experience_summary(string), strengths(string), gaps(string), confidence(number 0..100), summary(string), resume_candidate_name(string), name_match(boolean), name_match_confidence(number 0..100), name_match_note(string).',
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt,
                    ],
                ],
                'max_tokens' => 500,
                'temperature' => 0.4,
            ]);

            if (! $response->successful()) {
                return $this->fallbackResumeScreening($resumeData, 'AI request failed');
            }

            $content = (string) ($response->json()['choices'][0]['message']['content'] ?? '');
            $parsed = $this->extractJsonFromAiContent($content);
            if (!is_array($parsed)) {
                return $this->fallbackResumeScreening($resumeData, 'AI response not parseable');
            }

            return [
                'success' => true,
                'data' => [
                    'extracted_skills' => array_values(array_filter(array_map('strval', (array) ($parsed['extracted_skills'] ?? [])))),
                    'experience_summary' => (string) ($parsed['experience_summary'] ?? 'Experience summary unavailable.'),
                    'strengths' => (string) ($parsed['strengths'] ?? 'No strengths identified.'),
                    'gaps' => (string) ($parsed['gaps'] ?? 'No major gaps identified.'),
                    'confidence' => (float) ($parsed['confidence'] ?? 50),
                    'summary' => (string) ($parsed['summary'] ?? 'Resume was screened successfully.'),
                    'resume_candidate_name' => (string) ($parsed['resume_candidate_name'] ?? ''),
                    'name_match' => (bool) ($parsed['name_match'] ?? false),
                    'name_match_confidence' => (float) ($parsed['name_match_confidence'] ?? 0),
                    'name_match_note' => (string) ($parsed['name_match_note'] ?? ''),
                ],
                'raw_response' => $content,
            ];
        } catch (\Throwable $e) {
            Log::error('AI resume screening error', [
                'error' => $e->getMessage(),
                'user_id' => $resumeData['user_id'] ?? null,
            ]);

            return $this->fallbackResumeScreening($resumeData, 'AI screening exception');
        }
    }

    /**
     * Generate employer-side profiling insights as informational guidance.
     */
    public function generateEmployerProfilingInsights(array $employerData, array $screeningContext): array
    {
        if (! $this->isAvailable()) {
            return $this->fallbackEmployerInsights($employerData);
        }

        try {
            $prompt = $this->buildEmployerProfilingPrompt($employerData, $screeningContext);
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->modelExplanations,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Return ONLY strict JSON with key "insights" as an array of 3 concise strings. Keep informational and non-decisive.',
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt,
                    ],
                ],
                'max_tokens' => 220,
                'temperature' => 0.5,
            ]);

            if (! $response->successful()) {
                return $this->fallbackEmployerInsights($employerData);
            }

            $content = (string) ($response->json()['choices'][0]['message']['content'] ?? '');
            $parsed = $this->extractJsonFromAiContent($content);
            $insights = array_values(array_filter(array_map('strval', (array) ($parsed['insights'] ?? []))));
            if (empty($insights)) {
                return $this->fallbackEmployerInsights($employerData);
            }

            return [
                'success' => true,
                'insights' => array_slice($insights, 0, 5),
                'raw_response' => $content,
            ];
        } catch (\Throwable $e) {
            Log::error('AI employer insights error', [
                'error' => $e->getMessage(),
                'user_id' => $employerData['user_id'] ?? null,
            ]);

            return $this->fallbackEmployerInsights($employerData);
        }
    }

    private function buildResumeScreeningPrompt(array $resumeData): string
    {
        $text = (string) ($resumeData['resume_text'] ?? '');
        $workerName = trim((string) ($resumeData['worker_name'] ?? ''));

        return "Analyze the following resume text and return JSON only.\n\n"
            . "Use ONLY the text below as your source for extracted_skills, experience_summary, strengths, gaps, confidence, and summary. "
            . "Do not use any information that is not present in this text.\n"
            . "Also detect the candidate name written in the resume text, then compare it with the expected worker account name provided below and return name_match fields.\n\n"
            . "If the text is empty or unusable, still return valid JSON with low confidence (below 30) and clearly explain in summary and gaps that the document could not be meaningfully analyzed.\n\n"
            . "Expected worker account name: " . ($workerName !== '' ? $workerName : 'Unknown') . "\n\n"
            . "Resume text (from uploaded document):\n"
            . $text;
    }

    private function buildEmployerProfilingPrompt(array $employerData, array $screeningContext): string
    {
        return sprintf(
            "Generate informational hiring insights only.\nEmployer needs: %s\nPreferred level: %s\nTypical budget: %s\nRecent context: %s",
            implode(', ', (array) ($employerData['primary_hiring_needs'] ?? [])),
            (string) ($employerData['preferred_experience_level'] ?? 'any'),
            (string) ($employerData['typical_project_budget'] ?? 'not set'),
            json_encode($screeningContext)
        );
    }

    private function extractJsonFromAiContent(string $content): ?array
    {
        $trimmed = trim($content);
        if ($trimmed === '') {
            return null;
        }

        $decoded = json_decode($trimmed, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/\{.*\}/s', $trimmed, $matches) !== 1) {
            return null;
        }

        $decoded = json_decode($matches[0], true);
        return is_array($decoded) ? $decoded : null;
    }

    private function fallbackResumeScreening(array $resumeData, string $reason): array
    {
        $resumeText = trim((string) ($resumeData['resume_text'] ?? ''));
        $hasText = $resumeText !== '';
        $excerpt = $hasText
            ? mb_substr($resumeText, 0, 280).(mb_strlen($resumeText) > 280 ? '…' : '')
            : 'No resume text was available to analyze.';

        return [
            'success' => false,
            'data' => [
                'extracted_skills' => [],
                'experience_summary' => $excerpt,
                'strengths' => 'Automated analysis unavailable. Review the uploaded resume manually.',
                'gaps' => 'Resume AI analysis unavailable. Please review the uploaded document manually.',
                'confidence' => 20.0,
                'summary' => $hasText
                    ? 'Fallback screening generated from resume text only (AI unavailable or error).'
                    : 'No resume text could be analyzed.',
                'resume_candidate_name' => '',
                'name_match' => false,
                'name_match_confidence' => 0.0,
                'name_match_note' => 'Name match could not be determined.',
            ],
            'error' => $reason,
        ];
    }

    private function fallbackEmployerInsights(array $employerData): array
    {
        $needs = (array) ($employerData['primary_hiring_needs'] ?? []);
        $needsText = empty($needs) ? 'your configured hiring needs' : implode(', ', array_slice($needs, 0, 3));

        return [
            'success' => false,
            'insights' => [
                "Most activity appears around {$needsText}.",
                'Use insights as guidance only; final hiring decisions should remain manual.',
                'Review skill fit, experience level, and communication quality before shortlisting.',
            ],
            'error' => 'Fallback insights generated',
        ];
    }

    /**
     * Get service configuration info (without exposing API key)
     */
    public function getConfig(): array
    {
        return [
            'provider' => 'groq',
            'base_url' => $this->baseUrl,
            'model_explanations' => $this->modelExplanations,
            'model_recommendations' => $this->modelRecommendations,
            'model_resume_screening' => $this->modelResumeScreening,
            'available' => $this->isAvailable()
        ];
    }
}