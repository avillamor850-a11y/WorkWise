<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GigWorkerOnboardingController extends Controller
{
    /**
     * Show the gig worker onboarding page.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        // If not a gig worker, redirect
        if (!$user->isGigWorker()) {
            return redirect()->route('dashboard');
        }

        // If onboarding already completed, redirect to jobs
        if ($user->profile_completed) {
            return redirect()->route('jobs.index')
                ->with('message', 'Your profile is already complete!');
        }

        $currentStep = (int) $request->query('step', $user->onboarding_step ?: 1);

        return Inertia::render('Onboarding/GigWorkerOnboarding', [
            'user' => $user,
            'currentStep' => $currentStep,
        ]);
    }

    /**
     * Save a specific onboarding step (supports partial/draft saving).
     */
    public function store(Request $request): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        $step = $request->input('step', 1);
        $isDraft = $request->boolean('is_draft', false);

        // #region agent log
        $logPath = base_path('debug-683d70.log');
        $log = function ($msg, $data = [], $hypothesisId = '') use ($logPath) {
            $payload = array_filter(['sessionId' => '683d70', 'location' => 'GigWorkerOnboardingController::store', 'message' => $msg, 'data' => $data, 'timestamp' => (int)(microtime(true) * 1000), 'hypothesisId' => $hypothesisId ?: null]);
            @file_put_contents($logPath, json_encode($payload) . "\n", FILE_APPEND | LOCK_EX);
        };
        $log('store entry', ['step' => $step, 'isDraft' => $isDraft], 'H4');
        // #endregion

        try {
            match ((int) $step) {
                2 => $this->saveStep2($request, $user),
                3 => $this->saveStep3($request, $user),
                4 => $this->saveStep4($request, $user),
                5 => $this->saveStep5($request, $user),
                default => null,
            };

            // Update onboarding step progress (so refresh restores the correct step)
            $stepInt = (int) $step;
            if ($isDraft && $stepInt >= 2 && $stepInt <= 5) {
                $user->onboarding_step = $stepInt;
                $user->save();
            } elseif (!$isDraft && $user->onboarding_step < $stepInt) {
                $user->onboarding_step = $stepInt;
                $user->save();
            }

            if ($isDraft) {
                return response()->json([
                    'success' => true,
                    'message' => 'Progress saved as draft.',
                ]);
            }

            // If step 5 is submitted, mark profile as complete
            if ((int) $step === 5) {
                $user->profile_completed = true;
                $user->onboarding_step = 5;
                $user->save();
                $user->syncSkillsFromExperience();

                return redirect()->route('jobs.index')
                    ->with('success', 'Welcome to WorkWise! Your profile has been submitted for review.');
            }

            return back()->with('success', "Step {$step} saved successfully.");

        } catch (\Throwable $e) {
            // #region agent log
            $logPath = base_path('debug-683d70.log');
            $payload = ['sessionId' => '683d70', 'location' => 'GigWorkerOnboardingController::store catch', 'message' => $e->getMessage(), 'data' => ['exception' => get_class($e), 'file' => $e->getFile(), 'line' => $e->getLine(), 'step' => $step], 'timestamp' => (int)(microtime(true) * 1000), 'hypothesisId' => 'H_ALL'];
            @file_put_contents($logPath, json_encode($payload) . "\n", FILE_APPEND | LOCK_EX);
            // #endregion
            if ($e instanceof ValidationException) {
                return redirect()->route('gig-worker.onboarding', ['step' => $step])
                    ->withErrors($e->errors());
            }

            Log::error('Onboarding save error', [
                'user_id' => $user->id,
                'step' => $step,
                'error' => $e->getMessage(),
            ]);

            if ($isDraft) {
                return response()->json(['success' => false, 'message' => 'Failed to save draft.'], 500);
            }

            return redirect()->route('gig-worker.onboarding', ['step' => $step])
                ->withErrors(['error' => 'Failed to save. Please try again.']);
        }
    }

    /**
     * Skip onboarding and go to jobs page.
     */
    public function skip(Request $request): RedirectResponse
    {
        return redirect()->route('jobs.index')
            ->with('message', 'You can complete your profile anytime from the Profile page.');
    }

    /**
     * Upload profile picture to Supabase immediately (e.g. on file select in Step 2).
     * Returns a display-ready URL for the frontend.
     */
    public function uploadProfilePicture(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'profile_picture' => 'required|image|max:5120',
        ]);

        $user = $request->user();

        try {
            if ($user->profile_picture) {
                try {
                    $oldPath = ltrim(str_replace('/supabase/', '', $user->profile_picture), '/');
                    if (Storage::disk('supabase')->exists($oldPath)) {
                        Storage::disk('supabase')->delete($oldPath);
                    }
                } catch (\Exception $e) {
                    Log::warning('Onboarding upload profile picture: could not delete old: ' . $e->getMessage());
                }
            }

            $path = Storage::disk('supabase')->putFile('profiles/' . $user->id, $request->file('profile_picture'));
            if (!$path) {
                Log::error('Onboarding upload profile picture: Supabase putFile returned null', ['user_id' => $user->id]);
                return response()->json(['success' => false, 'message' => 'Upload failed.'], 500);
            }

            $storedPath = '/supabase/' . $path;
            $user->profile_picture = $storedPath;
            $user->profile_photo = $storedPath;
            $user->save();

            $displayUrl = url('/storage/supabase/' . $path);
            Log::info('Onboarding: profile picture uploaded via uploadProfilePicture', ['user_id' => $user->id, 'path' => $path]);

            return response()->json([
                'success' => true,
                'url'     => $displayUrl,
            ]);
        } catch (\Exception $e) {
            Log::error('Onboarding upload profile picture failed: ' . $e->getMessage(), ['user_id' => $user->id]);
            return response()->json(['success' => false, 'message' => 'Upload failed. Please try again.'], 500);
        }
    }

    // ─── Step Handlers ───────────────────────────────────────────────────────

    // #region agent log
    private function agentLog(string $path, string $msg, array $data, string $hypothesisId = ''): void
    {
        $logPath = base_path('debug-683d70.log');
        $payload = array_filter(['sessionId' => '683d70', 'location' => $path, 'message' => $msg, 'data' => $data, 'timestamp' => (int)(microtime(true) * 1000), 'hypothesisId' => $hypothesisId ?: null]);
        @file_put_contents($logPath, json_encode($payload) . "\n", FILE_APPEND | LOCK_EX);
    }
    // #endregion

    private function saveStep2(Request $request, User $user): void
    {
        $this->agentLog('GigWorkerOnboardingController::saveStep2', 'saveStep2 entry', ['user_id' => $user->id, 'hasFile' => $request->hasFile('profile_picture'), 'hourly_rate_raw' => $request->input('hourly_rate')], 'H1');
        $validated = $request->validate([
            'professional_title' => 'required|string|max:150',
            'hourly_rate'        => 'nullable|numeric|min:0|max:99999',
            'bio'                => 'required|string|max:1000',
            'profile_picture'    => 'nullable|image|max:5120',
        ]);
        $this->agentLog('GigWorkerOnboardingController::saveStep2', 'after validate', ['validated_keys' => array_keys($validated), 'hourly_rate' => $validated['hourly_rate'] ?? 'NOT_SET'], 'H1');

        if ($request->hasFile('profile_picture')) {
            try {
                Log::info('Onboarding: uploading profile picture to Supabase', ['user_id' => $user->id]);

                if ($user->profile_picture) {
                    try {
                        $oldPath = ltrim(str_replace('/supabase/', '', $user->profile_picture), '/');
                        if (Storage::disk('supabase')->exists($oldPath)) {
                            Storage::disk('supabase')->delete($oldPath);
                        }
                    } catch (\Exception $e) {
                        Log::warning('Onboarding: could not delete old profile picture: ' . $e->getMessage());
                    }
                }

                $path = Storage::disk('supabase')->putFile('profiles/' . $user->id, $request->file('profile_picture'));
                if ($path) {
                    $url = '/supabase/' . $path;
                    $user->profile_picture = $url;
                    $user->profile_photo   = $url;
                    Log::info('Onboarding: profile picture uploaded', ['user_id' => $user->id, 'path' => $path]);
                } else {
                    Log::error('Onboarding: Supabase upload returned null path', ['user_id' => $user->id]);
                }
            } catch (\Exception $e) {
                Log::error('Onboarding: profile picture upload failed: ' . $e->getMessage(), ['user_id' => $user->id]);
                // Continue without throwing — user can proceed and add photo later
            }
        }

        $user->professional_title = $validated['professional_title'];
        $user->hourly_rate        = $validated['hourly_rate'] ?? null;
        $user->bio                = $validated['bio'];
        $this->agentLog('GigWorkerOnboardingController::saveStep2', 'before user save', ['hourly_rate_assign' => $user->hourly_rate], 'H3');
        $user->save();
    }

    private function saveStep3(Request $request, User $user): void
    {
        // Skills come as a JSON string (from FormData) or array
        $skillsRaw = $request->input('skills_with_experience');
        if (is_string($skillsRaw)) {
            $skills = json_decode($skillsRaw, true);
            if (is_array($skills) && count($skills) > 0) {
                $user->skills_with_experience = $skills;
                $user->save();
                $user->syncSkillsFromExperience();
            }
        } elseif (is_array($skillsRaw) && count($skillsRaw) > 0) {
            $user->skills_with_experience = $skillsRaw;
            $user->save();
            $user->syncSkillsFromExperience();
        }
    }

    private function saveStep4(Request $request, User $user): void
    {
        $validated = $request->validate([
            'portfolio_link' => 'nullable|string|max:500',
            'resume_file'    => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ]);

        // Persist all accumulated text fields (buildFormData always sends everything)
        if ($request->filled('professional_title')) {
            $user->professional_title = $request->input('professional_title');
        }
        if ($request->filled('bio')) {
            $user->bio = $request->input('bio');
        }
        if ($request->has('hourly_rate')) {
            $user->hourly_rate = $request->input('hourly_rate') ?: null;
        }

        // Persist skills
        $skillsRaw = $request->input('skills_with_experience');
        if (is_string($skillsRaw)) {
            $skills = json_decode($skillsRaw, true);
            if (is_array($skills) && count($skills) > 0) {
                $user->skills_with_experience = $skills;
            }
        } elseif (is_array($skillsRaw) && count($skillsRaw) > 0) {
            $user->skills_with_experience = $skillsRaw;
        }

        // Upload resume
        if ($request->hasFile('resume_file')) {
            try {
                Log::info('Onboarding: uploading resume to Supabase', ['user_id' => $user->id]);
                $path = Storage::disk('supabase')->putFile('resumes/' . $user->id, $request->file('resume_file'));
                if ($path) {
                    $user->resume_file = '/supabase/' . $path;
                    Log::info('Onboarding: resume uploaded', ['user_id' => $user->id, 'path' => $path]);
                } else {
                    Log::error('Onboarding: resume upload returned null', ['user_id' => $user->id]);
                    throw ValidationException::withMessages([
                        'resume_file' => 'Resume upload failed. Please try again or continue without.',
                    ]);
                }
            } catch (ValidationException $e) {
                throw $e;
            } catch (\Exception $e) {
                Log::error('Onboarding: resume upload failed: ' . $e->getMessage(), ['user_id' => $user->id]);
                throw ValidationException::withMessages([
                    'resume_file' => 'Resume upload failed. Please try again or continue without.',
                ]);
            }
        }

        $user->portfolio_link = $validated['portfolio_link'] ?? null;
        $user->save();
        $user->syncSkillsFromExperience();
    }

    /**
     * Step 5 = TEXT-DATA SAFETY NET.
     *
     * Files are NOT sent on step 5 (they're handled at steps 2 & 4).
     * This call persists all accumulated text fields before profile_completed=true.
     */
    private function saveStep5(Request $request, User $user): void
    {
        $validated = $request->validate([
            'professional_title'     => 'sometimes|nullable|string|max:150',
            'hourly_rate'            => 'sometimes|nullable|numeric|min:0|max:99999',
            'bio'                    => 'sometimes|nullable|string|max:1000',
            'skills_with_experience' => 'sometimes|nullable|string',
            'portfolio_link'         => 'sometimes|nullable|string|max:500',
        ]);

        // Only overwrite if non-empty so we don't erase data saved at earlier steps
        if (!empty($validated['professional_title'])) {
            $user->professional_title = $validated['professional_title'];
        }
        if (array_key_exists('hourly_rate', $validated)) {
            $user->hourly_rate = $validated['hourly_rate'] ?: null;
        }
        if (!empty($validated['bio'])) {
            $user->bio = $validated['bio'];
        }
        if (!empty($validated['portfolio_link'])) {
            $user->portfolio_link = $validated['portfolio_link'];
        }

        // Skills JSON (sent as string from FormData)
        if (!empty($validated['skills_with_experience'])) {
            $skills = json_decode($validated['skills_with_experience'], true);
            if (is_array($skills) && count($skills) > 0) {
                $user->skills_with_experience = $skills;
            }
        }

        $user->save();
        Log::info('Onboarding step5: text data persisted', [
            'user_id' => $user->id,
            'title'   => $user->professional_title,
            'skills'  => count($user->skills_with_experience ?? []),
        ]);

        $user->syncSkillsFromExperience();
    }
}

