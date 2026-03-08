import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { format, parseISO, isValid } from 'date-fns';

export default function PaymentHistory({ transactions = [], summary = {} }) {
    const { auth } = usePage().props;
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
            pageTheme="dark"
            header={<h2 className="font-semibold text-xl text-gray-100 leading-tight">Payment History</h2>}
        >
            <Head title="Payment History" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="min-h-screen bg-gray-900 relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-20 py-12 max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-gray-800 border border-gray-700 overflow-hidden sm:rounded-xl p-8">
                        {/* Summary Section */}
                        <div className="mb-8">
                            <h3 className="text-lg font-medium text-gray-100 mb-4">Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {isEmployer ? (
                                    <>
                                        <div className="bg-gray-700 border border-gray-600 p-6 rounded-xl">
                                            <div className="text-sm text-blue-400 font-medium">Escrow Balance</div>
                                            <div className="text-2xl font-bold text-gray-100">
                                                ₱{(summary.escrow_balance ?? auth.user.escrow_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className="bg-gray-700 border border-gray-600 p-6 rounded-xl">
                                            <div className="text-sm text-blue-400 font-medium">Total Spent</div>
                                            <div className="text-2xl font-bold text-gray-100">
                                                ₱{(summary.total_spent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className="bg-gray-700 border border-gray-600 p-6 rounded-xl">
                                            <div className="text-sm text-blue-400 font-medium">Active Escrow</div>
                                            <div className="text-2xl font-bold text-gray-100">
                                                ₱{(summary.active_escrow ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-gray-700 border border-gray-600 p-6 rounded-xl">
                                            <div className="text-sm text-green-400 font-medium">Total Earned</div>
                                            <div className="text-2xl font-bold text-gray-100">
                                                ₱{(summary.total_earned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className="bg-gray-700 border border-gray-600 p-6 rounded-xl">
                                            <div className="text-sm text-amber-400 font-medium">Pending Releases</div>
                                            <div className="text-2xl font-bold text-gray-100">
                                                ₱{(summary.pending_releases ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Net after 5% platform fee</p>
                                        </div>
                                        <div className="bg-gray-700 border border-gray-600 p-6 rounded-xl">
                                            <div className="text-sm text-red-400 font-medium">Platform Fees</div>
                                            <div className="text-2xl font-bold text-gray-100">
                                                ₱{(summary.platform_fees ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-100 mb-4">Transaction History</h3>
                            <div className="overflow-x-auto rounded-lg border border-gray-700">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-3 bg-gray-800 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 bg-gray-800 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 bg-gray-800 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Amount
                                            </th>
                                            <th className="px-6 py-3 bg-gray-800 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 bg-gray-800 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Project
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                                        {transactions?.map((transaction) => (
                                            <tr key={transaction.id} className="hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                                                    {formatDate(transaction.created_at ?? transaction.date)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        transaction.type === 'escrow' ? 'bg-blue-500/20 text-blue-400' :
                                                        transaction.type === 'release' ? 'bg-green-500/20 text-green-400' :
                                                        transaction.type === 'refund' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-gray-700 text-gray-300'
                                                    }`}>
                                                        {transaction.type ? (transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 font-medium">
                                                    ₱{(transaction.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        transaction.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        transaction.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {transaction.status ? (transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
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

            <style>{`
                body {
                    background: #111827;
                    color: #e5e7eb;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
