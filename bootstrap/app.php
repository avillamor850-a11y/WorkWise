<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            \App\Http\Middleware\RejectSuspendedUser::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->api(append: [
            \App\Http\Middleware\RejectSuspendedUser::class,
        ]);

        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'auth.redirect' => \App\Http\Middleware\AuthMiddleware::class,
            'employer' => \App\Http\Middleware\ClientMiddleware::class,
            'gig_worker' => \App\Http\Middleware\GigWorkerMiddleware::class,
            'google.oauth.security' => \App\Http\Middleware\GoogleOAuthSecurityMiddleware::class,
            'fraud.detection' => \App\Http\Middleware\FraudDetectionMiddleware::class,
            'require.id.verification' => \App\Http\Middleware\RequireIdVerificationMiddleware::class,
        ]);

        // Add essential web middleware for CSRF, sessions, etc.
        $middleware->web(prepend: [
            \App\Http\Middleware\TrustProxies::class,
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
