<?php

namespace App\Http\Controllers;

use App\Models\GigJob;
use App\Services\SkillService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GigJobController extends Controller
{
    /**
     * Employers must have an approved profile (completed onboarding) before posting jobs.
     */
    private function authorizeEmployerJobPosting(): void
    {
        $user = auth()->user();
        if (! $user || ! $user->isEmployer()) {
            abort(403, 'Only employers can post jobs.');
        }
        if (! $this->canEmployerPostJobs($user)) {
            abort(403, 'Complete your employer onboarding before posting jobs.');
        }
    }

    private function canEmployerPostJobs($user): bool
    {
        if (! $user || ! $user->isEmployer()) {
            return false;
        }

        return $user->profile_status === 'approved'
            && \count($this->getMissingEmployerOnboardingFields($user)) === 0;
    }

    private function getMissingEmployerOnboardingFields($user): array
    {
        $missing = [];

        if (! filled($user->company_size)) {
            $missing[] = 'Company size';
        }
        if (! filled($user->industry)) {
            $missing[] = 'Industry';
        }
        if (! filled($user->company_description) || mb_strlen(trim((string) $user->company_description)) < 50) {
            $missing[] = 'Company description (minimum 50 characters)';
        }

        $primaryHiringNeeds = $user->primary_hiring_needs;
        if (! is_array($primaryHiringNeeds) || \count(array_filter($primaryHiringNeeds, fn ($value) => filled($value))) < 1) {
            $missing[] = 'Primary hiring needs';
        }
        if (! filled($user->typical_project_budget)) {
            $missing[] = 'Typical project budget';
        }
        if (! filled($user->typical_project_duration)) {
            $missing[] = 'Typical project duration';
        }
        if (! filled($user->preferred_experience_level)) {
            $missing[] = 'Preferred experience level';
        }
        if (! filled($user->hiring_frequency)) {
            $missing[] = 'Hiring frequency';
        }

        return $missing;
    }

    private function onboardingGateFlashPayload($user): array
    {
        return [
            'required' => true,
            'message' => 'Complete your employer onboarding before posting jobs.',
            'missing_fields' => $this->getMissingEmployerOnboardingFields($user),
            'onboarding_url' => route('employer.onboarding'),
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $user = auth()->user();

        if ($user && $user->isEmployer()) {
            // For employers, show their own jobs (all statuses)
            $query = GigJob::with(['employer'])->withCount('bids')
                ->where('employer_id', $user->id)
                ->latest();
        } else {
            // For gig workers and guests, show all open jobs (exclude hidden by admin)
            $query = GigJob::with(['employer'])->withCount('bids')
                ->where('status', 'open')
                ->visible()
                ->latest();
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereJsonContains('required_skills', $search);
            });
        }

        // Filter by skills
        if ($request->filled('skills')) {
            $skills = $request->get('skills');
            if (is_array($skills)) {
                foreach ($skills as $skill) {
                    $query->whereJsonContains('required_skills', $skill);
                }
            }
        }

        // Filter by budget range
        if ($request->filled('min_budget')) {
            $query->where('budget_min', '>=', $request->get('min_budget'));
        }
        if ($request->filled('max_budget')) {
            $query->where('budget_max', '<=', $request->get('max_budget'));
        }

        $jobs = $query->paginate(12);

        // Add budget display to each job
        $jobs->getCollection()->transform(function ($job) {
            $job->budget_display = $job->getBudgetDisplayAttribute();
            return $job;
        });

        // Get all unique skills from all jobs dynamically
        $availableSkills = $this->getAvailableSkills();

        return Inertia::render('Jobs/Index', [
            'jobs' => $jobs,
            'filters' => $request->only(['search', 'skills', 'min_budget', 'max_budget']),
            'availableSkills' => $availableSkills,
        ]);
    }

    /**
     * Get all unique skills from all jobs
     */
    private function getAvailableSkills(): array
    {
        // Get all jobs with required_skills
        $allSkills = GigJob::where('status', 'open')
            ->whereNotNull('required_skills')
            ->get()
            ->pluck('required_skills')
            ->flatten()
            ->map(function ($skill) {
                return trim($skill);
            })
            ->filter(function ($skill) {
                return !empty($skill);
            })
            ->unique()
            ->sort()
            ->values()
            ->toArray();

        return $allSkills;
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response|RedirectResponse
    {
        $user = auth()->user();
        if (! $user || ! $user->isEmployer()) {
            abort(403, 'Only employers can post jobs.');
        }
        if (! $this->canEmployerPostJobs($user)) {
            return redirect()
                ->route('employer.dashboard')
                ->with('warning', 'Complete your employer onboarding before posting jobs.')
                ->with('onboarding_gate', $this->onboardingGateFlashPayload($user));
        }

        return Inertia::render('Jobs/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorizeEmployerJobPosting();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string|min:100',
            'project_category' => 'nullable|string|max:255',
            
            // Primary structured skills field (required)
            'skills_requirements' => 'required|array|min:1',
            'skills_requirements.*.skill' => 'required|string|max:100',
            'skills_requirements.*.experience_level' => 'required|in:beginner,intermediate,expert',
            'skills_requirements.*.importance' => 'required|in:required,preferred',
            
            // Legacy field - no longer required, auto-populated for backward compatibility
            'required_skills' => 'nullable|array',
            'required_skills.*' => 'string|max:50',
            
            'budget_type' => 'required|in:fixed,hourly',
            'budget_min' => 'required|numeric|min:5',
            'budget_max' => 'required|numeric|min:5|gte:budget_min',
            'experience_level' => 'nullable|in:beginner,intermediate,expert',
            'job_complexity' => 'nullable|in:simple,moderate,complex,expert',
            'estimated_duration_days' => 'required|integer|min:1',
            'deadline' => 'nullable|date|after:today',
            'location' => 'nullable|string|max:255',
            'is_remote' => 'boolean',
        ]);

        $validated['employer_id'] = auth()->id();
        $validated['status'] = 'open';

        // Auto-populate required_skills from skills_requirements for backward compatibility
        if (!empty($validated['skills_requirements'])) {
            $validated['required_skills'] = array_map(
                fn($skill) => $skill['skill'],
                $validated['skills_requirements']
            );
            $validated['experience_level'] = $this->deriveExperienceLevelFromSkills($validated['skills_requirements']);
        } else {
            $validated['experience_level'] = $validated['experience_level'] ?? 'intermediate';
        }

        $job = GigJob::create($validated);

        $this->ensureJobSkillsForPromotion($job);

        return redirect()->route('jobs.show', $job)
            ->with('success', 'Job posted successfully! Your job is now live and gig workers can start submitting proposals.');
    }

    /**
     * Display the specified resource.
     * 
     * DATA CONSISTENCY VERIFICATION (Requirement 9.1-9.6):
     * - Job data comes from gig_jobs table
     * - Employer profile data comes from users table
     * - Gig worker profile data in bids comes from users table
     * - All data is fetched from database with no mock or placeholder data
     */
    public function show(GigJob $job): Response
    {
        // Load employer with profile data needed for clickable links (Requirement 9.1, 9.2)
        // Load gig worker data for each bid from users table (Requirement 9.1, 9.2)
        $job->load([
            'employer:id,first_name,last_name,company_name,profile_picture,user_type',
            'bids' => function ($query) {
                $query->with([
                    'gigWorker:id,first_name,last_name,professional_title,profile_picture,user_type'
                ]);
            }
        ]);
        
        $job->budget_display = $job->getBudgetDisplayAttribute();

        $user = auth()->user();

        return Inertia::render('Jobs/Show', [
            'job' => $job,
            'canBid' => $user
                && $user->isGigWorker()
                && $user->profile_status === 'approved'
                && ! $job->bids()->where('gig_worker_id', $user->id)
                    ->whereNotIn('status', ['rejected', 'withdrawn'])
                    ->exists(),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(GigJob $job): Response
    {
        // Only allow employer to edit their own jobs
        if ($job->employer_id !== auth()->id()) {
            abort(403);
        }

        return Inertia::render('Jobs/Edit', [
            'job' => $job,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, GigJob $job)
    {
        // Only allow employer to update their own jobs
        if ($job->employer_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'project_category' => 'sometimes|nullable|string|max:255',
            
            // Primary structured skills field
            'skills_requirements' => 'sometimes|required|array|min:1',
            'skills_requirements.*.skill' => 'required|string|max:100',
            'skills_requirements.*.experience_level' => 'required|in:beginner,intermediate,expert',
            'skills_requirements.*.importance' => 'required|in:required,preferred',
            
            // Legacy field - no longer required, auto-populated for backward compatibility
            'required_skills' => 'sometimes|nullable|array',
            'required_skills.*' => 'string|max:50',
            
            'budget_type' => 'sometimes|required|in:fixed,hourly',
            'budget_min' => 'sometimes|required|numeric|min:0',
            'budget_max' => 'sometimes|nullable|numeric|min:0|gte:budget_min',
            'experience_level' => 'sometimes|nullable|in:beginner,intermediate,expert',
            'job_complexity' => 'sometimes|nullable|in:simple,moderate,complex,expert',
            'estimated_duration_days' => 'sometimes|nullable|integer|min:1',
            'deadline' => 'sometimes|nullable|date|after:today',
            'location' => 'sometimes|nullable|string|max:255',
            'is_remote' => 'sometimes|boolean',
            'status' => 'sometimes|in:open,closed,cancelled',
        ]);

        // Auto-populate required_skills from skills_requirements for backward compatibility
        if (isset($validated['skills_requirements']) && !empty($validated['skills_requirements'])) {
            $validated['required_skills'] = array_map(
                fn($skill) => $skill['skill'],
                $validated['skills_requirements']
            );
            $validated['experience_level'] = $this->deriveExperienceLevelFromSkills($validated['skills_requirements']);
        }

        // Edit form parity with create: omitted fields are cleared
        if (! $request->exists('deadline')) {
            $validated['deadline'] = null;
        }
        if (! $request->exists('job_complexity')) {
            $validated['job_complexity'] = null;
        }
        if (! $request->exists('nice_to_have_skills')) {
            $validated['nice_to_have_skills'] = [];
        }

        $job->update($validated);

        $this->ensureJobSkillsForPromotion($job);

        return redirect()->route('jobs.show', $job)
            ->with('success', 'Job updated successfully!');
    }

    /**
     * Derive job-level experience from skills_requirements (required skills only).
     * Returns most common experience_level; on tie, prefers expert > intermediate > beginner.
     */
    private function deriveExperienceLevelFromSkills(array $skillsRequirements): string
    {
        $required = array_filter($skillsRequirements, fn($s) => is_array($s) && (($s['importance'] ?? 'required') === 'required'));
        if (empty($required)) {
            return 'intermediate';
        }
        $levels = array_map(fn($s) => $s['experience_level'] ?? 'intermediate', $required);
        $counts = array_count_values($levels);
        $order = ['expert' => 3, 'intermediate' => 2, 'beginner' => 1];
        $best = 'intermediate';
        $bestCount = 0;
        $bestOrder = 0;
        foreach ($counts as $level => $count) {
            $o = $order[$level] ?? 0;
            if ($count > $bestCount || ($count === $bestCount && $o > $bestOrder)) {
                $best = $level;
                $bestCount = $count;
                $bestOrder = $o;
            }
        }
        return $best;
    }

    /**
     * Ensure all skills from a job's skills_requirements exist in the skills table
     * with source='user' and check each for promotion.
     */
    private function ensureJobSkillsForPromotion(GigJob $job): void
    {
        $reqs = $job->skills_requirements;
        if (!is_array($reqs)) return;

        $skillService = app(SkillService::class);
        foreach ($reqs as $req) {
            $name = trim($req['skill'] ?? '');
            if ($name === '') continue;
            $skill = $skillService->ensureSkill($name);
            $skillService->checkPromotion($skill);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(GigJob $job)
    {
        // Only allow employer to delete their own jobs
        if ($job->employer_id !== auth()->id()) {
            abort(403);
        }

        $job->delete();

        return redirect()->route('jobs.index')
            ->with('success', 'Job deleted successfully!');
    }
}
