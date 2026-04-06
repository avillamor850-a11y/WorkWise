<?php

use App\Http\Controllers\BidController;
use App\Http\Controllers\GigJobController;
use App\Http\Controllers\JobTemplateController;
use App\Http\Controllers\WorkerDiscoveryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\AIController;
use App\Http\Controllers\GigWorkerOnboardingController;
use App\Http\Controllers\EmployerOnboardingController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\AIRecommendationController;
use App\Http\Controllers\ClientWalletController;
use App\Http\Controllers\GigWorkerWalletController;
use App\Http\Controllers\DepositController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminReportController;
use App\Http\Controllers\AdminTransactionReportsController;
use App\Http\Controllers\Admin\AdminAnalyticsController;
use App\Http\Controllers\Admin\AdminDepositsController;
use App\Http\Controllers\AdminVerificationController;
use App\Http\Controllers\AdminIdVerificationController;
use App\Http\Controllers\AdminSettingsController;
use App\Http\Controllers\AdminFraudController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\EmployerDashboardController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\IdVerificationController;
use App\Http\Controllers\DebugController;
use App\Http\Controllers\ErrorLogController;
use App\Http\Controllers\SimpleTestController;
use App\Http\Controllers\AISkillController;
use App\Http\Controllers\Admin\SkillModerationController;
use App\Http\Controllers\UserHeartbeatController;

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Http\Controllers\Auth\SupabaseAuthController;

Route::post('/auth/supabase/callback', [SupabaseAuthController::class, 'callback'])->name('auth.supabase.callback');

Route::get('/', function () {
    // Check if user is authenticated
    if (Auth::check()) {
        $user = Auth::user();

        // Redirect admin users to admin dashboard
        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        // Redirect gig workers to jobs page
        if ($user->user_type === 'gig_worker') {
            return redirect()->route('jobs.index');
        }

        // For other authenticated users, show welcome page
        return Inertia::render('Welcome', [
            'canLogin' => false,
            'canRegister' => false,
            'laravelVersion' => Application::VERSION,
            'phpVersion' => PHP_VERSION,
        ]);
    }

    return Inertia::render('Welcome', [
        'canLogin' => true,
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    $user = Auth::user();

    if (!$user) {
        Log::error('Dashboard route accessed - User is null');
        return redirect('/login');
    }

    // Redirect admin users to admin dashboard
    if ($user->isAdmin()) {
        return redirect()->route('admin.dashboard');
    }

    // Redirect employers to employer dashboard
    if ($user->user_type === 'employer') {
        // #region agent log
        file_put_contents(base_path('debug-849b3f.log'), json_encode(['sessionId'=>'849b3f','hypothesisId'=>'H1,H4','location'=>'web.php dashboard closure','message'=>'redirect to employer.dashboard','data'=>['user_type'=>'employer'],'timestamp'=>round(microtime(true)*1000)])."\n", FILE_APPEND | LOCK_EX);
        // #endregion
        return redirect()->route('employer.dashboard');
    }

    Log::info('Dashboard route accessed', ['user' => $user->toArray()]);

    return Inertia::render('Dashboard', [
        'user' => $user,
        'debug' => [
            'authenticated' => Auth::check(),
            'user_id' => $user->id,
            'user_type' => $user->user_type,
        ]
    ]);
})->middleware(['auth'])->name('dashboard');


// Browse Freelancers Route
Route::get('/freelancers', function () {
    return Inertia::render('BrowseFreelancers', [
        'auth' => [
            'user' => Auth::user()
        ],
        'freelancers' => []
    ]);
})->middleware(['auth', 'verified'])->name('browse.freelancers');

// Employer Dashboard Route
Route::get('/employer/dashboard', [EmployerDashboardController::class, 'index'])
    ->middleware(['auth'])
    ->name('employer.dashboard');

// Search Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/api/search', [EmployerDashboardController::class, 'search'])->name('api.search');
    Route::get('/api/search/suggestions', [EmployerDashboardController::class, 'getSuggestions'])->name('api.search.suggestions');
    Route::get('/api/search/filters', [EmployerDashboardController::class, 'getFilters'])->name('api.search.filters');
});

// Export Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/api/export', [EmployerDashboardController::class, 'export'])->name('api.export');
    Route::get('/api/export/formats', [EmployerDashboardController::class, 'getExportFormats'])->name('api.export.formats');
    Route::get('/api/export/preview', [EmployerDashboardController::class, 'getExportPreview'])->name('api.export.preview');
});

// Test route to debug - old dashboard
Route::get('/test-dashboard', function () {
    $user = Auth::user();
    return Inertia::render('Dashboard', [
        'user' => $user,
        'debug' => [
            'authenticated' => Auth::check(),
            'user_id' => $user ? $user->id : null,
            'user_type' => $user ? $user->user_type : null,
        ]
    ]);
})->middleware(['auth'])->name('test.dashboard');

// Simple test route
Route::get('/test-simple', function () {
    return Inertia::render('TestDashboard');
})->name('test.simple');

