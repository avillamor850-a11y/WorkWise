import React, { useState } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import SuccessModal from '@/Components/SuccessModal';
import ErrorModal from '@/Components/ErrorModal';
import MessagesModal from '@/Components/MessagesModal';
import { formatDistanceToNow } from 'date-fns';
import { getProfilePhotoUrl, getLocationDisplay } from '@/utils/profileHelpers';

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmColor = 'green', isLoading = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    onClick={onClose}
                ></div>

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${confirmColor === 'green' ? 'bg-green-100' : 'bg-red-100'} sm:mx-0 sm:h-10 sm:w-10`}>
                                {confirmColor === 'green' ? (
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                )}
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    {title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                confirmColor === 'green'
                                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
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
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function JobShow({ job, canBid }) {
    const { auth } = usePage().props;
    const [showBidForm, setShowBidForm] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [processingBidId, setProcessingBidId] = useState(null);
    const [error, setError] = useState(null);
    const [showMessagesModal, setShowMessagesModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Debug: Log job data to verify gig worker IDs
    React.useEffect(() => {
        console.log('=== JOB DATA DEBUG ===');
        console.log('Job ID:', job.id);
        console.log('Job Title:', job.title);
        console.log('Total Bids:', job.bids?.length || 0);
        
        if (job.bids && job.bids.length > 0) {
            job.bids.forEach((bid, index) => {
                console.log(`Bid ${index + 1}:`, {
                    bidId: bid.id,
                    gigWorkerId: bid.gig_worker?.id,
                    gigWorkerName: bid.gig_worker ? `${bid.gig_worker.first_name} ${bid.gig_worker.last_name}` : 'N/A',
                    expectedUrl: bid.gig_worker?.id ? `/workers/${bid.gig_worker.id}` : 'N/A'
                });
            });
        }
        console.log('=== END DEBUG ===');
    }, [job]);

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
        bidId: null,
        status: null,
        title: '',
        message: '',
        confirmText: '',
        confirmColor: 'green'
    });
    const [successModal, setSuccessModal] = useState({
        isOpen: false,
        message: ''
    });
    const [errorModal, setErrorModal] = useState({
        isOpen: false,
        title: 'Error',
        message: '',
        actionButton: null
    });
    
    const { data, setData, post, errors, reset } = useForm({
        job_id: job.id,
        bid_amount: '',
        proposal_message: '',
        estimated_days: '',
    });

    const handleSubmitBid = (e) => {
        e.preventDefault();
        post(route('bids.store'), {
            onSuccess: () => {
                reset();
                setShowBidForm(false);
            },
        });
    };

    const handleBidAction = (bidId, status) => {
        const isAccepting = status === 'accepted';
        setConfirmModal({
            isOpen: true,
            bidId,
            status,
            title: isAccepting ? 'Accept Proposal' : 'Decline Proposal',
            message: isAccepting
                ? 'Are you sure you want to accept this proposal? This will create a new project and deduct the bid amount from your escrow balance.'
                : 'Are you sure you want to decline this proposal? This action cannot be undone.',
            confirmText: isAccepting ? 'Accept Proposal' : 'Decline Proposal',
            confirmColor: isAccepting ? 'green' : 'red'
        });
    };

    const handleConfirmBidAction = () => {
        setProcessing(true);
        setProcessingBidId(confirmModal.bidId);
        setError(null);

        console.log('Sending bid update request:', {
            bidId: confirmModal.bidId,
            status: confirmModal.status,
            route: route('bids.update', confirmModal.bidId)
        });

        router.patch(
            route('bids.update', confirmModal.bidId),
            { status: confirmModal.status },
            {
                preserveScroll: false,
                onSuccess: (page) => {
                    setProcessing(false);
                    setProcessingBidId(null);
                    setError(null);
                    setConfirmModal({ ...confirmModal, isOpen: false });

                    // Debug logging
                    console.log('onSuccess callback - page.props:', page.props);
                    console.log('page.props.errors:', page.props?.errors);
                    console.log('page.props.flash:', page.props?.flash);

                    // Check if there's an error in the validation errors (from withErrors)
                    if (page.props?.errors) {
                        console.log('Found errors in page.props.errors:', page.props.errors);
                        
                        // Check if this is an insufficient escrow error
                        if (page.props.errors.error_type === 'insufficient_escrow') {
                            console.log('Setting insufficient escrow error modal');
                            const required = page.props.errors.required_amount;
                            const current = page.props.errors.current_balance;
                            const format = (n) => Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            setErrorModal({
                                isOpen: true,
                                title: 'Insufficient Escrow Balance',
                                message: `You need ₱${format(required)} to accept this proposal, but your current balance is only ₱${format(current)}.\n\nHow to add funds:\n1. Click "Add Funds to Escrow" below (or open Wallet from the menu).\n2. Enter the amount you need (at least the required amount).\n3. Complete payment with your card.\n4. Return here and accept the proposal again.`,
                                actionButton: {
                                    text: 'Add Funds to Escrow',
                                    onClick: () => {
                                        setErrorModal({ ...errorModal, isOpen: false });
                                        router.visit(route('employer.wallet.index'));
                                    }
                                }
                            });
                        } else {
                            console.log('Setting generic error:', page.props.errors.error || 'Insuffecient Escrow Balance');
                            setError(page.props.errors.error || 'Insuffecient Escrow Balance');
                        }
                        return;
                    }

                    // Check if there's an error in the flash messages
                    if (page.props?.flash?.error) {
                        console.log('Found flash error:', page.props.flash.error);
                        console.log('Flash error_type:', page.props.flash.error_type);
                        
                        // Check if this is an insufficient escrow error
                        if (page.props.flash.error_type === 'insufficient_escrow') {
                            console.log('Setting insufficient escrow error modal from flash');
                            const required = page.props.flash.required_amount;
                            const current = page.props.flash.current_balance;
                            const format = (n) => Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            setErrorModal({
                                isOpen: true,
                                title: 'Insufficient Escrow Balance',
                                message: `You need ₱${format(required)} to accept this proposal, but your current balance is only ₱${format(current)}.\n\nHow to add funds:\n1. Click "Add Funds to Escrow" below (or open Wallet from the menu).\n2. Enter the amount you need (at least the required amount).\n3. Complete payment with your card.\n4. Return here and accept the proposal again.`,
                                actionButton: {
                                    text: 'Add Funds to Escrow',
                                    onClick: () => {
                                        setErrorModal({ ...errorModal, isOpen: false });
                                        router.visit(route('employer.wallet.index'));
                                    }
                                }
                            });
                        } else {
                            setError(page.props.flash.error);
                        }
                        return;
                    }

                    // Show success modal only if we have a success message
                    if (page.props?.flash?.success) {
                        const isAccepting = confirmModal.status === 'accepted';
                        const successMessage = isAccepting
                            ? 'Proposal accepted successfully! Redirecting to contract signing...'
                            : 'Proposal declined successfully.';

                        setSuccessModal({
                            isOpen: true,
                            message: successMessage
                        });

                        // For accepted bids, redirect to contract signing
                        if (isAccepting && page.props?.flash?.redirect) {
                            setTimeout(() => {
                                router.visit(page.props.flash.redirect);
                            }, 1500);
                        }
                    }
                },
                onError: (errors) => {
                    console.error('Bid update failed - onError callback:', errors);
                    console.log('onError - errors structure:', JSON.stringify(errors, null, 2));
                    setProcessing(false);
                    setProcessingBidId(null);
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    
                    // Check if this is an insufficient escrow error
                    if (errors.error_type === 'insufficient_escrow') {
                        console.log('onError - Setting insufficient escrow error modal');
                        const required = errors.required_amount;
                        const current = errors.current_balance;
                        const format = (n) => Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        setErrorModal({
                            isOpen: true,
                            title: 'Insufficient Escrow Balance',
                            message: `You need ₱${format(required)} to accept this proposal, but your current balance is only ₱${format(current)}.\n\nHow to add funds:\n1. Click "Add Funds to Escrow" below (or open Wallet from the menu).\n2. Enter the amount you need (at least the required amount).\n3. Complete payment with your card.\n4. Return here and accept the proposal again.`,
                            actionButton: {
                                text: 'Add Funds to Escrow',
                                onClick: () => {
                                    setErrorModal({ ...errorModal, isOpen: false });
                                    router.visit(route('employer.wallet.index'));
                                }
                            }
                        });
                    } else {
                        console.log('onError - Setting generic error:', errors.error || errors.message || 'Failed to update bid status. Please try again.');
                        setError(errors.error || errors.message || 'Failed to update bid status. Please try again.');
                    }
                }
            }
        );
    };

    const handleCloseModal = () => {
        if (!processing) {
            setConfirmModal({ ...confirmModal, isOpen: false });
        }
    };

    const handleContactEmployer = (userId) => {
        setSelectedUserId(userId);
        setShowMessagesModal(true);
    };

    const isEmployer = auth.user.user_type === 'employer';
    const isJobOwner = isEmployer && job.employer_id === auth.user.id;

    const formatAmount = (value) => {
        const number = Number(value ?? 0);
        return number.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getBudgetDisplay = () => {
        if (job.budget_type === 'fixed') {
            return `₱${formatAmount(job.budget_min)} - ₱${formatAmount(job.budget_max)}`;
        }
        return `₱${formatAmount(job.budget_min)} - ₱${formatAmount(job.budget_max)}/hr`;
    };

    const getExperienceBadge = (level) => {
        const badges = {
            beginner: 'bg-green-100 text-green-800',
            intermediate: 'bg-blue-100 text-blue-800',
            expert: 'bg-purple-100 text-purple-800'
        };
        return badges[level] || 'bg-gray-100 text-gray-800';
    };

    const getExperienceBadgeDark = (level) => {
        const badges = {
            beginner: 'bg-green-500/20 text-green-400 border border-green-500/30',
            intermediate: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
            expert: 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
        };
        return badges[level] || 'bg-gray-700 text-gray-200 border border-gray-600';
    };

    const getStatusBadge = (status) => {
        const badges = {
            open: 'bg-green-100 text-green-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-gray-100 text-gray-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusBadgeDark = (status) => {
        const badges = {
            open: 'bg-green-500/20 text-green-400 border border-green-500/30',
            in_progress: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
            completed: 'bg-gray-700 text-gray-400 border border-gray-600',
            cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30'
        };
        return badges[status] || 'bg-gray-700 text-gray-400 border border-gray-600';
    };

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const getUserAvatar = (user, dark = false) => {
        // Check if user exists and has required properties
        if (!user || !user.first_name || !user.last_name) {
            return (
                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-semibold ${dark ? 'bg-gray-600 text-gray-100' : 'bg-gray-400 text-white'}`}>
                    ?
                </div>
            );
        }

        const photoUrl = getProfilePhotoUrl(user.profile_photo);
        if (photoUrl) {
            return (
                <img
                    src={photoUrl}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="h-12 w-12 rounded-full object-cover border border-gray-600"
                />
            );
        }
        
        const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        const colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'
        ];
        const colorIndex = user.id % colors.length;
        
        return (
            <div className={`h-12 w-12 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white text-lg font-semibold`}>
                {initials}
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : 'light'}
            header={
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className={`font-semibold text-xl leading-tight tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            {job.title}
                        </h2>
                        <div className="flex items-center space-x-4 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? getStatusBadgeDark(job.status) : getStatusBadge(job.status)}`}>
                                {job.status === 'open' ? 'Open for Proposals' : job.status.replace('_', ' ')}
                            </span>
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Posted {formatDistanceToNow(new Date(job.created_at))} ago
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Link
                            href="/jobs"
                            className={isDark ? 'inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50' : 'inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50'}
                        >
                            ← Back to Jobs
                        </Link>
                        {isJobOwner && (
                            <Link
                                href={`/jobs/${job.id}/edit`}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition ease-in-out duration-150"
                            >
                                Edit Job
                            </Link>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={job.title} />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative min-h-screen py-12 overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-700/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Job Description */}
                            <div className={`backdrop-blur-sm overflow-hidden border rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="p-8">
                                    <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Job Description</h3>
                                    <div className="prose max-w-none">
                                        <p className={`whitespace-pre-wrap leading-relaxed text-lg ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            {job.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Skills Requirements */}
                            {(job?.skills_requirements?.length > 0 || parseSkills(job?.required_skills || []).length > 0) && (
                                <div className={`backdrop-blur-sm overflow-hidden border rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-8">
                                        <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Skills Requirements</h3>
                                        
                                        {job?.skills_requirements?.length > 0 ? (
                                            <>
                                                {job.skills_requirements.filter(s => s.importance === 'required').length > 0 && (
                                                    <div className="mb-6">
                                                        <h4 className={`text-lg font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Required Skills</h4>
                                                        <div className="flex flex-wrap gap-3">
                                                            {job.skills_requirements
                                                                .filter(s => s.importance === 'required')
                                                                .map((skill, index) => (
                                                                    <div key={index} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                                                        <span>{skill.skill}</span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? getExperienceBadgeDark(skill.experience_level) : getExperienceBadge(skill.experience_level)}`}>
                                                                            {skill.experience_level}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {job.skills_requirements.filter(s => s.importance === 'preferred').length > 0 && (
                                                    <div className="mb-6">
                                                        <h4 className={`text-lg font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Preferred Skills</h4>
                                                        <div className="flex flex-wrap gap-3">
                                                            {job.skills_requirements
                                                                .filter(s => s.importance === 'preferred')
                                                                .map((skill, index) => (
                                                                    <div key={index} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${isDark ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100 text-green-800 border-green-200'}`}>
                                                                        <span>{skill.skill}</span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? getExperienceBadgeDark(skill.experience_level) : getExperienceBadge(skill.experience_level)}`}>
                                                                            {skill.experience_level}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {job?.nice_to_have_skills?.length > 0 && (
                                                    <div>
                                                        <h4 className={`text-lg font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Nice to Have</h4>
                                                        <div className="flex flex-wrap gap-3">
                                                            {job.nice_to_have_skills.map((skill, index) => (
                                                                <div key={index} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${isDark ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                                                    <span>{skill.skill}</span>
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? getExperienceBadgeDark(skill.experience_level) : getExperienceBadge(skill.experience_level)}`}>
                                                                        {skill.experience_level}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-wrap gap-3">
                                                {parseSkills(job?.required_skills || []).map((skill, index) => (
                                                    <span key={index} className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border ${isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Proposals Section */}
                            {job.bids && Array.isArray(job.bids) && job.bids.length > 0 && (isJobOwner || !isEmployer) && (
                                <div className={`backdrop-blur-sm overflow-hidden border rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-8">
                                        <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                            Proposals ({job.bids.length})
                                        </h3>
                                        <div className="space-y-6">
                                            {job.bids.map((bid) => (
                                                <div key={bid.id} className={`border rounded-xl p-6 transition-all duration-300 ${isDark ? 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40' : 'bg-blue-50 border-blue-200 hover:border-blue-300'}`}>
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center space-x-3">
                                                            {getUserAvatar(bid.gig_worker, isDark)}
                                                            <div>
                                                                <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                                    {bid.gig_worker ? (
                                                                        <a
                                                                            href={`/workers/${bid.gig_worker.id}`}
                                                                            className={isDark ? 'text-blue-400 hover:text-blue-300 hover:underline font-medium' : 'text-blue-600 hover:text-blue-700 hover:underline font-medium'}
                                                                        >
                                                                            {`${bid.gig_worker.first_name} ${bid.gig_worker.last_name}`}
                                                                        </a>
                                                                    ) : (
                                                                        'Unknown User'
                                                                    )}
                                                                </h4>
                                                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    {bid.gig_worker?.professional_title || 'Gig Worker'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-lg font-semibold text-green-400">
                                                                ₱{formatAmount(bid.bid_amount)}
                                                            </div>
                                                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {bid.estimated_days} days
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className={`mb-3 break-all ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        {bid.proposal_message}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                            Submitted {formatDistanceToNow(new Date(bid.created_at))} ago
                                                        </span>
                                                        {isJobOwner && bid.status === 'pending' && (
                                                            <div>
                                                                {error && (
                                                                    <div className="mb-2 text-sm text-red-400">
                                                                        {error}
                                                                    </div>
                                                                )}
                                                                <div className="flex space-x-2">
                                                                    <button 
                                                                        onClick={() => handleBidAction(bid.id, 'accepted')}
                                                                        disabled={processing && processingBidId === bid.id}
                                                                        className="inline-flex items-center px-3 py-1.5 border border-green-500/30 text-sm font-medium rounded-md text-green-400 bg-green-500/20 hover:bg-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50"
                                                                    >
                                                                        {processing && processingBidId === bid.id && confirmModal.status === 'accepted' ? (
                                                                            <span className="flex items-center">
                                                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                                Processing...
                                                                            </span>
                                                                        ) : 'Accept'}
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleBidAction(bid.id, 'rejected')}
                                                                        disabled={processing && processingBidId === bid.id}
                                                                        className="inline-flex items-center px-3 py-1.5 border border-red-500/30 text-sm font-medium rounded-md text-red-400 bg-red-500/20 hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
                                                                    >
                                                                        {processing && processingBidId === bid.id && confirmModal.status === 'rejected' ? (
                                                                            <span className="flex items-center">
                                                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                                Processing...
                                                                            </span>
                                                                        ) : 'Decline'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Submit Proposal Form */}
                            {canBid && !isEmployer && (
                                <div className={`backdrop-blur-sm overflow-hidden border rounded-xl transform transition-all duration-500 ease-in-out ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-8">
                                        {!showBidForm ? (
                                            <div className="text-center transform transition-all duration-300 ease-in-out">
                                                <div className={`border rounded-xl p-6 mb-6 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                                                    <div className="text-4xl mb-4">💼</div>
                                                    <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Interested in this job?</h3>
                                                    <p className={`mb-6 text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        Submit a proposal to get started and showcase your skills
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setShowBidForm(true)}
                                                    className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-xl shadow-lg text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform hover:scale-105 transition-all duration-300 ease-in-out"
                                                >
                                                    Submit a Proposal
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="transform transition-all duration-500 ease-in-out animate-in slide-in-from-right">
                                                <div className={`border rounded-xl p-6 mb-6 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-2xl">📝</span>
                                                        <h3 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Submit Your Proposal</h3>
                                                    </div>
                                                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                                        Provide your best offer and explain why you're the perfect fit for this project
                                                    </p>
                                                </div>
                                                <form onSubmit={handleSubmitBid} className="space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="transform transition-all duration-300 ease-in-out">
                                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                                Your Bid Amount *
                                                            </label>
                                                            <div className="relative">
                                                                <span className={`absolute left-4 top-1/2 transform -translate-y-1/2 font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>₱</span>
                                                                <input
                                                                    type="number"
                                                                    value={data.bid_amount}
                                                                    onChange={(e) => setData('bid_amount', e.target.value)}
                                                                    className={isDark ? 'w-full pl-10 pr-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300' : 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300'}
                                                                    placeholder="0.00"
                                                                    min="0"
                                                                    step="0.01"
                                                                    required
                                                                />
                                                            </div>
                                                            {errors.bid_amount && <p className="mt-2 text-sm text-red-400 animate-pulse">{errors.bid_amount}</p>}
                                                        </div>
                                                        <div className="transform transition-all duration-300 ease-in-out">
                                                            <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                                Delivery Time (Days) *
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={data.estimated_days}
                                                                onChange={(e) => setData('estimated_days', e.target.value)}
                                                                className={isDark ? 'w-full px-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300' : 'w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300'}
                                                                placeholder="e.g., 7"
                                                                min="1"
                                                                required
                                                            />
                                                            {errors.estimated_days && <p className="mt-2 text-sm text-red-400 animate-pulse">{errors.estimated_days}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="transform transition-all duration-300 ease-in-out">
                                                        <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white/90' : 'text-gray-700'}`}>
                                                            Cover Letter *
                                                        </label>
                                                        <div className="relative">
                                                            <textarea
                                                                value={data.proposal_message}
                                                                onChange={(e) => setData('proposal_message', e.target.value)}
                                                                rows={6}
                                                                className={isDark ? 'w-full px-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 resize-none' : 'w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 resize-none'}
                                                                placeholder="Explain why you're the best fit for this job. Include relevant experience, your approach, and any questions you have..."
                                                                required
                                                            />
                                                            <div className={`absolute bottom-3 right-3 text-xs px-2 py-1 rounded-md ${isDark ? 'text-gray-500 bg-gray-700' : 'text-gray-500 bg-gray-100'}`}>
                                                                {data.proposal_message?.length || 0} characters
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className={`text-xs rounded-full px-3 py-1 ${isDark ? 'text-gray-500 bg-blue-500/20' : 'text-gray-600 bg-blue-100'}`}>
                                                                💡 Tip: Minimum 50 characters. Be specific about your experience and approach.
                                                            </span>
                                                        </div>
                                                        {errors.proposal_message && <p className="mt-2 text-sm text-red-400 animate-pulse">{errors.proposal_message}</p>}
                                                    </div>
                                                    <div className={`flex items-center justify-between pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowBidForm(false)}
                                                            className={isDark ? 'inline-flex items-center px-6 py-3 border border-gray-600 text-sm font-semibold rounded-xl text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300' : 'inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300'}
                                                        >
                                                            <span className="mr-2">❌</span>
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={processing}
                                                            className={`inline-flex items-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl shadow-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 ${
                                                                processing
                                                                    ? 'bg-gray-600 cursor-not-allowed'
                                                                    : 'bg-blue-600 hover:bg-blue-500 hover:scale-105'
                                                            }`}
                                                        >
                                                            {processing ? (
                                                                <div className="flex items-center">
                                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                                                    <span className="animate-pulse">Submitting...</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="mr-2">🚀</span>
                                                                    Submit Proposal
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-8">
                            {/* Job Details */}
                            <div className={`backdrop-blur-sm overflow-hidden border rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="p-8">
                                    <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Job Details</h3>
                                    <div className="space-y-6">
                                        <div className={isDark ? 'bg-blue-500/10 p-4 rounded-xl border border-blue-500/20' : 'bg-blue-50 p-4 rounded-xl border border-blue-200'}>
                                            <dt className="text-sm font-medium text-blue-400 mb-2">Budget</dt>
                                            <dd className="text-xl font-bold text-green-400">
                                                {getBudgetDisplay()}
                                            </dd>
                                        </div>
                                        <div className={isDark ? 'bg-blue-500/10 p-4 rounded-xl border border-blue-500/20' : 'bg-blue-50 p-4 rounded-xl border border-blue-200'}>
                                            <dt className="text-sm font-medium text-blue-400 mb-2">Project Duration</dt>
                                            <dd className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                {job.estimated_duration_days} days
                                            </dd>
                                        </div>
                                        <div className={isDark ? 'bg-blue-500/10 p-4 rounded-xl border border-blue-500/20' : 'bg-blue-50 p-4 rounded-xl border border-blue-200'}>
                                            <dt className="text-sm font-medium text-blue-400 mb-2">Experience Level</dt>
                                            <dd className="mt-1">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold ${isDark ? getExperienceBadgeDark(job.experience_level) : getExperienceBadge(job.experience_level)}`}>
                                                    {job.experience_level}
                                                </span>
                                            </dd>
                                        </div>
                                        {(job.is_remote || job.location) && (
                                            <div className={isDark ? 'bg-blue-500/10 p-4 rounded-xl border border-blue-500/20' : 'bg-blue-50 p-4 rounded-xl border border-blue-200'}>
                                                <dt className="text-sm font-medium text-blue-400 mb-2">Location</dt>
                                                <dd className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                    {job.is_remote ? '🌐 Remote Work' : `📍 ${job.location}`}
                                                </dd>
                                            </div>
                                        )}
                                        {job.deadline && (
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Deadline</dt>
                                                <dd className={`mt-1 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                    {new Date(job.deadline).toLocaleDateString()}
                                                </dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Proposals</dt>
                                            <dd className={`mt-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {job.bids ? job.bids.length : 0} received
                                            </dd>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Employer Information */}
                            

                            {/* Similar Jobs
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Similar Opportunities</h3>
                                <div className="space-y-3">
                                    <Link href="/jobs" className="block text-sm text-blue-800 hover:text-blue-900">
                                        → Browse more {job?.required_skills && Array.isArray(job.required_skills) && job.required_skills.length > 0 ? job.required_skills[0] : 'similar'} jobs
                                    </Link>
                                    <Link href={route('ai.recommendations')} className="block text-sm text-blue-800 hover:text-blue-900">
                                        → Get AI-powered job recommendations
                                    </Link>
                                    <Link href="/projects" className="block text-sm text-blue-800 hover:text-blue-900">
                                        → View your active projects
                                    </Link>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmBidAction}
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
                duration={1000}
            />

            {/* Error Modal */}
            <ErrorModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                title={errorModal.title}
                message={errorModal.message}
                actionButton={errorModal.actionButton}
            />

            {/* Messages Modal */}
            <MessagesModal
                isOpen={showMessagesModal}
                onClose={() => setShowMessagesModal(false)}
                initialUserId={selectedUserId}
            />
        </AuthenticatedLayout>
    );
}
