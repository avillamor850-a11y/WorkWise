import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

function adminUserTableAvatarSrc(user) {
    const raw = user.profile_picture || user.profile_photo;
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User')}&color=7F9CF5&background=EBF4FF`;
    return resolveProfileImageUrl(raw) || raw || fallback;
}

export default function UsersIndex({ users, filters }) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [userTypeFilter, setUserTypeFilter] = useState(filters.user_type || '');
    const [statusFilter, setStatusFilter] = useState(filters.profile_status || '');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/admin/users', {
            search: searchTerm,
            user_type: userTypeFilter,
            profile_status: statusFilter
        }, { preserveState: true });
    };

    const handleFilterChange = (filterType, value) => {
        const newFilters = {
            search: searchTerm,
            user_type: userTypeFilter,
            profile_status: statusFilter,
            [filterType]: value
        };
        router.get('/admin/users', newFilters, { preserveState: true });
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
                    setShowBulkActions(false);
                }
            });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getUserTypeColor = (type) => {
        switch (type) {
            case 'gig_worker': return 'bg-blue-100 text-blue-800';
            case 'employer': return 'bg-purple-100 text-purple-800';
            case 'admin': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getUserTypeLabel = (type) => {
        switch (type) {
            case 'gig_worker': return 'Gig Worker';
            case 'employer': return 'Employer';
            case 'admin': return 'Admin';
            default: return type;
        }
    };

    return (
        <AdminLayout>
            <Head title="User Management" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            User Management
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Manage and monitor all platform users
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Link
                            href="/admin/id-verifications"
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                        >
                            <span className="material-symbols-outlined mr-2">verified_user</span>
                            ID Verifications
                        </Link>
                        <Link
                            href={route('admin.users.export', {
                                format: 'csv',
                                user_type: userTypeFilter,
                                profile_status: statusFilter,
                                search: searchTerm
                            })}
                            className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 focus:bg-green-700 active:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150"
                        >
                            <span className="material-symbols-outlined mr-2">download</span>
                            Export CSV
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="material-symbols-outlined text-2xl text-blue-500">group</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Total Users
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                                            {users.total}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="material-symbols-outlined text-2xl text-green-500">verified</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Verified Users
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                                            {users.data.filter(u => u.profile_status === 'approved').length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="material-symbols-outlined text-2xl text-yellow-500">pending</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Pending Verification
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                                            {users.data.filter(u => u.profile_status === 'pending').length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="material-symbols-outlined text-2xl text-red-500">block</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Suspended Users
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                                            {users.data.filter(u => u.profile_status === 'rejected').length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Search */}
                                <div className="md:col-span-2">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Search Users
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <input
                                            type="text"
                                            name="search"
                                            id="search"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="block w-full pr-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="Search by name or email..."
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <span className="material-symbols-outlined text-gray-400">search</span>
                                        </div>
                                    </div>
                                </div>

                                {/* User Type Filter */}
                                <div>
                                    <label htmlFor="user_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        User Type
                                    </label>
                                    <select
                                        id="user_type"
                                        value={userTypeFilter}
                                        onChange={(e) => handleFilterChange('user_type', e.target.value)}
                                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        <option value="">All Types</option>
                                        <option value="gig_worker">Gig Worker</option>
                                        <option value="employer">Employer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label htmlFor="profile_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Status
                                    </label>
                                    <select
                                        id="profile_status"
                                        value={statusFilter}
                                        onChange={(e) => handleFilterChange('profile_status', e.target.value)}
                                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                >
                                    <span className="material-symbols-outlined mr-2">search</span>
                                    Search
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedUsers.length > 0 && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="text-sm text-indigo-700 dark:text-indigo-300">
                                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                                </span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleBulkAction('approve')}
                                    className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                                >
                                    <span className="material-symbols-outlined mr-1">check</span>
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleBulkAction('suspend')}
                                    className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                                >
                                    <span className="material-symbols-outlined mr-1">block</span>
                                    Suspend
                                </button>
                                <button
                                    onClick={() => handleBulkAction('delete')}
                                    className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700"
                                >
                                    <span className="material-symbols-outlined mr-1">delete</span>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                    <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                            Users ({users.total})
                        </h3>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleSelectAll}
                                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                            >
                                {selectedUsers.length === users.data.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                                            <input
                                                type="checkbox"
                                                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 sm:left-6"
                                                checked={selectedUsers.length === users.data.length && users.data.length > 0}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Joined
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Last Activity
                                        </th>
                                        <th scope="col" className="relative px-6 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {users.data.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                                                <input
                                                    type="checkbox"
                                                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 sm:left-6"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={() => handleUserSelect(user.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img
                                                            className="h-10 w-10 rounded-full"
                                                            src={adminUserTableAvatarSrc(user)}
                                                            alt=""
                                                        />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {user.first_name} {user.last_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUserTypeColor(user.user_type)}`}>
                                                    {getUserTypeLabel(user.user_type)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.profile_status)}`}>
                                                    {user.profile_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    <Link
                                                        href={`/admin/users/${user.id}`}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                    >
                                                        <span className="material-symbols-outlined">visibility</span>
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Are you sure you want to ${user.profile_status === 'rejected' ? 'activate' : 'suspend'} this user?`)) {
                                                                router.patch(
                                                                    user.profile_status === 'rejected'
                                                                        ? `/admin/users/${user.id}/activate`
                                                                        : `/admin/users/${user.id}/suspend`
                                                                );
                                                            }
                                                        }}
                                                        className={`${
                                                            user.profile_status === 'rejected'
                                                                ? 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                                                : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined">
                                                            {user.profile_status === 'rejected' ? 'check_circle' : 'block'}
                                                        </span>
                                                    </button>
                                                    {!user.is_admin && (
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                                                                    router.delete(`/admin/users/${user.id}`);
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                        >
                                                            <span className="material-symbols-outlined">delete</span>
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
                </div>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => router.get(users.prev_page_url || '#')}
                                disabled={!users.prev_page_url}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => router.get(users.next_page_url || '#')}
                                disabled={!users.next_page_url}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Showing <span className="font-medium">{users.from}</span> to{' '}
                                    <span className="font-medium">{users.to}</span> of{' '}
                                    <span className="font-medium">{users.total}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    {users.links.map((link, index) => (
                                        <button
                                            key={index}
                                            onClick={() => link.url && router.get(link.url)}
                                            disabled={!link.url}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                link.active
                                                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-900/50 dark:border-indigo-500 dark:text-indigo-400'
                                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            } ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}