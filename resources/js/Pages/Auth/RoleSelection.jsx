import { Head, Link, useForm } from '@inertiajs/react';
import WorkWiseNavBrand from '@/Components/WorkWiseNavBrand';
import { useTheme } from '@/Contexts/ThemeContext';
import { useEffect, useState } from 'react';

export default function RoleSelection() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const [selectedRole, setSelectedRole] = useState(null);
    const { data, setData, post, processing } = useForm({
        user_type: ''
    });

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setData('user_type', role);
    };

    const handleContinue = () => {
        if (selectedRole) {
            post(route('role.store'), {
                onSuccess: () => {
                    console.log('Role selection successful');
                },
                onError: (errors) => {
                    console.error('Role selection failed:', errors);
                    alert('There was an error selecting your role. Please try again.');
                }
            });
        } else {
            alert('Please select a role before continuing.');
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

    const roles = [
        {
            type: 'gig_worker',
            title: 'I\'m a gig worker',
            subtitle: 'I\'m looking for work',
            description: 'I want to find projects and earn money using my skills',
            icon: (
                <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
            ),
            features: [
                'Browse and apply to projects',
                'Build your portfolio',
                'Get paid securely',
                'Work with global employers'
            ]
        },
        {
            type: 'employer',
            title: 'I\'m an employer',
            subtitle: 'I\'m looking to hire',
            description: 'I want to hire skilled professionals for my projects',
            icon: (
                <svg className="w-12 h-12 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                </svg>
            ),
            features: [
                'Post projects and get proposals',
                'Access to skilled gig workers',
                'Manage projects easily',
                'Pay only when satisfied'
            ]
        }
    ];

    return (
        <>
            <Head title="Join WorkWise" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Animated Background Shapes */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

                {/* Header */}
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
                                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Already have an account?</span>
                                <Link
                                    href="/login"
                                    className={`text-sm font-medium transition-all duration-700 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                >
                                    Log in
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="relative z-10 max-w-4xl mx-auto pt-12 pb-16 px-4">
                    {/* Header */}
                    <div className="text-center mb-12" data-observer-target>
                        <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            Join as a gig worker or employer
                        </h1>
                        <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Choose how you'd like to use WorkWise. You can always switch between roles later.
                        </p>
                    </div>

                    {/* Role Selection Cards */}
                    <div className="grid md:grid-cols-2 gap-8 mb-12" data-observer-target>
                        {roles.map((role) => (
                            <div
                                key={role.type}
                                onClick={() => handleRoleSelect(role.type)}
                                className={`relative cursor-pointer backdrop-blur-sm rounded-xl border p-8 transition-all duration-700 hover:shadow-xl hover:scale-105 ${
                                    selectedRole === role.type
                                        ? isDark ? 'border-blue-500 bg-blue-900/40 shadow-lg transform scale-105' : 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                                        : isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {/* Selection indicator */}
                                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all ${
                                    selectedRole === role.type
                                        ? 'border-blue-500 bg-blue-500'
                                        : isDark ? 'border-gray-500' : 'border-gray-400'
                                }`}>
                                    {selectedRole === role.type && (
                                        <svg className="w-4 h-4 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                        </svg>
                                    )}
                                </div>

                                {/* Icon */}
                                <div className="flex justify-center mb-6">
                                    <div className={`p-4 rounded-full ${
                                        role.type === 'gig_worker' ? (isDark ? 'bg-blue-900/50' : 'bg-blue-100') : (isDark ? 'bg-green-900/50' : 'bg-green-100')
                                    }`}>
                                        {role.icon}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="text-center mb-6">
                                    <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        {role.title}
                                    </h3>
                                    <p className={`text-lg font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {role.subtitle}
                                    </p>
                                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                        {role.description}
                                    </p>
                                </div>

                                {/* Features */}
                                <div className="space-y-3">
                                    {role.features.map((feature, index) => (
                                        <div key={index} className={`flex items-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <svg className={`w-4 h-4 mr-3 flex-shrink-0 ${isDark ? 'text-green-500' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                            </svg>
                                            {feature}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Continue Button */}
                    <div className="text-center" data-observer-target>
                        <button
                            onClick={handleContinue}
                            disabled={!selectedRole || processing}
                            className={`inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-lg transition-all duration-700 hover:shadow-lg hover:scale-105 ${
                                selectedRole && !processing
                                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                                    : isDark ? 'text-gray-500 bg-gray-700 cursor-not-allowed' : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                            }`}
                        >
                            {processing ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Continue
                                    <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-12" data-observer-target>
                        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                            Already have an account?{' '}
                            <Link href="/login" className={`font-medium transition-all duration-700 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                                Log in
                            </Link>
                        </p>
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
