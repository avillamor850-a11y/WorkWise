import InputError from '@/Components/InputError';
import GoogleAuthButton from '@/Components/GoogleAuthButton';
import WorkWiseNavBrand from '@/Components/WorkWiseNavBrand';
import { useTheme } from '@/Contexts/ThemeContext';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function Register({ selectedUserType }) {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
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
        const targets = document.querySelectorAll('[data-observer-target]');
        // #region agent log
        fetch('http://127.0.0.1:7560/ingest/bdc59389-da51-4b88-b2c4-11c7655b3c93',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'86ef92'},body:JSON.stringify({sessionId:'86ef92',location:'Register.jsx:observer effect',message:'observer effect run',data:{targetCount:targets.length},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});
        // #endregion
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.1 });

        targets.forEach(el => observer.observe(el));

        requestAnimationFrame(() => {
            targets.forEach(el => el.classList.add('is-visible'));
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/bdc59389-da51-4b88-b2c4-11c7655b3c93',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'86ef92'},body:JSON.stringify({sessionId:'86ef92',location:'Register.jsx:rAF',message:'rAF added is-visible',data:{count:targets.length},timestamp:Date.now(),hypothesisId:'H1,H5'})}).catch(()=>{});
            // #endregion
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const card = document.querySelector('[data-observer-target]');
        const hasVisible = card ? card.classList.contains('is-visible') : false;
        // #region agent log
        fetch('http://127.0.0.1:7560/ingest/bdc59389-da51-4b88-b2c4-11c7655b3c93',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'86ef92'},body:JSON.stringify({sessionId:'86ef92',location:'Register.jsx:theme effect',message:'theme changed',data:{theme,hasCard:!!card,hasVisible},timestamp:Date.now(),hypothesisId:'H2,H3'})}).catch(()=>{});
        // #endregion
        if (card && !hasVisible) {
            card.classList.add('is-visible');
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/bdc59389-da51-4b88-b2c4-11c7655b3c93',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'86ef92'},body:JSON.stringify({sessionId:'86ef92',location:'Register.jsx:theme effect',message:'reapplied is-visible',data:{theme},timestamp:Date.now(),runId:'post-fix'})}).catch(()=>{});
            // #endregion
        }
    }, [theme]);

    const getTitle = () => {
        return selectedUserType === 'employer' ? 'Sign up to hire talent' : 'Sign up to find work';
    };

    return (
        <>
            <Head title="Register" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Animated Background Shapes */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

                {/* Enhanced Header */}
                <header className={`relative z-10 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="mx-auto" style={{ paddingLeft: '0.45in', paddingRight: '0.45in' }}>
                        <div className="flex justify-between items-center h-16">
                            <Link href="/" className="flex items-center">
                                <WorkWiseNavBrand />
                            </Link>
                            
                            {/* Enhanced Navigation */}
                            <nav className="hidden md:flex items-center space-x-6">
                                <Link href="/about" className={`text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'}`}>
                                    About
                                </Link>
                                <Link href="/jobs" className={`text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'}`}>
                                    Browse Jobs
                                </Link>
                                <Link href="/help" className={`text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'}`}>
                                    Help
                                </Link>
                            </nav>
                            
                            <div className="flex items-center space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                    className={`p-2 rounded-lg transition-colors duration-200 ${isDark ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                                >
                                    {isDark ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                        </svg>
                                    )}
                                </button>
                                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Already have an account?</span>
                                <Link
                                    href="/login"
                                    className={`text-sm font-medium transition-all duration-700 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                >
                                    Sign in
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="relative z-10 max-w-md mx-auto pt-12 pb-16 px-4">
                    <div className={`backdrop-blur-sm p-8 rounded-xl shadow-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} data-observer-target>
                        <div className="text-center mb-8">
                            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                {getTitle()}
                            </h1>
                            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Join WorkWise today</p>
                        </div>

                        <form onSubmit={submit} className="space-y-6">
                            {/* First Name and Last Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="first_name" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        First name
                                    </label>
                                    <input
                                        id="first_name"
                                        name="first_name"
                                        type="text"
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-400'}`}
                                        required
                                    />
                                    <InputError message={errors.first_name} className="mt-1" />
                                </div>

                                <div>
                                    <label htmlFor="last_name" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Last name
                                    </label>
                                    <input
                                        id="last_name"
                                        name="last_name"
                                        type="text"
                                        value={data.last_name}
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-400'}`}
                                        required
                                    />
                                    <InputError message={errors.last_name} className="mt-1" />
                                </div>
                            </div>

                            {/* Work Email Address */}
                            <div>
                                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Work email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-400'}`}
                                    required
                                />
                                <InputError message={errors.email} className="mt-1" />
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
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
                                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-400'}`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-blue-400 transition-colors duration-300"
                                    >
                                        <svg className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {showPassword ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Password must have:</p>
                                    <ul className={`text-xs space-y-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <li className={data.password.length >= 8 ? 'text-green-400' : ''}>
                                            {data.password.length >= 8 ? '✓' : '○'} At least 8 characters
                                        </li>
                                        <li className={/^(?=.*[a-z])(?=.*[A-Z])/.test(data.password) ? 'text-green-400' : ''}>
                                            {/^(?=.*[a-z])(?=.*[A-Z])/.test(data.password) ? '✓' : '○'} Uppercase and lowercase letters
                                        </li>
                                        <li className={/\d/.test(data.password) ? 'text-green-400' : ''}>
                                            {/\d/.test(data.password) ? '✓' : '○'} At least one number
                                        </li>
                                        <li className={/[^\w\s]/.test(data.password) ? 'text-green-400' : ''}>
                                            {/[^\w\s]/.test(data.password) ? '✓' : '○'} At least one symbol (e.g. !@#$%^&*)
                                        </li>
                                    </ul>
                                </div>
                                <InputError message={errors.password} className="mt-1" />
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="password_confirmation" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
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
                                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-400'}`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-blue-400 transition-colors duration-300"
                                    >
                                        <svg className={`h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                <label className="flex items-start">
                                    <input
                                        type="checkbox"
                                        checked={data.terms_agreed}
                                        onChange={(e) => setData('terms_agreed', e.target.checked)}
                                        className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded transition-all duration-300 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
                                        required
                                    />
                                    <span className={`ml-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Yes, I understand and agree to the{' '}
                                        <Link href="#" className={`underline transition-all duration-300 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                                            WorkWise Terms of Service
                                        </Link>
                                        , including the{' '}
                                        <Link href="#" className={`underline transition-all duration-300 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                                            User Agreement
                                        </Link>
                                        {' '}and{' '}
                                        <Link href="#" className={`underline transition-all duration-300 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
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
                                className={`w-full text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 ${isDark ? 'disabled:bg-gray-600 disabled:text-gray-400' : 'disabled:bg-gray-200 disabled:text-gray-500'}`}
                            >
                                {processing ? 'Creating account...' : 'Create my account'}
                            </button>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className={`w-full border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className={`px-2 ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>Or</span>
                                </div>
                            </div>

                            {/* Login Link */}
                            <div className="text-center">
                                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Already have an account?{' '}
                                    <Link href="/login" className={`font-medium transition-all duration-300 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                                        Log in
                                    </Link>
                                </span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
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
