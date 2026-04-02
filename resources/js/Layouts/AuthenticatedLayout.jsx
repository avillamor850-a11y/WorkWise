"use client";
import Dropdown from '@/Components/Dropdown';
import MiniChatModal from '@/Components/MiniChatModal';
import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import CsrfSync from '@/Components/CsrfSync';
import useToast from '@/Hooks/useToast';
import { ToastContainer } from '@/Components/Toast';
import ErrorModal from '@/Components/ErrorModal';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';
import { useTheme } from '@/Contexts/ThemeContext';

function safeRoute(name, fallback = '/') {
    try {
        return route(name);
    } catch {
        return fallback;
    }
}

// Missing components
const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-4">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const NotificationSkeleton = () => (
    <div className="p-4 border-b border-gray-100 animate-pulse">
        <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>
    </div>
);


// Simplified notification icons
const NotificationIcon = ({ type }) => {
    const iconMap = {
        'contract_signing': 'file-signature',
        'bid_status': 'check-circle',
        'ai_recommendation': 'brain',
        'contract_fully_signed': 'check-double',
        'bid_accepted_messaging': 'comment-dots',
        'message_received': 'envelope',
        'new_message': 'envelope-open',
        'id_verification_approved': 'check-circle',
        'id_verification_rejected': 'times-circle',
        'default': 'bell'
    };

    const iconClass = iconMap[type] || iconMap['default'];

    // Use green color for approved, red for rejected
    const colorClass = type === 'id_verification_approved'
        ? 'text-green-600'
        : type === 'id_verification_rejected'
            ? 'text-red-600'
            : 'text-blue-600';

    return (
        <i className={`fas fa-${iconClass} ${colorClass} text-sm`}></i>
    );
};

