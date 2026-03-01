import { useState, useRef, useEffect, useCallback } from 'react';
import useSkillPipeline from '@/Hooks/useSkillPipeline.js';
import FuzzySkillPrompt from '@/Components/FuzzySkillPrompt';

// Skill color palette based on initials
const SKILL_COLORS = [
    { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-green-100', text: 'text-green-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-pink-100', text: 'text-pink-700' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
    { bg: 'bg-teal-100', text: 'text-teal-700' },
];
const colorFor = (i) => SKILL_COLORS[i % SKILL_COLORS.length];
const initials = (s) => s.slice(0, 2).toUpperCase();

const LEVELS = ['beginner', 'intermediate', 'expert'];

// ─── Step 3: Skills ───────────────────────────────────────────────────────────
function Step3Skills({ data, setData, errors, onNext, onBack }) {
    const [search, setSearch] = useState('');
    const skills = data.skills_with_experience || [];
    const debounceRef = useRef(null);

    const {
        suggestions, loadSuggestions, validateAndAdd,
        isValidating, validationError, setValidationError,
        fuzzyPrompt, acceptFuzzy, rejectFuzzy, dismissFuzzy,
    } = useSkillPipeline();

    // Debounced search against API
    useEffect(() => {
        clearTimeout(debounceRef.current);
        if (search.trim().length >= 1) {
            debounceRef.current = setTimeout(() => loadSuggestions(search.trim()), 250);
        }
        return () => clearTimeout(debounceRef.current);
    }, [search, loadSuggestions]);

    const filtered = search.trim()
        ? suggestions.filter(s => s.toLowerCase().includes(search.toLowerCase()) && !skills.find(sk => sk.skill.toLowerCase() === s.toLowerCase()))
        : [];

    const addSkill = useCallback(async (name) => {
        const trimmed = (name || '').trim();
        if (!trimmed) return;
        if (skills.find(s => s.skill.toLowerCase() === trimmed.toLowerCase())) { setSearch(''); return; }

        // Check if the skill is already in verified suggestions → skip validation
        const isVerified = suggestions.some(s => s.toLowerCase() === trimmed.toLowerCase());
        if (isVerified) {
            const canonical = suggestions.find(s => s.toLowerCase() === trimmed.toLowerCase()) || trimmed;
            setData('skills_with_experience', [...skills, { skill: canonical, category: '', proficiency: 'intermediate' }]);
            setSearch('');
            return;
        }

        // Run full pipeline: validate → fuzzy → ensure
        const result = await validateAndAdd(trimmed);
        if (result) {
            setData('skills_with_experience', [...(data.skills_with_experience || []), { skill: result.skill, category: '', proficiency: 'intermediate' }]);
            setSearch('');
        }
    }, [skills, suggestions, validateAndAdd, setData, data.skills_with_experience]);

    const removeSkill = (i) => setData('skills_with_experience', skills.filter((_, idx) => idx !== i));

    const setLevel = (i, level) => {
        const updated = skills.map((s, idx) => idx === i ? { ...s, proficiency: level } : s);
        setData('skills_with_experience', updated);
    };

    const enoughSkills = skills.length >= 3;

    return (
        <main className="flex-grow px-6 py-10 max-w-7xl mx-auto w-full">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gig Worker Onboarding</h1>
                    <p className="text-gray-500 mt-1">Complete your profile to start receiving job offers.</p>
                </div>
                <div className="text-right">
                    <div className="flex justify-end gap-2 text-sm font-medium text-gray-500 mb-2">
                        <span>Step 3 of 5</span>
                        <span className="text-blue-600">60% Complete</span>
                    </div>
                    <div className="w-64 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '60%' }} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <div className="mb-8 border-b border-gray-200 pb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Expertise & Skills Selection</h2>
                    <p className="text-base text-gray-500 mt-1">Add your expertise areas and set your experience level for each to match with relevant gigs.</p>
                </div>

                {/* Fuzzy "Did you mean?" prompt */}
                {fuzzyPrompt && (
                    <div className="mb-6">
                        <FuzzySkillPrompt prompt={fuzzyPrompt} onAccept={acceptFuzzy} onReject={rejectFuzzy} onDismiss={dismissFuzzy} />
                    </div>
                )}

                {/* Validation error */}
                {validationError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <span className="material-icons text-red-500 mt-0.5">error_outline</span>
                        <div className="flex-1">
                            <p className="text-sm text-red-700">{validationError}</p>
                        </div>
                        <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600">
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left: search */}
                    <div className="lg:col-span-4 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="skill-search">
                                Search & Add Skills <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-icons text-gray-400 text-xl">search</span>
                                </div>
                                <input
                                    id="skill-search"
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && search && addSkill(search)}
                                    placeholder="Type to search skills (e.g. React)"
                                    className="block w-full pl-11 pr-16 py-3.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
                                    disabled={isValidating}
                                />
                                <button onClick={() => addSkill(search)} disabled={isValidating} className="absolute right-2 top-2 bottom-2 bg-gray-900 text-white px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
                                    {isValidating ? '...' : 'Add'}
                                </button>
                            </div>
                            {filtered.length > 0 && (
                                <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                    <div className="p-2">
                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Suggested</div>
                                        {filtered.slice(0, 6).map(skill => (
                                            <button key={skill} onClick={() => addSkill(skill)} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-lg flex items-center justify-between group transition-colors">
                                                <span className="text-gray-700 group-hover:text-blue-600 font-medium">{skill}</span>
                                                <span className="material-icons text-gray-300 group-hover:text-blue-600 text-sm">add</span>
                                            </button>
                                        ))}
                                        {search.trim() && !filtered.some(s => s.toLowerCase() === search.trim().toLowerCase()) && (
                                            <button onClick={() => addSkill(search)} className="w-full text-left px-3 py-2.5 hover:bg-green-50 rounded-lg flex items-center gap-2 text-green-700 font-medium border-t border-gray-100">
                                                <span className="material-icons text-sm">add_circle</span>
                                                Add "{search.trim()}" as new skill
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 p-2 text-center text-xs text-gray-500 border-t border-gray-200">
                                        Press <kbd className="font-sans px-1 py-0.5 bg-white border border-gray-300 rounded text-gray-500 text-[10px]">↵</kbd> to add
                                    </div>
                                </div>
                            )}
                            {search.trim() && filtered.length === 0 && !isValidating && (
                                <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                    <button onClick={() => addSkill(search)} className="w-full text-left px-3 py-2.5 hover:bg-green-50 rounded-lg flex items-center gap-2 text-green-700 font-medium">
                                        <span className="material-icons text-sm">add_circle</span>
                                        Add "{search.trim()}" as new skill
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <div className="flex items-start gap-3">
                                <span className="material-icons text-blue-600 mt-0.5">info</span>
                                <div>
                                    <h4 className="font-semibold text-sm text-gray-900">Why add skills?</h4>
                                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">Adding relevant skills helps our algorithm match you with the highest paying gigs that fit your expertise level.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: selected skills */}
                    <div className="lg:col-span-8 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Your Selected Skills</h3>
                            <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border ${enoughSkills ? 'text-green-600 bg-green-50 border-green-200' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
                                {enoughSkills && <span className="material-icons text-base">check_circle</span>}
                                <span>{skills.length} selected (min 3)</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
                            {skills.map((sk, i) => {
                                const c = colorFor(i);
                                return (
                                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                                        <button onClick={() => removeSkill(i)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100">
                                            <span className="material-icons">close</span>
                                        </button>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-10 h-10 rounded-lg ${c.bg} ${c.text} flex items-center justify-center font-bold text-sm`}>{initials(sk.skill)}</div>
                                            <div>
                                                <span className="block font-bold text-gray-900 text-base">{sk.skill}</span>
                                                {sk.category && <span className="text-xs text-gray-500">{sk.category}</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Proficiency Level</span>
                                            <div className="bg-gray-100 rounded-lg p-1 flex text-sm font-medium border border-gray-200 w-full">
                                                {LEVELS.map(lvl => (
                                                    <button key={lvl} onClick={() => setLevel(i, lvl)}
                                                        className={`flex-1 py-2 px-2 rounded-md capitalize transition-colors ${sk.proficiency === lvl ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                                                        {lvl}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add more card */}
                            <button onClick={() => document.getElementById('skill-search')?.focus()}
                                className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-center h-full min-h-[160px] hover:border-blue-500/50 hover:bg-gray-50 transition-all cursor-pointer group">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-blue-50 transition-colors">
                                    <span className="material-icons text-gray-400 group-hover:text-blue-600">add</span>
                                </div>
                                <span className="text-sm font-medium text-gray-500 group-hover:text-blue-600">Add another skill</span>
                            </button>
                        </div>

                        {errors.skills_with_experience && <p className="text-xs text-red-500 mt-2">{errors.skills_with_experience}</p>}
                    </div>
                </div>

                <div className="pt-8 mt-8 border-t border-gray-200 flex items-center justify-between">
                    <button onClick={onBack} className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors">
                        <span className="material-icons text-lg mr-2">arrow_back</span>
                        Previous Step
                    </button>
                    <button onClick={onNext} disabled={!enoughSkills} className="inline-flex items-center px-8 py-3 text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Continue to Portfolio
                        <span className="material-icons text-lg ml-2">arrow_forward</span>
                    </button>
                </div>
            </div>
        </main>
    );
}

// ─── Step 4: Portfolio & Resume ───────────────────────────────────────────────
function Step4Portfolio({ data, setData, errors, onNext, onBack }) {
    const resumeRef = useRef(null);
    const [resumeName, setResumeName] = useState(data.resume_file_name || null);

    const handleResume = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData('resume_file', file);
        setData('resume_file_name', file.name); // sync name to parent state for Step 5
        setResumeName(file.name);
    };

    const removeResume = () => { setData('resume_file', null); setData('resume_file_name', null); setResumeName(null); };

    return (
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-10">
            <div className="mb-12 max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Showcase Your Work</h1>
                        <p className="text-gray-500">Step 4 of 5: Portfolio & Resume Upload</p>
                    </div>
                    <div className="w-full md:w-64">
                        <div className="flex justify-between text-xs font-semibold text-blue-600 mb-2">
                            <span>Progress</span><span>80%</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 w-[80%] rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="lg:col-span-2 space-y-8">
                    {/* Portfolio URL */}
                    <section className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <span className="material-icons">language</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Portfolio Website</h2>
                                <p className="text-sm text-gray-500">Link to your personal site, Behance, or Dribbble.</p>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-icons text-gray-400 group-focus-within:text-blue-600 transition-colors">link</span>
                            </div>
                            <input
                                type="url"
                                value={data.portfolio_link || ''}
                                onChange={e => setData('portfolio_link', e.target.value)}
                                placeholder="https://yourportfolio.com"
                                className="block w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
                            />
                            {data.portfolio_link && (
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                    <span className="text-green-500 material-icons">check_circle</span>
                                </div>
                            )}
                        </div>
                        {errors.portfolio_link && <p className="text-xs text-red-500 mt-2">{errors.portfolio_link}</p>}
                    </section>

                    {/* Resume Upload */}
                    <section className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <span className="material-icons">description</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Resume / CV</h2>
                                <p className="text-sm text-gray-500">Upload your latest resume to verify your experience.</p>
                            </div>
                        </div>
                        <div className="w-full">
                            {resumeName ? (
                                <div className="relative border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 p-8">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="h-16 w-16 bg-white rounded-lg shadow-sm flex items-center justify-center border border-gray-100">
                                                <span className="material-icons text-4xl text-blue-500">article</span>
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-medium text-gray-900 text-base">{resumeName}</h4>
                                                <p className="text-sm text-gray-500">Uploaded just now</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => resumeRef.current?.click()} className="text-sm font-medium text-blue-600 hover:text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors">Replace</button>
                                            <button onClick={removeResume} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <span className="material-icons">delete_outline</span>
                                            </button>
                                        </div>
                                    </div>
                                    <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResume} />
                                </div>
                            ) : (
                                <label className="relative border-2 border-dashed border-gray-300 rounded-xl bg-white p-10 text-center flex flex-col items-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
                                    <span className="material-icons text-5xl text-gray-300 group-hover:text-blue-400 mb-3 transition-colors">upload_file</span>
                                    <p className="text-base font-medium text-gray-700 mb-1">Click to upload or drag and drop</p>
                                    <p className="text-xs text-gray-400">PDF, DOC, DOCX (Max 10MB)</p>
                                    <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResume} />
                                </label>
                            )}
                            {errors.resume_file && <p className="text-xs text-red-500 mt-2">{errors.resume_file}</p>}
                        </div>
                    </section>
                </div>

                {/* Tips sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 sticky top-28">
                        <div className="flex items-center gap-2 mb-4 text-gray-900">
                            <span className="material-icons text-yellow-500">lightbulb</span>
                            <h3 className="font-bold text-lg">Tips for Success</h3>
                        </div>
                        <ul className="space-y-4">
                            {[
                                'Ensure your portfolio link is publicly accessible and not behind a password.',
                                'For designers, Behance or Dribbble links are highly recommended.',
                                'Keep your resume concise (1-2 pages) and highlight relevant project experience.',
                            ].map((tip, i) => (
                                <li key={i} className="flex gap-3 text-sm text-gray-600">
                                    <span className="material-icons text-green-500 text-base mt-0.5">check</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                                    <span className="material-icons text-blue-600">trending_up</span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-1">Did you know?</p>
                                    <p className="text-sm text-gray-500 leading-relaxed">Profiles with a linked portfolio receive <strong className="text-gray-800">3x more interview requests</strong> on WorkWise.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 max-w-5xl mx-auto pt-8 border-t border-gray-200 flex justify-between items-center">
                <button onClick={onBack} className="px-8 py-3 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-semibold text-base flex items-center gap-2 transition-all hover:-translate-x-1">
                    <span className="material-icons">arrow_back</span>
                    Back to Experience
                </button>
                <button onClick={onNext} className="px-8 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold text-base flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all hover:translate-x-1 hover:shadow-xl">
                    Continue to Step 5
                    <span className="material-icons">arrow_forward</span>
                </button>
            </div>
        </main>
    );
}

// ─── Step 5: Final Review ─────────────────────────────────────────────────────
function Step5Review({ data, user, onSubmit, onBack, submitting, goToStep }) {
    return (
        <main className="max-w-4xl mx-auto px-4 py-8 mb-20">
            <div className="mb-10 text-center">
                <div className="flex justify-center mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        Step 5 of 5
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Final Profile Review</h1>
                <p className="text-gray-500 max-w-lg mx-auto">Please review your information carefully. This is what clients will see when they view your profile.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Professional Info */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-600 text-xl">badge</span>
                            <h3 className="font-semibold text-gray-900">Professional Info</h3>
                        </div>
                        <button onClick={() => goToStep(2)} className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-200">
                            <span className="material-icons text-[20px]">edit</span>
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Professional Title</span>
                            <p className="text-base font-medium text-gray-900">{data.professional_title || <span className="text-gray-400 italic">Not set</span>}</p>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Hourly Rate</span>
                            <p className="text-base font-medium text-gray-900">
                                {data.hourly_rate ? <>₱{data.hourly_rate}<span className="text-gray-500 text-sm font-normal">/hour</span></> : <span className="text-gray-400 italic">Not set</span>}
                            </p>
                        </div>
                        {data.bio && (
                            <div>
                                <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Bio</span>
                                <p className="text-sm text-gray-700 line-clamp-3">{data.bio}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expertise */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-600 text-xl">psychology</span>
                            <h3 className="font-semibold text-gray-900">Your Expertise</h3>
                        </div>
                        <button onClick={() => goToStep(3)} className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-200">
                            <span className="material-icons text-[20px]">edit</span>
                        </button>
                    </div>
                    <div className="p-5">
                        {(data.skills_with_experience || []).length === 0 ? (
                            <p className="text-gray-400 italic text-sm">No skills added.</p>
                        ) : (
                            <div className="space-y-3">
                                {(data.skills_with_experience || []).map((sk, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                        <span className="text-sm font-medium text-gray-900">{sk.skill}</span>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded uppercase">{sk.proficiency}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Documents */}
                <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-600 text-xl">folder_open</span>
                            <h3 className="font-semibold text-gray-900">Documents & Links</h3>
                        </div>
                        <button onClick={() => goToStep(4)} className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-200">
                            <span className="material-icons text-[20px]">edit</span>
                        </button>
                    </div>
                    <div className="p-5 flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Portfolio Link</span>
                            {data.portfolio_link ? (
                                <a href={data.portfolio_link} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors group/link p-3 rounded-lg border border-transparent hover:border-blue-100 hover:bg-blue-50">
                                    <span className="material-icons text-xl">link</span>
                                    <span className="truncate">{data.portfolio_link}</span>
                                    <span className="material-icons text-sm opacity-0 group-hover/link:opacity-100 transition-opacity">open_in_new</span>
                                </a>
                            ) : <p className="text-gray-400 italic text-sm">No portfolio link</p>}
                        </div>
                        <div className="w-px bg-gray-200 hidden md:block" />
                        <div className="flex-1">
                            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Resume</span>
                            {(data.resume_file_name || data.resume_file) ? (
                                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                                    <div className="h-10 w-10 bg-white rounded flex items-center justify-center shadow-sm">
                                        <span className="material-icons text-blue-500">description</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {data.resume_file_name || (data.resume_file instanceof File ? data.resume_file.name : data.resume_file) || ''}
                                        </p>
                                    </div>
                                </div>
                            ) : <p className="text-gray-400 italic text-sm">No resume uploaded</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Review notice */}
            <div className="max-w-2xl mx-auto mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <span className="material-icons text-yellow-600 mt-0.5">info</span>
                    <div>
                        <h4 className="text-sm font-semibold text-yellow-800 mb-1">Review Timeframe</h4>
                        <p className="text-sm text-yellow-700 leading-relaxed">
                            After submission, your profile will be reviewed by our team within 24–48 hours. You'll receive a notification once approved!
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto flex flex-col items-center gap-4">
                <button onClick={onSubmit} disabled={submitting}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl text-lg font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                    {submitting ? 'Submitting...' : 'Submit Profile'}
                    {!submitting && <span className="material-icons">check_circle</span>}
                </button>
                <button onClick={onBack} className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-1 transition-colors py-2">
                    <span className="material-icons text-sm">arrow_back</span>
                    Back to previous step
                </button>
            </div>
        </main>
    );
}

export { Step3Skills, Step4Portfolio, Step5Review };
