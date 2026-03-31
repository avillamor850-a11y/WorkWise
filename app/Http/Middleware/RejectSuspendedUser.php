<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RejectSuspendedUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->profile_status !== 'rejected') {
            return $next($request);
        }

        $message = 'Your account has been suspended. Please contact support.';

        if ($request->header('X-Inertia')) {
            return $this->logoutAndRedirectToLogin($request, $message);
        }

        if ($request->expectsJson() || $request->wantsJson()) {
            Auth::logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json(['message' => $message], 403);
        }

        return $this->logoutAndRedirectToLogin($request, $message);
    }

    private function logoutAndRedirectToLogin(Request $request, string $message): Response
    {
        Auth::logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return redirect()->route('login')->with('error', $message);
    }
}
