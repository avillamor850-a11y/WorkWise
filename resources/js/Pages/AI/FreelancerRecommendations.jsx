import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function FreelancerRecommendations({ recommendations, user }) {
    const [selectedJob, setSelectedJob] = useState(null);

    const getMatchScoreColor = (score) => {
        if (score >= 0.8) return 'text-green-600 bg-green-100';
        if (score >= 0.6) return 'text-blue-600 bg-blue-100';
        if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getMatchScoreText = (score) => {
        if (score >= 0.8) return 'Excellent Match';
        if (score >= 0.6) return 'Good Match';
        if (score >= 0.4) return 'Fair Match';
        return 'Poor Match';
    };

    const getCompetitionColor = (level) => {
        if (level.includes('No')) return 'text-green-600 bg-green-100';
        if (level.includes('Low')) return 'text-blue-600 bg-blue-100';
        if (level.includes('Medium')) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        AI Job Recommendations
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Personalized job matches based on your skills and preferences
                    </p>
                </div>
            }
        >
            <Head title="AI Job Recommendations" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* AI Insights Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl">🎯</span>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Total Matches</div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {recommendations.insights.total_matches}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl"></span>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Avg Match Score</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {Math.round(recommendations.insights.avg_match_score * 100)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl">⭐</span>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Your Rating</div>
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {user.average_rating ? user.average_rating.toFixed(1) : 'New'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <span className="text-2xl">💼</span>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-500">Completion Rate</div>
                                        <div className="text-2xl font-bold text-purple-600">
                                            {user.completion_rate ? Math.round(user.completion_rate) : 0}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recommended Jobs */}
                        <div className="lg:col-span-2">
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-6">🎯 Recommended Jobs for You</h3>

                                    {recommendations.recommended_jobs.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="text-6xl mb-4">🔍</div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                No matches found
                                            </h3>
                                            <p className="text-gray-600 mb-4">
                                                Try updating your skills or expanding your search criteria.
                                            </p>
                                            <Link
                                                href="/profile"
                                                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                                            >
                                                Update Profile
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {recommendations.recommended_jobs.map((recommendation, index) => (
                                                <div key={recommendation.job.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-3 mb-2">
                                                                <h4 className="text-lg font-semibold text-gray-900">
                                                                    <Link
                                                                        href={`/jobs/${recommendation.job.id}`}
                                                                        className="hover:text-blue-600 transition-colors"
                                                                    >
                                                                        {recommendation.job.title}
                                                                    </Link>
                                                                </h4>
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMatchScoreColor(recommendation.match_score)}`}>
                                                                    {Math.round(recommendation.match_score * 100)}% Match
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-600 mb-2">
                                                                Posted by: <span className="font-medium">
                                                                    {recommendation.job.employer?.name ||
                                                                        recommendation.job.employer?.full_name ||
                                                                        `${recommendation.job.employer?.first_name || ''} ${recommendation.job.employer?.last_name || ''}`.trim() ||
                                                                        'Employer'}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-600 mb-3 line-clamp-2">
                                                                {recommendation.job.description}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                        <div>
                                                            <div className="text-sm text-gray-500">Budget</div>
                                                            <div className="font-semibold text-green-600">
                                                                ₱{recommendation.job.budget_min || 0} - ₱{recommendation.job.budget_max || 0}
                                                                {recommendation.job.budget_type && (
                                                                    <span className="text-xs text-gray-500 ml-1">({recommendation.job.budget_type})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-500">Duration</div>
                                                            <div className="font-semibold">
                                                                {recommendation.job.estimated_duration_days} days
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-500">Experience</div>
                                                            <div className="font-semibold capitalize">
                                                                {recommendation.job.experience_level}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-gray-500">Competition</div>
                                                            <div className={`text-xs font-medium px-2 py-1 rounded ${getCompetitionColor(recommendation.competition_level)}`}>
                                                                {recommendation.competition_level}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-4">
                                                        <div className="text-sm text-gray-500 mb-2">Required Skills</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Array.isArray(recommendation?.job?.required_skills) ? recommendation.job.required_skills.map((skill, skillIndex) => (
                                                                <span key={skillIndex} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {skill}
                                                                </span>
                                                            )) : null}
                                                        </div>
                                                    </div>

                                                    <div className="mb-4">
                                                        <div className="text-sm text-gray-500 mb-2">Why this matches you:</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {recommendation.match_reasons.map((reason, reasonIndex) => (
                                                                <span key={reasonIndex} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    ✓ {reason}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="text-sm text-gray-500">
                                                            Posted {new Date(recommendation.job.created_at).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex space-x-3">
                                                            <button
                                                                onClick={() => setSelectedJob(recommendation.job)}
                                                                className="text-sm text-blue-600 hover:text-blue-800"
                                                            >
                                                                View Details
                                                            </button>
                                                            <Link
                                                                href={`/jobs/${recommendation.job.id}`}
                                                                className="inline-flex items-center px-3 py-1.5 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                            >
                                                                Apply Now
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* AI Insights Sidebar */}
                        <div className="space-y-6">
                            {/* Top Skills in Demand */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">🔥 Top Skills in Demand</h3>
                                    <div className="space-y-2">
                                        {recommendations.insights.top_skills_in_demand.slice(0, 8).map((skill, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700">{skill}</span>
                                                <span className="text-xs text-green-600 font-medium">High Demand</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Profile Improvement Suggestions */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">💡 Improve Your Profile</h3>
                                    <div className="space-y-3">
                                        {recommendations.insights.suggested_improvements.map((suggestion, index) => (
                                            <div key={index} className="flex items-start space-x-2">
                                                <span className="text-yellow-500 mt-0.5">💡</span>
                                                <span className="text-sm text-gray-700">{suggestion}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Link
                                        href="/profile"
                                        className="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Update Profile
                                    </Link>
                                </div>
                            </div>

                            {/* Local Market Insights */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-blue-900 mb-4">🏝️ Local Market</h3>
                                <div className="space-y-3 text-sm text-blue-800">
                                    <div>
                                        <div className="font-medium">Tourism Season Peak</div>
                                        <div className="text-blue-700">December - April: High demand for web development</div>
                                    </div>
                                    <div>
                                        <div className="font-medium">Local Opportunities</div>
                                        <div className="text-blue-700">Resort websites, booking systems, local business apps</div>
                                    </div>
                                    <div>
                                        <div className="font-medium">Average Rates</div>
                                        <div className="text-blue-700">₱15-45/hr for web development</div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
                                    <div className="space-y-2">
                                        <Link
                                            href="/jobs"
                                            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                                        >
                                            🔍 Browse All Jobs
                                        </Link>
                                        <Link
                                            href="/profile"
                                            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                                        >
                                            👤 Update Profile
                                        </Link>
                                        <Link
                                            href="/projects"
                                            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                                        >
                                            📋 My Projects
                                        </Link>
                                        <Link
                                            href="/payment/history"
                                            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                                        >
                                            Earnings History
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
