import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import ErrorModal from '@/Components/ErrorModal';
import {
    DocumentCheckIcon,
    CheckCircleIcon,
    ClockIcon,
    UserIcon,
    BriefcaseIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

export default function OptimizedSign({ auth, contract, userRole, user, waitingForEmployer, employerName, signNotAllowed, signNotAllowedMessage }) {
    const { props } = usePage();
    const flashSuccess = props.flash?.success;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showContractCreatedToast, setShowContractCreatedToast] = useState(!!flashSuccess);
    const [showWaitingModal, setShowWaitingModal] = useState(waitingForEmployer || false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [hasReadContract, setHasReadContract] = useState(false);
    const [signatureStep, setSignatureStep] = useState(1); // 1: Review, 2: Confirm, 3: Sign

    const { data, setData, processing, errors } = useForm({
        full_name: `${user.first_name} ${user.last_name}`,
        browser_info: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            timestamp: new Date().toISOString(),
            screen: {
                width: window.screen.width,
                height: window.screen.height
            }
        }
    });

    // Auto-detect when user has scrolled through contract
    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            if (scrolled > maxScroll * 0.7) { // 70% scrolled
                setHasReadContract(true);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-hide "Contract created" toast after 4 seconds
    useEffect(() => {
        if (!showContractCreatedToast) return;
        const t = setTimeout(() => setShowContractCreatedToast(false), 4000);
        return () => clearTimeout(t);
    }, [showContractCreatedToast]);

    // #region agent log
    useEffect(() => {
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ab23c8'},body:JSON.stringify({sessionId:'ab23c8',location:'OptimizedSign.jsx:mount',message:'OptimizedSign_mounted',data:{hasContract:!!contract},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    }, []);
    // #endregion

    useEffect(() => {
        if (signNotAllowed && signNotAllowedMessage) {
            setErrorMessage(signNotAllowedMessage);
            setShowErrorModal(true);
        }
    }, [signNotAllowed, signNotAllowedMessage]);

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const handleNextStep = () => {
        if (signatureStep < 3) {
            setSignatureStep(signatureStep + 1);
        }
    };

    const handlePrevStep = () => {
        if (signatureStep > 1) {
            setSignatureStep(signatureStep - 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!agreedToTerms) {
            setErrorMessage('Please agree to the contract terms before signing.');
            setShowErrorModal(true);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await axios.post(route('contracts.processSignature', contract.id), data);

            setShowSuccessModal(true);
            setTimeout(() => {
                const redirectUrl = response.data?.redirect_url || route('contracts.show', contract.id);
                router.visit(redirectUrl);
            }, 2500);

        } catch (error) {
            console.error('Contract signing error:', error);

            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ab23c8'},body:JSON.stringify({sessionId:'ab23c8',location:'OptimizedSign.jsx:catch',message:'sign_catch',data:{status:error.response?.status,hasDataMessage:!!error.response?.data?.message},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
            // #endregion

            // Check if this is a "waiting for employer" error
            if (error.response?.data?.waiting_for_employer || error.response?.data?.message?.includes('employer signs first')) {
                setShowWaitingModal(true);
                setIsSubmitting(false);
                return;
            }

            // Handle other errors with better messaging
            let errorMsg = 'Failed to sign contract. Please try again.';

            if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error.response?.status === 500) {
                errorMsg = 'Server error occurred. Please try again or contact support.';
            } else if (error.response?.status === 403) {
                errorMsg = error.response?.data?.message || 'You are not authorized to sign this contract.';
            }

            setErrorMessage(errorMsg);
            setShowErrorModal(true);
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ab23c8'},body:JSON.stringify({sessionId:'ab23c8',location:'OptimizedSign.jsx:setErrorModal',message:'showErrorModal_set',data:{errorMsgLength:errorMsg.length},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            setIsSubmitting(false);
        }
    };

    const ContractSummary = () => (
        <div className={`rounded-xl p-6 mb-6 shadow-sm border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                <DocumentCheckIcon className="w-5 h-5 mr-2 text-blue-600" />
                Contract Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                    <BriefcaseIcon className="w-4 h-4 mr-2 text-gray-500" />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Project:</span>
                    <span className={`ml-2 font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{contract.job?.title}</span>
                </div>
                <div className="flex items-center">
                    <CurrencyDollarIcon className="w-4 h-4 mr-2 text-gray-500" />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Amount:</span>
                    <span className="ml-2 font-medium text-green-600">₱{contract.total_payment?.toLocaleString()}</span>
                </div>
                <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Start Date:</span>
                    <span className={`ml-2 font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{new Date(contract.project_start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>End Date:</span>
                    <span className={`ml-2 font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{new Date(contract.project_end_date).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );

    const StepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step <= signatureStep
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : isDark ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-500'
                        }`}>
                        {step < signatureStep ? (
                            <CheckCircleIcon className="w-5 h-5" />
                        ) : (
                            <span className="text-sm font-medium">{step}</span>
                        )}
                    </div>
                    {step < 3 && (
                        <div className={`w-16 h-0.5 mx-2 ${step < signatureStep ? 'bg-blue-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
                            }`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );

    const StepLabels = () => (
        <div className="flex justify-between mb-8 text-sm">
            <span className={signatureStep >= 1 ? (isDark ? 'text-blue-400' : 'text-blue-600') + ' font-medium' : 'text-gray-500'}>
                Review Contract
            </span>
            <span className={signatureStep >= 2 ? (isDark ? 'text-blue-400' : 'text-blue-600') + ' font-medium' : 'text-gray-500'}>
                Confirm Details
            </span>
            <span className={signatureStep >= 3 ? (isDark ? 'text-blue-400' : 'text-blue-600') + ' font-medium' : 'text-gray-500'}>
                Digital Signature
            </span>
        </div>
    );

    if (showWaitingModal) {
        return (
            <AuthenticatedLayout user={auth.user} pageTheme={isDark ? 'dark' : 'light'} header={<h2 className={`font-semibold text-xl leading-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Contract Signing</h2>}>
                <Head title="Contract Signing - Waiting" />
                <div className={`min-h-screen relative ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                    </div>
                    <div className="py-12 relative z-20">
                        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                            <div className={`overflow-hidden sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="p-8 text-center">
                                    <ClockIcon className="w-16 h-16 mx-auto text-amber-400 mb-4" />
                                    <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        Waiting for Employer Signature
                                    </h2>
                                    <p className={`mb-6 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        {employerName || 'The employer'} needs to sign the contract first before you can proceed.
                                        You'll receive a notification once they've completed their signature.
                                    </p>
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => router.visit(route('contracts.show', contract.id))}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors"
                                        >
                                            View Contract Details
                                        </button>
                                        <button
                                            onClick={() => router.visit(route('contracts.index'))}
                                            className={isDark ? 'block w-full text-center border border-gray-600 text-gray-200 bg-gray-800 hover:bg-gray-700 px-6 py-2 rounded-lg transition-colors' : 'block w-full text-center border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-6 py-2 rounded-lg transition-colors'}
                                        >
                                            Back to Contracts
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            user={auth.user}
            pageTheme={isDark ? 'dark' : 'light'}
            header={<h2 className={`font-semibold text-xl leading-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Digital Contract Signature</h2>}
        >
            <Head title={`Sign Contract - ${contract.contract_id}`} />

            {showContractCreatedToast && flashSuccess && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
                    <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 border border-green-500/50">
                        <CheckCircleIcon className="w-6 h-6 shrink-0" />
                        <p className="text-sm font-medium">{flashSuccess}</p>
                    </div>
                </div>
            )}

            <div className={`min-h-screen relative ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>
                <div className="py-12 relative z-20">
                    <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                        <div className={`overflow-hidden sm:rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="p-8">
                                <div className="mb-8">
                                    <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        Digital Contract Signature
                                    </h1>
                                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                        Contract ID: <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{contract.contract_id}</span>
                                    </p>
                                </div>

                                <StepIndicator />
                                <StepLabels />

                                {signatureStep === 1 && (
                                    <div className="space-y-6">
                                        <ContractSummary />

                                        <div className={`rounded-xl p-6 shadow-sm border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                                            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Contract Terms & Conditions</h3>
                                            <div className={`prose max-w-none text-sm space-y-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                <div>
                                                    <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Scope of Work:</h4>
                                                    <p className="whitespace-pre-line break-all">{contract.scope_of_work}</p>
                                                </div>

                                                <div>
                                                    <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Your Responsibilities:</h4>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {(userRole === 'employer' ? contract.employer_responsibilities : contract.gig_worker_responsibilities)?.map((responsibility, index) => (
                                                            <li key={index}>{responsibility}</li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div>
                                                    <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Communication:</h4>
                                                    <p>Method: {contract.preferred_communication}</p>
                                                    <p>Frequency: {contract.communication_frequency}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                id="readContract"
                                                checked={hasReadContract}
                                                onChange={(e) => setHasReadContract(e.target.checked)}
                                                className={isDark ? 'rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/50' : 'rounded border-gray-300 text-blue-500 focus:ring-blue-500/50'}
                                            />
                                            <label htmlFor="readContract" className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                I have read and understood the contract terms
                                            </label>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleNextStep}
                                                disabled={!hasReadContract}
                                                className={`px-6 py-2 rounded-lg transition-colors ${hasReadContract
                                                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                                        : isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                                                    }`}
                                            >
                                                Continue to Confirmation
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {signatureStep === 2 && (
                                    <div className="space-y-6">
                                        <div className={`rounded-xl p-6 shadow-sm border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                                            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                Confirm Contract Details
                                            </h3>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Contract ID:</span>
                                                    <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{contract.contract_id}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Project:</span>
                                                    <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{contract.job?.title}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Amount:</span>
                                                    <span className="font-medium text-green-600">₱{contract.total_payment?.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Duration:</span>
                                                    <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {new Date(contract.project_start_date).toLocaleDateString()} - {new Date(contract.project_end_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Signing as:</span>
                                                    <span className={`font-medium capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{userRole.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                id="agreeTerms"
                                                checked={agreedToTerms}
                                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                                className={isDark ? 'rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/50' : 'rounded border-gray-300 text-blue-500 focus:ring-blue-500/50'}
                                            />
                                            <label htmlFor="agreeTerms" className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                I agree to the terms and conditions of this contract
                                            </label>
                                        </div>

                                        <div className="flex justify-between">
                                            <button
                                                onClick={handlePrevStep}
                                                className={isDark ? 'px-6 py-2 border border-gray-600 text-gray-200 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors' : 'px-6 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors'}
                                            >
                                                Back to Review
                                            </button>
                                            <button
                                                onClick={handleNextStep}
                                                disabled={!agreedToTerms}
                                                className={`px-6 py-2 rounded-lg transition-colors ${agreedToTerms
                                                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                                        : isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                                                    }`}
                                            >
                                                Proceed to Signature
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {signatureStep === 3 && (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className={`rounded-xl p-6 shadow-sm border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                                            <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                                                Digital Signature
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label htmlFor="full_name" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        Full Legal Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="full_name"
                                                        value={data.full_name}
                                                        onChange={(e) => setData('full_name', e.target.value)}
                                                        className={isDark ? 'w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}
                                                        required
                                                    />
                                                    {errors.full_name && (
                                                        <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                                                    )}
                                                </div>

                                                <div className={`text-xs space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    <p>By typing your name above, you are providing your digital signature.</p>
                                                    <p>Timestamp: {new Date().toLocaleString()}</p>
                                                    <p>IP Address will be recorded for security purposes.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between">
                                            <button
                                                type="button"
                                                onClick={handlePrevStep}
                                                className={isDark ? 'px-6 py-2 border border-gray-600 text-gray-200 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors' : 'px-6 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors'}
                                            >
                                                Back to Confirmation
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting || !data.full_name.trim()}
                                                className={`px-8 py-2 rounded-lg transition-colors flex items-center ${isSubmitting || !data.full_name.trim()
                                                        ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                                                        : 'bg-green-600 hover:bg-green-500 text-white'
                                                    }`}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Signing Contract...
                                                    </>
                                                ) : (
                                                    <>
                                                        <DocumentCheckIcon className="w-5 h-5 mr-2" />
                                                        Sign Contract
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className={`relative w-full max-w-md p-6 border shadow-xl rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="text-center">
                            <CheckCircleIcon className="w-16 h-16 mx-auto text-green-400 mb-4" />
                            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                Contract Signed Successfully!
                            </h3>
                            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Your digital signature has been recorded. Redirecting you now...
                            </p>
                            <div className="flex justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-green-500"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title="Signature failed"
                message={errorMessage}
                duration={0}
            />
        </AuthenticatedLayout>
    );
}
