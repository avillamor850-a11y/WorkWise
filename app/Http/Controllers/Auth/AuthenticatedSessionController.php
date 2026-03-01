<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Notifications\VerifyEmailReminder;
use App\Services\FraudDetectionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();

        // Philippines-only: if login IP is not from Philippines, record Country Mismatch (does not block login)
        try {
            app(FraudDetectionService::class)->recordLoginGeographicCheck($user, $request);
        } catch (\Throwable $e) {
            // Do not block login on fraud check failure
        }

        // Notify unverified users to verify email via in-app notification
        if ($user && ! $user->hasVerifiedEmail()) {
            try {
                $actionUrl = url('/profile?tab=basic#verification');
                // Avoid flooding: send only if no unread reminder exists
                $hasUnreadReminder = $user->unreadNotifications()
                    ->where('type', VerifyEmailReminder::class)
                    ->exists();
                if (! $hasUnreadReminder) {
                    $user->notify(new VerifyEmailReminder($actionUrl));
                }
            } catch (\Throwable $e) {
                // Swallow notification errors to not block login
                \Log::warning('Failed to send VerifyEmailReminder notification', [
                    'user_id' => $user?->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Check if user is admin and redirect to admin dashboard
        if ($user && $user->isAdmin()) {
            return redirect()->intended(route('admin.dashboard'));
        }

        // Gig workers go to the jobs page after login
        if ($user && $user->isGigWorker()) {
            return redirect()->intended(route('jobs.index'));
        }

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
