import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectsIndex({ projects }) {
    const { auth } = usePage().props;
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isEmployer = auth?.user?.user_type === 'employer';

    // Safely handle paginated or array response
    const projectList = Array.isArray(projects?.data) ? projects.data : (Array.isArray(projects) ? projects : []);
    const paginationMeta = projects && !Array.isArray(projects) ? projects : null;

    const getStatusBadge = (status) => {
        const badges = {
            active: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            disputed: 'bg-yellow-100 text-yellow-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusBadgeDark = (status) => {
        const badges = {
            active: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
            completed: 'bg-green-500/20 text-green-400 border border-green-500/30',
            cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
            disputed: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        };
        return badges[status] || 'bg-gray-700 text-gray-200 border border-gray-600';
    };

    const getStatusIcon = (status) => {
        const icons = {
            active: '🔄',
            completed: '✅',
            cancelled: '❌',
            disputed: '⚠️'
        };
        return icons[status] || '📋';
    };

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : undefined}
            header={
                <div className="flex justify-between items-center">
                    <h2 className={`font-semibold text-xl leading-tight tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        My Projects
                    </h2>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {projectList.length} project{projectList.length !== 1 ? 's' : ''}
                    </div>
                </div>
            }
        >
            <Head title="My Projects" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative min-h-screen py-12 overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                {isDark && (
                <>
                    <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
                </>
                )}
                {!isDark && (
                <>
                    <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
                </>
                )}

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {projectList.length === 0 ? (
                        <div className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden border border-gray-700 rounded-xl" : "bg-white overflow-hidden border border-gray-200 rounded-xl shadow-lg"}>
                            <div className="p-6 text-center">
                                <div className="text-6xl mb-4">📋</div>
                                <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    No projects yet
                                </h3>
                                <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {isEmployer
                                        ? "Start by posting a job to find talented gig workers."
                                        : "Browse available jobs and submit proposals to get started."
                                    }
                                </p>
                                <Link
                                    href={isEmployer ? "/jobs/create" : "/jobs"}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest transition ease-in-out duration-150"
                                >
                                    {isEmployer ? "Post a Job" : "Browse Jobs"}
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {projectList.map((project) => (
                                <div key={project.id} className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden border border-gray-700 rounded-xl" : "bg-white overflow-hidden border border-gray-200 rounded-xl shadow-lg"}>
                                    <div className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-3">
                                                    <span className="text-2xl">{getStatusIcon(project.status)}</span>
                                                    <div>
                                                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            <Link
                                                                href={`/projects/${project.id}`}
                                                                className={isDark ? "hover:text-blue-400 transition-colors" : "hover:text-blue-600 transition-colors"}
                                                            >
                                                                {project.job?.title ?? 'Untitled Project'}
                                                            </Link>
                                                        </h3>
                                                        <div className={`flex items-center space-x-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            <span>
                                                                {isEmployer ? 'Gig Worker:' : 'Employer:'}{' '}
                                                                {isEmployer ? (
                                                                    project.gig_worker ? (
                                                                        <Link
                                                                            href={route('gig-worker.profile.show', project.gig_worker.id)}
                                                                            className={isDark ? "text-blue-400 hover:text-blue-300 hover:underline font-medium ml-1" : "text-blue-600 hover:text-blue-700 hover:underline font-medium ml-1"}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            {project.gig_worker.first_name} {project.gig_worker.last_name}
                                                                        </Link>
                                                                    ) : (
                                                                        <span className="text-gray-500">—</span>
                                                                    )
                                                                ) : (
                                                                    project.employer ? (
                                                                        <Link
                                                                            href={route('employers.show', project.employer.id)}
                                                                            className={isDark ? "text-blue-400 hover:text-blue-300 hover:underline font-medium ml-1" : "text-blue-600 hover:text-blue-700 hover:underline font-medium ml-1"}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            {project.employer.first_name} {project.employer.last_name}
                                                                        </Link>
                                                                    ) : (
                                                                        <span className="text-gray-500">—</span>
                                                                    )
                                                                )}
                                                            </span>
                                                            <span>•</span>
                                                            <span>Started {formatDistanceToNow(new Date(project.started_at))} ago</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                    <div className={isDark ? "bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl" : "bg-blue-50 border border-blue-200 p-4 rounded-xl"}>
                                                        <div className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Project Value</div>
                                                        <div className={isDark ? "text-lg font-semibold text-green-400" : "text-lg font-semibold text-green-600"}>
                                                            ₱{project.agreed_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                    <div className={isDark ? "bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl" : "bg-blue-50 border border-blue-200 p-4 rounded-xl"}>
                                                        <div className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Duration</div>
                                                        <div className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                            {project.agreed_duration_days} days
                                                        </div>
                                                    </div>
                                                    <div className={isDark ? "bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl" : "bg-blue-50 border border-blue-200 p-4 rounded-xl"}>
                                                        <div className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Deadline</div>
                                                        <div className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                            {project.deadline
                                                                ? new Date(project.deadline).toLocaleDateString()
                                                                : 'Not set'
                                                            }
                                                        </div>
                                                    </div>
                                                </div>

                                                {project.job?.description && (
                                                    <p className={`mb-4 line-clamp-2 break-all ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        {project.job.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold ${isDark ? getStatusBadgeDark(project.status) : getStatusBadge(project.status)}`}>
                                                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                                        </span>
                                                        {project.payment_released && (
                                                            <span className={isDark ? "inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold bg-green-500/20 text-green-400 border border-green-500/30" : "inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold bg-green-100 text-green-800 border border-green-200"}>
                                                                Payment Released
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center flex-wrap gap-2">
                                                        {project.transactions && project.transactions.length > 0 && (
                                                            <Link
                                                                href="/payment/history"
                                                                className={isDark ? "text-sm text-blue-400 hover:text-blue-300" : "text-sm text-blue-600 hover:text-blue-700"}
                                                            >
                                                                💳 View Payments
                                                            </Link>
                                                        )}
                                                        {project.contract_id ? (
                                                            <Link
                                                                href={route('contracts.show', project.contract_id)}
                                                                className={isDark ? "inline-flex items-center px-4 py-2 border border-indigo-500/40 text-sm font-medium rounded-xl text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all duration-300" : "inline-flex items-center px-4 py-2 border border-indigo-200 text-sm font-medium rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all duration-300"}
                                                            >
                                                                View contract
                                                            </Link>
                                                        ) : null}
                                                        <Link
                                                            href={`/projects/${project.id}`}
                                                            className={isDark ? "inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-xl text-gray-100 bg-gray-800 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all duration-300" : "inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all duration-300"}
                                                        >
                                                            View Details
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {paginationMeta?.links && paginationMeta.links.length > 3 && (
                                <div className={isDark ? "bg-gray-800 border border-gray-700 px-4 py-3 flex items-center justify-between sm:px-6 rounded-xl" : "bg-white border border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6 rounded-xl shadow-lg"}>
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        {paginationMeta.prev_page_url && (
                                            <Link
                                                href={paginationMeta.prev_page_url}
                                                className={isDark ? "relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-100 bg-gray-800 hover:bg-blue-500/20" : "relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"}
                                            >
                                                Previous
                                            </Link>
                                        )}
                                        {paginationMeta.next_page_url && (
                                            <Link
                                                href={paginationMeta.next_page_url}
                                                className={isDark ? "ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-100 bg-gray-800 hover:bg-blue-500/20" : "ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"}
                                            >
                                                Next
                                            </Link>
                                        )}
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                                                Showing <span className={isDark ? "font-medium text-white" : "font-medium text-gray-900"}>{paginationMeta.from}</span> to{' '}
                                                <span className={isDark ? "font-medium text-white" : "font-medium text-gray-900"}>{paginationMeta.to}</span> of{' '}
                                                <span className={isDark ? "font-medium text-white" : "font-medium text-gray-900"}>{paginationMeta.total}</span> results
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md -space-x-px">
                                                {paginationMeta.links.map((link, index) => (
                                                    <Link
                                                        key={index}
                                                        href={link.url || '#'}
                                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                            link.active
                                                                ? 'z-10 bg-blue-600 border-blue-500/50 text-white'
                                                                : isDark ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-blue-500/20 hover:text-gray-100' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                                        } ${index === 0 ? 'rounded-l-md' : ''} ${
                                                            index === paginationMeta.links.length - 1 ? 'rounded-r-md' : ''
                                                        }`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                ))}
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isDark && (
            <style>{`
                body {
                    background: #111827;
                    color: #e5e7eb;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
            )}
        </AuthenticatedLayout>
    );
}
