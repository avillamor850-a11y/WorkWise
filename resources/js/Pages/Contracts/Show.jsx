import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Show({ auth, contract, employer, gigWorker, userRole, canSign, nextSigner, hasUserSigned }) {
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
        const statusConfig = {
            'pending_gig_worker_signature': { color: 'bg-amber-500/20 text-amber-400', text: 'Pending Gig Worker Signature' },
            'pending_employer_signature': { color: 'bg-blue-500/20 text-blue-400', text: 'Pending Employer Signature' },
            'fully_signed': { color: 'bg-green-500/20 text-green-400', text: 'Fully Signed' },
            'cancelled': { color: 'bg-red-500/20 text-red-400', text: 'Cancelled' }
        };

        const config = statusConfig[status] || { color: 'bg-white/10 text-white/70', text: status };
        
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
            pageTheme="dark"
            header={<h2 className="font-semibold text-xl text-white leading-tight">Contract Details</h2>}
        >
            <Head title={`Contract ${contract.contract_id}`} />

            <div className="min-h-screen bg-[#05070A] relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>
                <div className="py-12 relative z-20">
                    <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
                        {/* Contract Header */}
                        <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl mb-6">
                            <div className="p-6 border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-3xl font-bold text-green-400">WorkWise Contract</h1>
                                        <p className="text-white/70 text-lg">Contract ID: {contract.contract_id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-white/60 mb-2">Date: {formatDate(contract.created_at)}</p>
                                        {getStatusBadge(contract.status)}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="p-6 border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-wrap items-center gap-4">
                                        {canSign && (
                                            <Link
                                                href={route('contracts.sign', contract.id)}
                                                className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition ease-in-out duration-150"
                                            >
                                                Sign Contract
                                            </Link>
                                        )}

                                        {userRole === 'gig_worker' && !employerSignature && contract.status !== 'fully_signed' && contract.status !== 'cancelled' && (
                                            <div className="inline-flex items-center px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-md">
                                                <span className="text-sm text-amber-400">
                                                    Waiting for employer to sign first
                                                </span>
                                            </div>
                                        )}
                                        
                                        {contract.status === 'fully_signed' && (
                                            <a
                                                href={route('contracts.downloadPdf', contract.id)}
                                                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition ease-in-out duration-150"
                                            >
                                                Download PDF
                                            </a>
                                        )}

                                        <Link
                                            href={route('projects.show', contract.project.id)}
                                            className="inline-flex items-center px-4 py-2 border border-white/20 bg-white/5 rounded-md font-semibold text-xs text-white/80 uppercase tracking-widest hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#05070A] transition ease-in-out duration-150"
                                        >
                                            View Project
                                        </Link>
                                    </div>

                                    {userRole === 'employer' && contract.status !== 'fully_signed' && contract.status !== 'cancelled' && (
                                        <button
                                            onClick={() => setShowCancelModal(true)}
                                            className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] transition ease-in-out duration-150"
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
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Parties Involved</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                                                <h4 className="font-medium text-white/80 mb-3">EMPLOYER</h4>
                                                <div className="space-y-2 text-sm text-white/70">
                                                    <div><span className="font-medium text-white/90">Name:</span> {(employer || contract.employer) && `${(employer || contract.employer).first_name || ''} ${(employer || contract.employer).last_name || ''}`.trim() || '—'}</div>
                                                    <div><span className="font-medium text-white/90">Email:</span> {(employer || contract.employer)?.email || '—'}</div>
                                                    <div><span className="font-medium text-white/90">Phone:</span> {(employer || contract.employer)?.phone || 'Not provided'}</div>
                                                    <div><span className="font-medium text-white/90">Location:</span> {(employer || contract.employer)?.location || (contract.employer?.barangay) || 'Not provided'}</div>
                                                </div>
                                            </div>

                                            <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                                                <h4 className="font-medium text-white/80 mb-3">GIG WORKER</h4>
                                                <div className="space-y-2 text-sm text-white/70">
                                                    <div><span className="font-medium text-white/90">Name:</span> {(gigWorker || contract.gig_worker || contract.gigWorker) && `${(gigWorker || contract.gig_worker || contract.gigWorker).first_name || ''} ${(gigWorker || contract.gig_worker || contract.gigWorker).last_name || ''}`.trim() || '—'}</div>
                                                    <div><span className="font-medium text-white/90">Email:</span> {(gigWorker || contract.gig_worker || contract.gigWorker)?.email || '—'}</div>
                                                    <div><span className="font-medium text-white/90">Phone:</span> {(gigWorker || contract.gig_worker || contract.gigWorker)?.phone || 'Not provided'}</div>
                                                    <div><span className="font-medium text-white/90">Location:</span> {(gigWorker || contract.gig_worker || contract.gigWorker)?.location || (contract.gig_worker?.barangay || contract.gigWorker?.barangay) || 'Not provided'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="mt-4 text-sm text-white/60">
                                            The contract will commence on {formatDate(contract.project_start_date)}, 
                                            and will continue until terminated in accordance with the terms of this Agreement.
                                        </p>
                                    </div>
                                </div>

                                {/* Scope of Work */}
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Scope of Work</h3>
                                        <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                                            <pre className="text-sm text-white/80 whitespace-pre-wrap">{contract.scope_of_work}</pre>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Terms & Deadlines */}
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Payment Terms & Deadlines</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-medium text-white/80 mb-3">Payment Terms</h4>
                                                <div className="space-y-2 text-sm text-white/70">
                                                    <div><span className="font-medium text-white/90">Contract Type:</span> {contract.contract_type}</div>
                                                    <div><span className="font-medium text-white/90">Total Payment:</span> {formatCurrency(contract.total_payment)}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="font-medium text-white/80 mb-3">Deadlines</h4>
                                                <div className="space-y-2 text-sm text-white/70">
                                                    <div><span className="font-medium text-white/90">Project Start Date:</span> {formatDate(contract.project_start_date)}</div>
                                                    <div><span className="font-medium text-white/90">Project End Date:</span> {formatDate(contract.project_end_date)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Responsibilities */}
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Responsibilities</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-medium text-white/80 mb-3">Employer Responsibilities</h4>
                                                <ul className="list-disc list-inside space-y-1 text-sm text-white/70">
                                                    {contract.employer_responsibilities?.map((responsibility, index) => (
                                                        <li key={index}>{responsibility}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <h4 className="font-medium text-white/80 mb-3">Gig Worker Responsibilities</h4>
                                                <ul className="list-disc list-inside space-y-1 text-sm text-white/70">
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
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Signature Status</h3>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-white/80">1. Employer</span>
                                                {employerSignature ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                                        Signed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                                        Pending
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-white/80">2. Gig Worker</span>
                                                {gigWorkerSignature ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                                        Signed
                                                    </span>
                                                ) : employerSignature ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                                        Pending
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/60">
                                                        Waiting for employer
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {contract.status === 'fully_signed' && (
                                            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                <p className="text-sm text-green-400 font-medium">
                                                    Contract fully signed on {formatDateTime(contract.fully_signed_at)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Communication */}
                                <div className="bg-white/5 border border-white/10 overflow-hidden sm:rounded-xl">
                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-white mb-4">Communication</h3>
                                        <div className="space-y-2 text-sm text-white/70">
                                            <div><span className="font-medium text-white/90">Preferred Method:</span> {contract.preferred_communication}</div>
                                            <div><span className="font-medium text-white/90">Frequency:</span> {contract.communication_frequency}</div>
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
                    <div className="relative w-full max-w-md p-6 border border-white/10 shadow-xl rounded-xl bg-[#0d1014]">
                        <div>
                            <h3 className="text-lg leading-6 font-medium text-white">Cancel Contract</h3>
                            <div className="mt-4">
                                <p className="text-sm text-white/60 mb-4">
                                    Please provide a reason for cancelling this contract:
                                </p>
                                <textarea
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-white/20 rounded-md bg-white/5 text-white placeholder-white/40 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                                    rows="3"
                                    placeholder="Enter cancellation reason..."
                                    required
                                />
                            </div>
                            <div className="flex items-center justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-white/80 bg-white/5 border border-white/20 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#0d1014]"
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCancelContract}
                                    disabled={isProcessing || !cancellationReason.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#0d1014] disabled:opacity-50 disabled:cursor-not-allowed"
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
