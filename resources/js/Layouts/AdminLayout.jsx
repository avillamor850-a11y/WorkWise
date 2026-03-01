import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import CsrfSync from '@/Components/CsrfSync';


export default function AdminLayout({ children, header }) {
    const { url } = usePage();
    const { auth } = usePage().props;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Function to check if current path matches navigation item
    const isCurrentPage = (href) => {
        if (!url) return false;

        // Handle exact match for admin dashboard
        if (href === '/admin') {
            return url === '/admin' || url === '/admin/' || url.startsWith('/admin/dashboard');
        }

        // Handle nested routes for other items
        return url.startsWith(href);
    };

    const navigation = [
        { id: 'dashboard', name: 'Dashboard', href: '/admin', icon: 'dashboard', current: isCurrentPage('/admin') },
        { id: 'fraud-detection', name: 'Fraud Detection', href: '/admin/fraud', icon: 'shield', current: isCurrentPage('/admin/fraud') },
        { id: 'id-verifications', name: 'ID Verifications', href: '/admin/id-verifications', icon: 'badge', current: isCurrentPage('/admin/id-verifications') },
        { id: 'employer-verifications', name: 'Business Verifications', href: '/admin/employers/verifications', icon: 'domain_verification', current: isCurrentPage('/admin/employers/verifications') },
        { id: 'users', name: 'User Directory', href: '/admin/users', icon: 'group', current: isCurrentPage('/admin/users') },
        { id: 'payments', name: 'Payments', href: '/admin/payments', icon: 'payments', current: isCurrentPage('/admin/payments') },
        { id: 'deposits', name: 'User Added Funds', href: '/admin/deposits', icon: 'account_balance_wallet', current: isCurrentPage('/admin/deposits') },
        { id: 'reports-transactions', name: 'Transaction Reports', href: '/admin/reports/transactions', icon: 'receipt_long', current: isCurrentPage('/admin/reports/transactions') },
        { id: 'reports', name: 'Escrow / Reports', href: '/admin/reports', icon: 'flag', current: isCurrentPage('/admin/reports') && !url?.startsWith('/admin/reports/transactions') },
    ];

    // Fallback navigation when url is not available
    const fallbackNavigation = [
        { id: 'dashboard-fallback', name: 'Dashboard', href: '/admin', icon: 'dashboard', current: true },
        { id: 'id-verifications-fallback', name: 'ID Verifications', href: '/admin/id-verifications', icon: 'badge', current: false },
        { id: 'employer-verifications-fallback', name: 'Business Verifications', href: '/admin/employers/verifications', icon: 'domain_verification', current: false },
        { id: 'users-fallback', name: 'User Directory', href: '/admin/users', icon: 'group', current: false },
        { id: 'payments-fallback', name: 'Payments', href: '/admin/payments', icon: 'payments', current: false },
        { id: 'deposits-fallback', name: 'User Added Funds', href: '/admin/deposits', icon: 'account_balance_wallet', current: false },
        { id: 'reports-transactions-fallback', name: 'Transaction Reports', href: '/admin/reports/transactions', icon: 'receipt_long', current: false },
        { id: 'reports-fallback', name: 'Escrow / Reports', href: '/admin/reports', icon: 'flag', current: false },
    ];

    const bottomNavigation = [
        { id: 'settings', name: 'Settings', href: '/admin/settings', icon: 'settings', current: isCurrentPage('/admin/settings') },
    ];

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
            <CsrfSync />
            <div className="flex h-full grow flex-row">

                {/* Collapsible Sidebar */}
                <aside className={`flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/80 p-4 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
                    }`} id="sidebar">
                    <div className="flex items-center justify-between">
                        <h1 className={`text-xl font-bold text-indigo-600 dark:text-slate-100 transition-all duration-300 ${isSidebarCollapsed ? 'nav-text-collapsed' : 'nav-text-expanded'
                            }`} id="sidebar-title">WorkWise</h1>
                        <button
                            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                            id="sidebar-toggle"
                            onClick={toggleSidebar}
                        >
                            <span className="material-symbols-outlined text-3xl text-indigo-600 transition-transform duration-300" id="sidebar-icon">
                                {isSidebarCollapsed ? 'menu' : 'menu_open'}
                            </span>
                        </button>
                    </div>

                    <nav className="mt-8 flex flex-col gap-2">
                        {(url ? navigation : fallbackNavigation).map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-slate-500 transition-all duration-300 hover:bg-indigo-100 hover:text-indigo-600 hover:shadow-sm dark:text-slate-400 dark:hover:bg-indigo-900/20 ${item.current ? 'bg-indigo-100 text-indigo-600 shadow-sm dark:bg-indigo-900/20' : ''
                                    }`}
                            >
                                <span className={`material-symbols-outlined transition-all duration-300 group-hover:scale-110 ${item.current ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'
                                    }`}>{item.icon}</span>
                                <p className={`text-sm font-medium transition-all duration-300 ${isSidebarCollapsed ? 'nav-text-collapsed' : 'nav-text-expanded'
                                    }`}>{item.name}</p>
                                {item.current && (
                                    <div className="ml-auto h-2 w-2 rounded-full bg-indigo-600"></div>
                                )}
                            </Link>
                        ))}
                    </nav>

                    <div className="mt-auto flex flex-col gap-1">
                        {(url ? bottomNavigation : [{ id: 'settings-fallback', name: 'Settings', href: '/admin/settings', icon: 'settings', current: false }]).map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-slate-500 transition-all duration-300 hover:bg-indigo-100 hover:text-indigo-600 hover:shadow-sm dark:text-slate-400 dark:hover:bg-indigo-900/20 ${item.current ? 'bg-indigo-100 text-indigo-600 shadow-sm dark:bg-indigo-900/20' : ''
                                    }`}
                            >
                                <span className={`material-symbols-outlined transition-all duration-300 group-hover:scale-110 ${item.current ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'
                                    }`}>{item.icon}</span>
                                <p className={`text-sm font-medium transition-all duration-300 ${isSidebarCollapsed ? 'nav-text-collapsed' : 'nav-text-expanded'
                                    }`}>{item.name}</p>
                                {item.current && (
                                    <div className="ml-auto h-2 w-2 rounded-full bg-indigo-600"></div>
                                )}
                            </Link>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 bg-slate-50 dark:bg-slate-900 transition-all duration-300">
                    <div className="p-4 sm:p-8">
                        {/* Enhanced Header */}
                        <header className="mb-8">
                            {/* Top Header Bar */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                            <span className="material-symbols-outlined text-white text-xl">admin_panel_settings</span>
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">Welcome back, {auth?.user?.name || 'Administrator'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Quick Actions */}
                                    <div className="hidden md:flex items-center gap-2">
                                        <Link
                                            href="/admin/users"
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20"
                                        >
                                            <span className="material-symbols-outlined text-base">group</span>
                                            Users
                                        </Link>
                                        <Link
                                            href="/admin/reports"
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20"
                                        >
                                            <span className="material-symbols-outlined text-base">flag</span>
                                            Reports
                                        </Link>
                                    </div>

                                    {/* Notifications */}
                                    <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                                        <span className="material-symbols-outlined">notifications</span>
                                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                    </button>

                                    {/* User Menu */}
                                    <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
                                        <div className="hidden sm:block text-right">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{auth?.user?.name || 'Administrator'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">System Administrator</p>
                                        </div>
                                        <img
                                            alt="Admin Avatar"
                                            className="h-10 w-10 rounded-full ring-2 ring-indigo-100 dark:ring-indigo-900/20"
                                            src={auth?.user?.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(auth?.user?.name || 'Admin') + "&background=6366f1&color=fff"}
                                        />
                                        <Link
                                            href="/admin/admin/logout"
                                            method="post"
                                            as="button"
                                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                        >
                                            <span className="material-symbols-outlined text-base">logout</span>
                                            <span className="hidden sm:inline">Logout</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Breadcrumb and Page Actions */}
                            <div className="flex items-center justify-between">
                                <nav className="flex items-center space-x-2 text-sm">
                                    <Link href="/admin" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
                                        Admin
                                    </Link>
                                    <span className="text-slate-400 dark:text-slate-600">/</span>
                                    <span className="text-slate-900 font-medium dark:text-slate-100">Dashboard</span>
                                </nav>

                                <div className="flex items-center gap-2">
                                    <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-slate-200 transition-colors dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 dark:border-slate-700">
                                        <span className="material-symbols-outlined text-base">refresh</span>
                                        Refresh
                                    </button>
                                    <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-base">download</span>
                                        Export
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Page Content */}
                        {children}
                    </div>
                </main>
            </div>

            <style jsx="true">{`
                .sidebar-expanded {
                    width: 16rem;
                }
                .sidebar-collapsed {
                    width: 5rem;
                }
                .nav-text-expanded {
                    opacity: 1;
                    transition: opacity 0.3s ease-in-out;
                }
                .nav-text-collapsed {
                    opacity: 0;
                    width: 0;
                    overflow: hidden;
                    transition: opacity 0.2s ease-in-out, width 0s linear 0.2s;
                }
                .icon-hover {
                    transition: transform 0.3s ease-in-out;
                }
                .icon-hover:hover {
                    transform: scale(1.1) rotate(-6deg);
                }
            `}</style>
        </div>
    );
}