// Test admin route (no auth required)
Route::get('/test-admin', function () {
    return Inertia::render('Admin/Dashboard', [
        'stats' => [
            'total_users' => 100,
            'total_gig_workers' => 50,
            'total_employers' => 50,
            'total_projects' => 25,
            'active_projects' => 10,
            'completed_projects' => 15,
            'total_reports' => 5,
            'pending_reports' => 2,
            'total_transactions' => 200,
            'platform_earnings' => 5000,
        ],
        'recentUsers' => [],
        'recentReports' => [],
        'recentProjects' => [],
        'recentActivities' => [
            [
                'title' => 'Test activity 1',
                'time' => '1 minute ago',
                'icon' => 'add',
                'color' => 'emerald'
            ],
            [
                'title' => 'Test activity 2',
                'time' => '5 minutes ago',
                'icon' => 'task_alt',
                'color' => 'pink'
            ]
        ]
    ]);
})->name('test.admin');

// Quick admin access for testing (bypass auth)
Route::get('/admin-quick', function () {
    // Create a temporary admin user for testing
    $adminUser = \App\Models\User::where('email', 'admin@workwise.com')->first();

    if ($adminUser) {
        Auth::login($adminUser);
        return redirect()->route('admin.dashboard');
    }

    return redirect('/login')->with('error', 'Admin user not found. Please run the AdminUserSeeder.');
})->name('admin.quick');

// Simple test route to check if basic routing works
Route::get('/test-basic', function () {
    return response()->json(['status' => 'ok', 'message' => 'Basic routing works!']);
})->name('test.basic');


// Debug user status
Route::get('/debug-user', function () {
    $user = Auth::user();
    return response()->json([
        'authenticated' => Auth::check(),
        'user' => $user ? [
            'id' => $user->id,
            'name' => $user->first_name . ' ' . $user->last_name,
            'email' => $user->email,
            'user_type' => $user->user_type,
            'is_admin' => $user->is_admin,
            'isAdmin()' => $user->isAdmin(),
        ] : null,
        'session' => session()->all(),
    ]);
})->middleware('auth');

// Protected job listings - requires authentication
Route::get('/jobs', [GigJobController::class, 'index'])->middleware(['auth.redirect'])->name('jobs.index');

