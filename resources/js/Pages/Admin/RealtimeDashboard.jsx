import React, { useState, useEffect, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function RealtimeDashboard({ auth }) {
    const [stats, setStats] = useState(null);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch('/admin/api/realtime-stats');
            const data = await response.json();
            setStats(data);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }, []);

    const fetchActivities = useCallback(async () => {
        try {
            const response = await fetch('/admin/api/realtime-activities?limit=15');
            const data = await response.json();
            setActivities(data);
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }, []);

    useEffect(() => {
        const loadAllData = async () => {
            setIsLoading(true);
            await Promise.all([fetchStats(), fetchActivities()]);
            setIsLoading(false);
        };
        loadAllData();
    }, [fetchStats, fetchActivities]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchStats();
            fetchActivities();
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchStats, fetchActivities]);

    const formatNumber = (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat().format(num);
    };

    if (isLoading || !stats) {
        return (
            <AdminLayout>
                <Head title="Admin Dashboard" />
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading dashboard data...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <Head title="Admin Dashboard" />

            {/* Header with Auto-refresh Toggle */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Auto-refresh (30s)</span>
                    </label>
                    <button
                        onClick={() => { fetchStats(); fetchActivities(); }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Main Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                    <div className="relative z-10">
                        <h2 className="text-lg font-medium text-blue-100 mb-1">Total Gig Workers</h2>
                        <div className="text-4xl font-bold mb-4">{formatNumber(stats.users.gig_workers)}</div>
                        <div className="flex items-center space-x-4 text-sm bg-black/20 p-3 rounded-lg w-full max-w-sm">
                            <div>
                                <span className="block text-blue-200">Verified</span>
                                <span className="font-semibold">{formatNumber(stats.users.verified)}</span>
                            </div>
                            <div className="w-px h-8 bg-blue-400"></div>
                            <div>
                                <span className="block text-blue-200">Pending</span>
                                <span className="font-semibold">{formatNumber(stats.id_verification?.pending_gig_workers || 0)}</span>
                            </div>
                        </div>
                    </div>
                    <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-9xl text-white opacity-10 blur-[2px]">engineering</span>
                </div>

                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                    <div className="relative z-10">
                        <h2 className="text-lg font-medium text-emerald-100 mb-1">Total Employers</h2>
                        <div className="text-4xl font-bold mb-4">{formatNumber(stats.users.employers)}</div>
                        <div className="flex items-center space-x-4 text-sm bg-black/20 p-3 rounded-lg w-full max-w-sm">
                            <div>
                                <span className="block text-emerald-200">Active Projects</span>
                                <span className="font-semibold">{formatNumber(stats.projects.active)}</span>
                            </div>
                            <div className="w-px h-8 bg-emerald-400"></div>
                            <div>
                                <span className="block text-emerald-200">Pending Review</span>
                                <span className="font-semibold">{formatNumber(stats.id_verification?.pending_employers || 0)}</span>
                            </div>
                        </div>
                    </div>
                    <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-9xl text-white opacity-10 blur-[2px]">business_center</span>
                </div>
            </div>

            {/* Actionable Queues */}
            <h3 className="text-xl font-bold text-gray-900 mb-4">Action Center</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                {/* ID Verifications Queue */}
                <Link href="/admin/id-verifications" className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-lg group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">badge</span>
                        </div>
                        {stats.id_verification?.pending_gig_workers > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                Requires Action
                            </span>
                        )}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Gig Worker IDs</h4>
                    <p className="text-gray-500 text-sm mt-1 mb-4">Review submitted government IDs and profile photos.</p>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold text-gray-900">{formatNumber(stats.id_verification?.pending_gig_workers || 0)}</span>
                        <span className="text-sm font-medium text-indigo-600 group-hover:underline flex items-center">
                            Review Queue <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                        </span>
                    </div>
                </Link>

                {/* Employer Document Queue */}
                <Link href="/admin/employers/verifications" className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-teal-100 text-teal-600 rounded-lg group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">verified_user</span>
                        </div>
                        {stats.id_verification?.pending_employers > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                Requires Action
                            </span>
                        )}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Employer Verification</h4>
                    <p className="text-gray-500 text-sm mt-1 mb-4">Review business registrations and tax documents.</p>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold text-gray-900">{formatNumber(stats.id_verification?.pending_employers || 0)}</span>
                        <span className="text-sm font-medium text-indigo-600 group-hover:underline flex items-center">
                            Review Queue <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                        </span>
                    </div>
                </Link>

                {/* Dispute Queue */}
                <Link href="/admin/reports/transactions" className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-lg group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">gavel</span>
                        </div>
                        {stats.reports?.pending > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                Urgent
                            </span>
                        )}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Open Disputes & Reports</h4>
                    <p className="text-gray-500 text-sm mt-1 mb-4">Manage conflicts between employers and gig workers.</p>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold text-gray-900">{formatNumber(stats.reports?.pending || 0)}</span>
                        <span className="text-sm font-medium text-indigo-600 group-hover:underline flex items-center">
                            Resolve <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                        </span>
                    </div>
                </Link>

            </div>

            {/* Quick Links & Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Secondary Actions */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Management</h3>
                    <Link href="/admin/users" className="flex items-center space-x-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <span className="material-symbols-outlined">manage_accounts</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900">User Directory</h4>
                            <p className="text-xs text-gray-500">Manage all accounts and profiles</p>
                        </div>
                        <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                    </Link>

                    <Link href="/admin/payments" className="flex items-center space-x-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <span className="material-symbols-outlined">account_balance</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900">Escrow & Finances</h4>
                            <p className="text-xs text-gray-500">View transactions and releases</p>
                        </div>
                        <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                    </Link>

                    <Link href="/admin/projects" className="flex items-center space-x-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <span className="material-symbols-outlined">work_history</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900">Active Projects</h4>
                            <p className="text-xs text-gray-500">Monitor ongoing work</p>
                        </div>
                        <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                    </Link>
                </div>

                {/* Activity Feed */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Real-time Activity</h3>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                Live
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[400px]">
                            {activities.length > 0 ? activities.map((activity) => (
                                <div key={activity.id} className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-${activity.color}-100 text-${activity.color}-600`}>
                                        <span className="material-symbols-outlined text-[20px]">
                                            {activity.icon}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                                        <p className="text-sm text-gray-500 truncate">{activity.subtitle}</p>
                                        <p className="text-xs text-gray-400 mt-1">{activity.time_ago}</p>
                                    </div>
                                    {activity.link && (
                                        <Link href={activity.link} className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 text-sm font-medium self-center bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">
                                            View
                                        </Link>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-10 flex flex-col items-center justify-center h-full text-gray-500">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">hourglass_empty</span>
                                    <p>No recent activities found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}
