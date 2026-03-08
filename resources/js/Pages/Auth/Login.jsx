import InputError from '@/Components/InputError';
import GoogleAuthButton from '@/Components/GoogleAuthButton';
import WorkWiseNavBrand from '@/Components/WorkWiseNavBrand';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';

export default function Login({ status, canResetPassword }) {
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

            if (error) {
                // #region agent log
                fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cd453'},body:JSON.stringify({sessionId:'2cd453',hypothesisId:'C',location:'Login.jsx:submit',message:'branch Laravel fallback (Supabase error)',data:{},timestamp:Date.now()})}).catch(()=>{});
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
        });

        return () => observer.disconnect();
    }, []);

    return (
        <>
            <Head title="Log in" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className="relative min-h-screen bg-gray-900">
                {/* Animated Background Shapes */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* Enhanced Header */}
                <header className="relative z-10 border-b border-gray-700">
                    <div className="mx-auto" style={{ paddingLeft: '0.45in', paddingRight: '0.45in' }}>
                        <div className="flex justify-between items-center h-16">
                            <Link href="/" className="flex items-center">
                                <WorkWiseNavBrand />
                            </Link>

                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-400">Don't have an account?</span>
                                <Link
                                    href={route('role.selection')}
                                    className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-all duration-700"
                                >
                                    Sign up
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="relative z-10 max-w-md mx-auto pt-12 pb-16 px-4">
                    <div className="bg-gray-800 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-gray-700" data-observer-target>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-100 mb-2">
                                Welcome Back
                            </h1>
                            <p className="text-gray-400">Log in to your WorkWise account</p>

                            {status && (
                                <div className="mt-6 p-4 bg-blue-900/50 border border-blue-700 rounded-lg text-sm text-blue-200">
                                    {status}
                                </div>
                            )}
                        </div>

                        <form onSubmit={submit} className="space-y-6" data-testid="login-form">
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-gray-500 transition-all duration-300 bg-gray-700 text-white placeholder-gray-400"
                                    required
                                    data-testid="email-input"
                                />
                                <InputError message={errors.email} className="mt-1" data-testid="login-error" />
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full px-4 py-3 pr-12 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-gray-500 transition-all duration-300 bg-gray-700 text-white placeholder-gray-400"
                                        required
                                        data-testid="password-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-blue-400 transition-colors duration-300"
                                    >
                                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded transition-all duration-300"
                                    />
                                    <span className="ml-2 text-sm text-gray-300">Keep me logged in</span>
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-sm text-blue-400 hover:text-blue-300 transition-all duration-300"
                                    >
                                        Forgot password?
                                    </Link>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={processing || isSupabaseProcessing}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105"
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
                                <span className="text-sm text-gray-400">
                                    Don't have a WorkWise account?{' '}
                                    <Link href={route('role.selection')} className="text-blue-400 hover:text-blue-300 font-medium transition-all duration-300">
                                        Sign up
                                    </Link>
                                </span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
                body {
                    background: #111827;
                    color: #e5e7eb;
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
