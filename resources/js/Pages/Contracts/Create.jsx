import React, { useState, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/Components/CheckoutForm';

export default function CreateContract({
    gigWorker,
    price,
    jobs,
    user,
    stripe_key = null,
    currency = { symbol: '₱', code: 'PHP' },
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { data, setData, post, processing, errors } = useForm({
        gig_worker_id: gigWorker ? gigWorker.id : '',
        job_id: jobs.length === 1 ? jobs[0].id : '',
        agreed_amount: price || '',
        estimated_days: '7',
        scope_of_work: `Direct hire agreement with ${gigWorker ? gigWorker.first_name + ' ' + gigWorker.last_name : 'gig worker'}.\n\nPlease provide detailed requirements here.`,
    });

    const [showAmountModal, setShowAmountModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [stripePromise, setStripePromise] = useState(null);
    const [clientSecret, setClientSecret] = useState(null);
    const [isCreatingIntent, setIsCreatingIntent] = useState(false);
    const [intentError, setIntentError] = useState(null);

    const isBalanceSufficient = user.escrow_balance >= Number(data.agreed_amount);

    const workerPhotoUrl = gigWorker ? resolveProfileImageUrl(gigWorker.profile_photo) : null;

    // #region agent log
    useEffect(() => {
        if (!gigWorker) return;
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'cd5036' },
            body: JSON.stringify({
                sessionId: 'cd5036',
                location: 'Contracts/Create.jsx:workerPhoto',
                message: 'resolved gig worker profile image',
                data: {
                    raw: gigWorker.profile_photo ? String(gigWorker.profile_photo).slice(0, 80) : null,
                    resolved: workerPhotoUrl ? String(workerPhotoUrl).slice(0, 120) : null,
                },
                timestamp: Date.now(),
                hypothesisId: 'H-img',
            }),
        }).catch(() => {});
    }, [gigWorker, workerPhotoUrl]);
    // #endregion

    useEffect(() => {
        if (stripe_key) {
            setStripePromise(loadStripe(stripe_key));
        }
    }, [stripe_key]);

    const openAddFundsModal = () => {
        const need = Number(data.agreed_amount) || 0;
        const have = Number(user?.escrow_balance) ?? 0;
        const gap = Math.max(0, need - have);
        const initial = gap > 0 ? gap : need > 0 ? need : '';
        setAmount(initial ? String(initial) : '');
        setIntentError(null);
        setShowAmountModal(true);
        // #region agent log
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'cd5036' },
            body: JSON.stringify({
                sessionId: 'cd5036',
                location: 'Contracts/Create.jsx:openAddFundsModal',
                message: 'open add funds modal',
                data: { need, have, gap, hasStripe: !!stripe_key },
                timestamp: Date.now(),
                hypothesisId: 'H-modal',
            }),
        }).catch(() => {});
        // #endregion
    };

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

            const { clientSecret: secret } = await response.json();

            if (!secret || typeof secret !== 'string' || !secret.startsWith('pi_')) {
                throw new Error('Invalid payment intent received from server');
            }

            setClientSecret(secret);
            setShowAmountModal(false);
            setShowPaymentModal(true);
        } catch (err) {
            console.error('Error creating payment intent:', err);
            setIntentError(err.message || 'Failed to create payment intent. Please try again.');
        } finally {
            setIsCreatingIntent(false);
        }
    };

    const handlePaymentSuccess = async () => {
        setShowPaymentModal(false);
        setClientSecret(null);
        setIntentError(null);
        setAmount('');

        setTimeout(() => {
            window.location.reload();
        }, 1000);
    };

    const handleCancelDeposit = () => {
        setShowPaymentModal(false);
        setShowAmountModal(false);
        setClientSecret(null);
        setIntentError(null);
        setAmount('');
    };

    const submit = (e) => {
        e.preventDefault();
        const amt = Number(data.agreed_amount) || 0;
        const balance = Number(user?.escrow_balance) ?? 0;
        if (amt > 0 && balance < amt) {
            openAddFundsModal();
            return;
        }
        post(route('contracts.store'));
    };

    const inputBase = isDark
        ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500'
        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500';
    const labelCls = isDark ? 'text-gray-200' : 'text-gray-700';
    const mutedCls = isDark ? 'text-gray-400' : 'text-gray-600';

    return (
        <AuthenticatedLayout
            user={user}
            pageTheme={isDark ? 'dark' : undefined}
            header={
                <h2 className={`font-semibold text-xl leading-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Create Direct Contract
                </h2>
            }
        >
            <Head title="Create Direct Contract" />

            <div className={`py-12 min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <span
                                className={
                                    isDark ? 'bg-blue-500/20 text-blue-300 p-2 rounded-lg' : 'bg-blue-100 text-blue-700 p-2 rounded-lg'
                                }
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                            </span>
                            Direct Hire Contract
                        </h2>
                        <Link
                            href={route('messages.index')}
                            className={`text-sm flex items-center ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Messages
                        </Link>
                    </div>

                    <div
                        className={`rounded-2xl shadow-sm overflow-hidden border ${
                            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                        }`}
                    >
                        <form onSubmit={submit} className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {gigWorker && (
                                <div className={`p-6 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50/50'}`}>
                                    <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${mutedCls}`}>You are hiring</h3>
                                    <div className="flex items-center gap-4">
                                        {workerPhotoUrl ? (
                                            <img
                                                src={workerPhotoUrl}
                                                alt=""
                                                className={`w-16 h-16 rounded-full object-cover border-2 shadow-sm ${
                                                    isDark ? 'border-gray-700' : 'border-white'
                                                }`}
                                            />
                                        ) : (
                                            <div
                                                className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl border-2 shadow-sm ${
                                                    isDark
                                                        ? 'bg-blue-500/20 text-blue-200 border-gray-700'
                                                        : 'bg-blue-100 text-blue-700 border-white'
                                                }`}
                                            >
                                                {gigWorker.first_name[0]}
                                                {gigWorker.last_name[0]}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {gigWorker.first_name} {gigWorker.last_name}
                                            </h4>
                                            <p className={`text-sm font-medium ${mutedCls}`}>{gigWorker.professional_title}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 space-y-6">
                                {errors.error_type === 'insufficient_escrow' && (
                                    <div
                                        className={`p-4 border rounded-xl flex items-start gap-3 ${
                                            isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-100'
                                        }`}
                                    >
                                        <svg
                                            className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                            />
                                        </svg>
                                        <div>
                                            <h4 className={`text-sm font-bold ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                                                Insufficient Escrow Balance
                                            </h4>
                                            <p className={`text-sm mt-1 ${isDark ? 'text-red-200/90' : 'text-red-700'}`}>
                                                You need ₱{Number(errors.required_amount).toLocaleString()} to create this contract, but your
                                                current balance is ₱{Number(user.escrow_balance).toLocaleString()}.
                                            </p>
                                            <div className="mt-3">
                                                <button
                                                    type="button"
                                                    onClick={openAddFundsModal}
                                                    className={`text-sm font-medium underline ${isDark ? 'text-red-200 hover:text-white' : 'text-red-900 hover:text-red-700'}`}
                                                >
                                                    click here to add funds
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${labelCls}`}>Select Job Listing</label>
                                    <select
                                        value={data.job_id}
                                        onChange={(e) => setData('job_id', e.target.value)}
                                        className={`w-full rounded-xl shadow-sm focus:border-blue-500 focus:ring-blue-500 ${inputBase}`}
                                        required
                                    >
                                        <option value="">-- Choose one of your open jobs --</option>
                                        {jobs.map((job) => (
                                            <option key={job.id} value={job.id}>
                                                {job.title} (Budget: ₱{job.budget_min} - ₱{job.budget_max})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.job_id && <p className="text-red-400 text-xs mt-1">{errors.job_id}</p>}
                                    {jobs.length === 0 && (
                                        <p className="text-amber-500 text-sm mt-2">
                                            You don&apos;t have any open jobs. Please create a job listing first so you can hire a gig worker
                                            for it.
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={`block text-sm font-bold mb-2 ${labelCls}`}>Final Negotiated Price (₱)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className={`sm:text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>₱</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={data.agreed_amount}
                                                onChange={(e) => setData('agreed_amount', e.target.value)}
                                                className={`w-full pl-8 rounded-xl shadow-sm focus:border-blue-500 focus:ring-blue-500 font-medium ${inputBase}`}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        {errors.agreed_amount && <p className="text-red-400 text-xs mt-1">{errors.agreed_amount}</p>}
                                        {!isBalanceSufficient && data.agreed_amount > 0 && (
                                            <div className="mt-1 space-y-1">
                                                <p className="text-red-400 text-xs">
                                                    Insufficient balance. Your unallocated balance is ₱
                                                    {Number(user.escrow_balance).toLocaleString()}
                                                </p>
                                                <p className="text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={openAddFundsModal}
                                                        className="text-blue-400 hover:text-blue-300 underline font-medium"
                                                    >
                                                        click here to add funds
                                                    </button>
                                                    <span className={mutedCls}> to escrow.</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-bold mb-2 ${labelCls}`}>Estimated Duration (Days)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={data.estimated_days}
                                            onChange={(e) => setData('estimated_days', e.target.value)}
                                            className={`w-full rounded-xl shadow-sm focus:border-blue-500 focus:ring-blue-500 ${inputBase}`}
                                            required
                                        />
                                        {errors.estimated_days && <p className="text-red-400 text-xs mt-1">{errors.estimated_days}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${labelCls}`}>Scope of Work & Requirements</label>
                                    <p className={`text-xs mb-2 ${mutedCls}`}>
                                        This will be embedded into the contract. Be as detailed as possible to ensure mutual understanding.
                                    </p>
                                    <textarea
                                        rows={6}
                                        value={data.scope_of_work}
                                        onChange={(e) => setData('scope_of_work', e.target.value)}
                                        className={`w-full rounded-xl shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm ${inputBase}`}
                                        placeholder="Describe the specific deliverables, milestones, and requirements..."
                                        required
                                    />
                                    {errors.scope_of_work && <p className="text-red-400 text-xs mt-1">{errors.scope_of_work}</p>}
                                </div>
                            </div>

                            <div
                                className={`p-6 flex items-center justify-between ${isDark ? 'bg-gray-800/80' : 'bg-gray-50'}`}
                            >
                                <p className={`text-sm max-w-sm ${mutedCls}`}>
                                    Clicking create will lock the agreed amount in Escrow and generate a contract for your signature.
                                </p>
                                <button
                                    type="submit"
                                    disabled={processing || jobs.length === 0 || !isBalanceSufficient}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {processing && (
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                    )}
                                    Fund Escrow & Create Contract
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {showAmountModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div
                        className={`rounded-xl p-6 max-w-md w-full border ${
                            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xl'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Add Funds to Escrow</h3>
                            <button
                                type="button"
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
                                    <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>{currency?.symbol || '₱'}</span>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={`focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 block w-full pl-7 pr-12 sm:text-sm border rounded-md ${
                                        isDark ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                    }`}
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                Minimum deposit: {currency?.symbol || '₱'}50.00
                            </p>
                        </div>

                        {intentError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="text-sm text-red-400">{intentError}</div>
                            </div>
                        )}

                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAmountModal(false);
                                    setAmount('');
                                    setIntentError(null);
                                }}
                                className={`flex-1 border py-3 px-6 rounded-xl transition-all duration-200 ${
                                    isDark ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeposit}
                                disabled={!amount || parseFloat(amount) <= 0 || isCreatingIntent}
                                className={`flex-1 bg-green-600 hover:bg-green-500 text-white py-3 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'
                                }`}
                            >
                                {isCreatingIntent ? 'Creating...' : 'Continue to Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div
                        className={`rounded-xl p-6 max-w-md w-full border ${
                            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xl'
                        }`}
                    >
                        <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Complete Your Deposit</h3>
                        {(() => {
                            const isValidClientSecret =
                                clientSecret && typeof clientSecret === 'string' && clientSecret.length > 0 && clientSecret.indexOf('pi_') === 0;

                            const isStripeReady = stripePromise && !isCreatingIntent;

                            if (isValidClientSecret && isStripeReady) {
                                return (
                                    <Elements
                                        key={`stripe-elements-${clientSecret}`}
                                        stripe={stripePromise}
                                        options={{
                                            clientSecret: clientSecret,
                                            appearance: { theme: 'stripe' },
                                        }}
                                    >
                                        <CheckoutForm
                                            amount={amount}
                                            currency={currency || { symbol: '₱', code: 'PHP' }}
                                            clientSecret={clientSecret}
                                            onSuccess={handlePaymentSuccess}
                                            onCancel={handleCancelDeposit}
                                        />
                                    </Elements>
                                );
                            }
                            return (
                                <div className="text-center py-4">
                                    <div className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                                        {isCreatingIntent ? 'Creating payment...' : 'Loading payment form...'}
                                    </div>
                                    {intentError && <div className="mt-2 text-sm text-red-400">{intentError}</div>}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {isDark && (
                <style>{`
                    body {
                        background: #05070a;
                        color: #e5e7eb;
                    }
                `}</style>
            )}
        </AuthenticatedLayout>
    );
}
