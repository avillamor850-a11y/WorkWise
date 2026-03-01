import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Download, DollarSign, Clock, Inbox } from 'lucide-react';

export default function PendingAccruedIncome({ auth, filters, user, transactions, summary, error }) {
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

    const getStatusBadge = (statusVal) => {
        const badges = {
            completed: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800'
        };
        return badges[statusVal] || 'bg-gray-100 text-gray-800';
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
                            className="text-blue-600 hover:text-blue-800"
                        >
                            ← Back to Reports
                        </Link>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">
                            Pending / Accrued Income
                        </h2>
                    </div>
                </div>
            }
        >
            <Head title="Pending / Accrued Income" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="relative py-12 bg-white overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {error && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-900">Money in the pipeline — not yet withdrawable</p>
                            <p className="text-sm text-amber-800 mt-1">
                                This report lists transactions with status <strong>Pending</strong> or type <strong>Escrow</strong>. These amounts are not yet available for withdrawal until the project is completed and payment is released.
                            </p>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                                            <Inbox className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Total amount (in pipeline)</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(summary?.total_pending_amount)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <DollarSign className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Expected net (after fee)</div>
                                        <div className="text-2xl font-bold text-green-700">
                                            {formatCurrency(summary?.total_pending_net)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <Clock className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Items in pipeline</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {summary?.total_count ?? 0}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date filters */}
                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="date_from" className="block text-sm font-medium text-gray-700">From Date</label>
                                    <input
                                        id="date_from"
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 shadow-lg focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="date_to" className="block text-sm font-medium text-gray-700">To Date</label>
                                    <input
                                        id="date_to"
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 shadow-lg focus:border-blue-500 focus:ring-blue-500"
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
                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                        <div className="p-8">
                            <h3 className="text-lg font-medium text-gray-900 mb-6">Pending / escrow transactions</h3>

                            {transactions?.data?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected net</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {transactions.data.map((transaction) => (
                                                <tr key={transaction.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatDate(transaction.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                                                        {getTypeLabel(transaction.type)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {transaction.project?.job?.title || '—'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {transaction.payer ? `${transaction.payer.first_name} ${transaction.payer.last_name}` : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {formatCurrency(transaction.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                                        {formatCurrency(transaction.net_amount ?? transaction.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold shadow-md ${getStatusBadge(transaction.status)}`}>
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
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No pending or escrow transactions</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        You have no money in the pipeline right now. Completed projects with released payments appear in Earnings Transparency.
                                    </p>
                                </div>
                            )}

                            {transactions?.links && transactions.links.length > 3 && (
                                <div className="mt-6 flex justify-between items-center">
                                    <div className="text-sm text-gray-700">
                                        Showing {transactions.from} to {transactions.to} of {transactions.total} results
                                    </div>
                                    <div className="flex space-x-1">
                                        {transactions.links.map((link, index) => (
                                            <Link
                                                key={index}
                                                href={link.url || '#'}
                                                className={`px-3 py-2 text-sm rounded-md ${
                                                    link.active ? 'bg-blue-500 text-white'
                                                        : link.url ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
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

            <style>{`
                body { background: white; color: #333; font-family: 'Inter', sans-serif; }
            `}</style>
        </AuthenticatedLayout>
    );
}
