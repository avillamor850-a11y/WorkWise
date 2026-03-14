import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { useState, useRef, useCallback, useEffect } from 'react';
import useSkillPipeline from '@/Hooks/useSkillPipeline.js';
import FuzzySkillPrompt from '@/Components/FuzzySkillPrompt';

const PROFICIENCY_OPTIONS = [
    { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-700' },
    { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-100 text-blue-700' },
    { value: 'expert', label: 'Expert', color: 'bg-purple-100 text-purple-700' },
];

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, children, error, dark = false }) {
    return (
        <div>
            <label className={`block text-sm font-semibold mb-1 ${dark ? 'text-gray-100' : 'text-gray-700'}`}>{label}</label>
            {hint && <p className={`text-xs mb-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{hint}</p>}
            {children}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    );
}

// ─── Card section ─────────────────────────────────────────────────────────────
function Section({ title, icon, children, dark = false }) {
    return (
        <div className={dark ? 'bg-gray-800 rounded-xl border border-gray-700 overflow-hidden' : "bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"}>
            <div className={`px-6 py-4 flex items-center gap-3 ${dark ? 'border-b border-gray-700' : 'border-b border-gray-100'}`}>
                <div className={dark ? "w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center" : "w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"}>
                    <span className={dark ? "material-icons text-blue-400 text-base" : "material-icons text-blue-600 text-base"}>{icon}</span>
                </div>
                <h2 className={`text-sm font-semibold uppercase tracking-wider ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
            </div>
            <div className="p-6 space-y-5">{children}</div>
        </div>
    );
}

// ─── Skills editor ────────────────────────────────────────────────────────────
function SkillsEditor({ skills, onChange, dark = false }) {
    const [search, setSearch] = useState('');
    const debounceRef = useRef(null);

    const {
        suggestions,
        loadSuggestions,
        validateAndAdd,
        isValidating,
        validationError,
        setValidationError,
        fuzzyPrompt,
        acceptFuzzy,
        rejectFuzzy,
        dismissFuzzy,
    } = useSkillPipeline();

    useEffect(() => {
        clearTimeout(debounceRef.current);
        if (search.trim().length >= 1) {
            debounceRef.current = setTimeout(() => loadSuggestions(search.trim()), 250);
        }
        return () => clearTimeout(debounceRef.current);
    }, [search, loadSuggestions]);

    const filtered = search.trim()
        ? suggestions
            .filter((s) => {
                const str = typeof s === 'string' ? s : String(s);
                return str.toLowerCase().includes(search.toLowerCase()) && !skills.find(sk => sk.skill && sk.skill.trim().toLowerCase() === str.trim().toLowerCase());
            })
            .map(s => typeof s === 'string' ? s : String(s))
            .slice(0, 8)
        : [];

    const addVerifiedSkill = useCallback((skillName) => {
        const trimmed = (skillName || '').trim();
        if (!trimmed) return;
        if (skills.find(s => s.skill && s.skill.trim().toLowerCase() === trimmed.toLowerCase())) {
            setSearch('');
            return;
        }
        onChange([...skills, { skill: trimmed, proficiency: 'intermediate', category: null }]);
        setSearch('');
    }, [skills, onChange]);

    const handleKeyDown = useCallback(async (e) => {
        if (e.key !== 'Enter' || !search.trim()) return;
        e.preventDefault();
        const trimmed = search.trim();
        if (skills.find(s => s.skill && s.skill.trim().toLowerCase() === trimmed.toLowerCase())) {
            setSearch('');
            return;
        }
        const isVerified = suggestions.some(s => (typeof s === 'string' ? s : String(s)).toLowerCase() === trimmed.toLowerCase());
        if (isVerified) {
            const canonical = suggestions.find(s => (typeof s === 'string' ? s : String(s)).toLowerCase() === trimmed.toLowerCase()) || trimmed;
            addVerifiedSkill(canonical);
            return;
        }
        const result = await validateAndAdd(trimmed);
        if (result && result.skill) {
            addVerifiedSkill(result.skill);
        }
    }, [search, skills, suggestions, validateAndAdd, addVerifiedSkill]);

    const removeSkill = (idx) => {
        onChange(skills.filter((_, i) => i !== idx));
    };

    const setProficiency = (idx, prof) => {
        const updated = [...skills];
        updated[idx] = { ...updated[idx], proficiency: prof };
        onChange(updated);
    };

    const profColorsDark = [
        { value: 'beginner', label: 'Beginner', color: 'bg-green-500/20 text-green-400 border border-green-500/30' },
        { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
        { value: 'expert', label: 'Expert', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
    ];

    return (
        <div className="space-y-4">
            {fuzzyPrompt && (
                <FuzzySkillPrompt
                    prompt={fuzzyPrompt}
                    onAccept={acceptFuzzy}
                    onReject={rejectFuzzy}
                    onDismiss={dismissFuzzy}
                    variant={dark ? 'dark' : 'light'}
                />
            )}

            {validationError && (
                <div className={`rounded-xl p-4 flex items-start gap-3 border ${dark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'}`}>
                    <span className="material-icons text-red-500 mt-0.5">error_outline</span>
                    <p className={`flex-1 text-sm ${dark ? 'text-red-300' : 'text-red-700'}`}>{validationError}</p>
                    <button type="button" onClick={() => setValidationError(null)} className={dark ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'}>
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>
            )}

            <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 material-icons text-base ${dark ? 'text-gray-500' : 'text-gray-400'}`}>search</span>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isValidating ? "Checking…" : "Search or type a skill, press Enter to add"}
                    disabled={isValidating}
                    className={dark ? "w-full pl-9 pr-4 py-2.5 border border-gray-600 rounded-lg text-sm bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none disabled:opacity-70" : "w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-70"}
                />
                {filtered.length > 0 && (
                    <div className={`absolute top-full left-0 right-0 z-20 mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto ${dark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        {filtered.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => addVerifiedSkill(s)}
                                className={`w-full text-left px-3 py-2 text-sm ${dark ? 'text-gray-200 hover:bg-blue-500/20 hover:text-blue-400' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {skills.length > 0 && (
                <div className="space-y-2">
                    {skills.map((sk, i) => (
                        <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                            <span className={`flex-1 text-sm font-medium pl-1 ${dark ? 'text-gray-100' : 'text-gray-800'}`}>{sk.skill}</span>
                            <div className="flex gap-1">
                                {(dark ? profColorsDark : PROFICIENCY_OPTIONS).map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setProficiency(i, p.value)}
                                        className={dark
                                            ? `px-2 py-0.5 rounded text-xs font-medium transition-all ${sk.proficiency === p.value ? p.color + ' ring-1 ring-offset-1 ring-offset-gray-900 ring-current' : 'bg-gray-800 border border-gray-600 text-gray-400 hover:text-gray-200'}`
                                            : `px-2 py-0.5 rounded text-xs font-medium transition-all ${sk.proficiency === p.value ? p.color + ' ring-1 ring-offset-1 ring-current' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`
                                        }
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => removeSkill(i)}
                                className={dark ? "text-gray-500 hover:text-red-400 transition-colors ml-1" : "text-gray-400 hover:text-red-500 transition-colors ml-1"}
                            >
                                <span className="material-icons text-base">close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {skills.length === 0 && (
                <p className={`text-xs text-center py-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No skills added yet. Search above to add your first skill.</p>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GigWorkerEdit({ user, status }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // ── Profile photo state ───────────────────────────────────────────────
    const [photoPreview, setPhotoPreview] = useState(user.profile_picture || null);
    const photoRef = useRef(null);

    // ── Resume state ──────────────────────────────────────────────────────
    const [resumeName, setResumeName] = useState(user.resume_file_name || (user.resume_file ? 'Current CV' : null));

    // ── Location autodetect state ──────────────────────────────────────────
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [locationError, setLocationError] = useState(null);

    // ── Skills state (managed separately as an array) ─────────────────────
    const [skills, setSkills] = useState(
        Array.isArray(user.skills_with_experience) ? user.skills_with_experience : []
    );

    // ── Inertia form ──────────────────────────────────────────────────────
    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        professional_title: user.professional_title || '',
        bio: user.bio || '',
        hourly_rate: user.hourly_rate || '',
        portfolio_link: user.portfolio_link || '',
        country: user.country || '',
        city: user.city || '',
        skills_with_experience: JSON.stringify(user.skills_with_experience || []),
        profile_picture: null,
        resume_file: null,
    });

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData('profile_picture', file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleResumeChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData('resume_file', file);
        setResumeName(file.name);
    };

    const handleSkillsChange = (updatedSkills) => {
        setSkills(updatedSkills);
        setData('skills_with_experience', JSON.stringify(updatedSkills));
    };

    const handleAutoDetectLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }
        setDetectingLocation(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                        { headers: { 'Accept-Language': 'en', 'User-Agent': 'WorkWise/1.0' } }
                    );
                    if (!response.ok) throw new Error('Reverse geocoding failed.');
                    const result = await response.json();
                    const addr = result.address || {};
                    const detectedCity = addr.city || addr.town || addr.village || addr.county || '';
                    const detectedCountry = addr.country || '';
                    setData((prev) => ({ ...prev, city: detectedCity, country: detectedCountry }));
                } catch {
                    setLocationError('Could not detect location. Please enter manually.');
                } finally {
                    setDetectingLocation(false);
                }
            },
            () => {
                setLocationError('Location access denied. Please enter manually.');
                setDetectingLocation(false);
            },
            { timeout: 10000 }
        );
    }, [setData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('gig-worker.profile.update') || '/profile/gig-worker/edit', {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'GW';

    return (
        <AuthenticatedLayout pageTheme={isDark ? 'dark' : undefined}>
            <Head title="Edit Profile – WorkWise" />

            <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* ─── Top bar ─────────────────────────────────────────── */}
                <div className={`sticky top-0 z-10 border-b ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/profile/gig-worker"
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}
                            >
                                <span className="material-icons">arrow_back</span>
                            </Link>
                            <div>
                                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Profile</h1>
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Update your gig worker information</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/profile/gig-worker"
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                form="gig-worker-edit-form"
                                disabled={processing}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
                            >
                                {processing
                                    ? <><span className="material-icons text-base animate-spin">progress_activity</span> Saving…</>
                                    : <><span className="material-icons text-base">save</span> Save Changes</>
                                }
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Success banner ───────────────────────────────────── */}
                {status === 'profile-updated' && (
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                        <div className="flex items-center gap-3 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-3 text-green-400">
                            <span className="material-icons text-green-400">check_circle</span>
                            <span className="text-sm font-medium">Profile updated successfully!</span>
                        </div>
                    </div>
                )}

                {/* ─── Form ─────────────────────────────────────────────── */}
                <form id="gig-worker-edit-form" onSubmit={handleSubmit}>
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                        {/* ── Profile Photo ─────────────────────────────── */}
                        <Section title="Profile Photo" icon="person" dark={isDark}>
                            <div className="flex items-center gap-6">
                                <div className="relative flex-shrink-0">
                                    {photoPreview ? (
                                        <img
                                            src={photoPreview}
                                            alt="Profile preview"
                                            className={`w-24 h-24 rounded-full object-cover border-4 shadow-md ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                                        />
                                    ) : (
                                        <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold border-4 shadow-md ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                                            {initials}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => photoRef.current?.click()}
                                        className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 shadow-md hover:bg-blue-500 transition"
                                    >
                                        <span className="material-icons text-sm leading-none">camera_alt</span>
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => photoRef.current?.click()}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition flex items-center gap-2 ${isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        <span className="material-icons text-base">upload</span>
                                        Upload new photo
                                    </button>
                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>JPG, PNG or WebP · Max 5MB</p>
                                    {errors.profile_picture && <p className="text-xs text-red-400">{errors.profile_picture}</p>}
                                </div>
                                <input
                                    ref={photoRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </div>
                        </Section>

                        {/* ── Basic Info ────────────────────────────────── */}
                        <Section title="Basic Information" icon="badge" dark={isDark}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="First Name" error={errors.first_name} dark={isDark}>
                                    <input
                                        type="text"
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        className={`w-full px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                                        placeholder="Juan"
                                    />
                                </Field>
                                <Field label="Last Name" error={errors.last_name} dark={isDark}>
                                    <input
                                        type="text"
                                        value={data.last_name}
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        className={`w-full px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                                        placeholder="Dela Cruz"
                                    />
                                </Field>
                            </div>
                            <Field label="Professional Title" hint="E.g. Full-Stack Developer, Graphic Designer, VA" error={errors.professional_title} dark={isDark}>
                                <input
                                    type="text"
                                    value={data.professional_title}
                                    onChange={(e) => setData('professional_title', e.target.value)}
                                    className={`w-full px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                                    placeholder="Senior UX Designer & Brand Strategist"
                                />
                            </Field>
                        </Section>

                        {/* ── Bio ───────────────────────────────────────── */}
                        <Section title="About Me" icon="description" dark={isDark}>
                            <Field
                                label="Bio"
                                hint="Tell clients what you do, your experience, and what makes you stand out."
                                error={errors.bio}
                                dark={isDark}
                            >
                                <textarea
                                    value={data.bio}
                                    onChange={(e) => setData('bio', e.target.value)}
                                    rows={5}
                                    maxLength={1000}
                                    className={`w-full px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none resize-none border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                                    placeholder="I specialize in creating user-centric digital experiences…"
                                />
                                <div className="flex justify-end mt-1">
                                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{data.bio.length} / 1000</span>
                                </div>
                            </Field>
                        </Section>

                        {/* ── Rate & Portfolio ──────────────────────────── */}
                        <Section title="Rate & Portfolio" icon="attach_money" dark={isDark}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="Hourly Rate (₱/hr)" hint="Set your base rate in Philippine Peso" error={errors.hourly_rate} dark={isDark}>
                                    <div className="relative">
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-medium text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>₱</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={data.hourly_rate}
                                            onChange={(e) => setData('hourly_rate', e.target.value)}
                                            className={`w-full pl-7 pr-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                                            placeholder="500.00"
                                        />
                                    </div>
                                </Field>
                                <Field label="Portfolio / Website URL" hint="Optional link to your portfolio or website" error={errors.portfolio_link} dark={isDark}>
                                    <div className="relative">
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 material-icons text-base ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>language</span>
                                        <input
                                            type="text"
                                            value={data.portfolio_link}
                                            onChange={(e) => setData('portfolio_link', e.target.value)}
                                            className={`w-full pl-9 pr-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                                            placeholder="https://yourportfolio.com"
                                        />
                                    </div>
                                </Field>
                            </div>
                        </Section>

                        {/* ── Location ─────────────────────────────────────── */}
                        <Section title="Location" icon="location_on" dark={isDark}>
                            <div className="space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Enter your country and city, or use auto-detect.</p>
                                    <button
                                        type="button"
                                        onClick={handleAutoDetectLocation}
                                        disabled={detectingLocation}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                                    >
                                        <span className={`material-icons text-base${detectingLocation ? ' animate-spin' : ''}`}>
                                            {detectingLocation ? 'refresh' : 'my_location'}
                                        </span>
                                        {detectingLocation ? 'Detecting...' : 'Auto detect location'}
                                    </button>
                                </div>
                                {locationError && (
                                    <p className="text-xs text-red-400 flex items-center gap-1">
                                        <span className="material-icons text-sm">error</span>
                                        {locationError}
                                    </p>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="Country" error={errors.country} dark={isDark}>
                                        <input
                                            type="text"
                                            value={data.country}
                                            onChange={(e) => setData('country', e.target.value)}
                                            className={`w-full px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                                            placeholder="e.g. Philippines"
                                        />
                                    </Field>
                                    <Field label="City" error={errors.city} dark={isDark}>
                                        <input
                                            type="text"
                                            value={data.city}
                                            onChange={(e) => setData('city', e.target.value)}
                                            className={`w-full px-3 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none border ${isDark ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                                            placeholder="e.g. Manila"
                                        />
                                    </Field>
                                </div>
                            </div>
                        </Section>

                        {/* ── Skills ────────────────────────────────────── */}
                        <Section title="Skills & Expertise" icon="star" dark={isDark}>
                            <SkillsEditor
                                skills={skills}
                                onChange={handleSkillsChange}
                                dark={isDark}
                            />
                        </Section>

                        {/* ── Resume ───────────────────────────────────── */}
                        <Section title="Resume / CV" icon="description" dark={isDark}>
                            <div className="space-y-3">
                                {resumeName && (
                                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                        <span className={isDark ? 'material-icons text-blue-400' : 'material-icons text-blue-600'}>description</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{resumeName}</p>
                                            {user.resume_file && (
                                                <a href={user.resume_file} target="_blank" rel="noopener noreferrer" className={`text-xs hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    View current file
                                                </a>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setResumeName(null); setData('resume_file', null); }}
                                            className={isDark ? 'text-gray-500 hover:text-red-400 transition' : 'text-gray-400 hover:text-red-500 transition'}
                                        >
                                            <span className="material-icons text-base">close</span>
                                        </button>
                                    </div>
                                )}

                                <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all group ${isDark ? 'border-gray-600 hover:border-blue-500/50 hover:bg-blue-500/10' : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'}`}>
                                    <span className={`material-icons text-3xl mb-1 ${isDark ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-600'}`}>upload_file</span>
                                    <span className={`text-sm font-medium ${isDark ? 'text-gray-400 group-hover:text-blue-400' : 'text-gray-600 group-hover:text-blue-600'}`}>
                                        {resumeName ? 'Replace resume' : 'Upload resume'}
                                    </span>
                                    <span className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>PDF, DOC, DOCX · Max 10MB</span>
                                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeChange} />
                                </label>
                                {errors.resume_file && <p className="text-xs text-red-400">{errors.resume_file}</p>}
                            </div>
                        </Section>

                        {/* ── Bottom Save ───────────────────────────────── */}
                        <div className="flex justify-end gap-3 pt-2 pb-8">
                            <Link
                                href="/profile/gig-worker"
                                className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition ${isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
                            >
                                {processing
                                    ? <><span className="material-icons text-base animate-spin">progress_activity</span> Saving…</>
                                    : <><span className="material-icons text-base">save</span> Save Changes</>
                                }
                            </button>
                        </div>

                    </div>
                </form>
            </div>

            {isDark && (
            <style>{`
                body { background: #111827; color: #e5e7eb; font-family: 'Inter', system-ui, sans-serif; }
            `}</style>
            )}
        </AuthenticatedLayout>
    );
}
