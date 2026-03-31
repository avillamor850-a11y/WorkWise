<?php

namespace App\Services;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use App\Models\GigJob;
use App\Models\User;
use App\Models\Bid;
use Illuminate\Support\Collection;

class AIJobMatchingService
{
    protected AIService $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }
    /**
     * Find matching gig workers for a job using AI-like algorithm
     */
    public function findMatchingFreelancers(GigJob $job, int $limit = 10): Collection
    {
        $gigWorkers = User::where('user_type', 'gig_worker')
            ->where('profile_completed', true)
            ->whereNotNull('skills_with_experience')
            ->with(['receivedReviews', 'gigWorkerProjects'])
            ->limit(500)
            ->get();

        $maxScoringSec = 25;
        $scoringStart = microtime(true);
        $scored = [];
        foreach ($gigWorkers as $gigWorker) {
            if (microtime(true) - $scoringStart > $maxScoringSec) {
                break;
            }
            $score = $this->calculateMatchScore($job, $gigWorker);
            $scored[] = [
                'gig_worker' => $gigWorker,
                'match_score' => $score,
                'match_reasons' => $this->getMatchReasons($job, $gigWorker, $score)
            ];
        }

        return collect($scored)
        ->filter(fn($match) => $match['match_score'] > 0.1) // Show more matches (10% threshold)
        ->sortByDesc('match_score')
        ->take($limit)
        ->values();
    }

    /**
     * Find matching jobs for a gig worker
     */
    public function findMatchingJobs(User $gigWorker, int $limit = 20): Collection
    {
        $jobs = GigJob::with(['employer']) // Load employer relationship
            ->where('status', 'open')
            ->where('employer_id', '!=', $gigWorker->id)
            ->whereDoesntHave('bids', function($query) use ($gigWorker) {
                $query->where('freelancer_id', $gigWorker->id);
            })
            ->get();

        return $jobs->map(function ($job) use ($gigWorker) {
            $score = $this->calculateMatchScore($job, $gigWorker);
            return [
                'job' => $job,
                'match_score' => $score,
                'match_reasons' => $this->getMatchReasons($job, $gigWorker, $score),
                'competition_level' => $this->calculateCompetitionLevel($job)
            ];
        })
        ->filter(fn($match) => $match['match_score'] > 0.1) // Show more matches (10% threshold)
        ->sortByDesc('match_score')
        ->take($limit)
        ->values();
    }

    /**
     * Extract skills from skills_with_experience with experience weighting
     */
    private function getFreelancerSkills(User $gigWorker): array
    {
        $raw = $gigWorker->skills_with_experience;
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($raw) || empty($raw)) {
            return [];
        }

        return array_map(function ($item) {
            $item = is_array($item) ? $item : ['skill' => (string) $item, 'experience_level' => 'intermediate'];
            $skill = strtolower(trim($item['skill'] ?? ''));
            $level = $item['experience_level'] ?? 'intermediate';
            return [
                'skill' => $skill,
                'experience_level' => $level,
                'weight' => match ($level) {
                    'beginner' => 1.0,
                    'intermediate' => 1.5,
                    'expert' => 2.0,
                    default => 1.0
                }
            ];
        }, $raw);
    }

    /**
     * Calculate match score between job and gig worker
     */
    private function calculateMatchScore(GigJob $job, User $gigWorker): float
    {
        $score = 0.0;
        $maxScore = 1.0;

        // Get gig worker skills with experience levels
        $gigWorkerSkillsWithExp = $this->getFreelancerSkills($gigWorker);

        // Check if job has enhanced skills_requirements (new format)
        if (!empty($job->skills_requirements)) {
            // Use enhanced matching with per-skill experience levels
            $skillsScore = $this->calculateEnhancedSkillsMatch($job->skills_requirements, $gigWorkerSkillsWithExp);
            $score += $skillsScore * 0.70; // Increased weight for skills
        } else {
            // Fallback to legacy matching for backward compatibility
            $skillsScore = $this->calculateSkillsMatchWithExperience(
                $job->required_skills, 
                $gigWorkerSkillsWithExp
            );
            $score += $skillsScore * 0.70; // Increased weight for skills
        }

        // Reputation / Rating Match (20% weight) - Using historical ratings
        $reputationScore = $this->calculateReputationScore($gigWorker);
        $score += $reputationScore * 0.20;

        // Experience level matching (10% weight) - General experience check
        $experienceScore = $this->calculateExperienceMatchFromSkills($job->experience_level, $gigWorkerSkillsWithExp);
        $score += $experienceScore * 0.10;

        return min($score, $maxScore);
    }

    /**
     * Calculate enhanced skills match with per-skill experience requirements
     * This method matches jobs_skills_requirements with gig_worker's skills_with_experience
     */
    private function calculateEnhancedSkillsMatch(array $skillsRequirements, array $gigWorkerSkillsWithExp): float
    {
        if (empty($skillsRequirements) || empty($gigWorkerSkillsWithExp)) {
            return 0.0;
        }

        $score = 0.0;
        $totalWeight = 0.0;

        // Match each required skill
        foreach ($skillsRequirements as $requirement) {
            $requiredSkill = strtolower(trim($requirement['skill'] ?? ''));
            $requiredLevel = $requirement['experience_level'] ?? 'intermediate';
            $importance = $requirement['importance'] ?? 'required';

            if (empty($requiredSkill)) {
                continue;
            }

            // Find matching skill in gig_worker's profile
            $matchedSkill = null;
            foreach ($gigWorkerSkillsWithExp as $fSkill) {
                if (strtolower(trim($fSkill['skill'])) === $requiredSkill) {
                    $matchedSkill = $fSkill;
                    break;
                }
            }

            // Calculate weight based on importance
            $weight = $importance === 'required' ? 2.0 : 1.0;

            if ($matchedSkill) {
                // Skill found - compare experience levels
                $levelMatch = $this->compareExperienceLevels(
                    $requiredLevel,
                    $matchedSkill['experience_level']
                );
                $score += $levelMatch * $weight;
            } else {
                // Skill not found
                if ($importance === 'required') {
                    // Significant penalty for missing required skill
                    $score += 0.0; // Missing required skill = 0 points
                }
                // No penalty for missing preferred skills - just no points
            }

            $totalWeight += $weight;
        }

        // Bonus for nice-to-have skills (if provided separately)
        $niceToHaveBonus = 0.0;
        $niceToHaveCount = 0;
        if (!empty($requirement['nice_to_have_skills'])) {
            foreach ($requirement['nice_to_have_skills'] as $niceSkill) {
                $skillName = strtolower(trim($niceSkill));
                foreach ($gigWorkerSkillsWithExp as $fSkill) {
                    if (strtolower(trim($fSkill['skill'])) === $skillName) {
                        $niceToHaveBonus += 0.1;
                        $niceToHaveCount++;
                        break;
                    }
                }
            }
        }

        $normalizedScore = $totalWeight > 0 ? ($score / $totalWeight) : 0;
        
        // Add bonus capped at 20%
        $finalScore = min(1.0, $normalizedScore + min(0.2, $niceToHaveBonus));

        return $finalScore;
    }

    /**
     * Compare experience levels and return a match score
     * Returns: 1.0 (perfect match), 0.6 (one level below), 0.2 (two or more levels below)
     */
    private function compareExperienceLevels(string $required, string $actual): float
    {
        $levels = ['beginner' => 1, 'intermediate' => 2, 'expert' => 3];

        $requiredLevel = $levels[$required] ?? 2;
        $actualLevel = $levels[$actual] ?? 2;

        if ($actualLevel >= $requiredLevel) {
            // Gig worker meets or exceeds requirement
            return 1.0;
        } elseif ($actualLevel === $requiredLevel - 1) {
            // One level below (still acceptable)
            return 0.6;
        } else {
            // Two or more levels below
            return 0.2;
        }
    }

    /**
     * Calculate skills matching score WITH experience level weighting
     */
    private function calculateSkillsMatchWithExperience(array $requiredSkills, array $gigWorkerSkillsWithExp): float
    {
        if (empty($requiredSkills) || empty($gigWorkerSkillsWithExp)) {
            return 0.0;
        }

        // Normalize required skills
        $requiredSkills = array_map(function($skill) {
            return strtolower(trim($skill));
        }, $requiredSkills);

        // Extract just the skill names from gig worker skills
        $gigWorkerSkillNames = array_column($gigWorkerSkillsWithExp, 'skill');

        // Direct matches with experience weighting
        $directMatchScore = 0;
        $directMatchCount = 0;
        
        foreach ($requiredSkills as $required) {
            foreach ($gigWorkerSkillsWithExp as $fSkill) {
                if ($fSkill['skill'] === $required) {
                    // Apply experience level weight
                    $directMatchScore += $fSkill['weight'];
                    $directMatchCount++;
                    break;
                }
            }
        }

        // Normalize direct match score
        $maxPossibleScore = count($requiredSkills) * 2.0; // Max weight is 2.0 for expert
        $normalizedDirectScore = $directMatchCount > 0 ? ($directMatchScore / $maxPossibleScore) : 0;

        // Partial matches (for similar skills) with reduced weight
        $partialMatches = 0;
        $partialScore = 0;
        
        foreach ($requiredSkills as $required) {
            $foundDirect = false;
            foreach ($gigWorkerSkillsWithExp as $fSkill) {
                if ($fSkill['skill'] === $required) {
                    $foundDirect = true;
                    break;
                }
            }
            
            if (!$foundDirect) {
                foreach ($gigWorkerSkillsWithExp as $fSkill) {
                    if (str_contains($fSkill['skill'], $required) || str_contains($required, $fSkill['skill'])) {
                        $partialMatches++;
                        $partialScore += $fSkill['weight'] * 0.5; // Partial matches worth 50%
                        break;
                    }
                }
            }
        }

        $normalizedPartialScore = $partialMatches > 0 ? ($partialScore / $maxPossibleScore) : 0;
        
        // Combine scores
        $totalMatchScore = $normalizedDirectScore + $normalizedPartialScore;

        // Bonus for having more skills than required (up to 20%)
        $extraSkillsBonus = min(0.2, (count($gigWorkerSkillsWithExp) - count($requiredSkills)) * 0.02);

        return min(1.0, $totalMatchScore + $extraSkillsBonus);
    }

    /**
     * Calculate skills matching score (legacy method for backward compatibility)
     */
    private function calculateSkillsMatch(array $requiredSkills, array $gigWorkerSkills): float
    {
        if (empty($requiredSkills) || empty($gigWorkerSkills)) {
            return 0.0;
        }

        // Normalize skills for better matching
        $requiredSkills = array_map(function($skill) {
            return strtolower(trim($skill));
        }, $requiredSkills);

        $gigWorkerSkills = array_map(function($skill) {
            return strtolower(trim($skill));
        }, $gigWorkerSkills);

        // Direct matches
        $directMatches = array_intersect($requiredSkills, $gigWorkerSkills);
        $directMatchScore = count($directMatches) / count($requiredSkills);

        // Partial matches (for similar skills)
        $partialMatches = 0;
        foreach ($requiredSkills as $required) {
            if (!in_array($required, $directMatches)) {
                foreach ($gigWorkerSkills as $gigWorker) {
                    if (str_contains($gigWorker, $required) || str_contains($required, $gigWorker)) {
                        $partialMatches++;
                        break;
                    }
                }
            }
        }

        $partialMatchScore = ($partialMatches * 0.5) / count($requiredSkills);
        $totalMatchScore = $directMatchScore + $partialMatchScore;

        // Bonus for having more skills than required
        $extraSkillsBonus = min(0.2, (count($gigWorkerSkills) - count($requiredSkills)) * 0.02);

        return min(1.0, $totalMatchScore + $extraSkillsBonus);
    }

    /**
     * Calculate experience match from skills_with_experience array
     */
    private function calculateExperienceMatchFromSkills(string $requiredLevel, array $gigWorkerSkillsWithExp): float
    {
        if (empty($gigWorkerSkillsWithExp)) {
            return 0.5; // Neutral score if no skills provided
        }

        $levelMap = ['beginner' => 1, 'intermediate' => 2, 'expert' => 3];
        $required = $levelMap[$requiredLevel] ?? 2;

        // Calculate average experience level from all skills
        $totalLevel = 0;
        foreach ($gigWorkerSkillsWithExp as $skill) {
            $totalLevel += $levelMap[$skill['experience_level']] ?? 2;
        }
        $avgLevel = $totalLevel / count($gigWorkerSkillsWithExp);

        // Perfect match = 1.0, one level off = 0.7, two levels off = 0.3
        $difference = abs($required - $avgLevel);
        
        if ($difference < 0.5) {
            return 1.0; // Perfect match
        } elseif ($difference < 1.5) {
            return 0.7; // Close match
        } else {
            return 0.3; // Distant match
        }
    }

    /**
     * Calculate experience level match (legacy method for backward compatibility)
     */
    private function calculateExperienceMatch(string $requiredLevel, User $gigWorker): float
    {
        $levelMap = ['beginner' => 1, 'intermediate' => 2, 'expert' => 3];
        $required = $levelMap[$requiredLevel] ?? 2;

        // Use gig worker's set experience level if available, otherwise estimate
        if ($gigWorker->experience_level) {
            $gigWorkerLevel = $levelMap[$gigWorker->experience_level] ?? 2;
        } else {
            // Fallback: Estimate gig worker level based on completed projects and ratings
            $completedProjects = $gigWorker->gigWorkerProjects()->where('status', 'completed')->count();
            $avgRating = $gigWorker->receivedReviews()->avg('rating') ?? 3;

            $gigWorkerLevel = 1; // Default beginner
            if ($completedProjects >= 10 && $avgRating >= 4.5) {
                $gigWorkerLevel = 3; // Expert
            } elseif ($completedProjects >= 3 && $avgRating >= 4.0) {
                $gigWorkerLevel = 2; // Intermediate
            }
        }

        // Perfect match = 1.0, one level off = 0.7, two levels off = 0.3
        $difference = abs($required - $gigWorkerLevel);
        return match($difference) {
            0 => 1.0,
            1 => 0.7,
            default => 0.3
        };
    }

    /**
     * Calculate budget compatibility
     */
    private function calculateBudgetMatch(GigJob $job, User $gigWorker): float
    {
        $gigWorkerRate = $gigWorker->hourly_rate ?? 25; // Default rate
        $jobBudgetMin = $job->budget_min ?? 0;
        $jobBudgetMax = $job->budget_max ?? 1000;

        if ($job->budget_type === 'hourly') {
            // For hourly jobs, compare rates directly
            if ($gigWorkerRate >= $jobBudgetMin && $gigWorkerRate <= $jobBudgetMax) {
                return 1.0;
            } elseif ($gigWorkerRate < $jobBudgetMin) {
                return max(0.0, 1.0 - (($jobBudgetMin - $gigWorkerRate) / $jobBudgetMin));
            } else {
                return max(0.0, 1.0 - (($gigWorkerRate - $jobBudgetMax) / $jobBudgetMax));
            }
        } else {
            // For fixed jobs, estimate based on duration and hourly rate
            $estimatedHours = ($job->estimated_duration_days ?? 7) * 6; // 6 hours per day
            $gigWorkerEstimate = $gigWorkerRate * $estimatedHours;
            
            if ($gigWorkerEstimate >= $jobBudgetMin && $gigWorkerEstimate <= $jobBudgetMax) {
                return 1.0;
            } else {
                $midpoint = ($jobBudgetMin + $jobBudgetMax) / 2;
                $difference = abs($gigWorkerEstimate - $midpoint);
                return max(0.0, 1.0 - ($difference / $midpoint));
            }
        }
    }

    /**
     * Calculate location match (Lapu-Lapu City focus)
     */
    private function calculateLocationMatch(GigJob $job, User $gigWorker): float
    {
        // Both in Lapu-Lapu City = perfect match
        if ($gigWorker->barangay && $job->location) {
            return 1.0; // Both local
        }
        
        // Remote work preference
        if ($job->is_remote) {
            return 0.8; // Good for remote
        }
        
        return 0.5; // Neutral
    }

    /**
     * Calculate gig worker reputation score
     */
    private function calculateReputationScore(User $gigWorker): float
    {
        $avgRating = $gigWorker->receivedReviews()->avg('rating') ?? 3.0;
        $reviewCount = $gigWorker->receivedReviews()->count();
        $completedProjects = $gigWorker->gigWorkerProjects()->where('status', 'completed')->count();

        // Base score from rating
        $ratingScore = ($avgRating - 1) / 4; // Convert 1-5 to 0-1

        // Bonus for having reviews and completed projects
        $experienceBonus = min(0.3, ($reviewCount * 0.05) + ($completedProjects * 0.02));

        return min(1.0, $ratingScore + $experienceBonus);
    }

    /**
     * Calculate availability score
     */
    private function calculateAvailabilityScore(User $gigWorker): float
    {
        $activeProjects = $gigWorker->gigWorkerProjects()->where('status', 'active')->count();
        
        // Less active projects = more available
        return match(true) {
            $activeProjects === 0 => 1.0,
            $activeProjects <= 2 => 0.8,
            $activeProjects <= 4 => 0.5,
            default => 0.2
        };
    }

    /**
     * Calculate competition level for a job
     */
    private function calculateCompetitionLevel(GigJob $job): string
    {
        $bidCount = $job->bids()->count();
        
        return match(true) {
            $bidCount === 0 => 'No competition',
            $bidCount <= 3 => 'Low competition',
            $bidCount <= 8 => 'Medium competition',
            $bidCount <= 15 => 'High competition',
            default => 'Very high competition'
        };
    }

    /**
     * Get human-readable match reasons with AI enhancement
     */
    private function getMatchReasons(GigJob $job, User $gigWorker, float $score): array
    {
        $reasons = [];

        // Try to get AI-powered explanation first
        if ($this->aiService->isAvailable()) {
            $aiExplanation = $this->getAIExplanation($job, $gigWorker, $score);
            if ($aiExplanation) {
                $reasons[] = "AI Analysis: " . $aiExplanation;
            }
        }

        // Get gig worker skills with experience
        $gigWorkerSkillsWithExp = $this->getFreelancerSkills($gigWorker);
        $gigWorkerSkillNames = array_column($gigWorkerSkillsWithExp, 'skill');

        // Skills match with details (Primary factor)
        $skillsMatch = $this->calculateSkillsMatchWithExperience($job->required_skills, $gigWorkerSkillsWithExp);
        $requiredSkills = array_map('strtolower', $job->required_skills);
        $matchingSkills = array_intersect($requiredSkills, $gigWorkerSkillNames);

        if ($skillsMatch > 0.8) {
            $reasons[] = "✅ Excellent skills match (" . count($matchingSkills) . "/" . count($requiredSkills) . " skills)";
        } elseif ($skillsMatch > 0.5) {
            $reasons[] = "✅ Good skills match (" . count($matchingSkills) . "/" . count($requiredSkills) . " skills)";
        } elseif ($skillsMatch > 0.2) {
            $reasons[] = "⚠️ Partial skills match (" . count($matchingSkills) . "/" . count($requiredSkills) . " skills)";
        } elseif ($skillsMatch > 0) {
            $reasons[] = "⚠️ Some skills match (" . count($matchingSkills) . "/" . count($requiredSkills) . " skills)";
        } else {
            $reasons[] = "❌ No direct skills match - consider learning: " . implode(', ', array_slice($job->required_skills, 0, 3));
        }

        // Experience level details (Secondary factor) - from skills_with_experience
        $experienceMatch = $this->calculateExperienceMatchFromSkills($job->experience_level, $gigWorkerSkillsWithExp);
        
        if (count($gigWorkerSkillsWithExp) > 0) {
            // Calculate average experience level
            $levelMap = ['beginner' => 1, 'intermediate' => 2, 'expert' => 3];
            $avgLevel = array_sum(array_column($gigWorkerSkillsWithExp, 'weight')) / count($gigWorkerSkillsWithExp);
            $avgLevelName = match(true) {
                $avgLevel >= 1.75 => 'expert',
                $avgLevel >= 1.25 => 'intermediate',
                default => 'beginner'
            };

            if ($experienceMatch > 0.8) {
                $reasons[] = "🎯 Perfect experience level match ({$avgLevelName} = {$job->experience_level})";
            } elseif ($experienceMatch > 0.5) {
                $reasons[] = "🎯 Good experience level match ({$avgLevelName} ≈ {$job->experience_level})";
            } else {
                $reasons[] = "📊 Average experience level: {$avgLevelName} (required: {$job->experience_level})";
            }
            
            // Show skill breakdown
            $expertCount = count(array_filter($gigWorkerSkillsWithExp, fn($s) => $s['experience_level'] === 'expert'));
            $intermediateCount = count(array_filter($gigWorkerSkillsWithExp, fn($s) => $s['experience_level'] === 'intermediate'));
            $beginnerCount = count(array_filter($gigWorkerSkillsWithExp, fn($s) => $s['experience_level'] === 'beginner'));
            
            if ($expertCount > 0) {
                $reasons[] = "⭐ {$expertCount} expert-level " . ($expertCount === 1 ? 'skill' : 'skills');
            }
        } else {
            $reasons[] = "📋 No skills with experience levels in profile";
        }

        // Add success prediction if AI is available
        if ($this->aiService->isAvailable()) {
            $prediction = $this->getAISuccessPrediction($job, $gigWorker);
            if ($prediction && $prediction['success']) {
                $probability = $prediction['prediction']['probability'];
                $reasons[] = "🔮 AI Success Prediction: {$probability}% chance of successful project completion";
            }
        }

        // If no reasons found, provide basic info
        if (empty($reasons)) {
            $reasons[] = "📝 Limited match - consider updating your skills and experience level";
        }

        return $reasons;
    }

    /**
     * Get AI-powered explanation for match
     */
    private function getAIExplanation(GigJob $job, User $gigWorker, float $score): ?string
    {
        $jobData = [
            'id' => $job->id,
            'title' => $job->title,
            'description' => $job->description,
            'required_skills' => $job->required_skills,
            'experience_level' => $job->experience_level,
            'budget_range' => $job->budget_min && $job->budget_max ?
                "₱{$job->budget_min} - ₱{$job->budget_max}" : 'Budget not specified'
        ];

        // Use skills_with_experience for more accurate matching
        $gigWorkerData = [
            'id' => $gigWorker->id,
            'name' => $gigWorker->first_name . ' ' . $gigWorker->last_name,
            'skills_with_experience' => $gigWorker->skills_with_experience ?? [],
            'bio' => $gigWorker->bio
        ];

        return $this->aiService->generateMatchExplanation($jobData, $gigWorkerData, $score);
    }

    /**
     * Get AI-powered success prediction
     */
    private function getAISuccessPrediction(GigJob $job, User $gigWorker): ?array
    {
        $jobData = [
            'id' => $job->id,
            'title' => $job->title,
            'required_skills' => $job->required_skills,
            'experience_level' => $job->experience_level,
            'budget_range' => $job->budget_min && $job->budget_max ?
                "₱{$job->budget_min} - ₱{$job->budget_max}" : 'Budget not specified'
        ];

        // Use skills_with_experience for more accurate prediction
        $gigWorkerData = [
            'id' => $gigWorker->id,
            'name' => $gigWorker->first_name . ' ' . $gigWorker->last_name,
            'skills_with_experience' => $gigWorker->skills_with_experience ?? []
        ];

        return $this->aiService->generateSuccessPrediction($jobData, $gigWorkerData);
    }

    /**
     * Get AI-powered job recommendations with explanations
     */
    public function getJobRecommendations(User $gigWorker): array
    {
        $matches = $this->findMatchingJobs($gigWorker, 10);
        
        return [
            'recommended_jobs' => $matches->toArray(),
            'insights' => [
                'total_matches' => $matches->count(),
                'avg_match_score' => $matches->avg('match_score'),
                'top_skills_in_demand' => $this->getTopSkillsInDemand(),
                'suggested_improvements' => $this->getSuggestedImprovements($gigWorker)
            ]
        ];
    }

    /**
     * Get top skills currently in demand
     */
    private function getTopSkillsInDemand(): array
    {
        $jobs = GigJob::where('status', 'open')->get();
        $skillCounts = [];

        foreach ($jobs as $job) {
            foreach ($job->required_skills as $skill) {
                $skillCounts[strtolower($skill)] = ($skillCounts[strtolower($skill)] ?? 0) + 1;
            }
        }

        arsort($skillCounts);
        return array_slice(array_keys($skillCounts), 0, 10);
    }

    /**
     * Get suggested improvements for gig worker
     */
    private function getSuggestedImprovements(User $gigWorker): array
    {
        $suggestions = [];

        $skillsCount = is_array($gigWorker->skills_with_experience) ? count($gigWorker->skills_with_experience) : 0;
        
        if ($skillsCount < 3) {
            $suggestions[] = "Add more skills with experience levels to your profile to increase job matches";
        }

        if (!$gigWorker->bio || strlen($gigWorker->bio) < 100) {
            $suggestions[] = "Write a detailed bio to attract more clients";
        }

        if (!$gigWorker->hourly_rate) {
            $suggestions[] = "Set your hourly rate to appear in budget-filtered searches";
        }

        $reviewCount = $gigWorker->receivedReviews()->count();
        if ($reviewCount < 5) {
            $suggestions[] = "Complete more projects to build your reputation";
        }

        // Suggest adding expert-level skills
        if ($skillsCount > 0) {
            $expertCount = count(array_filter($gigWorker->skills_with_experience, fn($s) => $s['experience_level'] === 'expert'));
            if ($expertCount === 0) {
                $suggestions[] = "Upgrade some of your skills to expert level as you gain more experience";
            }
        }

        return $suggestions;
    }

    /**
     * Get AI-powered skill recommendations for gig worker
     */
    public function getAISkillRecommendations(User $gigWorker): array
    {
        if (!$this->aiService->isAvailable()) {
            return [
                'success' => false,
                'recommendations' => [],
                'error' => 'AI service not available'
            ];
        }

        $gigWorkerData = [
            'id' => $gigWorker->id,
            'name' => $gigWorker->first_name . ' ' . $gigWorker->last_name,
            'skills_with_experience' => $gigWorker->skills_with_experience ?? [],
            'bio' => $gigWorker->bio
        ];

        $marketTrends = [
            'high_demand' => $this->getTopSkillsInDemand(),
            'emerging' => [
                'AI/Machine Learning',
                'Blockchain Development',
                'Mobile App Security',
                'Voice User Interface',
                'AR/VR Development'
            ]
        ];

        return $this->aiService->generateSkillRecommendations($gigWorkerData, $marketTrends);
    }

    /**
     * Get AI-powered job recommendations with enhanced insights
     */
    public function getAIJobRecommendations(User $gigWorker): array
    {
        $matches = $this->findMatchingJobs($gigWorker, 10);

        $enhancedMatches = $matches->map(function ($match) use ($gigWorker) {
            // Add AI explanation if available
            if ($this->aiService->isAvailable()) {
                $aiExplanation = $this->getAIExplanation($match['job'], $gigWorker, $match['match_score']);
                $match['ai_explanation'] = $aiExplanation;

                $prediction = $this->getAISuccessPrediction($match['job'], $gigWorker);
                $match['success_prediction'] = $prediction;
            }

            return $match;
        });

        return [
            'recommended_jobs' => $enhancedMatches->toArray(),
            'insights' => [
                'total_matches' => $matches->count(),
                'avg_match_score' => $matches->avg('match_score'),
                'top_skills_in_demand' => $this->getTopSkillsInDemand(),
                'suggested_improvements' => $this->getSuggestedImprovements($gigWorker),
                'ai_service_available' => $this->aiService->isAvailable(),
                'ai_service_config' => $this->aiService->getConfig()
            ]
        ];
    }

    /**
     * Get AI-powered gig worker recommendations for a job
     */
    public function getAIMatchingFreelancers(GigJob $job): array
    {
        $matches = $this->findMatchingFreelancers($job, 20);

        $enhancedMatches = $matches->map(function ($match) use ($job) {
            // Add AI explanation if available
            if ($this->aiService->isAvailable()) {
                $aiExplanation = $this->getAIExplanation($job, $match['gig_worker'], $match['match_score']);
                $match['ai_explanation'] = $aiExplanation;

                $prediction = $this->getAISuccessPrediction($job, $match['gig_worker']);
                $match['success_prediction'] = $prediction;
            }

            return $match;
        });

        return [
            'matches' => $enhancedMatches->toArray(),
            'total_matches' => $matches->count(),
            'job' => $job,
            'ai_service_available' => $this->aiService->isAvailable(),
            'ai_service_config' => $this->aiService->getConfig()
        ];
    }

    protected function taxonomy(): array
    {
        return Cache::rememberForever('full_taxonomy', function () {
            $path = base_path('full_freelance_services_taxonomy.json');
            $json = file_exists($path) ? file_get_contents($path) : '{}';
            $data = json_decode($json, true) ?: [];
            return $data;
        });
    }

    protected function flattenTaxonomy(): array
    {
        $data = $this->taxonomy();
        $skills = [];
        $categories = [];
        foreach (($data['services'] ?? []) as $service) {
            foreach (($service['categories'] ?? []) as $cat) {
                $categories[] = [
                    'name' => $cat['name'] ?? '',
                    'skills' => $cat['skills'] ?? [],
                ];
                foreach (($cat['skills'] ?? []) as $s) {
                    $skills[$s] = true;
                }
            }
        }
        return [
            'skills' => array_keys($skills),
            'categories' => $categories,
        ];
    }

    protected function synonyms(): array
    {
        return [
            'react js' => 'react',
            'react.js' => 'react',
            'js' => 'javascript',
            'node' => 'node.js',
            'adobe premiere' => 'adobe premiere pro',
            'davinci' => 'davinci resolve',
            'ux' => 'ui/ux',
            'ui' => 'ui/ux',
            'ml' => 'machine learning',
            'ai' => 'machine learning',
            'unity3d' => 'unity',
            'c sharp' => 'c#',
            'c plus plus' => 'c++',
            'frontend' => 'web development',
            'backend' => 'web development',
            'laravel php' => 'laravel',
        ];
    }

    protected function categorySynonyms(): array
    {
        return [
            'graphic designer' => 'Graphic Design',
            'logo designer' => 'Logo Design & Branding',
            'ui designer' => 'UI/UX Design',
            'ux designer' => 'UI/UX Design',
            'ui/ux designer' => 'UI/UX Design',
            'web designer' => 'Web Design',
            'video editor' => 'Video Editing',
            '3d modeler' => '3D Modeling',
            'frontend developer' => 'Web Development',
            'backend developer' => 'Web Development',
            'full stack developer' => 'Web Development',
            'mobile developer' => 'Mobile App Development',
            'react native developer' => 'Mobile App Development',
            'flutter developer' => 'Mobile App Development',
            'unity developer' => 'Game Development',
            'software developer' => 'Software Development',
            'api developer' => 'API Integration & Automation',
            'database administrator' => 'Database Management',
            'cybersecurity analyst' => 'Cybersecurity',
            'ai engineer' => 'AI & Machine Learning',
            'seo specialist' => 'SEO',
            'social media manager' => 'Social Media Marketing',
            'content writer' => 'Article & Blog Writing',
            'technical writer' => 'Technical Writing',
            'translator' => 'Translation',
            'photographer' => 'Photography',
            'project manager' => 'Project Management',
            'accountant' => 'Accounting & Bookkeeping',
            'legal consultant' => 'Legal Consulting',
            'data analyst' => 'Data Analysis',
            'data scientist' => 'Machine Learning',
            'shopify developer' => 'E-commerce Development',
            'woocommerce developer' => 'E-commerce Development',
            'cad designer' => 'CAD Design',
            'mechanical engineer' => 'Mechanical Engineering',
            'electrical engineer' => 'Electrical Engineering',
            'civil engineer' => 'Civil Engineering',
        ];
    }

    protected function normalize(string $text): string
    {
        $t = Str::lower($text);
        $t = preg_replace('/[^a-z0-9+.# ]/i', ' ', $t);
        $t = preg_replace('/\s+/', ' ', $t);
        return trim($t);
    }

    protected function tokenize(string $text): array
    {
        return array_values(array_filter(explode(' ', $this->normalize($text))));
    }

    protected function rootify(string $word): string
    {
        $w = $word;
        $rules = [
            ['ers', 3], ['er', 2], ['ors', 3], ['or', 2],
            ['ing', 3], ['ments', 5], ['ment', 4], ['ions', 4], ['ion', 3],
            ['ists', 4], ['ist', 3], ['als', 3], ['al', 2], ['s', 1],
        ];
        foreach ($rules as [$end, $cut]) {
            if (Str::endsWith($w, $end) && Str::length($w) > $cut) {
                return Str::substr($w, 0, Str::length($w) - $cut);
            }
        }
        return $w;
    }

    protected function matchCategories(string $text, array $categoryIndex): array
    {
        $textNorm = $this->normalize($text);
        $tokensRoot = array_map(fn ($t) => $this->rootify($t), $this->tokenize($text));
        $matched = [];

        foreach ($categoryIndex as $cat) {
            $catNorm = $this->normalize($cat['name']);
            $catTokensRoot = array_map(fn ($t) => $this->rootify($t), explode(' ', $catNorm));

            if (Str::contains($textNorm, $catNorm)) {
                $matched[$cat['name']] = true;
                continue;
            }

            $overlap = count(array_intersect($catTokensRoot, $tokensRoot));
            $threshold = min(2, count($catTokensRoot));
            if ($overlap >= $threshold) {
                $matched[$cat['name']] = true;
            }
        }

        foreach ($this->categorySynonyms() as $alias => $catName) {
            if (Str::contains($textNorm, $this->normalize($alias))) {
                $matched[$catName] = true;
            }
        }

        return array_keys($matched);
    }

    public function recommend(string $title, string $description, array $exclude = []): array
    {
        $flat = $this->flattenTaxonomy();
        $categories = $flat['categories'];
        $allSkills = $flat['skills'];
        $excludeSet = collect($exclude)->map(fn ($s) => $this->normalize($s))->flip();

        $text = trim($title . ' ' . $description);
        $textNorm = $this->normalize($text);
        $tokens = $this->tokenize($text);

        // Category matches (high-priority skills)
        $matchedCategories = $this->matchCategories($text, $categories);
        $scored = [];
        foreach ($matchedCategories as $catName) {
            $cat = collect($categories)->first(fn ($c) => $c['name'] === $catName);
            if (!$cat) continue;
            foreach (($cat['skills'] ?? []) as $s) {
                if (!$excludeSet->has($this->normalize($s))) {
                    $scored[$s] = max($scored[$s] ?? 0, 5);
                }
            }
        }

        // Direct skill matching
        foreach ($allSkills as $s) {
            if ($excludeSet->has($this->normalize($s))) continue;
            $sNorm = $this->normalize($s);
            $score = 0;
            if (Str::contains($textNorm, $sNorm)) $score += 3;
            $sTokens = explode(' ', $sNorm);
            $tokenHits = count(array_intersect($sTokens, $tokens));
            if ($tokenHits >= min(2, count($sTokens))) $score += 2;
            foreach ($this->synonyms() as $key => $val) {
                $k = $this->normalize($key);
                $v = $this->normalize($val);
                if (Str::contains($textNorm, $k) && ($v === $sNorm || Str::contains($sNorm, $v))) {
                    $score += 2;
                }
            }
            if ($score > 0) {
                $scored[$s] = max($scored[$s] ?? 0, $score);
            }
        }

        // Emerging skills (simple heuristic; can be replaced with market feed)
        $emerging = $this->suggestEmergingSkills($title, $description, $excludeSet->keys()->all());

        // Innovative roles (combine category and keyword signals)
        $innovativeRoles = $this->suggestInnovativeRoles($title, $description, array_keys($scored));

        // Sort skills by score and return top N
        arsort($scored);
        $taxonomySkills = array_slice(array_keys($scored), 0, 12);

        return [
            'taxonomy_skills' => $taxonomySkills,
            'emerging_skills' => $emerging,
            'innovative_roles' => $innovativeRoles,
        ];
    }

    protected function suggestEmergingSkills(string $title, string $description, array $exclude = []): array
    {
        $text = Str::lower($title . ' ' . $description);
        $catalog = [
            'AI Prompt Engineering',
            'Generative AI (Stable Diffusion, Midjourney)',
            'LangChain',
            'LLM Fine-tuning',
            'RAG (Retrieval Augmented Generation)',
            'Web3 dApp Integration',
            'Solana Development',
            'AR/VR Prototyping',
            'Edge Functions (Cloudflare Workers, Vercel Edge)',
            'Serverless Automation (Zapier, n8n, Make.com)',
            'DataOps',
            'MLOps',
        ];
        $signals = [
            'ai' => 2, 'ml' => 2, 'machine learning' => 2, 'llm' => 3, 'chatgpt' => 3,
            'web3' => 2, 'blockchain' => 2, 'solidity' => 2, 'ethereum' => 2,
            'ar' => 2, 'vr' => 2,
            'automation' => 2, 'serverless' => 2,
            'data' => 1, 'analytics' => 1, 'ops' => 1,
        ];

        $score = [];
        foreach ($signals as $kw => $w) {
            if (Str::contains($text, $kw)) {
                foreach ($catalog as $s) {
                    $score[$s] = ($score[$s] ?? 0) + $w;
                }
            }
        }

        // Exclude already chosen skills
        foreach ($exclude as $ex) {
            foreach ($catalog as $s) {
                if (Str::lower($s) === Str::lower($ex)) {
                    unset($score[$s]);
                }
            }
        }

        arsort($score);
        return array_slice(array_keys($score), 0, 8);
    }

    protected function suggestInnovativeRoles(string $title, string $description, array $skills): array
    {
        $text = Str::lower($title . ' ' . $description);
        $roles = [
            ['signals' => ['ai', 'marketing'], 'role' => 'AI Marketing Strategist'],
            ['signals' => ['ai', 'content'], 'role' => 'AI Content Architect'],
            ['signals' => ['web3', 'frontend'], 'role' => 'Web3 Frontend Engineer'],
            ['signals' => ['data', 'ops'], 'role' => 'DataOps Engineer'],
            ['signals' => ['ml', 'ops'], 'role' => 'MLOps Engineer'],
            ['signals' => ['automation', 'no-code'], 'role' => 'Automation Solutions Architect'],
            ['signals' => ['ar', 'vr', 'design'], 'role' => 'XR Experience Designer'],
        ];

        $out = [];
        foreach ($roles as $r) {
            $hit = 0;
            foreach ($r['signals'] as $sig) {
                if (Str::contains($text, $sig)) $hit++;
                foreach ($skills as $s) {
                    if (Str::contains(Str::lower($s), $sig)) $hit++;
                }
            }
            if ($hit >= 2) {
                $out[] = $r['role'];
            }
        }

        return array_values(array_unique($out));
    }

    public function recordAcceptance(string $type, string $value, array $context = []): void
    {
        // Log acceptance for future analytics
        // This can be expanded to store in database when needed
        \Log::info('Skill recommendation accepted', [
            'type' => $type,
            'value' => $value,
            'context' => $context,
            'timestamp' => now(),
        ]);
    }
}
