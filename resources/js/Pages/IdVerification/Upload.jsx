import { useState, useEffect, useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FileUploadInput from '@/Components/FileUploadInput';
import PrimaryButton from '@/Components/PrimaryButton';

export default function Upload() {
    const { auth, flash } = usePage().props;
    const user = auth.user;

    // Upload step state: 'front', 'back', 'complete'
    const [uploadStep, setUploadStep] = useState('front');
    
    // File state
    const [frontImage, setFrontImage] = useState(null);
    const [backImage, setBackImage] = useState(null);
    const [frontImageUrl, setFrontImageUrl] = useState(user.id_front_image || null);
    const [backImageUrl, setBackImageUrl] = useState(user.id_back_image || null);
    
    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadError, setUploadError] = useState(null);
    const [uploadFailed, setUploadFailed] = useState(false);
    
    // Verification status
    const [verificationStatus, setVerificationStatus] = useState(user.id_verification_status || 'unverified');
    const [rejectionReason, setRejectionReason] = useState(user.id_verification_notes || '');
    
    // Computed property to check if uploads are allowed
    const canUpload = useMemo(() => {
        return verificationStatus !== 'pending' && verificationStatus !== 'verified';
    }, [verificationStatus]);
    
    // Determine initial upload step based on existing data
    useEffect(() => {
        if (verificationStatus === 'verified') {
            setUploadStep('complete');
        } else if (frontImageUrl && backImageUrl) {
            setUploadStep('complete');
        } else if (frontImageUrl && !backImageUrl) {
            setUploadStep('back');
        } else {
            setUploadStep('front');
        }
    }, []);

    // Handle front image upload
    const uploadFrontImage = async () => {
        // Check if upload is allowed based on verification status
        if (verificationStatus === 'pending') {
            setUploadError('Your ID is currently under review. Please wait for admin verification.');
            return;
        }
        
        if (verificationStatus === 'verified') {
            setUploadError('Your ID is already verified.');
            return;
        }
        
        if (!frontImage) {
            setUploadError('Please select a front ID image');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatus('Uploading front ID...');
        setUploadError(null);
        setUploadFailed(false);

        const formData = new FormData();
        formData.append('front_image', frontImage);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const uploadUrl = route('id-verification.upload-front');
            console.log('Uploading front ID to:', uploadUrl);

            // Refresh CSRF token before upload
            await fetch('/sanctum/csrf-cookie', {
                credentials: 'same-origin',
            });

            // Get fresh CSRF token
            const csrfToken = document.head.querySelector('meta[name="csrf-token"]');
            
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken ? csrfToken.content : '',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Upload failed');
            }

            // Success
            setFrontImageUrl(data.url);
            setUploadStep('back');
            setUploadStatus('Front ID uploaded successfully!');
            
            // Clear the upload state after a delay
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
                setUploadStatus('');
            }, 1500);

        } catch (error) {
            console.error('Front ID upload error:', error);
            setUploadError(error.message || 'Upload failed. Please check your connection and try again.');
            setUploadFailed(true);
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStatus('');
        }
    };

    // Handle back image upload
    const uploadBackImage = async () => {
        // Check if upload is allowed based on verification status
        if (verificationStatus === 'pending') {
            setUploadError('Your ID is currently under review. Please wait for admin verification.');
            return;
        }
        
        if (verificationStatus === 'verified') {
            setUploadError('Your ID is already verified.');
            return;
        }
        
        if (!backImage) {
            setUploadError('Please select a back ID image');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatus('Uploading back ID...');
        setUploadError(null);
        setUploadFailed(false);

        const formData = new FormData();
        formData.append('back_image', backImage);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            const uploadUrl = route('id-verification.upload-back');
            console.log('Uploading back ID to:', uploadUrl);

            // Refresh CSRF token before upload
            await fetch('/sanctum/csrf-cookie', {
                credentials: 'same-origin',
            });

            // Get fresh CSRF token
            const csrfToken = document.head.querySelector('meta[name="csrf-token"]');
            
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken ? csrfToken.content : '',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Upload failed');
            }

            // Success
            setBackImageUrl(data.url);
            setVerificationStatus('pending');
            setUploadStep('complete');
            setUploadStatus('ID verification submitted successfully!');
            
            // Clear the upload state after a delay
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
                setUploadStatus('');
            }, 1500);

        } catch (error) {
            console.error('Back ID upload error:', error);
            setUploadError(error.message || 'Upload failed. Please check your connection and try again.');
            setUploadFailed(true);
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStatus('');
        }
    };

    // Handle resubmission after rejection
    const handleResubmit = () => {
        // Clear existing images and reset to front upload
        setFrontImage(null);
        setBackImage(null);
        setFrontImageUrl(null);
        setBackImageUrl(null);
        setUploadStep('front');
        setVerificationStatus('unverified');
        setRejectionReason('');
        setUploadError(null);
        setUploadFailed(false);
    };

    // Handle retry for failed uploads
    const handleRetry = () => {
        setUploadFailed(false);
        setUploadError(null);
        
        if (uploadStep === 'front') {
            uploadFrontImage();
        } else if (uploadStep === 'back') {
            uploadBackImage();
        }
    };

    // Handle front image change
    const handleFrontImageChange = (file) => {
        setFrontImage(file);
        setUploadError(null);
        setUploadFailed(false);
        
        // Create preview URL
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            // Don't set frontImageUrl yet - only after successful upload
        }
    };

    // Handle back image change
    const handleBackImageChange = (file) => {
        setBackImage(file);
        setUploadError(null);
        setUploadFailed(false);
        
        // Create preview URL
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            // Don't set backImageUrl yet - only after successful upload
        }
    };

    return (
        <AuthenticatedLayout
            pageTheme="dark"
            header={
                <div>
                    <h2 className="font-semibold text-xl text-white leading-tight">
                        ID Verification
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Upload your valid ID to verify your identity
                    </p>
                </div>
            }
        >
            <Head title="ID Verification" />

            <div className="min-h-screen bg-gray-900">
                <div className="py-6 sm:py-12">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-gray-800 border border-gray-700 overflow-hidden sm:rounded-xl">
                            <div className="p-6 sm:p-8">
                                {/* Status Banners */}
                                {verificationStatus === 'pending' && (
                                    <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-6 mb-6">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-6 w-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <h3 className="text-lg font-semibold text-white">
                                                    Verification Pending
                                                </h3>
                                                <p className="mt-2 text-sm text-gray-200">
                                                    Your ID has been submitted for verification.
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-gray-200">
                                                    Please wait up to 24 hours for identity verification.
                                                </p>
                                                <p className="mt-2 text-xs text-gray-200">
                                                    We'll notify you once the review is complete. You cannot upload new images while your submission is under review.
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Show preview of submitted images */}
                                        {frontImageUrl && backImageUrl && (
                                            <div className="mt-4 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-200 mb-2">Front ID (Submitted)</p>
                                                    <img 
                                                        src={frontImageUrl} 
                                                        alt="Front ID" 
                                                        className="w-full rounded-lg border border-gray-700"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-200 mb-2">Back ID (Submitted)</p>
                                                    <img 
                                                        src={backImageUrl} 
                                                        alt="Back ID" 
                                                        className="w-full rounded-lg border border-gray-700"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {verificationStatus === 'verified' && (
                                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-white">
                                                    Identity Verified!
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-200">
                                                    Your identity has been successfully verified. You now have full access to all platform features.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {verificationStatus === 'rejected' && (
                                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-white">
                                                    ID Verification Rejected
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-200">
                                                    Your ID verification was not approved. {rejectionReason && `Reason: ${rejectionReason}`}
                                                </p>
                                                <p className="mt-2 text-sm text-gray-200">
                                                    Please re-upload your documents with clear, readable images.
                                                </p>
                                                <button
                                                    onClick={handleResubmit}
                                                    className="mt-3 inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 focus:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition ease-in-out duration-150"
                                                >
                                                    Re-upload ID Documents
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Information Banner */}
                                {verificationStatus !== 'verified' && (
                                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-white">Why verify your ID?</h3>
                                                <div className="mt-2 text-sm text-gray-200">
                                                    <ul className="list-disc list-inside space-y-1">
                                                        <li>Build trust with employers</li>
                                                        <li>Increase your chances of getting hired</li>
                                                        <li>Unlock access to premium jobs</li>
                                                        <li>Your information is kept secure and confidential</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {/* Upload Steps - Only show when status is null or 'rejected' */}
                            {canUpload && (
                                <div className="space-y-6">
                                    {/* Step 1: Front ID Upload */}
                                    <div className={`${uploadStep !== 'front' && frontImageUrl ? 'opacity-75' : ''}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-semibold text-white">
                                                Step 1: Upload Front of ID
                                            </h3>
                                            {frontImageUrl && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                                    <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    Completed
                                                </span>
                                            )}
                                        </div>
                                        
                                        <FileUploadInput
                                            variant="dark"
                                            name="front_image"
                                            label=""
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            maxSize={5}
                                            preview="image"
                                            value={frontImage}
                                            previewUrl={frontImageUrl || (frontImage ? URL.createObjectURL(frontImage) : null)}
                                            onChange={handleFrontImageChange}
                                            loading={isUploading && uploadStep === 'front'}
                                            uploadProgress={uploadStep === 'front' ? uploadProgress : 0}
                                            uploadStatus={uploadStep === 'front' ? uploadStatus : ''}
                                            error={uploadStep === 'front' ? uploadError : ''}
                                            uploadFailed={uploadFailed && uploadStep === 'front'}
                                            onRetry={handleRetry}
                                            helpText="Upload a clear photo of the front side of your ID (JPEG, PNG, or WebP, max 5MB)"
                                            compressImages={true}
                                        />
                                        
                                        {!frontImageUrl && frontImage && !isUploading && (
                                            <div className="mt-4">
                                                <PrimaryButton
                                                    onClick={uploadFrontImage}
                                                    disabled={!frontImage || isUploading}
                                                    className="w-full sm:w-auto !bg-blue-600 hover:!bg-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
                                                >
                                                    Upload Front ID
                                                </PrimaryButton>
                                            </div>
                                        )}
                                    </div>

                                    {/* Step 2: Back ID Upload (only shown after front upload) */}
                                    {frontImageUrl && uploadStep !== 'front' && (
                                        <div className={`${uploadStep !== 'back' && backImageUrl ? 'opacity-75' : ''}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-lg font-semibold text-white">
                                                    Step 2: Upload Back of ID
                                                </h3>
                                                {backImageUrl && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                                        <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        Completed
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <FileUploadInput
                                                variant="dark"
                                                name="back_image"
                                                label=""
                                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                                maxSize={5}
                                                preview="image"
                                                value={backImage}
                                                previewUrl={backImageUrl || (backImage ? URL.createObjectURL(backImage) : null)}
                                                onChange={handleBackImageChange}
                                                loading={isUploading && uploadStep === 'back'}
                                                uploadProgress={uploadStep === 'back' ? uploadProgress : 0}
                                                uploadStatus={uploadStep === 'back' ? uploadStatus : ''}
                                                error={uploadStep === 'back' ? uploadError : ''}
                                                uploadFailed={uploadFailed && uploadStep === 'back'}
                                                onRetry={handleRetry}
                                                helpText="Upload a clear photo of the back side of your ID (JPEG, PNG, or WebP, max 5MB)"
                                                compressImages={true}
                                            />
                                            
                                            {!backImageUrl && backImage && !isUploading && (
                                                <div className="mt-4">
                                                    <PrimaryButton
                                                        onClick={uploadBackImage}
                                                        disabled={!backImage || isUploading}
                                                        className="w-full sm:w-auto !bg-blue-600 hover:!bg-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
                                                    >
                                                        Upload Back ID
                                                    </PrimaryButton>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Completion Message */}
                                    {uploadStep === 'complete' && frontImageUrl && backImageUrl && verificationStatus === 'pending' && (
                                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6">
                                            <div className="flex items-center justify-center mb-4">
                                                <svg className="h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-semibold text-white text-center mb-2">
                                                ID Submitted Successfully!
                                            </h3>
                                            <p className="text-sm text-gray-200 text-center mb-4">
                                                Your ID has been submitted for verification.
                                            </p>
                                            <p className="text-sm text-gray-200 text-center">
                                                Please wait up to 24 hours for identity verification. We'll notify you once the review is complete.
                                            </p>
                                            
                                            {/* Preview of uploaded images */}
                                            <div className="mt-6 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-400 mb-2">Front ID</p>
                                                    <img 
                                                        src={frontImageUrl} 
                                                        alt="Front ID" 
                                                        className="w-full rounded-lg border border-gray-700"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-400 mb-2">Back ID</p>
                                                    <img 
                                                        src={backImageUrl} 
                                                        alt="Back ID" 
                                                        className="w-full rounded-lg border border-gray-700"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Verified Status - Show uploaded images */}
                            {verificationStatus === 'verified' && frontImageUrl && backImageUrl && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Your Verified ID Documents</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-400 mb-2">Front ID</p>
                                            <img 
                                                src={frontImageUrl} 
                                                alt="Front ID" 
                                                className="w-full rounded-lg border border-gray-700"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-400 mb-2">Back ID</p>
                                            <img 
                                                src={backImageUrl} 
                                                alt="Back ID" 
                                                className="w-full rounded-lg border border-gray-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Help Section */}
                            <div className="mt-8 border-t border-gray-700 pt-6">
                                <h3 className="text-sm font-medium text-white mb-4">Acceptable Documents</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                                    <div>
                                        <h4 className="font-medium text-white mb-2">Government-issued IDs:</h4>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Philippine Passport</li>
                                            <li>Driver's License</li>
                                            <li>SSS ID</li>
                                            <li>UMID</li>
                                            <li>PhilHealth ID</li>
                                            <li>Voter's ID</li>
                                            <li>PRC ID</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white mb-2">Requirements:</h4>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Clear and readable image</li>
                                            <li>All corners visible</li>
                                            <li>No glare or shadows</li>
                                            <li>Valid and not expired</li>
                                            <li>Maximum file size: 5MB</li>
                                            <li>Accepted formats: JPEG, PNG, WebP</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
            <style>{`
                body {
                    background: #111827;
                    color: #e5e7eb;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
