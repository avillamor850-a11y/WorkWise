import { useState, useRef } from 'react';
import InputLabel from './InputLabel';
import InputError from './InputError';

/**
 * Compress an image file before upload
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} maxHeight - Maximum height in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<File>} - Compressed image file
 */
const compressImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        // Skip compression for non-image files or GIFs
        if (!file.type.startsWith('image/') || file.type === 'image/gif') {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob conversion failed'));
                            return;
                        }

                        // Create new file from blob
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });

                        // Only use compressed version if it's actually smaller
                        resolve(compressedFile.size < file.size ? compressedFile : file);
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => {
                reject(new Error('Image loading failed'));
            };
        };

        reader.onerror = () => {
            reject(new Error('File reading failed'));
        };
    });
};

/**
 * FileUploadInput Component
 * 
 * A reusable file upload component with preview, validation, and drag-and-drop support.
 * 
 * @param {string} name - Field name for form submission
 * @param {string} label - Label text to display above input
 * @param {string} accept - File types to accept (e.g., "image/*", ".pdf,.doc")
 * @param {number} maxSize - Maximum file size in MB
 * @param {boolean} required - Whether the field is required
 * @param {string} preview - Preview type: 'image', 'document', or 'none'
 * @param {File|null} value - Current file value
 * @param {string|null} previewUrl - URL for file preview (blob URL or server URL)
 * @param {string} error - Error message to display
 * @param {function} onChange - Callback when file changes (receives File or null)
 * @param {string} helpText - Helper text to display below input
 * @param {boolean} loading - Whether upload is in progress
 * @param {boolean} uploadFailed - Whether the upload failed
 * @param {function} onRetry - Callback when retry button is clicked
 * @param {number} uploadProgress - Upload progress percentage (0-100)
 * @param {string} uploadStatus - Current upload status message
 * @param {boolean} compressImages - Whether to compress images before upload (default: true)
 * @param {string} variant - 'light' | 'dark' for theme (default: 'light')
 */
