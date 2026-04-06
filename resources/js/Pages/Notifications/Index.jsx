import React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AdminLayout from '@/Layouts/AdminLayout';

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

export default function Index({ notifications, unreadCount }) {
    const { auth } = usePage().props;
    const isAdmin = Boolean(auth?.user?.is_admin);
    const Layout = isAdmin ? AdminLayout : AuthenticatedLayout;

    const items = notifications?.data ?? [];
    const meta = notifications ?? {};

    const patchJson = async (url, method = 'PATCH') => {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        return res;
    };

    const markRead = async (id) => {
        await patchJson(`/notifications/${id}/read`);
        router.reload({ only: ['notifications', 'unreadCount'] });
    };

    const markAllRead = async () => {
        await patchJson('/notifications/mark-all-read');
        router.reload({ only: ['notifications', 'unreadCount'] });
    };

    const remove = async (id) => {
        await patchJson(`/notifications/${id}`, 'DELETE');
        router.reload({ only: ['notifications', 'unreadCount'] });
    };

    return (
        <Layout>
            <Head title="Notifications" />

            <div className="max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Notifications</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={markAllRead}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-600 dark:text-slate-400">
                        No notifications yet.
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {items.map((n) => (
                            <li
                                key={n.id}
                                className={`rounded-xl border p-4 transition-colors ${
                                    n.is_read
                                        ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                                        : 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/20'
                                }`}
                            >
                                <div className="flex justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-slate-900 dark:text-slate-100">{n.title || 'Notification'}</p>
                                        {n.message && (
                                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{n.message}</p>
                                        )}
                                        <p className="mt-2 text-xs text-slate-500">
                                            {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                        </p>
                                        {n.action_url && (
                                            <a
                                                href={n.action_url}
                                                className="mt-2 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                                            >
                                                Open link
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                        {!n.is_read && (
                                            <button
                                                type="button"
                                                onClick={() => markRead(n.id)}
                                                className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                                            >
                                                Mark read
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => remove(n.id)}
                                            className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {meta.last_page > 1 && (
                    <div className="mt-6 flex justify-center gap-2 flex-wrap">
                        {meta.links?.map((link, i) =>
                            link.url ? (
                                <Link
                                    key={i}
                                    href={link.url}
                                    className={`px-3 py-1 rounded text-sm ${
                                        link.active
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span
                                    key={i}
                                    className="px-3 py-1 rounded text-sm text-slate-400"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            )
                        )}
                    </div>
                )}

                {isAdmin && (
                    <p className="mt-8 text-center">
                        <Link href="/admin" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                            Back to admin dashboard
                        </Link>
                    </p>
                )}
            </div>
        </Layout>
    );
}
