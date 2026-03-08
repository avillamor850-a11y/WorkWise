import React from 'react';

/**
 * IDVerifiedBadge Component
 *
 * Displays a verification badge for users with verified ID status.
 *
 * @param {Object} props
 * @param {string} props.size - Size of the badge: 'sm', 'md', or 'lg' (default: 'md')
 * @param {boolean} props.showText - Whether to show the "ID Verified" text (default: true)
 * @param {string} props.variant - 'light' or 'dark' for theme (default: 'light')
 * @returns {JSX.Element}
 */
export default function IDVerifiedBadge({ size = 'md', showText = true, variant = 'light' }) {
    // Icon sizes for different badge sizes
    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6'
    };
    
    // Text sizes for different badge sizes
    const textSizes = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    };
    
    // Padding adjustments for different sizes
    const paddingSizes = {
        sm: 'px-2 py-0.5',
        md: 'px-2.5 py-1',
        lg: 'px-3 py-1.5'
    };
    
    const isDark = variant === 'dark';
    const containerClasses = isDark
        ? 'inline-flex items-center gap-1.5 bg-blue-900/50 text-blue-300 rounded-full border border-blue-700'
        : 'inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200';
    const iconClasses = isDark ? 'text-blue-400' : 'text-blue-600';

    return (
        <div
            className={`${containerClasses} ${paddingSizes[size]}`}
            role="status"
            aria-label="ID Verified"
        >
            {/* Verification Icon - Shield with checkmark */}
            <svg
                className={`${iconSizes[size]} ${iconClasses} flex-shrink-0`}
                fill="currentColor" 
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <path 
                    fillRule="evenodd" 
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                    clipRule="evenodd" 
                />
            </svg>
            
            {/* Badge Text */}
            {showText && (
                <span className={`${textSizes[size]} font-medium whitespace-nowrap`}>
                    ID Verified
                </span>
            )}
        </div>
    );
}
