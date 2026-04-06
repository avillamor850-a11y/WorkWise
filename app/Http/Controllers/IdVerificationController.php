<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\FileUploadService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class IdVerificationController extends Controller
{
    /**
     * File upload service instance
     */
    protected $fileUploadService;

    public function __construct(
        FileUploadService $fileUploadService,
        protected NotificationService $notificationService
    ) {
        $this->fileUploadService = $fileUploadService;
    }

    /**
     * Fan out in-app notifications to admins; never block ID upload on failure.
     */
    private function notifyAdminsAfterIdVerificationSubmitted(User $user): void
    {
        try {
            $this->notificationService->notifyAdminsIdVerificationSubmitted($user);
        } catch (\Throwable $e) {
            Log::warning('Failed to notify admins of ID verification submission', [
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Upload front ID image (Step 1 of sequential upload)
     */
    public function uploadFront(Request $request)
    {
        set_time_limit(120); // Allow time for large image uploads to Supabase
        $user = Auth::user();

        // Prevent upload if status is pending
        if ($user->id_verification_status === 'pending') {
            Log::warning('ID_VERIFICATION_UPLOAD_BLOCKED_PENDING', [
                'event' => 'id_verification_upload_blocked_pending',
                'user_id' => $user->id,
                'status' => 'pending',
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Your ID is currently under review. Please wait for admin verification.'
            ], 400);
        }

        // Prevent upload if already verified
        if ($user->id_verification_status === 'verified') {
            Log::warning('ID_VERIFICATION_UPLOAD_BLOCKED_VERIFIED', [
                'event' => 'id_verification_upload_blocked_verified',
                'user_id' => $user->id,
                'status' => 'verified',
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Your ID is already verified.'
            ], 400);
        }

        // Validate the front image
        $request->validate([
            'front_image' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120', // 5MB max
        ], [
            'front_image.required' => 'Front side of ID is required.',
            'front_image.image' => 'Front side must be an image file.',
            'front_image.mimes' => 'Front side must be a JPEG, PNG, or WebP image.',
            'front_image.max' => 'Front side image must not exceed 5MB.',
        ]);

        $file = $request->file('front_image');

        Log::info('ID_VERIFICATION_FRONT_UPLOAD_STARTED', [
            'event' => 'id_verification_front_upload_started',
            'user_id' => $user->id,
            'user_type' => $user->user_type,
            'file_metadata' => [
                'name' => $file->getClientOriginalName(),
                'size_mb' => round($file->getSize() / 1048576, 2),
                'mime_type' => $file->getMimeType(),
            ],
            'timestamp' => now()->toIso8601String(),
        ]);

        try {
            // Upload to Cloudinary via FileUploadService with retry logic
            $result = $this->fileUploadService->uploadWithRetry(
                $file,
                'id_verification',
                2, // Max 2 retries
                [
                    'user_id' => $user->id,
                    'user_type' => $user->user_type,
                    'side' => 'front'
                ]
            );

            if (!$result['success']) {
                Log::error('ID_VERIFICATION_FRONT_UPLOAD_FAILED', [
                    'event' => 'id_verification_front_upload_failed',
                    'user_id' => $user->id,
                    'user_type' => $user->user_type,
                    'error_code' => $result['error_code'] ?? 'UPLOAD_FAILED',
                    'error_message' => $result['error'] ?? 'Upload failed',
                    'timestamp' => now()->toIso8601String(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Upload failed. Please check your connection and try again.'
                ], 500);
            }

            // Save front image URL to user record
            $user->id_front_image = $result['url'];
            $user->save();

            Log::info('ID_VERIFICATION_FRONT_UPLOAD_SUCCESS', [
                'event' => 'id_verification_front_upload_success',
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'image_url' => $result['url'],
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => true,
                'url' => $result['url'],
                'message' => 'Front ID uploaded successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('ID_VERIFICATION_FRONT_UPLOAD_EXCEPTION', [
                'event' => 'id_verification_front_upload_exception',
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'error_message' => $e->getMessage(),
                'error_type' => get_class($e),
                'stack_trace' => $e->getTraceAsString(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while uploading your ID. Please try again.'
            ], 500);
        }
    }

    /**
     * Upload back ID image (Step 2 of sequential upload)
     */
    public function uploadBack(Request $request)
    {
        set_time_limit(120); // Allow time for large image uploads to Supabase
        $user = Auth::user();

        // Prevent upload if status is pending
        if ($user->id_verification_status === 'pending') {
            Log::warning('ID_VERIFICATION_UPLOAD_BLOCKED_PENDING', [
                'event' => 'id_verification_upload_blocked_pending',
                'user_id' => $user->id,
                'status' => 'pending',
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Your ID is currently under review. Please wait for admin verification.'
            ], 400);
        }

        // Prevent upload if already verified
        if ($user->id_verification_status === 'verified') {
            Log::warning('ID_VERIFICATION_UPLOAD_BLOCKED_VERIFIED', [
                'event' => 'id_verification_upload_blocked_verified',
                'user_id' => $user->id,
                'status' => 'verified',
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Your ID is already verified.'
            ], 400);
        }

        // Ensure front image exists before allowing back image upload
        if (empty($user->id_front_image)) {
            Log::warning('ID_VERIFICATION_BACK_UPLOAD_NO_FRONT', [
                'event' => 'id_verification_back_upload_no_front',
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Please upload front ID first'
            ], 400);
        }

        // Validate the back image
        $request->validate([
            'back_image' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120', // 5MB max
        ], [
            'back_image.required' => 'Back side of ID is required.',
            'back_image.image' => 'Back side must be an image file.',
            'back_image.mimes' => 'Back side must be a JPEG, PNG, or WebP image.',
            'back_image.max' => 'Back side image must not exceed 5MB.',
        ]);

        $file = $request->file('back_image');

        Log::info('ID_VERIFICATION_BACK_UPLOAD_STARTED', [
            'event' => 'id_verification_back_upload_started',
            'user_id' => $user->id,
            'user_type' => $user->user_type,
            'file_metadata' => [
                'name' => $file->getClientOriginalName(),
                'size_mb' => round($file->getSize() / 1048576, 2),
                'mime_type' => $file->getMimeType(),
            ],
            'timestamp' => now()->toIso8601String(),
        ]);

        try {
            // Upload to Cloudinary via FileUploadService with retry logic
            $result = $this->fileUploadService->uploadWithRetry(
                $file,
                'id_verification',
                2, // Max 2 retries
                [
                    'user_id' => $user->id,
                    'user_type' => $user->user_type,
                    'side' => 'back'
                ]
            );

            if (!$result['success']) {
                Log::error('ID_VERIFICATION_BACK_UPLOAD_FAILED', [
                    'event' => 'id_verification_back_upload_failed',
                    'user_id' => $user->id,
                    'user_type' => $user->user_type,
                    'error_code' => $result['error_code'] ?? 'UPLOAD_FAILED',
                    'error_message' => $result['error'] ?? 'Upload failed',
                    'timestamp' => now()->toIso8601String(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Upload failed. Please check your connection and try again.'
                ], 500);
            }

            // Save back image URL and update verification status to pending
            $user->id_back_image = $result['url'];
            $user->id_verification_status = 'pending';
            $user->save();

            $this->notifyAdminsAfterIdVerificationSubmitted($user);

            Log::info('ID_VERIFICATION_BACK_UPLOAD_SUCCESS', [
                'event' => 'id_verification_back_upload_success',
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'image_url' => $result['url'],
                'verification_status' => 'pending',
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => true,
                'url' => $result['url'],
                'status' => 'pending',
                'message' => 'ID verification submitted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('ID_VERIFICATION_BACK_UPLOAD_EXCEPTION', [
                'event' => 'id_verification_back_upload_exception',
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'error_message' => $e->getMessage(),
                'error_type' => get_class($e),
                'stack_trace' => $e->getTraceAsString(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while uploading your ID. Please try again.'
            ], 500);
        }
    }

    /**
     * Resubmit ID verification after rejection
     */
    public function resubmit(Request $request)
    {
        set_time_limit(120); // Allow time for both image uploads to Supabase
        $user = Auth::user();

        // Validate both images for resubmission
        $request->validate([
            'front_image' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120', // 5MB max
            'back_image' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120',
        ], [
            'front_image.required' => 'Front side of ID is required.',
            'front_image.image' => 'Front side must be an image file.',
            'front_image.mimes' => 'Front side must be a JPEG, PNG, or WebP image.',
            'front_image.max' => 'Front side image must not exceed 5MB.',
            'back_image.required' => 'Back side of ID is required.',
            'back_image.image' => 'Back side must be an image file.',
            'back_image.mimes' => 'Back side must be a JPEG, PNG, or WebP image.',
            'back_image.max' => 'Back side image must not exceed 5MB.',
        ]);

        Log::info('ID_VERIFICATION_RESUBMIT_STARTED', [
            'event' => 'id_verification_resubmit_started',
            'user_id' => $user->id,
            'user_type' => $user->user_type,
            'previous_status' => $user->id_verification_status,
            'timestamp' => now()->toIso8601String(),
        ]);

        try {
            // Clear previous images and notes
            $user->id_front_image = null;
            $user->id_back_image = null;
            $user->id_verification_notes = null;
            $user->save();

            // Upload front image
            $frontFile = $request->file('front_image');
            $frontResult = $this->fileUploadService->uploadWithRetry(
                $frontFile,
                'id_verification',
                2,
                [
                    'user_id' => $user->id,
                    'user_type' => $user->user_type,
                    'side' => 'front'
                ]
            );

            if (!$frontResult['success']) {
                Log::error('ID_VERIFICATION_RESUBMIT_FRONT_FAILED', [
                    'event' => 'id_verification_resubmit_front_failed',
                    'user_id' => $user->id,
                    'error_code' => $frontResult['error_code'] ?? 'UPLOAD_FAILED',
                    'error_message' => $frontResult['error'] ?? 'Upload failed',
                    'timestamp' => now()->toIso8601String(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload front image: ' . ($frontResult['error'] ?? 'Upload failed')
                ], 500);
            }

            // Upload back image
            $backFile = $request->file('back_image');
            $backResult = $this->fileUploadService->uploadWithRetry(
                $backFile,
                'id_verification',
                2,
                [
                    'user_id' => $user->id,
                    'user_type' => $user->user_type,
                    'side' => 'back'
                ]
            );

            if (!$backResult['success']) {
                Log::error('ID_VERIFICATION_RESUBMIT_BACK_FAILED', [
                    'event' => 'id_verification_resubmit_back_failed',
                    'user_id' => $user->id,
                    'error_code' => $backResult['error_code'] ?? 'UPLOAD_FAILED',
                    'error_message' => $backResult['error'] ?? 'Upload failed',
                    'timestamp' => now()->toIso8601String(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload back image: ' . ($backResult['error'] ?? 'Upload failed')
                ], 500);
            }

            // Update user record with new images and set status to pending
            $user->id_front_image = $frontResult['url'];
            $user->id_back_image = $backResult['url'];
            $user->id_verification_status = 'pending';
            $user->save();

            $this->notifyAdminsAfterIdVerificationSubmitted($user);

            Log::info('ID_VERIFICATION_RESUBMIT_SUCCESS', [
                'event' => 'id_verification_resubmit_success',
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'front_image_url' => $frontResult['url'],
                'back_image_url' => $backResult['url'],
                'verification_status' => 'pending',
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'ID resubmitted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('ID_VERIFICATION_RESUBMIT_EXCEPTION', [
                'event' => 'id_verification_resubmit_exception',
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'error_message' => $e->getMessage(),
                'error_type' => get_class($e),
                'stack_trace' => $e->getTraceAsString(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while resubmitting your ID. Please try again.'
            ], 500);
        }
    }

    /**
     * Upload ID images for verification (Legacy method - kept for backward compatibility)
     */
    public function upload(Request $request)
    {
        $user = Auth::user();

        // Validate the request
        $validated = $request->validate([
            'id_type' => 'nullable|string|in:national_id,drivers_license,passport,philhealth_id,sss_id,umid,voters_id,prc_id',
            'id_front_image' => 'required|image|max:5120', // 5MB max
            'id_back_image' => 'required|image|max:5120',
        ], [
            'id_type.required' => 'Please select an ID type.',
            'id_front_image.required' => 'Front side of ID is required.',
            'id_front_image.image' => 'Front side must be an image file.',
            'id_front_image.max' => 'Front side image must not exceed 5MB.',
            'id_back_image.required' => 'Back side of ID is required.',
            'id_back_image.image' => 'Back side must be an image file.',
            'id_back_image.max' => 'Back side image must not exceed 5MB.',
        ]);

        Log::info('ID_VERIFICATION_LEGACY_UPLOAD_STARTED', [
            'event' => 'id_verification_legacy_upload_started',
            'user_id' => $user->id,
            'user_type' => $user->user_type,
            'timestamp' => now()->toIso8601String(),
        ]);

        try {
            // Upload front image
            $frontFile = $request->file('id_front_image');
            $frontResult = $this->fileUploadService->uploadWithRetry(
                $frontFile,
                'id_verification',
                2,
                [
                    'user_id' => $user->id,
                    'user_type' => $user->user_type,
                    'side' => 'front'
                ]
            );

            if (!$frontResult['success']) {
                return back()
                    ->withErrors(['id_front_image' => 'Failed to upload front image. Please try again.'])
                    ->withInput();
            }

            // Upload back image
            $backFile = $request->file('id_back_image');
            $backResult = $this->fileUploadService->uploadWithRetry(
                $backFile,
                'id_verification',
                2,
                [
                    'user_id' => $user->id,
                    'user_type' => $user->user_type,
                    'side' => 'back'
                ]
            );

            if (!$backResult['success']) {
                return back()
                    ->withErrors(['id_back_image' => 'Failed to upload back image. Please try again.'])
                    ->withInput();
            }

            // Update user record with ID information
            $updateData = [
                'id_front_image' => $frontResult['url'],
                'id_back_image' => $backResult['url'],
                'id_verification_status' => 'pending',
                'id_verification_notes' => null, // Clear any previous rejection notes
            ];

            if (isset($validated['id_type'])) {
                $updateData['id_type'] = $validated['id_type'];
            }

            $user->update($updateData);

            $user->refresh();
            $this->notifyAdminsAfterIdVerificationSubmitted($user);

            Log::info('ID_VERIFICATION_LEGACY_UPLOAD_SUCCESS', [
                'event' => 'id_verification_legacy_upload_success',
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'id_type' => $validated['id_type'] ?? null,
                'timestamp' => now()->toIso8601String(),
            ]);

            return redirect()->route('profile.edit')
                ->with('success', 'ID verification submitted successfully! We will review it within 24-48 hours.');

        } catch (\Exception $e) {
            Log::error('ID_VERIFICATION_LEGACY_UPLOAD_EXCEPTION', [
                'event' => 'id_verification_legacy_upload_exception',
                'user_id' => $user->id,
                'user_type' => $user->user_type,
                'error_message' => $e->getMessage(),
                'error_type' => get_class($e),
                'stack_trace' => $e->getTraceAsString(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return back()
                ->withErrors(['upload' => 'An error occurred while uploading your ID. Please try again.'])
                ->withInput();
        }
    }
}


