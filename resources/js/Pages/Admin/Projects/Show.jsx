import React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function ShowProject({ project }) {
    const { flash } = usePage().props;

    const formatCurrency = (amount) => {
        if (!amount) return '₱0.00';
        return '₱' + new Intl.NumberFormat('en-PH', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(amount);
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
            <Head title={`Project: ${project.job?.title || 'Details'}`} />

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <Link
                            href="/admin/projects"
                            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
                        >
                            <span className="material-symbols-outlined text-sm mr-1">arrow_back</span>
                            Back to Projects
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {project.job?.title || 'Project Details'}
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Project ID: #{project.id}
                        </p>
                    </div>
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}>
                        {project.status?.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
                {flash?.success && (
                    <p className="text-sm text-green-600 mb-2">{flash.success}</p>
                )}
                {flash?.error && (
                    <p className="text-sm text-red-600 mb-2">{flash.error}</p>
                )}
            </div>

            {/* Admin: Approve completion & release payment */}
            {project.status === 'completed' && !project.payment_released && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-amber-900 mb-2">Payment release</h3>
                    {!project.employer_approved && (
                        <p className="text-sm text-amber-800 mb-3">Employer has not approved; you can release on their behalf.</p>
                    )}
                    {project.admin_review_requested_at && (
                        <p className="text-sm text-amber-800 mb-3">
                            Gig worker requested admin review on {new Date(project.admin_review_requested_at).toLocaleString()}.
                            {project.admin_review_request_notes && ` Notes: ${project.admin_review_request_notes}`}
                        </p>
                    )}
                    <form
                        method="post"
                        action={route('admin.projects.approveAndRelease', project.id)}
                        onSubmit={(e) => { e.preventDefault(); router.post(route('admin.projects.approveAndRelease', project.id), {}, { preserveScroll: true }); }}
                        className="inline"
                    >
                        <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
                        >
                            Approve completion & release payment
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Project Information */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Project Information</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Job Title</label>
                                <p className="text-gray-900 font-medium">{project.job?.title || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-600">Description</label>
                                <p className="text-gray-900">{project.job?.description || 'No description available'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Category</label>
                                    <p className="text-gray-900">{project.job?.category || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Budget</label>
                                    <p className="text-gray-900 font-semibold">{formatCurrency(project.job?.budget)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Agreed Amount</label>
                                    <p className="text-gray-900 font-bold text-lg">{formatCurrency(project.agreed_amount)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Status</label>
                                    <p className="text-gray-900">{project.status?.replace('_', ' ')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Created</label>
                                    <p className="text-gray-900">{new Date(project.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Last Updated</label>
                                    <p className="text-gray-900">{new Date(project.updated_at).toLocaleString()}</p>
                                </div>
                            </div>

                            {project.started_at && (
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Started At</label>
                                    <p className="text-gray-900">{new Date(project.started_at).toLocaleString()}</p>
                                </div>
                            )}

                            {project.completed_at && (
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Completed At</label>
                                    <p className="text-gray-900">{new Date(project.completed_at).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Transactions */}
                    {project.transactions && project.transactions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Transactions</h2>
                            <div className="space-y-3">
                                {project.transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-gray-900">{transaction.type}</p>
                                            <p className="text-sm text-gray-600">
                                                {new Date(transaction.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">{formatCurrency(transaction.amount)}</p>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {transaction.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Employer Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Employer</h3>
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-purple-600">business</span>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">
                                    {project.employer?.first_name} {project.employer?.last_name}
                                </p>
                                <p className="text-sm text-gray-600">{project.employer?.email}</p>
                            </div>
                        </div>
                        <Link
                            href={`/admin/users/${project.employer?.id}`}
                            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                        >
                            View Profile
                            <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                        </Link>
                    </div>

                    {/* Gig Worker Info */}
                    {project.gig_worker && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Gig Worker</h3>
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600">person</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {project.gig_worker?.first_name} {project.gig_worker?.last_name}
                                    </p>
                                    <p className="text-sm text-gray-600">{project.gig_worker?.email}</p>
                                </div>
                            </div>
                            <Link
                                href={`/admin/users/${project.gig_worker?.id}`}
                                className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                View Profile
                                <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                            </Link>
                        </div>
                    )}

                    {/* Contract Info */}
                    {project.contract && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Contract</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Status</label>
                                    <p className="text-gray-900">{project.contract.status}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Amount</label>
                                    <p className="text-gray-900 font-bold">{formatCurrency(project.contract.amount)}</p>
                                </div>
                                {project.contract.signed_at && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Signed At</label>
                                        <p className="text-gray-900">{new Date(project.contract.signed_at).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
                        <h3 className="text-lg font-bold text-indigo-900 mb-4">Quick Stats</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-indigo-700">Project Value</span>
                                <span className="font-bold text-indigo-900">{formatCurrency(project.agreed_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-indigo-700">Status</span>
                                <span className="font-semibold text-indigo-900">{project.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-indigo-700">Duration</span>
                                <span className="font-semibold text-indigo-900">
                                    {project.started_at && project.completed_at
                                        ? `${Math.ceil((new Date(project.completed_at) - new Date(project.started_at)) / (1000 * 60 * 60 * 24))} days`
                                        : project.started_at
                                        ? `${Math.ceil((new Date() - new Date(project.started_at)) / (1000 * 60 * 60 * 24))} days`
                                        : 'Not started'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
