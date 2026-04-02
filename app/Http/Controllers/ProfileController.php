<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\User;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct()
    {
        // Controller initialized
    }

    /**
     * Display the user's profile form.
     * Optimized: Only loads necessary relationships and caches profile completion.
     */
    public function edit(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        // Proactive redirection to specialized edit pages
        if ($user->user_type === 'employer') {
            return redirect()->route('employer.profile.edit');
        }

        if ($user->user_type === 'gig_worker') {
            return redirect()->route('gig-worker.profile.edit');
        }

        // Profile edit logic for general users (Fallback)
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Convert a stored '/supabase/...' path to a browser-accessible URL.
     * Files are served through the Supabase proxy at /storage/supabase/{path}.
     */
    private function supabaseUrl(?string $stored): ?string
    {
        if (!$stored || !is_string($stored)) {
            return null;
        }
        $stored = trim($stored);
        if ($stored === '') {
            return null;
        }
        // Already a full URL (e.g. legacy or external)
        if (str_starts_with($stored, 'http://') || str_starts_with($stored, 'https://')) {
            return $stored;
        }
        // Local public disk (fallback when Supabase is unavailable)
        if (str_starts_with($stored, '/storage/') && !str_starts_with($stored, '/storage/supabase/')) {
            return url($stored);
        }
        // Strip the leading /supabase/ prefix and build the proxy URL
        $path = ltrim(str_replace('/supabase/', '', $stored), '/');
        if ($path === '') {
            return null;
        }
        return url('/storage/supabase/' . $path);
    }

    /**
     * Remove a previously stored profile picture or resume from Supabase or local public disk.
     */
    private function deleteGigWorkerStoredFile(?string $stored): void
    {
        if (!$stored || !is_string($stored)) {
            return;
        }
        $stored = trim($stored);
        if ($stored === '') {
            return;
        }
        if (str_starts_with($stored, '/supabase/')) {
            $oldPath = str_replace('/supabase/', '', $stored);
            Storage::disk('supabase')->delete($oldPath);

            return;
        }
        if (str_starts_with($stored, '/storage/') && !str_starts_with($stored, '/storage/supabase/')) {
            $rel = ltrim(substr($stored, strlen('/storage/')), '/');
            if ($rel !== '') {
                Storage::disk('public')->delete($rel);
            }
        }
    }

    /**
     * Show the gig worker's own profile page.
     */
    public function gigWorkerProfile(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $user->refresh();

        if ($user->user_type !== 'gig_worker') {
            return redirect()->route('profile.edit');
        }

        $rawPicture = $user->profile_picture ?? $user->profile_photo;

        return Inertia::render('Profile/GigWorkerProfile', [
            'user'   => [
                'id'                     => $user->id,
                'name'                   => $user->first_name . ' ' . $user->last_name,
                'first_name'             => $user->first_name,
                'last_name'              => $user->last_name,
                'email'                  => $user->email,
                'profile_picture'        => $this->supabaseUrl($rawPicture),
                'professional_title'     => $user->professional_title,
                'bio'                    => $user->bio,
                'hourly_rate'            => $user->hourly_rate,
                'skills_with_experience' => $user->skills_with_experience ?? [],
                'portfolio_link'         => $user->portfolio_link,
                'resume_file'            => $this->supabaseUrl($user->resume_file),
                'profile_completed'      => $user->profile_completed,
                'location'               => trim(($user->city ?? '') . ($user->country ? ', ' . $user->country : '')),
                'country'                => $user->country,
                'city'                   => $user->city,
                'id_verification_status' => $user->id_verification_status,
            ],
            'pastProjects' => $user->freelancerProjects()
                ->with([
                    'employer:id,first_name,last_name,profile_picture',
                    'job:id,title',
                    'reviews' => fn ($q) => $q->where('reviewer_id', $user->id)->limit(1),
                ])
                ->whereIn('status', ['completed', 'active'])
                ->latest()
                ->limit(5)
                ->get(),
            'status' => session('status'),
        ]);
    }

    /**
     * Store job context in session and redirect to clean gig worker profile URL.
     * Used when employer clicks "View Profile" from AI Match so the address bar shows /gig-worker/{id} only.
     */
    public function storeGigWorkerProfileContext(Request $request, User $user): RedirectResponse
    {
        if ($user->user_type !== 'gig_worker') {
            abort(404, 'Gig worker profile not found.');
        }

        $ctx = $request->query('ctx');
        if ($ctx && is_string($ctx)) {
            try {
                $decrypted = decrypt($ctx);
                if (is_array($decrypted) && isset($decrypted['job_id'])) {
                    $request->session()->put('profile_job_context', [
                        'user_id' => $user->id,
                        'job_id' => $decrypted['job_id'],
                        'job_title' => (string) ($decrypted['job_title'] ?? ''),
                        'job_budget' => (string) ($decrypted['job_budget'] ?? 'Negotiable'),
                    ]);
                }
            } catch (\Throwable $e) {
                // Invalid token; continue without context
            }
        }

        return redirect()->route('gig-worker.profile.show', $user);
    }

    /**
     * Show another gig worker's profile (e.g. from AI Match "View Profile").
     * Authenticated users can view; employers see "Hire Me" and no edit controls.
     * Job context can come from session (set by storeGigWorkerProfileContext) or from ?ctx=.
     */
    public function showGigWorker(Request $request, User $user): Response|RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return redirect()->route('gig-worker.profile');
        }

        if ($user->user_type !== 'gig_worker') {
            abort(404, 'Gig worker profile not found.');
        }

        $rawPicture = $user->profile_picture ?? $user->profile_photo;
        $skillsWithExperience = $user->skills_with_experience;
        $skillsArray = is_array($skillsWithExperience) ? $skillsWithExperience : [];

        $jobContext = null;
        // Prefer context stored in session (from /gig-worker/{id}/view?ctx=... redirect) for a clean URL
        $stored = $request->session()->get('profile_job_context');
        if (is_array($stored) && isset($stored['user_id']) && (int) $stored['user_id'] === (int) $user->id) {
            $jobContext = [
                'job_id' => (string) ($stored['job_id'] ?? ''),
                'job_title' => (string) ($stored['job_title'] ?? ''),
                'job_budget' => (string) ($stored['job_budget'] ?? 'Negotiable'),
            ];
            $request->session()->forget('profile_job_context');
        } else {
            $ctx = $request->query('ctx');
            if ($ctx && is_string($ctx)) {
                try {
                    $decrypted = decrypt($ctx);
                    if (is_array($decrypted) && isset($decrypted['job_id'])) {
                        $jobContext = [
                            'job_id' => (string) $decrypted['job_id'],
                            'job_title' => (string) ($decrypted['job_title'] ?? ''),
                            'job_budget' => (string) ($decrypted['job_budget'] ?? 'Negotiable'),
                        ];
                    }
                } catch (\Throwable $e) {
                    // Invalid or expired token; leave jobContext null
                }
            }
        }

        return Inertia::render('Profile/GigWorkerProfile', [
            'user'   => [
                'id'                     => $user->id,
                'name'                   => $user->first_name . ' ' . $user->last_name,
                'first_name'             => $user->first_name,
                'last_name'              => $user->last_name,
                'email'                  => $user->email,
                'profile_picture'        => $this->supabaseUrl($rawPicture),
                'professional_title'     => $user->professional_title,
                'bio'                    => $user->bio,
                'hourly_rate'            => $user->hourly_rate,
                'skills_with_experience' => $skillsArray,
                'portfolio_link'         => $user->portfolio_link,
                'resume_file'            => $this->supabaseUrl($user->resume_file),
                'profile_completed'      => $user->profile_completed,
                'location'               => trim(($user->city ?? '') . ($user->country ? ', ' . $user->country : '')),
                'country'                => $user->country,
                'city'                   => $user->city,
                'id_verification_status' => $user->id_verification_status,
            ],
            'pastProjects' => $user->freelancerProjects()
                ->with([
                    'employer:id,first_name,last_name,profile_picture',
                    'job:id,title',
                    'reviews' => fn ($q) => $q->where('reviewer_id', $user->id)->limit(1),
                ])
                ->whereIn('status', ['completed', 'active'])
                ->latest()
                ->limit(5)
                ->get(),
            'status' => session('status'),
            'jobContext' => $jobContext,
        ]);
    }

    /**
     * Fetch Open Graph / meta data for a URL (for link preview).
     * Returns title, description, image, site_name for automatic link preview cards.
     */
    public function linkPreview(Request $request)
    {
        $request->validate(['url' => 'required|url']);

        $url = $request->input('url');
        if (!preg_match('#^https?://#i', $url)) {
            return response()->json(['error' => 'Invalid URL scheme'], 422);
        }

        try {
            $response = Http::timeout(8)
                ->withHeaders(['User-Agent' => 'WorkWise-LinkPreview/1.0'])
                ->get($url);

            if (!$response->successful()) {
                return response()->json([
                    'title' => null,
                    'description' => null,
                    'image' => null,
                    'site_name' => null,
                    'url' => $url,
                ]);
            }

            $html = $response->body();
            $title = $this->extractMeta($html, 'og:title')
                ?? $this->extractMeta($html, 'twitter:title')
                ?? $this->extractTitleTag($html);
            $description = $this->extractMeta($html, 'og:description')
                ?? $this->extractMeta($html, 'twitter:description')
                ?? $this->extractMetaName($html, 'description');
            $image = $this->extractMeta($html, 'og:image')
                ?? $this->extractMeta($html, 'twitter:image');
            $siteName = $this->extractMeta($html, 'og:site_name');

            if ($image && !preg_match('#^https?://#i', $image)) {
                $parsed = parse_url($url);
                $base = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? '');
                $image = $base . ($image[0] === '/' ? '' : '/') . ltrim($image, '/');
            }

            return response()->json([
                'title' => $title ? trim($title) : null,
                'description' => $description ? trim($description) : null,
                'image' => $image ? trim($image) : null,
                'site_name' => $siteName ? trim($siteName) : null,
                'url' => $url,
            ]);
        } catch (\Exception $e) {
            Log::warning('Link preview fetch failed: ' . $e->getMessage(), ['url' => $url]);
            return response()->json([
                'title' => null,
                'description' => null,
                'image' => null,
                'site_name' => null,
                'url' => $url,
            ]);
        }
    }

    private function extractMeta(string $html, string $property): ?string
    {
        if (preg_match('#<meta\s+[^>]*property\s*=\s*["\']' . preg_quote($property, '#') . '["\'][^>]*content\s*=\s*["\']([^"\']+)["\']#i', $html, $m)) {
            return $m[1];
        }
        if (preg_match('#<meta\s+[^>]*content\s*=\s*["\']([^"\']+)["\'][^>]*property\s*=\s*["\']' . preg_quote($property, '#') . '["\']#i', $html, $m)) {
            return $m[1];
        }
        return null;
    }

    private function extractMetaName(string $html, string $name): ?string
    {
        if (preg_match('#<meta\s+[^>]*name\s*=\s*["\']' . preg_quote($name, '#') . '["\'][^>]*content\s*=\s*["\']([^"\']+)["\']#i', $html, $m)) {
            return $m[1];
        }
        if (preg_match('#<meta\s+[^>]*content\s*=\s*["\']([^"\']+)["\'][^>]*name\s*=\s*["\']' . preg_quote($name, '#') . '["\']#i', $html, $m)) {
            return $m[1];
        }
        return null;
    }

    private function extractTitleTag(string $html): ?string
    {
        if (preg_match('#<title[^>]*>([^<]+)</title>#i', $html, $m)) {
            return $m[1];
        }
        return null;
    }

    /**
     * Show the gig worker profile EDIT form.
     */
    public function editGigWorker(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->user_type !== 'gig_worker') {
            return redirect()->route('profile.edit');
        }

        $rawPicture = $user->profile_picture ?? $user->profile_photo;

        return Inertia::render('Profile/GigWorkerEdit', [
            'user' => [
                'id'                     => $user->id,
                'name'                   => $user->first_name . ' ' . $user->last_name,
                'first_name'             => $user->first_name,
                'last_name'              => $user->last_name,
                'email'                  => $user->email,
                'profile_picture'        => $this->supabaseUrl($rawPicture),
                'professional_title'     => $user->professional_title,
                'bio'                    => $user->bio,
                'hourly_rate'            => $user->hourly_rate,
                'skills_with_experience' => $user->skills_with_experience ?? [],
                'portfolio_link'         => $user->portfolio_link,
                'resume_file'            => $this->supabaseUrl($user->resume_file),
                'resume_file_name'       => $user->resume_file ? basename($user->resume_file) : null,
                'country'                => $user->country,
                'city'                   => $user->city,
            ],
            'status' => session('status'),
        ]);
    }

    /**
     * Handle gig worker profile update (photo + resume uploads + text fields).
     */
    public function updateGigWorker(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->user_type !== 'gig_worker') {
            return redirect()->route('profile.edit');
        }

        // #region agent log
        $agentLogPath = base_path('debug-82ff5d.log');
        @file_put_contents($agentLogPath, json_encode([
            'sessionId' => '82ff5d',
            'runId' => 'initial',
            'hypothesisId' => 'H2',
            'location' => 'ProfileController::updateGigWorker',
            'message' => 'updateGigWorker entry',
            'data' => [
                'hasProfilePicture' => $request->hasFile('profile_picture'),
                'profilePictureSize' => $request->hasFile('profile_picture') ? $request->file('profile_picture')->getSize() : null,
                'profilePictureMime' => $request->hasFile('profile_picture') ? $request->file('profile_picture')->getMimeType() : null,
            ],
            'timestamp' => (int) (microtime(true) * 1000),
        ]) . "\n", FILE_APPEND | LOCK_EX);
        // #endregion

        $validated = $request->validate([
            'first_name'             => 'required|string|max:255',
            'last_name'              => 'required|string|max:255',
            'professional_title'     => 'nullable|string|max:255',
            'bio'                    => 'nullable|string|max:1000',
            'hourly_rate'            => 'nullable|numeric|min:0|max:99999',
            'portfolio_link'         => 'nullable|string|max:500',
            'skills_with_experience' => 'nullable|string', // sent as JSON string
            'country'                => 'nullable|string|max:255|in:Philippines',
            'city'                   => 'nullable|string|max:255',
            'profile_picture'        => 'nullable|image|mimes:jpeg,png,gif,webp|max:5120',
            'resume_file'            => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ], [
            'profile_picture.image'  => 'The profile picture must be an image (JPEG, PNG, GIF, or WebP).',
            'profile_picture.mimes'  => 'The profile picture must be a JPEG, PNG, GIF, or WebP file.',
            'profile_picture.max'    => 'The profile picture must not be larger than 5MB.',
        ]);

        // ── Profile picture upload ─────────────────────────────────────────
        if ($request->hasFile('profile_picture')) {
            try {
                $this->deleteGigWorkerStoredFile($user->profile_picture ?? $user->profile_photo);
                $path = Storage::disk('supabase')->putFile('profiles/' . $user->id, $request->file('profile_picture'));
                if ($path) {
                    $user->profile_picture = '/supabase/' . $path;
                    $user->profile_photo = '/supabase/' . $path;
                    // #region agent log
                    @file_put_contents($agentLogPath, json_encode([
                        'sessionId' => '82ff5d',
                        'runId' => 'post-fix',
                        'hypothesisId' => 'H2',
                        'location' => 'ProfileController::updateGigWorker',
                        'message' => 'profile picture saved supabase',
                        'data' => ['user_id' => $user->id],
                        'timestamp' => (int) (microtime(true) * 1000),
                    ]) . "\n", FILE_APPEND | LOCK_EX);
                    // #endregion
                } else {
                    // #region agent log
                    @file_put_contents($agentLogPath, json_encode([
                        'sessionId' => '82ff5d',
                        'runId' => 'initial',
                        'hypothesisId' => 'H2',
                        'location' => 'ProfileController::updateGigWorker',
                        'message' => 'supabase putFile returned empty path',
                        'data' => ['user_id' => $user->id],
                        'timestamp' => (int) (microtime(true) * 1000),
                    ]) . "\n", FILE_APPEND | LOCK_EX);
                    // #endregion
                    Log::warning('GigWorkerEdit: Supabase profile picture upload returned empty; using public disk', [
                        'user_id' => $user->id,
                    ]);
                    $localPath = $request->file('profile_picture')->store('profiles/' . $user->id, 'public');
                    if (!$localPath) {
                        throw new \RuntimeException('Public disk profile picture store failed');
                    }
                    $user->profile_picture = '/storage/' . str_replace('\\', '/', $localPath);
                    $user->profile_photo = '/storage/' . str_replace('\\', '/', $localPath);
                    // #region agent log
                    @file_put_contents($agentLogPath, json_encode([
                        'sessionId' => '82ff5d',
                        'runId' => 'post-fix',
                        'hypothesisId' => 'H2',
                        'location' => 'ProfileController::updateGigWorker',
                        'message' => 'profile picture saved public fallback',
                        'data' => ['user_id' => $user->id, 'path' => $localPath],
                        'timestamp' => (int) (microtime(true) * 1000),
                    ]) . "\n", FILE_APPEND | LOCK_EX);
                    // #endregion
                }
            } catch (ValidationException $e) {
                throw $e;
            } catch (\Exception $e) {
                // #region agent log
                @file_put_contents($agentLogPath, json_encode([
                    'sessionId' => '82ff5d',
                    'runId' => 'initial',
                    'hypothesisId' => 'H2',
                    'location' => 'ProfileController::updateGigWorker',
                    'message' => 'profile picture upload exception',
                    'data' => ['exception' => get_class($e), 'error' => $e->getMessage()],
                    'timestamp' => (int) (microtime(true) * 1000),
                ]) . "\n", FILE_APPEND | LOCK_EX);
                // #endregion
                Log::error('GigWorkerEdit: profile picture upload failed: ' . $e->getMessage(), ['user_id' => $user->id]);
                throw ValidationException::withMessages([
                    'profile_picture' => 'Profile picture upload failed. Please check your connection and try again, or use a smaller image.',
                ]);
            }
        }

        // ── Resume upload ─────────────────────────────────────────────────
        if ($request->hasFile('resume_file')) {
            try {
                $this->deleteGigWorkerStoredFile($user->resume_file);
                $path = Storage::disk('supabase')->putFile('resumes/' . $user->id, $request->file('resume_file'));
                if ($path) {
                    $user->resume_file = '/supabase/' . $path;
                } else {
                    Log::warning('GigWorkerEdit: Supabase resume upload returned empty; using public disk', [
                        'user_id' => $user->id,
                    ]);
                    $localPath = $request->file('resume_file')->store('resumes/' . $user->id, 'public');
                    if ($localPath) {
                        $user->resume_file = '/storage/' . $localPath;
                    }
                }
            } catch (\Exception $e) {
                Log::error('GigWorkerEdit: resume upload failed (non-fatal): ' . $e->getMessage());
            }
        }

        // ── Skills JSON ───────────────────────────────────────────────────
        if (!empty($validated['skills_with_experience'])) {
            $skills = json_decode($validated['skills_with_experience'], true);
            $user->skills_with_experience = is_array($skills) ? $skills : [];
        } else {
            $user->skills_with_experience = [];
        }

        // ── Text fields ───────────────────────────────────────────────────
        $user->first_name         = $validated['first_name'];
        $user->last_name          = $validated['last_name'];
        $user->professional_title = $validated['professional_title'] ?? null;
        $user->bio                = $validated['bio'] ?? null;
        $user->hourly_rate        = $validated['hourly_rate'] ?? null;
        $user->portfolio_link     = $validated['portfolio_link'] ?? null;
        $user->country            = $validated['country'] ?? null;
        $user->city               = $validated['city'] ?? null;
        $user->save();

        $this->incrementFraudProfileChangeCount($user);

        $user->syncSkillsFromExperience();

        return redirect()->route('gig-worker.profile')->with('status', 'profile-updated');
    }

    /**
     * Show the employer's own profile page.
     */
    public function employerProfile(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $user->refresh();

        if ($user->user_type !== 'employer') {
            return redirect()->route('profile.edit');
        }

        $rawPicture = $user->profile_picture ?? $user->profile_photo;

        // Calculate job statistics
        $totalJobsPosted = $user->postedJobs()->count();
        $totalSpent = $user->paymentsMade()->where('status', 'completed')->sum('amount');
        
        $hiredJobsCount = $user->postedJobs()->whereHas('projects', function($q) {
            $q->whereIn('status', ['active', 'completed']);
        })->count();
        
        $hireRate = $totalJobsPosted > 0 ? round(($hiredJobsCount / $totalJobsPosted) * 100) : 0;

        return Inertia::render('Profile/EmployerProfile', [
            'user' => [
                'id' => $user->id,
                'name' => $user->first_name . ' ' . $user->last_name,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'company_name' => $user->company_name,
                'company_website' => $user->company_website,
                'industry' => $user->industry,
                'company_size' => $user->company_size,
                'bio' => $user->bio,
                'company_description' => $user->company_description,
                'profile_picture' => $this->supabaseUrl($rawPicture),
                'location' => $user->city . ($user->country ? ', ' . $user->country : ''),
                'joined_date' => $user->created_at->format('M Y'),
                'profile_completed' => $user->profile_completed,
                'id_verification_status' => $user->id_verification_status,
            ],
            'stats' => [
                'jobs_posted' => $totalJobsPosted,
                'total_spent' => number_format((float)$totalSpent, 2),
                'hire_rate' => $hireRate . '%',
            ],
            'activeJobs' => $user->postedJobs()
                ->withCount('bids')
                ->where('status', 'open')
                ->latest()
                ->limit(5)
                ->get(),
            'pastProjects' => $user->employerProjects()
                ->with([
                    'gigWorker:id,first_name,last_name,profile_picture',
                    'job:id,title',
                    'reviews' => fn ($q) => $q->where('reviewer_id', $user->id)->limit(1),
                ])
                ->where('status', 'completed')
                ->latest()
                ->limit(5)
                ->get(),
            'status' => session('status'),
        ]);
    }

    /**
     * Show the employer profile EDIT form.
     */
    public function editEmployer(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->user_type !== 'employer') {
            return redirect()->route('profile.edit');
        }

        $rawPicture = $user->profile_picture ?? $user->profile_photo;

        return Inertia::render('Profile/EmployerEdit', [
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'company_name' => $user->company_name,
                'industry' => $user->industry,
                'company_size' => $user->company_size,
                'company_website' => $user->company_website,
                'bio' => $user->bio,
                'company_description' => $user->company_description,
                'profile_picture' => $this->supabaseUrl($rawPicture),
                'country' => $user->country,
                'city' => $user->city,
                'street_address' => $user->street_address,
                'postal_code' => $user->postal_code,
            ],
            'status' => session('status'),
        ]);
    }

    /**
     * Handle employer profile update.
     */
    public function updateEmployer(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->user_type !== 'employer') {
            return redirect()->route('profile.edit');
        }

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'company_name' => 'nullable|string|max:255',
            'industry' => 'nullable|string|max:255',
            'company_size' => 'nullable|string|max:255',
            'company_website' => 'nullable|url|max:255',
            'bio' => 'nullable|string|max:1000',
            'company_description' => 'nullable|string|max:2000',
            'profile_picture' => 'nullable|image|mimes:jpeg,png,gif,webp|max:5120',
            'country' => 'nullable|string|max:255|in:Philippines',
            'city' => 'nullable|string|max:255',
            'street_address' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:255',
        ]);

        // Handle profile picture (Company Logo) upload
        if ($request->hasFile('profile_picture')) {
            try {
                if ($user->profile_picture) {
                    $pic = $user->profile_picture;
                    if (str_starts_with((string) $pic, '/supabase/')) {
                        $oldPath = str_replace('/supabase/', '', $pic);
                        Storage::disk('supabase')->delete($oldPath);
                    } elseif (str_starts_with((string) $pic, '/storage/') && !str_starts_with((string) $pic, '/storage/supabase/')) {
                        $rel = ltrim(substr((string) $pic, strlen('/storage/')), '/');
                        if ($rel !== '') {
                            Storage::disk('public')->delete($rel);
                        }
                    }
                }
                $path = Storage::disk('supabase')->putFile('profiles/' . $user->id, $request->file('profile_picture'));
                if ($path) {
                    $user->profile_picture = '/supabase/' . $path;
                    $user->profile_photo = '/supabase/' . $path;
                } else {
                    $localPath = $request->file('profile_picture')->store('profiles/' . $user->id, 'public');
                    if (!$localPath) {
                        throw new \RuntimeException('Public disk profile picture store failed');
                    }
                    $user->profile_picture = '/storage/' . str_replace('\\', '/', $localPath);
                    $user->profile_photo = $user->profile_picture;
                }
            } catch (\Exception $e) {
                Log::error('EmployerEdit: profile picture upload failed: ' . $e->getMessage());
                return back()->with('error', 'Failed to upload profile picture.');
            }
        }

        // Text fields
        $user->first_name = $validated['first_name'];
        $user->last_name = $validated['last_name'];
        $user->email = $validated['email'];
        $user->company_name = $validated['company_name'] ?? null;
        $user->industry = $validated['industry'] ?? null;
        $user->company_size = $validated['company_size'] ?? null;
        $user->company_website = $validated['company_website'] ?? null;
        $user->bio = $validated['bio'] ?? null;
        $user->company_description = $validated['company_description'] ?? null;
        $user->country = $validated['country'] ?? null;
        $user->city = $validated['city'] ?? null;
        $user->street_address = $validated['street_address'] ?? null;
        $user->postal_code = $validated['postal_code'] ?? null;
        
        $user->save();

        $this->incrementFraudProfileChangeCount($user);

        return redirect()->route('employer.profile')->with('status', 'profile-updated');
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        
        Log::info('Profile update started', [
            'user_id' => $user->id,
            'has_profile_picture' => $request->hasFile('profile_picture'),
            'has_profile_photo' => $request->hasFile('profile_photo'),
            'all_files' => array_keys($request->allFiles()),
        ]);
        
        $validated = $request->validated();

        // Handle profile picture upload to Supabase
        if ($request->hasFile('profile_picture')) {
            try {
                Log::info('Uploading profile picture to Supabase', ['user_id' => $user->id]);
                
                // Delete old profile picture from Supabase if it exists
                if ($user->profile_picture) {
                    try {
                        // Extract path from URL (remove '/supabase/' prefix if present)
                        $oldPath = str_replace('/supabase/', '', $user->profile_picture);
                        if (Storage::disk('supabase')->exists($oldPath)) {
                            Storage::disk('supabase')->delete($oldPath);
                            Log::info('Old profile picture deleted from Supabase', [
                                'user_id' => $user->id,
                                'old_path' => $oldPath
                            ]);
                        }
                    } catch (\Exception $deleteException) {
                        // Log but don't fail the upload if old file deletion fails
                        Log::warning('Failed to delete old profile picture: ' . $deleteException->getMessage(), [
                            'user_id' => $user->id
                        ]);
                    }
                }
                
                // Upload new profile picture to Supabase
                $path = Storage::disk('supabase')->putFile('profiles/' . $user->id, $request->file('profile_picture'));
                
                if ($path) {
                    // Use app proxy URL as fallback while Supabase DNS propagates
                    $validated['profile_picture'] = '/supabase/' . $path;
                    // Also sync to profile_photo for backward compatibility
                    $validated['profile_photo'] = '/supabase/' . $path;
                    
                    Log::info('Profile picture uploaded successfully', [
                        'user_id' => $user->id,
                        'path' => $path,
                        'url' => $validated['profile_picture']
                    ]);
                } else {
                    Log::error('Profile picture upload returned null path', ['user_id' => $user->id]);
                    return Redirect::route('profile.edit')->with('error', 'Failed to upload profile picture. Please try again.');
                }
            } catch (\Exception $e) {
                Log::error('Profile picture upload failed: ' . $e->getMessage(), [
                    'user_id' => $user->id,
                    'exception' => get_class($e),
                    'trace' => $e->getTraceAsString()
                ]);
                return Redirect::route('profile.edit')->with('error', 'Failed to upload profile picture. Please try again.');
            }
        } else {
            // Remove profile_picture from validated data if no file uploaded
            unset($validated['profile_picture']);
            // Don't unset profile_photo if it already exists (preserve existing)
        }

        // Handle legacy profile photo upload (migrate to Supabase)
        if ($request->hasFile('profile_photo')) {
            try {
                // Upload new profile photo to Supabase
                $path = Storage::disk('supabase')->putFile('profiles/' . $user->id, $request->file('profile_photo'));
                
                if ($path) {
                    // Use app proxy URL as fallback while Supabase DNS propagates
                    $validated['profile_photo'] = '/supabase/' . $path;
                } else {
                    return Redirect::route('profile.edit')->with('error', 'Failed to upload profile photo. Please try again.');
                }
            } catch (\Exception $e) {
                Log::error('Profile photo upload failed: ' . $e->getMessage());
                return Redirect::route('profile.edit')->with('error', 'Failed to upload profile photo.');
            }
        } else {
            // Remove profile_photo from validated data if no file uploaded
            unset($validated['profile_photo']);
        }

        // Handle resume file upload to Supabase
        if ($request->hasFile('resume_file')) {
            try {
                Log::info('Uploading resume file to Supabase', ['user_id' => $user->id]);
                
                // Delete old resume file from Supabase if it exists
                if ($user->resume_file) {
                    try {
                        // Extract path from URL (remove '/supabase/' prefix if present)
                        $oldPath = str_replace('/supabase/', '', $user->resume_file);
                        if (Storage::disk('supabase')->exists($oldPath)) {
                            Storage::disk('supabase')->delete($oldPath);
                            Log::info('Old resume file deleted from Supabase', [
                                'user_id' => $user->id,
                                'old_path' => $oldPath
                            ]);
                        }
                    } catch (\Exception $deleteException) {
                        Log::warning('Failed to delete old resume file: ' . $deleteException->getMessage(), [
                            'user_id' => $user->id
                        ]);
                    }
                }
                
                // Upload new resume file to Supabase
                // Use the same path structure as onboarding: portfolios/{user_id}/documents
                $path = Storage::disk('supabase')->putFile('portfolios/' . $user->id . '/documents', $request->file('resume_file'));
                
                if ($path) {
                    // Use app proxy URL as fallback while Supabase DNS propagates
                    $validated['resume_file'] = '/supabase/' . $path;
                    
                    Log::info('Resume file uploaded successfully', [
                        'user_id' => $user->id,
                        'path' => $path,
                        'url' => $validated['resume_file']
                    ]);
                } else {
                    Log::error('Resume file upload returned null path', ['user_id' => $user->id]);
                    return Redirect::route('profile.edit')->with('error', 'Failed to upload resume file. Please try again.');
                }
            } catch (\Exception $e) {
                Log::error('Resume file upload failed: ' . $e->getMessage(), [
                    'user_id' => $user->id,
                    'exception' => get_class($e),
                    'trace' => $e->getTraceAsString()
                ]);
                return Redirect::route('profile.edit')->with('error', 'Failed to upload resume file. Please try again.');
            }
        } else {
            // Remove resume_file from validated data if no file uploaded
            unset($validated['resume_file']);
        }

        // Handle skills array properly
        if (isset($validated['skills'])) {
            if (is_string($validated['skills'])) {
                // If skills is a string, convert to array
                $validated['skills'] = array_filter(array_map('trim', explode(',', $validated['skills'])));
            } elseif (is_array($validated['skills'])) {
                // If skills is already an array, clean it up
                $validated['skills'] = array_filter(array_map('trim', $validated['skills']));
            }
        }

        // Handle languages array properly
        if (isset($validated['languages'])) {
            if (is_string($validated['languages'])) {
                // If languages is a string, convert to array
                $validated['languages'] = array_filter(array_map('trim', explode(',', $validated['languages'])));
            } elseif (is_array($validated['languages'])) {
                // If languages is already an array, clean it up
                $validated['languages'] = array_filter(array_map('trim', $validated['languages']));
            }
        }

        // Update only provided fields (partial update support)
        try {
            // Track which fields were updated for logging
            $updatedFields = [];
            
            // Handle profile picture separately (if provided)
            if (isset($validated['profile_picture'])) {
                $user->profile_picture = $validated['profile_picture'];
                $user->profile_photo = $validated['profile_picture']; // Sync both fields
                $updatedFields[] = 'profile_picture';
                $updatedFields[] = 'profile_photo';
                unset($validated['profile_picture']);
                unset($validated['profile_photo']);
            }
            
            // Update only the fields that were provided (partial update)
            foreach ($validated as $key => $value) {
                // Check if field exists and is fillable
                if ($user->isFillable($key)) {
                    // Only update if the value is different
                    $currentValue = $user->getAttribute($key);
                    if ($currentValue != $value) {
                        $user->setAttribute($key, $value);
                        $updatedFields[] = $key;
                    }
                }
            }

            // Handle email verification reset
            if (in_array('email', $updatedFields) && $user->isDirty('email')) {
                $user->email_verified_at = null;
            }


            // Only save if there are actual changes
            if ($user->isDirty()) {
                // Use select only dirty attributes to minimize database query
                $user->save();

                $this->incrementFraudProfileChangeCount($user);
                
                Log::info('Profile updated successfully (partial update)', [
                    'user_id' => $user->id,
                    'updated_fields' => $updatedFields,
                    'updated_count' => count($updatedFields),
                    'dirty_attributes' => array_keys($user->getDirty()),
                ]);
            } else {
                Log::info('Profile update skipped - no changes detected', [
                    'user_id' => $user->id,
                ]);
            }

            // Use Inertia redirect to preserve state and avoid full page refresh
            return Redirect::route('profile.edit')
                ->with('status', 'profile-updated')
                ->with('message', 'Profile updated successfully!');
        } catch (\Exception $e) {
            Log::error('Profile update failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString()
            ]);
            return Redirect::route('profile.edit')->with('error', 'Failed to update profile. Please try again.');
        }
    }

    /**
     * Calculate profile completion status (deprecated - use ProfileCompletionService instead)
     * This method is kept for backward compatibility but should not be used directly.
     * 
     * @deprecated Use ProfileCompletionService::calculateCompletion() instead
     */
    private function calculateProfileCompletion($user): bool
    {
        return false;
    }

    /**
     * Increment fraud detection profile-change counter for the user (TTL 1 hour).
     * Used by FraudDetectionMiddleware to detect rapid profile updates.
     */
    private function incrementFraudProfileChangeCount(User $user): void
    {
        $key = 'fraud_profile_changes_' . $user->id;
        $count = (int) Cache::get($key, 0) + 1;
        Cache::put($key, $count, now()->addHour());
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }


    /**
     * Display an employer's public profile
     * 
     * DATA CONSISTENCY VERIFICATION (Requirement 9.1-9.6):
     * - All user profile data comes directly from users table (no mock data)
     * - Company information fetched from employer onboarding fields in database
     * - Reviews fetched from reviews table with reviewer relationships
     * - Job statistics calculated from gig_jobs and projects tables
     * - All data is real-time from database with no caching of profile content
     */
    public function showEmployer(User $user): Response|RedirectResponse
    {
        // Redirect to own profile edit if viewing own profile (Requirement 3.2)
        if ($user->id === auth()->id()) {
            return Redirect::route('profile.edit')
                ->with('message', 'You are viewing your own profile. You can edit it here.');
        }

        // Validate user is an employer (Requirement 3.2)
        if (!$user->isEmployer()) {
            abort(404, 'This user is not an employer or the profile does not exist.');
        }

        // Eager load relationships from database (always fresh data, no caching)
        // Reviews come from reviews table (Requirement 9.4)
        // Posted jobs come from gig_jobs table (Requirement 9.6)
        // Force fresh query to ensure latest reviews are displayed immediately after submission
        $user->load([
            'receivedReviews' => function ($query) {
                $query->with('reviewer:id,first_name,last_name,profile_picture')
                    ->latest()
                    ->limit(10);
            },
            'postedJobs' => function ($query) {
                $query->latest()
                    ->limit(5);
            }
        ]);

        // Calculate rating summary from actual review data (Requirement 9.4)
        // This ensures the rating summary is always up-to-date with the latest reviews
        $ratingSummary = $this->calculateRatingSummary($user->receivedReviews);

        // Calculate job statistics from database tables (Requirement 9.6)
        $jobStatistics = [
            'total_jobs_posted' => $user->postedJobs()->count(),
            'active_jobs' => $user->postedJobs()->where('status', 'open')->count(),
            'completed_projects' => $user->employerProjects()->where('status', 'completed')->count(),
        ];

        // All data passed to frontend comes from database (Requirement 9.1, 9.2)
        // - user: All fields from users table including company information
        // - reviews: From reviews table
        // - rating_summary: Calculated from real reviews
        // - job_statistics: Calculated from gig_jobs and projects tables
        return Inertia::render('Profiles/EmployerProfile', [
            'user' => $user, // All profile fields from users table (Requirement 9.1, 9.2, 9.6)
            'reviews' => $user->receivedReviews, // From reviews table (Requirement 9.4)
            'rating_summary' => $ratingSummary, // Calculated from real reviews (Requirement 9.4)
            'job_statistics' => $jobStatistics, // From gig_jobs and projects tables (Requirement 9.6)
        ]);
    }

    /**
     * Calculate rating summary from reviews collection
     * 
     * DATA CONSISTENCY: This method calculates ratings from actual review data
     * fetched from the reviews table (Requirement 9.4). No mock or placeholder
     * data is used - all calculations are based on real database records.
     * 
     * @param \Illuminate\Database\Eloquent\Collection $reviews
     * @return array
     */
    private function calculateRatingSummary($reviews): array
    {
        $totalReviews = $reviews->count();
        
        if ($totalReviews === 0) {
            return [
                'average' => 0,
                'count' => 0,
                'distribution' => [
                    5 => 0,
                    4 => 0,
                    3 => 0,
                    2 => 0,
                    1 => 0,
                ],
            ];
        }

        // Calculate average rating from actual review data (Requirement 9.4)
        $average = round($reviews->avg('rating'), 1);

        // Calculate distribution from actual review data (Requirement 9.4)
        $distribution = [
            5 => $reviews->where('rating', 5)->count(),
            4 => $reviews->where('rating', 4)->count(),
            3 => $reviews->where('rating', 3)->count(),
            2 => $reviews->where('rating', 2)->count(),
            1 => $reviews->where('rating', 1)->count(),
        ];

        return [
            'average' => $average,
            'count' => $totalReviews,
            'distribution' => $distribution,
        ];
    }

    /**
     * Proxy Supabase files through the application
     * This serves as a fallback while Supabase DNS propagates
     */
    public function proxySupabaseFile($path)
    {
        try {
            $disk = Storage::disk('supabase');
            
            if (!$disk->exists($path)) {
                abort(404);
            }

            $file = $disk->get($path);
            $mimeType = $disk->mimeType($path);
            
            return response($file, 200)
                ->header('Content-Type', $mimeType)
                ->header('Cache-Control', 'public, max-age=31536000')
                ->header('Access-Control-Allow-Origin', '*');
                
        } catch (\Exception $e) {
            Log::error('Supabase proxy failed: ' . $e->getMessage(), ['path' => $path]);
            abort(404);
        }
    }
}
