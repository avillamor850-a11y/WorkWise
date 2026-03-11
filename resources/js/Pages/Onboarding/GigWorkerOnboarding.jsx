import { useState, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import CsrfSync from '@/Components/CsrfSync';
import { useTheme } from '@/Contexts/ThemeContext';
import { Step1Welcome, Step2ProfessionalInfo } from './Steps12';
import { Step3Skills, Step4Portfolio, Step5Review } from './Steps345';

const PROGRESS = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };

export default function GigWorkerOnboarding({ user, currentStep = 1 }) {
    const { props } = usePage();
    const csrfToken = props?.csrf_token ?? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

    const [step, setStep] = useState(currentStep > 1 ? currentStep : 1);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [data, setDataState] = useState({
        professional_title: user.professional_title || '',
        hourly_rate: user.hourly_rate || '',
        bio: user.bio || '',
        profile_picture_file: null,
        profile_picture_preview: user.profile_picture || user.profile_photo || null,
        skills_with_experience: user.skills_with_experience || [],
        portfolio_link: user.portfolio_link || '',
        resume_file: null,
        resume_file_name: null,
    });

    const setData = (key, value) => setDataState(prev => ({ ...prev, [key]: value }));

    // Build FormData from current state.
    // Files (profile_picture, resume_file) are only sent on the step where
    // they were selected. Step 5 sends text-only data as a safety net, since
    // File objects from earlier steps can't be reliably re-submitted.
    const buildFormData = (stepNum, isDraft = false) => {
        const fd = new FormData();
        fd.append('step', stepNum);
        fd.append('is_draft', isDraft ? '1' : '0');

        if (csrfToken) fd.append('_token', csrfToken);

        // #region agent log
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
        fetch('http://127.0.0.1:7560/ingest/bdc59389-da51-4b88-b2c4-11c7655b3c93',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c1f58'},body:JSON.stringify({sessionId:'9c1f58',location:'GigWorkerOnboarding.jsx:buildFormData',message:'CSRF token source',data:{stepNum,propsPrefix:(props?.csrf_token||'').slice(0,8),metaPrefix:(metaToken||'').slice(0,8),usedPrefix:(csrfToken||'').slice(0,8)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion

        // Text fields — always send all of them so any step is a complete snapshot
        fd.append('professional_title', data.professional_title || '');
        fd.append('hourly_rate', data.hourly_rate || '');
        fd.append('bio', data.bio || '');
        fd.append('skills_with_experience', JSON.stringify(data.skills_with_experience || []));
        fd.append('portfolio_link', data.portfolio_link || '');

        // File fields — only include on the step where they were selected.
        // Do NOT re-send on step 5 (File objects may be stale/invalid by then).
        if (stepNum <= 4 && data.profile_picture_file) {
            fd.append('profile_picture', data.profile_picture_file);
        }
        if (stepNum === 4 && data.resume_file) {
            fd.append('resume_file', data.resume_file);
        }

        return fd;
    };

    // Validate current step before proceeding
    const validate = (stepNum) => {
        const errs = {};
        if (stepNum === 2) {
            if (!data.professional_title.trim()) errs.professional_title = 'Professional title is required.';
            if (!data.bio.trim() || data.bio.length < 10) errs.bio = 'Bio must be at least 10 characters.';
        }
        if (stepNum === 3) {
            if ((data.skills_with_experience || []).length < 3)
                errs.skills_with_experience = 'Please add at least 3 skills.';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const [saveError, setSaveError] = useState(null);

    const handleNext = () => {
        if (!validate(step)) return;

        // Step 1: no data to save yet, just advance
        if (step === 1) {
            setStep(s => s + 1);
            window.scrollTo(0, 0);
            return;
        }

        // All other steps: advance locally IMMEDIATELY, then save in background.
        // buildFormData always includes ALL accumulated data, so even if an earlier
        // background save silently failed, this one will catch up.
        const currentStep = step;
        setStep(s => s + 1);
        window.scrollTo(0, 0);

        router.post(route('gig-worker.onboarding.store'), buildFormData(currentStep), {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            ...(csrfToken && { headers: { 'X-CSRF-TOKEN': csrfToken } }),
            onSuccess: () => { setSaveError(null); },
            onError: (e) => {
                // Show non-blocking warning — step already advanced
                setSaveError('Some data may not have saved. Please check your profile later.');
                console.error('Background save error:', e);
            },
        });
    };

    const handleBack = () => { setStep(s => Math.max(1, s - 1)); window.scrollTo(0, 0); };

    const handleSaveDraft = () => {
        setSaving(true);
        router.post(route('gig-worker.onboarding.store'), buildFormData(step, true), {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            ...(csrfToken && { headers: { 'X-CSRF-TOKEN': csrfToken } }),
            onSuccess: () => setSaving(false),
            onError: () => setSaving(false),
        });
    };

    const handleSubmit = () => {
        setSubmitting(true);
        router.post(route('gig-worker.onboarding.store'), buildFormData(5), {
            forceFormData: true,
            ...(csrfToken && { headers: { 'X-CSRF-TOKEN': csrfToken } }),
            onError: (e) => {
                setErrors(e); setSubmitting(false);
            },
        });
    };

    const handleSkip = () => router.post(route('gig-worker.onboarding.skip'));

    const goToStep = (s) => { setStep(s); window.scrollTo(0, 0); };

    const progress = PROGRESS[step] || 20;
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'GW';
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <>
            <CsrfSync />
            <Head title={`Onboarding – Step ${step} of 5`} />

            <div className={`min-h-screen flex flex-col font-sans antialiased relative ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {isDark && (
                    <>
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl pointer-events-none" style={{ animationDelay: '2s' }} />
                    </>
                )}
                {/* ─ Header ─────────────────────────────────────────── */}
                <header className={`h-16 flex-none z-20 relative shadow-sm sticky top-0 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/image/WorkWise_logo.png"
                                    alt="WorkWise"
                                    className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                />
                                <span className={`text-2xl font-bold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                    <span className="text-blue-500">W</span>orkWise
                                </span>
                            </div>
                            {step > 1 && (
                                <nav className={`hidden lg:flex items-center gap-2 text-sm font-medium border-l pl-6 h-8 ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>
                                    <span className="text-blue-500 font-semibold">Onboarding</span>
                                    <span className={`material-icons text-base ${isDark ? 'text-gray-500' : 'text-gray-300'}`}>chevron_right</span>
                                    <span>Profile Setup</span>
                                </nav>
                            )}
                        </div>

                        {step > 1 && (
                            <div className="hidden md:flex flex-col w-1/3 max-w-md">
                                <div className={`flex justify-between text-xs font-semibold mb-1.5 uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <span>Step {step} of 5</span>
                                    <span>{progress}% Complete</span>
                                </div>
                                <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <button className={`transition-colors text-sm font-medium hidden sm:block ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}>Help Center</button>
                            <button
                                type="button"
                                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                <span className="material-icons text-xl">{isDark ? 'light_mode' : 'dark_mode'}</span>
                            </button>
                            <div className={`h-8 w-[1px] hidden sm:block ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center text-sm font-bold shadow-md">
                                {data.profile_picture_preview
                                    ? <img src={data.profile_picture_preview} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                    : initials}
                            </div>
                        </div>
                    </div>
                </header>

                {/* ─ Non-blocking save error banner ─────────────── */}
                {saveError && (
                    <div className={`border-b px-6 py-2 flex items-center justify-between ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                        <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                            <span className="material-icons text-base">warning</span>
                            {saveError}
                        </div>
                        <button onClick={() => setSaveError(null)} className={isDark ? 'text-amber-400 hover:text-amber-200 transition-colors' : 'text-amber-500 hover:text-amber-700 transition-colors'}>
                            <span className="material-icons text-base">close</span>
                        </button>
                    </div>
                )}

                {step === 1 && (
                    <Step1Welcome onNext={handleNext} onSkip={handleSkip} darkMode={isDark} />
                )}
                {step === 2 && (
                    <Step2ProfessionalInfo
                        data={data}
                        setData={setData}
                        errors={errors}
                        onNext={handleNext}
                        onBack={handleBack}
                        onSaveDraft={handleSaveDraft}
                        saving={saving}
                        darkMode={isDark}
                    />
                )}
                {step === 3 && (
                    <Step3Skills
                        data={data}
                        setData={setData}
                        errors={errors}
                        onNext={handleNext}
                        onBack={handleBack}
                        darkMode={isDark}
                    />
                )}
                {step === 4 && (
                    <Step4Portfolio
                        data={data}
                        setData={setData}
                        errors={errors}
                        onNext={handleNext}
                        onBack={handleBack}
                        darkMode={isDark}
                    />
                )}
                {step === 5 && (
                    <Step5Review
                        data={data}
                        user={user}
                        onSubmit={handleSubmit}
                        onBack={handleBack}
                        submitting={submitting}
                        goToStep={goToStep}
                        darkMode={isDark}
                    />
                )}
            </div>
        </>
    );
}
