import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function AdminPayments({ transactions, stats, filters }) {
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Auto-refresh every 30 seconds for real-time data
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            router.reload({ only: ['transactions', 'stats'], preserveScroll: true });
            setLastUpdated(new Date());
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const getTransactionTypeColor = (type) => {
        switch (type) {
            case 'escrow': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400';
            case 'release': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400';
            case 'refund': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400';
            case 'fee': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400';
        }
    };

    const getTransactionTypeIcon = (type) => {
        switch (type) {
            case 'escrow': return 'lock';
            case 'release': return 'check_circle';
            case 'refund': return 'undo';
            case 'fee': return 'receipt';
            default: return 'payment';
        }
    };

    return (
        <AdminLayout>
            <Head title="Admin - Payments & Transactions" />

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Payment Management</h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Real-time monitoring of all platform transactions and earnings
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                        Last updated: {lastUpdated.toLocaleTimeString('en-PH')}
                        {autoRefresh && ' • Auto-refreshing every 30s'}
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            autoRefresh
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-400'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">
                            {autoRefresh ? 'sync' : 'sync_disabled'}
                        </span>
                        {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                    </button>
                    <a
                        href="/admin/payments/export"
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        <span className="material-symbols-outlined">download</span>
                        Export
                    </a>
                    <Link
                        href="/admin/reports/transactions"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/70"
                    >
                        <span className="material-symbols-outlined">receipt_long</span>
                        Transaction Reports
                    </Link>
                    <Link
                        href="/admin/deposits"
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        <span className="material-symbols-outlined">account_balance_wallet</span>
                        User Added Funds
                    </Link>
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Platform Fee (Total Earnings)</p>
                        <span className="material-symbols-outlined text-green-500">attach_money</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(stats.platform_fee)}
                    </p>
                    <p className="mt-1 text-sm text-green-500">Total fees collected from all transactions</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                        <span>Today: {formatCurrency(stats.today_platform_fee)}</span>
                        <span>•</span>
                        <span>Week: {formatCurrency(stats.week_platform_fee)}</span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Total Transaction Volume</p>
                        <span className="material-symbols-outlined text-blue-500">payments</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(stats.total_volume)}
                    </p>
                    <p className="mt-1 text-sm text-blue-500">All completed transactions</p>
                    <div className="mt-3 text-xs text-slate-500">
                        Paid to workers: {formatCurrency(stats.paid_to_workers)}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Successful Transactions</p>
                        <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {stats.successful_transactions || '0'}
                    </p>
                    <p className="mt-1 text-sm text-emerald-500">Completed payments</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <span className="text-yellow-600">Pending: {stats.pending_transactions}</span>
                        <span>•</span>
                        <span className="text-red-600">Failed: {stats.failed_transactions}</span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Average Platform Fee</p>
                        <span className="material-symbols-outlined text-purple-500">percent</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {stats.average_fee_percentage ? `${stats.average_fee_percentage}%` : '0%'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fee percentage on transactions</p>
                    <div className="mt-3 text-xs text-slate-500">
                        Standard rate: 5%
                    </div>
                </div>
            </div>

            {/* Transaction Type Breakdown */}
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Escrow</span>
                        <span className="material-symbols-outlined text-blue-500 text-sm">lock</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.escrow_count}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Release</span>
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.release_count}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Refund</span>
                        <span className="material-symbols-outlined text-orange-500 text-sm">undo</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.refund_count}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Fee</span>
                        <span className="material-symbols-outlined text-purple-500 text-sm">receipt</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.fee_count}</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-200 p-6 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recent Transactions</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Real-time view of all payment transactions
                    </p>
                </div>
                <div className="p-6">
                    {transactions && transactions.data && transactions.data.length > 0 ? (
                        <div className="space-y-4">
                            {transactions.data.map((transaction) => (
                                <div key={transaction.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/50">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                                transaction.type === 'escrow' ? 'bg-blue-100 dark:bg-blue-900/50' :
                                                transaction.type === 'release' ? 'bg-green-100 dark:bg-green-900/50' :
                                                transaction.type === 'refund' ? 'bg-orange-100 dark:bg-orange-900/50' :
                                                'bg-purple-100 dark:bg-purple-900/50'
                                            }`}>
                                                <span className={`material-symbols-outlined ${
                                                    transaction.type === 'escrow' ? 'text-blue-500' :
                                                    transaction.type === 'release' ? 'text-green-500' :
                                                    transaction.type === 'refund' ? 'text-orange-500' :
                                                    'text-purple-500'
                                                }`}>
                                                    {getTransactionTypeIcon(transaction.type)}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                                        {formatCurrency(transaction.amount)}
                                                    </p>
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                                                        {transaction.type}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    From: {transaction.payer?.first_name} {transaction.payer?.last_name} •
                                                    To: {transaction.payee?.first_name} {transaction.payee?.last_name}
                                                </p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                                    Project: {transaction.project?.job?.title || 'Unknown Project'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                Platform Fee: {formatCurrency(transaction.platform_fee)}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Net: {formatCurrency(transaction.net_amount)}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                            transaction.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' :
                                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                            transaction.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
                                        }`}>
                                            {transaction.status}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[120px]">
                                            {formatDate(transaction.created_at)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-400">credit_card_off</span>
                                <p className="mt-2 text-slate-500 dark:text-slate-400">No transactions found</p>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {transactions && transactions.links && (
                        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                Showing {transactions.from || 0} to {transactions.to || 0} of {transactions.total || 0} transactions
                            </div>
                            <div className="flex gap-2">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={`px-3 py-1 rounded text-sm ${
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                    <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100">Understanding Platform Fees</h3>
                        <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                            <strong>Platform Fee = Platform Earnings:</strong> These terms mean the same thing - the fee collected by the platform from transactions.
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                            <li>• <strong>Escrow:</strong> Funds held in escrow - platform fee is collected at this stage</li>
                            <li>• <strong>Release:</strong> Funds released to gig worker - no additional fee charged</li>
                            <li>• <strong>Refund:</strong> Funds returned to employer</li>
                            <li>• <strong>Fee:</strong> Additional platform fees or charges</li>
                        </ul>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}