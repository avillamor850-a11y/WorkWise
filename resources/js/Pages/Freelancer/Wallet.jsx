import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

export default function FreelancerWallet({ 
    totalEarnings = 0, 
    pendingEarnings = 0, 
    availableBalance = 0, 
    completedProjects = [], 
    pendingPayments = [], 
    transactions = { data: [] }, 
    currency = { symbol: '$', code: 'USD' }
}) {
    const { flash } = usePage().props;
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        bank_account: ''
    });

    const handleWithdrawal = (e) => {
        e.preventDefault();
        post('/gig-worker/wallet/withdraw', {
            onSuccess: () => {
                reset();
                setShowWithdrawalModal(false);
            }
        });
    };

    const formatAmount = (value) => {
        const number = Number(value ?? 0);
        return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getStatusBadge = (status) => {
        const badges = {
            completed: 'bg-green-500/20 text-green-400',
            pending: 'bg-amber-500/20 text-amber-400',
            active: 'bg-blue-500/20 text-blue-400'
        };
        return badges[status] || (isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800');
    };

    // Ensure transactions is properly structured
    const safeTransactions = transactions?.data ?? [];
    const safePendingPayments = Array.isArray(pendingPayments) ? pendingPayments : [];

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : undefined}
            header={<h2 className={`font-semibold text-xl leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>My Earnings</h2>}
        >
            <Head title="My Earnings" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative min-h-screen overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Animated Background Shapes */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8 py-12">
                    {flash?.success && (
                        <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl">
                            {flash.success}
                        </div>
                    )}

                    {/* Earnings Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Total Earnings */}
                        <div className={`overflow-hidden shadow-lg sm:rounded-xl p-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-green-500/20 mr-4">
                                    <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                                    </svg>
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Earnings</p>
                                    <p className="text-2xl font-bold text-green-400">
                                        {currency?.symbol ?? '$'}{formatAmount(totalEarnings)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Pending Payments */}
                        <div className={`overflow-hidden shadow-lg sm:rounded-xl p-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-amber-500/20 mr-4">
                                    <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                                    </svg>
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending Payments</p>
                                    <p className="text-2xl font-bold text-amber-400">
                                        {currency?.symbol ?? '$'}{formatAmount(pendingEarnings)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Available Balance */}
                        <div className={`overflow-hidden shadow-lg sm:rounded-xl p-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="p-3 rounded-full bg-blue-500/20 mr-4">
                                        <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Available Balance</p>
                                        <p className="text-2xl font-bold text-blue-400">
                                            {currency?.symbol ?? '$'}{formatAmount(availableBalance)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowWithdrawalModal(true)}
                                    disabled={availableBalance <= 0}
                                    className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-500/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 ${isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`}
                                >
                                    Withdraw
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pending Payments Section */}
                    {safePendingPayments.length > 0 && (
                        <div className={`overflow-hidden shadow-lg sm:rounded-xl mb-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="p-8">
                                <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>⏳ Pending Payments (Escrowed or Awaiting Release)</h3>
                                <div className="space-y-4">
                                    {safePendingPayments.map((project) => (
                                        <div key={project?.id ?? Math.random()} className={`rounded-xl p-6 border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {project?.job?.title ?? 'Project #' + (project?.id ?? 'Unknown')}
                                                    </h4>
                                                    {project?.employer ? (
                                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Employer: {project.employer.first_name ?? ''} {project.employer.last_name ?? ''}
                                                        </p>
                                                    ) : (
                                                        <p className={`text-sm italic ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Employer information unavailable</p>
                                                    )}
                                                    {project?.status === 'completed' && project?.completed_at ? (
                                                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Completed {formatDistanceToNow(new Date(project.completed_at))} ago</p>
                                                    ) : project?.started_at ? (
                                                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Started {formatDistanceToNow(new Date(project.started_at))} ago</p>
                                                    ) : (
                                                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Date unavailable</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-amber-400">
                                                        {currency?.symbol ?? '$'}{formatAmount(project?.net_amount)}
                                                    </p>
                                                    {project?.status === 'completed' ? (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold bg-amber-500/20 text-amber-400">
                                                            Awaiting Release
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold bg-blue-500/20 text-blue-400">
                                                            In Progress (Escrowed)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Payments */}
                    <div className={`overflow-hidden shadow-lg sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="p-8">
                            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>💸 Recent Payments Received</h3>
                            {safeTransactions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                        <thead>
                                            <tr>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                    Project
                                                </th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                    Employer
                                                </th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                    Amount
                                                </th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                    Date
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                                            {safeTransactions.map((transaction) => (
                                                <tr key={transaction?.id ?? Math.random()}>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {transaction?.project?.job?.title ?? 'Project #' + (transaction?.project_id ?? 'Unknown')}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        {transaction?.payer?.first_name ?? ''} {transaction?.payer?.last_name ?? ''}
                                                        {!transaction?.payer && <span className={isDark ? 'text-gray-500 italic' : 'text-gray-500 italic'}>N/A</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                                                        {currency?.symbol ?? '$'}{formatAmount(transaction?.net_amount)}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {transaction?.processed_at 
                                                            ? new Date(transaction.processed_at).toLocaleDateString()
                                                            : 'N/A'
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <svg className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>No payments yet</h3>
                                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                        Complete projects to start earning money!
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Withdrawal Modal */}
                    {showWithdrawalModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                            <div className={`rounded-xl p-8 max-w-md w-full shadow-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Withdraw Funds</h3>
                                <form onSubmit={handleWithdrawal}>
                                    <div className="mb-4">
                                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            Amount to Withdraw
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={availableBalance}
                                            step="0.01"
                                            value={data.amount}
                                            onChange={(e) => setData('amount', e.target.value)}
                                            className={`w-full rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:ring-offset-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-offset-gray-900' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-offset-white'}`}
                                            required
                                        />
                                        {errors.amount && <p className="mt-1 text-sm text-red-400">{errors.amount}</p>}
                                    </div>
                                    <div className="mb-6">
                                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            Bank Account
                                        </label>
                                        <input
                                            type="text"
                                            value={data.bank_account}
                                            onChange={(e) => setData('bank_account', e.target.value)}
                                            placeholder="Account ending in ****1234"
                                            className={`w-full rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:ring-offset-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-offset-gray-900' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-offset-white'}`}
                                            required
                                        />
                                        {errors.bank_account && <p className="mt-1 text-sm text-red-400">{errors.bank_account}</p>}
                                    </div>
                                    <div className="flex space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowWithdrawalModal(false)}
                                            className={`flex-1 py-3 px-6 rounded-xl transition-all duration-300 border ${isDark ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className={`flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 ${isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`}
                                        >
                                            {processing ? 'Processing...' : 'Withdraw'}
                                        </button>
                                    </div>
                                </form>
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
        </AuthenticatedLayout>
    );
}
