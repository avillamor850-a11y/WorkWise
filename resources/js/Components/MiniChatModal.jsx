import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

const MiniChatModal = forwardRef(({ isOpen = true, unreadCount = 0, targetUserId = null, onUserIdProcessed = null }, ref) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        openConversation: (userId, userName, userAvatar) => {
            openConversationWithUser(userId, userName, userAvatar);
        },
        expandChat: () => {
            setIsMinimized(false);
        }
    }));

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/messages/recent/conversations');
            setConversations(response.data.conversations || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    // Open conversation with a specific user
    const openConversationWithUser = async (userId, userName = null, userAvatar = null) => {
        try {
            setLoading(true);
            setIsMinimized(false);
            
            // First fetch conversations to see if we have this conversation
            const conversationsResponse = await axios.get('/messages/recent/conversations');
            const allConversations = conversationsResponse.data.conversations || [];
            setConversations(allConversations);
            
            // Find existing conversation
            let conversation = allConversations.find(conv => conv.user.id === parseInt(userId));
            
            if (!conversation) {
                // If conversation doesn't exist, fetch user details and create a placeholder
                try {
                    const userResponse = await axios.get(`/api/users/${userId}`);
                    const userData = userResponse.data;
                    
                    conversation = {
                        user: {
                            id: userData.id,
                            name: userData.name,
                            first_name: userData.first_name || null,
                            last_name: userData.last_name || null,
                            avatar: userData.avatar || userAvatar || null,
                            user_type: userData.user_type
                        },
                        latest_message: { message: 'Start a new conversation', type: 'text' },
                        unread_count: 0,
                        last_activity: new Date().toISOString()
                    };
                } catch (userError) {
                    console.error('Error fetching user details:', userError);
                    // Use provided data as fallback
                    conversation = {
                        user: {
                            id: parseInt(userId),
                            name: userName || 'User',
                            first_name: userName ? userName.split(' ')[0] : null,
                            last_name: userName ? userName.split(' ').slice(1).join(' ') : null,
                            avatar: userAvatar || null,
                            user_type: 'gig_worker'
                        },
                        latest_message: { message: 'Start a new conversation', type: 'text' },
                        unread_count: 0,
                        last_activity: new Date().toISOString()
                    };
                }
            }
            
            setSelectedConversation(conversation);
            await fetchMessages(userId);
        } catch (error) {
            console.error('Error opening conversation:', error);
            // Show error notification or toast
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (userId) => {
        if (!userId) return;
        try {
            setLoading(true);
            const response = await axios.get(`/messages/conversation/${userId}`);
            setMessages(response.data.messages || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    // Send a message
    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachment) || !selectedConversation) return;

        try {
            setSending(true);
            const formData = new FormData();
            formData.append('receiver_id', selectedConversation.user.id);
            formData.append('message', newMessage);
            if (attachment) {
                formData.append('attachment', attachment);
            }

            const response = await axios.post('/messages', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            setMessages(prev => [...prev, response.data.message]);
            setNewMessage('');
            setAttachment(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            // refresh conversations to update unread badges
            fetchConversations();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAttachment(file);
        }
    };

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Get user avatar
    const getUserAvatar = (user, size = 'w-8 h-8') => {
        const avatarSrc = resolveProfileImageUrl(user?.profile_picture ?? user?.profile_photo ?? user?.avatar);
        if (avatarSrc) {
            return (
                <div 
                    className={`bg-center bg-no-repeat aspect-square bg-cover rounded-full ${size} shrink-0`}
                    style={{ backgroundImage: `url(${avatarSrc})` }}
                />
            );
        }
        const displayName = user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.name || 'U');
        return (
            <div className={`bg-blue-600 rounded-full ${size} flex items-center justify-center text-white text-sm font-medium shrink-0`}>
                {displayName.charAt(0).toUpperCase()}
            </div>
        );
    };

    // Toggle minimize
    const toggleMinimize = (e) => {
        e.stopPropagation();
        setIsMinimized(!isMinimized);
    };

    // Mini widget stays mounted; no close handler

    useEffect(() => {
        if (isOpen) {
            fetchConversations();
        }
    }, [isOpen]);

    // Handle targetUserId prop changes from notifications
    useEffect(() => {
        if (targetUserId) {
            openConversationWithUser(targetUserId);
            // Notify parent that userId has been processed
            if (onUserIdProcessed) {
                onUserIdProcessed();
            }
        }
    }, [targetUserId]);

    useEffect(() => {
        if (!isMinimized) {
            scrollToBottom();
        }
    }, [messages, isMinimized]);

    if (!isOpen) return null;

    return (
        <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-lg flex flex-col border border-gray-300 transition-all duration-300 z-[9999] ${
            isMinimized ? 'w-12 h-12' : 'w-96 h-[500px]'
        }`}>
            {/* Header */}
            <header 
                className={`flex items-center gap-3 bg-white px-4 py-3 border-b border-gray-200 cursor-pointer rounded-t-xl ${
                    isMinimized ? 'hidden' : ''
                }`}
                onClick={toggleMinimize}
            >
                <div className="flex-1">
                    <p className="text-[#0e1a13] text-base font-semibold leading-normal">Messages</p>
                    <p className="text-[#6C757D] text-xs">{selectedConversation ? 'Conversation' : 'Conversations'}</p>
                </div>
                <button 
                    onClick={toggleMinimize}
                    className="text-[#6C757D] flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
                >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${isMinimized ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </header>

            {/* Body */}
            <main className={`flex-1 overflow-y-auto ${isMinimized ? 'hidden' : ''}`}>
                {!selectedConversation ? (
                    // Conversations list first
                    <div className="flex flex-col h-full">
                        <div className="p-3 border-b border-gray-100">
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                onChange={() => {}}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                            ) : conversations.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">
                                    <div className="text-3xl mb-2">💬</div>
                                    <p className="text-sm">No conversations yet</p>
                                </div>
                            ) : (
                                conversations.map((conversation) => (
                                    <div
                                        key={conversation.user.id}
                                        onClick={() => {
                                            setSelectedConversation(conversation);
                                            fetchMessages(conversation.user.id);
                                        }}
                                        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                {getUserAvatar(conversation.user, 'w-8 h-8')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {conversation.user.first_name ? `${conversation.user.first_name} ${conversation.user.last_name}` : conversation.user.name}
                                                    </p>
                                                    {conversation.unread_count > 0 && (
                                                        <span className="bg-blue-600 text-white text-xs rounded-full h-5 px-2 flex items-center justify-center">
                                                            {conversation.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1 truncate">
                                                    {conversation.latest_message.type === 'file' ? '📎 Attachment' : conversation.latest_message.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    // Messages of selected conversation
                    <div className="flex flex-col h-full">
                        <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center space-x-3">
                            {getUserAvatar(selectedConversation.user, 'w-8 h-8')}
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {selectedConversation.user.first_name ? `${selectedConversation.user.first_name} ${selectedConversation.user.last_name}` : selectedConversation.user.name}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">{selectedConversation.user.user_type}</p>
                            </div>
                            <div className="ml-auto">
                                <button
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                    onClick={() => setSelectedConversation(null)}
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loading && messages.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">Loading messages...</div>
                            ) : (
                                messages.map((message) => {
                                    const isOwnMessage = message.sender_id !== selectedConversation.user.id;
                                    return (
                                        <div key={message.id} className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : ''}`}>
                                            {!isOwnMessage && getUserAvatar(selectedConversation.user)}
                                            <div className={`flex flex-1 flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                                {message.type === 'file' ? (
                                                    <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white w-full max-w-[280px]">
                                                        <svg className="w-4 h-4 text-[#007BFF]" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                                        </svg>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-medium text-[#0e1a13]">{message.attachment_name}</p>
                                                        </div>
                                                        <a
                                                            href={`/storage/${message.attachment_path}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 text-[#6C757D] hover:text-[#007BFF]"
                                                        >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <p className={`text-sm font-normal leading-normal flex max-w-[280px] rounded-lg px-3 py-2 ${
                                                        isOwnMessage 
                                                            ? 'bg-[#007BFF] text-white rounded-br-none'
                                                            : 'bg-gray-100 text-[#0e1a13] rounded-tl-none'
                                                    }`}>
                                                        {message.message}
                                                    </p>
                                                )}
                                                <p className="text-gray-500 text-xs">
                                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        {/* Message Input */}
                        <div className="bg-white p-3 border-t border-gray-200 rounded-b-xl">
                            <form onSubmit={sendMessage} className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="form-input w-full rounded-full bg-gray-100 border-transparent focus:ring-1 focus:ring-[#007BFF] focus:bg-white text-sm px-4 py-2 pr-10"
                                        placeholder="Type a message..."
                                        disabled={sending}
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-[#007BFF]"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !attachment) || sending}
                                    className="flex-shrink-0 cursor-pointer items-center justify-center rounded-full h-9 w-9 bg-[#007BFF] hover:bg-blue-600 text-white transition-colors flex disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                        </svg>
                                    )}
                                </button>
                            </form>
                            {attachment && (
                                <div className="mt-2 p-2 bg-gray-100 rounded flex items-center justify-between">
                                    <span className="text-xs text-gray-600">📎 {attachment.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAttachment(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Message Input */}
            {/* <footer className={`bg-white p-3 border-t border-gray-200 rounded-b-xl ${isMinimized ? 'hidden' : ''}`}>
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="form-input w-full rounded-full bg-gray-100 border-transparent focus:ring-1 focus:ring-[#007BFF] focus:bg-white text-sm px-4 py-2 pr-10"
                            placeholder="Type a message..."
                            disabled={sending}
                        />
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-[#007BFF]"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !attachment) || sending}
                        className="flex-shrink-0 cursor-pointer items-center justify-center rounded-full h-9 w-9 bg-[#007BFF] hover:bg-blue-600 text-white transition-colors flex disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        )}
                    </button>
                </form>
                
                {attachment && (
                    <div className="mt-2 p-2 bg-gray-100 rounded flex items-center justify-between">
                        <span className="text-xs text-gray-600">📎 {attachment.name}</span>
                        <button
                            type="button"
                            onClick={() => {
                                setAttachment(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </footer> */}

            {/* Minimized View */}
            {isMinimized && (
                <div
                    className="w-full h-full flex items-center justify-center cursor-pointer rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={toggleMinimize}
                >
                    <div className="relative">
                        <svg className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

MiniChatModal.displayName = 'MiniChatModal';

export default MiniChatModal;
