import InputError from '@/Components/InputError';
import GoogleAuthButton from '@/Components/GoogleAuthButton';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function Register({ selectedUserType }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        user_type: selectedUserType || 'gig_worker',
        terms_agreed: false,
        marketing_emails: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const submit = (e) => {
        e.preventDefault();

        // Client-side password confirmation validation
        if (data.password !== data.password_confirmation) {
            alert('Passwords do not match. Please make sure both password fields are identical.');
            return;
        }

        // Client-side password complexity (must match backend rules)
        const hasMinLength = data.password.length >= 8;
        const hasMixedCase = /^(?=.*[a-z])(?=.*[A-Z])/.test(data.password);
        const hasNumber = /\d/.test(data.password);
        const hasSymbol = /[^\w\s]/.test(data.password);
        if (!hasMinLength || !hasMixedCase || !hasNumber || !hasSymbol) {
            alert('Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol (e.g. !@#$%^&*).');
            return;
        }

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    useEffect(() => {
        // Intersection Observer for animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('[data-observer-target]').forEach(el => {
            observer.observe(el);
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    const getTitle = () => {
        return selectedUserType === 'employer' ? 'Sign up to hire talent' : 'Sign up to find work';
    };

    return (
        <>
            <Head title="Register" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="relative min-h-screen bg-white">
                {/* Animated Background Shapes */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

                {/* Enhanced Header */}
                <header className="relative z-10 border-b border-gray-200">
                    <div className="mx-auto" style={{ paddingLeft: '0.45in', paddingRight: '0.45in' }}>
                        <div className="flex justify-between items-center h-16">
                            <Link href="/" className="flex items-center">
                                <span className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-all duration-700">WorkWise</span>
                            </Link>
                            
                            {/* Enhanced Navigation */}
                            <nav className="hidden md:flex items-center space-x-6">
                                <Link href="/about" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                                    About
                                </Link>
                                <Link href="/jobs" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                                    Browse Jobs
                                </Link>
                                <Link href="/help" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                                    Help
                                </Link>
                            </nav>
                            
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-600">Already have an account?</span>
                                <Link
                                    href="/login"
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-all duration-700"
                                >
                                    Sign in
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="relative z-10 max-w-md mx-auto pt-12 pb-16 px-4">
                    <div className="bg-white/70 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20" data-observer-target>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {getTitle()}
                            </h1>
                            <p className="text-gray-600">Join WorkWise today</p>
                        </div>

                        <form onSubmit={submit} className="space-y-6">
                            {/* First Name and Last Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        First name
                                    </label>
                                    <input
                                        id="first_name"
                                        name="first_name"
                                        type="text"
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white"
                                        required
                                    />
                                    <InputError message={errors.first_name} className="mt-1" />
                                </div>

                                <div>
                                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Last name
                                    </label>
                                    <input
                                        id="last_name"
                                        name="last_name"
                                        type="text"
                                        value={data.last_name}
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white"
                                        required
                                    />
                                    <InputError message={errors.last_name} className="mt-1" />
                                </div>
                            </div>

                            {/* Work Email Address */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Work email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white"
                                    required
                                />
                                <InputError message={errors.email} className="mt-1" />
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="At least 8 characters with upper, lower, number & symbol"
                                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-blue-600 transition-colors duration-300"
                                    >
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {showPassword ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs font-medium text-gray-600">Password must have:</p>
                                    <ul className="text-xs text-gray-500 space-y-0.5">
                                        <li className={data.password.length >= 8 ? 'text-green-600' : ''}>
                                            {data.password.length >= 8 ? '✓' : '○'} At least 8 characters
                                        </li>
                                        <li className={/^(?=.*[a-z])(?=.*[A-Z])/.test(data.password) ? 'text-green-600' : ''}>
                                            {/^(?=.*[a-z])(?=.*[A-Z])/.test(data.password) ? '✓' : '○'} Uppercase and lowercase letters
                                        </li>
                                        <li className={/\d/.test(data.password) ? 'text-green-600' : ''}>
                                            {/\d/.test(data.password) ? '✓' : '○'} At least one number
                                        </li>
                                        <li className={/[^\w\s]/.test(data.password) ? 'text-green-600' : ''}>
                                            {/[^\w\s]/.test(data.password) ? '✓' : '○'} At least one symbol (e.g. !@#$%^&*)
                                        </li>
                                    </ul>
                                </div>
                                <InputError message={errors.password} className="mt-1" />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        placeholder="Confirm your password"
                                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-blue-600 transition-colors duration-300"
                                    >
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {showConfirmPassword ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                                <InputError message={errors.password_confirmation} className="mt-1" />
                            </div>

                            {/* Checkboxes */}
                            <div className="space-y-3">
                                {/* <label className="flex items-start">
                                    <input
                                        type="checkbox"
                                        checked={data.marketing_emails}
                                        onChange={(e) => setData('marketing_emails', e.target.checked)}
                                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-300"
                                    />
                                    <span className="ml-3 text-sm text-gray-700">
                                        Send me emails with tips on how to find talent that fits my needs.
                                    </span>
                                </label> */}

                                <label className="flex items-start">
                                    <input
                                        type="checkbox"
                                        checked={data.terms_agreed}
                                        onChange={(e) => setData('terms_agreed', e.target.checked)}
                                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-300"
                                        required
                                    />
                                    <span className="ml-3 text-sm text-gray-700">
                                        Yes, I understand and agree to the{' '}
                                        <Link href="#" className="text-blue-600 hover:text-blue-700 underline transition-all duration-300">
                                            WorkWise Terms of Service
                                        </Link>
                                        , including the{' '}
                                        <Link href="#" className="text-blue-600 hover:text-blue-700 underline transition-all duration-300">
                                            User Agreement
                                        </Link>
                                        {' '}and{' '}
                                        <Link href="#" className="text-blue-600 hover:text-blue-700 underline transition-all duration-300">
                                            Privacy Policy
                                        </Link>
                                        .
                                    </span>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={processing || !data.terms_agreed}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105"
                            >
                                {processing ? 'Creating account...' : 'Create my account'}
                            </button>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Or</span>
                                </div>
                            </div>

                            {/* Google Sign Up Button */}
                            {/* <GoogleAuthButton action="register" className="w-full">
                                Sign up with Google
                            </GoogleAuthButton> */}

                            {/* Login Link */}
                            <div className="text-center">
                                <span className="text-sm text-gray-600">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-all duration-300">
                                        Log in
                                    </Link>
                                </span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
                body {
                    background: white;
                    color: #333;
                    font-family: 'Inter', sans-serif;
                }

                [data-observer-target] {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.8s ease-out, transform 0.8s ease-out;
                }
                [data-observer-target].is-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
            `}</style>
        </>
    );
}