Route::middleware(['auth', 'require.id.verification'])->group(function () {
    // Test route for Stripe configuration (remove after verification)
    Route::get('/test-stripe-config', function() {
        return response()->json([
            'stripe_key_exists' => !empty(config('stripe.key')),
            'stripe_secret_exists' => !empty(config('stripe.secret')),
            'stripe_webhook_exists' => !empty(config('stripe.webhook_secret')),
            'stripe_key_prefix' => substr(config('stripe.key') ?? '', 0, 10),
            'stripe_secret_prefix' => substr(config('stripe.secret') ?? '', 0, 10),
            'currency' => config('stripe.currency'),
            'services_stripe_key' => !empty(config('services.stripe.key')),
            'services_stripe_secret' => !empty(config('services.stripe.secret')),
            'app_currency' => config('app.currency'),
        ]);
    });

    // Onboarding routes - Gig Worker
    Route::get('/onboarding/gig-worker', [GigWorkerOnboardingController::class, 'show'])->name('gig-worker.onboarding');
    Route::post('/onboarding/gig-worker', [GigWorkerOnboardingController::class, 'store'])->name('gig-worker.onboarding.store');
    Route::post('/onboarding/gig-worker/upload-profile-picture', [GigWorkerOnboardingController::class, 'uploadProfilePicture'])->name('gig-worker.onboarding.upload-profile-picture');
    Route::post('/onboarding/gig-worker/skip', [GigWorkerOnboardingController::class, 'skip'])->name('gig-worker.onboarding.skip');

    Route::get('/onboarding/employer', [EmployerOnboardingController::class, 'show'])->name('employer.onboarding');
    Route::post('/onboarding/employer', [EmployerOnboardingController::class, 'store'])->name('employer.onboarding.store');
    Route::post('/onboarding/employer/skip', [EmployerOnboardingController::class, 'skip'])->name('employer.onboarding.skip');

    // Location API routes
    Route::prefix('api/location')->name('location.')->group(function () {
        Route::get('/countries', [LocationController::class, 'getCountries'])->name('countries');
        Route::get('/provinces/{country}', [LocationController::class, 'getProvinces'])->name('provinces');
        Route::get('/cities/{province}', [LocationController::class, 'getCities'])->name('cities');
        Route::get('/municipalities/{city}', [LocationController::class, 'getMunicipalities'])->name('municipalities');
        Route::get('/search', [LocationController::class, 'searchAddress'])->name('search');
    });

    // Profile routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->middleware('fraud.detection')->name('profile.update');
    Route::post('/profile', [ProfileController::class, 'update'])->middleware('fraud.detection'); // For file uploads with method spoofing
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Gig Worker public-facing profile page
    Route::get('/profile/gig-worker', [ProfileController::class, 'gigWorkerProfile'])->name('gig-worker.profile');
    // Link preview API (for portfolio link preview card)
    Route::get('/api/link-preview', [ProfileController::class, 'linkPreview'])->name('api.link-preview');
    // Gig Worker profile edit page
    Route::get('/profile/gig-worker/edit', [ProfileController::class, 'editGigWorker'])->name('gig-worker.profile.edit');
    Route::post('/profile/gig-worker/edit', [ProfileController::class, 'updateGigWorker'])->middleware('fraud.detection')->name('gig-worker.profile.update');

    // Gig worker earnings / wallet (must be before /gig-worker/{user} to avoid "wallet" being matched as user id)
    Route::middleware(['gig_worker'])->prefix('gig-worker/wallet')->name('gig-worker.wallet.')->group(function () {
        Route::get('/', [GigWorkerWalletController::class, 'index'])->name('index');
    });

    // View another gig worker's profile (RESTful: /gig-worker/{id}, e.g. from AI Match "View Profile")
    Route::get('/gig-worker/{user}/view', [ProfileController::class, 'storeGigWorkerProfileContext'])->name('gig-worker.profile.view-with-context');
    Route::get('/gig-worker/{user}', [ProfileController::class, 'showGigWorker'])->name('gig-worker.profile.show');

    Route::get('/employers/{user}', [ProfileController::class, 'showEmployer'])->name('employers.show');

    // Employer-own profile and edit routes
    Route::get('/profile/employer', [ProfileController::class, 'employerProfile'])->name('employer.profile');
    Route::get('/profile/employer/edit', [ProfileController::class, 'editEmployer'])->name('employer.profile.edit');
    Route::post('/profile/employer/edit', [ProfileController::class, 'updateEmployer'])->middleware('fraud.detection')->name('employer.profile.update');

    // R2 Proxy route (fallback while DNS propagates)
    Route::get('/r2/{path}', [ProfileController::class, 'proxyR2File'])
        ->where('path', '.*')
        ->name('r2.proxy');

    // Supabase Proxy route (serving private S3 bucket files securely)
    Route::get('/storage/supabase/{path}', function ($path) {
        try {
            $disk = \Illuminate\Support\Facades\Storage::disk('supabase');
            if (!$disk->exists($path)) abort(404);
            return response($disk->get($path), 200)
                ->header('Content-Type', $disk->mimeType($path))
                ->header('Cache-Control', 'public, max-age=31536000')
                ->header('Access-Control-Allow-Origin', '*');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Supabase proxy failed: ' . $e->getMessage(), ['path' => $path]);
            abort(404);
        }
    })->where('path', '.+')->name('supabase.proxy');

    // ID Verification routes
    Route::get('/id-verification', function () {
        return Inertia::render('IdVerification/Upload');
    })->name('id-verification.show');
    Route::post('/api/id-verification/upload', [IdVerificationController::class, 'upload'])->name('id-verification.upload');
    Route::post('/api/id-verification/upload-front', [IdVerificationController::class, 'uploadFront'])->name('id-verification.upload-front');
    Route::post('/api/id-verification/upload-back', [IdVerificationController::class, 'uploadBack'])->name('id-verification.upload-back');
    Route::post('/api/id-verification/resubmit', [IdVerificationController::class, 'resubmit'])->name('id-verification.resubmit');

    // Employer-only routes (job management)
    Route::middleware(['employer'])->group(function () {
        Route::get('/jobs/create', [GigJobController::class, 'create'])->name('jobs.create');
        Route::post('/jobs', [GigJobController::class, 'store'])->middleware('fraud.detection')->name('jobs.store');
        Route::get('/jobs/{job}/edit', [GigJobController::class, 'edit'])->name('jobs.edit');
        Route::patch('/jobs/{job}', [GigJobController::class, 'update'])->name('jobs.update');
        Route::delete('/jobs/{job}', [GigJobController::class, 'destroy'])->name('jobs.destroy');

        // Job templates
        Route::resource('job-templates', JobTemplateController::class);
        Route::post('/job-templates/{jobTemplate}/create-job', [JobTemplateController::class, 'createJobFromTemplate'])->name('job-templates.create-job');
        Route::post('/job-templates/{jobTemplate}/toggle-favorite', [JobTemplateController::class, 'toggleFavorite'])->name('job-templates.toggle-favorite');

        // Worker discovery
        Route::get('/discover-workers', [WorkerDiscoveryController::class, 'index'])->name('worker-discovery.index');
        // Note: /workers/{user} route is now handled by ProfileController::showWorker (workers.show)
        // Route::get('/workers/{user}', [WorkerDiscoveryController::class, 'show'])->name('worker-discovery.show');
        Route::post('/workers/{user}/invite', [WorkerDiscoveryController::class, 'inviteToJob'])->name('worker-discovery.invite');
    });

    // Job show route (public for authenticated users)
    Route::get('/jobs/{job}', [GigJobController::class, 'show'])->name('jobs.show');


    // Bid routes (mixed permissions)
    Route::get('/bids', [BidController::class, 'index'])->name('bids.index');
    Route::post('/bids', [BidController::class, 'store'])->middleware('fraud.detection')->name('bids.store');

    // Additional feature routes

    // Message routes
    Route::get('/messages', [MessageController::class, 'index'])->name('messages.index');
    Route::get('/messages/users', [MessageController::class, 'getUsers'])->name('messages.users');
    Route::get('/messages/{user}', [MessageController::class, 'conversation'])->name('messages.conversation');
    Route::post('/messages', [MessageController::class, 'store'])->middleware('fraud.detection')->name('messages.store');
    Route::delete('/messages/{message}', [MessageController::class, 'destroy'])->name('messages.destroy');
    Route::get('/messages/unread/count', [MessageController::class, 'unreadCount'])->name('messages.unread.count');
    Route::patch('/messages/{message}/read', [MessageController::class, 'markAsRead'])->name('messages.read');
    Route::get('/messages/recent/conversations', [MessageController::class, 'getRecentConversations'])->name('messages.recent');
    Route::get('/messages/conversation/{userId}', [MessageController::class, 'getConversation'])->name('messages.getConversation');
    Route::patch('/messages/conversation/{userId}/read', [MessageController::class, 'markConversationAsRead'])->name('messages.conversation.read');
    Route::patch('/messages/conversation/{conversationId}/status', [MessageController::class, 'updateConversationStatus'])->name('messages.conversation.status');
    Route::get('/messages/{user}/new', [MessageController::class, 'getNewMessages'])->name('messages.new');

    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/create', [ReportController::class, 'create'])->name('reports.create');
    Route::post('/reports', [ReportController::class, 'store'])->name('reports.store');

    // Transaction and financial reports (specific paths before {report})
    Route::get('/reports/transactions', [ReportController::class, 'transactions'])->name('reports.transactions');
    Route::get('/reports/transactions/export', [ReportController::class, 'exportTransactions'])->name('reports.transactions.export');
    Route::get('/reports/earnings-transparency', [ReportController::class, 'earningsTransparency'])->name('reports.earnings-transparency');
    Route::get('/reports/earnings-transparency/export', [ReportController::class, 'exportEarningsTransparency'])->name('reports.earnings-transparency.export');
    Route::get('/reports/pending-accrued-income', [ReportController::class, 'pendingAccruedIncome'])->name('reports.pending-accrued-income');
    Route::get('/reports/budget-utilization', [ReportController::class, 'budgetUtilization'])->name('reports.budget-utilization');
    Route::get('/reports/budget-utilization/export', [ReportController::class, 'exportBudgetUtilization'])->name('reports.budget-utilization.export');
    Route::get('/reports/vat-invoices', [ReportController::class, 'vatInvoices'])->name('reports.vat-invoices');
    Route::get('/reports/vat-invoices/{transaction}/pdf', [ReportController::class, 'vatInvoicePdf'])->name('reports.vat-invoices.pdf');

    Route::get('/reports/{report}', [ReportController::class, 'show'])->name('reports.show')->where('report', '[0-9]+');

    // Bid management routes - mixed permissions
    Route::get('/bids/{bid}', [BidController::class, 'show'])->name('bids.show');

    // Employer-only bid actions (accepting, updating status)
    Route::middleware(['employer'])->group(function () {
        Route::patch('/bids/{bid}', [BidController::class, 'update'])->name('bids.update');
    });

    // Gig worker-only bid actions
    Route::patch('/bids/{bid}/status', [BidController::class, 'updateStatus'])->name('bids.updateStatus');
    Route::delete('/bids/{bid}', [BidController::class, 'destroy'])->name('bids.destroy');


    // DEBUG: Test route to check if routing works
    Route::patch('/test-bid/{bid}', function($bid) {
        return back()->with('success', 'TEST ROUTE WORKS! Bid ID: ' . $bid);
    })->name('test.bid');

    // Project routes - mixed permissions
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::post('/projects/{project}/complete', [ProjectController::class, 'complete'])->name('projects.complete');
    Route::post('/projects/{project}/request-admin-review', [ProjectController::class, 'requestAdminReview'])->name('projects.requestAdminReview');
    Route::post('/projects/{project}/review', [ProjectController::class, 'review'])->name('projects.review');

    // Employer-only project actions
    Route::middleware(['employer'])->group(function () {
        Route::post('/projects/{project}/approve', [ProjectController::class, 'approve'])->name('projects.approve');
        Route::post('/projects/{project}/request-revision', [ProjectController::class, 'requestRevision'])->name('projects.requestRevision');
        Route::post('/projects/{project}/cancel', [ProjectController::class, 'cancel'])->name('projects.cancel');
        Route::post('/projects/{project}/payment/release', [PaymentController::class, 'releasePayment'])->name('payment.release');
        Route::post('/projects/{project}/payment/refund', [PaymentController::class, 'refundPayment'])->name('payment.refund');
    });


    // Contract routes - mixed permissions
    Route::get('/contracts', [ContractController::class, 'index'])->name('contracts.index');
    Route::get('/contracts/create', [ContractController::class, 'create'])->name('contracts.create');
    Route::post('/contracts', [ContractController::class, 'store'])->name('contracts.store');
    Route::get('/contracts/{contract}', [ContractController::class, 'show'])->name('contracts.show');
    Route::get('/contracts/{contract}/pdf', [ContractController::class, 'downloadPdf'])->name('contracts.downloadPdf');

    // Contract signing (both roles can sign)
    Route::get('/contracts/{contract}/sign', [ContractController::class, 'sign'])->name('contracts.sign');
    Route::post('/contracts/{contract}/signature', [ContractController::class, 'processSignature'])->name('contracts.processSignature');
    Route::patch('/contracts/{contract}/sign', [ContractController::class, 'updateSignature'])->name('contracts.updateSignature');

    // Contract cancellation (both roles can cancel)
    Route::post('/contracts/{contract}/cancel', [ContractController::class, 'cancel'])->name('contracts.cancel');

    // Payment routes - mixed permissions
    Route::get('/projects/{project}/payment', [PaymentController::class, 'show'])->name('payment.show');
    Route::post('/projects/{project}/payment/intent', [PaymentController::class, 'createPaymentIntent'])->middleware('fraud.detection')->name('payment.intent');
    Route::post('/payment/confirm', [PaymentController::class, 'confirmPayment'])->name('payment.confirm');
    Route::get('/payment/history', [PaymentController::class, 'history'])->name('payment.history');
    Route::get('/transactions/{transaction}', [PaymentController::class, 'transaction'])->name('transactions.show');
    Route::post('/payments/deposit', [PaymentController::class, 'deposit'])->middleware('fraud.detection')->name('payments.deposit');

    // Review routes
    Route::get('/reviews', [ReviewController::class, 'index'])->name('reviews.index');
    Route::post('/reviews', [ReviewController::class, 'store'])->name('reviews.store');

    // AI Recommendation Routes
    Route::get('/ai/recommendations', [AIRecommendationController::class, 'index'])->name('ai.recommendations');
    Route::get('/aimatch/employer', function () {
        if (auth()->user()->user_type !== 'employer') {
            return redirect()->route('ai.recommendations');
        }

        $query = request()->query();
        $target = route('ai.recommendations.employer.quality');
        if (!empty($query)) {
            $target .= '?' . http_build_query($query);
        }
        return redirect()->to($target);
    })->name('ai.recommendations.employer');
    Route::get('/aimatch/gig-worker', function () {
        if (auth()->user()->user_type !== 'gig_worker') {
            return redirect()->route('ai.recommendations');
        }

        $query = request()->query();
        $target = route('ai.recommendations.gigworker.quality');
        if (!empty($query)) {
            $target .= '?' . http_build_query($query);
        }
        return redirect()->to($target);
    })->name('ai.recommendations.gigworker');
    Route::get('/ai-recommendations/employer', [AIRecommendationController::class, 'employerRecommendations'])->name('ai.recommendations.employer.quality');
    Route::get('/ai-recommendations/gig-worker', [AIRecommendationController::class, 'gigWorkerRecommendations'])->name('ai.recommendations.gigworker.quality');

    // Message attachment download
    Route::get('/messages/{message}/download', [MessageController::class, 'downloadAttachment'])->name('messages.download');

    // Analytics routes
    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics.index');
    Route::get('/analytics/earnings', [AnalyticsController::class, 'earnings'])->name('analytics.earnings');
    Route::get('/analytics/projects', [AnalyticsController::class, 'projects'])->name('analytics.projects');
    Route::get('/analytics/performance', [AnalyticsController::class, 'performance'])->name('analytics.performance');
    Route::get('/analytics/export', [AnalyticsController::class, 'export'])->name('analytics.export');

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/api', [NotificationController::class, 'getNotifications'])->name('notifications.api');
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::patch('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllRead');
    Route::get('/notifications/unread-count', [NotificationController::class, 'getUnreadCount'])->name('notifications.unreadCount');
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Heartbeat for polling
    Route::get('/api/user/heartbeat', [UserHeartbeatController::class, 'heartbeat'])->name('api.user.heartbeat');

    // Role-specific wallet routes with proper middleware
    // Employer wallet (deposits and escrow management)
    Route::middleware(['employer'])->prefix('employer/wallet')->name('employer.wallet.')->group(function () {
        Route::get('/', [ClientWalletController::class, 'index'])->name('index');
        Route::post('/create-intent', [ClientWalletController::class, 'createIntent'])->name('create-intent');
    });

    // Legacy deposits route - redirect to appropriate wallet based on role
    Route::get('/deposits', function () {
        return redirect()->route('employer.wallet.index');
    })->middleware('auth')->name('deposits.index');

    // Stripe webhooks (unified)
    Route::post('stripe/webhook', [WebhookController::class, 'handleStripeWebhook'])
        ->withoutMiddleware(['auth', 'csrf'])
        ->name('stripe.webhook');
});

