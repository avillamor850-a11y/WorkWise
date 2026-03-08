import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { Download, DollarSign, Clock, Inbox } from 'lucide-react';

export default function PendingAccruedIncome({ auth, filters, user, transactions, summary, error }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount ?? 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleFilter = () => {
        router.get('/reports/pending-accrued-income', {
            date_from: dateFrom,
            date_to: dateTo
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const getStatusBadge = (statusVal, isDarkMode) => {
        const darkBadges = {
            completed: 'bg-green-900/50 text-green-200',
            pending: 'bg-yellow-900/50 text-yellow-200',
            failed: 'bg-red-900/50 text-red-200',
            cancelled: 'bg-gray-700 text-gray-300'
        };
        const lightBadges = {
            completed: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800'
        };
        const badges = isDarkMode ? darkBadges : lightBadges;
        return badges[statusVal] || (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800');
    };

    const getTypeLabel = (typeVal) => {
        return typeVal === 'escrow' ? 'Escrow' : typeVal.charAt(0).toUpperCase() + (typeVal || '').slice(1);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/reports"
                            className={isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}
                        >
                            ← Back to Reports
                        </Link>
                        <h2 className={`text-xl font-semibold leading-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            Pending / Accrued Income
                        </h2>
                    </div>
                </div>
            }
            pageTheme={isDark ? 'dark' : undefined}
        >
            <Head title="Pending / Accrued Income" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative py-12 overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {error && (
                        <div className={`px-4 py-3 rounded-xl border ${isDark ? 'bg-amber-900/50 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                            {error}
                        </div>
                    )}

                    <div className={`rounded-xl p-4 flex items-start gap-3 border ${isDark ? 'bg-amber-900/50 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                        <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
                        <div>
                            <p className={`text-sm font-medium ${isDark ? 'text-amber-100' : 'text-amber-800'}`}>Money in the pipeline — not yet withdrawable</p>
                            <p className={`text-sm mt-1 ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                                This report lists transactions with status <strong>Pending</strong> or type <strong>Escrow</strong>. These amounts are not yet available for withdrawal until the project is completed and payment is released.
                            </p>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className={`backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                                            <Inbox className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total amount (in pipeline)</div>
                                        <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                            {formatCurrency(summary?.total_pending_amount)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <DollarSign className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Expected net (after fee)</div>
                                        <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                            {formatCurrency(summary?.total_pending_net)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <Clock className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Items in pipeline</div>
                                        <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                            {summary?.total_count ?? 0}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date filters */}
                    <div className={`backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="p-6">
                            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Filters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="date_from" className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>From Date</label>
                                    <input
                                        id="date_from"
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className={`mt-1 block w-full rounded-xl shadow-lg focus:border-blue-500 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="date_to" className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>To Date</label>
                                    <input
                                        id="date_to"
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className={`mt-1 block w-full rounded-xl shadow-lg focus:border-blue-500 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleFilter}
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="p-8">
                            <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Pending / escrow transactions</h3>

                            {transactions?.data?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className={`min-w-full divide-y ${isDark ? 'divide-gray-600' : 'divide-gray-200'}`}>
                                        <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                                            <tr>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Type</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Project</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Client</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Expected net</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-600' : 'bg-white divide-gray-200'}`}>
                                            {transactions.data.map((transaction) => (
                                                <tr key={transaction.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {formatDate(transaction.created_at)}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {getTypeLabel(transaction.type)}
                                                    </td>
                                                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {transaction.project?.job?.title || '—'}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {transaction.payer ? `${transaction.payer.first_name} ${transaction.payer.last_name}` : '—'}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {formatCurrency(transaction.amount)}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                                        {formatCurrency(transaction.net_amount ?? transaction.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold shadow-md ${getStatusBadge(transaction.status, isDark)}`}>
                                                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Inbox className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>No pending or escrow transactions</h3>
                                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        You have no money in the pipeline right now. Completed projects with released payments appear in Earnings Transparency.
                                    </p>
                                </div>
                            )}

                            {transactions?.links && transactions.links.length > 3 && (
                                <div className="mt-6 flex justify-between items-center">
                                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Showing {transactions.from} to {transactions.to} of {transactions.total} results
                                    </div>
                                    <div className="flex space-x-1">
                                        {transactions.links.map((link, index) => (
                                            <Link
                                                key={index}
                                                href={link.url || '#'}
                                                className={`px-3 py-2 text-sm rounded-md ${
                                                    link.active ? 'bg-blue-600 text-white'
                                                        : link.url
                                                        ? isDark
                                                            ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                                                            : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        : isDark
                                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </AuthenticatedLayout>
    );
}