export default function FileUploadInput({
    name,
    label,
    accept = '*',
    maxSize = 5, // Default 5MB
    required = false,
    preview = 'none',
    value = null,
    previewUrl = null,
    error = '',
    onChange,
    helpText = '',
    loading = false,
    uploadFailed = false,
    onRetry = null,
    uploadProgress = 0,
    uploadStatus = '',
    compressImages = true, // Enable image compression by default
    variant = 'light',
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [isCompressing, setIsCompressing] = useState(false);
    const fileInputRef = useRef(null);

    // Validate file size and type
    const validateFile = (file) => {
        if (!file) return { valid: false, error: 'No file selected' };

        // Check file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSize) {
            return {
                valid: false,
                error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size of ${maxSize}MB`
            };
        }

        // Check file type if accept is specified
        if (accept !== '*') {
            const acceptedTypes = accept.split(',').map(t => t.trim());
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            const mimeType = file.type;

            const isAccepted = acceptedTypes.some(acceptType => {
                // Check if it's a MIME type pattern (e.g., "image/*")
                if (acceptType.includes('*')) {
                    const pattern = acceptType.replace('*', '');
                    return mimeType.startsWith(pattern);
                }
                // Check if it's a file extension (e.g., ".pdf")
                if (acceptType.startsWith('.')) {
                    return fileExtension === acceptType.toLowerCase();
                }
                // Check exact MIME type match
                return mimeType === acceptType;
            });

            if (!isAccepted) {
                return {
                    valid: false,
                    error: `File type not accepted. Please upload: ${accept}`
                };
            }
        }

        return { valid: true, error: '' };
    };

    // Handle file selection
    const handleFileChange = async (file) => {
        if (!file) {
            setValidationError('');
            onChange(null);
            return;
        }

        const validation = validateFile(file);
        if (!validation.valid) {
            setValidationError(validation.error);
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            onChange(null);
            return;
        }

        // Compress image if enabled and file is an image
        let processedFile = file;
        if (compressImages && file.type.startsWith('image/')) {
            try {
                setIsCompressing(true);
                const originalSize = file.size;
                processedFile = await compressImage(file);
                const compressedSize = processedFile.size;
                
                console.log(`Image compressed: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${Math.round((1 - compressedSize / originalSize) * 100)}% reduction)`);
            } catch (error) {
                console.error('Image compression failed, using original:', error);
                // Continue with original file if compression fails
            } finally {
                setIsCompressing(false);
            }
        }

        setValidationError('');
        onChange(processedFile);
    };

    // Handle drag events
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileChange(files[0]);
        }
    };

    // Handle click to open file picker
    const handleClick = () => {
        if (!loading) {
            fileInputRef.current?.click();
        }
    };

    // Handle clear/remove file
    const handleClear = (e) => {
        e.stopPropagation();
        setValidationError('');
        onChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Format file size for display
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Determine if we should show preview (file selected or server preview URL)
    const showPreview = (value || previewUrl) && preview !== 'none';
    const isImage = preview === 'image' && (value?.type?.startsWith('image/') || previewUrl);
    const isDocument = preview === 'document' || (value && !value.type?.startsWith('image/'));

    // Display error (validation error takes precedence over prop error)
    const displayError = validationError || error;
    const isDark = variant === 'dark';

    return (
        <div className="w-full">
            {/* Label */}
            <InputLabel htmlFor={name} value={label + (required ? ' *' : '')} />

            {/* File Input (Hidden) */}
            <input
                ref={fileInputRef}
                id={name}
                name={name}
                type="file"
                accept={accept}
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
                disabled={loading}
            />

            {/* Drop Zone / Upload Area - Mobile Optimized */}
            <div
                onClick={handleClick}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    mt-1 relative border-2 border-dashed rounded-lg p-4 sm:p-6 min-h-[120px] sm:min-h-auto transition-all cursor-pointer
                    ${isDark
                        ? (isDragging ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/20 bg-white/5 hover:border-white/30')
                        : (isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white hover:border-gray-400')
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                    ${displayError ? (isDark ? 'border-red-500/50' : 'border-red-300') : ''}
                `}
            >
                {/* Compressing State */}
                {isCompressing && (
                    <div className={`absolute inset-0 flex items-center justify-center rounded-lg z-10 ${isDark ? 'bg-[#05070A]/90' : 'bg-white bg-opacity-90'}`}>
                        <div className="flex flex-col items-center">
                            <svg className={`animate-spin h-8 w-8 mb-3 ${isDark ? 'text-blue-400' : 'text-indigo-600'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className={isDark ? 'text-sm font-medium text-white' : 'text-sm font-medium text-gray-700'}>
                                Optimizing image...
                            </span>
                        </div>
                    </div>
                )}

                {/* Loading State with Progress */}
                {loading && !isCompressing && (
                    <div className={`absolute inset-0 flex items-center justify-center rounded-lg z-10 ${isDark ? 'bg-[#05070A]/90' : 'bg-white bg-opacity-90'}`}>
                        <div className="flex flex-col items-center w-full px-8">
                            <svg className={`animate-spin h-8 w-8 mb-3 ${isDark ? 'text-blue-400' : 'text-indigo-600'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className={isDark ? 'text-sm font-medium text-white mb-2' : 'text-sm font-medium text-gray-700 mb-2'}>
                                {uploadStatus || 'Uploading...'}
                            </span>
                            
                            {/* Progress Bar */}
                            {uploadProgress > 0 && (
                                <div className="w-full max-w-xs">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={isDark ? 'text-xs text-white/60' : 'text-xs text-gray-600'}>{uploadProgress}%</span>
                                        {value && (
                                            <span className={isDark ? 'text-xs text-white/50' : 'text-xs text-gray-500'}>{formatFileSize(value.size)}</span>
                                        )}
                                    </div>
                                    <div className={isDark ? 'w-full bg-white/20 rounded-full h-2' : 'w-full bg-gray-200 rounded-full h-2'}>
                                        <div 
                                            className={isDark ? 'bg-blue-500 h-2 rounded-full transition-all duration-300' : 'bg-indigo-600 h-2 rounded-full transition-all duration-300'}
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Preview or Upload Prompt */}
                {!showPreview ? (
                    <div className="text-center">
                        <svg
                            className={isDark ? 'mx-auto h-12 w-12 text-white/40' : 'mx-auto h-12 w-12 text-gray-400'}
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                        >
                            <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <div className={isDark ? 'mt-4 flex text-sm text-white/60' : 'mt-4 flex text-sm text-gray-600'}>
                            <span className={isDark ? 'relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300' : 'relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500'}>
                                Click to upload
                            </span>
                            <span className="pl-1">or drag and drop</span>
                        </div>
                        <p className={isDark ? 'text-xs text-white/50 mt-1' : 'text-xs text-gray-500 mt-1'}>
                            {accept !== '*' ? `Accepted: ${accept}` : 'Any file type'} (Max {maxSize}MB)
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        {/* Image Preview - Mobile Optimized */}
                        {isImage && (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className={isDark ? 'h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover border border-white/10 flex-shrink-0' : 'h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover border border-gray-200 flex-shrink-0'}
                            />
                        )}

                        {/* Document Icon - Mobile Optimized */}
                        {isDocument && (
                            <div className={isDark ? 'h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 flex-shrink-0' : 'h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 flex-shrink-0'}>
                                <svg
                                    className={isDark ? 'h-8 w-8 sm:h-10 sm:w-10 text-white/40' : 'h-8 w-8 sm:h-10 sm:w-10 text-gray-400'}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        )}

                        {/* File Info - Mobile Optimized */}
                        <div className="flex-1 min-w-0">
                            <p className={isDark ? 'text-xs sm:text-sm font-medium text-white truncate' : 'text-xs sm:text-sm font-medium text-gray-900 truncate'}>
                                {value?.name || (previewUrl && preview === 'image' ? 'Uploaded image' : '')}
                            </p>
                            <p className={isDark ? 'text-xs text-white/50' : 'text-xs text-gray-500'}>
                                {value?.size ? formatFileSize(value.size) : ''}
                            </p>
                        </div>

                        {/* Clear Button - Mobile Optimized with larger touch target */}
                        <button
                            type="button"
                            onClick={handleClear}
                            className={isDark ? 'flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors' : 'flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors'}
                            title="Remove file"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Retry Button for Failed Uploads - Mobile Optimized */}
            {uploadFailed && onRetry && (
                <div className={isDark ? 'mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 bg-red-500/20 border border-red-500/30 rounded-md p-3' : 'mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 bg-red-50 border border-red-200 rounded-md p-3'}>
                    <div className="flex items-center">
                        <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={isDark ? 'text-sm text-red-400' : 'text-sm text-red-800'}>Upload failed</span>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRetry();
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                        <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry Upload
                    </button>
                </div>
            )}

            {/* Help Text */}
            {helpText && !displayError && (
                <p className={isDark ? 'mt-1 text-xs text-white/50' : 'mt-1 text-xs text-gray-500'}>{helpText}</p>
            )}

            {/* Error Message */}
            <InputError message={displayError} className="mt-1" />
        </div>
    );
}
