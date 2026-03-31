<?php

namespace App\Http\Middleware;

use App\Models\GigJob;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Normalize storage URL to a relative path so img src works regardless of APP_URL/host.
     */
    private function normalizeStorageUrl(?string $url): ?string
    {
        if (empty($url)) {
            return null;
        }
        if (str_starts_with($url, 'http') && str_contains($url, '/storage/supabase/')) {
            $path = parse_url($url, PHP_URL_PATH);
            return $path ?: $url;
        }
        return $url;
    }

    /**
     * Convert a stored Supabase path (e.g. /supabase/profiles/...) to the proxy URL
     * served by the app at /storage/supabase/{path}. Already-absolute URLs are returned
     * as-is so legacy data or external URLs continue to work.
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
        if (str_starts_with($stored, 'http://') || str_starts_with($stored, 'https://')) {
            return $stored;
        }
        // Local public disk (fallback when Supabase is unavailable)
        if (str_starts_with($stored, '/storage/') && !str_starts_with($stored, '/storage/supabase/')) {
            return url($stored);
        }
        $path = ltrim(str_replace('/supabase/', '', $stored), '/');
        if ($path === '') {
            return null;
        }
        return url('/storage/supabase/' . $path);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = null;
        
        if ($request->user()) {
            $authenticatedUser = $request->user();
            
            // Base user fields
            $user = [
                'id' => $authenticatedUser->id,
                'first_name' => $authenticatedUser->first_name,
                'last_name' => $authenticatedUser->last_name,
                'email' => $authenticatedUser->email,
                'email_verified_at' => $authenticatedUser->email_verified_at,
                'user_type' => $authenticatedUser->user_type,
                'profile_photo' => $this->supabaseUrl($authenticatedUser->profile_photo) ?? $authenticatedUser->profile_photo,
                'profile_picture' => $this->supabaseUrl($authenticatedUser->profile_picture) ?? $authenticatedUser->profile_picture,
                'profile_picture_url' => $this->supabaseUrl($authenticatedUser->profile_picture ?? $authenticatedUser->profile_photo ?? $authenticatedUser->avatar),
                'avatar' => $authenticatedUser->avatar,
                'professional_title' => $authenticatedUser->professional_title,
                'is_admin' => $authenticatedUser->is_admin,
                'profile_completed' => $authenticatedUser->profile_completed,
                'profile_status' => $authenticatedUser->profile_status,
                
                // Common profile fields
                'phone' => $authenticatedUser->phone,
                'bio' => $authenticatedUser->bio,
                'country' => $authenticatedUser->country,
                'province' => $authenticatedUser->province,
                'municipality' => $authenticatedUser->municipality,
                'barangay' => $authenticatedUser->barangay,
                'street_address' => $authenticatedUser->street_address,
                'city' => $authenticatedUser->city,
                'postal_code' => $authenticatedUser->postal_code,
                
                // ID Verification fields
                'id_verification_status' => $authenticatedUser->id_verification_status,
                'id_verified_at' => $authenticatedUser->id_verified_at,
                'id_verification_required_by_admin' => (bool) ($authenticatedUser->id_verification_required_by_admin ?? false),
                'id_front_image' => $this->normalizeStorageUrl($authenticatedUser->id_front_image),
                'id_back_image' => $this->normalizeStorageUrl($authenticatedUser->id_back_image),
                
                // Gig worker fields
                'hourly_rate' => $authenticatedUser->hourly_rate,
                'broad_category' => $authenticatedUser->broad_category,
                'specific_services' => $authenticatedUser->specific_services,
                'skills_with_experience' => $authenticatedUser->skills_with_experience,
                'working_hours' => $authenticatedUser->working_hours,
                'timezone' => $authenticatedUser->timezone,
                'preferred_communication' => $authenticatedUser->preferred_communication,
                'availability_notes' => $authenticatedUser->availability_notes,
                'portfolio_link' => $authenticatedUser->portfolio_link,
                'resume_file' => $authenticatedUser->resume_file,
                
                // Employer/Client fields
                'company_name' => $authenticatedUser->company_name,
                'work_type_needed' => $authenticatedUser->work_type_needed,
                'budget_range' => $authenticatedUser->budget_range,
                'project_intent' => $authenticatedUser->project_intent,
                'company_size' => $authenticatedUser->company_size,
                'industry' => $authenticatedUser->industry,
                'company_website' => $authenticatedUser->company_website,
                'company_description' => $authenticatedUser->company_description,
                'primary_hiring_needs' => $authenticatedUser->primary_hiring_needs,
                'typical_project_budget' => $authenticatedUser->typical_project_budget,
                'typical_project_duration' => $authenticatedUser->typical_project_duration,
                'preferred_experience_level' => $authenticatedUser->preferred_experience_level,
                'hiring_frequency' => $authenticatedUser->hiring_frequency,
                'tax_id' => $authenticatedUser->tax_id,
            ];
        }

        $employerOpenJobsForNav = [];
        if ($request->user() && $request->user()->user_type === 'employer') {
            $employerOpenJobsForNav = GigJob::query()
                ->where('employer_id', $request->user()->id)
                ->where('status', 'open')
                ->where(function ($q) {
                    $q->where('hidden_by_admin', false)->orWhereNull('hidden_by_admin');
                })
                ->orderByDesc('created_at')
                ->limit(50)
                ->get(['id', 'title', 'created_at'])
                ->map(fn (GigJob $job) => [
                    'id' => $job->id,
                    'title' => $job->title,
                    'created_at' => $job->created_at?->toAtomString(),
                ])
                ->values()
                ->all();
        }

        return [
            ...parent::share($request),
            'csrf_token' => csrf_token(),
            'auth' => [
                'user' => $user,
                'needsEmailVerification' => $request->user() ? is_null($request->user()->email_verified_at) : false,
            ],
            'employerOpenJobsForNav' => $employerOpenJobsForNav,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
        ];
    }
}
