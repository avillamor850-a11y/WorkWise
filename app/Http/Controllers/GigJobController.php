<?php

namespace App\Http\Controllers;

use App\Models\GigJob;
use App\Services\SkillService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GigJobController extends Controller
{
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
    public function create(): Response
    {
        // Only employers can create jobs
        if (!auth()->user()->isEmployer()) {
            abort(403, 'Only employers can post jobs.');
        }

        return Inertia::render('Jobs/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Only employers can create jobs
        if (!auth()->user()->isEmployer()) {
            abort(403, 'Only employers can post jobs.');
        }

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
            'experience_level' => 'required|in:beginner,intermediate,expert',
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

        return Inertia::render('Jobs/Show', [
            'job' => $job,
            'canBid' => auth()->user()?->isGigWorker() &&
                        !$job->bids()->where('gig_worker_id', auth()->id())
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
            'experience_level' => 'sometimes|required|in:beginner,intermediate,expert',
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
        }

        $job->update($validated);

        $this->ensureJobSkillsForPromotion($job);

        return redirect()->route('jobs.show', $job)
            ->with('success', 'Job updated successfully!');
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
