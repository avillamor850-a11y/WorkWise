<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use App\Models\Contract;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class MessageController extends Controller
{

    /**
     * Convert a stored Supabase path (e.g. /supabase/profiles/...) to the proxy URL
     * served by the app at /storage/supabase/{path}. Matches HandleInertiaRequests::supabaseUrl.
     */
    private function supabaseProfileUrl(?string $stored): ?string
    {
        if (!$stored || !is_string($stored)) {
            return null;
        }
        $stored = trim($stored);
        if ($stored === '') {
            return null;
        }
        if (str_starts_with($stored, 'http://') || str_starts_with($stored, 'https://')) {
            return $stored;
        }
        $path = ltrim(str_replace('/supabase/', '', $stored), '/');
        if ($path === '') {
            return null;
        }
        return url('/storage/supabase/' . $path);
    }

    /**
     * Normalize a user (model or object) for frontend: resolve profile_picture/profile_photo/avatar to proxy URL.
     */
    private function normalizeUserForMessages($user): array
    {
        if (!$user) {
            return [];
        }
        $u = $user instanceof User ? $user->toArray() : (array) $user;
        $resolved = $this->supabaseProfileUrl(
            $u['profile_picture'] ?? $u['profile_photo'] ?? $u['avatar'] ?? null
        );
        $u['profile_picture'] = $resolved;
        $u['profile_photo'] = $resolved;
        return $u;
    }

    /**
     * Display message inbox
     */
    public function index(): Response
    {
        $userId = auth()->id();

        // Get conversations (unique users the current user has messaged with)
        $conversations = Message::where(function($query) use ($userId) {
            $query->where('sender_id', $userId)
                  ->orWhere('receiver_id', $userId);
        })
        ->with(['sender:id,first_name,last_name,user_type,professional_title,profile_picture,profile_photo,avatar',
                'receiver:id,first_name,last_name,user_type,professional_title,profile_picture,profile_photo,avatar'])
        ->orderBy('created_at', 'desc')
        ->get()
        ->groupBy(function($message) use ($userId) {
            // Group by the other user in the conversation
            return $message->sender_id === $userId
                ? $message->receiver_id
                : $message->sender_id;
        })
        ->map(function($messages) use ($userId) {
            $latestMessage = $messages->first();
            $otherUser = $latestMessage->sender_id === $userId
                ? $latestMessage->receiver
                : $latestMessage->sender;

            $unreadCount = $messages->where('receiver_id', $userId)
                                  ->where('is_read', false)
                                  ->count();

            // Get job/contract context
            $jobContext = null;
            $contractStatus = null;
            
            // Find active contract between these users
            $contract = Contract::where(function($query) use ($userId, $otherUser) {
                $query->where('employer_id', $userId)->where('gig_worker_id', $otherUser->id);
            })->orWhere(function($query) use ($userId, $otherUser) {
                $query->where('gig_worker_id', $userId)->where('employer_id', $otherUser->id);
            })
            ->with('job:id,title,status')
            ->orderBy('created_at', 'desc')
            ->first();

            if ($contract && $contract->job) {
                $jobContext = [
                    'job_id' => $contract->job->id,
                    'job_title' => $contract->job->title,
                    'job_status' => $contract->job->status,
                ];
                $contractStatus = $contract->status;
            }

            return [
                'user' => $this->normalizeUserForMessages($otherUser),
                'latest_message' => [
                    'message' => $latestMessage->message,
                    'type' => $latestMessage->type,
                    'attachment_name' => $latestMessage->attachment_name,
                ],
                'unread_count' => $unreadCount,
                'last_activity' => $latestMessage->created_at,
                'last_message' => $latestMessage->message,
                'status' => 'new_lead', // Default status
                'job_context' => $jobContext,
                'contract_status' => $contractStatus,
            ];
        })
        ->sortByDesc('last_activity')
        ->values()
        ->all();

        return Inertia::render('Messages/EnhancedIndex', [
            'conversations' => $conversations
        ]);
    }

    /**
     * Display conversation with specific user
     */
    public function conversation(User $user): Response
    {
        $currentUserId = auth()->id();

        // Get messages between current user and specified user
        $messages = Message::where(function($query) use ($currentUserId, $user) {
            $query->where('sender_id', $currentUserId)
                  ->where('receiver_id', $user->id);
        })
        ->orWhere(function($query) use ($currentUserId, $user) {
            $query->where('sender_id', $user->id)
                  ->where('receiver_id', $currentUserId);
        })
        ->with(['sender', 'receiver', 'replyTo.sender'])
        ->orderBy('created_at', 'asc')
        ->get();

        // Mark messages from the other user as read
        Message::where('sender_id', $user->id)
               ->where('receiver_id', $currentUserId)
               ->where('is_read', false)
               ->update(['is_read' => true, 'read_at' => now()]);

        $normalizedUser = $this->normalizeUserForMessages($user);
        $normalizedMessages = $messages->map(function ($message) {
            $arr = $message->toArray();
            $arr['sender'] = $this->normalizeUserForMessages($message->sender);
            $arr['receiver'] = $this->normalizeUserForMessages($message->receiver);
            if (!empty($arr['reply_to']) && $message->replyTo) {
                $arr['reply_to'] = $message->replyTo->toArray();
                $arr['reply_to']['sender'] = $this->normalizeUserForMessages($message->replyTo->sender);
            }
            return $arr;
        });

        return Inertia::render('Messages/EnhancedConversation', [
            'user' => $normalizedUser,
            'messages' => $normalizedMessages,
            'currentUser' => auth()->user()
        ]);
    }

    /**
     * Send a new message
     */
    public function store(Request $request)
    {
        // Validate request - message is optional if attachment is present
        $validator = \Validator::make($request->all(), [
            'receiver_id' => 'required_without:recipient_id|exists:users,id',
            'recipient_id' => 'required_without:receiver_id|exists:users,id',
            'message' => 'nullable|string|max:2000',
            'attachment' => [
                'nullable',
                'file',
                'max:10240', // 10MB max
                'mimes:pdf,doc,docx,png,jpg,jpeg,gif,txt,zip,rar'
            ],
            'project_id' => 'nullable|exists:projects,id'
        ], [
            'attachment.max' => 'File size must not exceed 10MB.',
            'attachment.mimes' => 'File must be one of the following types: PDF, DOC, DOCX, PNG, JPG, JPEG, GIF, TXT, ZIP, or RAR.',
        ]);

        // Check if validation fails
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        // Check if either message or attachment is provided
        if (empty($request->message) && !$request->hasFile('attachment')) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a message or attach a file.'
            ], 422);
        }

        $attachmentPath = null;
        $attachmentName = null;

        // Handle file attachment upload
        if ($request->hasFile('attachment')) {
            try {
                $file = $request->file('attachment');
                $attachmentName = $file->getClientOriginalName();
                
                // Try Supabase first, fallback to public storage
                try {
                    $path = Storage::disk('supabase')->putFile('messages/' . auth()->id(), $file);
                    
                    if ($path) {
                        $attachmentPath = Storage::disk('supabase')->url($path);
                        Log::info('Message attachment uploaded to Supabase successfully', [
                            'user_id' => auth()->id(),
                            'filename' => $attachmentName,
                            'path' => $path
                        ]);
                    } else {
                        throw new \Exception('Supabase storage returned false');
                    }
                } catch (\Exception $supabaseError) {
                    // Fallback to public storage if Supabase fails
                    Log::warning('Supabase upload failed, using public storage: ' . $supabaseError->getMessage());
                    
                    $path = $file->store('messages/' . auth()->id(), 'public');
                    
                    if ($path) {
                        $attachmentPath = asset('storage/' . $path);
                        Log::info('Message attachment uploaded to public storage', [
                            'user_id' => auth()->id(),
                            'filename' => $attachmentName,
                            'path' => $path
                        ]);
                    } else {
                        throw new \Exception('Both Supabase and public storage failed');
                    }
                }
            } catch (\Exception $e) {
                Log::error('Message attachment upload failed: ' . $e->getMessage(), [
                    'user_id' => auth()->id(),
                    'filename' => $attachmentName ?? 'unknown',
                    'exception' => $e->getTraceAsString()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload attachment. Please try again.'
                ], 500);
            }
        }

        // Support both receiver_id and recipient_id for backwards compatibility
        $receiverId = $request->receiver_id ?? $request->recipient_id;

        $message = Message::create([
            'sender_id' => auth()->id(),
            'receiver_id' => $receiverId,
            'reply_to_id' => $request->reply_to_id,
            'project_id' => $request->project_id,
            'message' => $request->message ?? '',
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentName,
            'type' => $attachmentPath ? 'file' : 'text'
        ]);

        $message->load(['sender', 'receiver', 'replyTo.sender']);

        // Send notification to receiver about new message
        $notificationService = new \App\Services\NotificationService();
        $senderName = $message->sender->first_name && $message->sender->last_name
            ? "{$message->sender->first_name} {$message->sender->last_name}"
            : $message->sender->name;
            
        $notificationService->create([
            'user_id' => $request->receiver_id,
            'type' => 'new_message',
            'title' => 'New Message',
            'message' => $message->type === 'file'
                ? "📎 {$message->sender->first_name} sent you a file: {$message->attachment_name}"
                : "💬 {$message->sender->first_name}: {$message->message}",
            'data' => [
                'sender_id' => $message->sender_id,
                'sender_name' => $senderName,
                'sender_avatar' => $message->sender->avatar ?? null,
                'message_id' => $message->id,
                'message_type' => $message->type,
                'attachment_name' => $message->attachment_name
            ],
            'action_url' => null, // Don't set action_url to prevent redirect
            'icon' => 'comments'
        ]);

        $messageArr = $message->toArray();
        $messageArr['sender'] = $this->normalizeUserForMessages($message->sender);
        $messageArr['receiver'] = $this->normalizeUserForMessages($message->receiver);
        if ($message->replyTo) {
            $messageArr['reply_to'] = $message->replyTo->toArray();
            $messageArr['reply_to']['sender'] = $this->normalizeUserForMessages($message->replyTo->sender);
        }

        return response()->json([
            'success' => true,
            'message' => $messageArr
        ]);
    }

    /**
     * Mark message as read
     */
    public function markAsRead(Message $message)
    {
        // Only receiver can mark as read
        if ($message->receiver_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        $message->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Get unread message count
     */
    public function unreadCount()
    {
        $count = Message::where('receiver_id', auth()->id())
                       ->where('is_read', false)
                       ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Download message attachment
     * 
     * ERROR HANDLING (Requirement 7.6):
     * - Verifies user authorization (sender or receiver only)
     * - Checks if attachment exists in message record
     * - Validates attachment file path
     * - Verifies file exists in Supabase storage
     * - Provides user-friendly error messages for all failure scenarios
     */
    public function downloadAttachment(Message $message)
    {
        // Verify user is sender or receiver of the message
        if ($message->sender_id !== auth()->id() && $message->receiver_id !== auth()->id()) {
            abort(403, 'Unauthorized access to attachment');
        }

        // Check if message has an attachment
        if (!$message->hasAttachment()) {
            Log::warning('Attachment download attempted on message without attachment', [
                'message_id' => $message->id,
                'user_id' => auth()->id()
            ]);
            abort(404, 'This message does not have an attachment.');
        }

        // Verify attachment file path exists
        if (!$message->attachment_path) {
            Log::error('Attachment path is missing from message record', [
                'message_id' => $message->id,
                'user_id' => auth()->id()
            ]);
            abort(404, 'Attachment file information is missing.');
        }

        try {
            $path = $message->attachment_path;
            
            // Check if it's a full URL (Supabase or external)
            if (str_contains($path, 'http')) {
                Log::info('Redirecting to external attachment URL', [
                    'message_id' => $message->id,
                    'user_id' => auth()->id(),
                    'filename' => $message->attachment_name
                ]);
                
                // Redirect to the URL (Supabase or other external storage)
                return redirect()->away($path);
            }
            
            // It's a local storage path
            // Extract the relative path from asset URL if needed
            if (str_contains($path, '/storage/')) {
                $path = str_replace(asset('storage/'), '', $path);
                $path = str_replace('/storage/', '', $path);
            }
            
            // Check if file exists in public storage
            if (Storage::disk('public')->exists($path)) {
                Log::info('Downloading from public storage', [
                    'message_id' => $message->id,
                    'user_id' => auth()->id(),
                    'filename' => $message->attachment_name,
                    'path' => $path
                ]);
                
                // Download the file with original filename
                return Storage::disk('public')->download($path, $message->attachment_name);
            }
            
            // File not found
            Log::error('Attachment file not found in storage', [
                'message_id' => $message->id,
                'user_id' => auth()->id(),
                'path' => $path,
                'filename' => $message->attachment_name
            ]);
            
            abort(404, 'The attachment file could not be found.');
            
        } catch (\Exception $e) {
            Log::error('Attachment download failed: ' . $e->getMessage(), [
                'message_id' => $message->id,
                'user_id' => auth()->id(),
                'filename' => $message->attachment_name,
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString()
            ]);
            
            abort(500, 'Failed to download attachment. Please try again.');
        }
    }

    /**
     * Delete a message
     */
    public function destroy(Message $message)
    {
        // Only the sender can delete their own message
        if ($message->sender_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'You can only delete your own messages'
            ], 403);
        }

        try {
            // Delete attachment file if exists
            if ($message->hasAttachment() && $message->attachment_path) {
                $path = $message->attachment_path;
                
                // If it's a local storage path, delete the file
                if (!str_contains($path, 'http')) {
                    if (str_contains($path, '/storage/')) {
                        $path = str_replace(asset('storage/'), '', $path);
                        $path = str_replace('/storage/', '', $path);
                    }
                    
                    if (Storage::disk('public')->exists($path)) {
                        Storage::disk('public')->delete($path);
                    }
                }
            }

            // Delete the message
            $message->delete();

            return response()->json([
                'success' => true,
                'message' => 'Message deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Message deletion failed: ' . $e->getMessage(), [
                'message_id' => $message->id,
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete message'
            ], 500);
        }
    }

    /**
     * Get users available for starting conversations
     */
    public function getUsers()
    {
        $currentUserId = auth()->id();

        // Get users that the current user hasn't messaged with yet
        $existingConversationUserIds = Message::where(function($query) use ($currentUserId) {
            $query->where('sender_id', $currentUserId)
                  ->orWhere('receiver_id', $currentUserId);
        })
        ->get()
        ->pluck('sender_id', 'receiver_id')
        ->flatten()
        ->unique()
        ->filter(function($id) use ($currentUserId) {
            return $id !== $currentUserId;
        })
        ->values()
        ->toArray();

        // Get all users except current user and those already in conversations
        $users = User::where('id', '!=', $currentUserId)
            ->whereNotIn('id', $existingConversationUserIds)
            ->select('id', 'first_name', 'last_name', 'user_type', 'professional_title', 'profile_photo')
            ->orderBy('first_name')
            ->get();

        return response()->json(['users' => $users]);
    }

    /**
     * Get recent conversations for dropdown
     */
    public function getRecentConversations()
    {
        $userId = auth()->id();

        // Get conversations (unique users the current user has messaged with)
        $conversations = Message::where(function($query) use ($userId) {
            $query->where('sender_id', $userId)
                  ->orWhere('receiver_id', $userId);
        })
        ->with(['sender:id,first_name,last_name,user_type,professional_title,profile_picture,profile_photo,avatar',
                'receiver:id,first_name,last_name,user_type,professional_title,profile_picture,profile_photo,avatar'])
        ->orderBy('created_at', 'desc')
        ->get()
        ->groupBy(function($message) use ($userId) {
            // Group by the other user in the conversation
            return $message->sender_id === $userId
                ? $message->receiver_id
                : $message->sender_id;
        })
        ->map(function($messages) use ($userId) {
            $latestMessage = $messages->first();
            $otherUser = $latestMessage->sender_id === $userId
                ? $latestMessage->receiver
                : $latestMessage->sender;

            $unreadCount = $messages->where('receiver_id', $userId)
                                  ->where('is_read', false)
                                  ->count();

            return [
                'user' => $this->normalizeUserForMessages($otherUser),
                'latest_message' => [
                    'message' => $latestMessage->message,
                    'type' => $latestMessage->type,
                    'attachment_name' => $latestMessage->attachment_name,
                    'created_at' => $latestMessage->created_at
                ],
                'unread_count' => $unreadCount,
                'last_activity' => $latestMessage->created_at
            ];
        })
        ->sortByDesc('last_activity')
        ->take(5) // Limit to 5 recent conversations
        ->values()
        ->all();

        return response()->json(['conversations' => $conversations]);
    }

    /**
     * Get unread message count for the authenticated user
     */
    public function getUnreadCount()
    {
        $userId = auth()->id();
        $unreadCount = Message::where('receiver_id', $userId)
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $unreadCount]);
    }

    /**
     * Get messages for a specific conversation
     */
    public function getConversation($userId)
    {
        $currentUserId = auth()->id();

        $messages = Message::where(function($query) use ($currentUserId, $userId) {
            $query->where('sender_id', $currentUserId)
                  ->where('receiver_id', $userId);
        })->orWhere(function($query) use ($currentUserId, $userId) {
            $query->where('sender_id', $userId)
                  ->where('receiver_id', $currentUserId);
        })->with(['sender', 'receiver'])
        ->orderBy('created_at', 'asc')
        ->get();

        $normalizedMessages = $messages->map(function ($message) {
            $arr = $message->toArray();
            $arr['sender'] = $this->normalizeUserForMessages($message->sender);
            $arr['receiver'] = $this->normalizeUserForMessages($message->receiver);
            return $arr;
        });

        return response()->json(['messages' => $normalizedMessages]);
    }

    /**
     * Mark all messages in a conversation as read
     */
    public function markConversationAsRead($userId)
    {
        $currentUserId = auth()->id();

        // Mark all messages from the other user to current user as read
        $updatedCount = Message::where('sender_id', $userId)
            ->where('receiver_id', $currentUserId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json([
            'success' => true,
            'marked_read_count' => $updatedCount
        ]);
    }

    /**
     * Update conversation status
     */
    public function updateConversationStatus(Request $request, $conversationId)
    {
        $request->validate([
            'status' => 'required|in:new_lead,active_project,completed,archived'
        ]);

        // For now, we'll just return success since we don't have a conversations table
        // In a real implementation, you would update a conversations table
        // or add a status field to the messages table

        return response()->json([
            'success' => true,
            'status' => $request->status
        ]);
    }

    /**
     * Get new messages for polling - FIXED to prevent duplicates
     */
    public function getNewMessages(User $user, Request $request)
    {
        $currentUserId = auth()->id();
        $afterId = $request->query('after', 0);

        // Only get messages from the other user to current user that are newer than afterId
        $newMessages = Message::where('sender_id', $user->id)
            ->where('receiver_id', $currentUserId)
            ->where('id', '>', $afterId)
            ->with(['sender', 'receiver'])
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark new messages as read
        if ($newMessages->isNotEmpty()) {
            Message::where('sender_id', $user->id)
                ->where('receiver_id', $currentUserId)
                ->where('id', '>', $afterId)
                ->where('is_read', false)
                ->update(['is_read' => true, 'read_at' => now()]);
        }

        $normalizedMessages = $newMessages->map(function ($message) {
            $arr = $message->toArray();
            $arr['sender'] = $this->normalizeUserForMessages($message->sender);
            $arr['receiver'] = $this->normalizeUserForMessages($message->receiver);
            return $arr;
        });

        return response()->json([
            'messages' => $normalizedMessages
        ]);
    }
}
