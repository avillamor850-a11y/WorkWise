import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDistanceToNow } from 'date-fns';

export default function ReportsIndex({ reports = { data: [] } }) {
    const { auth } = usePage().props;

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            investigating: 'bg-blue-100 text-blue-800',
            resolved: 'bg-green-100 text-green-800',
            dismissed: 'bg-gray-100 text-gray-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: '⏳',
            investigating: '🔍',
            resolved: '✅',
            dismissed: '❌'
        };
        return icons[status] || '📋';
    };

    const getReportTypeIcon = (type) => {
        const icons = {
            fraud: '🚨',
            spam: '📧',
            inappropriate: '⚠️',
            scam: '',
            fake_profile: '👤',
            other: '📝'
        };
        return icons[type] || '📝';
    };

    const getReportTypeLabel = (type) => {
        const labels = {
            fraud: 'Fraudulent Activity',
            spam: 'Spam/Unwanted Messages',
            inappropriate: 'Inappropriate Behavior',
            scam: 'Scam Attempt',
            fake_profile: 'Fake Profile',
            other: 'Other Violation'
        };
        return labels[type] || type;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        My Reports
                    </h2>
                    <div className="text-sm text-gray-600">
                        {reports?.data?.length || 0} report{(reports?.data?.length || 0) !== 1 ? 's' : ''}
                    </div>
                </div>
            }
        >
            <Head title="My Reports" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="relative py-12 bg-white overflow-hidden">
                {/* Animated Background Shapes */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Safety Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-8 mb-8 shadow-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-blue-400 text-xl">🛡️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Your Safety is Our Priority
                                </h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <p>We take all reports seriously and investigate them thoroughly. Your reports help keep the WorkWise community safe for everyone.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Reports Section */}
                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200 mb-8">
                        <div className="p-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="text-2xl">💰</div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Transaction Reports
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            View and download your financial transaction history
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href="/reports/transactions"
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    View Transactions
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Employer only: Project Budget Utilization */}
                    {auth?.user?.user_type === 'employer' && (
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200 mb-8">
                            <div className="p-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-2xl">📊</div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Project Budget Utilization
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Compare job budget to actual release amounts; track over/under across gigs
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/reports/budget-utilization"
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        View Report
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Employer only: VAT/Tax Invoices */}
                    {auth?.user?.user_type === 'employer' && (
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200 mb-8">
                            <div className="p-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-2xl">📄</div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                VAT/Tax Invoices (PDF)
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Formal invoice for release transactions for business accounting (Philippines)
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/reports/vat-invoices"
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        View Invoices
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gig worker only: Earnings Transparency */}
                    {auth?.user?.user_type === 'gig_worker' && (
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200 mb-8">
                            <div className="p-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-2xl">📊</div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Earnings Transparency (Gross vs. Net)
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                See what the client paid vs. what you received after platform fee
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/reports/earnings-transparency"
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        View Report
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gig worker only: Pending / Accrued Income */}
                    {auth?.user?.user_type === 'gig_worker' && (
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200 mb-8">
                            <div className="p-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-2xl">⏳</div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Pending / Accrued Income
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Money in the pipeline — not yet withdrawable
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/reports/pending-accrued-income"
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                                    >
                                        View Report
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {!reports?.data?.length ? (
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-16 text-center">
                                <div className="text-6xl mb-4">🛡️</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No reports submitted
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    If you encounter any suspicious behavior or violations, don't hesitate to report them.
                                </p>
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-100 shadow-md">
                                        <h4 className="font-medium text-gray-900 mb-2">When to report:</h4>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            <li>• Fraudulent or scam activities</li>
                                            <li>• Inappropriate messages or behavior</li>
                                            <li>• Fake profiles or misleading information</li>
                                            <li>• Spam or unwanted communications</li>
                                            <li>• Any violation of platform terms</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {reports.data.map((report) => (
                                <div key={report.id} className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                                    <div className="p-8">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-3">
                                                    <span className="text-2xl">{getReportTypeIcon(report.type)}</span>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                            {getReportTypeLabel(report.type)}
                                                        </h3>
                                                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                            <span>
                                                                Reported: 
                                                                <span className="font-medium ml-1">
                                                                    {report.reported_user.first_name} {report.reported_user.last_name}
                                                                </span>
                                                            </span>
                                                            <span>•</span>
                                                            <span>Submitted {formatDistanceToNow(new Date(report.created_at))} ago</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <p className="text-gray-700 line-clamp-3">
                                                        {report.description}
                                                    </p>
                                                </div>

                                                {report.project && (
                                                    <div className="mb-4 bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-100">
                                                        <div className="text-sm text-gray-600">Related Project:</div>
                                                        <div className="font-medium text-gray-900">
                                                            {report.project.job.title}
                                                        </div>
                                                    </div>
                                                )}

                                                {report.evidence && report.evidence.length > 0 && (
                                                    <div className="mb-4">
                                                        <div className="text-sm text-gray-600 mb-2">Evidence Provided:</div>
                                                        <div className="space-y-1">
                                                            {report.evidence.map((evidence, index) => (
                                                                <div key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                                                                    <span className="text-blue-500">📎</span>
                                                                    <span>{evidence}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold shadow-md ${getStatusBadge(report.status)}`}>
                                                            {getStatusIcon(report.status)} {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                                        </span>
                                                        {report.resolved_at && (
                                                            <span className="text-xs text-gray-500">
                                                                Resolved {formatDistanceToNow(new Date(report.resolved_at))} ago
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Link
                                                            href={`/reports/${report.id}`}
                                                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-lg text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        >
                                                            View Details
                                                        </Link>
                                                    </div>
                                                </div>

                                                {report.admin_notes && (
                                                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                                                        <div className="text-sm font-medium text-blue-800 mb-1">Admin Response:</div>
                                                        <div className="text-sm text-blue-700">{report.admin_notes}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {reports?.links && reports.links.length > 3 && (
                                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        {reports.prev_page_url && (
                                            <Link
                                                href={reports.prev_page_url}
                                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                Previous
                                            </Link>
                                        )}
                                        {reports.next_page_url && (
                                            <Link
                                                href={reports.next_page_url}
                                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                Next
                                            </Link>
                                        )}
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{reports.from}</span> to{' '}
                                                <span className="font-medium">{reports.to}</span> of{' '}
                                                <span className="font-medium">{reports.total}</span> results
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                                {reports.links.map((link, index) => (
                                                    <Link
                                                        key={index}
                                                        href={link.url || '#'}
                                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                            link.active
                                                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        } ${index === 0 ? 'rounded-l-md' : ''} ${
                                                            index === reports.links.length - 1 ? 'rounded-r-md' : ''
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

                    {/* Report Guidelines */}
                    <div className="mt-8 bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                        <div className="p-8">
                            <h3 className="text-lg font-semibold mb-4">📋 Reporting Guidelines</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-3">What happens after you report:</h4>
                                    <ol className="text-sm text-gray-600 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">1.</span>
                                            <span>Your report is immediately flagged for review</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">2.</span>
                                            <span>Our team investigates the reported behavior</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">3.</span>
                                            <span>Appropriate action is taken if violations are found</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">4.</span>
                                            <span>You receive an update on the resolution</span>
                                        </li>
                                    </ol>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-3">Tips for effective reporting:</h4>
                                    <ul className="text-sm text-gray-600 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span>Provide specific details about the incident</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span>Include screenshots or evidence when possible</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span>Report as soon as possible after the incident</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span>Be honest and accurate in your description</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                body {
                    background: white;
                    color: #333;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
