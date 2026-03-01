<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deposit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDepositsController extends Controller
{
    /**
     * List all user-added funds (employer deposits) for the platform owner.
     */
    public function index(Request $request): Response
    {
        $query = Deposit::with('user:id,first_name,last_name,email');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $deposits = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();

        $stats = [
            'total_completed' => (float) Deposit::where('status', 'completed')->sum('amount'),
            'total_pending' => (float) Deposit::where('status', 'pending')->sum('amount'),
            'total_failed' => (float) Deposit::where('status', 'failed')->sum('amount'),
            'count_completed' => Deposit::where('status', 'completed')->count(),
            'count_pending' => Deposit::where('status', 'pending')->count(),
            'count_failed' => Deposit::where('status', 'failed')->count(),
        ];

        return Inertia::render('Admin/Deposits/Index', [
            'deposits' => $deposits,
            'stats' => $stats,
            'filters' => $request->only(['status', 'date_from', 'date_to']),
        ]);
    }
}
