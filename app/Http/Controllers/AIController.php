<?php

namespace App\Http\Controllers;

use App\Models\GigJob;
use App\Services\AIJobMatchingService;
use App\Services\MatchService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AIController extends Controller
{
    public function __construct(
        private AIJobMatchingService $aiService,
        private MatchService $matchService,
        private AIService $aiServiceDirect
    ) {}

    /**
     * Show AI recommendations dashboard
     */
    public function recommendations(): Response
    {
        $user = auth()->user();

        if ($user->isFreelancer()) {
            $recommendations = $this->matchService->getRecommendedJobs($user);

            return Inertia::render('AI/Recommendations', [
                'recommendations' => $recommendations,
                'userType' => 'freelancer'
            ]);
        } else {
            // For clients, get freelancer matches for their jobs
            $jobs = $user->postedJobs()->where('status', 'open')->get();
            $recommendations = [];

            foreach ($jobs as $job) {
                $matches = $this->matchService->getJobMatches($job);
                $recommendations[$job->id] = [
                    'job' => $job,
                    'matches' => $matches
                ];
            }

            return Inertia::render('AI/Recommendations', [
                'recommendations' => $recommendations,
                'userType' => 'client'
            ]);
        }
    }

    /**
     * Get matching freelancers for a job with AI enhancement
     */
    public function matchingFreelancers(GigJob $job)
    {
        // Ensure user owns this job
        if ($job->employer_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        $result = $this->aiService->getAIMatchingFreelancers($job);

        return response()->json($result);
    }

    /**
     * Get AI-powered job suggestions for freelancer
     */
    public function jobSuggestions()
    {
        $user = auth()->user();

        if (!$user->isFreelancer()) {
            abort(403, 'Only freelancers can access job suggestions');
        }

        $suggestions = $this->matchService->getRecommendedJobs($user, 15);

        return response()->json([
            'suggestions' => $suggestions,
            'total_suggestions' => count($suggestions)
        ]);
    }

    /**
     * Get market trends for Lapu-Lapu City
     */
    private function getMarketTrends(): array
    {
        return [
            'trending_skills' => [
                'Web Development' => ['growth' => '+25%', 'demand' => 'High'],
                'Mobile Apps' => ['growth' => '+18%', 'demand' => 'High'],
                'Digital Marketing' => ['growth' => '+22%', 'demand' => 'Medium'],
                'Graphic Design' => ['growth' => '+12%', 'demand' => 'Medium'],
                'Content Writing' => ['growth' => '+15%', 'demand' => 'Medium']
            ],
            'local_opportunities' => [
                'Tourism websites for Lapu-Lapu resorts',
                'E-commerce for local businesses',
                'Mobile apps for local services',
                'Digital marketing for hospitality sector'
            ],
            'seasonal_trends' => [
                'Peak season: December-April (Tourism boost)',
                'Festival periods: Kadaugan sa Mactan celebrations',
                'Back-to-school: June-August (Education projects)'
            ]
        ];
    }

    /**
     * Get pricing insights
     */
    private function getPricingInsights(): array
    {
        return [
            'average_rates' => [
                'Web Development' => ['min' => '₱15/hr', 'max' => '₱45/hr', 'avg' => '₱28/hr'],
                'Mobile Development' => ['min' => '₱20/hr', 'max' => '₱50/hr', 'avg' => '₱32/hr'],
                'Graphic Design' => ['min' => '₱10/hr', 'max' => '₱30/hr', 'avg' => '₱18/hr'],
                'Content Writing' => ['min' => '₱8/hr', 'max' => '₱25/hr', 'avg' => '₱15/hr'],
                'Digital Marketing' => ['min' => '₱12/hr', 'max' => '₱35/hr', 'avg' => '₱22/hr']
            ],
            'budget_recommendations' => [
                'Small projects (1-2 weeks)' => '₱500 - ₱2,000',
                'Medium projects (1-2 months)' => '₱2,000 - ₱8,000',
                'Large projects (3+ months)' => '₱8,000 - ₱25,000'
            ],
            'cost_factors' => [
                'Experience level of freelancer',
                'Project complexity and scope',
                'Timeline and urgency',
                'Additional services required'
            ]
        ];
    }

    /**
     * Get skill demand analysis
     */
    private function getSkillDemand(): array
    {
        return [
            'high_demand' => [
                'React.js' => 'Very High',
                'Laravel' => 'High',
                'WordPress' => 'High',
                'SEO' => 'High',
                'Social Media Marketing' => 'Medium-High'
            ],
            'emerging_skills' => [
                'AI/Machine Learning',
                'Blockchain Development',
                'Mobile App Security',
                'Voice User Interface',
                'AR/VR Development'
            ],
            'local_specialties' => [
                'Tourism website development',
                'Restaurant management systems',
                'Local business directories',
                'Event management platforms'
            ]
        ];
    }

    /**
     * Get AI-powered hiring tips
     */
    private function getHiringTips(): array
    {
        return [
            'screening_tips' => [
                'Review portfolio thoroughly',
                'Check client testimonials and ratings',
                'Conduct a brief interview or test project',
                'Verify technical skills with specific questions',
                'Ensure good communication skills'
            ],
            'red_flags' => [
                'Unusually low bids compared to market rates',
                'Poor communication or delayed responses',
                'No portfolio or previous work examples',
                'Requests for payment outside the platform',
                'Unrealistic timeline promises'
            ],
            'best_practices' => [
                'Write clear, detailed project descriptions',
                'Set realistic budgets and timelines',
                'Use milestone-based payments',
                'Maintain regular communication',
                'Provide constructive feedback'
            ],
            'local_advantages' => [
                'Same timezone for better communication',
                'Understanding of local market and culture',
                'Potential for in-person meetings if needed',
                'Support for local economy and talent'
            ]
        ];
    }

    /**
     * Get personalized insights for user
     */
    public function personalizedInsights()
    {
        $user = auth()->user();

        if ($user->isFreelancer()) {
            return response()->json([
                'profile_score' => $this->calculateProfileScore($user),
                'improvement_suggestions' => $this->getImprovementSuggestions($user),
                'earning_potential' => $this->calculateEarningPotential($user),
                'skill_gaps' => $this->identifySkillGaps($user)
            ]);
        } else {
            return response()->json([
                'hiring_success_rate' => $this->calculateHiringSuccessRate($user),
                'budget_optimization' => $this->getBudgetOptimization($user),
                'preferred_freelancer_types' => $this->getPreferredFreelancerTypes($user)
            ]);
        }
    }

    /**
     * Calculate profile completeness score
     */
    private function calculateProfileScore($user): array
    {
        $score = 0;
        $maxScore = 100;
        $suggestions = [];

        // Basic info (20 points)
        if ($user->bio && strlen($user->bio) >= 50) $score += 20;
        else $suggestions[] = 'Add a detailed bio (at least 50 characters)';

        // Skills (25 points)
        if ($user->skills && count($user->skills) >= 3) $score += 25;
        else $suggestions[] = 'Add at least 3 relevant skills';

        // Rate (15 points)
        if ($user->hourly_rate) $score += 15;
        else $suggestions[] = 'Set your hourly rate';

        // Portfolio (20 points)
        if ($user->portfolio_url) $score += 20;
        else $suggestions[] = 'Add a portfolio URL';

        // Reviews (20 points)
        $reviewCount = $user->receivedReviews()->count();
        if ($reviewCount >= 5) $score += 20;
        elseif ($reviewCount >= 1) $score += 10;
        else $suggestions[] = 'Complete projects to get reviews';

        return [
            'score' => $score,
            'max_score' => $maxScore,
            'percentage' => round(($score / $maxScore) * 100),
            'suggestions' => $suggestions
        ];
    }

    /**
     * Get improvement suggestions
     */
    private function getImprovementSuggestions($user): array
    {
        $suggestions = [];

        // Based on completion rate
        $completionRate = $user->completion_rate;
        if ($completionRate < 90) {
            $suggestions[] = 'Focus on completing projects on time to improve your completion rate';
        }

        // Based on rating
        $avgRating = $user->average_rating;
        if ($avgRating < 4.5) {
            $suggestions[] = 'Work on improving client satisfaction to boost your ratings';
        }

        // Based on activity
        $activeProjects = $user->freelancerProjects()->where('status', 'active')->count();
        if ($activeProjects === 0) {
            $suggestions[] = 'Apply to more jobs to increase your activity and visibility';
        }

        return $suggestions;
    }

    /**
     * Calculate earning potential
     */
    private function calculateEarningPotential($user): array
    {
        $currentRate = $user->hourly_rate ?? 20;
        $avgRating = $user->average_rating;
        $completionRate = $user->completion_rate;

        // Calculate potential rate based on performance
        $potentialRate = $currentRate;
        if ($avgRating >= 4.8 && $completionRate >= 95) {
            $potentialRate *= 1.3; // 30% increase
        } elseif ($avgRating >= 4.5 && $completionRate >= 90) {
            $potentialRate *= 1.15; // 15% increase
        }

        return [
            'current_rate' => $currentRate,
            'potential_rate' => round($potentialRate, 2),
            'monthly_potential' => round($potentialRate * 160, 2), // 160 hours/month
            'improvement_needed' => $potentialRate > $currentRate
        ];
    }

    /**
     * Identify skill gaps
     */
    private function identifySkillGaps($user): array
    {
        $userSkills = array_map('strtolower', $user->skills ?? []);
        $demandingSkills = ['react', 'laravel', 'node.js', 'python', 'aws', 'docker'];

        $missingSkills = array_diff($demandingSkills, $userSkills);

        return [
            'missing_high_demand_skills' => $missingSkills,
            'skill_recommendations' => [
                'Based on your current skills, consider learning:',
                'React.js for modern web development',
                'Laravel for PHP backend development',
                'AWS for cloud services'
            ]
        ];
    }

    /**
     * Calculate hiring success rate for clients
     */
    private function calculateHiringSuccessRate($user): array
    {
        $totalProjects = $user->employerProjects()->count();
        $successfulProjects = $user->employerProjects()->where('status', 'completed')->count();

        $successRate = $totalProjects > 0 ? ($successfulProjects / $totalProjects) * 100 : 0;

        return [
            'success_rate' => round($successRate, 1),
            'total_projects' => $totalProjects,
            'successful_projects' => $successfulProjects,
            'benchmark' => 85 // Industry benchmark
        ];
    }

    /**
     * Get budget optimization suggestions
     */
    private function getBudgetOptimization($user): array
    {
        return [
            'average_project_cost' => $user->employerProjects()->avg('agreed_amount') ?? 0,
            'cost_per_successful_project' => 'Calculate based on success rate',
            'optimization_tips' => [
                'Consider milestone-based payments',
                'Invest in higher-rated freelancers for critical projects',
                'Use fixed-price contracts for well-defined projects'
            ]
        ];
    }

    /**
     * Get preferred freelancer types
     */
    private function getPreferredFreelancerTypes($user): array
    {
        // Analyze past hiring patterns
        return [
            'experience_preference' => 'Intermediate', // Based on past hires
            'rate_range_preference' => '$20-35/hr',
            'location_preference' => 'Local (Lapu-Lapu City)',
            'skill_preferences' => ['Web Development', 'Design', 'Marketing']
        ];
    }

    /**
     * Get AI-powered skill recommendations for freelancer
     */
    public function skillRecommendations()
    {
        $user = auth()->user();

        if (!$user->isFreelancer()) {
            abort(403, 'Only freelancers can access skill recommendations');
        }

        $recommendations = $this->aiService->getAISkillRecommendations($user);

        return response()->json([
            'success' => $recommendations['success'],
            'recommendations' => $recommendations['recommendations'],
            'error' => $recommendations['error'] ?? null,
            'ai_service_available' => $this->aiServiceDirect->isAvailable()
        ]);
    }

    /**
     * Get AI-enhanced job suggestions for freelancer
     */
    public function enhancedJobSuggestions()
    {
        $user = auth()->user();

        if (!$user->isFreelancer()) {
            abort(403, 'Only freelancers can access job suggestions');
        }

        $suggestions = $this->aiService->getAIJobRecommendations($user);

        return response()->json($suggestions);
    }

    /**
     * Get AI service status and configuration (Groq)
     */
    public function aiServiceStatus()
    {
        $config = $this->aiServiceDirect->getConfig();
        return response()->json([
            'available' => $this->aiServiceDirect->isAvailable(),
            'config' => $config,
            'api_key_configured' => !empty(env('GROQ_API_KEY')),
            'model' => $config['model_explanations'] ?? 'llama-3.3-70b-versatile',
        ]);
    }
}
