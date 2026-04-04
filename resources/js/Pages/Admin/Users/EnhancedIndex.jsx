import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

function adminUserTableAvatarSrc(user) {
    const raw = user.profile_picture || user.profile_photo;
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User')}&background=6366f1&color=fff`;
    return resolveProfileImageUrl(raw) || raw || fallback;
}

export default function EnhancedUsersIndex({ users, filters }) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [userTypeFilter, setUserTypeFilter] = useState(filters.user_type || '');
    const [statusFilter, setStatusFilter] = useState(filters.profile_status || '');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

    // Slide-over state
    const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/admin/users', {
            search: searchTerm,
            user_type: userTypeFilter,
            profile_status: statusFilter
        }, { preserveState: true });
    };

    const handleFilterChange = (filterType, value) => {
        if (filterType === 'user_type') setUserTypeFilter(value);
        if (filterType === 'profile_status') setStatusFilter(value);

        router.get('/admin/users', {
            search: searchTerm,
            user_type: filterType === 'user_type' ? value : userTypeFilter,
            profile_status: filterType === 'profile_status' ? value : statusFilter
        }, { preserveState: true });
    };

    const handleUserSelect = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAll = () => {
        setSelectedUsers(
            selectedUsers.length === users.data.length
                ? []
                : users.data.map(user => user.id)
        );
    };

    const handleBulkAction = (action) => {
        if (selectedUsers.length === 0) return;

        if (confirm(`Are you sure you want to ${action} ${selectedUsers.length} users?`)) {
            router.post(`/admin/users/bulk-${action}`, {
                user_ids: selectedUsers
            }, {
                onSuccess: () => {
                    setSelectedUsers([]);
                }
            });
        }
    };

    const handleQuickAction = (userId, action) => {
        if (confirm(`Are you sure you want to ${action} this user?`)) {
            const endpoint = action === 'activate'
                ? `/admin/users/${userId}/activate`
                : `/admin/users/${userId}/suspend`;
            router.patch(endpoint);
        }
    };

    const handleDelete = (userId) => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            router.delete(`/admin/users/${userId}`);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            approved: 'bg-green-100 text-green-800 border-green-200',
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            rejected: 'bg-red-100 text-red-800 border-red-200'
        };
        return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getUserTypeBadge = (type) => {
        const styles = {
            gig_worker: 'bg-blue-100 text-blue-800 border-blue-200',
            employer: 'bg-purple-100 text-purple-800 border-purple-200',
            admin: 'bg-red-100 text-red-800 border-red-200'
        };
        return styles[type] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getUserTypeLabel = (type) => {
        const labels = {
            gig_worker: 'Gig Worker',
            employer: 'Employer',
            admin: 'Admin'
        };
        return labels[type] || type;
    };

    const stats = {
        total: users.total,
        verified: users.data.filter(u => u.profile_status === 'approved').length,
        pending: users.data.filter(u => u.profile_status === 'pending').length,
        suspended: users.data.filter(u => u.profile_status === 'rejected').length
    };

    const openUserDetails = (user) => {
        setSelectedUserForDetails(user);
        setIsSlideOverOpen(true);
    };

    // #region agent log
    useEffect(() => {
        const sample = users?.data?.find((u) => {
            const p = u.profile_picture || u.profile_photo;
            return typeof p === 'string' && p.startsWith('/supabase/');
        });
        if (!sample) return;
        const raw = sample.profile_picture || sample.profile_photo;
        const out = resolveProfileImageUrl(raw) || raw;
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fe5f63' },
            body: JSON.stringify({
                sessionId: 'fe5f63',
                hypothesisId: 'H2',
                location: 'Admin/Users/EnhancedIndex.jsx',
                message: 'admin_avatar_supabase_resolved',
                data: {
                    startsWithStorageSupabase: typeof out === 'string' && out.startsWith('/storage/supabase/'),
                },
                timestamp: Date.now(),
                runId: 'post-fix',
            }),
        }).catch(() => {});
    }, [users]);
    // #endregion

    return (
        <AdminLayout>
            <Head title="User Management" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Manage and monitor all platform users
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Link
                            href="/admin/id-verifications"
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-sm mr-2">verified_user</span>
                            ID Verifications
                        </Link>
                        <Link
                            href={route('admin.users.export', {
                                format: 'csv',
                                user_type: userTypeFilter,
                                profile_status: statusFilter,
                                search: searchTerm
                            })}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-sm mr-2">download</span>
                            Export CSV
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Total Users</p>
                                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total}</p>
                            </div>
                            <div className="bg-blue-500 p-3 rounded-full">
                                <span className="material-symbols-outlined text-white text-2xl">group</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">Verified</p>
                                <p className="text-3xl font-bold text-green-900 mt-2">{stats.verified}</p>
                            </div>
                            <div className="bg-green-500 p-3 rounded-full">
                                <span className="material-symbols-outlined text-white text-2xl">verified</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-yellow-600">Pending</p>
                                <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.pending}</p>
                            </div>
                            <div className="bg-yellow-500 p-3 rounded-full">
                                <span className="material-symbols-outlined text-white text-2xl">pending</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-red-600">Suspended</p>
                                <p className="text-3xl font-bold text-red-900 mt-2">{stats.suspended}</p>
                            </div>
                            <div className="bg-red-500 p-3 rounded-full">
                                <span className="material-symbols-outlined text-white text-2xl">block</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6">
                        <form onSubmit={handleSearch}>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Search */}
                                <div className="md:col-span-5">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Search Users
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Search by name or email..."
                                        />
                                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                                    </div>
                                </div>

                                {/* User Type */}
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        User Type
                                    </label>
                                    <select
                                        value={userTypeFilter}
                                        onChange={(e) => handleFilterChange('user_type', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">All Types</option>
                                        <option value="gig_worker">Gig Worker</option>
                                        <option value="employer">Employer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                {/* Status */}
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => handleFilterChange('profile_status', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                {/* Search Button */}
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
                </div>

                {/* Bulk Actions Bar */}
                {selectedUsers.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-indigo-900">
                                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                                </span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleBulkAction('approve')}
                                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm mr-1">check</span>
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleBulkAction('suspend')}
                                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm mr-1">block</span>
                                    Suspend
                                </button>
                                <button
                                    onClick={() => handleBulkAction('delete')}
                                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm mr-1">delete</span>
                                    Delete
                                </button>
                                <button
                                    onClick={() => setSelectedUsers([])}
                                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Users ({users.total})
                        </h3>
                        <button
                            onClick={handleSelectAll}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            {selectedUsers.length === users.data.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="w-12 px-6 py-3">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={selectedUsers.length === users.data.length && users.data.length > 0}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Joined
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Active
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.data.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => handleUserSelect(user.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img
                                                    className="h-10 w-10 rounded-full ring-2 ring-gray-200"
                                                    src={adminUserTableAvatarSrc(user)}
                                                    alt=""
                                                />
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getUserTypeBadge(user.user_type)}`}>
                                                {getUserTypeLabel(user.user_type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(user.profile_status)}`}>
                                                {user.profile_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => openUserDetails(user)}
                                                    className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors"
                                                    title="View Details"
                                                >
                                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => handleQuickAction(user.id, user.profile_status === 'rejected' ? 'activate' : 'suspend')}
                                                    className={`p-1 rounded transition-colors ${user.profile_status === 'rejected'
                                                        ? 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                                        : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                                                        }`}
                                                    title={user.profile_status === 'rejected' ? 'Activate' : 'Suspend'}
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        {user.profile_status === 'rejected' ? 'check_circle' : 'block'}
                                                    </span>
                                                </button>
                                                {!user.is_admin && (
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing <span className="font-medium">{users.from}</span> to <span className="font-medium">{users.to}</span> of{' '}
                                <span className="font-medium">{users.total}</span> results
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => router.get(users.prev_page_url || '#')}
                                    disabled={!users.prev_page_url}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => router.get(users.next_page_url || '#')}
                                    disabled={!users.next_page_url}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Slide-over for User Details */}
            {isSlideOverOpen && selectedUserForDetails && (
                <div className="fixed inset-0 overflow-hidden z-50">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsSlideOverOpen(false)}></div>
                        <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex sm:pl-16">
                            <div className="w-screen max-w-2xl transform transition ease-in-out duration-500 max-h-screen overflow-y-auto">
                                <div className="h-full flex flex-col pt-6 pb-20 bg-white shadow-xl overflow-y-scroll">
                                    <div className="px-4 sm:px-6">
                                        <div className="flex items-start justify-between">
                                            <h2 className="text-xl font-medium text-gray-900" id="slide-over-title">
                                                User Details
                                            </h2>
                                            <div className="ml-3 h-7 flex items-center">
                                                <button
                                                    onClick={() => setIsSlideOverOpen(false)}
                                                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <span className="sr-only">Close panel</span>
                                                    <span className="material-symbols-outlined">close</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 relative flex-1 px-4 sm:px-6">
                                        {/* User Header */}
                                        <div className="flex items-center pb-6 border-b border-gray-200">
                                            <img
                                                className="h-20 w-20 rounded-full"
                                                src={adminUserTableAvatarSrc(selectedUserForDetails)}
                                                alt=""
                                            />
                                            <div className="ml-6 flex-1">
                                                <h3 className="text-2xl font-bold text-gray-900">{selectedUserForDetails.first_name} {selectedUserForDetails.last_name}</h3>
                                                <p className="text-sm text-gray-500">{selectedUserForDetails.email}</p>
                                                <div className="mt-2 flex items-center gap-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getUserTypeBadge(selectedUserForDetails.user_type)}`}>
                                                        {getUserTypeLabel(selectedUserForDetails.user_type)}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(selectedUserForDetails.profile_status)}`}>
                                                        {selectedUserForDetails.profile_status}
                                                    </span>
                                                </div>
                                            </div>
                                            <Link href={`/admin/users/${selectedUserForDetails.id}`} className="ml-4 px-4 py-2 border border-indigo-600 text-indigo-600 rounded flex items-center justify-center hover:bg-indigo-50 transition">
                                                Full Profile <span className="material-symbols-outlined ml-1 text-sm">open_in_new</span>
                                            </Link>
                                        </div>

                                        {/* Specific Attributes based on User Type */}
                                        <div className="mt-8">
                                            <h4 className="text-sm tracking-widest text-gray-400 uppercase font-semibold mb-4">Professional Information</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                                                {selectedUserForDetails.user_type === 'gig_worker' ? (
                                                    <>
                                                        <div className="sm:col-span-1">
                                                            <dt className="text-sm font-medium text-gray-500">Professional Title</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{selectedUserForDetails.professional_title || 'N/A'}</dd>
                                                        </div>
                                                        <div className="sm:col-span-1">
                                                            <dt className="text-sm font-medium text-gray-500">Hourly Rate</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{selectedUserForDetails.hourly_rate ? `₱${selectedUserForDetails.hourly_rate}/hr` : 'N/A'}</dd>
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <dt className="text-sm font-medium text-gray-500">Skills</dt>
                                                            <dd className="mt-1 text-sm text-gray-900 flex flex-wrap gap-2">
                                                                {selectedUserForDetails.skills_with_experience && Array.isArray(selectedUserForDetails.skills_with_experience) && selectedUserForDetails.skills_with_experience.length > 0 ? (
                                                                    selectedUserForDetails.skills_with_experience.map((skillObj, idx) => (
                                                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                            {typeof skillObj === 'object' ? skillObj.skill : skillObj}
                                                                        </span>
                                                                    ))
                                                                ) : 'No skills listed'}
                                                            </dd>
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <dt className="text-sm font-medium text-gray-500">Bio</dt>
                                                            <dd className="mt-1 text-sm text-gray-900 break-all">{selectedUserForDetails.bio || 'No bio provided'}</dd>
                                                        </div>
                                                    </>
                                                ) : selectedUserForDetails.user_type === 'employer' ? (
                                                    <>
                                                        <div className="sm:col-span-1">
                                                            <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{selectedUserForDetails.company_name || 'N/A'}</dd>
                                                        </div>
                                                        <div className="sm:col-span-1">
                                                            <dt className="text-sm font-medium text-gray-500">Industry</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{selectedUserForDetails.industry || 'N/A'}</dd>
                                                        </div>
                                                        <div className="sm:col-span-1">
                                                            <dt className="text-sm font-medium text-gray-500">Company Size</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{selectedUserForDetails.company_size || 'N/A'}</dd>
                                                        </div>
                                                        <div className="sm:col-span-1">
                                                            <dt className="text-sm font-medium text-gray-500">Work Type Needed</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{selectedUserForDetails.work_type_needed || 'N/A'}</dd>
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <dt className="text-sm font-medium text-gray-500">Company Description</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{selectedUserForDetails.company_description || 'No description provided'}</dd>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="sm:col-span-2 text-sm text-gray-500">No specific professional info for Admin type.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
