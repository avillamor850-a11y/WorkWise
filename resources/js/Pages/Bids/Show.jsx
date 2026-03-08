import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SuccessModal from '@/Components/SuccessModal';
import ErrorModal from '@/Components/ErrorModal';
import { extractFileName } from '@/utils/fileHelpers';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmColor = 'green', isLoading = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                ></div>

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white/95 backdrop-blur-sm rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200">
                    <div className="bg-gradient-to-br from-white to-blue-50 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl shadow-lg ${confirmColor === 'green' ? 'bg-gradient-to-br from-green-100 to-green-200' : confirmColor === 'gray' ? 'bg-gradient-to-br from-gray-100 to-gray-200' : 'bg-gradient-to-br from-red-100 to-red-200'} sm:mx-0 sm:h-10 sm:w-10`}>
                                {confirmColor === 'green' ? (
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : confirmColor === 'gray' ? (
                                    <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-lg px-6 py-3 text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl transform hover:scale-105 disabled:transform-none ${
                                confirmColor === 'green'
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-green-500'
                                    : confirmColor === 'gray'
                                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 focus:ring-gray-500'
                                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:ring-red-500'
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
                            className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-lg px-6 py-3 bg-white/70 backdrop-blur-sm text-base font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function BidShow({ bid }) {
    const { auth } = usePage().props;
    const [processing, setProcessing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        action: null,
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatAmount = (value) => {
        const number = Number(value ?? 0);
        return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'withdrawn':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const isGigWorker = auth.user.user_type === 'gig_worker';
    const isEmployer = auth.user.user_type === 'employer';

    const handleBidAction = (action) => {
        let title, message, confirmText, confirmColor;

        switch (action) {
            case 'accept':
                title = 'Accept Proposal';
                message = 'Are you sure you want to accept this proposal? This will create a new project and deduct the bid amount from your escrow balance.';
                confirmText = 'Accept Proposal';
                confirmColor = 'green';
                break;
            case 'reject':
                title = 'Decline Proposal';
                message = 'Are you sure you want to decline this proposal? This action cannot be undone.';
                confirmText = 'Decline Proposal';
                confirmColor = 'red';
                break;
            case 'withdraw':
                title = 'Withdraw Bid';
                message = 'Are you sure you want to withdraw this bid? You will not be able to resubmit it later.';
                confirmText = 'Withdraw Bid';
                confirmColor = 'gray';
                break;
            default:
                return;
        }

        setConfirmModal({
            isOpen: true,
            action,
            title,
            message,
            confirmText,
            confirmColor
        });
    };

    const handleConfirmAction = () => {
        setProcessing(true);

        const { action } = confirmModal;
        let url, method, data;

        switch (action) {
            case 'accept':
                url = route('bids.update', bid.id);
                method = 'patch';
                data = { status: 'accepted' };
                break;
            case 'reject':
                url = route('bids.update', bid.id);
                method = 'patch';
                data = { status: 'rejected' };
                break;
            case 'withdraw':
                url = route('bids.destroy', bid.id);
                method = 'delete';
                data = {};
                break;
            default:
                setProcessing(false);
                return;
        }

        router[method](url, data, {
            preserveScroll: false,
            onSuccess: (page) => {
                setProcessing(false);
                setConfirmModal({ ...confirmModal, isOpen: false });

                // Check for insufficient escrow (flash or errors)
                const flash = page.props?.flash || {};
                const errs = page.props?.errors || {};
                const isInsufficientEscrow = flash.error_type === 'insufficient_escrow' || errs.error_type === 'insufficient_escrow';
                const required = flash.required_amount ?? errs.required_amount;
                const current = flash.current_balance ?? errs.current_balance;

                if (isInsufficientEscrow && action === 'accept') {
                    const format = (n) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    setErrorModal({
                        isOpen: true,
                        title: 'Insufficient Escrow Balance',
                        message: `You need ₱${format(required)} to accept this proposal, but your current balance is only ₱${format(current)}.\n\nHow to add funds:\n1. Click "Add Funds to Escrow" below (or open Wallet from the menu).\n2. Enter the amount you need (at least the required amount).\n3. Complete payment with your card.\n4. Return here and accept the proposal again.`,
                        actionButton: {
                            text: 'Add Funds to Escrow',
                            onClick: () => {
                                setErrorModal(prev => ({ ...prev, isOpen: false }));
                                router.visit(route('employer.wallet.index'));
                            }
                        }
                    });
                    return;
                }

                if (page.props?.flash?.error) {
                    console.error('Bid action failed:', page.props.flash.error);
                    return;
                }

                if (page.props?.flash?.success) {
                    let successMessage = '';
                    switch (action) {
                        case 'accept':
                            successMessage = 'Proposal accepted successfully! Redirecting to contract signing...';
                            break;
                        case 'reject':
                            successMessage = 'Proposal declined successfully.';
                            break;
                        case 'withdraw':
                            successMessage = 'Bid withdrawn successfully.';
                            break;
                    }

                    setSuccessModal({
                        isOpen: true,
                        message: successMessage
                    });

                    if (action === 'accept' && page.props?.flash?.redirect) {
                        setTimeout(() => {
                            router.visit(page.props.flash.redirect);
                        }, 1500);
                    } else {
                        setTimeout(() => {
                            router.visit(route('bids.index'));
                        }, 1500);
                    }
                }
            },
            onError: (errors) => {
                console.error('Bid action failed:', errors);
                setProcessing(false);
                setConfirmModal({ ...confirmModal, isOpen: false });

                if (errors?.error_type === 'insufficient_escrow') {
                    const required = errors.required_amount;
                    const current = errors.current_balance;
                    const format = (n) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    setErrorModal({
                        isOpen: true,
                        title: 'Insufficient Escrow Balance',
                        message: `You need ₱${format(required)} to accept this proposal, but your current balance is only ₱${format(current)}.\n\nHow to add funds:\n1. Click "Add Funds to Escrow" below (or open Wallet from the menu).\n2. Enter the amount you need (at least the required amount).\n3. Complete payment with your card.\n4. Return here and accept the proposal again.`,
                        actionButton: {
                            text: 'Add Funds to Escrow',
                            onClick: () => {
                                setErrorModal(prev => ({ ...prev, isOpen: false }));
                                router.visit(route('employer.wallet.index'));
                            }
                        }
                    });
                }
            }
        });
    };

    const handleCloseModal = () => {
        if (!processing) {
            setConfirmModal({ ...confirmModal, isOpen: false });
        }
    };

    // Parse skills if they're stored as JSON
    const parseSkills = (skills) => {
        if (!skills) return [];
        if (typeof skills === 'string') {
            try {
                return JSON.parse(skills);
            } catch {
                return [];
            }
        }
        return skills;
    };

    const gigWorkerSkills = parseSkills(bid.gig_worker?.skills_with_experience);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Bid Details
                    </h2>
                    <Link
                        href={route('bids.index')}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                        ← Back to Bids
                    </Link>
                </div>
            }
        >
            <Head title="Bid Details" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="relative py-12 bg-white overflow-hidden">
                {/* Animated Background Shapes */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

                <div className="relative z-20 max-w-5xl mx-auto sm:px-6 lg:px-8">
                    {/* Job Information */}
                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200 mb-6">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                        <Link 
                                            href={route('jobs.show', bid.job.id)}
                                            className="hover:text-blue-600"
                                        >
                                            {bid.job.title}
                                        </Link>
                                    </h3>
                                    <p className="text-gray-600 mb-4">{bid.job.description}</p>
                                    <div className="text-sm text-gray-600">
                                        <p>Posted by: {bid.job.employer?.first_name} {bid.job.employer?.last_name}</p>
                                        <p>Budget: {bid.job.budget_display}</p>
                                    </div>
                                </div>
                                <span className={`px-4 py-2 text-sm font-medium rounded-full shadow-md ${getStatusColor(bid.status)}`}>
                                    {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bid Details */}
                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200 mb-6">
                        <div className="p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Bid Information</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-100">
                                    <span className="text-sm font-medium text-blue-600">Bid Amount:</span>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">₱{formatAmount(bid.bid_amount)}</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-100">
                                    <span className="text-sm font-medium text-blue-600">Estimated Days:</span>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{bid.estimated_days} days</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-100">
                                    <span className="text-sm font-medium text-blue-600">Submitted:</span>
                                    <p className="text-lg font-bold text-gray-900 mt-1">{formatDate(bid.submitted_at)}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-sm font-medium text-blue-600 mb-2 block">Proposal Message:</span>
                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{bid.proposal_message}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gig Worker Profile */}
                    {isEmployer && bid.gig_worker && (
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200 mb-6">
                            <div className="p-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">About the Freelancer</h4>
                                
                                <div className="flex items-start space-x-4 mb-6">
                                    {(() => {
                                        const raw = bid.gig_worker.profile_picture;
                                        const resolved = raw ? (resolveProfileImageUrl(raw) || raw) : null;
                                        return resolved ? (
                                        <img
                                            src={resolved}
                                            alt={`${bid.gig_worker.first_name} ${bid.gig_worker.last_name}`}
                                            className="w-20 h-20 rounded-full object-cover border-2 border-blue-200"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-blue-600">
                                                {bid.gig_worker.first_name?.[0]}{bid.gig_worker.last_name?.[0]}
                                            </span>
                                        </div>
                                    );
                                    })()}
                                    <div className="flex-1">
                                        <h5 className="text-xl font-bold text-gray-900">
                                            {bid.gig_worker.first_name} {bid.gig_worker.last_name}
                                        </h5>
                                        {bid.gig_worker.professional_title && (
                                            <p className="text-blue-600 font-medium">{bid.gig_worker.professional_title}</p>
                                        )}
                                        {bid.gig_worker.average_rating && (
                                            <div className="flex items-center mt-2">
                                                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="ml-1 text-gray-700 font-medium">{bid.gig_worker.average_rating.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {bid.gig_worker.bio && (
                                    <div className="mb-6">
                                        <h6 className="text-sm font-semibold text-gray-700 mb-2">Bio</h6>
                                        <p className="text-gray-600 leading-relaxed">{bid.gig_worker.bio}</p>
                                    </div>
                                )}

                                {gigWorkerSkills.length > 0 && (
                                    <div className="mb-6">
                                        <h6 className="text-sm font-semibold text-gray-700 mb-3">Skills</h6>
                                        <div className="flex flex-wrap gap-2">
                                            {gigWorkerSkills.map((skill, index) => (
                                                <span
                                                    key={index}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                                                >
                                                    {typeof skill === 'object' ? skill.skill : skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Portfolio Section */}
                                {(bid.gig_worker.portfolio_link || bid.gig_worker.resume_file) && (
                                    <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                                        <h6 className="text-sm font-semibold text-gray-700 mb-3">Portfolio & Work Samples</h6>
                                        <div className="flex flex-wrap gap-3">
                                            {bid.gig_worker.portfolio_link && (
                                                <a
                                                    href={bid.gig_worker.portfolio_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center px-4 py-2 bg-white border border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                                                >
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    View Portfolio
                                                </a>
                                            )}
                                            {bid.gig_worker.resume_file && (
                                                <a
                                                    href={bid.gig_worker.resume_file}
                                                    download
                                                    className="inline-flex items-center px-4 py-2 bg-white border border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                                                >
                                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Download Resume
                                                    {bid.gig_worker.resume_file && (
                                                        <span className="ml-2 text-xs text-gray-500">
                                                            ({extractFileName(bid.gig_worker.resume_file)})
                                                        </span>
                                                    )}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {isEmployer && bid.status === 'pending' && (
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => handleBidAction('accept')}
                                        disabled={processing}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {processing ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : 'Accept Proposal'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleBidAction('reject')}
                                        disabled={processing}
                                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {processing ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : 'Decline Proposal'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isGigWorker && bid.status === 'pending' && (
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <button
                                    type="button"
                                    onClick={() => handleBidAction('withdraw')}
                                    disabled={processing}
                                    className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : 'Withdraw Bid'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                body {
                    background: white;
                    color: #333;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>

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
                duration={1000}
            />

            {/* Error Modal - insufficient escrow */}
            <ErrorModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                title={errorModal.title}
                message={errorModal.message}
                actionButton={errorModal.actionButton}
            />
        </AuthenticatedLayout>
    );
}
