import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

export default function Show({ user, auth }) {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    const mediaSrc = (path) => (path ? (resolveProfileImageUrl(path) || path) : null);

    const openImageModal = (imageUrl) => {
        setSelectedImage(mediaSrc(imageUrl));
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setShowImageModal(false);
        setSelectedImage(null);
    };

    const handleApprove = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            router.post(
                `/admin/id-verifications/${user.id}/approve`,
                {},
                {
                    onSuccess: () => {
                        setShowApproveModal(false);
                        // Redirect back to index with success message
                        router.visit('/admin/id-verifications', {
                            preserveState: false,
                        });
                    },
                    onError: (errors) => {
                        setError(errors.message || 'Failed to approve verification');
                        setIsProcessing(false);
                    },
                    onFinish: () => {
                        setIsProcessing(false);
                    }
                }
            );
        } catch (err) {
            setError('An unexpected error occurred');
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setError('Please provide a reason for rejection');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            router.post(
                `/admin/id-verifications/${user.id}/reject`,
                { notes: rejectionReason },
                {
                    onSuccess: () => {
                        setShowRejectModal(false);
                        setRejectionReason('');
                        // Redirect back to index with success message
                        router.visit('/admin/id-verifications', {
                            preserveState: false,
                        });
                    },
                    onError: (errors) => {
                        setError(errors.message || 'Failed to reject verification');
                        setIsProcessing(false);
                    },
                    onFinish: () => {
                        setIsProcessing(false);
                    }
                }
            );
        } catch (err) {
            setError('An unexpected error occurred');
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            verified: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };
        const labels = {
            pending: 'Pending Review',
            verified: 'Verified',
            rejected: 'Rejected',
        };

        return (
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${badges[status]}`}>
                {labels[status]}
            </span>
        );
    };

    const getIdTypeLabel = (idType) => {
        const labels = {
            'national_id': 'National ID',
            'drivers_license': "Driver's License",
            'passport': 'Passport',
            'philhealth_id': 'PhilHealth',
            'sss_id': 'SSS',
            'umid': 'UMID',
            'voters_id': "Voter's ID",
            'prc_id': 'PRC',
        };
        return labels[idType] || idType || 'Not specified';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AdminLayout user={auth.user}>
            <Head title={`Verify ${user.first_name} ${user.last_name}`} />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Header with Back Button */}
                    <div className="mb-8">
                        <button
                            onClick={() => router.visit('/admin/id-verifications')}
                            className="text-indigo-600 hover:text-indigo-900 mb-4 inline-flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Verifications
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">ID Verification Review</h1>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* User Information Card */}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6 mb-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    {mediaSrc(user.profile_picture || user.profile_photo) ? (
                                        <img
                                            className="h-20 w-20 rounded-full object-cover"
                                            src={mediaSrc(user.profile_picture || user.profile_photo)}
                                            alt={`${user.first_name} ${user.last_name}`}
                                        />
                                    ) : (
                                        <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-2xl text-gray-500 font-medium">
                                                {user.first_name?.[0]}{user.last_name?.[0]}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="ml-6">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {user.first_name} {user.last_name}
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                                    <div className="mt-2 flex items-center gap-3">
                                        <span className="text-sm text-gray-500">
                                            User Type: <span className="font-medium text-gray-900 capitalize">{user.user_type}</span>
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        {getStatusBadge(user.id_verification_status)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional User Details */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
                            <div>
                                <p className="text-sm font-medium text-gray-500">ID Type</p>
                                <p className="mt-1 text-sm text-gray-900">{getIdTypeLabel(user.id_type)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Submission Date</p>
                                <p className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</p>
                            </div>
                            {user.id_verified_at && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Verified Date</p>
                                    <p className="mt-1 text-sm text-gray-900">{formatDate(user.id_verified_at)}</p>
                                </div>
                            )}
                            {user.id_verification_notes && (
                                <div className="md:col-span-2">
                                    <p className="text-sm font-medium text-gray-500">Notes</p>
                                    <p className="mt-1 text-sm text-gray-900">{user.id_verification_notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ID Images */}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">ID Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Front ID */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Front of ID</h4>
                                {user.id_front_image ? (
                                    <div className="relative group">
                                        <img
                                            src={mediaSrc(user.id_front_image)}
                                            alt="Front ID"
                                            className="w-full rounded-lg border border-gray-300 cursor-pointer hover:opacity-90 transition"
                                            onClick={() => openImageModal(user.id_front_image)}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition rounded-lg flex items-center justify-center">
                                            <svg className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                            </svg>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 text-center">Click to enlarge</p>
                                    </div>
                                ) : (
                                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <p className="text-gray-500">No front image uploaded</p>
                                    </div>
                                )}
                            </div>

                            {/* Back ID */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Back of ID</h4>
                                {user.id_back_image ? (
                                    <div className="relative group">
                                        <img
                                            src={mediaSrc(user.id_back_image)}
                                            alt="Back ID"
                                            className="w-full rounded-lg border border-gray-300 cursor-pointer hover:opacity-90 transition"
                                            onClick={() => openImageModal(user.id_back_image)}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition rounded-lg flex items-center justify-center">
                                            <svg className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                            </svg>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 text-center">Click to enlarge</p>
                                    </div>
                                ) : (
                                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <p className="text-gray-500">No back image uploaded</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {user.id_verification_status === 'pending' && (
                        <div className="bg-white shadow-sm sm:rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Actions</h3>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowApproveModal(true)}
                                    disabled={isProcessing}
                                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {isProcessing ? 'Processing...' : '✓ Approve Verification'}
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    disabled={isProcessing}
                                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {isProcessing ? 'Processing...' : '✕ Reject Verification'}
                                </button>
                            </div>
                        </div>
                    )}

                    {user.id_verification_status === 'verified' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                            <div className="flex items-center">
                                <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <p className="text-green-800 font-medium">This ID has been verified</p>
                            </div>
                        </div>
                    )}

                    {user.id_verification_status === 'rejected' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                            <div className="flex items-center">
                                <svg className="w-6 h-6 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-red-800 font-medium">This ID has been rejected</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Approve Confirmation Modal */}
            {showApproveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve ID Verification</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to approve this ID verification? The user will be notified and receive a verified badge.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowApproveModal(false)}
                                disabled={isProcessing}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
                            >
                                {isProcessing ? 'Approving...' : 'Confirm Approval'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject ID Verification</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value.slice(0, 500))}
                                placeholder="Please provide a clear reason for rejection (e.g., 'Image is blurry', 'ID is expired', 'Name doesn't match')"
                                className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                rows="4"
                                required
                            />
                            <div className="text-xs text-gray-500 mt-1">{rejectionReason.length}/500 characters</div>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                            The user will be notified with this reason and can resubmit their ID documents.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectionReason('');
                                    setError(null);
                                }}
                                disabled={isProcessing}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isProcessing || !rejectionReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Zoom Modal */}
            {showImageModal && selectedImage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
                    onClick={closeImageModal}
                >
                    <div className="relative max-w-6xl max-h-full">
                        <button
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
        </AdminLayout>
    );
}