// AI Test Connection
Route::match(['GET', 'POST'], '/api/ai/test-connection', [AIRecommendationController::class, 'testConnection'])
    ->withoutMiddleware(['web', 'csrf']);

// System-wide unique skills endpoint for filters
Route::middleware(['auth'])->get('/api/ai-recommendation/skills', [AIRecommendationController::class, 'allSkills'])->name('ai.skills');

// AI Skill Recommendations for job creation
Route::middleware(['auth'])->group(function () {
    Route::post('/api/recommendations/skills', [AIRecommendationController::class, 'recommendSkills'])->name('api.recommendations.skills');
    Route::post('/api/recommendations/skills/accept', [AIRecommendationController::class, 'acceptSuggestion'])->name('api.recommendations.accept');
    Route::get('/api/recommendations/skills/all', [AIRecommendationController::class, 'allSkills'])->name('api.recommendations.all');
    Route::post('/api/recommendations/project-category', [AIRecommendationController::class, 'validateProjectCategory'])->name('api.recommendations.project-category');
    
    // AI Skill correction for onboarding
    Route::post('/api/ai-skills/correct', [AISkillController::class, 'correct'])->name('api.ai-skills.correct');

    // Dynamic Skills API
    Route::get('/api/skills/suggestions', [AISkillController::class, 'suggestions'])->name('api.skills.suggestions');
    Route::post('/api/skills/validate', [AISkillController::class, 'validate'])->name('api.skills.validate');
    Route::post('/api/onboarding/validate-hiring-need', [AISkillController::class, 'validateHiringNeed'])->name('api.onboarding.validate-hiring-need');
    Route::post('/api/skills/suggest-match', [AISkillController::class, 'suggestMatch'])->name('api.skills.suggest-match');
    Route::post('/api/skills/ensure', [AISkillController::class, 'ensure'])->name('api.skills.ensure');
});

