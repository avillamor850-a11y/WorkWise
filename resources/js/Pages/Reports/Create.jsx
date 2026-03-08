import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CreateReport({ reportedUser, project, reportTypes }) {
    const [evidenceItems, setEvidenceItems] = useState(['']);

    const { data, setData, post, processing, errors, reset } = useForm({
        reported_user_id: reportedUser.id,
        project_id: project?.id || null,
        type: '',
        description: '',
        evidence: []
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Filter out empty evidence items
        const filteredEvidence = evidenceItems.filter(item => item.trim() !== '');
        setData('evidence', filteredEvidence);

        post('/reports', {
            onSuccess: () => {
                reset();
                setEvidenceItems(['']);
            }
        });
    };

    const addEvidenceItem = () => {
        setEvidenceItems([...evidenceItems, '']);
    };

    const removeEvidenceItem = (index) => {
        const newItems = evidenceItems.filter((_, i) => i !== index);
        setEvidenceItems(newItems);
    };

    const updateEvidenceItem = (index, value) => {
        const newItems = [...evidenceItems];
        newItems[index] = value;
        setEvidenceItems(newItems);
    };

    const getUserAvatar = (user) => {
        // Check for Cloudinary profile picture first
        if (user.profile_picture) {
            return (
                <img
                    src={user.profile_picture}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="h-16 w-16 rounded-full object-cover"
                />
            );
        }

        // Fallback to legacy profile photo
        if (user.profile_photo) {
            return (
                <img
                    src={`/storage/${user.profile_photo}`}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="h-16 w-16 rounded-full object-cover"
                />
            );
        }

        const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        const colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'
        ];
        const colorIndex = user.id % colors.length;

        return (
            <div className={`h-16 w-16 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white text-xl font-semibold`}>
                {initials}
            </div>
        );
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

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        Report User
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Help us keep the WorkWise community safe by reporting violations
                    </p>
                </div>
            }
        >
            <Head title="Report User" />

            <div className="py-12">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                    {/* Warning Notice */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-yellow-400 text-xl">⚠️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">
                                    Important: False Reports
                                </h3>
                                <div className="mt-2 text-sm text-yellow-700">
                                    <p>Please only submit reports for genuine violations. False or malicious reports may result in action against your account.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            {/* User Being Reported */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold mb-4">User Being Reported</h3>
                                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                    <div className="flex-shrink-0">
                                        {getUserAvatar(reportedUser)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-semibold text-gray-900">
                                            {reportedUser.first_name} {reportedUser.last_name}
                                        </h4>
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${reportedUser.user_type === 'employer'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-green-100 text-green-800'
                                                }`}>
                                                {reportedUser.user_type === 'employer' ? '👤 Employer' : '💼 Gig Worker'}
                                            </span>
                                            {reportedUser.professional_title && (
                                                <>
                                                    <span>•</span>
                                                    <span>{reportedUser.professional_title}</span>
                                                </>
                                            )}
                                        </div>
                                        {reportedUser.bio && (
                                            <p className="mt-2 text-sm text-gray-700 line-clamp-2 break-all">
                                                {reportedUser.bio}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Project Context */}
                            {project && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold mb-4">Related Project</h3>
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h4 className="font-medium text-blue-900">{project.job.title}</h4>
                                        <p className="text-sm text-blue-700 mt-1">
                                            This report is related to your project with this user.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Report Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Report Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        What type of violation are you reporting? *
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {Object.entries(reportTypes).map(([type, description]) => (
                                            <label key={type} className="relative">
                                                <input
                                                    type="radio"
                                                    name="type"
                                                    value={type}
                                                    checked={data.type === type}
                                                    onChange={(e) => setData('type', e.target.value)}
                                                    className="sr-only"
                                                />
                                                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${data.type === type
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-2xl">{getReportTypeIcon(type)}</span>
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {description.split(' - ')[0]}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                {description.split(' - ')[1] || description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.type && (
                                        <p className="mt-2 text-sm text-red-600">{errors.type}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                        Detailed Description *
                                    </label>
                                    <textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={6}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Please provide a detailed description of what happened. Include dates, times, and specific examples if possible..."
                                        required
                                    />
                                    <p className="mt-2 text-sm text-gray-500">
                                        Minimum 20 characters. Be specific and factual.
                                    </p>
                                    {errors.description && (
                                        <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                                    )}
                                </div>

                                {/* Evidence */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Evidence (Optional)
                                    </label>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Provide any evidence that supports your report (e.g., "Screenshot of inappropriate message", "Link to fraudulent listing").
                                    </p>

                                    <div className="space-y-3">
                                        {evidenceItems.map((item, index) => (
                                            <div key={index} className="flex items-center space-x-3">
                                                <input
                                                    type="text"
                                                    value={item}
                                                    onChange={(e) => updateEvidenceItem(index, e.target.value)}
                                                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Describe evidence item..."
                                                />
                                                {evidenceItems.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEvidenceItem(index)}
                                                        className="p-2 text-red-600 hover:text-red-800"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addEvidenceItem}
                                        className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add Evidence Item
                                    </button>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                                    <Link
                                        href="/reports"
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing || !data.type || !data.description}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? (
                                            <div className="flex items-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Submitting Report...
                                            </div>
                                        ) : (
                                            'Submit Report'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Privacy Notice */}
                    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Privacy & Confidentiality</h3>
                        <div className="text-sm text-gray-600 space-y-2">
                            <p>• Your report will be kept confidential and only shared with our moderation team.</p>
                            <p>• The reported user will not be notified of who submitted the report.</p>
                            <p>• We may contact you for additional information if needed.</p>
                            <p>• All reports are reviewed within 24-48 hours.</p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
