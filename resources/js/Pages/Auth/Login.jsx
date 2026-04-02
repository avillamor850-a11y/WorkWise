import InputError from '@/Components/InputError';
import GoogleAuthButton from '@/Components/GoogleAuthButton';
import WorkWiseNavBrand from '@/Components/WorkWiseNavBrand';
import { useTheme } from '@/Contexts/ThemeContext';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';

export default function Login({ status, canResetPassword }) {
    const { flash } = usePage().props;
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isSupabaseProcessing, setIsSupabaseProcessing] = useState(false);

    // #region agent log
    useEffect(() => {
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d97751'},body:JSON.stringify({sessionId:'d97751',hypothesisId:'H1,H5',location:'Login.jsx:mount',message:'Login component mounted',data:{},timestamp:Date.now()})}).catch(()=>{});
    }, []);
    // #endregion

    const submit = async (e) => {
        e.preventDefault();
        setIsSupabaseProcessing(true);
        clearErrors();

        const TEST_EMAILS = ['example@gmail.com', 'example.employer@gmail.com'];
        const useLaravelOnly = TEST_EMAILS.includes((data.email || '').toLowerCase());

        // #region agent log
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a40f2b'},body:JSON.stringify({sessionId:'a40f2b',location:'Login.jsx:submit:entry',message:'submit branch',data:{useLaravelOnly,emailLen:(data.email||'').length,viteUrlSet:!!import.meta.env.VITE_SUPABASE_URL,viteKeySet:!!import.meta.env.VITE_SUPABASE_KEY},timestamp:Date.now(),hypothesisId:'H1,H3'})}).catch(()=>{});
        // #endregion

        if (useLaravelOnly) {
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c58bb5'},body:JSON.stringify({sessionId:'c58bb5',hypothesisId:'H2',location:'Login.jsx:submit',message:'Laravel post called',data:{},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'H1,H2',location:'Login.jsx:submit',message:'Laravel-only path (test user)',data:{},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            post(route('login'), {
                onFinish: () => {
                    setIsSupabaseProcessing(false);
                    // #region agent log
                    fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'849b3f'},body:JSON.stringify({sessionId:'849b3f',hypothesisId:'H3','location':'Login.jsx:submit onFinish',message:'Laravel onFinish',data:{pathname:typeof window!=='undefined'?window.location.pathname:null},timestamp:Date.now()})}).catch(()=>{});
                    // #endregion
                    // #region agent log
                    fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c58bb5'},body:JSON.stringify({sessionId:'c58bb5',hypothesisId:'H4',location:'Login.jsx:submit',message:'Laravel onFinish',data:{},timestamp:Date.now()})}).catch(()=>{});
                    // #endregion
                },
                onError: (backendErrors) => {
                    setIsSupabaseProcessing(false);
                    // #region agent log
                    fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c58bb5'},body:JSON.stringify({sessionId:'c58bb5',hypothesisId:'H3',location:'Login.jsx:submit',message:'Laravel onError',data:{keys:backendErrors?Object.keys(backendErrors):[]},timestamp:Date.now()})}).catch(()=>{});
                    // #endregion
                    // #region agent log
                    fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'H2',location:'Login.jsx:submit',message:'Laravel-only onError',data:{keys:backendErrors?Object.keys(backendErrors):[]},timestamp:Date.now()})}).catch(()=>{});
                    // #endregion
                    if (backendErrors?.email) setError('email', backendErrors.email);
                }
            });
            return;
        }

        const SUPABASE_TIMEOUT_MS = 8000;
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase timeout')), SUPABASE_TIMEOUT_MS)
        );

        try {
            const result = await Promise.race([
                supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                }),
                timeoutPromise,
            ]);

            const { data: authData, error } = result;

            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'A,C',location:'Login.jsx:submit',message:'Supabase race resolved',data:{hasError:!!error,hasAuthData:!!authData},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a40f2b'},body:JSON.stringify({sessionId:'a40f2b',location:'Login.jsx:submit:supabaseResult',message:'supabase signIn result',data:{hasError:!!error,errName:error?.name,errMessage:error?.message,errStatus:error?.status,hasSession:!!authData?.session},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});
            // #endregion

            if (error) {
                // #region agent log
                fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'C',location:'Login.jsx:submit',message:'branch Laravel fallback (Supabase error)',data:{},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
                // #region agent log
                fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a40f2b'},body:JSON.stringify({sessionId:'a40f2b',location:'Login.jsx:submit:fallback',message:'Laravel fallback after supabase error',data:{},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
                // #endregion
                post(route('login'), {
                    onFinish: () => {
                        setIsSupabaseProcessing(false);
                        // #region agent log
                        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'B,D',location:'Login.jsx:submit',message:'Laravel fallback onFinish (Supabase error path)',data:{},timestamp:Date.now()})}).catch(()=>{});
                        // #endregion
                    },
                    onError: (backendErrors) => {
                        setIsSupabaseProcessing(false);
                        // #region agent log
                        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'D',location:'Login.jsx:submit',message:'Laravel fallback onError',data:{keys:backendErrors?Object.keys(backendErrors):[]},timestamp:Date.now()})}).catch(()=>{});
                        // #endregion
                        if (!backendErrors.email) {
                            setError('email', error.message);
                        }
                    }
                });
                return;
            }

            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a40f2b'},body:JSON.stringify({sessionId:'a40f2b',location:'Login.jsx:submit:supabaseOk',message:'supabase auth ok, posting callback',data:{},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
            // #endregion
            router.post(route('auth.supabase.callback'), {
                email: authData.user.email,
                id: authData.user.id,
                access_token: authData.session.access_token,
            }, {
                onFinish: () => setIsSupabaseProcessing(false),
                onError: (errors) => {
                    console.error('Backend Login Error:', errors);
                    setError('email', 'Failed to sync with server.');
                }
            });
        } catch (err) {
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'A,C',location:'Login.jsx:submit',message:'catch block (timeout or throw)',data:{message:err?.message},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a40f2b'},body:JSON.stringify({sessionId:'a40f2b',location:'Login.jsx:submit:catch',message:'submit catch',data:{errMessage:err?.message},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
            // #endregion
            post(route('login'), {
                onFinish: () => {
                    setIsSupabaseProcessing(false);
                    // #region agent log
                    fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'B,D',location:'Login.jsx:submit',message:'Laravel fallback onFinish',data:{},timestamp:Date.now()})}).catch(()=>{});
                    // #endregion
                },
                onError: (backendErrors) => {
                    setIsSupabaseProcessing(false);
                    // #region agent log
                    fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'D',location:'Login.jsx:submit',message:'Laravel fallback onError',data:{keys:backendErrors?Object.keys(backendErrors):[]},timestamp:Date.now()})}).catch(()=>{});
                    // #endregion
                    if (!backendErrors.email && err?.message === 'Supabase timeout') {
                        setError('email', 'Connection timed out. Trying local login.');
                    }
                }
            });
        }
    };

    useEffect(() => {
        const targets = document.querySelectorAll('[data-observer-target]');
        // #region agent log
        fetch('http://127.0.0.1:7560/ingest/bdc59389-da51-4b88-b2c4-11c7655b3c93',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'86ef92'},body:JSON.stringify({sessionId:'86ef92',location:'Login.jsx:observer effect',message:'observer effect run',data:{targetCount:targets.length},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});
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
            fetch('http://127.0.0.1:7560/ingest/bdc59389-da51-4b88-b2c4-11c7655b3c93',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'86ef92'},body:JSON.stringify({sessionId:'86ef92',location:'Login.jsx:rAF',message:'rAF added is-visible',data:{count:targets.length},timestamp:Date.now(),hypothesisId:'H1,H5'})}).catch(()=>{});
            // #endregion
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const card = document.querySelector('[data-observer-target]');
        const hasVisible = card ? card.classList.contains('is-visible') : false;
        // #region agent log
        fetch('http://127.0.0.1:7560/ingest/bdc59389-da51-4b88-b2c4-11c7655b3c93',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'86ef92'},body:JSON.stringify({sessionId:'86ef92',location:'Login.jsx:theme effect',message:'theme changed',data:{theme,hasCard:!!card,hasVisible},timestamp:Date.now(),hypothesisId:'H2,H3'})}).catch(()=>{});
        // #endregion
        if (card && !hasVisible) {
            card.classList.add('is-visible');
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/bdc59389-da51-4b88-b2c4-11c7655b3c93',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'86ef92'},body:JSON.stringify({sessionId:'86ef92',location:'Login.jsx:theme effect',message:'reapplied is-visible',data:{theme},timestamp:Date.now(),runId:'post-fix'})}).catch(()=>{});
            // #endregion
        }
    }, [theme]);

    return (
        <>
            <Head title="Log in" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Animated Background Shapes */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* Enhanced Header */}
                <header className={`relative z-10 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="mx-auto" style={{ paddingLeft: '0.45in', paddingRight: '0.45in' }}>
                        <div className="flex justify-between items-center h-16">
                            <Link href="/" className="flex items-center">
                                <WorkWiseNavBrand />
                            </Link>

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
                                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Don't have an account?</span>
                                <Link
                                    href={route('role.selection')}
                                    className={`text-sm font-medium transition-all duration-700 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                >
                                    Sign up
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
                                Welcome Back
                            </h1>
                            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Log in to your WorkWise account</p>

                            {status && (
                                <div className={`mt-6 p-4 rounded-lg text-sm border ${isDark ? 'bg-blue-900/50 border-blue-700 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                                    {status}
                                </div>
                            )}
                            {flash?.error && (
                                <div className={`mt-6 p-4 rounded-lg text-sm border ${isDark ? 'bg-red-900/50 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                    {flash.error}
                                </div>
                            )}
                        </div>

                        <form onSubmit={submit} className="space-y-6" data-testid="login-form">
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-400'}`}
                                    required
                                    data-testid="email-input"
                                />
                                <InputError message={errors.email} className="mt-1" data-testid="login-error" />
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
                                        className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-400'}`}
                                        required
                                        data-testid="password-input"
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
                                <InputError message={errors.password} className="mt-1" />
                            </div>

                            {/* Remember Me and Forgot Password */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 rounded transition-all duration-300 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
                                    />
                                    <span className={`ml-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Keep me logged in</span>
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className={`text-sm transition-all duration-300 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                    >
                                        Forgot password?
                                    </Link>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={processing || isSupabaseProcessing}
                                className={`w-full text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 ${isDark ? 'disabled:bg-gray-600 disabled:text-gray-400' : 'disabled:bg-gray-200 disabled:text-gray-500'}`}
                                data-testid="login-submit"
                            >
                                {processing || isSupabaseProcessing ? 'Logging in...' : 'Log in'}
                            </button>



                            {/* Google Login Button */}
                            <GoogleAuthButton
                                action="login"
                                disabled={processing || isSupabaseProcessing}
                            />

                            {/* Sign up Link */}
                            <div className="text-center">
                                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Don't have a WorkWise account?{' '}
                                    <Link href={route('role.selection')} className={`font-medium transition-all duration-300 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                                        Sign up
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
