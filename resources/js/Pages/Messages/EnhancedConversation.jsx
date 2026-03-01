import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { getFileIcon, isImageFile, getFileExtension, formatFileSize } from '@/utils/fileIcons.jsx';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';
import axios from 'axios';

// Enhanced Loading Components
const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
        <div className="relative">
            <div className="w-6 h-6 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-6 h-6 border-2 border-transparent border-t-blue-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <span className="ml-2 text-sm text-white/60">Loading messages...</span>
    </div>
);

const MessageSkeleton = () => (
    <div className="flex space-x-3 animate-pulse mb-4">
        <div className="w-8 h-8 bg-white/10 rounded-full flex-shrink-0"></div>
        <div className="flex-1">
            <div className="bg-white/10 rounded-2xl p-3 max-w-xs">
                <div className="h-4 bg-white/20 rounded mb-2"></div>
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
            </div>
            <div className="h-3 bg-white/10 rounded w-16 mt-1"></div>
        </div>
    </div>
);

// Enhanced Avatar Component
const UserAvatar = ({ user, size = 'w-8 h-8', showOnline = false }) => {
    const sizeClasses = {
        'w-6 h-6': 'w-6 h-6 text-xs',
        'w-8 h-8': 'w-8 h-8 text-xs',
        'w-10 h-10': 'w-10 h-10 text-sm',
        'w-12 h-12': 'w-12 h-12 text-base',
        'w-16 h-16': 'w-16 h-16 text-lg'
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

export default function EnhancedConversation({ user, messages: initialMessages, currentUser }) {
    const [messageList, setMessageList] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [lastMessageId, setLastMessageId] = useState(
        initialMessages.length > 0 ? Math.max(...initialMessages.map(m => m.id)) : 0
    );
    const [openMenuId, setOpenMenuId] = useState(null);
    const [deletingMessageId, setDeletingMessageId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [negotiatedPrice, setNegotiatedPrice] = useState('');
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const menuRef = useRef(null);

    // Enhanced scroll to bottom with smooth animation
    const scrollToBottom = useCallback((smooth = true) => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: smooth ? "smooth" : "auto",
                block: "end"
            });
        }
    }, []);

    // Real-time message polling with duplicate prevention
    const fetchNewMessages = useCallback(async () => {
        try {
            const response = await axios.get(`/messages/${user.id}/new`, {
                params: { after: lastMessageId }
            });

            if (response.data.messages && response.data.messages.length > 0) {
                const newMessages = response.data.messages;

                // Filter out any messages that already exist (prevent duplicates)
                setMessageList(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

                    if (uniqueNewMessages.length > 0) {
                        const maxId = Math.max(...newMessages.map(m => m.id));
                        setLastMessageId(maxId);
                        return [...prev, ...uniqueNewMessages];
                    }
                    return prev;
                });

                // Smooth scroll to bottom for new messages
                setTimeout(() => scrollToBottom(true), 100);
            }
        } catch (error) {
            console.error('Error fetching new messages:', error);
        }
    }, [user.id, lastMessageId, scrollToBottom]);

    // Poll for new messages every 15 seconds
    useEffect(() => {
        // Clear any existing interval
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        // Set up new polling interval
        pollingIntervalRef.current = setInterval(fetchNewMessages, 15000);

        // Cleanup on unmount
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [fetchNewMessages]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial scroll
    useEffect(() => {
        scrollToBottom(false);
    }, [scrollToBottom]);

    // Delete message
    const handleDeleteMessage = async (messageId) => {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        setDeletingMessageId(messageId);
        setOpenMenuId(null);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            const response = await fetch(`/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete message');
            }

            const result = await response.json();

            if (result.success) {
                // Remove message from list
                setMessageList(prev => prev.filter(msg => msg.id !== messageId));
            } else {
                throw new Error(result.message || 'Failed to delete message');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            alert(error.message || 'Failed to delete message. Please try again.');
        } finally {
            setDeletingMessageId(null);
        }
    };

    // Handle reply to message
    const handleReplyToMessage = (message) => {
        setReplyingTo(message);
        // Focus on the message input
        setTimeout(() => {
            const textarea = document.querySelector('textarea[placeholder="Type your message..."]');
            if (textarea) {
                textarea.focus();
            }
        }, 100);
    };

    // Cancel reply
    const cancelReply = () => {
        setReplyingTo(null);
    };

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must not exceed 10MB');
                e.target.value = '';
                return;
            }
            setAttachment(file);
        }
    };

    // Remove attachment
    const removeAttachment = () => {
        setAttachment(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Send message
    const handleSubmit = async (e) => {
        e.preventDefault();

        if ((!newMessage.trim() && !attachment) || sending) return;

        setSending(true);
        const messageText = newMessage;
        const fileToSend = attachment;
        const replyToMessage = replyingTo;

        // Clear form immediately for better UX
        setNewMessage('');
        setAttachment(null);
        setReplyingTo(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        try {
            const formData = new FormData();
            formData.append('receiver_id', user.id);
            formData.append('message', messageText);
            if (fileToSend) {
                formData.append('attachment', fileToSend);
            }
            if (replyToMessage) {
                formData.append('reply_to_id', replyToMessage.id);
            }

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }

            const response = await fetch('/messages', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }

            const result = await response.json();

            if (result.success) {
                // Add new message to list
                setMessageList(prev => [...prev, result.message]);
                setLastMessageId(result.message.id);

                // Scroll to bottom
                setTimeout(() => scrollToBottom(true), 100);
            } else {
                throw new Error(result.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            console.error('Error details:', error.message);

            // Restore message on error
            setNewMessage(messageText);
            setAttachment(fileToSend);
            setReplyingTo(replyToMessage);

            // Show specific error message
            alert(error.message || 'Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const formatMessageTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const renderMessage = (message) => {
        const isOwnMessage = message.sender_id === currentUser.id;
        const isDeleting = deletingMessageId === message.id;
        const repliedMessage = message.reply_to ? messageList.find(m => m.id === message.reply_to_id) : null;

        return (
            <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-6 group relative`}>
                <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-3 max-w-xs lg:max-w-md xl:max-w-lg`}>
                    <div className="flex-shrink-0">
                        <UserAvatar user={message.sender} size="w-8 h-8" />
                    </div>
                    <div className="flex flex-col space-y-1 relative">
                        <div className="relative">
                            {/* Reply button */}
                            <button
                                onClick={() => handleReplyToMessage(message)}
                                className={`absolute ${isOwnMessage ? 'left-0 -ml-16' : 'right-0 -mr-16'} top-2 p-1 rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity`}
                                title="Reply to message"
                            >
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                            </button>

                            {/* Three-dot menu button */}
                            <button
                                onClick={() => setOpenMenuId(openMenuId === message.id ? null : message.id)}
                                className={`absolute ${isOwnMessage ? 'left-0 -ml-8' : 'right-0 -mr-8'} top-2 p-1 rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity ${openMenuId === message.id ? 'opacity-100' : ''
                                    }`}
                                title="Message options"
                            >
                                <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                            </button>

                            {/* Dropdown menu - Only delete for own messages */}
                            {openMenuId === message.id && isOwnMessage && (
                                <div
                                    ref={menuRef}
                                    className={`absolute ${isOwnMessage ? 'left-0 -ml-8' : 'right-0 -mr-8'} top-8 mt-1 w-48 bg-[#0d1014] rounded-lg shadow-lg border border-white/10 py-1 z-10`}
                                >
                                    <button
                                        onClick={() => handleDeleteMessage(message.id)}
                                        disabled={isDeleting}
                                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center space-x-2 disabled:opacity-50"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>{isDeleting ? 'Deleting...' : 'Delete Message'}</span>
                                    </button>
                                </div>
                            )}

                            <div className={`message-bubble px-4 py-3 rounded-2xl shadow-sm ${isOwnMessage
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md'
                                : 'bg-white/10 text-white border border-white/10 rounded-bl-md'
                                } ${isDeleting ? 'opacity-50' : ''}`}>
                                {/* Replied message preview */}
                                {repliedMessage && (
                                    <div className={`mb-2 pb-2 border-l-2 pl-3 ${isOwnMessage ? 'border-white/30' : 'border-blue-400/50'
                                        }`}>
                                        <div className={`text-xs font-medium ${isOwnMessage ? 'text-blue-100' : 'text-blue-400'}`}>
                                            Replying to {repliedMessage.sender.first_name}
                                        </div>
                                        <div className={`text-xs mt-1 ${isOwnMessage ? 'text-white/70' : 'text-white/60'} truncate`}>
                                            {repliedMessage.type === 'file'
                                                ? `📎 ${repliedMessage.attachment_name}`
                                                : repliedMessage.message}
                                        </div>
                                    </div>
                                )}
                                {message.type === 'file' && message.attachment_name ? (
                                    isImageFile(message.attachment_name) ? (
                                        <div className="space-y-2">
                                            <a
                                                href={`/messages/${message.id}/download`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block group"
                                            >
                                                <img
                                                    src={message.attachment_path || `/messages/${message.id}/download`}
                                                    alt={message.attachment_name}
                                                    className="max-w-xs rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                                                    style={{ maxHeight: '300px', objectFit: 'cover' }}
                                                />
                                                <div className="mt-2 text-xs text-white/60 group-hover:underline">
                                                    {message.attachment_name}
                                                </div>
                                            </a>
                                            {message.message && (
                                                <div className="mt-2 whitespace-pre-wrap leading-relaxed">{message.message}</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwnMessage ? 'bg-white/20' : 'bg-white/10'
                                                    }`}>
                                                    {getFileIcon(message.attachment_name, 'w-5 h-5', isOwnMessage)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">{message.attachment_name}</div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-white/50'}`}>
                                                            {getFileExtension(message.attachment_name).toUpperCase()}
                                                        </span>
                                                        <a
                                                            href={`/messages/${message.id}/download`}
                                                            className={`text-xs ${isOwnMessage ? 'text-blue-200 hover:text-white' : 'text-blue-400 hover:text-blue-300'} hover:underline transition-colors flex items-center`}
                                                        >
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                            Download
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                            {message.message && (
                                                <div className="mt-2 whitespace-pre-wrap leading-relaxed">{message.message}</div>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    message.message?.startsWith('[JOB_PREVIEW] ') ? (() => {
                                        try {
                                            const jobData = JSON.parse(message.message.replace('[JOB_PREVIEW] ', ''));
                                            return (
                                                <div className="space-y-3">
                                                    <p className="whitespace-pre-wrap leading-relaxed">Hi! I'm interested in hiring you for a project. Let's discuss!</p>
                                                    <a href={`/jobs/${jobData.id}`}
                                                        className={`block p-4 rounded-xl border transition-all hover:-translate-y-0.5 shadow-sm ${isOwnMessage
                                                            ? 'bg-white/10 border-white/20 hover:bg-white/20'
                                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                            }`}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`material-icons text-lg ${isOwnMessage ? 'text-blue-200' : 'text-blue-400'}`}>work</span>
                                                            <div className={`text-xs font-bold uppercase tracking-wider ${isOwnMessage ? 'text-blue-100' : 'text-blue-400'}`}>
                                                                Job Invitation
                                                            </div>
                                                        </div>
                                                        <h4 className={`text-lg font-bold mb-1 ${isOwnMessage ? 'text-white' : 'text-white'}`}>
                                                            {jobData.title}
                                                        </h4>
                                                        <div className={`flex items-center gap-2 text-sm font-medium ${isOwnMessage ? 'text-blue-100' : 'text-emerald-400'}`}>
                                                            <span className="material-icons text-base">payments</span>
                                                            {jobData.budget || 'Negotiable'}
                                                        </div>
                                                    </a>
                                                    {isOwnMessage ? null : (
                                                        <div className="mt-2 text-center">
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); setNewMessage(`Hi! I'd love to learn more about the "${jobData.title}" role. What are the next steps?`); document.querySelector('textarea')?.focus(); }}
                                                                className="px-4 py-2 w-full bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition"
                                                            >
                                                                Reply & Negotiate
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } catch (e) {
                                            return <div className="whitespace-pre-wrap leading-relaxed">{message.message}</div>;
                                        }
                                    })() : (
                                        <div className="whitespace-pre-wrap leading-relaxed">{message.message}</div>
                                    )
                                )}
                            </div>
                        </div>

                        <div className={`flex items-center text-xs ${isOwnMessage ? 'justify-end' : 'justify-start'
                            }`}>
                            <span className="text-white/50 opacity-70">
                                {formatMessageTime(message.created_at)}
                            </span>
                            {isOwnMessage && message.is_read && (
                                <div className="flex items-center ml-2" title="Read">
                                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <svg className="w-3 h-3 text-blue-500 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AuthenticatedLayout
            pageTheme="dark"
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/messages"
                            className="flex items-center text-white/70 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </Link>
                        <div className="flex items-center space-x-4">
                            <UserAvatar user={user} size="w-12 h-12" />
                            <div>
                                <h2 className="font-bold text-xl text-white leading-tight">
                                    {user.first_name} {user.last_name}
                                </h2>
                                <div className="flex items-center space-x-3 mt-1">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${user.user_type === 'employer'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                        {user.user_type === 'employer' ? 'Employer' : 'Gig Worker'}
                                    </span>
                                    {user.professional_title && (
                                        <span className="text-sm text-white/60">• {user.professional_title}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {currentUser.user_type === 'employer' && (
                            <button
                                onClick={() => setShowPriceModal(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#05070A] focus:ring-green-500 transition-all shadow-sm"
                                title="Confirm Negotiated Price"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Confirm Price
                            </button>
                        )}
                        <button
                            onClick={fetchNewMessages}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-2 border border-white/20 rounded-lg text-sm font-medium text-white/80 bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                            title="Refresh messages"
                        >
                            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Chat with ${user.first_name} ${user.last_name}`} />

            {/* Price Confirmation Modal */}
            {showPriceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#0d1014] rounded-2xl shadow-xl border border-white/10 w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Confirm Negotiated Price</h3>
                            <button onClick={() => setShowPriceModal(false)} className="text-white/40 hover:text-white/80">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-white/60 mb-4">
                                Enter the final price you have negotiated with {user.first_name}. This will pre-fill the contract creation form.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1">Final Agreed Price (₱)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={negotiatedPrice}
                                    onChange={(e) => setNegotiatedPrice(e.target.value)}
                                    placeholder="e.g. 5000"
                                    className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-white/5 flex justify-end gap-3 border-t border-white/10">
                            <button
                                onClick={() => setShowPriceModal(false)}
                                className="px-4 py-2 text-sm font-medium text-white/80 bg-white/5 border border-white/20 rounded-lg hover:bg-white/10 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (negotiatedPrice) {
                                        window.location.href = `/contracts/create?gig_worker_id=${user.id}&price=${encodeURIComponent(negotiatedPrice)}`;
                                    }
                                }}
                                disabled={!negotiatedPrice}
                                className="px-4 py-2 text-sm font-bold text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                            >
                                Create Contract
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-[#05070A] relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>
                <div className="py-8 relative z-20">
                    <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white/5 overflow-hidden border border-white/10 sm:rounded-2xl">
                            {/* Messages Area */}
                            <div
                                ref={messagesContainerRef}
                                className="messages-container h-[32rem] overflow-y-auto p-6 bg-white/5"
                            >
                                {loading && messageList.length === 0 ? (
                                    <div className="space-y-4">
                                        <LoadingSpinner />
                                        {[...Array(3)].map((_, i) => (
                                            <MessageSkeleton key={i} />
                                        ))}
                                    </div>
                                ) : messageList.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <div className="w-20 h-20 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                                                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-white mb-2">No messages yet</h3>
                                            <p className="text-white/60 max-w-sm mx-auto">Start the conversation by sending a message below.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {messageList.map(renderMessage)}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                        </div>

                        {/* Enhanced Message Input */}
                        <div className="p-6 bg-white/5 border-t border-white/10">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Reply preview */}
                                {replyingTo && (
                                    <div className="reply-preview bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-blue-300">
                                                        Replying to {replyingTo.sender.first_name} {replyingTo.sender.last_name}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-blue-200/90 truncate">
                                                    {replyingTo.type === 'file'
                                                        ? `📎 ${replyingTo.attachment_name}`
                                                        : replyingTo.message}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={cancelReply}
                                                className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded-lg hover:bg-white/10"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* File attachment preview */}
                                {attachment && (
                                    <div className="file-preview bg-white/5 border border-white/10 rounded-xl p-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                {getFileIcon(attachment.name, 'w-5 h-5', false)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{attachment.name}</p>
                                                <p className="text-xs text-white/50">{formatFileSize(attachment.size)}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeAttachment}
                                                className="text-white/40 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/10"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Message input */}
                                <div className="flex items-end space-x-3">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.txt,.zip,.rar"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-shrink-0 p-3 text-white/50 hover:text-blue-400 hover:bg-white/10 rounded-lg transition-colors"
                                        title="Attach file"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </button>
                                    <div className="flex-1">
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmit(e);
                                                }
                                            }}
                                            placeholder="Type your message..."
                                            rows="2"
                                            className="w-full px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={sending || (!newMessage.trim() && !attachment)}
                                        className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#05070A] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                                    >
                                        {sending ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-white/50">
                                    Press Enter to send, Shift+Enter for new line. Max file size: 10MB
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </AuthenticatedLayout>
    );
}
