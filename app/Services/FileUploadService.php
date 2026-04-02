<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FileUploadService
{
    /**
     * Cloudinary service instance
     */
    protected $cloudinaryService;

    /**
     * Constructor
     */
    public function __construct(CloudinaryService $cloudinaryService)
    {
        $this->cloudinaryService = $cloudinaryService;
    }
    /**
     * Maximum number of retry attempts for failed uploads
     */
    private const MAX_RETRIES = 2;

    /**
     * Delay between retry attempts in microseconds (100ms)
     */
    private const RETRY_DELAY = 100000;

    /**
     * File size limits in bytes
     */
    private const SIZE_LIMITS = [
        'image' => 2097152,      // 2MB for images
        'document' => 5242880,   // 5MB for documents
        'default' => 2097152,    // 2MB default
    ];

    /**
     * Allowed MIME types for different file categories
     */
    private const ALLOWED_TYPES = [
        'image' => [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
        ],
        'document' => [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
    ];

    /**
     * Upload a file to Supabase storage with validation and error handling
     *
     * @param UploadedFile $file The file to upload
     * @param string $directory The directory path within the bucket
     * @param array $options Additional options (visibility, metadata, etc.)
     * @return array Result array with success status, URL, path, and error information
     */
    public function uploadToSupabase(UploadedFile $file, string $directory, array $options = []): array
    {
        $startTime = microtime(true);
        $userId = $options['user_id'] ?? null;
        $userType = $options['user_type'] ?? 'unknown';
        
        try {
            // Structured logging with user context and file metadata
            Log::info('FILE_UPLOAD_STARTED', [
                'event' => 'file_upload_started',
                'user_id' => $userId,
                'user_type' => $userType,
                'storage_provider' => 'supabase',
                'file_metadata' => [
                    'original_name' => $file->getClientOriginalName(),
                    'size_mb' => round($file->getSize() / 1048576, 2),
                    'mime_type' => $file->getMimeType(),
                ],
                'storage' => [
                    'directory' => $directory,
                ],
                'timestamp' => now()->toIso8601String(),
            ]);

            // Build intuitive path e.g profiles/123
            $storagePath = trim($directory, '/');
            
            if ($userId !== null) {
                $storagePath .= '/' . $userId;
            }
            
            // If it's ID verification, append side
            if ($directory === 'id_verification') {
                $side = $options['side'] ?? 'front';
                $storagePath .= '/' . $side;
            }

            // Put file in the Supabase S3 bucket
            $path = Storage::disk('supabase')->putFile($storagePath, $file);
            $uploadDuration = round((microtime(true) - $startTime) * 1000, 2);

            if (!$path) {
                Log::warning('FILE_UPLOAD_SUPABASE_EMPTY_FALLBACK_PUBLIC', [
                    'event' => 'file_upload_supabase_fallback',
                    'user_id' => $userId,
                    'user_type' => $userType,
                    'storage' => ['directory' => $storagePath],
                    'timestamp' => now()->toIso8601String(),
                ]);

                $localPath = $file->store($storagePath, 'public');
                $uploadDuration = round((microtime(true) - $startTime) * 1000, 2);

                if (!$localPath) {
                    Log::error('FILE_UPLOAD_FAILED', [
                        'event' => 'file_upload_failed',
                        'user_id' => $userId,
                        'user_type' => $userType,
                        'error_code' => 'UPLOAD_FAILED',
                        'error_message' => 'Supabase putFile empty and public disk store failed',
                        'storage' => [
                            'directory' => $storagePath,
                        ],
                        'performance' => [
                            'duration_ms' => $uploadDuration,
                        ],
                        'timestamp' => now()->toIso8601String(),
                    ]);

                    return [
                        'success' => false,
                        'url' => null,
                        'path' => null,
                        'error' => 'Failed to upload file to storage',
                        'error_code' => 'UPLOAD_FAILED',
                        'disk' => null,
                    ];
                }

                $normPath = str_replace('\\', '/', $localPath);
                $url = '/storage/' . ltrim($normPath, '/');

                Log::info('FILE_UPLOAD_SUCCESS', [
                    'event' => 'file_upload_success',
                    'user_id' => $userId,
                    'user_type' => $userType,
                    'storage_provider' => 'public_fallback',
                    'storage' => [
                        'path' => $normPath,
                        'url' => $url,
                        'directory' => $storagePath,
                    ],
                    'performance' => [
                        'duration_ms' => $uploadDuration,
                    ],
                    'timestamp' => now()->toIso8601String(),
                ]);

                return [
                    'success' => true,
                    'url' => $url,
                    'path' => $normPath,
                    'error' => null,
                    'error_code' => null,
                    'disk' => 'public',
                ];
            }

            // Use relative proxy URL so img src works regardless of APP_URL/host
            $url = '/storage/supabase/' . ltrim($path, '/');

            Log::info('FILE_UPLOAD_SUCCESS', [
                'event' => 'file_upload_success',
                'user_id' => $userId,
                'user_type' => $userType,
                'storage_provider' => 'supabase',
                'storage' => [
                    'path' => $path,
                    'url' => $url,
                    'directory' => $storagePath,
                ],
                'performance' => [
                    'duration_ms' => $uploadDuration,
                ],
                'timestamp' => now()->toIso8601String(),
            ]);

            return [
                'success' => true,
                'url' => $url,
                'path' => $path,
                'error' => null,
                'error_code' => null,
                'disk' => 'supabase',
            ];

        } catch (\Exception $e) {
            $uploadDuration = round((microtime(true) - $startTime) * 1000, 2);
            
            Log::error('FILE_UPLOAD_EXCEPTION', [
                'event' => 'file_upload_exception',
                'user_id' => $userId,
                'user_type' => $userType,
                'error_code' => 'STORAGE_ERROR',
                'error_message' => $e->getMessage(),
                'error_type' => get_class($e),
                'storage' => [
                    'directory' => $directory,
                ],
                'performance' => [
                    'duration_ms' => $uploadDuration,
                ],
                'stack_trace' => $e->getTraceAsString(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return [
                'success' => false,
                'url' => null,
                'path' => null,
                'error' => 'Upload failed: ' . $e->getMessage(),
                'error_code' => 'STORAGE_ERROR',
            ];
        }
    }

    /**
     * Upload a file with automatic retry logic
     *
     * @param UploadedFile $file The file to upload
     * @param string $directory The directory path within the bucket
     * @param int $maxRetries Maximum number of retry attempts
     * @param array $options Additional options
     * @return array Result array with success status, URL, path, and error information
     */
    public function uploadWithRetry(
        UploadedFile $file,
        string $directory,
        int $maxRetries = self::MAX_RETRIES,
        array $options = []
    ): array {
        $attempt = 0;
        $lastResult = null;
        $userId = $options['user_id'] ?? null;
        $userType = $options['user_type'] ?? 'unknown';
        $retryStartTime = microtime(true);

        while ($attempt <= $maxRetries) {
            if ($attempt > 0) {
                $retryDelay = self::RETRY_DELAY * $attempt;
                
                Log::info('FILE_UPLOAD_RETRY', [
                    'event' => 'file_upload_retry',
                    'user_id' => $userId,
                    'user_type' => $userType,
                    'retry_info' => [
                        'attempt' => $attempt,
                        'max_retries' => $maxRetries,
                        'delay_ms' => round($retryDelay / 1000, 2),
                    ],
                    'file_metadata' => [
                        'name' => $file->getClientOriginalName(),
                        'size_mb' => round($file->getSize() / 1048576, 2),
                    ],
                    'previous_error' => $lastResult['error_code'] ?? 'unknown',
                    'timestamp' => now()->toIso8601String(),
                ]);

                // Wait before retrying
                usleep($retryDelay);
            }

            $result = $this->uploadToSupabase($file, $directory, $options);

            if ($result['success']) {
                if ($attempt > 0) {
                    $totalRetryDuration = round((microtime(true) - $retryStartTime) * 1000, 2);
                    
                    Log::info('FILE_UPLOAD_RETRY_SUCCESS', [
                        'event' => 'file_upload_retry_success',
                        'user_id' => $userId,
                        'user_type' => $userType,
                        'retry_info' => [
                            'successful_attempt' => $attempt,
                            'total_attempts' => $attempt + 1,
                            'total_duration_ms' => $totalRetryDuration,
                        ],
                        'file_metadata' => [
                            'name' => $file->getClientOriginalName(),
                            'size_mb' => round($file->getSize() / 1048576, 2),
                        ],
                        'timestamp' => now()->toIso8601String(),
                    ]);
                }
                return $result;
            }

            $lastResult = $result;
            $attempt++;
        }

        $totalRetryDuration = round((microtime(true) - $retryStartTime) * 1000, 2);

        // Log final failure after all retries exhausted
        Log::error('FILE_UPLOAD_RETRY_EXHAUSTED', [
            'event' => 'file_upload_retry_exhausted',
            'user_id' => $userId,
            'user_type' => $userType,
            'retry_info' => [
                'total_attempts' => $attempt,
                'max_retries' => $maxRetries,
                'total_duration_ms' => $totalRetryDuration,
            ],
            'file_metadata' => [
                'name' => $file->getClientOriginalName(),
                'size_mb' => round($file->getSize() / 1048576, 2),
                'mime_type' => $file->getMimeType(),
            ],
            'final_error' => [
                'error_code' => $lastResult['error_code'] ?? 'unknown',
                'error_message' => $lastResult['error'] ?? 'Unknown error',
            ],
            'timestamp' => now()->toIso8601String(),
        ]);

        return $lastResult;
    }

    /**
     * Validate file before upload
     *
     * @param UploadedFile $file The file to validate
     * @param array $rules Validation rules (type, max_size)
     * @return array Validation result with success status and error message
     */
    public function validateFile(UploadedFile $file, array $rules = []): array
    {
        $fileType = $rules['type'] ?? 'default';
        $maxSize = $rules['max_size'] ?? self::SIZE_LIMITS[$fileType] ?? self::SIZE_LIMITS['default'];
        $allowedTypes = $rules['allowed_types'] ?? self::ALLOWED_TYPES[$fileType] ?? [];
        $userId = $rules['user_id'] ?? null;
        $userType = $rules['user_type'] ?? 'unknown';

        Log::info('FILE_VALIDATION_STARTED', [
            'event' => 'file_validation_started',
            'user_id' => $userId,
            'user_type' => $userType,
            'file_metadata' => [
                'name' => $file->getClientOriginalName(),
                'size_bytes' => $file->getSize(),
                'size_mb' => round($file->getSize() / 1048576, 2),
                'mime_type' => $file->getMimeType(),
                'extension' => $file->getClientOriginalExtension(),
            ],
            'validation_rules' => [
                'file_type' => $fileType,
                'max_size_mb' => round($maxSize / 1048576, 2),
                'allowed_mime_types' => $allowedTypes,
            ],
            'timestamp' => now()->toIso8601String(),
        ]);

        // Check file size
        if ($file->getSize() > $maxSize) {
            $maxSizeMB = round($maxSize / 1048576, 2);
            $fileSizeMB = round($file->getSize() / 1048576, 2);

            Log::warning('FILE_VALIDATION_FAILED_SIZE', [
                'event' => 'file_validation_failed',
                'user_id' => $userId,
                'user_type' => $userType,
                'error_code' => 'FILE_TOO_LARGE',
                'file_metadata' => [
                    'name' => $file->getClientOriginalName(),
                    'size_mb' => $fileSizeMB,
                    'max_allowed_mb' => $maxSizeMB,
                    'exceeded_by_mb' => round($fileSizeMB - $maxSizeMB, 2),
                ],
                'timestamp' => now()->toIso8601String(),
            ]);

            return [
                'success' => false,
                'error' => "File size ({$fileSizeMB}MB) exceeds maximum allowed size ({$maxSizeMB}MB)",
                'error_code' => 'FILE_TOO_LARGE',
            ];
        }

        // Check MIME type if allowed types are specified
        if (!empty($allowedTypes) && !in_array($file->getMimeType(), $allowedTypes)) {
            Log::warning('FILE_VALIDATION_FAILED_TYPE', [
                'event' => 'file_validation_failed',
                'user_id' => $userId,
                'user_type' => $userType,
                'error_code' => 'INVALID_FILE_TYPE',
                'file_metadata' => [
                    'name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'allowed_types' => $allowedTypes,
                    'allowed_extensions' => $this->getFileExtensions($allowedTypes),
                ],
                'timestamp' => now()->toIso8601String(),
            ]);

            return [
                'success' => false,
                'error' => 'Invalid file type. Allowed types: ' . implode(', ', $this->getFileExtensions($allowedTypes)),
                'error_code' => 'INVALID_FILE_TYPE',
            ];
        }

        // Check if file is valid
        if (!$file->isValid()) {
            Log::error('FILE_VALIDATION_FAILED_INVALID', [
                'event' => 'file_validation_failed',
                'user_id' => $userId,
                'user_type' => $userType,
                'error_code' => 'INVALID_FILE',
                'file_metadata' => [
                    'name' => $file->getClientOriginalName(),
                    'upload_error' => $file->getError(),
                    'error_message' => $file->getErrorMessage(),
                ],
                'timestamp' => now()->toIso8601String(),
            ]);

            return [
                'success' => false,
                'error' => 'File upload is invalid: ' . $file->getErrorMessage(),
                'error_code' => 'INVALID_FILE',
            ];
        }

        Log::info('FILE_VALIDATION_SUCCESS', [
            'event' => 'file_validation_success',
            'user_id' => $userId,
            'user_type' => $userType,
            'file_metadata' => [
                'name' => $file->getClientOriginalName(),
                'size_mb' => round($file->getSize() / 1048576, 2),
                'mime_type' => $file->getMimeType(),
            ],
            'timestamp' => now()->toIso8601String(),
        ]);

        return [
            'success' => true,
            'error' => null,
            'error_code' => null,
        ];
    }

    /**
     * Generate consistent file path for storage
     *
     * @param int|null $userId User ID for path organization
     * @param string $directory Base directory
     * @param string $filename Original filename
     * @return string Generated file path
     */
    public function generatePath(?int $userId, string $directory, string $filename): string
    {
        // Sanitize filename
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $basename = pathinfo($filename, PATHINFO_FILENAME);
        
        // Remove special characters and spaces
        $sanitizedBasename = Str::slug($basename);
        
        // Generate unique filename with timestamp
        $uniqueFilename = $sanitizedBasename . '_' . time() . '_' . Str::random(8) . '.' . $extension;

        // Build path
        $path = trim($directory, '/');
        
        if ($userId) {
            $path .= '/' . $userId;
        }
        
        $path .= '/' . $uniqueFilename;

        Log::debug('Generated file path', [
            'original' => $filename,
            'generated' => $path,
            'user_id' => $userId,
        ]);

        return $path;
    }

    /**
     * Generate URL for uploaded file
     *
     * @param string $path File path in storage
     * @param array $options Options for URL generation
     * @return string Generated URL
     */
    private function generateUrl(string $path, array $options = []): string
    {
        $disk = $options['disk'] ?? 'r2';
        
        // Check if we should use app proxy URL (for profile pictures during DNS propagation)
        if ($options['use_proxy'] ?? false) {
            if ($disk === 'public') {
                return Storage::disk('public')->url($path);
            }
            return '/r2/' . $path;
        }

        // Use storage disk URL
        return Storage::disk($disk)->url($path);
    }

    /**
     * Get file extensions from MIME types
     *
     * @param array $mimeTypes Array of MIME types
     * @return array Array of file extensions
     */
    private function getFileExtensions(array $mimeTypes): array
    {
        $extensions = [];
        
        foreach ($mimeTypes as $mimeType) {
            switch ($mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    $extensions[] = 'jpg/jpeg';
                    break;
                case 'image/png':
                    $extensions[] = 'png';
                    break;
                case 'image/gif':
                    $extensions[] = 'gif';
                    break;
                case 'image/webp':
                    $extensions[] = 'webp';
                    break;
                case 'application/pdf':
                    $extensions[] = 'pdf';
                    break;
                case 'application/msword':
                    $extensions[] = 'doc';
                    break;
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    $extensions[] = 'docx';
                    break;
            }
        }

        return array_unique($extensions);
    }

    /**
     * Delete a file from Supabase storage
     *
     * @param string $path File path in storage
     * @return bool Success status
     */
    public function deleteFromSupabase(string $path): bool
    {
        try {
            Log::info('Deleting file from Supabase', ['path' => $path]);
            
            $result = Storage::disk('supabase')->delete($path);
            
            if ($result) {
                Log::info('File deleted successfully', ['path' => $path]);
            } else {
                Log::warning('File deletion returned false', ['path' => $path]);
            }
            
            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to delete file from Supabase', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
            
            return false;
        }
    }
}
