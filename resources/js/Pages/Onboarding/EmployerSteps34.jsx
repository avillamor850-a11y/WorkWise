import { useState, useCallback, useMemo } from 'react';

// ─── Step 3: Company Bio & Website ───────────────────────────────────────────
function EmployerStep3Bio({ data, setData, errors, onNext, onBack, darkMode = false }) {
    const [charCount, setCharCount] = useState((data.company_description || '').length);

    return (
        <main className="flex-grow container mx-auto px-4 py-10 max-w-5xl">
            <div className="mb-10 max-w-3xl mx-auto">
                <div className="flex justify-between items-end mb-3">
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Company Bio</h1>
                    <div className="text-right">
                        <span className={`text-sm font-medium block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 3 of 5</span>
                        <span className={`text-xs font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>60%</span>
                    </div>
                </div>
                <div className={`w-full rounded-full h-2.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-blue-500/30" style={{ width: '60%' }} />
                </div>
            </div>

            <div className={`rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="p-8 md:p-10 space-y-8">
                    <div className="space-y-2">
                        <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="company_website">
                            Company Website <span className={`font-normal ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(Optional)</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className={`material-icons group-focus-within:text-blue-500 transition-colors ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>link</span>
                            </div>
                            <input
                                id="company_website"
                                type="url"
                                value={data.company_website}
                                onChange={e => setData('company_website', e.target.value)}
                                placeholder="https://example.com"
                                className={darkMode
                                    ? 'block w-full pl-12 pr-4 py-3.5 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm'
                                    : 'block w-full pl-12 pr-4 py-3.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm'}
                            />
                        </div>
                        {errors.company_website && <p className="text-xs text-red-500">{errors.company_website}</p>}
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="company_description">
                                Company Description <span className="text-red-500">*</span>
                            </label>
                            <span className={`text-xs font-medium ${charCount < 50 ? (darkMode ? 'text-gray-500' : 'text-gray-500') : 'text-green-500'}`}>
                                {charCount}/1000 characters
                            </span>
                        </div>
                        <textarea
                            id="company_description"
                            rows={10}
                            value={data.company_description}
                            onChange={e => { setData('company_description', e.target.value); setCharCount(e.target.value.length); }}
                            placeholder="Tell us about your company, what you do, and your typical project needs... (minimum 50 characters)"
                            className={darkMode
                                ? 'block w-full rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 shadow-sm min-h-[220px] leading-relaxed'
                                : 'block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 shadow-sm min-h-[220px] leading-relaxed'}
                        />
                        <div className="flex items-center gap-2 mt-2">
                            {charCount < 50 ? (
                                <p className={`text-xs flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                    <span className="material-icons text-sm">error_outline</span>
                                    Minimum 50 characters required
                                </p>
                            ) : (
                                <p className="text-xs text-green-500 flex items-center gap-1">
                                    <span className="material-icons text-sm">check_circle</span>
                                    This gives workers enough detail.
                                </p>
                            )}
                        </div>
                        {errors.company_description && <p className="text-xs text-red-500">{errors.company_description}</p>}
                    </div>
                </div>

                <div className={`border-t p-6 flex justify-between items-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button onClick={onBack} className={`inline-flex items-center px-6 py-2.5 border text-sm font-medium rounded-lg transition shadow-sm ${darkMode ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}>
                        <span className="material-icons text-sm mr-2">arrow_back</span>
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        disabled={charCount < 50}
                        className="inline-flex items-center px-8 py-2.5 text-sm font-medium rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next Step
                        <span className="material-icons text-sm ml-2">arrow_forward</span>
                    </button>
                </div>
            </div>
        </main>
    );
}

// ─── Step 4: Hiring Preferences ──────────────────────────────────────────────
function EmployerStep4Preferences({
    data,
    setData,
    errors,
    serviceCategories,
    otherState,
    setOtherState,
    otherBlocksNext,
    appendPrimaryHiringNeed,
    onNext,
    onBack,
    darkMode = false,
}) {
    const hiringNeeds = data.primary_hiring_needs || [];
    const [servicesOpen, setServicesOpen] = useState(false);
    const [otherError, setOtherError] = useState(null);
    const [validatingOther, setValidatingOther] = useState(false);

    const standardCategories = useMemo(
        () => (serviceCategories || []).filter(c => c !== 'Other'),
        [serviceCategories],
    );

    const isStandardNeed = useCallback(
        (need) => standardCategories.some(c => c.toLowerCase() === String(need || '').trim().toLowerCase()),
        [standardCategories],
    );

    const removeService = (index) => {
        setData('primary_hiring_needs', hiringNeeds.filter((_, i) => i !== index));
    };

    const toggleStandardCategory = (canonical) => {
        const has = hiringNeeds.some(n => n.toLowerCase() === canonical.toLowerCase());
        if (has) {
            setData(
                'primary_hiring_needs',
                hiringNeeds.filter(n => n.toLowerCase() !== canonical.toLowerCase()),
            );
        } else {
            setData('primary_hiring_needs', [...hiringNeeds, canonical]);
        }
    };

    const handleOtherCheckbox = (checked) => {
        if (!checked) {
            setOtherState({ intent: false, text: '' });
            setOtherError(null);
            setData('primary_hiring_needs', hiringNeeds.filter(n => isStandardNeed(n)));
        } else {
            setOtherState(prev => ({ ...prev, intent: true }));
        }
    };

    const verifyAndAddOther = useCallback(async () => {
        const trimmed = String(otherState.text || '').trim();
        setOtherError(null);
        if (!trimmed) {
            return;
        }
        if (hiringNeeds.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
            setOtherError('This service is already in your list.');
            return;
        }
        setValidatingOther(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch('/api/onboarding/validate-hiring-need', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ description: trimmed }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                const descErr = body.errors?.description;
                const firstDesc = Array.isArray(descErr) ? descErr[0] : descErr;
                setOtherError(firstDesc || body.message || 'Could not validate. Try again.');
                return;
            }
            if (!body.valid) {
                setOtherError(body.message || 'Please describe a valid service.');
                return;
            }
            appendPrimaryHiringNeed(trimmed);
            setOtherState(prev => ({ ...prev, text: '' }));
        } catch {
            setOtherError('Network error. Try again.');
        } finally {
            setValidatingOther(false);
        }
    }, [otherState.text, hiringNeeds, appendPrimaryHiringNeed, setOtherState]);

    const budgetOptions = [
        { value: 'under_500', label: 'Under ₱500' },
        { value: '500-2000', label: '₱500 - ₱2,000' },
        { value: '2000-5000', label: '₱2,000 - ₱5,000' },
        { value: '5000-10000', label: '₱5,000 - ₱10,000' },
        { value: '10000+', label: '₱10,000+' },
    ];

    const durationOptions = [
        { value: 'short_term', label: 'Short-term (< 1 month)' },
        { value: 'medium_term', label: 'Medium-term (1-3 months)' },
        { value: 'long_term', label: 'Long-term (3-6 months)' },
        { value: 'ongoing', label: 'Ongoing (6+ months)' },
    ];

    const experienceOptions = [
        { value: 'any', label: 'Any level' },
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'expert', label: 'Expert' },
    ];

    const frequencyOptions = [
        { value: 'one_time', label: 'One-time project' },
        { value: 'occasional', label: 'Occasional' },
        { value: 'regular', label: 'Regular (Monthly)' },
        { value: 'ongoing', label: 'Ongoing simultaneous' },
    ];

    return (
        <main className="flex-grow container mx-auto px-4 py-10 max-w-6xl">
            <div className="mb-10 max-w-3xl mx-auto">
                <div className="flex justify-between items-end mb-3">
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Hiring Preferences</h1>
                    <div className="text-right">
                        <span className={`text-sm font-medium block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 4 of 5</span>
                        <span className={`text-xs font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>80%</span>
                    </div>
                </div>
                <div className={`w-full rounded-full h-2.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-blue-500/30" style={{ width: '80%' }} />
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-8 flex">
                    <div className={`flex flex-col flex-1 rounded-2xl border shadow-sm p-8 space-y-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} id="services-field-label">
                                What services do you need? <span className="text-red-500">*</span>
                            </label>
                            <span className={`text-xs shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>SELECT AT LEAST ONE</span>
                        </div>

                        <div className="space-y-2">
                            <button
                                type="button"
                                id="services-dropdown-toggle"
                                aria-expanded={servicesOpen}
                                aria-controls="services-dropdown-panel"
                                aria-labelledby="services-field-label"
                                onClick={() => setServicesOpen(o => !o)}
                                className={darkMode
                                    ? 'flex w-full items-center justify-between gap-3 rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-left text-sm text-white shadow-sm hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    : 'flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-left text-sm text-gray-900 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'}
                            >
                                <span className="font-medium">Choose services</span>
                                <span className={`material-icons text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{servicesOpen ? 'expand_less' : 'expand_more'}</span>
                            </button>
                            {servicesOpen && (
                                <div
                                    id="services-dropdown-panel"
                                    role="region"
                                    aria-label="Service categories"
                                    className={`max-h-60 overflow-y-auto rounded-lg border p-3 space-y-0.5 ${darkMode ? 'border-gray-600 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}
                                >
                                    {standardCategories.map((cat) => {
                                        const checked = hiringNeeds.some(n => n.toLowerCase() === cat.toLowerCase());
                                        return (
                                            <label
                                                key={cat}
                                                className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm ${darkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-white text-gray-800'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                                                    checked={checked}
                                                    onChange={() => toggleStandardCategory(cat)}
                                                />
                                                <span>{cat}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className={`rounded-lg border p-4 space-y-3 ${darkMode ? 'border-gray-600 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
                            <label className={`flex cursor-pointer items-start gap-3 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                                    checked={otherState.intent}
                                    onChange={e => handleOtherCheckbox(e.target.checked)}
                                />
                                <span>
                                    <span className="font-semibold">Other</span>
                                    <span className={`block text-xs font-normal mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                        Describe a service not listed above. It will be checked before it is added.
                                    </span>
                                </span>
                            </label>
                            {otherState.intent && (
                                <div className="space-y-2 pl-0 sm:pl-7">
                                    <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                                        <input
                                            id="hiring-need-other-text"
                                            type="text"
                                            maxLength={255}
                                            value={otherState.text}
                                            onChange={e => {
                                                setOtherState(prev => ({ ...prev, text: e.target.value }));
                                                setOtherError(null);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    verifyAndAddOther();
                                                }
                                            }}
                                            placeholder="e.g. Event staffing, CAD drafting…"
                                            disabled={validatingOther}
                                            className={darkMode
                                                ? 'block w-full min-w-0 flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
                                                : 'block w-full min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => verifyAndAddOther()}
                                            disabled={validatingOther || !String(otherState.text || '').trim()}
                                            className="shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 sm:self-stretch"
                                        >
                                            {validatingOther ? 'Checking…' : 'Verify & add'}
                                        </button>
                                    </div>
                                    {otherError && (
                                        <p className="text-xs text-red-500 flex items-start gap-1">
                                            <span className="material-icons text-sm shrink-0">error_outline</span>
                                            {otherError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {hiringNeeds.length > 0 && (
                            <div>
                                <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Selected</p>
                                <div className="flex flex-wrap gap-2">
                                    {hiringNeeds.map((need, i) => (
                                        <span
                                            key={`${need}-${i}`}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${darkMode ? 'bg-blue-900/40 border-blue-700 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                                        >
                                            {need}
                                            <button type="button" onClick={() => removeService(i)} className="hover:text-red-500 transition" aria-label={`Remove ${need}`}>
                                                <span className="material-icons text-sm">close</span>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {errors.primary_hiring_needs && <p className="text-xs text-red-500">{errors.primary_hiring_needs}</p>}
                    </div>
                </div>

                <div className="lg:col-span-4 flex">
                    <div className={`flex flex-col flex-1 rounded-2xl border shadow-sm p-8 space-y-6 h-full ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="typical_project_budget">
                                Typical Budget <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="typical_project_budget"
                                value={data.typical_project_budget}
                                onChange={e => setData('typical_project_budget', e.target.value)}
                                className={darkMode ? 'block w-full rounded-lg border border-gray-600 bg-gray-700 text-white focus:border-blue-500 focus:ring-blue-500 text-sm p-3 shadow-sm' : 'block w-full rounded-lg border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 text-sm p-3 shadow-sm border'}
                            >
                                <option value="">Select Range</option>
                                {budgetOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            {errors.typical_project_budget && <p className="text-xs text-red-500">{errors.typical_project_budget}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="typical_project_duration">
                                Typical Duration <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="typical_project_duration"
                                value={data.typical_project_duration}
                                onChange={e => setData('typical_project_duration', e.target.value)}
                                className={darkMode ? 'block w-full rounded-lg border border-gray-600 bg-gray-700 text-white focus:border-blue-500 focus:ring-blue-500 text-sm p-3 shadow-sm' : 'block w-full rounded-lg border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 text-sm p-3 shadow-sm border'}
                            >
                                <option value="">Select Duration</option>
                                {durationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            {errors.typical_project_duration && <p className="text-xs text-red-500">{errors.typical_project_duration}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="preferred_experience_level">
                                Talent level <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="preferred_experience_level"
                                value={data.preferred_experience_level}
                                onChange={e => setData('preferred_experience_level', e.target.value)}
                                className={darkMode ? 'block w-full rounded-lg border border-gray-600 bg-gray-700 text-white focus:border-blue-500 focus:ring-blue-500 text-sm p-3 shadow-sm' : 'block w-full rounded-lg border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 text-sm p-3 shadow-sm border'}
                            >
                                <option value="">Select Experience</option>
                                {experienceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            {errors.preferred_experience_level && <p className="text-xs text-red-500">{errors.preferred_experience_level}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="hiring_frequency">
                                Hiring frequency <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="hiring_frequency"
                                value={data.hiring_frequency}
                                onChange={e => setData('hiring_frequency', e.target.value)}
                                className={darkMode ? 'block w-full rounded-lg border border-gray-600 bg-gray-700 text-white focus:border-blue-500 focus:ring-blue-500 text-sm p-3 shadow-sm' : 'block w-full rounded-lg border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 text-sm p-3 shadow-sm border'}
                            >
                                <option value="">Select Frequency</option>
                                {frequencyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            {errors.hiring_frequency && <p className="text-xs text-red-500">{errors.hiring_frequency}</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`fixed bottom-0 left-0 right-0 border-t py-4 px-6 z-40 ${darkMode ? 'bg-gray-800 border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]'}`}>
                <div className="container mx-auto max-w-6xl flex items-center justify-between">
                    <button onClick={onBack} className={`inline-flex items-center px-6 py-2.5 border text-sm font-medium rounded-lg transition shadow-sm ${darkMode ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}>
                        <span className="material-icons text-sm mr-2">arrow_back</span>
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        disabled={
                            otherBlocksNext
                            || (data.primary_hiring_needs || []).length === 0
                            || !(data.typical_project_budget || '').trim()
                            || !(data.typical_project_duration || '').trim()
                            || !(data.preferred_experience_level || '').trim()
                            || !(data.hiring_frequency || '').trim()
                        }
                        className="inline-flex items-center px-8 py-2.5 text-sm font-medium rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Review Profile
                        <span className="material-icons text-sm ml-2">arrow_forward</span>
                    </button>
                </div>
            </div>
            <div className="h-20" />
        </main>
    );
}

export { EmployerStep3Bio, EmployerStep4Preferences };
