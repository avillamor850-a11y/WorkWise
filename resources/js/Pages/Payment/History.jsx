import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { format, parseISO, isValid } from 'date-fns';

export default function PaymentHistory({ transactions = [], summary = {} }) {
    const { auth } = usePage().props;
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isEmployer = auth.user.user_type === 'employer';

    const formatDate = (dateString) => {
        try {
            if (!dateString) return 'N/A';
            const date = parseISO(dateString);
            return isValid(date) ? format(date, 'MM/dd/yy') : 'N/A';
        } catch (error) {
            if (typeof dateString === 'string' && dateString.match(/^[A-Z][a-z]{2} \d{1,2}, \d{4}/)) {
                return dateString;
            }
            return 'N/A';
        }
    };

    const projectTitle = (t) => t?.project?.title ?? t?.project_title ?? 'N/A';

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : 'light'}
            header={<h2 className={`font-semibold text-xl leading-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Payment History</h2>}
        >
            <Head title="Payment History" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`min-h-screen relative ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-20 py-12 max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className={`overflow-hidden sm:rounded-xl p-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        {/* Summary Section */}
                        <div className="mb-8">
                            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {isEmployer ? (
                                    <>
                                        <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Escrow Balance</div>
                                            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                ₱{(summary.escrow_balance ?? auth.user.escrow_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Total Spent</div>
                                            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                ₱{(summary.total_spent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Active Escrow</div>
                                            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                ₱{(summary.active_escrow ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>Total Earned</div>
                                            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                ₱{(summary.total_earned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Pending Releases</div>
                                            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                ₱{(summary.pending_releases ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Net after 5% platform fee</p>
                                        </div>
                                        <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>Platform Fees</div>
                                            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                ₱{(summary.platform_fees ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div>
                            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Transaction History</h3>
                            <div className={`overflow-x-auto rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                    <thead>
                                        <tr>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                Date
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                Type
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                Amount
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                Status
                                            </th>
                                            <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                                Project
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                                        {transactions?.map((transaction) => (
                                            <tr key={transaction.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                                    {formatDate(transaction.created_at ?? transaction.date)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        transaction.type === 'escrow' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-800') :
                                                        transaction.type === 'release' ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800') :
                                                        transaction.type === 'refund' ? (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800') :
                                                        isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {transaction.type ? (transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)) : '—'}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                                    ₱{(transaction.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        transaction.status === 'completed' ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800') :
                                                        transaction.status === 'pending' ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-800') :
                                                        (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800')
                                                    }`}>
                                                        {transaction.status ? (transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)) : '—'}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                                    {projectTitle(transaction)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
