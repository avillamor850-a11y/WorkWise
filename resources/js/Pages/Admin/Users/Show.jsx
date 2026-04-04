import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

export default function UserShow({ user, stats, postedJobs = [], userBids = [], auditLogs = [] }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [editForm, setEditForm] = useState({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type,
        profile_status: user.profile_status,
        is_admin: user.is_admin
    });

    const handleEditSubmit = (e) => {
        e.preventDefault();
        router.patch(`/admin/users/${user.id}/status`, editForm, {
            onSuccess: () => {
                setIsEditing(false);
            }
        });
    };

    const handleStatusChange = (action) => {
        if (confirm(`Are you sure you want to ${action} this user?`)) {
            router.patch(`/admin/users/${user.id}/${action}`);
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

    const getIdTypeLabel = (idType) => {
        const labels = {
            national_id: 'National ID (PhilSys)',
            drivers_license: "Driver's License",
            passport: 'Passport',
            philhealth_id: 'PhilHealth ID',
            sss_id: 'SSS ID',
            umid: 'UMID',
            voters_id: "Voter's ID",
            prc_id: 'PRC ID',
        };
        return idType ? (labels[idType] || idType) : '—';
    };

    const getDisplaySkillNames = () => {
        if (user.display_skill_names && Array.isArray(user.display_skill_names) && user.display_skill_names.length > 0) {
            return user.display_skill_names;
        }
        const raw = user.skills_with_experience;
        if (!raw || !Array.isArray(raw)) return [];
        return raw.map((item) => {
            const name = typeof item === 'object' ? (item?.skill ?? item?.name ?? null) : item;
            return name ? String(name).trim() : null;
        }).filter(Boolean);
    };

    const openImageModal = (imageUrl) => {
        setSelectedImage(imageUrl);
        setShowImageModal(true);
    };
    const closeImageModal = () => {
        setShowImageModal(false);
        setSelectedImage(null);
    };

    const tabs = [
        { id: 'overview', name: 'Overview', icon: 'dashboard' },
        { id: 'projects', name: 'Projects', icon: 'cases' },
        { id: 'activity', name: 'Activity', icon: 'timeline' },
        { id: 'reports', name: 'Reports', icon: 'flag' },
    ];

    return (
        <AdminLayout>
            <Head title={`User: ${user.first_name} ${user.last_name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/admin/users"
                            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                            <span className="material-symbols-outlined mr-1">arrow_back</span>
                            Back to Users
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {user.first_name} {user.last_name}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="inline-flex items-center px-4 py-2 bg-gray-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition ease-in-out duration-150"
                        >
                            <span className="material-symbols-outlined mr-2">edit</span>
                            Edit User
                        </button>
                        {user.profile_status === 'rejected' ? (
                            <button
                                onClick={() => handleStatusChange('activate')}
                                className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 focus:bg-green-700 active:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150"
                            >
                                <span className="material-symbols-outlined mr-2">check_circle</span>
                                Activate
                            </button>
                        ) : (
                            <button
                                onClick={() => handleStatusChange('suspend')}
                                className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-700 focus:bg-red-700 active:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition ease-in-out duration-150"
                            >
                                <span className="material-symbols-outlined mr-2">block</span>
                                Suspend
                            </button>
                        )}
                        {!user.is_admin && (
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                                        router.delete(`/admin/users/${user.id}`);
                                    }
                                }}
                                className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-700 focus:bg-red-700 active:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition ease-in-out duration-150"
                            >
                                <span className="material-symbols-outlined mr-2">delete</span>
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                {/* User Profile Card */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center space-x-6">
                            <div className="flex-shrink-0">
                                <img
                                    className="h-20 w-20 rounded-full"
                                    src={
                                        resolveProfileImageUrl(
                                            user.profile_picture_url ||
                                                user.profile_photo ||
                                                user.profile_picture ||
                                                user.avatar,
                                        ) ||
                                        user.profile_picture_url ||
                                        user.profile_photo ||
                                        user.profile_picture ||
                                        user.avatar ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name + ' ' + user.last_name)}&color=7F9CF5&background=EBF4FF&size=80`
                                    }
                                    alt=""
                                />
                            </div>
                            <div className="flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                            {user.first_name} {user.last_name}
                                        </h3>
                                        <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                                        {user.professional_title && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                {user.professional_title}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getUserTypeColor(user.user_type)}`}>
                                            {getUserTypeLabel(user.user_type)}
                                        </span>
                                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(user.profile_status)}`}>
                                            {user.profile_status.charAt(0).toUpperCase() + user.profile_status.slice(1)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Joined {new Date(user.created_at).toLocaleDateString()}
                                        </p>
                                        {user.is_admin && (
                                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full mt-1">
                                                <span className="material-symbols-outlined mr-1 text-sm">admin_panel_settings</span>
                                                Admin User
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                {isEditing && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Edit User Details
                            </h3>
                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            id="first_name"
                                            value={editForm.first_name}
                                            onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            id="last_name"
                                            value={editForm.last_name}
                                            onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="user_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            User Type
                                        </label>
                                        <select
                                            id="user_type"
                                            value={editForm.user_type}
                                            onChange={(e) => setEditForm({ ...editForm, user_type: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="gig_worker">Gig Worker</option>
                                            <option value="employer">Employer</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="profile_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Profile Status
                                        </label>
                                        <select
                                            id="profile_status"
                                            value={editForm.profile_status}
                                            onChange={(e) => setEditForm({ ...editForm, profile_status: e.target.value })}
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="is_admin"
                                            checked={editForm.is_admin}
                                            onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                            Admin User
                                        </label>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="inline-flex items-center px-4 py-2 bg-gray-300 border border-transparent rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-400 focus:bg-gray-400 active:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="material-symbols-outlined text-2xl text-blue-500">cases</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Total Projects
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                                            {stats.total_projects}
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
                                    <span className="material-symbols-outlined text-2xl text-green-500">task_alt</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Completed Projects
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                                            {stats.completed_projects}
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
                                    <span className="material-symbols-outlined text-2xl text-yellow-500">account_balance_wallet</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            {user.user_type === 'gig_worker' ? 'Total Earnings' : 'Total Spent'}
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                                            ₱{user.user_type === 'gig_worker' ? stats.total_earnings : stats.total_spent}
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
                                    <span className="material-symbols-outlined text-2xl text-red-500">flag</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                                            Reports
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                                            {stats.reports_submitted + stats.reports_received}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <span className="material-symbols-outlined mr-2">{tab.icon}</span>
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            User Information
                                        </h3>
                                        <dl className="space-y-3">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">{user.first_name} {user.last_name}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">{user.email}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">User Type</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">{getUserTypeLabel(user.user_type)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Profile Status</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">{user.profile_status.charAt(0).toUpperCase() + user.profile_status.slice(1)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Joined Date</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">{new Date(user.created_at).toLocaleDateString()}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">{new Date(user.updated_at).toLocaleDateString()}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Additional Details
                                        </h3>
                                        <dl className="space-y-3">
                                            {user.bio && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white break-all">{user.bio}</dd>
                                                </div>
                                            )}
                                            {user.location && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.location}</dd>
                                                </div>
                                            )}
                                            {user.phone && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.phone}</dd>
                                                </div>
                                            )}
                                            {user.professional_title && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Professional Title</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.professional_title}</dd>
                                                </div>
                                            )}
                                            {user.hourly_rate && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Hourly Rate</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">₱{user.hourly_rate}/hr</dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                </div>

                                {/* Verification Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            ID Verification
                                        </h3>
                                        <dl className="space-y-3">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">ID Type</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">{getIdTypeLabel(user.id_type)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Verification Status</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">
                                                    {user.id_verification_status ? user.id_verification_status.charAt(0).toUpperCase() + user.id_verification_status.slice(1) : '—'}
                                                </dd>
                                            </div>
                                            {user.id_verified_at && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Verified At</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{new Date(user.id_verified_at).toLocaleString()}</dd>
                                                </div>
                                            )}
                                            {user.id_verification_notes && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.id_verification_notes}</dd>
                                                </div>
                                            )}
                                        </dl>
                                        {/* ID image thumbnails */}
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Front of ID</p>
                                                {(user.id_front_image_url || user.id_front_image) ? (
                                                    <div className="relative group">
                                                        <img
                                                            src={user.id_front_image_url || user.id_front_image}
                                                            alt="Front of ID"
                                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90 transition max-h-40 object-cover"
                                                            onClick={() => openImageModal(user.id_front_image_url || user.id_front_image)}
                                                        />
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click to enlarge</p>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">No image</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Back of ID</p>
                                                {(user.id_back_image_url || user.id_back_image) ? (
                                                    <div className="relative group">
                                                        <img
                                                            src={user.id_back_image_url || user.id_back_image}
                                                            alt="Back of ID"
                                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90 transition max-h-40 object-cover"
                                                            onClick={() => openImageModal(user.id_back_image_url || user.id_back_image)}
                                                        />
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click to enlarge</p>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">No image</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Financial &amp; Location
                                        </h3>
                                        <dl className="space-y-3">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Escrow Balance</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">
                                                    {user.escrow_balance != null ? `₱${Number(user.escrow_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Stripe Onboarding</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">
                                                    {(user.stripe_onboarded_at || user.stripe_account_id) ? 'Onboarded' : 'Not onboarded'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                                                <dd className="text-sm text-gray-900 dark:text-white">
                                                    {[user.street_address, user.city, user.postal_code, user.province, user.municipality, user.barangay, user.country].filter(Boolean).join(', ') || '—'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>

                                {/* Role-specific details */}
                                {user.user_type === 'employer' && (
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Employer Details
                                        </h3>
                                        <dl className="space-y-3">
                                            {user.company_name && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Company Name</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.company_name}</dd>
                                                </div>
                                            )}
                                            {user.industry && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Industry</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.industry}</dd>
                                                </div>
                                            )}
                                            {user.company_size && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Company Size</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.company_size}</dd>
                                                </div>
                                            )}
                                            {user.company_website && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">
                                                        <a href={user.company_website.startsWith('http') ? user.company_website : `https://${user.company_website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">{user.company_website}</a>
                                                    </dd>
                                                </div>
                                            )}
                                            {user.company_description && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.company_description}</dd>
                                                </div>
                                            )}
                                            {(user.primary_hiring_needs && (Array.isArray(user.primary_hiring_needs) ? user.primary_hiring_needs.length : 0) > 0) && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Primary Hiring Needs</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{Array.isArray(user.primary_hiring_needs) ? user.primary_hiring_needs.join(', ') : user.primary_hiring_needs}</dd>
                                                </div>
                                            )}
                                            {user.typical_project_budget && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Typical Project Budget</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.typical_project_budget}</dd>
                                                </div>
                                            )}
                                            {user.typical_project_duration && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Typical Project Duration</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.typical_project_duration}</dd>
                                                </div>
                                            )}
                                            {user.preferred_experience_level && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Preferred Experience Level</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.preferred_experience_level}</dd>
                                                </div>
                                            )}
                                            {user.hiring_frequency && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Hiring Frequency</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">{user.hiring_frequency}</dd>
                                                </div>
                                            )}
                                            {!user.company_name && !user.industry && !user.company_website && !user.company_description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">No employer details provided.</p>
                                            )}
                                        </dl>
                                    </div>
                                )}

                                {user.user_type === 'gig_worker' && (
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Gig Worker Details
                                        </h3>
                                        <dl className="space-y-3">
                                            {user.portfolio_link && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Portfolio</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">
                                                        <a href={user.portfolio_link.startsWith('http') ? user.portfolio_link : `https://${user.portfolio_link}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">{user.portfolio_link}</a>
                                                    </dd>
                                                </div>
                                            )}
                                            {(user.resume_file_url || user.resume_file) && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Resume</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">
                                                        <a href={user.resume_file_url || user.resume_file} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">View resume</a>
                                                    </dd>
                                                </div>
                                            )}
                                            {getDisplaySkillNames().length > 0 && (
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Skills</dt>
                                                    <dd className="text-sm text-gray-900 dark:text-white">
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {getDisplaySkillNames().map((name, i) => (
                                                                <span key={i} className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{name}</span>
                                                            ))}
                                                        </div>
                                                    </dd>
                                                </div>
                                            )}
                                            {!user.portfolio_link && !user.resume_file && !user.resume_file_url && getDisplaySkillNames().length === 0 && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">No gig worker details provided.</p>
                                            )}
                                        </dl>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'projects' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    Projects ({stats.total_projects})
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Includes hidden and draft jobs so you can review what triggered alerts.</p>

                                {/* Posted jobs (employers only) */}
                                {user.user_type === 'employer' && postedJobs && postedJobs.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Posted jobs</h4>
                                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {postedJobs.map((job) => (
                                                <li key={job.id} className="py-3 flex items-center justify-between">
                                                    <div>
                                                        <Link
                                                            href={`/jobs/${job.id}`}
                                                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                                        >
                                                            {job.title}
                                                        </Link>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                            {job.description ? `${job.description.slice(0, 80)}${job.description.length > 80 ? '…' : ''}` : '—'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {job.hidden_by_admin && (
                                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" title="Hidden by admin">Hidden</span>
                                                        )}
                                                        {(job.status === 'draft' || job.status === 'pending') && (
                                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Draft</span>
                                                        )}
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${job.status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : job.status === 'closed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                            {job.status}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Employer projects */}
                                {user.employer_projects && user.employer_projects.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Projects as employer</h4>
                                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {user.employer_projects.map((project) => (
                                                <li key={project.id} className="py-3 flex items-center justify-between">
                                                    <div>
                                                        <Link
                                                            href={`/admin/projects/${project.id}`}
                                                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                                        >
                                                            Project #{project.id}
                                                        </Link>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                            Status: {project.status}
                                                            {project.job && ` · ${project.job.title}`}
                                                        </p>
                                                    </div>
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${project.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : project.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                        {project.status}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Gig worker projects */}
                                {user.gig_worker_projects && user.gig_worker_projects.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Projects as gig worker</h4>
                                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {user.gig_worker_projects.map((project) => (
                                                <li key={project.id} className="py-3 flex items-center justify-between">
                                                    <div>
                                                        <Link
                                                            href={`/admin/projects/${project.id}`}
                                                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                                        >
                                                            Project #{project.id}
                                                        </Link>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                            Status: {project.status}
                                                            {project.job && ` · ${project.job.title}`}
                                                        </p>
                                                    </div>
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${project.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : project.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                        {project.status}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Bids (gig workers only) – check for copy-pasted vs tailored proposal messages */}
                                {user.user_type === 'gig_worker' && userBids && userBids.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bids</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Check for copy-pasted vs tailored proposal messages.</p>
                                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {userBids.map((bid) => (
                                                <li key={bid.id} className="py-3">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0 flex-1">
                                                            {bid.job && (
                                                                <Link
                                                                    href={`/jobs/${bid.job.id}`}
                                                                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                                                >
                                                                    {bid.job.title}
                                                                </Link>
                                                            )}
                                                            {!bid.job && <span className="font-medium text-gray-900 dark:text-white">Job #{bid.job_id}</span>}
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                                {bid.proposal_message ? `${bid.proposal_message.slice(0, 120)}${bid.proposal_message.length > 120 ? '…' : ''}` : '—'}
                                                            </p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                {bid.submitted_at ? new Date(bid.submitted_at).toLocaleString() : '—'}
                                                            </p>
                                                        </div>
                                                        <span className={`inline-flex flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${bid.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : bid.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : bid.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                            {bid.status}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {stats.total_projects === 0 && (!postedJobs || postedJobs.length === 0) && (!userBids || userBids.length === 0) && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">cases</span>
                                        <p>No projects or posted jobs</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    Recent Activity
                                </h3>
                                {auditLogs && auditLogs.length > 0 ? (
                                    <div className="flow-root">
                                        <ul className="-mb-8">
                                            {auditLogs.map((log, idx) => (
                                                <li key={log.id || idx}>
                                                    <div className="relative pb-8">
                                                        {idx < auditLogs.length - 1 && (
                                                            <span className="absolute left-3 top-3 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600" aria-hidden="true" />
                                                        )}
                                                        <div className="relative flex space-x-3">
                                                            <div className="flex min-w-0 flex-1 justify-between space-x-4">
                                                                <div>
                                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                                        <span className="font-medium">{log.action === 'CREATE' ? 'Created' : log.action === 'UPDATE' ? 'Updated' : log.action === 'DELETE' ? 'Deleted' : log.action}</span>
                                                                        {' '}{log.table_name === 'users' ? 'Profile' : log.table_name.replace(/_/g, ' ')}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                        {log.logged_at ? new Date(log.logged_at).toLocaleString() : '—'}
                                                                    </p>
                                                                    {(log.ip_address || log.user_agent) && (
                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                                                            {log.ip_address && <span title="Check for VPN/datacenter IP">IP: {log.ip_address}</span>}
                                                                            {log.ip_address && (log.user_agent && (typeof log.user_agent === 'string' ? log.user_agent : log.user_agent?.user_agent)) && ' · '}
                                                                            {log.user_agent && (
                                                                                <span title="Check for suspicious browser">
                                                                                    Browser: {typeof log.user_agent === 'string' ? log.user_agent.slice(0, 80) : (log.user_agent?.user_agent || '').slice(0, 80)}
                                                                                    {(typeof log.user_agent === 'string' ? log.user_agent : log.user_agent?.user_agent || '').length > 80 ? '…' : ''}
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                    {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                                                            {log.metadata.route_action || log.metadata.method || JSON.stringify(log.metadata).slice(0, 60)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">timeline</span>
                                        <p>No activity recorded yet</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    Reports ({stats.reports_submitted + stats.reports_received})
                                </h3>

                                {user.reports_submitted && user.reports_submitted.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Submitted by this user</h4>
                                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {user.reports_submitted.map((report) => (
                                                <li key={report.id} className="py-3">
                                                    <p className="text-sm text-gray-900 dark:text-white font-medium">Report #{report.id} · {report.type || 'Report'}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{report.description || '—'}</p>
                                                    <span className={`inline-flex mt-2 px-2 py-1 text-xs font-semibold rounded-full ${report.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : report.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                        {report.status}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {user.reports_received && user.reports_received.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reports against this user</h4>
                                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {user.reports_received.map((report) => (
                                                <li key={report.id} className="py-3">
                                                    <p className="text-sm text-gray-900 dark:text-white font-medium">Report #{report.id} · {report.type || 'Report'}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{report.description || '—'}</p>
                                                    <span className={`inline-flex mt-2 px-2 py-1 text-xs font-semibold rounded-full ${report.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : report.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                        {report.status}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {stats.reports_submitted + stats.reports_received === 0 && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">flag</span>
                                        <p>No reports</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Image zoom modal for ID documents */}
                {showImageModal && selectedImage && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
                        onClick={closeImageModal}
                    >
                        <div className="relative max-w-6xl max-h-full">
                            <button
                                type="button"
                                onClick={closeImageModal}
                                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <img
                                src={selectedImage}
                                alt="ID Document"
                                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}