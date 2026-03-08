import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

// Enhanced Avatar Component with gradient fallback
const UserAvatar = ({ user, size = "w-12 h-12", showOnline = false }) => {
    const sizeClasses = {
        'w-8 h-8': 'text-xs',
        'w-10 h-10': 'text-sm',
        'w-12 h-12': 'text-base',
        'w-14 h-14': 'text-lg',
        'w-16 h-16': 'text-xl'
    };

    const avatarSrc = resolveProfileImageUrl(user.profile_picture ?? user.profile_photo ?? user.avatar);
    if (avatarSrc) {
        return (
            <div className="relative">
                <img
                    src={avatarSrc}
                    alt={`${user.first_name} ${user.last_name}`}
                    className={`${size} rounded-full object-cover ring-2 ring-white shadow-sm`}
                />
                {showOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                )}
            </div>
        );
    }

    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
    const colors = [
        'bg-gradient-to-br from-red-400 to-red-600',
        'bg-gradient-to-br from-blue-400 to-blue-600',
        'bg-gradient-to-br from-green-400 to-green-600',
        'bg-gradient-to-br from-yellow-400 to-yellow-600',
        'bg-gradient-to-br from-purple-400 to-purple-600',
        'bg-gradient-to-br from-pink-400 to-pink-600',
        'bg-gradient-to-br from-indigo-400 to-indigo-600'
    ];
    const colorIndex = user.id % colors.length;

    return (
        <div className="relative">
            <div className={`${size} rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-semibold shadow-sm ring-2 ring-white ${sizeClasses[size]}`}>
                {initials}
            </div>
            {showOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
            )}
        </div>
    );
};

// Empty State Component
const EmptyState = ({ isDark }) => (
    <div className="flex flex-col items-center justify-center h-full py-12 px-4">
        <div className={`w-24 h-24 mb-6 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <svg className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        </div>
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No conversations yet</h3>
        <p className={`text-center max-w-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Start connecting with others by sending your first message
        </p>
    </div>
);

// Conversation Card Component
const ConversationCard = ({ conversation, isActive, onClick, isDark }) => {
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const truncateMessage = (text, maxLength = 60) => {
        if (!text) return 'No messages yet';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const getContractStatusBadge = (status) => {
        const dark = {
            'pending_employer_signature': { label: 'Pending Employer', color: 'bg-amber-500/20 text-amber-400' },
            'pending_gig_worker_signature': { label: 'Pending Worker', color: 'bg-blue-500/20 text-blue-400' },
            'fully_signed': { label: 'Active Contract', color: 'bg-green-500/20 text-green-400' },
            'completed': { label: 'Completed', color: 'bg-gray-700 text-gray-200' },
            'cancelled': { label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
        };
        const light = {
            'pending_employer_signature': { label: 'Pending Employer', color: 'bg-amber-100 text-amber-800' },
            'pending_gig_worker_signature': { label: 'Pending Worker', color: 'bg-blue-100 text-blue-800' },
            'fully_signed': { label: 'Active Contract', color: 'bg-green-100 text-green-800' },
            'completed': { label: 'Completed', color: 'bg-gray-200 text-gray-800' },
            'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
        };
        const config = isDark ? dark : light;
        return config[status] || null;
    };

    return (
        <Link
            href={`/messages/${conversation.user.id}`}
            className={`block p-4 border-b transition-all duration-200 ${
                isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
            } ${isActive ? (isDark ? 'bg-gray-700 border-l-4 border-l-blue-500' : 'bg-blue-50 border-l-4 border-l-blue-500') : ''}`}
        >
            <div className="flex items-center space-x-4">
                <div className="relative flex-shrink-0">
                    <UserAvatar user={conversation.user} size="w-14 h-14" />
                    {conversation.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm font-semibold truncate ${
                            conversation.unread_count > 0 ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-gray-200' : 'text-gray-800')
                        }`}>
                            {conversation.user.first_name} {conversation.user.last_name}
                        </h3>
                        <span className={`text-xs ml-2 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            {formatTime(conversation.last_activity)}
                        </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${
                            conversation.unread_count > 0 ? (isDark ? 'text-white font-medium' : 'text-gray-900 font-medium') : (isDark ? 'text-gray-400' : 'text-gray-600')
                        }`}>
                            {truncateMessage(conversation.last_message)}
                        </p>
                    </div>
                    
                    {/* Job Context and Status */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {conversation.user.user_type && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                conversation.user.user_type === 'employer'
                                    ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-800')
                                    : (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800')
                            }`}>
                                {conversation.user.user_type === 'employer' ? 'Employer' : 'Gig Worker'}
                            </span>
                        )}
                        
                        {/* Job Title */}
                        {conversation.job_context && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-800'}`}>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {conversation.job_context.job_title.length > 20 
                                    ? conversation.job_context.job_title.substring(0, 20) + '...'
                                    : conversation.job_context.job_title
                                }
                            </span>
                        )}
                        
                        {/* Contract Status */}
                        {conversation.contract_status && getContractStatusBadge(conversation.contract_status) && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                getContractStatusBadge(conversation.contract_status).color
                            }`}>
                                {getContractStatusBadge(conversation.contract_status).label}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default function EnhancedMessagesIndex({ conversations = [], auth }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredConversations, setFilteredConversations] = useState(conversations);

    // Filter conversations based on search
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredConversations(conversations);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = conversations.filter(conv =>
                `${conv.user.first_name} ${conv.user.last_name}`.toLowerCase().includes(query) ||
                conv.last_message?.toLowerCase().includes(query)
            );
            setFilteredConversations(filtered);
        }
    }, [searchQuery, conversations]);

    // Get unread count
    const unreadCount = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : undefined}
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <h2 className={`font-bold text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Messages</h2>
                        {unreadCount > 0 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                </div>
            }
        >
            <Head title="Messages" />

            <div className={`min-h-screen relative ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                {isDark && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>
                )}
                <div className="py-6 relative z-20">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-lg'}`}>
                            {/* Search Bar */}
                            <div className={`p-6 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search conversations..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={isDark ? "block w-full pl-12 pr-4 py-3 border border-gray-600 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all" : "block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className={`absolute inset-y-0 right-0 pr-4 flex items-center ${isDark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                
                                {/* Stats */}
                                <div className="mt-4 flex items-center space-x-6 text-sm">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                            {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                                {unreadCount} unread
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Conversations List */}
                            <div className={isDark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
                                {filteredConversations.length === 0 ? (
                                    searchQuery ? (
                                        <div className="p-12 text-center">
                                            <svg className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <h3 className={`mt-4 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>No results found</h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Try searching with different keywords
                                            </p>
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className={isDark ? "mt-4 inline-flex items-center px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-200 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50" : "mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"}
                                            >
                                                Clear search
                                            </button>
                                        </div>
                                    ) : (
                                        <EmptyState isDark={isDark} />
                                    )
                                ) : (
                                    filteredConversations.map((conversation) => (
                                        <ConversationCard
                                            key={conversation.user.id}
                                            conversation={conversation}
                                            isActive={false}
                                            onClick={() => {}}
                                            isDark={isDark}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Footer with helpful info */}
                            {filteredConversations.length > 0 && (
                                <div className={`p-4 border-t ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <p className="text-xs text-gray-500 text-center">
                                        Click on a conversation to view and send messages
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
