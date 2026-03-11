import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';

export default function Show({ auth, contract, employer, gigWorker, userRole, canSign, nextSigner, hasUserSigned }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const darkConfig = {
            'pending_gig_worker_signature': { color: 'bg-amber-500/20 text-amber-400', text: 'Pending Gig Worker Signature' },
            'pending_employer_signature': { color: 'bg-blue-500/20 text-blue-400', text: 'Pending Employer Signature' },
            'fully_signed': { color: 'bg-green-500/20 text-green-400', text: 'Fully Signed' },
            'cancelled': { color: 'bg-red-500/20 text-red-400', text: 'Cancelled' }
        };
        const lightConfig = {
            'pending_gig_worker_signature': { color: 'bg-amber-100 text-amber-800', text: 'Pending Gig Worker Signature' },
            'pending_employer_signature': { color: 'bg-blue-100 text-blue-800', text: 'Pending Employer Signature' },
            'fully_signed': { color: 'bg-green-100 text-green-800', text: 'Fully Signed' },
            'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
        };
        const statusConfig = isDark ? darkConfig : lightConfig;
        const defaultColor = isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-800';
        const config = statusConfig[status] ? statusConfig[status] : { color: defaultColor, text: status };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                {config.text}
            </span>
        );
    };

    const handleCancelContract = () => {
        if (!cancellationReason.trim()) return;

        setIsProcessing(true);
        router.post(route('contracts.cancel', contract.id), {
            cancellation_reason: cancellationReason
        }, {
            onSuccess: () => {
                setShowCancelModal(false);
                setCancellationReason('');
            },
            onFinish: () => {
                setIsProcessing(false);
            }
        });
    };

    const employerSignature = contract.signatures?.find(sig => sig.role === 'employer');
    const gigWorkerSignature = contract.signatures?.find(sig => sig.role === 'gig_worker');

    return (
        <AuthenticatedLayout
            user={auth.user}
            pageTheme={isDark ? 'dark' : 'light'}
            header={<h2 className={`font-semibold text-xl leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Contract Details</h2>}
        >
            <Head title={`Contract ${contract.contract_id}`} />

            <div className={`min-h-screen relative ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>
                <div className="py-12 relative z-20">
                    <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
                        {/* Contract Header */}
                        <div className={`overflow-hidden sm:rounded-xl mb-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>WorkWise Contract</h1>
                                        <p className={`text-lg ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Contract ID: {contract.contract_id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Date: {formatDate(contract.created_at)}</p>
                                        {getStatusBadge(contract.status)}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-wrap items-center gap-4">
                                        {canSign && (
                                            <Link
                                                href={route('contracts.sign', contract.id)}
                                                className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 transition ease-in-out duration-150"
                                            >
                                                Sign Contract
                                            </Link>
                                        )}

                                        {userRole === 'gig_worker' && !employerSignature && contract.status !== 'fully_signed' && contract.status !== 'cancelled' && (
                                            <div className={`inline-flex items-center px-4 py-2 rounded-md border ${isDark ? 'bg-amber-500/20 border-amber-500/30' : 'bg-amber-100 border-amber-200'}`}>
                                                <span className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                                                    Waiting for employer to sign first
                                                </span>
                                            </div>
                                        )}

                                        {contract.status === 'fully_signed' && (
                                            <a
                                                href={route('contracts.downloadPdf', contract.id)}
                                                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 transition ease-in-out duration-150"
                                            >
                                                Download PDF
                                            </a>
                                        )}

                                        <Link
                                            href={route('projects.show', contract.project.id)}
                                            className={isDark ? 'inline-flex items-center px-4 py-2 border border-gray-600 bg-gray-800 rounded-md font-semibold text-xs text-gray-200 uppercase tracking-widest hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition ease-in-out duration-150' : 'inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition ease-in-out duration-150'}
                                        >
                                            View Project
                                        </Link>
                                    </div>

                                    {userRole === 'employer' && contract.status !== 'fully_signed' && contract.status !== 'cancelled' && (
                                        <button
                                            onClick={() => setShowCancelModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 transition ease-in-out duration-150"
                                        >
                                            Cancel Contract
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Contract Details */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Parties Involved */}
                                <div className={`overflow-hidden sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Parties Involved</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>EMPLOYER</h4>
                                                <div className={`space-y-2 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Name:</span> {(employer || contract.employer) && `${(employer || contract.employer).first_name || ''} ${(employer || contract.employer).last_name || ''}`.trim() || '—'}</div>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Email:</span> {(employer || contract.employer)?.email || '—'}</div>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Phone:</span> {(employer || contract.employer)?.phone || 'Not provided'}</div>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Location:</span> {(employer || contract.employer)?.location || (contract.employer?.barangay) || 'Not provided'}</div>
                                                </div>
                                            </div>

                                            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>GIG WORKER</h4>
                                                <div className={`space-y-2 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Name:</span> {(gigWorker || contract.gig_worker || contract.gigWorker) && `${(gigWorker || contract.gig_worker || contract.gigWorker).first_name || ''} ${(gigWorker || contract.gig_worker || contract.gigWorker).last_name || ''}`.trim() || '—'}</div>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Email:</span> {(gigWorker || contract.gig_worker || contract.gigWorker)?.email || '—'}</div>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Phone:</span> {(gigWorker || contract.gig_worker || contract.gigWorker)?.phone || 'Not provided'}</div>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Location:</span> {(gigWorker || contract.gig_worker || contract.gigWorker)?.location || (contract.gig_worker?.barangay || contract.gigWorker?.barangay) || 'Not provided'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            The contract will commence on {formatDate(contract.project_start_date)},
                                            and will continue until terminated in accordance with the terms of this Agreement.
                                        </p>
                                    </div>
                                </div>

                                {/* Scope of Work */}
                                <div className={`overflow-hidden sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Scope of Work</h3>
                                        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                            <pre className={`text-sm whitespace-pre-wrap break-all ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{contract.scope_of_work}</pre>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Terms & Deadlines */}
                                <div className={`overflow-hidden sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Payment Terms & Deadlines</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Payment Terms</h4>
                                                <div className={`space-y-2 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Contract Type:</span> {contract.contract_type}</div>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Total Payment:</span> {formatCurrency(contract.total_payment)}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Deadlines</h4>
                                                <div className={`space-y-2 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Project Start Date:</span> {formatDate(contract.project_start_date)}</div>
                                                    <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Project End Date:</span> {formatDate(contract.project_end_date)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Responsibilities */}
                                <div className={`overflow-hidden sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Responsibilities</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Employer Responsibilities</h4>
                                                <ul className={`list-disc list-inside space-y-1 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                    {contract.employer_responsibilities?.map((responsibility, index) => (
                                                        <li key={index}>{responsibility}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Gig Worker Responsibilities</h4>
                                                <ul className={`list-disc list-inside space-y-1 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                    {contract.gig_worker_responsibilities?.map((responsibility, index) => (
                                                        <li key={index}>{responsibility}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Signature Status */}
                                <div className={`overflow-hidden sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Signature Status</h3>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>1. Employer</span>
                                                {employerSignature ? (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'}`}>
                                                        Signed
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>
                                                        Pending
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>2. Gig Worker</span>
                                                {gigWorkerSignature ? (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'}`}>
                                                        Signed
                                                    </span>
                                                ) : employerSignature ? (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>
                                                        Pending
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-800'}`}>
                                                        Waiting for employer
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {contract.status === 'fully_signed' && (
                                            <div className={`mt-4 p-3 rounded-lg border ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                                                <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-800'}`}>
                                                    Contract fully signed on {formatDateTime(contract.fully_signed_at)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Communication */}
                                <div className={`overflow-hidden sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-6">
                                        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Communication</h3>
                                        <div className={`space-y-2 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Preferred Method:</span> {contract.preferred_communication}</div>
                                            <div><span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Frequency:</span> {contract.communication_frequency}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel Contract Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className={`relative w-full max-w-md p-6 border shadow-xl rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div>
                            <h3 className={`text-lg leading-6 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Cancel Contract</h3>
                            <div className="mt-4">
                                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Please provide a reason for cancelling this contract:
                                </p>
                                <textarea
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    className={isDark ? 'w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50' : 'w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50'}
                                    rows="3"
                                    placeholder="Enter cancellation reason..."
                                    required
                                />
                            </div>
                            <div className="flex items-center justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    className={isDark ? 'px-4 py-2 text-sm font-medium text-gray-200 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900' : 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-white'}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCancelContract}
                                    disabled={isProcessing || !cancellationReason.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? 'Cancelling...' : 'Confirm Cancellation'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
