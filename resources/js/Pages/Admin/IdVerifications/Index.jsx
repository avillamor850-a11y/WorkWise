import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

export default function Index({ verifications = { data: [], links: [] }, stats = {}, filters = {} }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [status, setStatus] = useState(filters?.status || '');
    const [idType, setIdType] = useState(filters?.id_type || '');
    const [fromDate, setFromDate] = useState(filters?.from_date || '');
    const [toDate, setToDate] = useState(filters?.to_date || '');
    
    // Bulk operations state
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkAction, setBulkAction] = useState(null);
    const [bulkReason, setBulkReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Step 5: Verify Ziggy routes are available
    useEffect(() => {
        console.log('Available routes:', window.route ? 'Route helper available' : 'Route helper NOT available');
        console.log('Verifications data:', verifications);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('admin.id-verifications.index'), {
            search: search,
            status: status,
            id_type: idType,
            from_date: fromDate,
            to_date: toDate,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatus('');
        setIdType('');
        setFromDate('');
        setToDate('');
        router.get(route('admin.id-verifications.index'), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleStatusChange = (newStatus) => {
        setStatus(newStatus);
        router.get(route('admin.id-verifications.index'), {
            search: search,
            status: newStatus,
            id_type: idType,
            from_date: fromDate,
            to_date: toDate,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Bulk selection handlers
    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        setSelectAll(isChecked);
        if (isChecked) {
            const allIds = verifications.data.map(v => v.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) 
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    // Bulk operations
    const performBulkAction = async () => {
        if (selectedIds.length === 0) return;

        setIsProcessing(true);
        
        try {
            const endpoint = {
                approve: '/admin/id-verifications/bulk-approve',
                reject: '/admin/id-verifications/bulk-reject',
                resubmit: '/admin/id-verifications/bulk-request-resubmit'
            }[bulkAction];

            const payload = {
                user_ids: selectedIds,
                ...(bulkAction !== 'approve' && { reason: bulkReason })
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setShowBulkModal(false);
                setBulkReason('');
                setSelectedIds([]);
                setSelectAll(false);
                // Refresh the page
                router.reload();
            } else {
                console.error('Bulk action failed:', response.statusText);
            }
        } catch (error) {
            console.error('Error performing bulk action:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExportCsv = () => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (idType) params.append('id_type', idType);
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
        
        window.location.href = `/admin/id-verifications/export-csv?${params.toString()}`;
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            verified: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };
        const labels = {
            pending: 'Pending',
            verified: 'Verified',
            rejected: 'Rejected',
        };

        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
                {labels[status]}
            </span>
        );
    };

    const getIdTypeLabel = (idType) => {
        const labels = {
            'national_id': 'National ID',
            'drivers_license': "Driver's License",
            'passport': 'Passport',
            'philhealth_id': 'PhilHealth',
            'sss_id': 'SSS',
            'umid': 'UMID',
            'voters_id': "Voter's ID",
            'prc_id': 'PRC',
        };
        return labels[idType] || idType;
    };

    return (
        <AdminLayout>
            <Head title="ID Verifications" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">ID Verifications</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Review and verify gig worker identification documents
                        </p>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <div className="text-sm font-medium text-gray-500 mb-2">Pending Review</div>
                            <div className="text-3xl font-bold text-yellow-600">{stats?.pending || 0}</div>
                        </div>
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <div className="text-sm font-medium text-gray-500 mb-2">Verified</div>
                            <div className="text-3xl font-bold text-green-600">{stats?.verified || 0}</div>
                        </div>
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <div className="text-sm font-medium text-gray-500 mb-2">Rejected</div>
                            <div className="text-3xl font-bold text-red-600">{stats?.rejected || 0}</div>
                        </div>
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <div className="text-sm font-medium text-gray-500 mb-2">Total Submissions</div>
                            <div className="text-3xl font-bold text-blue-600">{stats?.total || 0}</div>
                        </div>
                    </div>

                    {/* Bulk Action Toolbar */}
                    {selectedIds.length > 0 && (
                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-blue-900">
                                    {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setBulkAction('approve');
                                            setShowBulkModal(true);
                                        }}
                                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition"
                                    >
                                        ✓ Approve
                                    </button>
                                    <button
                                        onClick={() => {
                                            setBulkAction('reject');
                                            setShowBulkModal(true);
                                        }}
                                        className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition"
                                    >
                                        ✕ Reject
                                    </button>
                                    <button
                                        onClick={() => {
                                            setBulkAction('resubmit');
                                            setShowBulkModal(true);
                                        }}
                                        className="px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition"
                                    >
                                        ⟲ Request Resubmit
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds([])}
                                        className="px-3 py-2 bg-gray-300 text-gray-800 text-sm rounded-md hover:bg-gray-400 transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advanced Filters */}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6 mb-6">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Filters</h3>
                        </div>
                        <form onSubmit={handleSearch} className="space-y-4">
                            {/* Row 1: Search and Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by name or email..."
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border px-3 py-2"
                                    >
                                        <option value="">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="verified">Verified</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: ID Type and Date Range */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">ID Type</label>
                                    <select
                                        value={idType}
                                        onChange={(e) => setIdType(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border px-3 py-2"
                                    >
                                        <option value="">All Types</option>
                                        <option value="national_id">National ID</option>
                                        <option value="passport">Passport</option>
                                        <option value="drivers_license">Driver's License</option>
                                        <option value="sss_id">SSS</option>
                                        <option value="umid">UMID</option>
                                        <option value="voters_id">Voter's ID</option>
                                        <option value="prc_id">PRC</option>
                                        <option value="philhealth_id">PhilHealth</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border px-3 py-2"
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                                >
                                    Clear Filters
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportCsv}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                                >
                                    📥 Export CSV
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Table */}
                    <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectAll && verifications.data.length > 0}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Submitted
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {verifications.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            No ID verifications found
                                        </td>
                                    </tr>
                                ) : (
                                    verifications.data.map((user) => {
                                        const avatarRaw = user.profile_picture_url || user.profile_picture || user.profile_photo;
                                        const avatarSrc = avatarRaw ? (resolveProfileImageUrl(avatarRaw) || avatarRaw) : null;
                                        return (
                                        <tr key={user.id} className={`hover:bg-gray-50 ${selectedIds.includes(user.id) ? 'bg-blue-50' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(user.id)}
                                                    onChange={() => handleSelectRow(user.id)}
                                                    className="rounded border-gray-300"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {avatarSrc ? (
                                                            <img
                                                                className="h-10 w-10 rounded-full object-cover"
                                                                src={avatarSrc}
                                                                alt=""
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                                <span className="text-gray-500 font-medium">
                                                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.first_name} {user.last_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {getIdTypeLabel(user.id_type)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(user.id_verification_status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <Link
                                                    href={`/admin/id-verifications/${user.id}`}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Review
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {verifications?.links && verifications.links.length > 3 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    {verifications.prev_page_url && (
                                        <Link
                                            href={verifications.prev_page_url}
                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            Previous
                                        </Link>
                                    )}
                                    {verifications.next_page_url && (
                                        <Link
                                            href={verifications.next_page_url}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            Next
                                        </Link>
                                    )}
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{verifications.from}</span> to{' '}
                                            <span className="font-medium">{verifications.to}</span> of{' '}
                                            <span className="font-medium">{verifications.total}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                            {verifications.links.map((link, index) => (
                                                <Link
                                                    key={index}
                                                    href={link.url || '#'}
                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                        link.active
                                                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                    } ${index === 0 ? 'rounded-l-md' : ''} ${
                                                        index === verifications.links.length - 1 ? 'rounded-r-md' : ''
                                                    } ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                    preserveState
                                                    preserveScroll
                                                />
                                            ))}
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bulk Action Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {bulkAction === 'approve' && 'Approve Verifications'}
                            {bulkAction === 'reject' && 'Reject Verifications'}
                            {bulkAction === 'resubmit' && 'Request Resubmission'}
                        </h3>

                        {bulkAction !== 'approve' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Max 500 chars)</label>
                                <textarea
                                    value={bulkReason}
                                    onChange={(e) => setBulkReason(e.target.value.slice(0, 500))}
                                    placeholder="Enter reason for this action..."
                                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    rows="4"
                                />
                                <div className="text-xs text-gray-500 mt-1">{bulkReason.length}/500</div>
                            </div>
                        )}

                        <p className="text-sm text-gray-600 mb-6">
                            {bulkAction === 'approve' && `You are about to approve ${selectedIds.length} verification(s). This action cannot be undone.`}
                            {bulkAction === 'reject' && `You are about to reject ${selectedIds.length} verification(s). Users will be notified.`}
                            {bulkAction === 'resubmit' && `You are requesting resubmission from ${selectedIds.length} user(s). They will be notified.`}
                        </p>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setShowBulkModal(false);
                                    setBulkReason('');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={performBulkAction}
                                disabled={isProcessing || (bulkAction !== 'approve' && !bulkReason.trim())}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition"
                            >
                                {isProcessing ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}




