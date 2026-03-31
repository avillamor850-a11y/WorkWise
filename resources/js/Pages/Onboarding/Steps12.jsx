import { useState, useCallback, useRef, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

// ─── Step 1: Welcome ─────────────────────────────────────────────────────────
function Step1Welcome({ onNext, onSkip, darkMode = false }) {
    return (
        <main className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative overflow-hidden flex-col justify-end p-12 text-white"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)' }}>
                {/* Decorative circles */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full translate-x-1/4 translate-y-1/4 blur-3xl" />
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-6">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Join 50k+ Freelancers
                    </div>
                    <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
                        Build your career on your own terms.
                    </h2>
                    <p className="text-lg text-blue-100 max-w-md font-light leading-relaxed mb-8">
                        Connect with top clients, manage projects efficiently, and get paid securely — all in one workspace.
                    </p>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 max-w-sm">
                        <div className="flex text-yellow-400 text-sm mb-2">
                            {[...Array(5)].map((_, i) => <span key={i} className="material-icons text-base">star</span>)}
                        </div>
                        <p className="text-sm italic text-gray-200 mb-3">
                            "WorkWise transformed how I find gigs. The platform is intuitive and professional."
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">S</div>
                            <span>Sarah M., Graphic Designer</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className={`w-full lg:w-7/12 xl:w-1/2 flex flex-col overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 xl:px-24 max-w-5xl mx-auto w-full">
                    <div className="mb-10">
                        <h1 className={`text-3xl sm:text-4xl font-bold mb-3 tracking-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                            Welcome to WorkWise! <span className="inline-block animate-bounce">👋</span>
                        </h1>
                        <p className={`text-lg leading-relaxed max-w-2xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Let's set up your professional profile. Completing these steps will boost your visibility by{' '}
                            <span className="text-blue-400 font-semibold">3x</span> to potential employers.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                        {[
                            { num: 1, icon: 'person_outline', title: 'Basic Info', desc: 'Professional background and headline.' },
                            { num: 2, icon: 'design_services', title: 'Skills', desc: 'Expertise areas and skill levels.' },
                            { num: 3, icon: 'folder_open', title: 'Portfolio', desc: 'Showcase your best work samples.' },
                        ].map((item) => (
                            <div key={item.num} className={`group relative rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition-all cursor-default ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-blue-500/50' : 'bg-white border-blue-600/10 hover:border-blue-600/40'}`}>
                                <div className={`absolute top-4 right-4 font-bold text-5xl opacity-20 select-none ${darkMode ? 'text-gray-500' : 'text-gray-200'}`}>{item.num}</div>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <span className="material-icons">{item.icon}</span>
                                </div>
                                <h3 className={`font-bold text-base mb-1 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{item.title}</h3>
                                <p className={`text-xs leading-snug ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className={`rounded-lg p-4 flex gap-3 items-start border ${darkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-100'}`}>
                        <span className={`material-icons text-xl mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>info</span>
                        <div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-blue-200' : 'text-gray-700'}`}>Identity Verification</p>
                            <p className={`text-xs mt-1 ${darkMode ? 'text-blue-300' : 'text-gray-500'}`}>
                                You can complete ID verification later from your dashboard. No credit card required.
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`border-t p-6 sm:px-12 xl:px-24 sticky bottom-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-gray-100 bg-white'}`}>
                    <div className="max-w-5xl mx-auto flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                        <button onClick={onSkip} className={`font-medium text-sm py-2 px-4 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
                            Skip setup for now
                        </button>
                        <button onClick={onNext} className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                            Get Started
                            <span className="material-icons text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}

// ─── Step 2: Professional Info ────────────────────────────────────────────────
function Step2ProfessionalInfo({ data, setData, errors, onNext, onBack, onSaveDraft, saving, darkMode = false, csrfToken = '' }) {
    const fileRef = useRef(null);
    const [preview, setPreview] = useState(data.profile_picture_preview || null);
    const [charCount, setCharCount] = useState((data.bio || '').length);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // Sync local preview when parent gets new profile_picture_preview (e.g. after refresh with saved photo)
    useEffect(() => {
        if (data.profile_picture_preview) setPreview(data.profile_picture_preview);
        else if (!data.profile_picture_file) setPreview(null);
    }, [data.profile_picture_preview, data.profile_picture_file]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const blobUrl = URL.createObjectURL(file);
        setData('profile_picture_file', file);
        setData('profile_picture_preview', blobUrl);
        setPreview(blobUrl);
        setUploadError(null);
        setUploading(true);

        const formData = new FormData();
        formData.append('profile_picture', file);
        if (csrfToken) formData.append('_token', csrfToken);

        const url = typeof route !== 'undefined' ? route('gig-worker.onboarding.upload-profile-picture') : '/onboarding/gig-worker/upload-profile-picture';
        const headers = { Accept: 'application/json' };
        if (csrfToken) headers['X-CSRF-TOKEN'] = csrfToken;

        fetch(url, {
            method: 'POST',
            body: formData,
            headers,
        })
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.url) {
                    setData('profile_picture_preview', json.url);
                    setData('profile_picture_file', null);
                    setPreview(json.url);
                    URL.revokeObjectURL(blobUrl);
                } else {
                    setUploadError('Upload failed. You can try again or click Next to save.');
                    // Do not keep File in parent state: step-2 save would re-POST it and Laravel can
                    // reject the multipart with "The profile picture failed to upload."
                    setData('profile_picture_file', null);
                }
            })
            .catch(() => {
                setUploadError('Upload failed. You can try again or click Next to save.');
                setData('profile_picture_file', null);
            })
            .finally(() => setUploading(false));
    };

    const inputClass = darkMode
        ? 'block w-full rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 shadow-sm'
        : 'block w-full rounded-lg border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 shadow-sm border';
    const labelClass = darkMode ? 'block text-sm font-semibold text-gray-300' : 'block text-sm font-semibold text-gray-700';
    const hintClass = darkMode ? 'text-xs text-gray-400' : 'text-xs text-gray-500';

    return (
        <main className="flex-grow container mx-auto px-4 py-10 max-w-5xl">
            <div className="mb-10 max-w-3xl mx-auto">
                <div className="flex justify-between items-end mb-3">
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Professional Info</h1>
                    <div className="text-right">
                        <span className={`text-sm font-medium block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Step 2 of 5</span>
                        <span className={`text-xs font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>40%</span>
                    </div>
                </div>
                <div className={`w-full rounded-full h-2.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-blue-500/30" style={{ width: '40%' }} />
                </div>
            </div>

            <div className={`rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="p-8 md:p-10">
                    <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Tell us about yourself</h2>
                    <p className={`mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fill in your professional details to help clients find you.</p>

                    <div className="flex flex-col lg:flex-row gap-10">
                        {/* Left form */}
                        <div className="flex-1 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={labelClass} htmlFor="professional_title">
                                        Professional Title <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="professional_title"
                                            type="text"
                                            value={data.professional_title}
                                            onChange={e => setData('professional_title', e.target.value)}
                                            placeholder="e.g. Senior Graphic Designer"
                                            className={inputClass}
                                        />
                                        {data.professional_title && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <span className="material-icons text-green-500 text-lg">check_circle</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className={hintClass}>Describe your primary role.</p>
                                    {errors.professional_title && <p className="text-xs text-red-500">{errors.professional_title}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className={labelClass} htmlFor="hourly_rate">
                                        Hourly Rate (PHP)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className={`sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>₱</span>
                                        </div>
                                        <input
                                            id="hourly_rate"
                                            type="number"
                                            min="0"
                                            value={data.hourly_rate}
                                            onChange={e => setData('hourly_rate', e.target.value)}
                                            placeholder="0.00"
                                            className={inputClass + ' pl-8'}
                                        />
                                    </div>
                                    <p className={hintClass}>Suggested range: ₱500 – ₱2,500 based on experience.</p>
                                    {errors.hourly_rate && <p className="text-xs text-red-500">{errors.hourly_rate}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className={labelClass} htmlFor="bio">
                                        Professional Bio <span className="text-red-500">*</span>
                                    </label>
                                    <span className={hintClass}>Markdown supported</span>
                                </div>
                                <div className="relative">
                                    <textarea
                                        id="bio"
                                        rows={8}
                                        value={data.bio}
                                        onChange={e => { setData('bio', e.target.value); setCharCount(e.target.value.length); }}
                                        placeholder="Tell clients about your experience..."
                                        className={darkMode
                                            ? 'block w-full rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 shadow-sm min-h-[220px]'
                                            : 'block w-full rounded-lg border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 shadow-sm border min-h-[220px]'}
                                    />
                                </div>
                                <div className={`flex justify-between items-center text-xs p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50'}`}>
                                    <div className={`flex items-center font-medium ${charCount >= 100 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-gray-400' : 'text-gray-400')}`}>
                                        {charCount >= 100 && <span className="material-icons text-sm mr-1">check_circle</span>}
                                        {charCount >= 100 ? `Great length! (${charCount} chars)` : `${charCount} chars (min 100)`}
                                    </div>
                                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Max: 1000</span>
                                </div>
                                {errors.bio && <p className="text-xs text-red-500">{errors.bio}</p>}
                            </div>
                        </div>

                        {/* Right: Profile Photo */}
                        <div className={`w-full lg:w-72 flex-shrink-0 flex flex-col items-center justify-start pt-2 border-t lg:border-t-0 lg:border-l lg:pl-10 mt-8 lg:mt-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <h3 className={`text-sm font-semibold mb-6 self-start lg:self-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Profile Photo (Optional)</h3>
                            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                                <div className={`w-48 h-48 rounded-full border-4 border-dashed flex items-center justify-center transition-all overflow-hidden relative ${darkMode ? 'border-gray-600 bg-gray-700 group-hover:bg-gray-600' : 'border-gray-300 bg-gray-50 group-hover:bg-gray-100'}`}>
                                    {preview ? (
                                        <img src={typeof preview === 'string' && preview.startsWith('blob:') ? preview : (resolveProfileImageUrl(preview) || preview)} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <span className={`material-icons text-5xl mb-2 group-hover:text-blue-500 transition-colors block ${darkMode ? 'text-gray-500' : 'text-gray-300'}`}>account_circle</span>
                                            <p className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No photo uploaded</p>
                                        </div>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">Uploading…</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800'}`}>Upload</span>
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
                                </div>
                                <div className="absolute bottom-2 right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg pointer-events-none group-hover:scale-110 transition-transform">
                                    <span className="material-icons text-lg leading-none">edit</span>
                                </div>
                            </div>
                            <div className="mt-6 text-center">
                                <button type="button" onClick={() => fileRef.current?.click()} className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center justify-center gap-1 mb-2">
                                    <span className="material-icons text-base">file_upload</span>
                                    Choose File
                                </button>
                                <p className={`text-xs max-w-[200px] mx-auto leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    JPG, PNG or GIF. Max size of 2MB.<br />
                                    <span className="text-green-400 mt-1 block">Profiles with photos get 40% more views.</span>
                                </p>
                                {uploadError && <p className="text-xs text-amber-600 mt-2">{uploadError}</p>}
                                {errors.profile_picture && <p className="text-xs text-red-500 mt-2">{errors.profile_picture}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Nav */}
            <div className={`fixed bottom-0 left-0 right-0 border-t py-4 px-6 z-40 ${darkMode ? 'bg-gray-800 border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]' : 'bg-white border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]'}`}>
                <div className="container mx-auto max-w-5xl flex items-center justify-between">
                    <button onClick={onBack} className={`inline-flex items-center px-6 py-2.5 border text-sm font-medium rounded-lg transition shadow-sm ${darkMode ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}>
                        <span className="material-icons text-sm mr-2">arrow_back</span>
                        Back
                    </button>
                    <div className="flex gap-4">
                        <button onClick={onSaveDraft} disabled={saving} className={darkMode ? 'text-gray-400 hover:text-gray-200 text-sm font-medium px-4 py-2 transition' : 'text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 transition'}>
                            {saving ? 'Saving...' : 'Save as Draft'}
                        </button>
                        <button onClick={onNext} className="inline-flex items-center px-8 py-2.5 text-sm font-medium rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 transition active:scale-95">
                            Next Step
                            <span className="material-icons text-sm ml-2">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="h-20" />
        </main>
    );
}

export { Step1Welcome, Step2ProfessionalInfo };
