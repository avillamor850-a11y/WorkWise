import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function AdminDepositsIndex({ deposits, stats, filters }) {
    const [status, setStatus] = useState(filters?.status || '');
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');

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

    const applyFilters = () => {
        router.get('/admin/deposits', {
            status: status || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true });
    };

    const list = deposits?.data ?? [];

    return (
        <AdminLayout>
            <Head title="Admin - User Added Funds (Deposits)" />
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">User Added Funds (Deposits)</h1>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                    Employer wallet top-ups that land in the platform Stripe account
                </p>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Total Completed</p>
                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(stats?.total_completed)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{stats?.count_completed ?? 0} deposits</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Total Pending</p>
                        <span className="material-symbols-outlined text-amber-500">schedule</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(stats?.total_pending)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{stats?.count_pending ?? 0} deposits</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">Total Failed</p>
                        <span className="material-symbols-outlined text-red-500">cancel</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(stats?.total_failed)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{stats?.count_failed ?? 0} deposits</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">All time deposited</p>
                        <span className="material-symbols-outlined text-indigo-500">account_balance_wallet</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency((stats?.total_completed ?? 0) + (stats?.total_pending ?? 0))}
                    </p>
                </div>
            </div>

            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Filters</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        >
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">From date</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">To date</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={applyFilters}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        <span className="material-symbols-outlined text-sm">filter_list</span>
                        Apply
                    </button>
                    <Link
                        href="/admin/deposits"
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                        Clear
                    </Link>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="border-b border-slate-200 p-6 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Deposits</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Employer add-funds (wallet top-ups) stored in platform Stripe account
                    </p>
                </div>
                <div className="overflow-x-auto">
                    {list.length > 0 ? (
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Stripe PI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                                {list.map((deposit) => (
                                    <tr key={deposit.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                                            {formatDate(deposit.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-medium text-slate-900 dark:text-slate-100">
                                                {deposit.user ? `${deposit.user.first_name} ${deposit.user.last_name}` : 'N/A'}
                                            </div>
                                            <div className="text-slate-500 dark:text-slate-400">{deposit.user?.email ?? '—'}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {formatCurrency(deposit.amount)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                                deposit.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' :
                                                deposit.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400' :
                                                'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                                            }`}>
                                                {deposit.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-slate-500 dark:text-slate-400">
                                            {deposit.stripe_payment_intent_id ? deposit.stripe_payment_intent_id.slice(-12) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <span className="material-symbols-outlined text-4xl text-slate-400">account_balance_wallet</span>
                            <p className="mt-2 text-slate-500 dark:text-slate-400">No deposits found</p>
                        </div>
                    )}
                </div>
                {deposits?.links && deposits.links.length > 3 && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Showing {deposits.from ?? 0} to {deposits.to ?? 0} of {deposits.total ?? 0}
                        </div>
                        <div className="flex gap-2">
                            {deposits.links.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={`px-3 py-1 rounded text-sm ${link.active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'} ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!link.url}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6">
                <Link
                    href="/admin/payments"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Back to Payments
                </Link>
            </div>
        </AdminLayout>
    );
}
