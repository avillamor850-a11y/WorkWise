import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { Download, FileText, Filter, DollarSign } from 'lucide-react';

export default function VatInvoices({ auth, transactions, filters, user, error }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [projectId, setProjectId] = useState(filters?.project_id || '');

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount ?? 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleFilter = () => {
        router.get('/reports/vat-invoices', {
            date_from: dateFrom,
            date_to: dateTo,
            project_id: projectId || undefined
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleDownloadPdf = (transactionId) => {
        const url = `/reports/vat-invoices/${transactionId}/pdf`;
        const w = window.open(url, '_blank');
        if (!w) alert('Please allow pop-ups to download the invoice.');
    };

    const list = transactions?.data ?? [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Link href="/reports" className={isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}>
                            ← Back to Reports
                        </Link>
                        <h2 className={`text-xl font-semibold leading-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            VAT / Tax Invoices
                        </h2>
                    </div>
                </div>
            }
            pageTheme={isDark ? 'dark' : 'light'}
        >
            <Head title="VAT / Tax Invoices" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative py-12 overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {error && (
                        <div className={isDark ? 'bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-xl' : 'bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl'}>
                            {error}
                        </div>
                    )}

                    <div className={`backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="p-8">
                            <div className="flex items-center mb-4">
                                <Filter className={`w-5 h-5 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                                <h3 className={`text-lg font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Filters</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="date_from" className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>From Date</label>
                                    <input
                                        id="date_from"
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className={isDark ? 'mt-1 block w-full rounded-xl border-gray-600 bg-gray-700 text-white shadow-lg focus:border-blue-500 focus:ring-blue-500' : 'mt-1 block w-full rounded-xl border-gray-300 bg-white text-gray-900 shadow-lg focus:border-blue-500 focus:ring-blue-500'}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="date_to" className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>To Date</label>
                                    <input
                                        id="date_to"
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className={isDark ? 'mt-1 block w-full rounded-xl border-gray-600 bg-gray-700 text-white shadow-lg focus:border-blue-500 focus:ring-blue-500' : 'mt-1 block w-full rounded-xl border-gray-300 bg-white text-gray-900 shadow-lg focus:border-blue-500 focus:ring-blue-500'}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="project_id" className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Project ID (optional)</label>
                                    <input
                                        id="project_id"
                                        type="text"
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        placeholder="Filter by project ID"
                                        className={isDark ? 'mt-1 block w-full rounded-xl border-gray-600 bg-gray-700 text-white placeholder-gray-500 shadow-lg focus:border-blue-500 focus:ring-blue-500' : 'mt-1 block w-full rounded-xl border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-lg focus:border-blue-500 focus:ring-blue-500'}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={handleFilter}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg transition-all duration-300 text-sm flex items-center"
                                >
                                    <Filter className="w-4 h-4 mr-2" />
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={`backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="p-8">
                            <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Release transactions – download VAT invoice (PDF)</h3>
                            {list.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className={`min-w-full divide-y ${isDark ? 'divide-gray-600' : 'divide-gray-200'}`}>
                                        <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                                            <tr>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Date</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Project / Job</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Payee</th>
                                                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Amount</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-600' : 'bg-white divide-gray-200'}`}>
                                            {list.map((tx) => (
                                                <tr key={tx.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                                    <td className={`px-6 py-4 text-sm whitespace-nowrap ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {formatDate(tx.created_at)}
                                                    </td>
                                                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {tx.project?.job?.title ?? 'N/A'}
                                                    </td>
                                                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {tx.payee ? `${tx.payee.first_name ?? ''} ${tx.payee.last_name ?? ''}`.trim() || tx.payee.email : 'N/A'}
                                                    </td>
                                                    <td className={`px-6 py-4 text-sm text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {formatCurrency(tx.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownloadPdf(tx.id)}
                                                            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'}`}
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Download VAT Invoice
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FileText className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>No release transactions found</h3>
                                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Release transactions will appear here. Use filters or complete a payment release to generate VAT invoices.
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
                                                    link.active ? 'bg-blue-600 text-white' :
                                                    link.url
                                                        ? isDark
                                                            ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