export default function AuthenticatedLayout({ header, children, pageTheme }) {
    const { auth, flash: rawFlash, errors: pageErrors = {}, employerOpenJobsForNav = [] } = usePage().props;
    const flash = rawFlash || {};
    const user = auth.user;
    const { theme: globalTheme, setTheme } = useTheme();
    const effectiveTheme = globalTheme ?? pageTheme ?? 'dark';

    // Sync body background/color to effective theme so shell and body match the toggle
    useEffect(() => {
        if (effectiveTheme === 'light') {
            document.body.style.background = '#ffffff';
            document.body.style.color = '#111827';
        } else {
            document.body.style.background = '#111827';
            document.body.style.color = '#e5e7eb';
        }
        return () => {
            document.body.style.background = '';
            document.body.style.color = '';
        };
    }, [effectiveTheme]);

    // Fraud/security modal: show when backend sent fraud_alert error (e.g. high-risk block)
    const fraudAlertMessage = pageErrors?.fraud_alert
        ? (Array.isArray(pageErrors.fraud_alert) ? pageErrors.fraud_alert[0] : pageErrors.fraud_alert)
        : null;
    const [fraudModalDismissed, setFraudModalDismissed] = useState(false);
    const showFraudModal = !!fraudAlertMessage && !fraudModalDismissed;
    useEffect(() => {
        if (!fraudAlertMessage) setFraudModalDismissed(false);
    }, [fraudAlertMessage]);

    // Flash message handling via Toasts
    const { toasts, removeToast, success, error: toastError, warning, info } = useToast();

    useEffect(() => {
        if (flash.success) {
            success(flash.success);
        }
        if (flash.error) {
            toastError(flash.error);
        }
        if (flash.warning) {
            warning(flash.warning);
        }
        if (flash.info) {
            info(flash.info);
        }
    }, [flash, success, toastError, warning, info]);

    const isGigWorker = user.user_type === 'gig_worker';
    const isEmployer = user.user_type === 'employer';
    // Role-aware dashboard URL and active state
    const dashboardHref = isGigWorker
        ? '/gig-worker/dashboard'
        : (isEmployer
            ? '/employer/dashboard'
            : (user.user_type === 'admin' ? '/admin' : '/dashboard'));
    const isDashboardActive = ['/dashboard', '/gig-worker/dashboard', '/employer/dashboard', '/admin']
        .some(prefix => window.location.pathname.startsWith(prefix));

    const employerAiRecQualityBase = safeRoute('ai.recommendations.employer.quality', '/ai-recommendations/employer');
    const employerAiRecJobsNav = Array.isArray(employerOpenJobsForNav) ? employerOpenJobsForNav : [];

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);
    const [showingEmployerAiRecNavDropdown, setShowingEmployerAiRecNavDropdown] =
        useState(false);
    const [showingMobileEmployerAiRecJobs, setShowingMobileEmployerAiRecJobs] =
        useState(false);
    const [showingNotificationsDropdown, setShowingNotificationsDropdown] =
        useState(false);
    const [showingMessagesDropdown, setShowingMessagesDropdown] =
        useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [optimisticUpdates, setOptimisticUpdates] = useState(new Set()); // Track optimistic updates

    // Messages modal removed; use MiniChatModal for all messaging (declare before refs/useEffects that use it)
    const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
    const [conversations, setConversations] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);

    // Real-time updates
    const [lastNotificationCheck, setLastNotificationCheck] = useState(Date.now());
    const [lastMessageCheck, setLastMessageCheck] = useState(Date.now());

    // Refs for state values used in setIntervals to avoid stale closures and infinite re-renders
    const unreadCountRef = useRef(0);
    const messagesUnreadCountRef = useRef(0);

    // Sync state to refs
    useEffect(() => {
        unreadCountRef.current = unreadCount;
    }, [unreadCount]);

    useEffect(() => {
        messagesUnreadCountRef.current = messagesUnreadCount;
    }, [messagesUnreadCount]);

    // Mini chat ref for controlling it from notifications
    const miniChatRef = useRef(null);

    // MiniChatModal state
    const [showMiniChat, setShowMiniChat] = useState(false);
    const [miniChatTargetUserId, setMiniChatTargetUserId] = useState(null);

    // Fetch notifications
    const fetchNotifications = async (quiet = false) => {
        try {
            if (!quiet) setLoading(true);
            const response = await axios.get('/notifications/api');
            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unread_count || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            if (!quiet) setLoading(false);
        }
    };

    // Mark notification as read with optimistic updates
    const markAsRead = async (notificationId) => {
        // Optimistic update - update UI immediately
        const wasUnread = notifications.find(n => n.id === notificationId && !n.is_read);
        if (wasUnread) {
            setOptimisticUpdates(prev => new Set([...prev, notificationId]));
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, is_read: true, read_at: new Date().toISOString() }
                        : notification
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        try {
            await axios.patch(`/notifications/${notificationId}/read`);
            // Remove from optimistic updates on success
            setOptimisticUpdates(prev => {
                const newSet = new Set(prev);
                newSet.delete(notificationId);
                return newSet;
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            // Revert optimistic update on error
            if (wasUnread) {
                setOptimisticUpdates(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(notificationId);
                    return newSet;
                });
                setNotifications(prev =>
                    prev.map(notification =>
                        notification.id === notificationId
                            ? { ...notification, is_read: false, read_at: null }
                            : notification
                    )
                );
                setUnreadCount(prev => prev + 1);
            }
        }
    };

    // Mark all notifications as read with optimistic updates
    const markAllAsRead = async () => {
        // Store unread notifications for potential rollback
        const unreadNotifications = notifications.filter(n => !n.is_read);
        const previousUnreadCount = unreadCount;

        // Optimistic update - update UI immediately
        setNotifications(prev =>
            prev.map(notification => ({
                ...notification,
                is_read: true,
                read_at: new Date().toISOString()
            }))
        );
        setUnreadCount(0);

        try {
            await axios.patch('/notifications/mark-all-read');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            // Revert optimistic update on error
            setNotifications(prev =>
                prev.map(notification => {
                    const wasUnread = unreadNotifications.find(n => n.id === notification.id);
                    return wasUnread
                        ? { ...notification, is_read: false, read_at: null }
                        : notification;
                })
            );
            setUnreadCount(previousUnreadCount);
        }
    };

    // Handle notification click
    const handleNotificationClick = (notification) => {
        console.log('Notification clicked:', notification);
        if (!notification.is_read) {
            markAsRead(notification.id);
        }

        // Handle ID verification notifications
        if (notification.type === 'id_verification_approved') {
            // Redirect to profile page for approved verifications
            console.log('ID verification approved - redirecting to profile');
            router.visit('/profile');
        } else if (notification.type === 'id_verification_rejected') {
            // Redirect to ID verification page for rejected verifications
            console.log('ID verification rejected - redirecting to ID verification page');
            router.visit('/id-verification');
        } else if (notification.type === 'bid_accepted_messaging') {
            // Handle message-related notifications by navigating to messages page
            const targetUserId = notification.data?.message_target_user_id;
            console.log('Bid accepted messaging notification - targetUserId:', targetUserId);

            if (targetUserId) {
                // Navigate to messages index with user parameter to open specific conversation
                console.log('Navigating to messages with user:', targetUserId);
                router.visit(`/messages?user=${targetUserId}`);
            } else {
                // Navigate to messages index if no specific user
                console.log('No targetUserId found, navigating to messages index');
                router.visit('/messages');
            }
        } else if (notification.type === 'new_message' || notification.type === 'message_received') {
            // Handle regular message notifications - navigate to conversation
            const senderId = notification.data?.sender_id;
            console.log('Message notification - senderId:', senderId, 'notification data:', notification.data);

            if (senderId) {
                // Navigate to messages index with user parameter to open specific conversation
                console.log('Navigating to messages with user:', senderId);
                router.visit(`/messages?user=${senderId}`);
            } else {
                // Navigate to messages index if no specific sender
                console.log('No senderId found, navigating to messages index');
                router.visit('/messages');
            }
        } else if (notification.action_url) {
            // For other notification types, use the action URL
            console.log('Using action URL:', notification.action_url);
            router.visit(notification.action_url);
        }

        setShowingNotificationsDropdown(false);
    };

    // Handle message button click for notifications
    const handleMessageButtonClick = (e, notification) => {
        e.stopPropagation(); // Prevent notification click
        console.log('Message button clicked for notification:', notification);

        if (!notification.is_read) {
            markAsRead(notification.id);
        }

        // Get the target user info from notification data based on notification type
        let targetUserId;

        if (notification.type === 'bid_accepted_messaging') {
            targetUserId = notification.data?.message_target_user_id;
        } else if (notification.type === 'new_message' || notification.type === 'message_received') {
            targetUserId = notification.data?.sender_id;
        } else {
            // Fallback to message_target_user_id for other types
            targetUserId = notification.data?.message_target_user_id;
        }

        console.log('Message button clicked - notification type:', notification.type, 'targetUserId:', targetUserId);

        if (targetUserId) {
            // Open the MiniChatModal with the target user
            setMiniChatTargetUserId(targetUserId);
            setShowMiniChat(true);

            // Use the ref to open conversation directly
            if (miniChatRef.current) {
                miniChatRef.current.openConversation(targetUserId);
                miniChatRef.current.expandChat();
            }
        } else {
            console.log('No targetUserId found for messaging');
        }

        setShowingNotificationsDropdown(false);
    };

    // Removed Quick Chat helpers; MiniChat widget is always visible

    // Handle notification button click
    const handleNotificationButtonClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Notification button clicked, current state:', showingNotificationsDropdown);
        setShowingNotificationsDropdown(!showingNotificationsDropdown);
        if (!showingNotificationsDropdown) {
            fetchNotifications();
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        const initFetch = async () => {
            await Promise.all([
                fetchNotifications(),
                fetchMessagesUnreadCount()
            ]);
        };
        initFetch();
    }, []);


    // Fetch unread message count (only update state when count actually changed to avoid re-render loops)
    const fetchMessagesUnreadCount = async () => {
        try {
            const response = await axios.get('/messages/unread/count');
            const newCount = response.data.count || 0;
            if (newCount !== messagesUnreadCountRef.current) {
                setMessagesUnreadCount(newCount);
            }
        } catch (error) {
            console.error('Error fetching messages unread count:', error);
        }
    };

    // Fetch conversations for messages dropdown
    const fetchConversations = async () => {
        try {
            setMessagesLoading(true);
            const response = await axios.get('/messages/recent/conversations');
            setConversations(response.data.conversations || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setMessagesLoading(false);
        }
    };

    // Handle messages button click - show dropdown and mark as read
    const handleMessagesButtonClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowingMessagesDropdown(!showingMessagesDropdown);

        if (!showingMessagesDropdown) {
            fetchConversations();
            // Mark all messages as read when opening the dropdown
            if (messagesUnreadCount > 0) {
                markAllMessagesAsRead();
            }
        }
    };

    // Mark all messages as read
    const markAllMessagesAsRead = async () => {
        try {
            // Mark all conversations as read by calling the backend for each conversation
            const markPromises = conversations.map(async (conversation) => {
                if (conversation.unread_count > 0) {
                    try {
                        await axios.patch(`/messages/conversation/${conversation.user.id}/read`);
                    } catch (error) {
                        console.error(`Error marking conversation ${conversation.user.id} as read:`, error);
                    }
                }
            });

            await Promise.all(markPromises);

            // Update the unread count to 0
            setMessagesUnreadCount(0);

            // Update conversations to reflect read status
            setConversations(prev =>
                prev.map(conv => ({
                    ...conv,
                    unread_count: 0
                }))
            );
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    // Handle conversation click
    const handleConversationClick = async (conversation) => {
        console.log('Conversation clicked:', conversation);

        // Mark this conversation as read if it has unread messages
        if (conversation.unread_count > 0) {
            try {
                await axios.patch(`/messages/conversation/${conversation.user.id}/read`);

                // Update the unread count
                const newUnreadCount = Math.max(0, messagesUnreadCount - conversation.unread_count);
                setMessagesUnreadCount(newUnreadCount);

                // Update this conversation's unread count
                setConversations(prev =>
                    prev.map(conv =>
                        conv.user.id === conversation.user.id
                            ? { ...conv, unread_count: 0 }
                            : conv
                    )
                );
            } catch (error) {
                console.error('Error marking conversation as read:', error);
            }
        }

        // Navigate to messages index with user parameter to open specific conversation
        router.visit(`/messages?user=${conversation.user.id}`);
        setShowingMessagesDropdown(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showingNotificationsDropdown && !event.target.closest('.notifications-dropdown')) {
                setShowingNotificationsDropdown(false);
            }
            if (showingMessagesDropdown && !event.target.closest('.messages-dropdown')) {
                setShowingMessagesDropdown(false);
            }
            if (showingEmployerAiRecNavDropdown && !event.target.closest('.employer-ai-rec-nav-dropdown')) {
                setShowingEmployerAiRecNavDropdown(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showingNotificationsDropdown, showingMessagesDropdown, showingEmployerAiRecNavDropdown]);

    useEffect(() => {
        if (!showingEmployerAiRecNavDropdown) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setShowingEmployerAiRecNavDropdown(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [showingEmployerAiRecNavDropdown]);


    // Real-time polling with consolidated heartbeat
    const pollHeartbeat = async () => {
        try {
            const response = await axios.get('/api/user/heartbeat');
            const { unread_notifications_count, unread_messages_count } = response.data;

            // Handle Notifications
            if (unread_notifications_count > unreadCountRef.current) {
                // New notifications arrived, refresh the list quietly
                fetchNotifications(true);

                // Show browser notification if supported
                if ('Notification' in window && Notification.permission === 'granted') {
                    // We don't have the full notification here yet, so we'll just show a generic one
                    // or let fetchNotifications handle it if it were doing more
                    new Notification('New Notification', {
                        body: 'You have a new notification on WorkWise',
                        icon: '/favicon.ico'
                    });
                }
            }
            // Sync count if it decreased (e.g. read in another tab)
            if (unread_notifications_count !== unreadCountRef.current) {
                setUnreadCount(unread_notifications_count);
            }

            // Handle Messages
            if (unread_messages_count !== messagesUnreadCountRef.current) {
                // Show browser notification if count increased
                if (unread_messages_count > messagesUnreadCountRef.current && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification('New Message', {
                        body: `You have ${unread_messages_count} unread messages`,
                        icon: '/favicon.ico'
                    });
                }
                setMessagesUnreadCount(unread_messages_count);
            }
        } catch (error) {
            // Silently handle 401 errors (user may not have full access yet)
            if (error.response?.status !== 401) {
                console.error('Heartbeat poll failed:', error);
            }
        }
    };

    // Set up polling intervals with visibility check
    useEffect(() => {
        const poll = () => {
            if (document.visibilityState === 'visible') {
                pollHeartbeat();
            }
        };

        const interval = setInterval(poll, 20000); // Check every 20 seconds (slightly increased from 15s)

        // Also check when tab becomes visible
        document.addEventListener('visibilitychange', poll);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', poll);
        };
    }, []);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    return (
        <div className={`min-h-screen ${effectiveTheme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
            <CsrfSync />
            <nav className={`sticky top-0 z-50 border-b shadow-lg shadow-black/20 transition-colors duration-300 ease-out relative ${effectiveTheme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>

                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex h-14 sm:h-16 justify-between items-center gap-4">
                        {/* Logo + Navigation - Left */}
                        <div className="flex items-center gap-6 md:gap-8 min-w-0">
                            {/* Logo (matches HeroUI layout) */}
                            <div className="flex-shrink-0 flex items-center gap-2">
                                <Link href="/" className="flex items-center gap-2">
                                    <div className="w-10 h-10 md:w-12 md:h-12">
                                        <img
                                            src="/image/WorkWise_logo.png"
                                            alt="WorkWise Logo"
                                            className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                        />
                                    </div>
                                    <div className="flex items-baseline">
                                        <span className={`text-2xl md:text-3xl font-black tracking-tighter ${effectiveTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                                            <span className={effectiveTheme === 'dark' ? 'text-blue-500' : 'text-blue-600'}>W</span>orkWise
                                        </span>
                                    </div>
                                </Link>
                            </div>

                            {/* Navigation links - next to logo */}
                            <div className="hidden md:flex flex-wrap items-center gap-x-6 gap-y-1">
                                {/* Dashboard / Find Gig Workers - shown for employers/admin, not for gig workers */}
                                {!isGigWorker && (
                                    <Link
                                        href={dashboardHref}
                                        className={`text-sm font-medium transition-colors duration-200 ${isDashboardActive
                                            ? 'text-blue-400'
                                            : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900')
                                            }`}
                                    >
                                        {isEmployer ? 'Find Gig Workers' : 'Dashboard'}
                                    </Link>
                                )}

                                {/* Jobs/Work - Role-specific labels */}
                                <Link
                                    href="/jobs"
                                    className={`text-sm font-medium transition-colors duration-200 ${window.route.current('jobs.*')
                                        ? 'text-blue-400'
                                        : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900')
                                        }`}
                                >
                                    {isGigWorker ? 'Find Jobs' : 'My Jobs'}
                                </Link>

                                {/* Gig Worker-only navigation */}
                                {isGigWorker && (
                                    <>
                                        <Link
                                            href="/bids"
                                            className={`text-sm font-medium transition-colors duration-200 ${window.route.current('bids.*')
                                                ? 'text-blue-400'
                                                : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900')
                                                }`}
                                        >
                                            My Proposals
                                        </Link>
                                        <Link
                                            href={safeRoute('ai.recommendations.gigworker.quality', '/ai-recommendations/gig-worker')}
                                            className={`text-sm font-medium transition-colors duration-200 ${window.route.current('ai.recommendations.gigworker.quality')
                                                ? 'text-blue-400'
                                                : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900')
                                                }`}
                                        >
                                            AI Recommendations
                                        </Link>
                                    </>
                                )}

                                {/* Employer-only navigation */}
                                {isEmployer && (
                                    <>
                                        <Link
                                            href="/jobs/create"
                                            className={`text-sm font-medium rounded-md transition-colors duration-200 ${window.route.current('jobs.create')
                                                ? 'text-blue-400'
                                                : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900')
                                                }`}
                                        >
                                            Post a Job
                                        </Link>
                                        <div className="relative employer-ai-rec-nav-dropdown">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setShowingEmployerAiRecNavDropdown((v) => !v);
                                                }}
                                                className={`text-sm font-medium transition-colors duration-200 ${window.route.current('ai.recommendations.employer.quality')
                                                    ? 'text-blue-400'
                                                    : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900')
                                                    }`}
                                                aria-expanded={showingEmployerAiRecNavDropdown}
                                                aria-haspopup="true"
                                            >
                                                AI Recommendations
                                            </button>
                                            {showingEmployerAiRecNavDropdown && (
                                                <div className={`absolute left-0 mt-2 min-w-[16rem] max-w-xs max-h-72 overflow-y-auto rounded-lg shadow-lg z-50 ${effectiveTheme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                                    {employerAiRecJobsNav.length === 0 ? (
                                                        <div className={`px-4 py-3 text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            <p className="mb-2">No open jobs yet.</p>
                                                            <Link
                                                                href="/jobs/create"
                                                                onClick={() => setShowingEmployerAiRecNavDropdown(false)}
                                                                className={`font-medium ${effectiveTheme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                                            >
                                                                Post a Job
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        <ul className="py-1">
                                                            {employerAiRecJobsNav.map((job) => (
                                                                <li key={job.id}>
                                                                    <Link
                                                                        href={`${employerAiRecQualityBase}?job_id=${job.id}`}
                                                                        onClick={() => setShowingEmployerAiRecNavDropdown(false)}
                                                                        className={`block px-4 py-2.5 text-sm text-left transition-colors ${effectiveTheme === 'dark'
                                                                            ? 'text-gray-100 hover:bg-gray-700'
                                                                            : 'text-gray-900 hover:bg-gray-100'
                                                                            }`}
                                                                    >
                                                                        <span className="font-medium line-clamp-2">{job.title}</span>
                                                                        {job.created_at && (
                                                                            <span className={`block text-xs mt-0.5 ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                                                {new Date(job.created_at).toLocaleDateString()}
                                                                            </span>
                                                                        )}
                                                                    </Link>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Common navigation */}
                                <Link
                                    href="/projects"
                                    className={`text-sm font-medium transition-colors duration-200 ${window.route.current('projects.*')
                                        ? 'text-blue-400'
                                        : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900')
                                        }`}
                                >
                                    Projects
                                </Link>

                                {/* <Link
                                    href="/messages"
                                    className={`text-sm font-medium transition-colors ${
                                        window.route.current('messages.*')
                                            ? 'text-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Messages
                                </Link> */}
                            </div>
                        </div>

                        {/* User Menu - Right */}
                        <div className="flex items-center space-x-4">
                            {/* Notifications Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={handleNotificationButtonClick}
                                    className="relative p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.5a6 6 0 0 1 6 6v2l1.5 3h-15l1.5-3v-2a6 6 0 0 1 6-6z" />
                                    </svg>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-red-500 rounded-full">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Simplified Notifications Dropdown */}
                                {showingNotificationsDropdown && (
                                    <div className={`notifications-dropdown absolute right-0 mt-2 w-80 rounded-lg shadow-lg overflow-hidden ${effectiveTheme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                        {/* Header */}
                                        <div className={effectiveTheme === 'dark' ? 'px-4 py-3 border-b border-gray-700' : 'px-4 py-3 border-b border-gray-200'}>
                                            <div className="flex items-center justify-between">
                                                <h3 className={`text-sm font-semibold ${effectiveTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                                                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                                                </h3>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAllAsRead();
                                                        }}
                                                        className={effectiveTheme === 'dark' ? 'text-xs text-blue-400 hover:text-blue-300' : 'text-xs text-blue-600 hover:text-blue-700'}
                                                    >
                                                        Mark all read
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Notifications List */}
                                        <div className="max-h-96 overflow-y-auto">
                                            {loading ? (
                                                <div className="p-4 text-center">
                                                    <div className={`inline-block w-6 h-6 border-2 rounded-full animate-spin ${effectiveTheme === 'dark' ? 'border-gray-600 border-t-blue-400' : 'border-gray-300 border-t-blue-600'}`}></div>
                                                </div>
                                            ) : notifications.length === 0 ? (
                                                <div className="p-8 text-center">
                                                    <svg className={`w-12 h-12 mx-auto mb-2 ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-5 5v-5zM10.5 3.5a6 6 0 0 1 6 6v2l1.5 3h-15l1.5-3v-2a6 6 0 0 1 6-6z" />
                                                    </svg>
                                                    <p className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No notifications</p>
                                                </div>
                                            ) : (
                                                <div className={effectiveTheme === 'dark' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}>
                                                    {notifications.map((notification) => {
                                                        const isUnread = !notification.is_read;

                                                        return (
                                                            <div
                                                                key={notification.id}
                                                                onClick={() => handleNotificationClick(notification)}
                                                                className={`p-3 cursor-pointer ${effectiveTheme === 'dark'
                                                                    ? (isUnread ? 'bg-blue-500/10 hover:bg-gray-700' : 'hover:bg-gray-700')
                                                                    : `hover:bg-gray-50 ${isUnread ? 'bg-blue-50' : ''}`
                                                                    }`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    {/* Icon */}
                                                                    <div className="flex-shrink-0 mt-0.5">
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${effectiveTheme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                                                                            <NotificationIcon type={notification.type} icon={notification.icon} />
                                                                        </div>
                                                                    </div>

                                                                    {/* Content */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`text-sm ${effectiveTheme === 'dark'
                                                                            ? (isUnread ? 'font-semibold text-gray-100' : 'text-gray-200')
                                                                            : (isUnread ? 'font-semibold text-gray-900' : 'text-gray-700')
                                                                            }`}>
                                                                            {notification.title}
                                                                        </p>
                                                                        <p className={`text-xs mt-0.5 line-clamp-2 ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                            {notification.message}
                                                                        </p>
                                                                        <p className={`text-xs mt-1 ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                            {new Date(notification.created_at).toLocaleDateString('en-US', {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </p>
                                                                    </div>

                                                                    {/* Unread indicator */}
                                                                    {isUnread && (
                                                                        <div className="flex-shrink-0">
                                                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Message Button */}
                                                                {notification.data?.show_message_button && (
                                                                    <div className="mt-2 ml-11">
                                                                        <button
                                                                            onClick={(e) => handleMessageButtonClick(e, notification)}
                                                                            className={effectiveTheme === 'dark' ? 'text-xs text-blue-400 hover:text-blue-300 font-medium' : 'text-xs text-blue-600 hover:text-blue-700 font-medium'}
                                                                        >
                                                                            Send Message
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        {notifications.length > 0 && (
                                            <div className={effectiveTheme === 'dark' ? 'px-4 py-2 bg-gray-700 border-t border-gray-700' : 'px-4 py-2 bg-gray-50 border-t border-gray-200'}>
                                                <Link
                                                    href="/notifications"
                                                    className={`block text-center text-xs font-medium ${effectiveTheme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                                    onClick={() => setShowingNotificationsDropdown(false)}
                                                >
                                                    View all
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Theme toggle */}
                            <button
                                type="button"
                                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                                className={`p-2 rounded-lg transition-colors duration-200 ${effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                                title={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {effectiveTheme === 'dark' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>

                            {/* Enhanced Messages Dropdown */}
                            <div className="relative">
                                {/* <button
                                    onClick={handleMessagesButtonClick}
                                    className="relative p-2 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {messagesUnreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[1.25rem] h-5 animate-pulse">
                                            {messagesUnreadCount > 99 ? '99+' : messagesUnreadCount}
                                        </span>
                                    )}
                                </button> */}

                                {/* Enhanced Messages Dropdown */}
                                {showingMessagesDropdown && (
                                    <div className="messages-dropdown absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden backdrop-blur-sm z-50">
                                        {/* Header */}
                                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-semibold text-gray-900">Messages</h3>
                                                        {conversations.length > 0 && (
                                                            <p className="text-xs text-gray-600">{conversations.length} conversations</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Link
                                                    href="/messages"
                                                    onClick={(e) => {
                                                        setShowingMessagesDropdown(false);
                                                    }}
                                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all duration-200 hover:scale-105"
                                                >
                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                                    </svg>
                                                    Open Messages
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Conversations List */}
                                        <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                            {messagesLoading ? (
                                                <div className="space-y-0">
                                                    <LoadingSpinner />
                                                    {/* Show skeleton loaders while loading */}
                                                    <div className="space-y-0">
                                                        {[...Array(3)].map((_, i) => (
                                                            <NotificationSkeleton key={i} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : conversations.length === 0 ? (
                                                <div className="p-8 text-center">
                                                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                    </div>
                                                    <h4 className="text-sm font-medium text-gray-900 mb-1">No conversations</h4>
                                                    <p className="text-xs text-gray-500">Start a conversation to see it here!</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-100">
                                                    {conversations.map((conversation) => (
                                                        <div
                                                            key={conversation.user.id}
                                                            onClick={() => handleConversationClick(conversation)}
                                                            className={`notification-item group relative p-4 cursor-pointer transition-all duration-300 hover:bg-gray-50 ${conversation.unread_count > 0 ? 'bg-blue-50/50 border-l-4 border-blue-500' : 'hover:bg-gray-25'
                                                                }`}
                                                        >
                                                            <div className="flex items-start space-x-4">
                                                                {/* User Avatar */}
                                                                <div className="flex-shrink-0 relative">
                                                                    <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm transition-all duration-200 group-hover:scale-105">
                                                                        {(() => {
                                                                            const src = resolveProfileImageUrl(conversation.user.profile_picture ?? conversation.user.profile_photo ?? conversation.user.avatar);
                                                                            return src ? (
                                                                                <img
                                                                                    src={src}
                                                                                    alt={`${conversation.user.first_name} ${conversation.user.last_name}`}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                                                                    {conversation.user.first_name ? conversation.user.first_name.charAt(0).toUpperCase() : conversation.user.name.charAt(0).toUpperCase()}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    {conversation.unread_count > 0 && (
                                                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                                                                    )}
                                                                </div>

                                                                {/* Content */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-semibold leading-5 text-gray-900 group-hover:text-gray-900 transition-colors">
                                                                                {conversation.user.first_name && conversation.user.last_name
                                                                                    ? `${conversation.user.first_name} ${conversation.user.last_name}`
                                                                                    : conversation.user.name}
                                                                            </p>
                                                                            <p className="text-sm mt-1 leading-5 text-gray-600 group-hover:text-gray-700 transition-colors line-clamp-2">
                                                                                {conversation.latest_message.type === 'file'
                                                                                    ? `📎 ${conversation.latest_message.attachment_name || 'File attachment'}`
                                                                                    : conversation.latest_message.message}
                                                                            </p>
                                                                            <div className="flex items-center mt-2 space-x-2">
                                                                                <p className="text-xs text-gray-500 font-medium">
                                                                                    {new Date(conversation.last_activity).toLocaleDateString('en-US', {
                                                                                        month: 'short',
                                                                                        day: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    })}
                                                                                </p>
                                                                                {conversation.unread_count > 0 && (
                                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                                        {conversation.unread_count} new
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Hover indicator */}
                                                            <div className="absolute inset-y-0 right-0 w-1 bg-blue-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                                            <Link
                                                href="/messages"
                                                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                                onClick={() => setShowingMessagesDropdown(false)}
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                                View all messages
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Dropdown */}
                            <div className="relative">
                                <Dropdown dark={effectiveTheme === 'dark'}>
                                    <Dropdown.Trigger>
                                        <button className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-200 ${effectiveTheme === 'dark' ? 'text-gray-200 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900'}`}>
                                            {(() => {
                                                const avatarSrc = resolveProfileImageUrl(user.profile_photo ?? user.profile_picture ?? user.avatar);
                                                return avatarSrc ? (
                                                    isGigWorker ? (
                                                        <Link
                                                            href={route('gig-worker.profile')}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <img
                                                                src={avatarSrc}
                                                                alt={user.first_name || user.name}
                                                                className="w-8 h-8 rounded-full object-cover border-2 border-gray-600"
                                                            />
                                                        </Link>
                                                    ) : (
                                                        <img
                                                            src={avatarSrc}
                                                            alt={user.first_name || user.name}
                                                                className="w-8 h-8 rounded-full object-cover border-2 border-gray-600"
                                                        />
                                                    )
                                                ) : (
                                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                                        {user.first_name ? user.first_name.charAt(0).toUpperCase() : user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                );
                                            })()}
                                            <span className={`hidden md:block uppercase ${effectiveTheme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>{user.first_name || user.name}</span>
                                            <svg className={`w-4 h-4 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <div className={effectiveTheme === 'dark' ? 'px-4 py-2 border-b border-gray-700' : 'px-4 py-2 border-b border-gray-100'}>
                                            <div className={`text-sm font-medium ${effectiveTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{user.first_name ? `${user.first_name} ${user.last_name}` : user.name}</div>
                                            <div className={`text-xs capitalize ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user.user_type}</div>
                                        </div>
                                        <Dropdown.Link href={isGigWorker ? '/profile/gig-worker' : (isEmployer ? '/profile/employer' : '/profile')}>
                                            Profile Settings
                                        </Dropdown.Link>
                                        <Dropdown.Link href="/messages">
                                            Messages
                                        </Dropdown.Link>
                                        <Dropdown.Link href={isEmployer ? route('employer.wallet.index') : route('gig-worker.wallet.index')}>
                                            {isEmployer ? 'Wallet' : 'Earnings'}
                                        </Dropdown.Link>
                                        <Dropdown.Link href="/analytics">
                                            Analytics
                                        </Dropdown.Link>
                                        <Dropdown.Link href="/reports">
                                            My Reports
                                        </Dropdown.Link>
                                        <Dropdown.Link href="#">
                                            Help & Support
                                        </Dropdown.Link>
                                        <div className={effectiveTheme === 'dark' ? 'border-t border-gray-700' : 'border-t border-gray-100'}>
                                            <Dropdown.Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                            >
                                                Log Out
                                            </Dropdown.Link>
                                        </div>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="md:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className={`p-2 transition-colors duration-200 ${effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className={`${showingNavigationDropdown ? 'block' : 'hidden'} md:hidden border-t ${effectiveTheme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
                    <div className="px-4 py-2 space-y-1">
                        {/* Dashboard / Find Gig Workers - shown for employers/admin, not for gig workers */}
                        {!isGigWorker && (
                            <Link
                                href={dashboardHref}
                                className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${isDashboardActive
                                    ? 'text-blue-400 bg-gray-700'
                                    : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                                    }`}
                            >
                                {isEmployer ? 'Find Gig Workers' : 'Dashboard'}
                            </Link>
                        )}
                        {/* Jobs/Work - Role-specific */}
                        <Link
                            href="/jobs"
                            className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${window.route.current('jobs.*')
                                ? 'text-blue-400 bg-gray-700'
                                : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                                }`}
                        >
                            {isGigWorker ? 'Find Jobs' : 'My Jobs'}
                        </Link>

                        {/* Gig Worker-only mobile navigation */}
                        {isGigWorker && (
                            <Link
                                href="/bids"
                                className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${window.route.current('bids.*')
                                    ? 'text-blue-400 bg-gray-700'
                                    : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                                    }`}
                            >
                                My Proposals
                            </Link>
                        )}

                        {/* Employer-only mobile navigation */}
                        {isEmployer && (
                            <Link
                                href="/jobs/create"
                                className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${window.route.current('jobs.create')
                                    ? 'text-blue-400 bg-gray-700'
                                    : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                                    }`}
                            >
                                Post a Job
                            </Link>
                        )}

                        {isEmployer && (
                            <div className="employer-ai-rec-nav-dropdown-mobile">
                                <button
                                    type="button"
                                    onClick={() => setShowingMobileEmployerAiRecJobs((v) => !v)}
                                    className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors text-left ${window.route.current('ai.recommendations.employer.quality')
                                        ? 'text-blue-400 bg-gray-700'
                                        : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                                        }`}
                                    aria-expanded={showingMobileEmployerAiRecJobs}
                                >
                                    AI Recommendations
                                </button>
                                {showingMobileEmployerAiRecJobs && (
                                    <div className={`mt-1 ml-2 pl-2 border-l ${effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} space-y-1`}>
                                        {employerAiRecJobsNav.length === 0 ? (
                                            <div className={`px-3 py-2 text-xs ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                                <p className="mb-2">No open jobs.</p>
                                                <Link
                                                    href="/jobs/create"
                                                    onClick={() => {
                                                        setShowingMobileEmployerAiRecJobs(false);
                                                        setShowingNavigationDropdown(false);
                                                    }}
                                                    className={`font-medium ${effectiveTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                                                >
                                                    Post a Job
                                                </Link>
                                            </div>
                                        ) : (
                                            employerAiRecJobsNav.map((job) => (
                                                <Link
                                                    key={job.id}
                                                    href={`${employerAiRecQualityBase}?job_id=${job.id}`}
                                                    onClick={() => {
                                                        setShowingMobileEmployerAiRecJobs(false);
                                                        setShowingNavigationDropdown(false);
                                                    }}
                                                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${effectiveTheme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                                                >
                                                    <span className="font-medium line-clamp-2">{job.title}</span>
                                                </Link>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Common mobile navigation */}
                        <Link
                            href="/projects"
                            className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${window.route.current('projects.*')
                                ? 'text-blue-400 bg-gray-700'
                                : (effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                                }`}
                        >
                            Projects
                        </Link>
                    </div>

                    <div className={`border-t px-4 py-3 ${effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center space-x-3">
                            {(() => {
                                const avatarSrc = resolveProfileImageUrl(user.profile_photo ?? user.profile_picture ?? user.avatar);
                                return avatarSrc ? (
                                    <img
                                        src={avatarSrc}
                                        alt={user.first_name || user.name}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                                        {user.first_name ? user.first_name.charAt(0).toUpperCase() : user.name.charAt(0).toUpperCase()}
                                    </div>
                                );
                            })()}
                            <div>
                                <div className="text-sm font-medium text-gray-100">{user.first_name ? `${user.first_name} ${user.last_name}` : user.name}</div>
                                <div className={`text-xs capitalize ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user.user_type}</div>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1">
                            <Link
                                href={isGigWorker ? '/profile/gig-worker' : (isEmployer ? '/profile/employer' : '/profile')}
                                className={`block px-3 py-2 text-sm rounded-md transition-colors ${effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`}
                            >
                                Profile Settings
                            </Link>
                            <Link
                                href="/messages"
                                className={`block px-3 py-2 text-sm rounded-md transition-colors ${effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`}
                            >
                                Messages
                            </Link>
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`}
                            >
                                Log Out
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className={effectiveTheme === 'dark' ? 'bg-gray-900 border-b border-gray-700' : 'bg-white border-b border-gray-200'}>
                    <div className="mx-auto py-6" style={{ paddingLeft: '0.45in', paddingRight: '0.45in' }}>
                        {header}
                    </div>
                </header>
            )}

            <main className="flex-1">{children}</main>

            {/* MiniChatModal for floating messaging */}
            {showMiniChat && (
                <MiniChatModal
                    ref={miniChatRef}
                    isOpen={showMiniChat}
                    targetUserId={miniChatTargetUserId}
                    onUserIdProcessed={() => {
                        // Reset target user ID after processing
                        setMiniChatTargetUserId(null);
                    }}
                />
            )}

            {/* Security / fraud block modal (premium-looking, red shield theme) */}
            <ErrorModal
                isOpen={showFraudModal}
                onClose={() => setFraudModalDismissed(true)}
                title="Security verification required"
                message={fraudAlertMessage || ''}
                duration={0}
                showCloseButton={true}
                actionButton={{
                    text: 'Verify Identity',
                    onClick: () => {
                        setFraudModalDismissed(true);
                        router.visit('/id-verification');
                    },
                }}
            />

            {/* Global Toast Notifications */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
}
