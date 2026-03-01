import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Download, FileText, Filter, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

export default function BudgetUtilization({ auth, projects, summary, filters, user, error }) {
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [status, setStatus] = useState(filters?.status || '');

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
            day: 'numeric'
        });
    };

    const handleFilter = () => {
        router.get('/reports/budget-utilization', {
            date_from: dateFrom,
            date_to: dateTo,
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
            if (status) params.append('status', status);
            params.append('format', format);
            const exportUrl = `/reports/budget-utilization/export?${params.toString()}`;
            const w = window.open(exportUrl, '_blank');
            if (!w) alert('Please allow pop-ups for this site to download the report.');
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export report. Please try again.');
        }
    };

    const projectList = projects?.data ?? [];
    const summaryData = summary ?? {
        total_agreed: 0,
        total_released: 0,
        total_variance: 0,
        project_count: 0
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Link href="/reports" className="text-blue-600 hover:text-blue-800">
                            ← Back to Reports
                        </Link>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">
                            Project Budget Utilization
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
                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl shadow-lg transition-all duration-300 text-sm flex items-center"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Export Excel
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Project Budget Utilization" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="relative py-12 bg-white overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <DollarSign className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Total Agreed (Budget)</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(summaryData.total_agreed)}
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
                                            <TrendingUp className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Total Released</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(summaryData.total_released)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${summaryData.total_variance >= 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                                            <BarChart3 className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Total Variance</div>
                                        <div className={`text-2xl font-bold ${summaryData.total_variance >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                            {formatCurrency(summaryData.total_variance)}
                                            <span className="text-sm font-normal ml-1">
                                                ({summaryData.total_variance >= 0 ? 'Over' : 'Under'})
                                            </span>
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
                                            <BarChart3 className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Projects</div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {summaryData.project_count}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                        <div className="p-8">
                            <div className="flex items-center mb-4">
                                <Filter className="w-5 h-5 text-gray-500 mr-2" />
                                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                            </div>
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
                                <div>
                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Project Status</label>
                                    <select
                                        id="status"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 shadow-lg focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="active">Active</option>
                                        <option value="completed">Completed</option>
                                        <option value="pending_contract">Pending Contract</option>
                                        <option value="disputed">Disputed</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
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

                    <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200">
                        <div className="p-8">
                            <h3 className="text-lg font-medium text-gray-900 mb-6">Budget vs. Actual by Project</h3>
                            {projectList.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job / Gig</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Agreed (Budget)</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Released</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {projectList.map((row) => (
                                                <tr key={row.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.job_title}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-gray-900">{formatCurrency(row.agreed_amount)}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">{formatCurrency(row.total_released)}</td>
                                                    <td className={`px-6 py-4 text-sm text-right font-medium ${row.variance >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        {formatCurrency(row.variance)} {row.variance >= 0 ? '(Over)' : '(Under)'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                                                            {row.status?.replace('_', ' ') ?? '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(row.created_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
                                    <p className="mt-1 text-sm text-gray-500">No projects match your filters or you have no projects yet.</p>
                                </div>
                            )}

                            {projects?.links && projects.links.length > 3 && (
                                <div className="mt-6 flex justify-between items-center">
                                    <div className="text-sm text-gray-700">
                                        Showing {projects.from} to {projects.to} of {projects.total} results
                                    </div>
                                    <div className="flex space-x-1">
                                        {projects.links.map((link, index) => (
                                            <Link
                                                key={index}
                                                href={link.url || '#'}
                                                className={`px-3 py-2 text-sm rounded-md ${
                                                    link.active ? 'bg-blue-500 text-white' :
                                                    link.url ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50' :
                                                    'bg-gray-100 text-gray-400 cursor-not-allowed'
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

            <style>{`body { background: white; color: #333; font-family: 'Inter', sans-serif; }`}</style>
        </AuthenticatedLayout>
    );
}
