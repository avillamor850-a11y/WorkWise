import React, { useEffect } from 'react';

const SuccessModal = ({ isOpen, onClose, message = 'Success!', duration = 3000, showProcessing = true, isPaymentSuccess }) => {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isOpen, duration, onClose]);

    if (!isOpen) return null;

    // When isPaymentSuccess is explicitly false, never show payment UI. When undefined, infer from message.
    const isPaymentMessage = isPaymentSuccess === undefined
        ? (message.toLowerCase().includes('payment') || message.toLowerCase().includes('sent to'))
        : isPaymentSuccess;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

                {/* Modal panel */}
                <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${isPaymentMessage ? 'sm:max-w-md' : 'sm:max-w-sm'} sm:w-full`}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${isPaymentMessage ? 'bg-green-100' : 'bg-green-100'} sm:mx-0 sm:h-10 sm:w-10`}>
                                {isPaymentMessage ? (
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                ) : (
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    {isPaymentMessage ? 'Payment Sent Successfully!' : 'Success!'}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        {message}
                                    </p>
                                    {isPaymentMessage && (
                                        <div className="mt-3 p-3 bg-green-50 rounded-md">
                                            <div className="flex items-center">
                                                <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-sm text-green-700 font-medium">
                                                    The gig worker has been notified of the payment.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {showProcessing && (
                        <div className="bg-green-50 px-4 py-3 sm:px-6 sm:flex sm:justify-center">
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                                <span className="text-sm text-green-600">Processing...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;
