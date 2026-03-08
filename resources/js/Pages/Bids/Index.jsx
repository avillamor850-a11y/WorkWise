import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import SuccessModal from '@/Components/SuccessModal';
import { formatDistanceToNow } from 'date-fns';

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmColor = 'green', isLoading = false, isDark }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                ></div>

                <div className={`inline-block align-bottom rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white/95 border-gray-200'}`}>
                    <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDark ? 'bg-gray-800' : 'bg-gradient-to-br from-white to-blue-50'}`}>
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl shadow-lg sm:mx-0 sm:h-10 sm:w-10 ${confirmColor === 'green' ? (isDark ? 'bg-green-500/20' : 'bg-gradient-to-br from-green-100 to-green-200') : confirmColor === 'gray' ? (isDark ? 'bg-gray-700' : 'bg-gradient-to-br from-gray-100 to-gray-200') : (isDark ? 'bg-red-500/20' : 'bg-gradient-to-br from-red-100 to-red-200')}`}>
                                {confirmColor === 'green' ? (
                                    <svg className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : confirmColor === 'gray' ? (
                                    <svg className={`h-6 w-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className={`h-6 w-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                )}
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className={`text-lg leading-6 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {title}
                                </h3>
                                <div className="mt-2">
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${isDark ? 'bg-gray-800 border-t border-gray-700' : 'bg-gradient-to-r from-gray-50 to-blue-50'}`}>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-lg px-6 py-3 text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl transform hover:scale-105 disabled:transform-none ${isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'} ${confirmColor === 'green'
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
                            className={`mt-3 w-full inline-flex justify-center rounded-xl border shadow-lg px-6 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl transform hover:scale-105 disabled:transform-none ${isDark ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 focus:ring-offset-gray-900 focus:ring-gray-500' : 'border-gray-300 bg-white/70 text-gray-700 hover:bg-gray-50 focus:ring-offset-white focus:ring-blue-500'}`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function BidsIndex({ bids }) {
    const { auth } = usePage().props;
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [filter, setFilter] = useState('all');
    const [processing, setProcessing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        bidId: null,
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatAmount = (value) => {
        const number = Number(value ?? 0);
        return number.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    const getStatusColorDark = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
            case 'accepted':
                return 'bg-green-500/20 text-green-400 border border-green-500/30';
            case 'rejected':
                return 'bg-red-500/20 text-red-400 border border-red-500/30';
            case 'withdrawn':
                return 'bg-gray-700 text-gray-400 border border-gray-600';
            default:
                return 'bg-gray-700 text-gray-400 border border-gray-600';
        }
    };

    const isGigWorker = auth.user.user_type === 'gig_worker';

    const handleBidAction = (bidId, action) => {
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
            bidId,
            action,
            title,
            message,
            confirmText,
            confirmColor
        });
    };

    const handleConfirmAction = () => {
        setProcessing(true);

        const { bidId, action } = confirmModal;
        let url, method, data;

        switch (action) {
            case 'accept':
                url = route('bids.update', bidId);
                method = 'patch';
                data = { status: 'accepted' };
                break;
            case 'reject':
                url = route('bids.update', bidId);
                method = 'patch';
                data = { status: 'rejected' };
                break;
            case 'withdraw':
                url = route('bids.destroy', bidId);
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

                // Check if there's an error in the flash messages
                if (page.props?.flash?.error) {
                    console.error('Bid action failed:', page.props.flash.error);
                    return;
                }

                // Show success modal only if we have a success message
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

                    // Handle redirect for accepted bids
                    if (action === 'accept' && page.props?.flash?.redirect) {
                        setTimeout(() => {
                            router.visit(page.props.flash.redirect);
                        }, 1500);
                    } else if (action === 'accept') {
                        setTimeout(() => {
                            // Refresh to show updated status
                            window.location.reload();
                        }, 1500);
                    } else {
                        setTimeout(() => {
                            router.reload({ only: ['bids'] });
                        }, 1500);
                    }
                } else {
                    console.error('No success message received');
                }
            },
            onError: (errors) => {
                console.error('Bid action failed:', errors);
                setProcessing(false);
                setConfirmModal({ ...confirmModal, isOpen: false });
            }
        });
    };

    const handleCloseModal = () => {
        if (!processing) {
            setConfirmModal({ ...confirmModal, isOpen: false });
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            pageTheme={isDark ? 'dark' : undefined}
            header={
                <h2 className={`font-semibold text-xl leading-tight tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {isGigWorker ? 'My Bids' : 'Bids on My Jobs'}
                </h2>
            }
        >
            <Head title={isGigWorker ? 'My Bids' : 'Bids on My Jobs'} />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative min-h-screen py-12 overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {bids.data.length > 0 ? (
                        <div className="space-y-6">
                            {bids.data.map((bid) => (
                                <div key={bid.id} className={`backdrop-blur-sm overflow-hidden rounded-xl transition-all duration-200 border ${isDark ? 'bg-gray-800 border-gray-700 hover:border-blue-500/30' : 'bg-white border-gray-200 shadow hover:border-blue-200'}`}>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                    <Link
                                                        href={route('jobs.show', bid.job.id)}
                                                        className={isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'}
                                                    >
                                                        {bid.job.title}
                                                    </Link>
                                                </h3>
                                                <div className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {isGigWorker ? (
                                                        <p>
                                                            Posted by:{' '}
                                                            <a
                                                                href={route('employers.show', bid.job.employer?.id)}
                                                                className={isDark ? 'text-blue-400 hover:text-blue-300 hover:underline font-medium' : 'text-blue-600 hover:text-blue-700 hover:underline font-medium'}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    router.visit(route('employers.show', bid.job.employer?.id));
                                                                }}
                                                            >
                                                                {bid.job.employer?.first_name} {bid.job.employer?.last_name}
                                                            </a>
                                                        </p>
                                                    ) : (
                                                        <p>
                                                            Bid by:{' '}
                                                            <Link
                                                                href={route('workers.show', bid.gig_worker?.id)}
                                                                className={isDark ? 'text-blue-400 hover:text-blue-300 hover:underline font-medium' : 'text-blue-600 hover:text-blue-700 hover:underline font-medium'}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                }}
                                                            >
                                                                {bid.gig_worker?.first_name} {bid.gig_worker?.last_name}
                                                            </Link>
                                                        </p>
                                                    )}
                                                    <p>Submitted: {formatDate(bid.submitted_at)}</p>
                                                </div>
                                            </div>
                                            <span className={`px-4 py-2 text-sm font-medium rounded-full ${isDark ? getStatusColorDark(bid.status) : getStatusColor(bid.status)}`}>
                                                {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                            <div className={isDark ? 'bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl' : 'bg-blue-50 border border-blue-100 p-4 rounded-xl'}>
                                                <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Bid Amount:</span>
                                                <p className={`text-lg font-bold mt-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>₱{formatAmount(bid.bid_amount)}</p>
                                            </div>
                                            <div className={isDark ? 'bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl' : 'bg-blue-50 border border-blue-100 p-4 rounded-xl'}>
                                                <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Estimated Days:</span>
                                                <p className={`text-lg font-bold mt-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{bid.estimated_days} days</p>
                                            </div>
                                            <div className={isDark ? 'bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl' : 'bg-blue-50 border border-blue-100 p-4 rounded-xl'}>
                                                <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Job Budget:</span>
                                                <p className={`text-lg font-bold mt-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{bid.job.budget_display}</p>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <span className={`text-sm font-medium mb-2 block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Proposal:</span>
                                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                <p className={`leading-relaxed break-all ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{bid.proposal_message}</p>
                                            </div>
                                        </div>

                                        {!isGigWorker && bid.status === 'pending' && (
                                            <div className="flex space-x-4">
                                                <button
                                                    type="button"
                                                    onClick={() => handleBidAction(bid.id, 'accept')}
                                                    disabled={processing}
                                                    className="bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-green-600/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {processing ? (
                                                        <span className="flex items-center">
                                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Processing...
                                                        </span>
                                                    ) : 'Accept Bid'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBidAction(bid.id, 'reject')}
                                                    disabled={processing}
                                                    className="bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-red-600/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {processing ? (
                                                        <span className="flex items-center">
                                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Processing...
                                                        </span>
                                                    ) : 'Reject Bid'}
                                                </button>
                                            </div>
                                        )}

                                        {isGigWorker && bid.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => handleBidAction(bid.id, 'withdraw')}
                                                disabled={processing}
                                                className={`font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-100' : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'}`}
                                            >
                                                {processing ? (
                                                    <span className="flex items-center">
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Processing...
                                                    </span>
                                                ) : 'Withdraw Bid'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`backdrop-blur-sm overflow-hidden rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow'}`}>
                            <div className="p-12 text-center">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                                    <svg className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                    {isGigWorker ? "No Bids Yet" : "No Bids Received"}
                                </h3>
                                <p className={`text-lg mb-8 max-w-md mx-auto leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {isGigWorker
                                        ? "You haven't submitted any bids yet. Start exploring opportunities and submit your first proposal!"
                                        : "No bids have been submitted on your jobs yet. Your posted jobs will receive proposals here."
                                    }
                                </p>
                                {isGigWorker && (
                                    <Link
                                        href={route('jobs.index')}
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300 inline-flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Browse Jobs
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {bids.links && (
                        <div className="mt-8 flex justify-center">
                            <div className="flex space-x-2">
                                {bids.links.map((link, index) => (
                                    link.url ? (
                                        <Link
                                            key={index}
                                            href={link.url}
                                            className={`px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${link.active
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : isDark
                                                        ? 'bg-gray-700 text-gray-200 hover:bg-blue-500/20 hover:text-gray-100 border border-gray-600 hover:border-blue-500/30'
                                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-blue-200'
                                                }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={index}
                                            className={`px-4 py-3 text-sm font-medium rounded-xl cursor-not-allowed border ${isDark ? 'bg-gray-700 text-gray-500 border-gray-600' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isDark && (
            <style>{`
                body {
                    background: #111827;
                    color: #e5e7eb;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
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
                isDark={isDark}
            />

            {/* Success Modal */}
            <SuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ isOpen: false, message: '' })}
                message={successModal.message}
                duration={1000}
            />
        </AuthenticatedLayout>
    );
}