// Admin routes
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    // Admin dashboard
    Route::get('/', [AdminController::class, 'dashboard'])->name('dashboard');
    Route::get('/dashboard', [AdminController::class, 'dashboard'])->name('dashboard.alt');

    // Skill moderation
    Route::get('/skills', [SkillModerationController::class, 'index'])->name('skills.index');
    Route::post('/skills/merge', [SkillModerationController::class, 'merge'])->name('skills.merge');
    
    // Real-time Dashboard API endpoints
    Route::get('/api/realtime-stats', [\App\Http\Controllers\AdminDashboardController::class, 'realtimeStats']);
    Route::get('/api/realtime-activities', [\App\Http\Controllers\AdminDashboardController::class, 'realtimeActivities']);
    Route::get('/api/user-growth', [\App\Http\Controllers\AdminDashboardController::class, 'userGrowthData']);
    Route::get('/api/revenue-analytics', [\App\Http\Controllers\AdminDashboardController::class, 'revenueAnalytics']);
    Route::get('/api/platform-health', [\App\Http\Controllers\AdminDashboardController::class, 'platformHealth']);

    // User management
    Route::get('/users', [AdminController::class, 'users'])->name('users');
    Route::get('/users/{user}', [AdminController::class, 'showUser'])->name('users.show');
    Route::patch('/users/{user}/status', [AdminController::class, 'updateUserStatus'])->name('users.updateStatus');
    Route::patch('/users/{user}/suspend', [AdminController::class, 'suspendUser'])->name('users.suspend');
    Route::patch('/users/{user}/activate', [AdminController::class, 'activateUser'])->name('users.activate');
    Route::delete('/users/{user}', [AdminController::class, 'deleteUser'])->name('users.delete');

    // Bulk user operations
    Route::post('/users/bulk-approve', [AdminController::class, 'bulkApprove'])->name('users.bulkApprove');
    Route::post('/users/bulk-suspend', [AdminController::class, 'bulkSuspend'])->name('users.bulkSuspend');
    Route::post('/users/bulk-delete', [AdminController::class, 'bulkDelete'])->name('users.bulkDelete');

    // User analytics and export
    Route::get('/users/export', [AdminController::class, 'exportUsers'])->name('users.export');
    Route::get('/users/analytics', [AdminController::class, 'userAnalytics'])->name('users.analytics');

    // Projects management
    Route::get('/projects', [AdminController::class, 'projects'])->name('projects');
    Route::get('/projects/{project}', [AdminController::class, 'showProject'])->name('projects.show');
    Route::post('/projects/{project}/approve-and-release', [AdminController::class, 'approveAndReleasePayment'])->name('projects.approveAndRelease');
    Route::get('/projects/export', [AdminController::class, 'exportProjects'])->name('projects.export');

    // Payments management
    Route::get('/payments', [AdminController::class, 'payments'])->name('payments');
    Route::get('/payments/export', [AdminController::class, 'exportPayments'])->name('payments.export');
    Route::get('/deposits/export', [AdminDepositsController::class, 'export'])->name('deposits.export');
    Route::get('/deposits', [AdminDepositsController::class, 'index'])->name('deposits.index');

    // Report management
    Route::get('/reports/transactions', [AdminTransactionReportsController::class, 'index'])->name('reports.transactions');
    Route::get('/reports/transactions/revenue-export', [AdminTransactionReportsController::class, 'exportRevenueTakeRate'])->name('reports.transactions.revenue-export');
    Route::get('/reports/transactions/escrow-liability-export', [AdminTransactionReportsController::class, 'exportEscrowLiability'])->name('reports.transactions.escrow-liability-export');
    Route::get('/reports', [AdminReportController::class, 'index'])->name('reports');
    Route::get('/reports/{report}', [AdminReportController::class, 'show'])->name('reports.show');
    Route::patch('/reports/{report}/status', [AdminReportController::class, 'updateStatus'])->name('reports.updateStatus');
    Route::get('/reports-analytics', [AdminReportController::class, 'fraudAnalytics'])->name('reports.analytics');
    Route::patch('/reports/bulk-update', [AdminReportController::class, 'bulkUpdate'])->name('reports.bulkUpdate');

    // ID Verification management
    Route::get('/id-verifications', [\App\Http\Controllers\Admin\IdVerificationController::class, 'index'])->name('id-verifications.index');
    Route::get('/id-verifications/{user}', [\App\Http\Controllers\Admin\IdVerificationController::class, 'show'])->name('id-verifications.show');
    Route::post('/id-verifications/{user}/approve', [\App\Http\Controllers\Admin\IdVerificationController::class, 'approve'])->name('id-verifications.approve');
    Route::post('/id-verifications/{user}/reject', [\App\Http\Controllers\Admin\IdVerificationController::class, 'reject'])->name('id-verifications.reject');
    Route::post('/id-verifications/{user}/request-resubmit', [\App\Http\Controllers\Admin\IdVerificationController::class, 'requestResubmit'])->name('id-verifications.requestResubmit');
    
    // Bulk ID Verification operations
    Route::post('/id-verifications/bulk-approve', [\App\Http\Controllers\Admin\IdVerificationController::class, 'bulkApprove'])->name('id-verifications.bulkApprove');
    Route::post('/id-verifications/bulk-reject', [\App\Http\Controllers\Admin\IdVerificationController::class, 'bulkReject'])->name('id-verifications.bulkReject');
    Route::post('/id-verifications/bulk-request-resubmit', [\App\Http\Controllers\Admin\IdVerificationController::class, 'bulkRequestResubmit'])->name('id-verifications.bulkRequestResubmit');
    Route::get('/id-verifications/export-csv', [\App\Http\Controllers\Admin\IdVerificationController::class, 'exportCsv'])->name('id-verifications.exportCsv');
    Route::get('/id-verifications/statistics', [\App\Http\Controllers\Admin\IdVerificationController::class, 'getStatistics'])->name('id-verifications.statistics');

    // Analytics
    Route::get('/analytics', [AdminAnalyticsController::class, 'overview'])->name('analytics.overview');
    Route::get('/analytics/jobs-contracts', [AdminAnalyticsController::class, 'jobsContracts'])->name('analytics.jobsContracts');
    Route::get('/analytics/financial', [AdminAnalyticsController::class, 'financial'])->name('analytics.financial');
    Route::get('/analytics/quality', [AdminAnalyticsController::class, 'quality'])->name('analytics.quality');
    
    // Real-time Analytics API
    Route::get('/api/analytics/overview', [\App\Http\Controllers\Admin\RealtimeAnalyticsController::class, 'overview']);
    Route::get('/api/analytics/user-metrics', [\App\Http\Controllers\Admin\RealtimeAnalyticsController::class, 'userMetrics']);
    Route::get('/api/analytics/job-metrics', [\App\Http\Controllers\Admin\RealtimeAnalyticsController::class, 'jobMetrics']);
    Route::get('/api/analytics/financial-metrics', [\App\Http\Controllers\Admin\RealtimeAnalyticsController::class, 'financialMetrics']);
    Route::get('/api/analytics/quality-metrics', [\App\Http\Controllers\Admin\RealtimeAnalyticsController::class, 'qualityMetrics']);
    Route::get('/api/analytics/user-growth-chart', [\App\Http\Controllers\Admin\RealtimeAnalyticsController::class, 'userGrowthChart']);
    Route::get('/api/analytics/revenue-trend-chart', [\App\Http\Controllers\Admin\RealtimeAnalyticsController::class, 'revenueTrendChart']);
    Route::get('/api/analytics/job-trends-chart', [\App\Http\Controllers\Admin\RealtimeAnalyticsController::class, 'jobTrendsChart']);
    Route::get('/api/analytics/quality-trend-chart', [\App\Http\Controllers\Admin\RealtimeAnalyticsController::class, 'qualityTrendChart']);

    // Employer Verifications
    Route::get('/employers/verifications', [\App\Http\Controllers\Admin\EmployerVerificationController::class, 'index'])->name('employers.verifications.index');
    Route::post('/employers/verifications/{user}/approve', [\App\Http\Controllers\Admin\EmployerVerificationController::class, 'approve'])->name('employers.verifications.approve');
    Route::post('/employers/verifications/{user}/reject', [\App\Http\Controllers\Admin\EmployerVerificationController::class, 'reject'])->name('employers.verifications.reject');

    // User Verifications
    Route::get('/verifications', [AdminVerificationController::class, 'index'])->name('verifications');
    Route::get('/verifications/{verification}', [AdminVerificationController::class, 'show'])->name('verifications.show');
    Route::patch('/verifications/{verification}/approve', [AdminVerificationController::class, 'approve'])->name('verifications.approve');
    Route::patch('/verifications/{verification}/reject', [AdminVerificationController::class, 'reject'])->name('verifications.reject');
    Route::patch('/verifications/{verification}/request-info', [AdminVerificationController::class, 'requestInfo'])->name('verifications.requestInfo');
    Route::patch('/verifications/bulk-approve', [AdminVerificationController::class, 'bulkApprove'])->name('verifications.bulkApprove');
    Route::patch('/verifications/bulk-reject', [AdminVerificationController::class, 'bulkReject'])->name('verifications.bulkReject');
    Route::get('/verifications-analytics', [AdminVerificationController::class, 'analytics'])->name('verifications.analytics');

    // Settings
    Route::get('/settings', [AdminSettingsController::class, 'index'])->name('settings');
    Route::patch('/settings/platform', [AdminSettingsController::class, 'updatePlatform'])->name('settings.platform');
    Route::patch('/settings/fees', [AdminSettingsController::class, 'updateFees'])->name('settings.fees');
    Route::patch('/settings/limits', [AdminSettingsController::class, 'updateLimits'])->name('settings.limits');
    Route::patch('/settings/notifications', [AdminSettingsController::class, 'updateNotifications'])->name('settings.notifications');
    Route::patch('/settings/security', [AdminSettingsController::class, 'updateSecurity'])->name('settings.security');
    Route::post('/settings/clear-cache', [AdminSettingsController::class, 'clearCache'])->name('settings.clearCache');
    Route::get('/settings/export', [AdminSettingsController::class, 'exportSettings'])->name('settings.export');
    Route::post('/settings/import', [AdminSettingsController::class, 'importSettings'])->name('settings.import');
    Route::get('/system-health', [AdminSettingsController::class, 'systemHealth'])->name('settings.systemHealth');

    // Admin-only logout (single /admin prefix from group — must be /logout not /admin/logout)
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    // Fraud Detection System
    Route::prefix('fraud')->name('fraud.')->group(function () {
        // Fraud detection dashboard
        Route::get('/', [AdminFraudController::class, 'dashboard'])->name('dashboard');
        Route::get('/dashboard', [AdminFraudController::class, 'dashboard'])->name('dashboard.alt');

        // Fraud cases management
        Route::get('/cases', [AdminFraudController::class, 'cases'])->name('cases');
        Route::get('/cases/{case}', [AdminFraudController::class, 'showCase'])->name('cases.show');
        Route::patch('/cases/{case}/status', [AdminFraudController::class, 'updateCaseStatus'])->name('cases.updateStatus');
        Route::patch('/cases/{case}/assign', [AdminFraudController::class, 'assignCase'])->name('cases.assign');

        // Fraud alerts management
        Route::get('/alerts', [AdminFraudController::class, 'alerts'])->name('alerts');
        Route::get('/alerts/{alert}', [AdminFraudController::class, 'showAlert'])->name('alerts.show');
        Route::patch('/alerts/{alert}/acknowledge', [AdminFraudController::class, 'acknowledgeAlert'])->name('alerts.acknowledge');
        Route::patch('/alerts/{alert}/resolve', [AdminFraudController::class, 'resolveAlert'])->name('alerts.resolve');
        Route::patch('/alerts/{alert}/false-positive', [AdminFraudController::class, 'markAlertFalsePositive'])->name('alerts.falsePositive');

        // Fraud detection rules
        Route::get('/rules', [AdminFraudController::class, 'rules'])->name('rules');
        Route::get('/rules/{rule}', [AdminFraudController::class, 'showRule'])->name('rules.show');
        Route::patch('/rules/{rule}/toggle', [AdminFraudController::class, 'toggleRule'])->name('rules.toggle');

        // Audit logs
        Route::get('/audit-logs', [AdminFraudController::class, 'auditLogs'])->name('auditLogs');
        Route::get('/audit-logs/{log}', [AdminFraudController::class, 'showAuditLog'])->name('auditLogs.show');
        Route::post('/audit-logs/{log}/verify', [AdminFraudController::class, 'verifyAuditLog'])->name('auditLogs.verify');

        // Watchlist
        Route::get('/watchlist', [AdminFraudController::class, 'watchlist'])->name('watchlist');
        Route::post('/watchlist', [AdminFraudController::class, 'addToWatchlist'])->name('watchlist.add');
        Route::delete('/watchlist/{user}', [AdminFraudController::class, 'removeFromWatchlist'])->name('watchlist.remove');

        // Admin job actions (hide/delete from fraud case context)
        Route::patch('/jobs/{job}/hide', [AdminFraudController::class, 'hideJob'])->name('jobs.hide');
        Route::patch('/jobs/{job}/unhide', [AdminFraudController::class, 'unhideJob'])->name('jobs.unhide');
        Route::delete('/jobs/{job}', [AdminFraudController::class, 'deleteJob'])->name('jobs.adminDelete');

        // Mandatory KYC (admin-triggered block until user verifies ID)
        Route::post('/users/{user}/require-kyc', [AdminFraudController::class, 'requireKyc'])->name('users.requireKyc');
        Route::post('/users/{user}/clear-kyc-requirement', [AdminFraudController::class, 'clearKycRequirement'])->name('users.clearKycRequirement');

        // Fraud analytics and reporting
        Route::get('/analytics', [AdminFraudController::class, 'analytics'])->name('analytics');
    });
});


// Debug routes for Railway deployment issues
Route::get('/debug/railway', [DebugController::class, 'railwayDiagnosis']);
Route::get('/debug/error-log', [ErrorLogController::class, 'captureGigWorkerError']);
Route::get('/debug/simple-test', [SimpleTestController::class, 'basicTest']);
Route::get('/debug/test-model', [SimpleTestController::class, 'testModel']);

require __DIR__.'/auth.php';
