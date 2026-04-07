<?php

namespace App\Http\Controllers;

use App\Services\FileUploadService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EmployerOnboardingController extends Controller
{
    /**
     * File upload service instance
     */
    protected FileUploadService $fileUploadService;

    /**
     * Constructor
     */
    public function __construct(FileUploadService $fileUploadService)
    {
        $this->fileUploadService = $fileUploadService;
    }

    /**
     * Show the employer onboarding page
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $user = auth()->user();

        // Redirect if not an employer
        if ($user->user_type !== 'employer') {
            return redirect()->route('jobs.index');
        }

        // If profile is already completed, redirect to employer dashboard
        if ($user->profile_completed) {
            return redirect()->route('employer.dashboard');
        }

        // Load industry options and service categories
        $industries = $this->getIndustries();
        $serviceCategories = $this->getServiceCategories();

        $currentStep = (int) $request->query('step', $user->onboarding_step ?: 1);
        $currentStep = max(1, min(5, $currentStep));

        return Inertia::render('Onboarding/EmployerOnboarding', [
            'user' => $user,
            'currentStep' => $currentStep,
            'industries' => $industries,
            'serviceCategories' => $serviceCategories,
        ]);
    }

    /**
     * Handle the employer onboarding form submission
     */
    public function store(Request $request): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $user = auth()->user();
        $step = (int) $request->input('step', 1);

        Log::info('Employer onboarding submission started', [
            'user_id' => $user->id,
            'step' => $step,
            'company_name' => $request->input('company_name'),
        ]);

        try {
            match ($step) {
                2 => $this->saveStep2($request, $user),
                3 => $this->saveStep3($request, $user),
                4 => $this->saveStep4($request, $user),
                5 => $this->saveStep5($request, $user),
                default => null,
            };

            // If step 5 is submitted, mark profile as complete and approved
            if ($step === 5) {
                $user->update([
                    'profile_completed' => true,
                    'profile_status' => 'approved'
                ]);

                Log::info('ONBOARDING_COMPLETED', [
                    'user_id' => $user->id,
                    'user_type' => 'employer',
                    'timestamp' => now()->toIso8601String(),
                ]);

                return redirect()->route('employer.dashboard')->with('success',
                    'Welcome to WorkWise! Your profile is complete and you can now start posting jobs.');
            }

            // Update onboarding step progress so user returns to the right step on refresh
            $willUpdate = !$user->profile_completed && $user->onboarding_step < $step;
            if ($willUpdate) {
                $user->onboarding_step = $step;
                $user->save();
            }

            return back()->with('success', "Step {$step} saved.");

        } catch (\Illuminate\Validation\ValidationException $e) {
            return redirect()->route('employer.onboarding', ['step' => $step])->withErrors($e->errors());
        } catch (\Exception $e) {
            Log::error('ONBOARDING_STEP_SAVE_FAILED', [
                'step' => $step,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors([
                'general' => 'Failed to save progress. Please try again.'
            ])->withInput();
        }
    }

    /**
     * Step 2: Company Identity
     */
    private function saveStep2(Request $request, $user)
    {
        // #region agent log
        $agentLogPath = base_path('debug-82ff5d.log');
        @file_put_contents($agentLogPath, json_encode([
            'sessionId' => '82ff5d',
            'runId' => 'initial',
            'hypothesisId' => 'H5',
            'location' => 'EmployerOnboardingController::saveStep2',
            'message' => 'saveStep2 entry',
            'data' => [
                'hasFile' => $request->hasFile('profile_picture'),
                'fileSize' => $request->hasFile('profile_picture') ? $request->file('profile_picture')->getSize() : null,
                'fileMime' => $request->hasFile('profile_picture') ? $request->file('profile_picture')->getMimeType() : null,
                'company_size' => $request->input('company_size'),
                'industry_present' => filled($request->input('industry')),
            ],
            'timestamp' => (int) (microtime(true) * 1000),
        ]) . "\n", FILE_APPEND | LOCK_EX);
        // #endregion
        $validated = $request->validate([
            'company_name' => 'nullable|string|max:255',
            'company_size' => 'required|in:individual,2-10,11-50,51-200,200+',
            'industry' => 'required|string|max:255',
            'profile_picture' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('profile_picture')) {
            try {
                $validation = $this->fileUploadService->validateFile($request->file('profile_picture'), [
                    'type' => 'image',
                    'user_id' => $user->id,
                    'user_type' => 'employer',
                ]);

                if ($validation['success']) {
                    $uploadResult = $this->fileUploadService->uploadWithRetry($request->file('profile_picture'), 'profiles', 1, [
                        'user_id' => $user->id,
                        'user_type' => 'employer',
                        'use_proxy' => true,
                    ]);

                    if ($uploadResult['success']) {
                        $rel = ltrim(str_replace('\\', '/', (string) ($uploadResult['path'] ?? '')), '/');
                        if (($uploadResult['disk'] ?? 'supabase') === 'public') {
                            $storedPath = '/storage/' . $rel;
                        } else {
                            $storedPath = '/supabase/' . $rel;
                        }
                        $user->profile_picture = $storedPath;
                        $user->profile_photo   = $storedPath;
                        // #region agent log
                        @file_put_contents($agentLogPath, json_encode([
                            'sessionId' => '82ff5d',
                            'runId' => 'post-fix',
                            'hypothesisId' => 'H5',
                            'location' => 'EmployerOnboardingController::saveStep2',
                            'message' => 'employer profile picture upload success',
                            'data' => ['path' => $uploadResult['path'] ?? null, 'disk' => $uploadResult['disk'] ?? 'supabase'],
                            'timestamp' => (int) (microtime(true) * 1000),
                        ]) . "\n", FILE_APPEND | LOCK_EX);
                        // #endregion
                    } else {
                        // #region agent log
                        @file_put_contents($agentLogPath, json_encode([
                            'sessionId' => '82ff5d',
                            'runId' => 'initial',
                            'hypothesisId' => 'H5',
                            'location' => 'EmployerOnboardingController::saveStep2',
                            'message' => 'employer profile picture upload failed',
                            'data' => ['upload_message' => $uploadResult['message'] ?? null],
                            'timestamp' => (int) (microtime(true) * 1000),
                        ]) . "\n", FILE_APPEND | LOCK_EX);
                        // #endregion
                        Log::warning('Employer profile picture upload failed', [
                            'user_id' => $user->id,
                            'message' => $uploadResult['message'] ?? 'Unknown error',
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                // #region agent log
                @file_put_contents($agentLogPath, json_encode([
                    'sessionId' => '82ff5d',
                    'runId' => 'initial',
                    'hypothesisId' => 'H5',
                    'location' => 'EmployerOnboardingController::saveStep2',
                    'message' => 'employer profile picture exception',
                    'data' => ['exception' => get_class($e), 'error' => $e->getMessage()],
                    'timestamp' => (int) (microtime(true) * 1000),
                ]) . "\n", FILE_APPEND | LOCK_EX);
                // #endregion
                Log::warning('Employer profile picture upload error', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
                // Continue saving other fields; do not throw
            }
        }

        $user->company_name = $validated['company_name'];
        $user->company_size = $validated['company_size'];
        $user->industry = $validated['industry'];
        $user->save();
    }

    /**
     * Step 3: Company Bio & Website
     */
    private function saveStep3(Request $request, $user)
    {
        $validated = $request->validate([
            'company_website' => 'nullable|url|max:255',
            'company_description' => 'required|string|min:50|max:1000',
        ]);

        $user->company_website = $validated['company_website'];
        $user->company_description = $validated['company_description'];
        $user->save();
    }

    /**
     * Step 4: Hiring Preferences
     */
    private function saveStep4(Request $request, $user)
    {
        $validated = $request->validate([
            'primary_hiring_needs' => 'required|array|min:1',
            'primary_hiring_needs.*' => 'required|string|min:1|max:255',
            'typical_project_budget' => 'required|in:under_500,500-2000,2000-5000,5000-10000,10000+',
            'typical_project_duration' => 'required|in:short_term,medium_term,long_term,ongoing',
            'preferred_experience_level' => 'required|in:any,beginner,intermediate,expert',
            'hiring_frequency' => 'required|in:one_time,occasional,regular,ongoing',
        ]);

        $allowed = $this->getServiceCategories();
        $normalized = [];
        $seenLower = [];
        foreach ($validated['primary_hiring_needs'] as $value) {
            $trimmed = trim((string) $value);
            if ($trimmed === '') {
                continue;
            }
            $canonical = null;
            foreach ($allowed as $c) {
                if (strcasecmp($trimmed, $c) === 0) {
                    $canonical = $c;
                    break;
                }
            }
            $final = $canonical ?? $trimmed;
            $key = strtolower($final);
            if (isset($seenLower[$key])) {
                continue;
            }
            $seenLower[$key] = true;
            $normalized[] = $final;
        }
        if (\count($normalized) < 1) {
            throw ValidationException::withMessages([
                'primary_hiring_needs' => 'Select or enter at least one service.',
            ]);
        }

        $user->primary_hiring_needs = $normalized;
        $user->typical_project_budget = $validated['typical_project_budget'];
        $user->typical_project_duration = $validated['typical_project_duration'];
        $user->preferred_experience_level = $validated['preferred_experience_level'];
        $user->hiring_frequency = $validated['hiring_frequency'];
        $user->save();
    }

    /**
     * Step 5: Final Review Persistence
     */
    private function saveStep5(Request $request, $user)
    {
        // Re-validate everything just in case something was bypassed
        $this->saveStep2($request, $user);
        $this->saveStep3($request, $user);
        $this->saveStep4($request, $user);
    }

    /**
     * Skip onboarding (optional for employers)
     */
    public function skip(): RedirectResponse
    {
        $user = auth()->user();

        $user->update([
            'profile_completed' => false,
            'profile_status' => 'pending',
        ]);

        return redirect()->route('employer.dashboard')->with('warning',
            'Onboarding was skipped. Complete the required onboarding fields before posting jobs.');
    }

    /**
     * Get list of industries
     */
    private function getIndustries(): array
    {
        return [
            'Technology & IT',
            'Healthcare & Medical',
            'Education & Training',
            'Finance & Accounting',
            'Marketing & Advertising',
            'E-commerce & Retail',
            'Real Estate',
            'Hospitality & Tourism',
            'Manufacturing',
            'Construction',
            'Legal Services',
            'Media & Entertainment',
            'Non-Profit',
            'Consulting',
            'Automotive',
            'Agriculture',
            'Energy & Utilities',
            'Transportation & Logistics',
            'Food & Beverage',
            'Fashion & Beauty',
            'Sports & Fitness',
            'Government',
            'Telecommunications',
            'Other'
        ];
    }

    /**
     * Get service categories (matches gig worker's broad_category)
     */
    private function getServiceCategories(): array
    {
        return [
            'Web Development',
            'Mobile App Development',
            'UI/UX Design',
            'Graphic Design',
            'Content Writing',
            'Copywriting',
            'SEO & Digital Marketing',
            'Social Media Management',
            'Video Editing',
            'Photography',
            'Data Entry',
            'Virtual Assistant',
            'Customer Support',
            'Accounting & Bookkeeping',
            'Legal Services',
            'Translation',
            'Voice Over',
            '3D Modeling & Animation',
            'Game Development',
            'Software Testing',
            'DevOps & Cloud',
            'Database Administration',
            'Network Administration',
            'Cybersecurity',
            'Business Consulting',
            'Project Management',
            'Architecture & Interior Design',
            'Engineering',
            'Research & Analysis',
            'Other'
        ];
    }
}

