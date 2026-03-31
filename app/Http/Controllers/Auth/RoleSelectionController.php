<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleSelectionController extends Controller
{
    /**
     * Show the role selection page
     */
    public function show(): Response
    {
        return Inertia::render('Auth/RoleSelection');
    }

    /**
     * Handle role selection and redirect to registration.
     * Idempotent: repeated same user_type from same session does not create duplicate state.
     */
    public function store(Request $request)
    {
        \Log::info('RoleSelectionController::store called', [
            'request_data' => $request->all(),
            'session_id' => session()->getId()
        ]);

        $request->validate([
            'user_type' => 'required|in:gig_worker,employer'
        ]);

        $isDuplicate = session('selected_user_type') === $request->user_type;

        if (!$isDuplicate) {
            session(['selected_user_type' => $request->user_type]);
            \Log::info('Role stored in session', [
                'selected_user_type' => session('selected_user_type'),
                'session_id' => session()->getId()
            ]);
        }

        // Inertia uses XHR; expectsJson() is true, but we must redirect the visit — not return bare JSON.
        if (($request->expectsJson() || $request->wantsJson()) && ! $request->inertia()) {
            return response()->json([
                'status' => $isDuplicate ? 'already_selected' : 'ok',
                'user_type' => $request->user_type,
            ], 200);
        }

        return redirect()->route('register');
    }
}
