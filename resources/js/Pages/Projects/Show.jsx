import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SuccessModal from '@/Components/SuccessModal';
import MiniChatModal from '@/Components/MiniChatModal';
import ThankYouModal from '@/Components/ThankYouModal';
import { formatDistanceToNow } from 'date-fns';

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmColor = 'green', isLoading = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                ></div>

                <div className="inline-block align-bottom bg-[#0d1014] border border-white/10 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${confirmColor === 'green' ? 'bg-green-500/20' : confirmColor === 'blue' ? 'bg-blue-500/20' : 'bg-red-500/20'} sm:mx-0 sm:h-10 sm:w-10`}>
                                {confirmColor === 'green' ? (
                                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : confirmColor === 'blue' ? (
                                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                ) : (
                                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                )}
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-white">
                                    {title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-white/60">
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-white/10">
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d1014] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                confirmColor === 'green'
                                    ? 'bg-green-600 hover:bg-green-500 focus:ring-green-500'
                                    : confirmColor === 'blue'
                                    ? 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500'
                                    : 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
                            }`}
                        >
                            {isLoading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : confirmText}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-white/20 shadow-sm px-4 py-2 bg-white/5 text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d1014] focus:ring-white/20 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ProjectShow({ project, hasPayment, canReview, isEmployer, autoReleaseDays = 14 }) {
    const { auth, flash } = usePage().props;
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [showRevisionForm, setShowRevisionForm] = useState(false);
    const [showCompletionForm, setShowCompletionForm] = useState(false);
    const [completionError, setCompletionError] = useState(null);
    const [showMiniChat, setShowMiniChat] = useState(false);
    const [miniChatTargetUserId, setMiniChatTargetUserId] = useState(null);
    const [showThankYouModal, setShowThankYouModal] = useState(false);
    const [showAdminReviewModal, setShowAdminReviewModal] = useState(false);
    const miniChatRef = useRef(null);

    // Check for thank you flag from backend
    useEffect(() => {
        if (flash?.showThankYou) {
            setShowThankYouModal(true);
        }
    }, [flash]);

    // Helper function to safely parse required_skills
    const parseSkills = (skills) => {
        if (!skills) return [];

        // If it's already an array, return it
        if (Array.isArray(skills)) return skills;

        // If it's a string, try to parse it as JSON
        if (typeof skills === 'string') {
            try {
                const parsed = JSON.parse(skills);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }

        return [];
    };
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        action: null,
        title: '',
        message: '',
        confirmText: '',
        confirmColor: 'blue'
    });
    const [successModal, setSuccessModal] = useState({
        isOpen: false,
        message: ''
    });

    const { data, setData, post, processing, errors, reset } = useForm({
        rating: 5,
        comment: '',
        criteria_ratings: {
            communication: 5,
            quality: 5,
            timeliness: 5
        }
    });

    const { data: revisionData, setData: setRevisionData, post: postRevision, processing: revisionProcessing } = useForm({
        revision_notes: ''
    });

    const { data: completionData, setData: setCompletionData, post: postCompletion, processing: completionProcessing, reset: resetCompletion } = useForm({
        completion_notes: ''
    });

    const { data: adminReviewData, setData: setAdminReviewData, post: postAdminReview, processing: adminReviewProcessing } = useForm({
        notes: project.admin_review_request_notes || ''
    });

    const getStatusBadge = (status) => {
        const badges = {
            active: 'bg-blue-500/20 text-blue-400',
            completed: 'bg-green-500/20 text-green-400',
            cancelled: 'bg-red-500/20 text-red-400',
            disputed: 'bg-amber-500/20 text-amber-400'
        };
        return badges[status] || 'bg-white/10 text-white/70';
    };

    const handleComplete = () => {
        setShowCompletionForm(true);
        setCompletionError(null);
        resetCompletion();
    };

    const handleApprove = () => {
        setConfirmModal({
            isOpen: true,
            action: 'approve',
            title: 'Approve Project Completion',
            message: 'Are you sure you want to approve this project as completed? This will automatically release the payment to the gig worker.',
            confirmText: 'Approve & Release Payment',
            confirmColor: 'blue'
        });
    };

    const handleReleasePayment = () => {
        setConfirmModal({
            isOpen: true,
            action: 'release',
            title: 'Release Payment',
            message: 'Are you sure you want to release the payment? This action cannot be undone and the funds will be transferred to the gig worker immediately.',
            confirmText: 'Release Payment',
            confirmColor: 'green'
        });
    };

    const handleRequestAdminReview = () => {
        setShowAdminReviewModal(true);
        setAdminReviewData('notes', project.admin_review_request_notes || '');
    };

    const submitAdminReviewRequest = () => {
        postAdminReview(`/projects/${project.id}/request-admin-review`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowAdminReviewModal(false);
                setSuccessModal({ isOpen: true, message: 'Admin review requested. An admin will review and can release your payment if appropriate.' });
            }
        });
    };

    const handleConfirmAction = () => {
        if (confirmModal.action === 'approve') {
            post(`/projects/${project.id}/approve`, {
                onSuccess: () => {
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    setSuccessModal({
                        isOpen: true,
                        message: `Project approved successfully! Payment of ₱${project.net_amount} has been automatically sent to ${project.gig_worker?.first_name} ${project.gig_worker?.last_name}.`
                    });
                },
                onError: () => setConfirmModal({ ...confirmModal, isOpen: false })
            });
        } else if (confirmModal.action === 'release') {
            post(`/projects/${project.id}/payment/release`, {
                onSuccess: () => {
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    setSuccessModal({
                        isOpen: true,
                        message: `Payment of ₱${project.net_amount} has been successfully sent to ${project.gig_worker?.first_name} ${project.gig_worker?.last_name}!`
                    });
                },
                onError: () => setConfirmModal({ ...confirmModal, isOpen: false })
            });
        }
    };

    const handleCloseModal = () => {
        if (!processing) {
            setConfirmModal({ ...confirmModal, isOpen: false });
        }
    };

    const handleSendMessage = (userId) => {
        setMiniChatTargetUserId(userId);
        setShowMiniChat(true);
    };

    const submitReview = (e) => {
        e.preventDefault();
        post(route('projects.review', project.id), {
            onSuccess: () => {
                setShowReviewForm(false);
                reset();
                setShowThankYouModal(true);
            }
        });
    };

    const submitRevision = (e) => {
        e.preventDefault();
        postRevision(`/projects/${project.id}/request-revision`, {
            onSuccess: () => {
                setShowRevisionForm(false);
                setRevisionData('revision_notes', '');
            }
        });
    };

    const submitCompletion = (e) => {
        e.preventDefault();
        setCompletionError(null);

        postCompletion(route('projects.complete', project.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowCompletionForm(false);
                resetCompletion();
                setSuccessModal({
                    isOpen: true,
                    message: 'Project marked as complete! The employer will be notified to review and approve your work.'
                });
                // Refresh the page after modal closes to show updated status
                setTimeout(() => {
                    window.location.reload();
                }, 1200);
            },
            onError: (errors) => {
                console.error('Completion error:', errors);
                if (errors.completion_notes) {
                    setCompletionError(errors.completion_notes);
                } else if (errors.error) {
                    setCompletionError(errors.error);
                } else {
                    setCompletionError('Failed to complete project. Please try again.');
                }
            }
        });
    };

    return (
        <AuthenticatedLayout
            pageTheme="dark"
            header={
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="font-semibold text-xl text-white leading-tight">
                            {project.job.title}
                        </h2>
                        <p className="text-sm text-white/60 mt-1">
                            Project with{' '}
                            <Link
                                href={isEmployer 
                                    ? route('gig-worker.profile.show', project.gig_worker.id)
                                    : route('employers.show', project.employer.id)
                                }
                                className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                {isEmployer ? project.gig_worker.first_name : project.employer.first_name}{' '}
                                {isEmployer ? project.gig_worker.last_name : project.employer.last_name}
                            </Link>
                        </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(project.status)}`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                </div>
            }
        >
            <Head title={`Project: ${project.job.title}`} />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="min-h-screen bg-[#05070A] relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-20 py-12 max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Project Overview */}
                            <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Project Overview</h3>
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-white/80">{project.job.description}</p>
                                    </div>
                                    
                                    <div className="mt-6 grid grid-cols-2 gap-4">
                                        <div>
                                            <dt className="text-sm font-medium text-white/50">Required Skills</dt>
                                            <dd className="mt-1">
                                                <div className="flex flex-wrap gap-2">
                                                    {parseSkills(project?.job?.required_skills || []).map((skill, index) => (
                                                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-white/50">Experience Level</dt>
                                            <dd className="mt-1 text-sm text-white capitalize">{project.job.experience_level}</dd>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Project Actions */}
                            {project.status === 'active' && (
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Project Actions</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {!isEmployer && (
                                                <button
                                                    onClick={handleComplete}
                                                    className="inline-flex items-center px-5 py-2.5 bg-green-600 hover:bg-green-500 border border-transparent rounded-lg font-medium text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition-colors duration-200"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Mark as Completed
                                                </button>
                                            )}
                                            
                                            {isEmployer && (
                                                <button
                                                    onClick={() => setShowRevisionForm(true)}
                                                    className="inline-flex items-center px-5 py-2.5 bg-amber-600 hover:bg-amber-500 border border-transparent rounded-lg font-medium text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition-colors duration-200"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Request Revision
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleSendMessage(isEmployer ? project.gig_worker.id : project.employer.id)}
                                                className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 border border-transparent rounded-lg font-medium text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition-colors duration-200"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                                Send Message
                                            </button>
                                        </div>

                                        {/* Completion Form Modal */}
                                        {showCompletionForm && (
                                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                                                <div className="bg-[#0d1014] border border-white/10 rounded-xl p-6 max-w-md w-full">
                                                    <h3 className="text-lg font-semibold text-white mb-4">Complete Project</h3>
                                                    {completionError && (
                                                        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                                            {completionError}
                                                        </div>
                                                    )}
                                                    <form onSubmit={submitCompletion}>
                                                        <div className="mb-4">
                                                            <label className="block text-sm font-medium text-white/80 mb-1">
                                                                Completion Notes *
                                                            </label>
                                                            <textarea
                                                                value={completionData.completion_notes}
                                                                onChange={e => setCompletionData('completion_notes', e.target.value)}
                                                                rows={4}
                                                                className="w-full border border-white/20 rounded-md bg-white/5 text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                                                                placeholder="Describe what you've completed and any final notes for the employer..."
                                                                required
                                                            />
                                                        </div>
                                                        <div className="flex justify-end space-x-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowCompletionForm(false);
                                                                    setCompletionError(null);
                                                                    resetCompletion();
                                                                }}
                                                                className="px-4 py-2 text-sm font-medium text-white/80 bg-white/5 border border-white/20 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d1014] focus:ring-white/20"
                                                                disabled={completionProcessing}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                disabled={completionProcessing}
                                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d1014] focus:ring-blue-500 disabled:opacity-50"
                                                            >
                                                                {completionProcessing ? (
                                                                    <>
                                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                        Processing...
                                                                    </>
                                                                ) : 'Complete Project'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Completed Project Actions */}
                            {project.status === 'completed' && (
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Project Completed</h3>
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <span className="text-green-400 text-xl">✅</span>
                                                </div>
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-medium text-green-400">
                                                        Project Completed Successfully
                                                    </h3>
                                                    <div className="mt-2 text-sm text-white/70">
                                                        <p>This project has been marked as completed.</p>
                                                        {!isEmployer && !project.employer_approved && !project.payment_released && autoReleaseDays > 0 && (
                                                            <p className="mt-2 text-amber-200/90">
                                                                Waiting for employer approval. If they don&apos;t respond within {autoReleaseDays} days, payment will be released to you automatically.
                                                            </p>
                                                        )}
                                                        {!isEmployer && project.admin_review_requested_at && !project.payment_released && (
                                                            <p className="mt-2 text-amber-200/90">
                                                                Admin review requested on {new Date(project.admin_review_requested_at).toLocaleString()}.
                                                                {project.admin_review_request_notes && ` Notes: ${project.admin_review_request_notes}`}
                                                            </p>
                                                        )}
                                                        {project.completion_notes && (
                                                            <p className="mt-1"><strong className="text-white/90">Notes:</strong> {project.completion_notes}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            {isEmployer && !project.employer_approved && (
                                                <button
                                                    onClick={handleApprove}
                                                    className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 border border-transparent rounded-lg font-medium text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition-colors duration-200"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Approve Completion
                                                </button>
                                            )}
                                            {isEmployer && !project.employer_approved && autoReleaseDays > 0 && (
                                                <p className="text-sm text-white/50 mt-1 w-full">
                                                    If you don&apos;t approve or request revision within {autoReleaseDays} days, payment will be released to the gig worker automatically.
                                                </p>
                                            )}

                                            {isEmployer && project.employer_approved && hasPayment && !project.payment_released && (
                                                <button
                                                    onClick={handleReleasePayment}
                                                    className="inline-flex items-center px-5 py-2.5 bg-green-600 hover:bg-green-500 border border-transparent rounded-lg font-medium text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition-colors duration-200"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Release Payment
                                                </button>
                                            )}

                                            {!isEmployer && !project.employer_approved && !project.payment_released && (
                                                <button
                                                    onClick={handleRequestAdminReview}
                                                    className="inline-flex items-center px-5 py-2.5 bg-amber-600 hover:bg-amber-500 border border-transparent rounded-lg font-medium text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition-colors duration-200"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                    </svg>
                                                    {project.admin_review_requested_at ? 'Update admin review request' : 'Request admin review'}
                                                </button>
                                            )}

                                            {canReview && (
                                                <button
                                                    onClick={() => setShowReviewForm(true)}
                                                    className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 border border-transparent rounded-lg font-medium text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition-colors duration-200"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                    </svg>
                                                    Leave Review
                                                </button>
                                            )}

                                            <Link
                                                href="/payment/history"
                                                className="inline-flex items-center px-5 py-2.5 border border-white/20 bg-white/5 hover:bg-white/10 rounded-lg font-medium text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#05070A] transition-colors duration-200"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                </svg>
                                                View Payments
                                            </Link>
                                        </div>

                                        {/* Status Timeline */}
                                        <div className="mt-6 border-t border-white/10 pt-4">
                                            <h4 className="text-sm font-medium text-white/50 mb-2">Project Timeline</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center text-sm">
                                                    <div className="w-24 flex-shrink-0 text-white/50">Completed:</div>
                                                    <div className="text-white/80">{formatDistanceToNow(new Date(project.completed_at))} ago</div>
                                                </div>
                                                {project.employer_approved && (
                                                    <div className="flex items-center text-sm">
                                                        <div className="w-24 flex-shrink-0 text-white/50">Approved:</div>
                                                        <div className="text-white/80">{formatDistanceToNow(new Date(project.approved_at))} ago</div>
                                                    </div>
                                                )}
                                                {project.payment_released && (
                                                    <div className="flex items-center text-sm">
                                                        <div className="w-24 flex-shrink-0 text-white/50">Paid:</div>
                                                        <div className="text-white/80">{formatDistanceToNow(new Date(project.payment_released_at))} ago</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reviews */}
                            {project.reviews && project.reviews.length > 0 && (
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Reviews</h3>
                                        <div className="space-y-4">
                                            {project.reviews.map((review) => (
                                                <div key={review.id} className="border-l-4 border-blue-500 pl-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="font-medium text-white">
                                                            {review.reviewer.first_name} {review.reviewer.last_name}
                                                        </div>
                                                        <div className="flex items-center">
                                                            {[...Array(5)].map((_, i) => (
                                                                <span key={i} className={`text-lg ${i < review.rating ? 'text-amber-400' : 'text-white/20'}`}>
                                                                    ★
                                                                </span>
                                                            ))}
                                                            <span className="ml-2 text-sm text-white/60">({review.rating}/5)</span>
                                                        </div>
                                                    </div>
                                                    {review.comment && (
                                                        <p className="text-white/70">{review.comment}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Project Details */}
                            <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Project Details</h3>
                                    <dl className="space-y-3">
                                        <div>
                                            <dt className="text-sm font-medium text-white/50">Project Value</dt>
                                            <dd className="text-lg font-semibold text-green-400">
                                                ₱{project.agreed_amount.toLocaleString()}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-white/50">Duration</dt>
                                            <dd className="text-sm text-white/80">{project.agreed_duration_days} days</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-white/50">Started</dt>
                                            <dd className="text-sm text-white/80">
                                                {formatDistanceToNow(new Date(project.started_at))} ago
                                            </dd>
                                        </div>
                                        {project.deadline && (
                                            <div>
                                                <dt className="text-sm font-medium text-white/50">Deadline</dt>
                                                <dd className="text-sm text-white/80">
                                                    {new Date(project.deadline).toLocaleDateString()}
                                                </dd>
                                            </div>
                                        )}
                                        {project.completed_at && (
                                            <div>
                                                <dt className="text-sm font-medium text-white/50">Completed</dt>
                                                <dd className="text-sm text-white/80">
                                                    {formatDistanceToNow(new Date(project.completed_at))} ago
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                            </div>

                            {/* Payment Status */}
                            {hasPayment && (
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Payment Status</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-white/60">Escrow</span>
                                                <span className="text-sm font-medium text-green-400">✅ Secured</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-white/60">Payment</span>
                                                <span className={`text-sm font-medium ${project.payment_released ? 'text-green-400' : 'text-amber-400'}`}>
                                                    {project.payment_released ? '✅ Released' : '⏳ In Escrow'}
                                                </span>
                                            </div>
                                        </div>
                                        <Link
                                            href="/payment/history"
                                            className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                                        >
                                            View transaction details →
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => handleSendMessage(isEmployer ? project.gig_worker.id : project.employer.id)}
                                            className="flex items-center w-full text-left px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white rounded-lg border border-white/10 hover:border-blue-500/30 transition-colors duration-200"
                                        >
                                            <svg className="w-5 h-5 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            Send Message
                                        </button>
                                        <Link
                                            href="/payment/history"
                                            className="flex items-center w-full text-left px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors duration-200"
                                        >
                                            <svg className="w-5 h-5 mr-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                            Payment History
                                        </Link>
                                        <Link
                                            href={`/reports/create?user_id=${isEmployer ? project.gig_worker.id : project.employer.id}&project_id=${project.id}`}
                                            className="flex items-center w-full text-left px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg border border-white/10 hover:border-red-500/30 transition-colors duration-200"
                                        >
                                            <svg className="w-5 h-5 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            Report Issue
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {showReviewForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-md p-6 border border-white/10 shadow-xl rounded-xl bg-[#0d1014]">
                        <div>
                            <h3 className="text-lg font-medium text-white mb-4">Leave a Review</h3>
                            <form onSubmit={submitReview}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Overall Rating
                                    </label>
                                    <div className="flex items-center space-x-1">
                                        {[1, 2, 3, 4, 5].map((rating) => (
                                            <button
                                                key={rating}
                                                type="button"
                                                onClick={() => setData('rating', rating)}
                                                className={`text-2xl ${rating <= data.rating ? 'text-amber-400' : 'text-white/20'} hover:text-amber-400`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Comment (Optional)
                                    </label>
                                    <textarea
                                        value={data.comment}
                                        onChange={(e) => setData('comment', e.target.value)}
                                        rows={4}
                                        className="w-full border border-white/20 rounded-md bg-white/5 text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                                        placeholder="Share your experience..."
                                    />
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowReviewForm(false)}
                                        className="px-4 py-2 text-sm font-medium text-white/80 bg-white/5 border border-white/20 rounded-md hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50"
                                    >
                                        {processing ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Revision Request Modal */}
            {showRevisionForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-md p-6 border border-white/10 shadow-xl rounded-xl bg-[#0d1014]">
                        <div>
                            <h3 className="text-lg font-medium text-white mb-4">Request Revision</h3>
                            <form onSubmit={submitRevision}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Revision Notes
                                    </label>
                                    <textarea
                                        value={revisionData.revision_notes}
                                        onChange={(e) => setRevisionData('revision_notes', e.target.value)}
                                        rows={4}
                                        className="w-full border border-white/20 rounded-md bg-white/5 text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                                        placeholder="Please describe what changes you'd like..."
                                        required
                                    />
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowRevisionForm(false)}
                                        className="px-4 py-2 text-sm font-medium text-white/80 bg-white/5 border border-white/20 rounded-md hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={revisionProcessing}
                                        className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-500 disabled:opacity-50"
                                    >
                                        {revisionProcessing ? 'Sending...' : 'Request Revision'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmAction}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmColor={confirmModal.confirmColor}
                isLoading={processing}
            />

            {/* Success Modal */}
            <SuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ isOpen: false, message: '' })}
                message={successModal.message}
                duration={successModal.message.toLowerCase().includes('payment') ? 4000 : 2000}
                showProcessing={!successModal.message.toLowerCase().includes('payment')}
            />

            {/* Request admin review modal (gig worker) */}
            {showAdminReviewModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !adminReviewProcessing && setShowAdminReviewModal(false)} />
                        <div className="inline-block align-bottom bg-[#0d1014] border border-white/10 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="px-4 pt-5 pb-4 sm:p-6">
                                <h3 className="text-lg font-medium text-white">Request admin review</h3>
                                <p className="mt-2 text-sm text-white/60">An admin can approve completion and release your payment if the employer has not responded. Optional: add notes for the admin.</p>
                                <div className="mt-4">
                                    <textarea
                                        value={adminReviewData.notes}
                                        onChange={(e) => setAdminReviewData('notes', e.target.value)}
                                        placeholder="e.g. Work delivered on time, employer not responding..."
                                        rows={3}
                                        className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 sm:text-sm"
                                        maxLength={1000}
                                    />
                                </div>
                            </div>
                            <div className="bg-white/5 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-white/10 gap-3">
                                <button
                                    type="button"
                                    onClick={submitAdminReviewRequest}
                                    disabled={adminReviewProcessing}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d1014] focus:ring-amber-500 sm:w-auto disabled:opacity-50"
                                >
                                    {adminReviewProcessing ? 'Sending...' : 'Submit request'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => !adminReviewProcessing && setShowAdminReviewModal(false)}
                                    disabled={adminReviewProcessing}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-white/20 px-4 py-2 bg-white/5 text-white/80 hover:bg-white/10 text-sm font-medium sm:mt-0 sm:w-auto disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mini Chat Modal */}
            {showMiniChat && (
                <MiniChatModal
                    ref={miniChatRef}
                    isOpen={showMiniChat}
                    targetUserId={miniChatTargetUserId}
                    onUserIdProcessed={() => {
                        setMiniChatTargetUserId(null);
                    }}
                />
            )}

            {/* Thank You Modal */}
            <ThankYouModal
                isOpen={showThankYouModal}
                onClose={() => setShowThankYouModal(false)}
                message={isEmployer 
                    ? "Thank you for reviewing the gig worker! Your feedback helps build a better community." 
                    : "Thank you for reviewing the employer! Your feedback helps build a better community."}
                duration={3500}
            />

            <style>{`
                body {
                    background: #05070A;
                    color: #e5e7eb;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
