import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ErrorModal from '@/Components/ErrorModal';
import axios from 'axios';

export default function Sign({ auth, contract, userRole, user, waitingForEmployer, employerName }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showWaitingModal, setShowWaitingModal] = useState(waitingForEmployer || false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    const { data, setData, post, processing, errors } = useForm({
        full_name: `${user.first_name} ${user.last_name}`,
        browser_info: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            timestamp: new Date().toISOString()
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        axios.post(route('contracts.processSignature', contract.id), data)
            .then((response) => {
                setShowSuccessModal(true);
                setTimeout(() => {
                    const redirectUrl = response.data?.redirect_url || route('contracts.show', contract.id);
                    window.location.href = redirectUrl;
                }, 2000);
            })
            .catch((error) => {
                console.error('Contract signing error:', error);

                // Check if this is a "waiting for employer" error
                if (error.response?.data?.waiting_for_employer || error.response?.data?.message?.includes('employer signs first')) {
                    setShowWaitingModal(true);
                    setIsSubmitting(false);
                    return;
                }

                // Handle other errors with better messaging
                let errorMessage = 'Failed to sign contract. Please try again.';

                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.status === 500) {
                    errorMessage = 'Server error occurred. Please try again later or contact support if the problem persists.';
                } else if (error.response?.status === 403) {
                    errorMessage = 'You are not authorized to sign this contract or have already signed it.';
                } else if (error.response?.status === 422) {
                    errorMessage = 'Invalid data provided. Please check your information and try again.';
                }

                setErrorMessage(errorMessage);
                setShowErrorModal(true);
                setIsSubmitting(false);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Contract Signature</h2>}
        >
            <Head title="Sign Contract" />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    {/* Contract Header */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-6">
                        <div className="p-6 bg-green-50 border-b border-green-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-green-800">WorkWise Contract</h1>
                                    <p className="text-green-600">Contract ID: {contract.contract_id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Date: {formatDate(contract.created_at)}</p>
                                    <p className="text-sm text-gray-600">Status: {contract.status.replace('_', ' ').toUpperCase()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contract Details */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-6">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Summary</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-700 mb-2">Project Details</h4>
                                    <p className="text-sm text-gray-600 mb-1"><strong>Title:</strong> {contract.job?.title || 'N/A'}</p>
                                    <p className="text-sm text-gray-600 mb-1"><strong>Total Payment:</strong> {formatCurrency(contract.total_payment)}</p>
                                    <p className="text-sm text-gray-600 mb-1"><strong>Contract Type:</strong> {contract.contract_type}</p>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium text-gray-700 mb-2">Timeline</h4>
                                    <p className="text-sm text-gray-600 mb-1"><strong>Start Date:</strong> {formatDate(contract.project_start_date)}</p>
                                    <p className="text-sm text-gray-600 mb-1"><strong>End Date:</strong> {formatDate(contract.project_end_date)}</p>
                                    <p className="text-sm text-gray-600 mb-1"><strong>Duration:</strong> {contract.bid?.estimated_days || 'N/A'} days</p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h4 className="font-medium text-gray-700 mb-2">Parties</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded">
                                        <p className="font-medium text-gray-700">Employer</p>
                                        <p className="text-sm text-gray-600">{contract.employer?.first_name} {contract.employer?.last_name}</p>
                                        <p className="text-sm text-gray-600">{contract.employer?.email}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <p className="font-medium text-gray-700">Gig Worker</p>
                                        <p className="text-sm text-gray-600">{contract.gigWorker?.first_name} {contract.gigWorker?.last_name}</p>
                                        <p className="text-sm text-gray-600">{contract.gigWorker?.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h4 className="font-medium text-gray-700 mb-2">Scope of Work</h4>
                                <div className="bg-gray-50 p-4 rounded">
                                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">{contract.scope_of_work}</pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signature Section */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Digital Signature</h3>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h4 className="text-sm font-medium text-blue-800">
                                            Ready to Sign as {userRole === 'employer' ? 'Employer' : 'Gig Worker'}
                                        </h4>
                                        <p className="text-sm text-blue-700 mt-1">
                                            By clicking "Confirm and Sign," you agree to the terms of this contract.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Type your full name
                                    </label>
                                    <input
                                        type="text"
                                        id="full_name"
                                        value={data.full_name}
                                        onChange={(e) => setData('full_name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                        required
                                        disabled={processing || isSubmitting}
                                    />
                                    {errors.full_name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                                    )}
                                </div>

                                {/* Live Preview */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Signature Preview
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                                        <div 
                                            className="text-3xl text-gray-700"
                                            style={{ fontFamily: 'Dancing Script, cursive' }}
                                        >
                                            {data.full_name || 'Your signature will appear here'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => window.history.back()}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        disabled={processing || isSubmitting}
                                    >
                                        Back
                                    </button>
                                    
                                    <button
                                        type="submit"
                                        disabled={processing || isSubmitting || !data.full_name.trim()}
                                        className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing || isSubmitting ? 'Signing...' : 'Confirm and Sign'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Contract Signed Successfully!</h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500">
                                    Your signature has been recorded. Redirecting...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Waiting for Employer Modal */}
            {showWaitingModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Waiting for Employer Signature</h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500">
                                    You cannot sign this contract until {employerName || 'the employer'} signs first.
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Please wait for the employer to review and sign the contract before proceeding.
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    You will be notified once the employer has signed the contract.
                                </p>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={() => setShowWaitingModal(false)}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    I Understand
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title="Contract signing error"
                message={errorMessage}
            />
        </AuthenticatedLayout>
    );
}
