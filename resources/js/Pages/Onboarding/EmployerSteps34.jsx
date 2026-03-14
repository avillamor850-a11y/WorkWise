import { useState, useCallback, useEffect, useRef } from 'react';
import useSkillPipeline from '@/Hooks/useSkillPipeline.js';
import FuzzySkillPrompt from '@/Components/FuzzySkillPrompt';

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
function EmployerStep4Preferences({ data, setData, errors, serviceCategories, onNext, onBack, darkMode = false }) {
    const [serviceSearch, setServiceSearch] = useState('');
    const hiringNeeds = data.primary_hiring_needs || [];

    const addService = (category) => {
        const trimmed = (category || '').trim();
        if (!trimmed || hiringNeeds.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
            setServiceSearch('');
            return;
        }
        const canonical = (serviceCategories || []).find(c => c.toLowerCase() === trimmed.toLowerCase());
        if (!canonical) return;
        setData('primary_hiring_needs', [...hiringNeeds, canonical]);
        setServiceSearch('');
    };

    const removeService = (index) => {
        setData('primary_hiring_needs', hiringNeeds.filter((_, i) => i !== index));
    };

    const filteredServices = serviceSearch.trim()
        ? (serviceCategories || []).filter(c =>
            c.toLowerCase().includes(serviceSearch.toLowerCase()) &&
            !hiringNeeds.some(n => n.toLowerCase() === c.toLowerCase())
        )
        : [];

    const hasExactMatch = serviceSearch.trim() && (serviceCategories || []).some(c =>
        c.toLowerCase() === serviceSearch.trim().toLowerCase()
    );

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

            <div className="grid lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8">
                    <div className={`rounded-2xl border shadow-sm p-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="mb-6 flex justify-between items-center">
                            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                What services do you need? <span className="text-red-500">*</span>
                            </label>
                            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>SELECT AT LEAST ONE</span>
                        </div>

                        <div className="relative mb-4">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className={`material-icons text-lg ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>search</span>
                            </div>
                            <input
                                type="text"
                                value={serviceSearch}
                                onChange={e => setServiceSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (hasExactMatch ? addService(serviceSearch) : (filteredServices[0] && addService(filteredServices[0])))}
                                placeholder="Search and select a service..."
                                className={darkMode ? 'block w-full pl-11 pr-16 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm' : 'block w-full pl-11 pr-16 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm'}
                            />
                            <button
                                type="button"
                                onClick={() => addService(hasExactMatch ? serviceSearch : (filteredServices[0] ?? null))}
                                disabled={!hasExactMatch && filteredServices.length === 0}
                                className="absolute right-2 top-2 bottom-2 bg-gray-900 text-white px-4 rounded-lg text-xs font-medium hover:bg-gray-800 transition disabled:opacity-40"
                            >
                                Add
                            </button>
                        </div>

                        {serviceSearch.trim() && filteredServices.length > 0 && (
                            <div className={`mb-4 border rounded-xl shadow-lg overflow-hidden max-h-40 overflow-y-auto ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                {filteredServices.slice(0, 6).map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => addService(c)}
                                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        <span>{c}</span>
                                        <span className={`material-icons text-sm ${darkMode ? 'text-gray-500' : 'text-gray-300'}`}>add</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {hiringNeeds.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {hiringNeeds.map((need, i) => (
                                    <span
                                        key={i}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${darkMode ? 'bg-blue-900/40 border-blue-700 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                                    >
                                        {need}
                                        <button type="button" onClick={() => removeService(i)} className="hover:text-red-500 transition">
                                            <span className="material-icons text-sm">close</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {(serviceCategories || []).length > 0 && (
                            <div>
                                <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Browse all services</p>
                                <div className="flex flex-wrap gap-2">
                                    {(serviceCategories || []).filter(c => !hiringNeeds.some(n => n.toLowerCase() === c.toLowerCase())).map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => addService(cat)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${darkMode ? 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            + {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {errors.primary_hiring_needs && <p className="text-xs text-red-500 mt-4">{errors.primary_hiring_needs}</p>}
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className={`rounded-2xl border shadow-sm p-8 space-y-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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

            <EmployerSkillsBlock data={data} setData={setData} errors={errors} darkMode={darkMode} />

            <div className={`fixed bottom-0 left-0 right-0 border-t py-4 px-6 z-40 ${darkMode ? 'bg-gray-800 border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]'}`}>
                <div className="container mx-auto max-w-6xl flex items-center justify-between">
                    <button onClick={onBack} className={`inline-flex items-center px-6 py-2.5 border text-sm font-medium rounded-lg transition shadow-sm ${darkMode ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}>
                        <span className="material-icons text-sm mr-2">arrow_back</span>
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        disabled={(data.primary_hiring_needs || []).length === 0 || !(data.typical_project_budget || '').trim() || !(data.typical_project_duration || '').trim() || !(data.preferred_experience_level || '').trim() || !(data.hiring_frequency || '').trim()}
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

// ─── Employer Skills Block (used inside Step 4) ──────────────────────────────
function EmployerSkillsBlock({ data, setData, errors, darkMode = false }) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categorySkills, setCategorySkills] = useState([]);
    const debounceRef = useRef(null);
    const hiringSkills = data.primary_hiring_skills || [];

    const {
        suggestions, categories, loadSuggestions, loadCategorySkills,
        validateAndAdd, isValidating, validationError, setValidationError,
        fuzzyPrompt, acceptFuzzy, rejectFuzzy, dismissFuzzy,
    } = useSkillPipeline();

    useEffect(() => {
        clearTimeout(debounceRef.current);
        if (search.trim().length >= 1) {
            debounceRef.current = setTimeout(() => loadSuggestions(search.trim()), 250);
        }
        return () => clearTimeout(debounceRef.current);
    }, [search, loadSuggestions]);

    useEffect(() => {
        if (selectedCategory) {
            loadCategorySkills(selectedCategory).then(setCategorySkills);
        } else {
            setCategorySkills([]);
        }
    }, [selectedCategory, loadCategorySkills]);

    const filtered = search.trim()
        ? suggestions.filter(s => s.toLowerCase().includes(search.toLowerCase()) && !hiringSkills.includes(s))
        : [];

    const addSkill = useCallback(async (name) => {
        const trimmed = (name || '').trim();
        if (!trimmed || hiringSkills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
            setSearch('');
            return;
        }
        const isVerified = suggestions.some(s => s.toLowerCase() === trimmed.toLowerCase());
        if (isVerified) {
            const canonical = suggestions.find(s => s.toLowerCase() === trimmed.toLowerCase()) || trimmed;
            setData('primary_hiring_skills', [...hiringSkills, canonical]);
            setSearch('');
            return;
        }
        const result = await validateAndAdd(trimmed);
        if (result) {
            setData('primary_hiring_skills', [...(data.primary_hiring_skills || []), result.skill]);
            setSearch('');
        }
    }, [hiringSkills, suggestions, validateAndAdd, setData, data.primary_hiring_skills]);

    const removeSkill = (i) => setData('primary_hiring_skills', hiringSkills.filter((_, idx) => idx !== i));

    return (
        <div className="mt-8">
            <div className={`rounded-xl border shadow-sm p-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="mb-6">
                    <label className={`block text-sm font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Skills You Often Hire For <span className={`font-normal ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(Optional)</span>
                    </label>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Select skills to help us pre-fill your job posts and find better talent matches.</p>
                </div>

                {fuzzyPrompt && (
                    <div className="mb-4">
                        <FuzzySkillPrompt prompt={fuzzyPrompt} onAccept={acceptFuzzy} onReject={rejectFuzzy} onDismiss={dismissFuzzy} />
                    </div>
                )}
                {validationError && (
                    <div className={`mb-4 rounded-lg p-3 flex items-start gap-2 border ${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'}`}>
                        <span className="material-icons text-red-500 text-lg">error_outline</span>
                        <p className={`text-sm flex-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{validationError}</p>
                        <button onClick={() => setValidationError(null)} className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'}>
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>
                )}

                {categories.length > 0 && (
                    <div className="mb-4">
                        <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Browse by category</p>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => setSelectedCategory('')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${!selectedCategory ? 'bg-blue-600 text-white border-blue-600' : darkMode ? 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                                All
                            </button>
                            {categories.slice(0, 15).map(cat => (
                                <button type="button" key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600' : darkMode ? 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedCategory && categorySkills.length > 0 && (
                    <div className="mb-4">
                        <p className={`text-xs mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Top skills in <strong className={darkMode ? 'text-gray-400' : ''}>{selectedCategory}</strong>:</p>
                        <div className="flex flex-wrap gap-2">
                            {categorySkills.map(s => {
                                const added = hiringSkills.some(h => h.toLowerCase() === s.toLowerCase());
                                return (
                                    <button key={s} type="button" onClick={() => !added && addSkill(s)} disabled={added}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${added ? (darkMode ? 'bg-green-900/30 text-green-400 border-green-700 cursor-default' : 'bg-green-50 text-green-700 border-green-200 cursor-default') : (darkMode ? 'bg-blue-900/40 text-blue-400 border-blue-700 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100')}`}>
                                        {added ? '✓ ' : '+ '}{s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className={`material-icons text-lg ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>search</span>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && search && addSkill(search)}
                        placeholder="Search or add a skill..."
                        className={darkMode ? 'block w-full pl-11 pr-16 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm' : 'block w-full pl-11 pr-16 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm'}
                        disabled={isValidating}
                    />
                    <button onClick={() => addSkill(search)} disabled={isValidating || !search.trim()}
                        className="absolute right-2 top-2 bottom-2 bg-gray-900 text-white px-4 rounded-lg text-xs font-medium hover:bg-gray-800 transition disabled:opacity-40">
                        {isValidating ? '...' : 'Add'}
                    </button>
                </div>

                {filtered.length > 0 && (
                    <div className={`mb-4 border rounded-xl shadow-lg overflow-hidden max-h-40 overflow-y-auto ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        {filtered.slice(0, 6).map(s => (
                            <button key={s} type="button" onClick={() => addSkill(s)}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                                <span>{s}</span>
                                <span className={`material-icons text-sm ${darkMode ? 'text-gray-500' : 'text-gray-300'}`}>add</span>
                            </button>
                        ))}
                        {search.trim() && !filtered.some(s => s.toLowerCase() === search.trim().toLowerCase()) && (
                            <button type="button" onClick={() => addSkill(search)}
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium border-t flex items-center gap-2 ${darkMode ? 'hover:bg-green-900/30 text-green-400 border-gray-700' : 'hover:bg-green-50 text-green-700 border-gray-100'}`}>
                                <span className="material-icons text-sm">add_circle</span>
                                Add "{search.trim()}" as new skill
                            </button>
                        )}
                    </div>
                )}

                {hiringSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {hiringSkills.map((s, i) => (
                            <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${darkMode ? 'bg-blue-900/40 border-blue-700 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                {s}
                                <button type="button" onClick={() => removeSkill(i)} className="hover:text-red-500 transition">
                                    <span className="material-icons text-sm">close</span>
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                {errors.primary_hiring_skills && <p className="text-xs text-red-500 mt-2">{errors.primary_hiring_skills}</p>}
            </div>
        </div>
    );
}

export { EmployerStep3Bio, EmployerStep4Preferences };
