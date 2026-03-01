import React, { useState, useEffect, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function EnhancedAdminProjects({ projects: initialProjects, stats: initialStats, filters }) {
    const [projects, setProjects] = useState(initialProjects);
    const [stats, setStats] = useState(initialStats);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || '');
    const [requestedReviewFilter, setRequestedReviewFilter] = useState(filters?.requested_review === '1' || filters?.requested_review === true);

    const formatCurrency = (amount) => {
        if (!amount) return '₱0.00';
        return '₱' + new Intl.NumberFormat('en-PH', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(amount);
    };

    const formatNumber = (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat().format(num);
    };

    // Fetch updated data
    const fetchProjects = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter) params.append('status', statusFilter);
            if (requestedReviewFilter) params.append('requested_review', '1');
            
            const response = await fetch(`/admin/projects?${params.toString()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.props) {
                    setProjects(data.props.projects);
                    setStats(data.props.stats);
                    setLastUpdate(new Date());
                }
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    }, [searchTerm, statusFilter, requestedReviewFilter]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchProjects();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, fetchProjects]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/admin/projects', {
            search: searchTerm,
            status: statusFilter,
            requested_review: requestedReviewFilter ? '1' : undefined
        }, { preserveState: true });
    };

    const handleFilterChange = (filterType, value) => {
        if (filterType === 'status') setStatusFilter(value);
        if (filterType === 'requested_review') setRequestedReviewFilter(!!value);

        router.get('/admin/projects', {
            search: searchTerm,
            status: filterType === 'status' ? value : statusFilter,
            requested_review: filterType === 'requested_review' ? (value ? '1' : undefined) : (requestedReviewFilter ? '1' : undefined)
        }, { preserveState: true });
    };

    const getStatusColor = (status) => {
        const colors = {
            completed: 'bg-green-100 text-green-800 border-green-200',
            active: 'bg-blue-100 text-blue-800 border-blue-200',
            in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            cancelled: 'bg-red-100 text-red-800 border-red-200',
            pending: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <AdminLayout>
            <Head title="Projects Management" />

            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Projects Management</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Auto-refresh</span>
                    </label>
                    <button
                        onClick={fetchProjects}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm mr-2">refresh</span>
                        Refresh
                    </button>
                    <Link
                        href="/admin/projects/export"
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm mr-2">download</span>
                        Export
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-blue-600">Total Projects</h3>
                        <div className="bg-blue-500 p-2 rounded-full">
                            <span className="material-symbols-outlined text-white text-xl">cases</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{formatNumber(stats.total_projects)}</p>
                    <p className="text-sm text-blue-600 mt-2">All time</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-green-600">Active Projects</h3>
                        <div className="bg-green-500 p-2 rounded-full">
                            <span className="material-symbols-outlined text-white text-xl">play_arrow</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{formatNumber(stats.active_projects)}</p>
                    <p className="text-sm text-green-600 mt-2">Currently running</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-emerald-600">Completed</h3>
                        <div className="bg-emerald-500 p-2 rounded-full">
                            <span className="material-symbols-outlined text-white text-xl">check_circle</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-emerald-900">{formatNumber(stats.completed_projects)}</p>
                    <p className="text-sm text-emerald-600 mt-2">Successfully finished</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-purple-600">Avg. Value</h3>
                        <div className="bg-purple-500 p-2 rounded-full">
                            <span className="material-symbols-outlined text-white text-xl">attach_money</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">{formatCurrency(stats.average_value)}</p>
                    <p className="text-sm text-purple-600 mt-2">Per project</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-amber-600">Awaiting admin review</h3>
                        <div className="bg-amber-500 p-2 rounded-full">
                            <span className="material-symbols-outlined text-white text-xl">pending_actions</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-amber-900">{formatNumber(stats.awaiting_admin_review ?? 0)}</p>
                    <p className="text-sm text-amber-600 mt-2">Gig worker requested review</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <form onSubmit={handleSearch}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-7">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search Projects
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Search by project title..."
                                />
                                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div className="md:col-span-1 flex items-end">
                            <label className="flex items-center space-x-2 cursor-pointer h-10">
                                <input
                                    type="checkbox"
                                    checked={requestedReviewFilter}
                                    onChange={(e) => handleFilterChange('requested_review', e.target.checked)}
                                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                <span className="text-sm text-gray-700">Awaiting admin review</span>
                            </label>
                        </div>

                        <div className="md:col-span-1 flex items-end">
                            <button
                                type="submit"
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined">search</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Projects Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        Recent Projects ({projects?.data?.length || 0})
                    </h2>
                </div>
                <div className="p-6">
                    {projects?.data && projects.data.length > 0 ? (
                        <div className="space-y-4">
                            {projects.data.map((project) => (
                                <div key={project.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                                                <span className="material-symbols-outlined text-indigo-600">work</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {project.job?.title || 'Untitled Project'}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">Employer:</span> {project.employer?.first_name} {project.employer?.last_name}
                                                    {' • '}
                                                    <span className="font-medium">Gig Worker:</span> {project.gig_worker?.first_name} {project.gig_worker?.last_name}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Created: {new Date(project.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                                            {project.status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <span className="text-lg font-bold text-gray-900 min-w-[120px] text-right">
                                            {formatCurrency(project.agreed_amount)}
                                        </span>
                                        <Link
                                            href={`/admin/projects/${project.id}`}
                                            className="inline-flex items-center px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
                                            View Details
                                            <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <span className="material-symbols-outlined text-6xl text-gray-300">inbox</span>
                            <p className="mt-4 text-lg text-gray-500">No projects found</p>
                            <p className="text-sm text-gray-400">Try adjusting your filters</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {projects?.last_page > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing <span className="font-medium">{projects.from}</span> to <span className="font-medium">{projects.to}</span> of{' '}
                                <span className="font-medium">{projects.total}</span> results
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => router.get(projects.prev_page_url || '#')}
                                    disabled={!projects.prev_page_url}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => router.get(projects.next_page_url || '#')}
                                    disabled={!projects.next_page_url}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
