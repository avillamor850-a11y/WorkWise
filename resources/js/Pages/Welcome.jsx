import { Head, Link } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import LenisProvider from '@/Components/Landing/LenisProvider';
import HeroCanvas from '@/Components/Landing/HeroCanvas';
import HeroUI from '@/Components/Landing/HeroUI';
import Matchmaker from '@/Components/Landing/Matchmaker';
import SecureEscrow from '@/Components/Landing/SecureEscrow';
import HowItWorks from '@/Components/Landing/HowItWorks';
import CsrfSync from '@/Components/CsrfSync';


export default function Welcome({ auth }) {
    const scrollProgressRef = useRef(0);
    const assemblyProgressRef = useRef(0);

    useEffect(() => {
        // Force scroll to top on refresh
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // Ensure scroll to top happens after initial render and Lenis init
        const scrollToTop = () => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        };

        scrollToTop();
        // Fallback for some browsers/race conditions
        setTimeout(scrollToTop, 10);

        // Intersection Observer for fade-in animations
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

        return () => observer.disconnect();
    }, []);

    return (
        <LenisProvider>
            <CsrfSync />
            <Head title="WorkWise - AI Marketplace" />

            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;900&display=swap" rel="stylesheet" />

            <div className="bg-gray-900">
                {/* Hero Section with 3D Assembly */}
                <div className="relative h-screen">
                    <HeroCanvas
                        scrollProgressRef={scrollProgressRef}
                        assemblyProgressRef={assemblyProgressRef}
                    />
                    <HeroUI
                        scrollProgressRef={scrollProgressRef}
                        assemblyProgressRef={assemblyProgressRef}
                        auth={auth}
                    />
                </div>

                {/* Transition to Dark Content */}
                <div className="relative z-20">
                    <div className="h-32 bg-gradient-to-b from-gray-900 to-transparent pointer-events-none" />

                    {/* AI Matchmaker Section */}
                    <Matchmaker />

                    {/* Secure Escrow Section */}
                    <SecureEscrow />

                    {/* How It Works Section */}
                    <HowItWorks />

                    {/* Transition to Footer (Keep it dark and sleek) */}
                    <div className="h-48 bg-gradient-to-b from-transparent to-gray-900" />
                </div>

                {/* Main Dark Content / Footer Section */}
                <div className="relative z-10 bg-gray-900 px-4 py-24">
                    <div className="container mx-auto">
                        {/* Footer */}
                        <footer className="border-t border-gray-700 pt-16" data-observer-target>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-6">WorkWise</h3>
                                    <p className="text-gray-500 leading-relaxed">
                                        The future of work, powered by elite intelligence and seamless collaboration.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">For Talent</h4>
                                    <ul className="space-y-4 text-gray-500">
                                        <li><Link href="/jobs" className="hover:text-blue-500 transition-colors">Browse Gigs</Link></li>
                                        <li><Link href="/ai/recommendations" className="hover:text-blue-500 transition-colors">AI Recommendations</Link></li>
                                        <li><Link href={route('role.selection')} className="hover:text-blue-500 transition-colors">Join as Expert</Link></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">For Companies</h4>
                                    <ul className="space-y-4 text-gray-500">
                                        <li><Link href="/freelancers" className="hover:text-blue-500 transition-colors">Find Experts</Link></li>
                                        <li><Link href="/jobs/create" className="hover:text-blue-500 transition-colors">Post a Project</Link></li>
                                        <li><Link href={route('role.selection')} className="hover:text-blue-500 transition-colors">Scale Your Team</Link></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Platform</h4>
                                    <ul className="space-y-4 text-gray-500">
                                        <li><Link href="/help" className="hover:text-blue-500 transition-colors">Help Center</Link></li>
                                        <li><Link href="/about" className="hover:text-blue-500 transition-colors">Our Vision</Link></li>
                                        <li><Link href="/privacy" className="hover:text-blue-500 transition-colors">Privacy</Link></li>
                                    </ul>
                                </div>
                            </div>

                            <div className="border-t border-gray-700 py-10 text-center text-gray-500 text-sm font-medium">
                                <p>&copy; 2024 WorkWise. Built for the Next Generation.</p>
                            </div>
                        </footer>
                    </div>
                </div>
            </div>

            <style>{`
                [data-observer-target] {
                    opacity: 0;
                    transform: translateY(30px);
                    transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1);
                }
                [data-observer-target].is-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                body {
                    background: #111827;
                }

                .lenis.lenis-smooth {
                    scroll-behavior: auto !important;
                }

                .lenis.lenis-smooth [data-lenis-prevent] {
                    overscroll-behavior: contain;
                }

                .lenis.lenis-stopped {
                    overflow: hidden;
                }

                .lenis.lenis-scrolling iframe {
                    pointer-events: none;
                }
            `}</style>
        </LenisProvider>
    );
}
