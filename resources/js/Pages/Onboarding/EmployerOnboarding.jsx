import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { EmployerStep1Welcome, EmployerStep2Identity } from './EmployerSteps12';
import { EmployerStep3Bio, EmployerStep4Preferences } from './EmployerSteps34';
import EmployerStep5Review from './EmployerStep5';
import CsrfSync from '@/Components/CsrfSync';

const PROGRESS = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };

export default function EmployerOnboarding({ user, industries, serviceCategories, currentStep = 1 }) {
    const [step, setStep] = useState(currentStep > 1 ? currentStep : 1);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [saveError, setSaveError] = useState(null);

    const [data, setDataState] = useState({
        company_name: user.company_name || '',
        company_size: user.company_size || '',
        industry: user.industry || '',
        company_website: user.company_website || '',
        company_description: user.company_description || '',
        profile_picture_file: null,
        profile_picture_preview: user.profile_picture || null,
        primary_hiring_needs: user.primary_hiring_needs || [],
        primary_hiring_skills: user.primary_hiring_skills || [],
        typical_project_budget: user.typical_project_budget || '',
        typical_project_duration: user.typical_project_duration || '',
        preferred_experience_level: user.preferred_experience_level || '',
        hiring_frequency: user.hiring_frequency || '',
    });

    const setData = (key, value) => setDataState(prev => ({ ...prev, [key]: value }));

    // Build FormData from current state
    const buildFormData = (stepNum) => {
        const fd = new FormData();
        fd.append('step', stepNum);

        // Text fields
        fd.append('company_name', data.company_name || '');
        fd.append('company_size', data.company_size || '');
        fd.append('industry', data.industry || '');
        fd.append('company_website', data.company_website || '');
        fd.append('company_description', data.company_description || '');
        fd.append('typical_project_budget', data.typical_project_budget || '');
        fd.append('typical_project_duration', data.typical_project_duration || '');
        fd.append('preferred_experience_level', data.preferred_experience_level || '');
        fd.append('hiring_frequency', data.hiring_frequency || '');

        // Array fields
        (data.primary_hiring_needs || []).forEach((need, index) => {
            fd.append(`primary_hiring_needs[${index}]`, need);
        });
        (data.primary_hiring_skills || []).forEach((skill, index) => {
            fd.append(`primary_hiring_skills[${index}]`, skill);
        });

        // File field - only include if selected
        if (data.profile_picture_file) {
            fd.append('profile_picture', data.profile_picture_file);
        }

        return fd;
    };

    // Validate current step before proceeding
    const validate = (stepNum) => {
        const errs = {};
        if (stepNum === 2) {
            if (!(data.company_size || '').trim()) errs.company_size = 'Team size is required.';
            if (!(data.industry || '').trim()) errs.industry = 'Industry is required.';
        }
        if (stepNum === 3) {
            const desc = (data.company_description || '').trim();
            if (desc.length < 50) errs.company_description = 'Company description must be at least 50 characters.';
        }
        if (stepNum === 4) {
            if ((data.primary_hiring_needs || []).length < 1) errs.primary_hiring_needs = 'Select at least one service.';
            if (!(data.typical_project_budget || '').trim()) errs.typical_project_budget = 'Typical budget is required.';
            if (!(data.typical_project_duration || '').trim()) errs.typical_project_duration = 'Typical duration is required.';
            if (!(data.preferred_experience_level || '').trim()) errs.preferred_experience_level = 'Experience level is required.';
            if (!(data.hiring_frequency || '').trim()) errs.hiring_frequency = 'Hiring frequency is required.';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleNext = () => {
        if (!validate(step)) {
            return;
        }

        // Step 1 doesn't need validation/save
        if (step === 1) {
            setStep(s => s + 1);
            window.scrollTo(0, 0);
            return;
        }

        const stepToSave = step;

        // Save first; only advance step on success so we don't end up back at step 1 on error
        router.post(route('employer.onboarding.store'), buildFormData(stepToSave), {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setSaveError(null);
                setStep(s => s + 1);
                window.scrollTo(0, 0);
            },
            onError: (e) => {
                setSaveError('Some data may not have saved. Please check your profile later.');
                setErrors(e);
                console.error('Background save error:', e);
            },
        });
    };

    const handleBack = () => {
        setStep(s => Math.max(1, s - 1));
        window.scrollTo(0, 0);
    };

    const handleSubmit = () => {
        setSubmitting(true);
        router.post(route('employer.onboarding.store'), buildFormData(5), {
            forceFormData: true,
            onError: (e) => {
                setErrors(e);
                setSubmitting(false);
            }
        });
    };

    const handleSkip = () => {
        router.post(route('employer.onboarding.skip'));
    };

    const goToStep = (s) => {
        setStep(s);
        window.scrollTo(0, 0);
    };

    const progress = PROGRESS[step] || 20;
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'E';

    return (
        <>
            <CsrfSync />
            <Head title={`Onboarding – Step ${step} of 5`} />

            <div className="bg-gray-50 min-h-screen flex flex-col font-sans antialiased">
                {/* ─ Header ─────────────────────────────────────────── */}
                <header className="bg-white border-b border-gray-200 h-16 flex-none z-20 relative shadow-sm sticky top-0">
                    <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/image/WorkWise_logo.png"
                                    alt="WorkWise"
                                    className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                />
                                <span className="text-2xl font-bold tracking-tight text-gray-900">
                                    <span className="text-blue-500">W</span>orkWise
                                </span>
                            </div>
                            {step > 1 && (
                                <nav className="hidden lg:flex items-center gap-2 text-sm font-medium text-gray-500 border-l border-gray-200 pl-6 h-8">
                                    <span className="text-blue-600 font-semibold">Onboarding</span>
                                    <span className="material-icons text-base text-gray-300">chevron_right</span>
                                    <span>Employer Profile</span>
                                </nav>
                            )}
                        </div>

                        {step > 1 && (
                            <div className="hidden md:flex flex-col w-1/3 max-w-md">
                                <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                                    <span>Step {step} of 5</span>
                                    <span>{progress}% Complete</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <button className="text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium hidden sm:block">Help Center</button>
                            <div className="h-8 w-[1px] bg-gray-200 hidden sm:block" />
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
                    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-700 text-sm">
                            <span className="material-icons text-base">warning</span>
                            {saveError}
                        </div>
                        <button onClick={() => setSaveError(null)} className="text-amber-500 hover:text-amber-700 transition-colors">
                            <span className="material-icons text-base">close</span>
                        </button>
                    </div>
                )}

                {step === 1 && (
                    <EmployerStep1Welcome
                        onNext={handleNext}
                        onSkip={handleSkip}
                    />
                )}

                {step === 2 && (
                    <EmployerStep2Identity
                        data={data}
                        setData={setData}
                        errors={errors}
                        industries={industries}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                )}

                {step === 3 && (
                    <EmployerStep3Bio
                        data={data}
                        setData={setData}
                        errors={errors}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                )}

                {step === 4 && (
                    <EmployerStep4Preferences
                        data={data}
                        setData={setData}
                        errors={errors}
                        serviceCategories={serviceCategories}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                )}

                {step === 5 && (
                    <EmployerStep5Review
                        data={data}
                        onSubmit={handleSubmit}
                        onBack={handleBack}
                        submitting={submitting}
                        goToStep={goToStep}
                    />
                )}
            </div>
        </>
    );
}
