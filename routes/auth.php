<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\RoleSelectionController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Middleware\VerifyCsrfToken;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    // Role selection routes
    Route::get('role-selection', [RoleSelectionController::class, 'show'])
        ->name('role.selection');

    Route::post('role-selection', [RoleSelectionController::class, 'store'])
        ->withoutMiddleware([ValidateCsrfToken::class, VerifyCsrfToken::class])
        ->name('role.store');


    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');

    // Google OAuth routes (with security middleware)
    Route::get('auth/google', [GoogleAuthController::class, 'redirectToGoogle'])
        ->middleware('google.oauth.security')
        ->name('auth.google');
    
    Route::get('auth/google/callback', [GoogleAuthController::class, 'handleGoogleCallback'])
        ->middleware('google.oauth.security')
        ->name('auth.google.callback');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');

    // Google account management routes
    Route::post('auth/google/unlink', [GoogleAuthController::class, 'unlinkGoogle'])
        ->name('auth.google.unlink');
});

// Redirect authenticated users who try to access login (avoid shadowing GET /login)
Route::middleware('auth')->get('login-direct', function () {
    $user = auth()->user();
    if ($user && $user->isAdmin()) {
        return redirect()->route('admin.dashboard');
    }
    if ($user && $user->user_type === 'gig_worker') {
        return redirect()->route('jobs.index');
    }
    return redirect()->route('dashboard');
})->name('login.direct');
