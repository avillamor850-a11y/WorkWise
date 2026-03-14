<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use App\Models\GigJob;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MatchService
{
    private ?string $apiKey;
    private string $model;
    private string $baseUrl;
    private string $certPath;
    private bool $isConfigured;

    private array $models;

    public function __construct()
    {
        $this->apiKey = env('GROQ_API_KEY');
        $this->baseUrl = 'https://api.groq.com/openai/v1';
        $this->certPath = base_path('cacert.pem');
        $this->isConfigured = !empty($this->apiKey);

        // Define models and their parameters in priority order
        $this->models = [
            [
                'name' => 'llama-3.3-70b-versatile',
                'temperature' => 1.0,
                'max_completion_tokens' => 1024,
                'top_p' => 1.0,
            ],
            [
                'name' => 'meta-llama/llama-4-scout-17b-16e-instruct',
                'temperature' => 1.0,
                'max_completion_tokens' => 1024,
                'top_p' => 1.0,
            ],
            [
                'name' => 'meta-llama/llama-4-maverick-17b-128e-instruct',
                'temperature' => 1.0,
                'max_completion_tokens' => 1024,
                'top_p' => 1.0,
            ],
            [
                'name' => 'qwen/qwen3-32b',
                'temperature' => 0.6,
                'max_completion_tokens' => 4096,
                'top_p' => 0.95,
            ],
            [
                'name' => 'llama-3.1-8b-instant',
                'temperature' => 1.0,
                'max_completion_tokens' => 1024,
                'top_p' => 1.0,
            ]
        ];

        // Default to the first model just for logging purposes
        $this->model = $this->models[0]['name'];

        if (!$this->isConfigured) {
            Log::warning('GROQ_API_KEY is not configured. AI matching will use fallback mode.');
        } else {
            Log::info('AI matching configured with Groq API and multi-model failover.');
        }
    }

    /**
     * Extract job skills for matching, prioritizing structured data
     * 
     * @param GigJob $job
     * @return array ['required' => [...], 'preferred' => [...], 'all_skill_names' => [...]]
     */
    private function getJobSkillsForMatching(GigJob $job): array
    {
        // Normalize skills_requirements (may be string if not cast or from raw query)
        $skillsReqs = $job->skills_requirements;
        if (is_string($skillsReqs)) {
            $skillsReqs = json_decode($skillsReqs, true);
        }
        if (!is_array($skillsReqs)) {
            $skillsReqs = [];
        }

        // Prioritize skills_requirements (structured data)
        if (!empty($skillsReqs)) {
            $required = array_filter($skillsReqs, fn($s) =>
                is_array($s) && (($s['importance'] ?? 'required') === 'required')
            );
            $preferred = array_filter($skillsReqs, fn($s) =>
                is_array($s) && (($s['importance'] ?? 'required') === 'preferred')
            );
            $allSkillNames = array_values(array_map(function ($s) {
                if (is_array($s)) {
                    return trim((string) ($s['skill'] ?? $s[0] ?? ''));
                }
                return trim((string) $s);
            }, $skillsReqs));
            $allSkillNames = array_filter($allSkillNames);

            // #region agent log
            $firstReq = array_values($required)[0] ?? null;
            $firstPref = array_values($preferred)[0] ?? null;
            $reqHasExp = $firstReq !== null ? array_key_exists('experience_level', $firstReq) : 'n/a';
            $prefHasExp = $firstPref !== null ? array_key_exists('experience_level', $firstPref) : 'n/a';
            @file_put_contents(base_path('debug-8533e5.log'), json_encode(['sessionId'=>'8533e5','hypothesisId'=>'H3','location'=>'MatchService::getJobSkillsForMatching','message'=>'skills_requirements branch','data'=>['job_id'=>$job->id,'branch'=>'skills_requirements','required_count'=>count($required),'preferred_count'=>count($preferred),'first_required_has_experience_level'=>$reqHasExp,'first_preferred_has_experience_level'=>$prefHasExp],'timestamp'=>time()*1000])."\n", FILE_APPEND | LOCK_EX);
            // #endregion

            $defaultLevel = $job->experience_level ?? 'intermediate';
            $normalize = function (array $items) use ($defaultLevel) {
                return array_values(array_map(function ($s) use ($defaultLevel) {
                    return [
                        'skill' => $s['skill'] ?? $s[0] ?? '',
                        'experience_level' => $s['experience_level'] ?? $defaultLevel,
                        'importance' => $s['importance'] ?? 'required',
                    ];
                }, $items));
            };

            return [
                'required' => $normalize($required),
                'preferred' => $normalize($preferred),
                'all_skill_names' => array_values($allSkillNames)
            ];
        }
        
        // Fallback to required_skills (legacy)
        $rawSkills = $job->required_skills ?? [];

        // Handle JSON-encoded strings that haven't been cast yet
        if (is_string($rawSkills)) {
            $rawSkills = json_decode($rawSkills, true) ?? [];
        }

        // Flatten each element to a plain string — elements may be plain strings,
        // associative arrays ['skill'=>'PHP',...], or indexed arrays ['PHP','intermediate']
        $requiredSkills = array_values(array_filter(array_map(function ($skill) {
            if (is_string($skill)) {
                return trim($skill);
            }
            if (is_array($skill)) {
                return trim((string) ($skill['skill'] ?? $skill[0] ?? ''));
            }
            return '';
        }, (array) $rawSkills)));

        $defaultExperienceLevel = $job->experience_level ?? 'intermediate';

        $required = array_map(fn($skill) => [
            'skill'            => $skill,
            'experience_level' => $defaultExperienceLevel,
            'importance'       => 'required',
        ], $requiredSkills);
        
        return [
            'required' => $required,
            'preferred' => [],
            'all_skill_names' => $requiredSkills
        ];
    }

    /**
     * Compare experience levels and return difference
     * 
     * @param string $workerLevel
     * @param string $requiredLevel
     * @return int Positive if worker exceeds requirement, negative if below, 0 if equal
     */
    private function compareExperienceLevels(string $workerLevel, string $requiredLevel): int
    {
        $levels = ['beginner' => 1, 'intermediate' => 2, 'expert' => 3];
        $workerValue = $levels[strtolower($workerLevel)] ?? 2;
        $requiredValue = $levels[strtolower($requiredLevel)] ?? 2;
        
        return $workerValue - $requiredValue;
    }

    /**
     * Find a specific skill in worker's skill set.
     * Handles structured arrays, indexed arrays, and plain strings.
     *
     * @param array $workerSkills
     * @param string $skillName
     * @return array|null
     */
    private function findWorkerSkill(array $workerSkills, string $skillName): ?array
    {
        $skillNameLower = strtolower($skillName);

        foreach ($workerSkills as $skill) {
            if (is_string($skill)) {
                if (strtolower($skill) === $skillNameLower) {
                    return ['skill' => $skill, 'experience_level' => 'intermediate'];
                }
            } elseif (is_array($skill)) {
                // Support ['skill' => 'PHP', 'experience_level' => '...'] and ['PHP', 'intermediate']
                $candidateName = $skill['skill'] ?? $skill[0] ?? null;
                if ($candidateName !== null && strtolower((string) $candidateName) === $skillNameLower) {
                    return [
                        'skill'            => (string) $candidateName,
                        'experience_level' => $skill['experience_level'] ?? $skill[1] ?? 'intermediate',
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Calculate skill match score with experience level consideration
     * 
     * @param array $jobSkills Result from getJobSkillsForMatching()
     * @param array $workerSkills Worker's skills_with_experience array
     * @return array ['score' => int, 'details' => array, 'required_matches' => int, 'required_total' => int, 'preferred_matches' => int]
     */
    private function calculateSkillMatchScore(array $jobSkills, array $workerSkills): array
    {
        $score = 0;
        $matchDetails = [];
        
        // Required skills matching (70% weight)
        $requiredMatches = 0;
        $requiredTotal = count($jobSkills['required']);
        
        foreach ($jobSkills['required'] as $requiredSkill) {
            $skillName = $requiredSkill['skill'];
            $requiredLevel = $requiredSkill['experience_level'] ?? 'intermediate';
            
            // Check if worker has this skill
            $workerSkill = $this->findWorkerSkill($workerSkills, $skillName);
            
            if ($workerSkill) {
                $requiredMatches++;
                $workerLevel = $workerSkill['experience_level'] ?? 'intermediate';
                
                // Bonus for experience level match
                $levelComparison = $this->compareExperienceLevels($workerLevel, $requiredLevel);
                
                if ($levelComparison >= 0) {
                    $score += 10; // Experience level meets or exceeds requirement
                    $matchDetails[] = "✓ {$skillName} ({$workerLevel})";
                } else {
                    $score += 5; // Has skill but lower experience
                    $matchDetails[] = "~ {$skillName} (needs more experience)";
                }
            }
        }
        
        $requiredScore = $requiredTotal > 0 
            ? ($requiredMatches / $requiredTotal) * 70 
            : 0;
        
        // Preferred skills matching (30% weight)
        $preferredMatches = 0;
        $preferredTotal = count($jobSkills['preferred']);
        
        foreach ($jobSkills['preferred'] as $preferredSkill) {
            $skillName = $preferredSkill['skill'];
            $workerSkill = $this->findWorkerSkill($workerSkills, $skillName);
            
            if ($workerSkill) {
                $preferredMatches++;
                $matchDetails[] = "+ {$skillName} (bonus)";
            }
        }
        
        $preferredScore = $preferredTotal > 0 
            ? ($preferredMatches / $preferredTotal) * 30 
            : 30; // Full bonus if no preferred skills specified
        
        return [
            'score' => (int) min(100, $requiredScore + $preferredScore + $score),
            'details' => $matchDetails,
            'required_matches' => $requiredMatches,
            'required_total' => $requiredTotal,
            'preferred_matches' => $preferredMatches
        ];
    }

    /**
     * Generate human-readable match explanation from match details
     *
     * @param array $matchResult Result from calculateSkillMatchScore()
     * @param array $jobSkills Result from getJobSkillsForMatching()
     * @param string $audience 'worker' (you/your) or 'employer' (candidate/they)
     * @return string
     */
    private function generateMatchExplanation(array $matchResult, array $jobSkills, string $audience = 'worker'): string
    {
        $explanations = [];
        $forEmployer = $audience === 'employer';

        // Required skills summary
        if ($matchResult['required_total'] > 0) {
            $requiredPercent = round(($matchResult['required_matches'] / $matchResult['required_total']) * 100);

            if ($matchResult['required_matches'] === $matchResult['required_total']) {
                $explanations[] = $forEmployer
                    ? "This candidate matches all {$matchResult['required_total']} required skills"
                    : "Perfect match on all {$matchResult['required_total']} required skills";
            } elseif ($matchResult['required_matches'] > 0) {
                $explanations[] = "Matches {$matchResult['required_matches']} of {$matchResult['required_total']} required skills ({$requiredPercent}%)";
            } else {
                $explanations[] = $forEmployer
                    ? "Missing required skills; candidate may need to upskill"
                    : "Missing required skills - consider upskilling";
            }
        }

        // Preferred skills summary
        if ($matchResult['preferred_matches'] > 0) {
            $explanations[] = "Bonus: {$matchResult['preferred_matches']} preferred skill(s) matched";
        }

        // Specific skill details
        if (!empty($matchResult['details'])) {
            $detailsText = implode(', ', array_slice($matchResult['details'], 0, 5));
            $explanations[] = $detailsText;
        }

        // Skill gaps
        $missingRequired = $matchResult['required_total'] - $matchResult['required_matches'];
        if ($missingRequired > 0) {
            $missingSkills = [];
            foreach ($jobSkills['required'] as $requiredSkill) {
                $found = false;
                foreach ($matchResult['details'] as $detail) {
                    if (str_contains($detail, $requiredSkill['skill'])) {
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $missingSkills[] = $requiredSkill['skill'];
                }
            }

            if (!empty($missingSkills)) {
                $missingList = implode(', ', array_slice($missingSkills, 0, 3));
                $explanations[] = $forEmployer
                    ? "Candidate could strengthen profile with: {$missingList}"
                    : "Consider learning: {$missingList}";
            }
        }

        return implode('. ', $explanations);
    }

    /**
     * Get match score between a job and a gig worker using keyword matching as fallback
     *
     * @param string $audience 'worker' (you/your) or 'employer' (candidate/they)
     */
    private function getFallbackMatch(GigJob $job, User $gigWorker, string $audience = 'worker'): array
    {
        $forEmployer = $audience === 'employer';
        // Try to use structured skill matching if available
        $jobSkills = $this->getJobSkillsForMatching($job);
        
        $workerSkills = $this->normalizeSkills($gigWorker->skills_with_experience);
        
        // If worker has structured skills, use the new matching algorithm
        if (is_array($workerSkills) && !empty($workerSkills) && !empty($jobSkills['all_skill_names'])) {
            $matchResult = $this->calculateSkillMatchScore($jobSkills, $workerSkills);
            $explanation = $this->generateMatchExplanation($matchResult, $jobSkills, $audience);
            
            return [
                'score' => (int) round($matchResult['score']),
                'reason' => $explanation,
                'success' => true
            ];
        }
        
        // Legacy fallback for workers without structured skills
        $score = 0;
        $reasons = [];

        // Quick validation - return early if no skills data
        $workerSkillsLegacy = $gigWorker->skills ?? [];
        if (empty($workerSkillsLegacy) || empty($jobSkills['all_skill_names'])) {
            return [
                'score' => 10, // Minimal score for having a profile
                'reason' => $forEmployer
                    ? 'Basic profile match - consider this candidate for general opportunities'
                    : 'Basic profile match - consider for general opportunities',
                'success' => true
            ];
        }

        // Compare required skills with optimized matching
        $gigWorkerSkills = array_map('strtolower', $workerSkillsLegacy);
        $jobSkillsLower = array_map('strtolower', $jobSkills['all_skill_names']);

        // Direct matches (most important)
        $matchingSkills = array_intersect($gigWorkerSkills, $jobSkillsLower);
        
        // Quick partial matching (limit to prevent timeout)
        $partialMatches = [];
        $maxPartialChecks = min(5, count($jobSkillsLower)); // Limit partial match checks
        
        foreach (array_slice($jobSkillsLower, 0, $maxPartialChecks) as $jobSkill) {
            if (!in_array($jobSkill, $matchingSkills)) {
                foreach ($gigWorkerSkills as $gigWorkerSkill) {
                    if (strlen($jobSkill) > 3 && strlen($gigWorkerSkill) > 3) {
                        if (str_contains($gigWorkerSkill, $jobSkill) || str_contains($jobSkill, $gigWorkerSkill)) {
                            $partialMatches[] = $jobSkill;
                            break;
                        }
                    }
                }
            }
        }

        $directMatchScore = count($matchingSkills) > 0
            ? min(100, (count($matchingSkills) / count($jobSkillsLower)) * 100)
            : 0;

        $partialMatchScore = count($partialMatches) > 0
            ? min(50, (count($partialMatches) / count($jobSkillsLower)) * 50) // Partial matches worth 50% of direct, max 50
            : 0;

        $skillScore = min(100, $directMatchScore + $partialMatchScore);
        $score += $skillScore * 0.6; // Skills are 60% of the score

        // Compare experience level with more generous scoring
        $experienceLevels = ['beginner' => 1, 'intermediate' => 2, 'expert' => 3];
        $jobLevel = $experienceLevels[$job->experience_level] ?? 2; // Default to intermediate
        $gigWorkerLevel = $experienceLevels[$gigWorker->experience_level] ?? 2; // Default to intermediate

        $levelDiff = abs($jobLevel - $gigWorkerLevel);
        $experienceScore = match($levelDiff) {
            0 => 100, // Perfect match
            1 => 75,  // One level off
            default => 50 // Two or more levels off
        };
        $score += $experienceScore * 0.4; // Experience is 40% of the score

        // Build reason text with more positive language
        if (count($matchingSkills) > 0) {
            $reasons[] = "Strong match on " . count($matchingSkills) . " key skills: " . implode(', ', $matchingSkills);
        }
        if (count($partialMatches) > 0) {
            $reasons[] = "Partial match on " . count($partialMatches) . " related skills: " . implode(', ', $partialMatches);
        }
        if ($levelDiff === 0) {
            $reasons[] = "Perfect experience level alignment";
        } elseif ($levelDiff === 1) {
            $reasons[] = "Good experience level fit";
        } else {
            $reasons[] = "Experience level considered";
        }

        // Add bonus for having skills even if not perfect match
        if (count($gigWorkerSkills) > 0 && $score < 30) {
            $score += 20; // Bonus for having any relevant skills
            $reasons[] = $forEmployer ? "Candidate shows relevant technical background" : "Shows relevant technical background";
        }

        $defaultReason = $forEmployer ? 'Candidate shows potential for this role' : 'Profile shows potential for this role';
        return [
            'score' => (int) min(100, round($score)), // Cap at 100
            'reason' => count($reasons) > 0
                ? implode('. ', $reasons)
                : $defaultReason,
            'success' => true
        ];
    }

    /**
     * Get match score between a job and a gig worker
     *
     * @param string $audience 'worker' (you/your) or 'employer' (candidate/they)
     * @param bool $refresh when true, bypass cache and regenerate insight/score from latest data
     */
    public function getJobMatch(GigJob $job, User $gigWorker, string $audience = 'worker', bool $refresh = false): array
    {
        // If OpenRouter is not configured, use fallback matching
        if (!$this->isConfigured) {
            return $this->getFallbackMatch($job, $gigWorker, $audience);
        }

        // Generate cache key (include audience so employer and worker views are cached separately)
        $cacheKey = $audience === 'employer'
            ? "match_score_{$job->id}_{$gigWorker->id}_employer"
            : "match_score_{$job->id}_{$gigWorker->id}";

        // When refresh=1, skip cache so we read latest DB data and regenerate insight/score
        if (!$refresh && Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        try {
            // Get structured job skills
            $jobSkills = $this->getJobSkillsForMatching($job);
            
            // Build required skills text with experience levels
            $requiredSkillsText = '';
            if (!empty($jobSkills['required'])) {
                $requiredSkillsList = array_map(fn($s) => 
                    "{$s['skill']} ({$s['experience_level']})", 
                    $jobSkills['required']
                );
                $requiredSkillsText = implode(', ', $requiredSkillsList);
            } else {
                $requiredSkillsText = implode(', ', $jobSkills['all_skill_names']);
            }
            
            // Build preferred skills text if available
            $preferredSkillsText = '';
            if (!empty($jobSkills['preferred'])) {
                $preferredSkillsList = array_map(fn($s) => 
                    "{$s['skill']} ({$s['experience_level']})", 
                    $jobSkills['preferred']
                );
                $preferredSkillsText = "\nPreferred Skills: " . implode(', ', $preferredSkillsList);
            }
            
            // Prepare job description
            $jobText = "Job Title: {$job->title}\n" .
                      "Description: {$job->description}\n" .
                      "Required Skills: {$requiredSkillsText}" .
                      $preferredSkillsText . "\n" .
                      "Experience Level: {$job->experience_level}\n" .
                      "Budget: ₱{$job->budget_min} - ₱{$job->budget_max} ({$job->budget_type})";

            // Prepare gig worker profile with structured skills if available
            $workerSkills = $this->normalizeSkills($gigWorker->skills_with_experience);
            $hourlyRate = $gigWorker->hourly_rate ?? 'Not set';
            $professionalTitle = $gigWorker->professional_title ?? 'Not specified';
            
            // Format worker skills with experience levels
            $workerSkillsText = '';
            if (!empty($workerSkills)) {
                $workerSkillsList = array_map(function($s) {
                    $name = is_array($s) ? ($s['skill'] ?? 'Unknown') : $s;
                    $level = is_array($s) ? ($s['experience_level'] ?? 'intermediate') : 'intermediate';
                    return "{$name} ({$level})";
                }, $workerSkills);
                $workerSkillsText = implode(', ', $workerSkillsList);
            } else {
                $legacySkills = $this->normalizeSkills($gigWorker->skills);
                $workerSkillsText = empty($legacySkills)
                    ? 'No skills listed'
                    : implode(', ', array_column($legacySkills, 'skill'));
            }

            $gigWorkerText = ($audience === 'employer' ? "CANDIDATE PROFILE:\n" : "Your Profile:\n") .
                            "Professional Title: {$professionalTitle}\n" .
                            "Skills: {$workerSkillsText}\n" .
                            "Hourly Rate: ₱{$hourlyRate}\n" .
                            "Bio: " . substr($gigWorker->bio ?? 'No bio provided', 0, 150);

            $forEmployer = $audience === 'employer';
            $systemPrompt = $forEmployer
                ? 'You are an expert AI career advisor for Philippine freelance job matching. You MUST analyze ONLY skills and experience compatibility. SCORING GUIDELINES: Give 80-100 for excellent skill matches (4+ direct skills), 60-79 for good matches (2-3 direct skills), 40-59 for fair matches (1-2 direct skills or many related skills), 20-39 for weak matches (only related/transferable skills), 0-19 for poor matches (minimal relevance). IMPORTANT: Describe the CANDIDATE (gig worker) for an employer. Use third person only: "This candidate has...", "Their experience...", "They lack...". Do NOT use "you" or "your" for the candidate. Use ₱ for currency. Format: "Score: X\nReason: [Detailed 2-3 sentence explanation with specific skill matches, experience alignment, and gaps]"'
                : 'You are an expert AI career advisor for Philippine freelance job matching. You MUST analyze ONLY skills and experience compatibility. SCORING GUIDELINES: Give 80-100 for excellent skill matches (4+ direct skills), 60-79 for good matches (2-3 direct skills), 40-59 for fair matches (1-2 direct skills or many related skills), 20-39 for weak matches (only related/transferable skills), 0-19 for poor matches (minimal relevance). IMPORTANT: Be encouraging yet realistic. Focus on: 1) Count exact skill matches, 2) Identify related/complementary skills, 3) Match experience levels (beginner/intermediate/expert), 4) Note skill gaps with learning potential. Address gig worker as "you/your". Use ₱ for currency. Format: "Score: X\nReason: [Detailed 2-3 sentence explanation with specific skill matches, experience alignment, and growth potential]"';
            $userPrompt = $forEmployer
                ? "Match Analysis - Focus ONLY on skills & experience:\n\n📋 JOB REQUIREMENTS:\n{$jobText}\n\n👤 {$gigWorkerText}\n\nAnalyze the candidate's fit:\n1. EXACT skill matches (list them)\n2. Related/complementary skills the candidate has\n3. Experience level match (beginner/intermediate/expert)\n4. Skill gaps and learning curve\n5. Overall compatibility score (0-100)\n\nBe specific about which skills match and why. Ignore budget, location, ratings."
                : "Match Analysis - Focus ONLY on skills & experience:\n\n📋 JOB REQUIREMENTS:\n{$jobText}\n\n👤 YOUR PROFILE:\n{$gigWorkerText}\n\nAnalyze:\n1. EXACT skill matches (list them)\n2. Related/complementary skills you have\n3. Experience level match (beginner/intermediate/expert)\n4. Skill gaps and learning curve\n5. Overall compatibility score (0-100)\n\nBe specific about which skills match and why. Ignore budget, location, ratings.";

            // Attempt API call with failover logic
            foreach ($this->models as $index => $modelConfig) {
                try {
                    $response = Http::withToken($this->apiKey)
                        ->withOptions([
                            'verify' => $this->certPath
                        ])
                        ->timeout($modelConfig['name'] === 'qwen/qwen3-32b' ? 45 : 30) // Wait longer for larger token outputs
                        ->post($this->baseUrl . '/chat/completions', [
                            'model' => $modelConfig['name'],
                            'messages' => [
                                [
                                    'role' => 'system',
                                    'content' => $systemPrompt
                                ],
                                [
                                    'role' => 'user',
                                    'content' => $userPrompt
                                ]
                            ],
                            'temperature' => $modelConfig['temperature'],
                            'max_completion_tokens' => $modelConfig['max_completion_tokens'],
                            'top_p' => $modelConfig['top_p'],
                            'stream' => false
                        ]);

                    if ($response->successful()) {
                        $responseData = $response->json();
                        
                        if (!isset($responseData['choices'][0]['message']['content'])) {
                            continue; // Try next model on invalid structure
                        }
                        
                        $content = $responseData['choices'][0]['message']['content'];
                        
                        preg_match('/Score:\s*(\d+)/i', $content, $scoreMatch);
                        preg_match('/Reason:\s*(.+?)(?=\n\n|\n*$)/ims', $content, $reasonMatch);

                        if (empty($scoreMatch[1])) {
                             continue; // Try next model if parsing fails
                        }

                        $result = [
                            'score' => min(100, (int) $scoreMatch[1]), // Cap at 100
                            'reason' => trim($reasonMatch[1] ?? 'No explanation provided'),
                            'success' => true,
                            'model_used' => $modelConfig['name']
                        ];

                        Cache::put($cacheKey, $result, now()->addHours(24));
                        return $result;
                    }
                    
                    // Specific status code handling for logging
                    if ($response->status() === 429 || $response->status() === 503) {
                        Log::warning("Model {$modelConfig['name']} rate limited/unavailable. Attempting failover...");
                    }

                } catch (\Exception $e) {
                    Log::error("Model {$modelConfig['name']} failed", ['error' => $e->getMessage()]);
                    // Continue to next model
                }
            }

            // If all models fail, throw exception to trigger fallback
            throw new \Exception('All Groq models failed to return a valid response.');

        } catch (\Exception $e) {
            // #region agent log
            @file_put_contents(base_path('debug-8533e5.log'), json_encode(['sessionId'=>'8533e5','hypothesisId'=>'H1','location'=>'MatchService::getJobMatch catch','message'=>'AI Match Error caught','data'=>['job_id'=>$job->id,'gig_worker_id'=>$gigWorker->id,'error'=>$e->getMessage()],'timestamp'=>time()*1000])."\n", FILE_APPEND | LOCK_EX);
            // #endregion
            Log::error('AI Match Error', [
                'job_id' => $job->id,
                'gig_worker_id' => $gigWorker->id,
                'error' => $e->getMessage()
            ]);

            // Use fallback matching if AI fails
            return $this->getFallbackMatch($job, $gigWorker, $audience);
        }
    }

    /**
     * Get matches for a specific job with AI-powered analysis
     */
    public function getJobMatches(GigJob $job, int $limit = 5, bool $randomize = false): array
    {
        // Limit the number of gig workers to process to prevent timeouts
        $query = User::where('user_type', 'gig_worker')
            ->whereNotNull('skills_with_experience');
            
        if ($randomize) {
            $query->inRandomOrder();
        }

        $gigWorkers = $query->limit(15) // Process max 15 gig workers for AI analysis
            ->get();

        $matches = [];
        $processedCount = 0;
        $maxProcessTime = 20; // Max 20 seconds
        $startTime = microtime(true);
        
        foreach ($gigWorkers as $gigWorker) {
            // Check timeout
            if ((microtime(true) - $startTime) > $maxProcessTime) {
                Log::warning('AI job matching timeout', [
                    'job_id' => $job->id,
                    'processed' => $processedCount
                ]);
                break;
            }
            
            // Use AI matching for accurate insights (employer view: third-person candidate-focused reason)
            $match = $this->getJobMatch($job, $gigWorker, 'employer');
            $processedCount++;
            
            if ($match['success'] && $match['score'] > 0) {
                $matches[] = [
                    'gig_worker' => $gigWorker,
                    'score' => $match['score'],
                    'reason' => $match['reason']
                ];
            }
            
            // Stop early if we have enough excellent matches
            if (count($matches) >= $limit * 2 && $match['score'] >= 70) {
                break;
            }
        }

        // Sort by score descending
        usort($matches, fn($a, $b) => $b['score'] - $a['score']);

        Log::info('AI gig worker matches generated', [
            'job_id' => $job->id,
            'processed_workers' => $processedCount,
            'matches_found' => count($matches),
            'randomized' => $randomize,
            'time_taken' => round(microtime(true) - $startTime, 2) . 's'
        ]);

        // Return top matches
        return array_slice($matches, 0, $limit);
    }

    /**
     * Get recommended jobs for a gig worker with AI-powered matching
     *
     * @param bool $refresh when true, re-read worker from DB and bypass match cache to regenerate insights/scores
     */
    public function getRecommendedJobs(User $gigWorker, int $limit = 5, bool $refresh = false): array
    {
        // When refresh=1, re-load worker from DB so we use latest skills/profile for matching
        if ($refresh) {
            $gigWorker->refresh();
        }

        // Limit the number of jobs to process to prevent timeouts
        // Include jobs that have skills in either required_skills or skills_requirements
        $query = GigJob::with(['employer'])
            ->where('status', 'open')
            ->where(function ($q) {
                $q->whereNotNull('required_skills')
                    ->orWhereNotNull('skills_requirements');
            });

        if ($refresh) {
            $query->inRandomOrder(); // optional: vary job order on refresh
        } else {
            $query->latest();
        }

        $jobs = $query->limit(10) // Process max 10 jobs for AI analysis
            ->get();

        $matches = [];
        $processedCount = 0;
        $maxProcessTime = 20; // Max 20 seconds for all processing
        $startTime = microtime(true);
        
        foreach ($jobs as $job) {
            // Check if we're running out of time
            if ((microtime(true) - $startTime) > $maxProcessTime) {
                Log::warning('AI matching timeout, using processed results', [
                    'processed' => $processedCount,
                    'total_jobs' => $jobs->count()
                ]);
                break;
            }
            
            // Use AI matching; when refresh=1 bypass cache to regenerate insight and score
            $match = $this->getJobMatch($job, $gigWorker, 'worker', $refresh);
            $processedCount++;
            
            if ($match['success'] && $match['score'] > 0) {
                $matches[] = [
                    'job' => $job,
                    'score' => $match['score'],
                    'reason' => $match['reason']
                ];
            }
            
            // Stop early if we have enough excellent matches
            if (count($matches) >= $limit * 2 && $match['score'] >= 70) {
                break;
            }
        }

        // Sort by score descending
        usort($matches, fn($a, $b) => $b['score'] - $a['score']);

        Log::info('AI job recommendations generated', [
            'gig_worker_id' => $gigWorker->id,
            'processed_jobs' => $processedCount,
            'matches_found' => count($matches),
            'refresh' => $refresh,
            'time_taken' => round(microtime(true) - $startTime, 2) . 's'
        ]);

        // Return top matches
        return array_slice($matches, 0, $limit);
    }

    /**
     * Normalize skills data to ensure it's always an array.
     * Handles: null, JSON strings, plain string arrays, indexed arrays,
     * and associative arrays (['skill'=>'...', 'experience_level'=>'...']).
     */
    private function normalizeSkills($skills): array
    {
        if (is_null($skills)) {
            return [];
        }

        if (is_string($skills)) {
            $decoded = json_decode($skills, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $skills = $decoded;
            } else {
                // Plain string — treat as a single skill name
                return [['skill' => trim($skills), 'experience_level' => 'intermediate']];
            }
        }

        if (!is_array($skills)) {
            return [];
        }

        // Normalise each element to a consistent structure
        $result = [];
        foreach ($skills as $skill) {
            if (is_string($skill)) {
                $name = trim($skill);
                if ($name !== '') {
                    $result[] = ['skill' => $name, 'experience_level' => 'intermediate'];
                }
            } elseif (is_array($skill)) {
                // Associative: ['skill' => 'PHP', 'experience_level' => 'intermediate']
                // Indexed:     ['PHP', 'intermediate']
                $name  = trim((string) ($skill['skill'] ?? $skill[0] ?? ''));
                $level = $skill['experience_level'] ?? $skill[1] ?? 'intermediate';
                if ($name !== '') {
                    $result[] = ['skill' => $name, 'experience_level' => (string) $level];
                }
            }
        }

        return $result;
    }
} 