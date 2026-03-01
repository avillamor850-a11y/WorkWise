import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

export default function MessagesPageModal({ isOpen, onClose, initialUserId = null }) {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Fetch conversations
    const fetchConversations = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/messages/recent/conversations');
            setConversations(response.data.conversations || []);

            // Auto-select conversation if initialUserId provided
            if (initialUserId) {
                const conversation = response.data.conversations?.find(
                    conv => conv.user.id === parseInt(initialUserId)
                );
                if (conversation) {
                    setSelectedConversation(conversation);
                    fetchMessages(conversation.user.id);
                }
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch messages for a specific user
    const fetchMessages = async (userId) => {
        try {
            const response = await axios.get(`/messages/conversation/${userId}`);
            setMessages(response.data.messages || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
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

            // Refresh conversations to update unread counts
            fetchConversations();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    // Handle conversation selection
    const handleConversationSelect = (conversation) => {
        setSelectedConversation(conversation);
        fetchMessages(conversation.user.id);
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
    const getUserAvatar = (user) => {
        const avatarSrc = resolveProfileImageUrl(user?.profile_picture ?? user?.profile_photo ?? user?.avatar);
        if (avatarSrc) {
            return (
                <div 
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-12 w-12"
                    style={{ backgroundImage: `url(${avatarSrc})` }}
                />
            );
        }
        return (
            <div className="bg-blue-600 rounded-full h-12 w-12 flex items-center justify-center text-white text-lg font-medium">
                {user.first_name ? user.first_name.charAt(0).toUpperCase() : user.name.charAt(0).toUpperCase()}
            </div>
        );
    };

    const getSmallUserAvatar = (user) => {
        const avatarSrc = resolveProfileImageUrl(user?.profile_picture ?? user?.profile_photo ?? user?.avatar);
        if (avatarSrc) {
            return (
                <div 
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-10 shrink-0"
                    style={{ backgroundImage: `url(${avatarSrc})` }}
                />
            );
        }
        return (
            <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white text-sm font-medium shrink-0">
                {user.first_name ? user.first_name.charAt(0).toUpperCase() : user.name.charAt(0).toUpperCase()}
            </div>
        );
    };

    useEffect(() => {
        if (isOpen) {
            fetchConversations();
        }
    }, [isOpen, initialUserId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#F8F9FA]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="absolute inset-4 bg-white rounded-xl shadow-2xl flex overflow-hidden transform transition-all">
                {/* Conversations List */}
                <div className="flex-1 bg-white border-r border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Messages</h2>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto h-full">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                Loading conversations...
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="text-4xl mb-2">💬</div>
                                <p>No conversations yet</p>
                            </div>
                        ) : (
                            conversations.map((conversation) => (
                                <div
                                    key={conversation.user.id}
                                    onClick={() => handleConversationSelect(conversation)}
                                    className={`flex items-center gap-4 p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                                        selectedConversation?.user.id === conversation.user.id
                                            ? 'bg-blue-50'
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="relative">
                                        {getUserAvatar(conversation.user)}
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[#0e1a13] text-base font-semibold leading-normal">
                                            {conversation.user.first_name ? `${conversation.user.first_name} ${conversation.user.last_name}` : conversation.user.name}
                                        </p>
                                        <p className="text-[#6C757D] text-sm truncate">
                                            {conversation.latest_message.type === 'file' ? (
                                                <>📎 {conversation.latest_message.attachment_name}</>
                                            ) : (
                                                conversation.latest_message.message.length > 50
                                                    ? conversation.latest_message.message.substring(0, 50) + '...'
                                                    : conversation.latest_message.message
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-[#6C757D]">
                                            {new Date(conversation.last_activity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {conversation.unread_count > 0 && (
                                            <span className="inline-block bg-[#007BFF] text-white text-xs font-bold rounded-full px-2 py-1 mt-1">
                                                {conversation.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex flex-col h-full w-2/3">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <header className="flex items-center gap-4 bg-white px-6 py-4 border-b border-[#E9F5FF]">
                                <div className="relative">
                                    {getUserAvatar(selectedConversation.user)}
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[#0e1a13] text-lg font-semibold leading-normal">
                                        {selectedConversation.user.first_name ? `${selectedConversation.user.first_name} ${selectedConversation.user.last_name}` : selectedConversation.user.name}
                                    </p>
                                    <p className="text-[#6C757D] text-sm">Online</p>
                                </div>
                                <button className="text-[#6C757D] flex items-center justify-center p-2 rounded-full hover:bg-gray-100">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                </button>
                            </header>

                            {/* Messages */}
                            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="text-center my-4">
                                    <span className="text-xs text-[#6C757D] bg-[#F8F9FA] px-2">Today</span>
                                </div>
                                
                                {messages.map((message) => {
                                    const isOwnMessage = message.sender_id !== selectedConversation.user.id;
                                    return (
                                        <div key={message.id} className={`flex items-end gap-3 p-4 ${isOwnMessage ? 'justify-end' : ''}`}>
                                            {!isOwnMessage && getSmallUserAvatar(message.sender)}
                                            
                                            <div className={`flex flex-1 flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-baseline gap-2">
                                                    <p className={`text-[#0e1a13] text-[13px] font-medium leading-normal ${isOwnMessage ? 'text-right' : ''}`}>
                                                        {isOwnMessage ? 'You' : (selectedConversation.user.first_name ? `${selectedConversation.user.first_name} ${selectedConversation.user.last_name}` : selectedConversation.user.name)}
                                                    </p>
                                                    <p className="text-[#6C757D] text-xs">
                                                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                
                                                {message.type === 'file' ? (
                                                    <div className={`flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-white max-w-[300px] ${isOwnMessage ? 'bg-[#E9F5FF]' : 'bg-white'}`}>
                                                        <svg className="w-5 h-5 text-[#007BFF]" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                                        </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-[#0e1a13]">{message.attachment_name}</p>
                                                            <p className="text-xs text-[#6C757D]">
                                                                {message.attachment_size ? `${(message.attachment_size / 1024 / 1024).toFixed(1)} MB` : ''}
                                                            </p>
                                                        </div>
                                                        <a
                                                            href={`/storage/${message.attachment_path}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-[#6C757D] hover:text-[#007BFF]"
                                                        >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <p className={`text-base font-normal leading-normal flex max-w-[420px] rounded-lg px-4 py-3 shadow-sm ${
                                                        isOwnMessage 
                                                            ? 'bg-[#E9F5FF] text-[#0e1a13] rounded-tr-none'
                                                            : 'bg-white text-[#0e1a13] rounded-tl-none'
                                                    }`}>
                                                        {message.message}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            {isOwnMessage && getSmallUserAvatar({ first_name: 'You', avatar: null })}
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </main>

                            {/* Message Input */}
                            <footer className="bg-white p-4 border-t border-[#E9F5FF]">
                                <div className="flex gap-3 pb-3 overflow-x-auto">
                                    <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-gray-100 hover:bg-gray-200 pl-4 pr-4 transition-colors">
                                        <p className="text-[#0e1a13] text-sm font-medium leading-normal">Send an Offer</p>
                                    </button>
                                    <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-gray-100 hover:bg-gray-200 pl-4 pr-4 transition-colors">
                                        <p className="text-[#0e1a13] text-sm font-medium leading-normal">Request Payment</p>
                                    </button>
                                    <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-gray-100 hover:bg-gray-200 pl-4 pr-4 transition-colors">
                                        <p className="text-[#0e1a13] text-sm font-medium leading-normal">Schedule a Meeting</p>
                                    </button>
                                </div>
                                
                                <form onSubmit={sendMessage} className="flex items-center gap-4">
                                    <div className="flex flex-col min-w-40 h-12 flex-1">
                                        <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0e1a13] focus:outline-0 focus:ring-1 focus:ring-[#007BFF] border-gray-200 bg-white h-full placeholder:text-[#6C757D] px-4 text-base font-normal leading-normal"
                                                placeholder="Type your message..."
                                                disabled={sending}
                                            />
                                            <div className="flex items-center justify-center pr-2">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center justify-center p-2 text-[#6C757D] hover:text-[#007BFF] rounded-full"
                                                >
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        {attachment && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded flex items-center justify-between">
                                                <span className="text-sm text-gray-600">📎 {attachment.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAttachment(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={(!newMessage.trim() && !attachment) || sending}
                                        className="min-w-[96px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-[#007BFF] hover:bg-blue-600 text-white text-base font-medium leading-normal transition-colors flex gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="truncate">{sending ? 'Sending...' : 'Send'}</span>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                        </svg>
                                    </button>
                                </form>
                            </footer>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <div className="text-6xl mb-4">💬</div>
                                <p className="text-xl font-medium mb-2">Select a conversation</p>
                                <p className="text-sm">Choose a conversation from the list to start messaging</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
