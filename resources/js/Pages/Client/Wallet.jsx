import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/Components/CheckoutForm';

export default function EmployerWallet({ 
    deposits = { data: [] }, 
    paidProjects = [], 
    transactions = [], 
    totalSpent = 0, 
    escrowBalance = 0, 
    stripe_key = null, 
    currency = { symbol: '$', code: 'USD' } 
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [showAmountModal, setShowAmountModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [stripePromise, setStripePromise] = useState(null);
    const [clientSecret, setClientSecret] = useState(null);
    const [depositId, setDepositId] = useState(null);
    const [isCreatingIntent, setIsCreatingIntent] = useState(false);
    const [intentError, setIntentError] = useState(null);
    const { flash = {} } = usePage().props;

    useEffect(() => {
        if (stripe_key) {
            setStripePromise(loadStripe(stripe_key));
        }
    }, [stripe_key]);

    const handleDeposit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            return;
        }

        setIsCreatingIntent(true);
        setIntentError(null);
        setClientSecret(null);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            if (!csrfToken) {
                throw new Error('CSRF token not found. Please refresh the page and try again.');
            }

            const response = await fetch('/employer/wallet/create-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ amount }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create payment intent');
            }

            const { clientSecret, deposit_id } = await response.json();

            if (!clientSecret || typeof clientSecret !== 'string' || !clientSecret.startsWith('pi_')) {
                throw new Error('Invalid payment intent received from server');
            }

            setClientSecret(clientSecret);
            setDepositId(deposit_id);
            setShowAmountModal(false);
            setShowPaymentModal(true);
        } catch (err) {
            console.error('Error creating payment intent:', err);
            setIntentError(err.message || 'Failed to create payment intent. Please try again.');
        } finally {
            setIsCreatingIntent(false);
        }
    };

    const handleSuccess = async () => {
        setShowPaymentModal(false);
        setClientSecret(null);
        setDepositId(null);
        setIntentError(null);
        setAmount('');

        setTimeout(() => {
            window.location.reload();
        }, 1000);
    };

    const handleCancel = () => {
        setShowPaymentModal(false);
        setShowAmountModal(false);
        setClientSecret(null);
        setDepositId(null);
        setIntentError(null);
        setAmount('');
    };

    const formatAmount = (value) => {
        const number = Number(value ?? 0);
        return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : undefined}
            header={<h2 className={`font-semibold text-xl leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Employer Wallet</h2>}
        >
            <Head title="Employer Wallet" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`min-h-screen relative ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8 py-12">
                    {flash?.success && (
                        <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl">
                            {flash.success}
                        </div>
                    )}

                    {flash?.error && (
                        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl">
                            {flash.error}
                        </div>
                    )}

                    {/* First-time / empty balance blurb */}
                    {(escrowBalance == null || Number(escrowBalance) === 0) && (
                        <div className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                            <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                                <strong>New to escrow?</strong> Funds you add here are used to accept proposals and pay freelancers. Enter an amount below and complete payment to get started.
                            </p>
                        </div>
                    )}

                    {/* Wallet Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Escrow Balance */}
                        <div className={`overflow-hidden sm:rounded-xl p-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Escrow Balance</h3>
                                    <div className="text-3xl font-bold text-green-400">
                                        {currency?.symbol || '$'}{formatAmount(escrowBalance ?? 0)}
                                    </div>
                                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Available for project payments</p>
                                </div>
                                <button
                                    onClick={() => setShowAmountModal(true)}
                                    className={`bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 ${isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`}
                                >
                                    Add Funds
                                </button>
                            </div>
                        </div>

                        {/* Total Spent */}
                        <div className={`overflow-hidden sm:rounded-xl p-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow'}`}>
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-blue-500/20 mr-4">
                                    <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                                    </svg>
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Spent</p>
                                    <p className="text-2xl font-bold text-blue-400">
                                        {currency?.symbol || '$'}{formatAmount(totalSpent ?? 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Projects */}
                    {paidProjects && Array.isArray(paidProjects) && paidProjects.length > 0 ? (
                        <div className={`overflow-hidden sm:rounded-xl mb-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow'}`}>
                            <div className="p-8">
                                <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>💼 Recent Project Payments</h3>
                                <div className="space-y-4">
                                    {paidProjects.map((project) => {
                                        const jobTitle = project?.job?.title || 'Untitled Project';
                                        const gigWorkerFirstName = project?.gig_worker?.first_name || project?.freelancer?.first_name || '';
                                        const gigWorkerLastName = project?.gig_worker?.last_name || project?.freelancer?.last_name || '';
                                        const gigWorkerName = gigWorkerFirstName && gigWorkerLastName 
                                            ? `${gigWorkerFirstName} ${gigWorkerLastName}` 
                                            : gigWorkerFirstName || gigWorkerLastName || 'Unknown Worker';
                                        const projectStatus = project?.status || 'unknown';
                                        const agreedAmount = project?.agreed_amount ?? 0;
                                        const paymentReleased = project?.payment_released ?? false;

                                        return (
                                            <div key={project?.id || Math.random()} className={`border rounded-xl p-6 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{jobTitle}</h4>
                                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Gig Worker: {gigWorkerName}
                                                        </p>
                                                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                            Status: {projectStatus.charAt(0).toUpperCase() + projectStatus.slice(1)}
                                                        </p>
                                                        {(!project?.job || !project?.gig_worker) && (
                                                            <p className="text-xs text-amber-400 mt-1">
                                                                ⚠️ Some project details are unavailable
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-blue-400">
                                                            {currency?.symbol || '$'}{formatAmount(agreedAmount)}
                                                        </p>
                                                        {paymentReleased && (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                                                Payment Released
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Deposit History */}
                    <div className={`overflow-hidden sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow'}`}>
                        <div className="p-8">
                            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>💳 Deposit History</h3>
                            {deposits?.data && Array.isArray(deposits.data) && deposits.data.length > 0 ? (
                                <div className={`overflow-x-auto rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                        <thead>
                                            <tr>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                    Date
                                                </th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                    Amount
                                                </th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                                            {deposits.data.map((deposit) => {
                                                const depositDate = deposit?.created_at 
                                                    ? new Date(deposit.created_at).toLocaleDateString() 
                                                    : 'Unknown date';
                                                const depositAmount = deposit?.amount ?? 0;
                                                const depositStatus = deposit?.status || 'unknown';
                                                
                                                return (
                                                    <tr key={deposit?.id || Math.random()} className={isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                            {depositDate}
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                            {currency?.symbol || '$'}{formatAmount(depositAmount)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                depositStatus === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                                depositStatus === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-red-500/20 text-red-400'
                                                            }`}>
                                                                {depositStatus.charAt(0).toUpperCase() + depositStatus.slice(1)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <svg className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>No deposits yet</h3>
                                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                        Add funds to your escrow balance to start hiring gig workers.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Amount Input Modal */}
                    {showAmountModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                            <div className={`rounded-xl p-6 max-w-md w-full border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Funds to Escrow</h3>
                                    <button
                                        onClick={() => {
                                            setShowAmountModal(false);
                                            setAmount('');
                                            setIntentError(null);
                                        }}
                                        className={isDark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Amount to Deposit
                                    </label>
                                    <div className="relative rounded-md">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>{currency?.symbol || '$'}</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className={`focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 block w-full pl-7 pr-12 sm:text-sm border rounded-md ${isDark ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                        Minimum deposit: {currency?.symbol || '$'}50.00
                                    </p>
                                </div>

                                {intentError && (
                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <div className="text-sm text-red-400">
                                            {intentError}
                                        </div>
                                    </div>
                                )}

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => {
                                            setShowAmountModal(false);
                                            setAmount('');
                                            setIntentError(null);
                                        }}
                                        className={`flex-1 border py-3 px-6 rounded-xl transition-all duration-200 ${isDark ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeposit}
                                        disabled={!amount || parseFloat(amount) <= 0 || isCreatingIntent}
                                        className={`flex-1 bg-green-600 hover:bg-green-500 text-white py-3 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`}
                                    >
                                        {isCreatingIntent ? 'Creating...' : 'Continue to Payment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Modal */}
                    {showPaymentModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                            <div className={`rounded-xl p-6 max-w-md w-full border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
                                <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Complete Your Deposit</h3>
                                {(() => {
                                    const isValidClientSecret = clientSecret &&
                                                              typeof clientSecret === 'string' &&
                                                              clientSecret.length > 0 &&
                                                              clientSecret.indexOf('pi_') === 0;

                                    const isStripeReady = stripePromise && !isCreatingIntent;

                                    if (isValidClientSecret && isStripeReady) {
                                        return (
                                            <Elements
                                                key={`stripe-elements-${clientSecret}`}
                                                stripe={stripePromise}
                                                options={{
                                                    clientSecret: clientSecret,
                                                    appearance: {
                                                        theme: 'stripe',
                                                    },
                                                }}
                                            >
                                                <CheckoutForm
                                                    amount={amount}
                                                    currency={currency || { symbol: '$', code: 'USD' }}
                                                    clientSecret={clientSecret}
                                                    onSuccess={handleSuccess}
                                                    onCancel={handleCancel}
                                                />
                                            </Elements>
                                        );
                                    } else {
                                        return (
                                            <div className="text-center py-4">
                                                <div className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                                                    {isCreatingIntent ? 'Creating payment...' : 'Loading payment form...'}
                                                </div>
                                                {intentError && (
                                                    <div className="mt-2 text-sm text-red-400">
                                                        {intentError}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isDark && (
            <style>{`
                body {
                    background: #05070A;
                    color: #e5e7eb;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
            )}
        </AuthenticatedLayout>
    );
}
