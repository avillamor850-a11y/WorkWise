import React, { useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Chart from 'chart.js/auto';
import AdminLayout from '@/Layouts/AdminLayout';

// Helper function to format numbers
const number_format = (number) => {
    if (!number) return '0';
    return new Intl.NumberFormat().format(number);
};

export default function Dashboard({ auth, stats, recentUsers, recentReports, recentProjects, recentActivities }) {
    const handleUserAction = async (userId, action) => {
        if (confirm(`Are you sure you want to ${action} this user?`)) {
            try {
                const response = await fetch(`/admin/users/${userId}/${action}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                    },
                });

                if (response.ok) {
                    // Refresh the page to show updated data
                    window.location.reload();
                } else {
                    alert('Failed to update user status');
                }
            } catch (error) {
                console.error('Error updating user:', error);
                alert('An error occurred while updating the user');
            }
        }
    };
    useEffect(() => {
        // User Growth Chart
        const userGrowthCtx = document.getElementById('userGrowthChart')?.getContext('2d');
        if (userGrowthCtx) {
            new Chart(userGrowthCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    datasets: [{
                        label: 'New Users',
                        data: [12, 19, 15, 25, 22, 30, 28],
                        fill: true,
                        borderColor: 'rgb(79, 70, 229)',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'New Users'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        }
                    }
                }
            });
        }

        // Project Status Chart
        const projectStatusCtx = document.getElementById('projectStatusChart')?.getContext('2d');
        if (projectStatusCtx) {
            new Chart(projectStatusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'In Progress', 'Pending'],
                    datasets: [{
                        label: 'Project Status',
                        data: [45, 25, 15],
                        backgroundColor: [
                            'rgb(16, 185, 129)',
                            'rgb(236, 72, 153)',
                            'rgb(251, 191, 36)'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                        },
                    },
                }
            });
        }

        // User Type Distribution Chart
        const userTypeCtx = document.getElementById('userTypeChart')?.getContext('2d');
        if (userTypeCtx) {
            new Chart(userTypeCtx, {
                type: 'pie',
                data: {
                    labels: ['Gig Workers', 'Employers', 'Admins'],
                    datasets: [{
                        label: 'User Types',
                        data: [stats.total_gig_workers || 0, stats.total_employers || 0, stats.total_admins || 0],
                        backgroundColor: [
                            'rgb(79, 70, 229)',
                            'rgb(16, 185, 129)',
                            'rgb(245, 101, 101)'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                        },
                    },
                }
            });
        }

        // Verification Status Chart
        const verificationCtx = document.getElementById('verificationChart')?.getContext('2d');
        if (verificationCtx) {
            new Chart(verificationCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Verified', 'Pending', 'Suspended'],
                    datasets: [{
                        label: 'Verification Status',
                        data: [stats.verified_users || 0, stats.pending_verification || 0, stats.suspended_users || 0],
                        backgroundColor: [
                            'rgb(16, 185, 129)',
                            'rgb(251, 191, 36)',
                            'rgb(239, 68, 68)'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                        },
                    },
                }
            });
        }
    }, [stats]);

    return (
        <AdminLayout>
            <Head title="Admin Dashboard" />

            {/* Welcome Banner */}
            <div className="mb-8 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Welcome back, {auth?.user?.name || 'Administrator'}!</h2>
                            <p className="text-white/90">Here's what's happening on your platform today</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center space-x-6 text-center">
                        <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                            <p className="text-2xl font-bold">{stats.total_users || '0'}</p>
                            <p className="text-sm text-white/80">Total Users</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                            <p className="text-2xl font-bold">{stats.total_projects || '0'}</p>
                            <p className="text-sm text-white/80">Projects</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                            <p className="text-2xl font-bold">{stats.pending_reports || '0'}</p>
                            <p className="text-sm text-white/80">Pending Reports</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ID Verification Alert - Show if there are pending verifications */}
            {stats.id_pending > 0 && (
                <div className="mb-6 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <span className="material-symbols-outlined text-2xl">badge</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">ID Verification Review Needed</h3>
                                <p className="text-white/90">
                                    {stats.id_pending} {stats.id_pending === 1 ? 'user is' : 'users are'} waiting for ID verification approval
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/admin/id-verifications"
                            className="rounded-lg bg-white px-6 py-3 font-semibold text-orange-600 shadow-md transition-all hover:bg-orange-50 hover:shadow-lg"
                        >
                            Review Now →
                        </Link>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="transform rounded-xl border border-slate-200 bg-white p-6 shadow-lg transition-transform duration-300 hover:-translate-y-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Total Users</p>
                        <span className="material-symbols-outlined text-blue-500">people</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total_users || '0'}</p>
                    <p className="mt-1 text-sm text-emerald-500">+{stats.new_users_this_week || '0'} this week</p>
                </div>

                <div className="transform rounded-xl border border-slate-200 bg-white p-6 shadow-lg transition-transform duration-300 hover:-translate-y-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Gig Workers</p>
                        <span className="material-symbols-outlined text-indigo-600">work</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total_gig_workers || '0'}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Active professionals</p>
                </div>

                <div className="transform rounded-xl border border-slate-200 bg-white p-6 shadow-lg transition-transform duration-300 hover:-translate-y-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Employers</p>
                        <span className="material-symbols-outlined text-green-500">business</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total_employers || '0'}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Project owners</p>
                </div>

                <div className="transform rounded-xl border border-slate-200 bg-white p-6 shadow-lg transition-transform duration-300 hover:-translate-y-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Verified Users</p>
                        <span className="material-symbols-outlined text-emerald-500">verified</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.verified_users || '0'}</p>
                    <p className="mt-1 text-sm text-emerald-500">{stats.pending_verification ? `${stats.pending_verification} pending` : 'All verified'}</p>
                </div>

                <div className="transform rounded-xl border border-slate-200 bg-white p-6 shadow-lg transition-transform duration-300 hover:-translate-y-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Platform Revenue</p>
                        <span className="material-symbols-outlined text-emerald-500">monitoring</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">₱{stats.platform_earnings ? number_format(stats.platform_earnings) : '0'}</p>
                    <p className="mt-1 text-sm text-emerald-500">Total earnings</p>
                </div>

                <div className="transform rounded-xl border border-slate-200 bg-white p-6 shadow-lg transition-transform duration-300 hover:-translate-y-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Open Reports</p>
                        <span className="material-symbols-outlined text-yellow-500">support_agent</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.pending_reports || '0'}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Require attention</p>
                </div>

                <div className="transform rounded-xl border border-slate-200 bg-white p-6 shadow-lg transition-transform duration-300 hover:-translate-y-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">ID Pending</p>
                        <span className="material-symbols-outlined text-orange-500">badge</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.id_pending || '0'}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {stats.id_verified || '0'} verified • {stats.id_rejected || '0'} rejected
                    </p>
                </div>
            </div>

            {/* Platform Health Section */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6 shadow-lg dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
                <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Platform Health Overview</h2>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Active Contracts */}
                    <div className="flex items-center rounded-lg bg-white p-4 shadow dark:bg-slate-700">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                            <span className="material-symbols-outlined text-blue-600">description</span>
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Contracts</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.active_contracts || '0'}</p>
                            <p className="text-xs text-slate-400">Out of {stats.total_contracts || '0'} total</p>
                        </div>
                    </div>

                    {/* Pending Bids */}
                    <div className="flex items-center rounded-lg bg-white p-4 shadow dark:bg-slate-700">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                            <span className="material-symbols-outlined text-purple-600">local_offer</span>
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Bids</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pending_bids || '0'}</p>
                            <p className="text-xs text-slate-400">Out of {stats.total_bids || '0'} total</p>
                        </div>
                    </div>

                    {/* Email Verified */}
                    <div className="flex items-center rounded-lg bg-white p-4 shadow dark:bg-slate-700">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50">
                            <span className="material-symbols-outlined text-green-600">mail_lock</span>
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email Verified</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.email_verified || '0'}</p>
                            <p className="text-xs text-slate-400">{stats.email_unverified || '0'} unverified</p>
                        </div>
                    </div>

                    {/* Total Transaction Value */}
                    <div className="flex items-center rounded-lg bg-white p-4 shadow dark:bg-slate-700">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                            <span className="material-symbols-outlined text-emerald-600">trending_up</span>
                        </div>
                        <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Transaction Value</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">₱{number_format(stats.total_transaction_value || 0)}</p>
                            <p className="text-xs text-slate-400">Total completed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Section */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100">Quick Actions</h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                        href="/admin/id-verifications"
                        className="flex items-center justify-between rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
                    >
                        <div>
                            <p className="font-semibold">Review ID Verifications</p>
                            <p className="text-sm text-orange-100">{stats.id_pending} pending</p>
                        </div>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>

                    <Link
                        href="/admin/users"
                        className="flex items-center justify-between rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
                    >
                        <div>
                            <p className="font-semibold">Manage Users</p>
                            <p className="text-sm text-blue-100">{stats.pending_verification} pending approval</p>
                        </div>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>

                    <Link
                        href="/admin/reports/transactions"
                        className="flex items-center justify-between rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
                    >
                        <div>
                            <p className="font-semibold">Review Disputes</p>
                            <p className="text-sm text-yellow-100">{stats.pending_reports} open</p>
                        </div>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>

                    <Link
                        href="/admin/settings"
                        className="flex items-center justify-between rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 p-4 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
                    >
                        <div>
                            <p className="font-semibold">System Settings</p>
                            <p className="text-sm text-indigo-100">Configure platform</p>
                        </div>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                </div>
            </div>

            {/* Charts Section */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
                    <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">User Growth</h2>
                    <div className="h-80">
                        <canvas id="userGrowthChart"></canvas>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Project Status</h2>
                    <div className="h-80">
                        <canvas id="projectStatusChart"></canvas>
                    </div>
                </div>
            </div>

            {/* User Analytics Charts */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">User Type Distribution</h2>
                    <div className="h-80">
                        <canvas id="userTypeChart"></canvas>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Verification Status</h2>
                    <div className="h-80">
                        <canvas id="verificationChart"></canvas>
                    </div>
                </div>
            </div>

            {/* Recent Users Section */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recent User Registrations</h2>
                    <div className="flex space-x-2">
                        <Link
                            href="/admin/users"
                            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                            Manage Users →
                        </Link>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recentUsers && recentUsers.length > 0 ? (
                        recentUsers.slice(0, 6).map((user) => (
                            <div key={user.id} className="flex items-center space-x-3 rounded-lg border border-slate-200 p-4 dark:border-slate-600">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                                    <span className="material-symbols-outlined text-indigo-500">person</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                        {user.first_name} {user.last_name}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {user.user_type} • {user.email}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        Joined {user.created_at}
                                    </p>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                        user.profile_status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' :
                                        user.profile_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                        'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                                    }`}>
                                        {user.profile_status || 'pending'}
                                    </span>
                                    <div className="flex space-x-1">
                                        <Link
                                            href={`/admin/users/${user.id}`}
                                            className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                        >
                                            View
                                        </Link>
                                        <span className="text-xs text-slate-400">•</span>
                                        <button
                                            onClick={() => handleUserAction(user.id, 'approve')}
                                            className="text-xs text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                                        >
                                            Approve
                                        </button>
                                        <span className="text-xs text-slate-400">•</span>
                                        <button
                                            onClick={() => handleUserAction(user.id, 'suspend')}
                                            className="text-xs text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            Suspend
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full flex items-center justify-center py-8">
                            <p className="text-slate-500 dark:text-slate-400">No recent users found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activities */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recent Activities</h2>
                    <Link
                        href="/admin/users"
                        className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        View all users →
                    </Link>
                </div>
                <ul className="space-y-4">
                    {recentActivities && recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                            <li key={`${activity.type}-${activity.id}-${index}`} className={`flex animate-[fadeIn_${0.5 + index * 0.2}s_ease-in-out] items-start space-x-4`}>
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                    activity.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/50' :
                                    activity.color === 'pink' ? 'bg-pink-100 dark:bg-pink-900/50' :
                                    activity.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/50' :
                                    activity.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                                    activity.color === 'green' ? 'bg-green-100 dark:bg-green-900/50' :
                                    'bg-red-100 dark:bg-red-900/50'
                                }`}>
                                    <span className={`material-symbols-outlined ${
                                        activity.color === 'emerald' ? 'text-emerald-500' :
                                        activity.color === 'pink' ? 'text-pink-500' :
                                        activity.color === 'blue' ? 'text-blue-500' :
                                        activity.color === 'yellow' ? 'text-yellow-500' :
                                        activity.color === 'green' ? 'text-green-500' :
                                        'text-red-500'
                                    }`}>{activity.icon}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</p>
                                    {activity.subtitle && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{activity.subtitle}</p>
                                    )}
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</p>
                                </div>
                                {activity.user && (
                                    <Link
                                        href={`/admin/users/${activity.user.id}`}
                                        className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                    >
                                        View User
                                    </Link>
                                )}
                            </li>
                        ))
                    ) : (
                        <li className="flex items-center justify-center py-8">
                            <p className="text-slate-500 dark:text-slate-400">No recent activities found.</p>
                        </li>
                    )}
                </ul>
            </div>
        </AdminLayout>
    );
}