import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import { useState, useRef, useCallback } from 'react';

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, children, error, icon, isDark }) {
    return (
        <div className="space-y-2">
            <label className={`block text-sm font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{label}</label>
            {hint && <p className="text-xs text-gray-500 ml-1">{hint}</p>}
            <div className="relative group">
                {icon && (
                    <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-primary ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="material-symbols-outlined text-lg">{icon}</span>
                    </div>
                )}
                {children}
            </div>
            {error && <p className="text-xs text-red-400 mt-1 ml-1 animate-pulse">{error}</p>}
        </div>
    );
}

// ─── Card section ─────────────────────────────────────────────────────────────
function Section({ title, icon, colorClass, children, isDark }) {
    return (
        <div className={`backdrop-blur-md rounded-3xl shadow-soft overflow-hidden transition-all hover:shadow-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow'}`}>
            <div className={`px-8 py-5 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <span className="material-symbols-outlined text-lg">{icon}</span>
                    </div>
                    <h2 className={`text-sm font-black uppercase tracking-[0.15em] ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{title}</h2>
                </div>
            </div>
            <div className="p-8 space-y-6">{children}</div>
        </div>
    );
}

const INITIAL_KEYS = [
    'first_name', 'last_name', 'email', 'company_name', 'industry', 'company_size',
    'company_website', 'bio', 'company_description', 'country', 'city',
];

const HIRING_SELECT_KEYS = [
    'typical_project_budget',
    'typical_project_duration',
    'preferred_experience_level',
    'hiring_frequency',
];

const BUDGET_OPTIONS = [
    { value: 'under_500', label: 'Under ₱500' },
    { value: '500-2000', label: '₱500 - ₱2,000' },
    { value: '2000-5000', label: '₱2,000 - ₱5,000' },
    { value: '5000-10000', label: '₱5,000 - ₱10,000' },
    { value: '10000+', label: '₱10,000+' },
];

const DURATION_OPTIONS = [
    { value: 'short_term', label: 'Short-term (< 1 month)' },
    { value: 'medium_term', label: 'Medium-term (1-3 months)' },
    { value: 'long_term', label: 'Long-term (3-6 months)' },
    { value: 'ongoing', label: 'Ongoing (6+ months)' },
];

const EXPERIENCE_OPTIONS = [
    { value: 'any', label: 'Any level' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'expert', label: 'Expert' },
];

const FREQUENCY_OPTIONS = [
    { value: 'one_time', label: 'One-time project' },
    { value: 'occasional', label: 'Occasional' },
    { value: 'regular', label: 'Regular (Monthly)' },
    { value: 'ongoing', label: 'Ongoing simultaneous' },
];

export default function EmployerEdit({ user, status, serviceCategories = [] }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [photoPreview, setPhotoPreview] = useState(user.profile_picture || null);
    const photoRef = useRef(null);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const initialValues = useRef(
        Object.fromEntries(INITIAL_KEYS.map((k) => [k, user[k] || '']))
    );
    const initialHiringNeeds = useRef(JSON.stringify(user.primary_hiring_needs || []));
    const initialHiringSelects = useRef(
        Object.fromEntries(HIRING_SELECT_KEYS.map((k) => [k, user[k] || '']))
    );

    const page = usePage();
    const errors = page.props.errors || {};

    const { data, setData } = useForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        company_name: user.company_name || '',
        industry: user.industry || '',
        company_size: user.company_size || '',
        company_website: user.company_website || '',
        bio: user.bio || '',
        company_description: user.company_description || '',
        profile_picture: null,
        country: user.country || '',
        city: user.city || '',
        primary_hiring_needs: Array.isArray(user.primary_hiring_needs) ? user.primary_hiring_needs : [],
        typical_project_budget: user.typical_project_budget || '',
        typical_project_duration: user.typical_project_duration || '',
        preferred_experience_level: user.preferred_experience_level || '',
        hiring_frequency: user.hiring_frequency || '',
    });

    const standardCategories = (serviceCategories || []).filter((c) => c !== 'Other');

    const toggleHiringNeed = (canonical) => {
        const list = data.primary_hiring_needs || [];
        const has = list.some((n) => n.toLowerCase() === canonical.toLowerCase());
        if (has) {
            setData(
                'primary_hiring_needs',
                list.filter((n) => n.toLowerCase() !== canonical.toLowerCase())
            );
        } else {
            setData('primary_hiring_needs', [...list, canonical]);
        }
    };

    const isDirty =
        data.profile_picture instanceof File ||
        INITIAL_KEYS.some((k) => data[k] !== initialValues.current[k]) ||
        JSON.stringify(data.primary_hiring_needs || []) !== initialHiringNeeds.current ||
        HIRING_SELECT_KEYS.some((k) => data[k] !== initialHiringSelects.current[k]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData('profile_picture', file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('first_name', data.first_name || '');
        fd.append('last_name', data.last_name || '');
        fd.append('email', data.email || '');
        fd.append('company_name', data.company_name || '');
        fd.append('industry', data.industry || '');
        fd.append('company_size', data.company_size || '');
        fd.append('company_website', data.company_website || '');
        fd.append('bio', data.bio || '');
        fd.append('company_description', data.company_description || '');
        fd.append('country', data.country || '');
        fd.append('city', data.city || '');
        fd.append('primary_hiring_needs_json', JSON.stringify(data.primary_hiring_needs || []));
        fd.append('typical_project_budget', data.typical_project_budget || '');
        fd.append('typical_project_duration', data.typical_project_duration || '');
        fd.append('preferred_experience_level', data.preferred_experience_level || '');
        fd.append('hiring_frequency', data.hiring_frequency || '');
        if (data.profile_picture instanceof File) {
            fd.append('profile_picture', data.profile_picture);
        }
        setSubmitting(true);
        router.post(route('employer.profile.update'), fd, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
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

    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'E';

    return (
        <AuthenticatedLayout pageTheme={isDark ? 'dark' : undefined}>
            <Head title="Edit Employer Profile - WorkWise" />
            {isDark && <style>{`body { background: #111827; color: #e5e7eb; }`}</style>}

            <div className={`min-h-screen pb-16 relative ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Background Decor */}
                <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>

                {/* Header Section */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-3">
                                <Link href={route('employer.profile')} className={isDark ? 'text-blue-400 hover:text-blue-300 hover:underline' : 'text-blue-600 hover:text-blue-700 hover:underline'}>Profile</Link>
                                <span className={`material-symbols-outlined text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>chevron_right</span>
                                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Edit Mode</span>
                            </div>
                            <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Edit Profile</h1>
                            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Update your identity and company presence on WorkWise.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href={route('employer.profile')}
                                className={`px-6 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${isDark ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                            >
                                Cancel
                            </Link>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !isDirty}
                                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center gap-2"
                            >
                                {submitting ? (
                                    <><span className="material-symbols-outlined text-lg text-white animate-spin">refresh</span> Saving...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-lg text-white">save</span> Save Changes</>
                                )}
                            </button>
                        </div>
                    </div>

                    {status === 'profile-updated' && (
                        <div className="bg-green-900/50 border border-green-700 text-green-200 rounded-2xl p-4 mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                            <span className="material-symbols-outlined">check_circle</span>
                            <span className="text-sm font-bold">Profile successfully updated!</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* ── Personal Info ─────────────────────────────── */}
                        <Section title="Personal Information" icon="person" colorClass="bg-blue-900/50 text-blue-400" isDark={isDark}>
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="flex flex-col items-center gap-3">
                                    <div
                                        onClick={() => photoRef.current?.click()}
                                        className="relative group cursor-pointer"
                                    >
                                        <div className={`w-32 h-32 rounded-full shadow-inner border-4 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`}>
                                            {photoPreview ? (
                                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl font-black text-primary opacity-40">{initials}</span>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                                            <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Company Logo</span>
                                    <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                </div>

                                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                    <Field label="First Name" error={errors.first_name} icon="badge" isDark={isDark}>
                                        <input
                                            type="text"
                                            value={data.first_name}
                                            onChange={(e) => setData('first_name', e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner ${isDark ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                        />
                                    </Field>
                                    <Field label="Last Name" error={errors.last_name} icon="badge" isDark={isDark}>
                                        <input
                                            type="text"
                                            value={data.last_name}
                                            onChange={(e) => setData('last_name', e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-white placeholder-gray-500 transition-all shadow-inner ${isDark ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                        />
                                    </Field>
                                    <div className="md:col-span-2">
                                        <Field label="Email" error={errors.email} icon="mail" isDark={isDark}>
                                            <input
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner ${isDark ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                                placeholder="you@example.com"
                                            />
                                        </Field>
                                    </div>
                                    <div className="md:col-span-2">
                                        <Field label="Professional Bio" hint="Keep it short and punchy for your mini-profile." error={errors.bio} icon="description" isDark={isDark}>
                                            <input
                                                type="text"
                                                value={data.bio}
                                                maxLength={1000}
                                                onChange={(e) => setData('bio', e.target.value)}
                                                className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner ${isDark ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                                placeholder="Technical Lead @ TechFlow"
                                            />
                                        </Field>
                                    </div>
                                </div>
                            </div>
                        </Section>

                        {/* ── Company Details ───────────────────────────── */}
                        <Section title="Company Details" icon="business" colorClass="bg-purple-900/50 text-purple-400" isDark={isDark}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <Field label="Company Name" error={errors.company_name} icon="corporate_fare" isDark={isDark}>
                                        <input
                                            type="text"
                                            value={data.company_name}
                                            onChange={(e) => setData('company_name', e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner ${isDark ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                        />
                                    </Field>
                                </div>
                                <Field label="Industry" error={errors.industry} icon="category" isDark={isDark}>
                                    <input
                                        type="text"
                                        value={data.industry}
                                        onChange={(e) => setData('industry', e.target.value)}
                                        placeholder="e.g. Software Development"
                                        className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner ${isDark ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                    />
                                </Field>
                                <Field label="Company Size" error={errors.company_size} icon="groups" isDark={isDark}>
                                    <select
                                        value={data.company_size}
                                        onChange={(e) => setData('company_size', e.target.value)}
                                        className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner appearance-none cursor-pointer ${isDark ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-white border border-gray-300 text-gray-900'}`}
                                    >
                                        <option value="">Select Size</option>
                                        <option value="1-10">1-10 employees</option>
                                        <option value="11-50">11-50 employees</option>
                                        <option value="51-200">51-200 employees</option>
                                        <option value="201-500">201-500 employees</option>
                                        <option value="500+">500+ employees</option>
                                    </select>
                                </Field>
                                <div className="md:col-span-2">
                                    <Field label="Company Description" hint="Detailed overview of what your company does and why workers should join." error={errors.company_description} isDark={isDark}>
                                        <textarea
                                            value={data.company_description}
                                            onChange={(e) => setData('company_description', e.target.value)}
                                            rows={5}
                                            className={`w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner resize-none ${isDark ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                            placeholder="Write about your company's mission and culture..."
                                        />
                                    </Field>
                                </div>
                                <div className="md:col-span-2">
                                    <Field label="Website URL" error={errors.company_website} icon="language" isDark={isDark}>
                                        <input
                                            type="url"
                                            value={data.company_website}
                                            onChange={(e) => setData('company_website', e.target.value)}
                                            placeholder="https://example.com"
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner ${isDark ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                        />
                                    </Field>
                                </div>
                            </div>
                        </Section>

                        {/* ── Hiring preferences (feeds profile completeness + job flows) ── */}
                        <Section title="Hiring Preferences" icon="tune" colorClass="bg-emerald-900/50 text-emerald-400" isDark={isDark}>
                            <p className={`text-xs -mt-2 mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Used for your profiling score and job posting defaults. Matches employer onboarding.
                            </p>
                            <div className="space-y-6">
                                <div>
                                    <p className={`text-sm font-bold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                        Services you hire for
                                    </p>
                                    <div
                                        className={`max-h-56 overflow-y-auto rounded-xl border p-3 space-y-1 ${isDark ? 'border-gray-600 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}
                                    >
                                        {standardCategories.length === 0 ? (
                                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                No service list loaded. Refresh the page or contact support.
                                            </p>
                                        ) : (
                                            standardCategories.map((cat) => {
                                                const checked = (data.primary_hiring_needs || []).some(
                                                    (n) => n.toLowerCase() === cat.toLowerCase()
                                                );
                                                return (
                                                    <label
                                                        key={cat}
                                                        className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-white text-gray-800'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                                                            checked={checked}
                                                            onChange={() => toggleHiringNeed(cat)}
                                                        />
                                                        <span>{cat}</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                    {errors.primary_hiring_needs && (
                                        <p className="text-xs text-red-400 mt-2">{errors.primary_hiring_needs}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field label="Typical project budget" error={errors.typical_project_budget} icon="payments" isDark={isDark}>
                                        <select
                                            value={data.typical_project_budget}
                                            onChange={(e) => setData('typical_project_budget', e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-inner appearance-none cursor-pointer ${isDark ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-white border border-gray-300 text-gray-900'}`}
                                        >
                                            <option value="">Select budget range</option>
                                            {BUDGET_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Typical project duration" error={errors.typical_project_duration} icon="schedule" isDark={isDark}>
                                        <select
                                            value={data.typical_project_duration}
                                            onChange={(e) => setData('typical_project_duration', e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-inner appearance-none cursor-pointer ${isDark ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-white border border-gray-300 text-gray-900'}`}
                                        >
                                            <option value="">Select duration</option>
                                            {DURATION_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Preferred experience level" error={errors.preferred_experience_level} icon="school" isDark={isDark}>
                                        <select
                                            value={data.preferred_experience_level}
                                            onChange={(e) => setData('preferred_experience_level', e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-inner appearance-none cursor-pointer ${isDark ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-white border border-gray-300 text-gray-900'}`}
                                        >
                                            <option value="">Select level</option>
                                            {EXPERIENCE_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Hiring frequency" error={errors.hiring_frequency} icon="event_repeat" isDark={isDark}>
                                        <select
                                            value={data.hiring_frequency}
                                            onChange={(e) => setData('hiring_frequency', e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-inner appearance-none cursor-pointer ${isDark ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-white border border-gray-300 text-gray-900'}`}
                                        >
                                            <option value="">Select frequency</option>
                                            {FREQUENCY_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </div>
                        </Section>

                        {/* ── Location ──────────────────────────────────── */}
                        <Section title="Office Location" icon="location_on" colorClass="bg-orange-900/50 text-orange-400" isDark={isDark}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 flex items-center justify-between">
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Enter your country and city, or use auto-detect.</p>
                                    <button
                                        type="button"
                                        onClick={handleAutoDetectLocation}
                                        disabled={detectingLocation}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isDark ? 'bg-gray-700 text-orange-400 border-gray-600 hover:bg-gray-600' : 'bg-white text-orange-600 border-gray-300 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <span className={`material-symbols-outlined text-base${detectingLocation ? ' animate-spin' : ''}`}>
                                            {detectingLocation ? 'refresh' : 'my_location'}
                                        </span>
                                        {detectingLocation ? 'Detecting...' : 'Auto detect location'}
                                    </button>
                                </div>
                                {locationError && (
                                    <div className="md:col-span-2">
                                        <p className="text-xs text-red-400 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">error</span>
                                            {locationError}
                                        </p>
                                    </div>
                                )}
                                <Field label="Country" error={errors.country} icon="public" isDark={isDark}>
                                    <input
                                        type="text"
                                        value={data.country}
                                        onChange={(e) => setData('country', e.target.value)}
                                        placeholder="e.g. Philippines"
                                        className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner ${isDark ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                    />
                                </Field>
                                <Field label="City" error={errors.city} icon="location_city" isDark={isDark}>
                                    <input
                                        type="text"
                                        value={data.city}
                                        onChange={(e) => setData('city', e.target.value)}
                                        placeholder="e.g. Manila"
                                        className={`w-full pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-inner ${isDark ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                                    />
                                </Field>
                            </div>
                        </Section>

                        {/* Save Bar */}
                        <div className="flex items-center justify-end gap-4 pt-10">
                            {isDirty ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('Discard all unsaved changes and go back to your profile?')) {
                                            router.visit(route('employer.profile'));
                                        }
                                    }}
                                    className={`px-8 py-3 rounded-xl border-2 font-bold transition-all ${isDark ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                                >
                                    Discard Changes
                                </button>
                            ) : (
                                <span className={`px-8 py-3 rounded-xl border-2 font-bold cursor-not-allowed opacity-50 select-none ${isDark ? 'border-gray-700 text-gray-500 bg-gray-800' : 'border-gray-200 text-gray-400 bg-gray-100'}`}>
                                    Discard Changes
                                </span>
                            )}
                            <button
                                type="submit"
                                disabled={submitting || !isDirty}
                                className="px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-1 active:translate-y-0 active:shadow-sm transition-all flex items-center gap-3"
                            >
                                {submitting ? (
                                    <><span className="material-symbols-outlined text-xl text-white animate-spin">refresh</span> Processing...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-xl text-white">verified</span> Update Profile</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
