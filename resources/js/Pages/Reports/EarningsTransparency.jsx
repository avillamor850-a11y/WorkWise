import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputLabel from '@/Components/InputLabel';
import { Calendar, Download, FileText, DollarSign, Filter, Receipt } from 'lucide-react';

export default function EarningsTransparency({ auth, filters, user, transactions, summary, error }) {
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [type, setType] = useState(filters?.type || '');
    const [status, setStatus] = useState(filters?.status || '');

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
        router.get('/reports/earnings-transparency', {
            date_from: dateFrom,
            date_to: dateTo,
            type: type,
            status: status
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleExport = (format) => {
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            if (type) params.append('type', type);
            if (status) params.append('status', status);
            params.append('format', format);
            const exportUrl = `/reports/earnings-transparency/export?${params.toString()}`;
            const exportWindow = window.open(exportUrl, '_blank');
            if (!exportWindow) {
                alert('Please allow pop-ups for this site to download the report.');
            }
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export report. Please try again.');
        }
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

    const getTypeIcon = (typeVal) => {
        const icons = {
            escrow: '💰',
            release: '💸',
            refund: '↩️',
            fee: '⚙️'
        };
        return icons[typeVal] || '💳';
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
                            Earnings Transparency (Gross vs. Net)
                        </h2>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleExport('pdf')}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export PDF
                        </button>
                        <button
                            onClick={() => handleExport('excel')}
                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Export Excel
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Earnings Transparency (Gross vs. Net)" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="relative py-12 bg-white overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {error && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Gross vs Net Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <Receipt className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Total amount (client paid)</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(summary?.total_gross)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                                            <DollarSign className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Total platform fee</div>
                                        <div className="text-2xl font-bold text-red-600">
                                            -{formatCurrency(summary?.total_platform_fee)}
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
                                        <div className="text-sm font-medium text-gray-500">Net amount (you received)</div>
                                        <div className="text-2xl font-bold text-green-700">
                                            {formatCurrency(summary?.total_net)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Transactions</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {summary?.total_transactions ?? 0}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                        <div className="p-8">
                            <div className="flex items-center mb-4">
                                <Filter className="w-5 h-5 text-gray-500 mr-2" />
                                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                <div>
                                    <InputLabel htmlFor="type" value="Transaction Type" />
                                    <select
                                        id="type"
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 shadow-lg focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="">All Types</option>
                                        <option value="escrow">Escrow</option>
                                        <option value="release">Release</option>
                                        <option value="refund">Refund</option>
                                        <option value="fee">Fee</option>
                                    </select>
                                </div>
                                <div>
                                    <InputLabel htmlFor="status" value="Status" />
                                    <select
                                        id="status"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 shadow-lg focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="completed">Completed</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
                                >
                                    <Download className="w-5 h-5" />
                                    <span>Download PDF</span>
                                </button>
                                <button
                                    onClick={handleFilter}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center"
                                >
                                    <Filter className="w-4 h-4 mr-2" />
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                        <div className="p-8">
                            <h3 className="text-lg font-medium text-gray-900 mb-6">Transaction details</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Amount (client paid) is what the client paid. Platform fee is deducted. Net amount (you received) is what you receive after the fee.
                            </p>

                            {transactions?.data?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (client paid)</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform fee</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net amount (you received)</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {transactions.data.map((transaction) => (
                                                <tr key={transaction.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatDate(transaction.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <span className="text-lg mr-2">{getTypeIcon(transaction.type)}</span>
                                                            <span className="text-sm font-medium text-gray-900 capitalize">{transaction.type}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {transaction.description || `${transaction.type} transaction`}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {formatCurrency(transaction.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                                        -{formatCurrency(transaction.platform_fee)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
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
                                    <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
                                    <p className="mt-1 text-sm text-gray-500">No transactions match your current filters.</p>
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
