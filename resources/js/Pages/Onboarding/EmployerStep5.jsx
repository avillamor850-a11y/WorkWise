import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

// ─── Stat Item (Reusable for review) ──────────────────────────────────────────
function ReviewItem({ label, value, icon, darkMode = false }) {
    return (
        <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                <span className="material-icons text-xl">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{label}</p>
                <p className={`text-sm font-medium truncate ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{value || 'Not specified'}</p>
            </div>
        </div>
    );
}

export default function EmployerStep5Review({ data, onSubmit, onBack, submitting, goToStep, darkMode = false }) {
    return (
        <main className="max-w-4xl mx-auto px-4 py-8 mb-20">
            <div className="mb-10 text-center">
                <div className="flex justify-center mb-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${darkMode ? 'bg-blue-900/50 text-blue-400 border-blue-700' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        Step 5 of 5
                    </div>
                </div>
                <h1 className={`text-3xl font-bold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Review Your Profile</h1>
                <p className={`max-w-lg mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Everything looks great! Take a quick look before we finalize.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Company Info & Bio */}
                <div className={`border rounded-xl shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-5 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-500 text-xl">business</span>
                            <h3 className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Company Identity</h3>
                        </div>
                        <button onClick={() => goToStep(2)} className={`transition-colors p-1 rounded ${darkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-600' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-200'}`}>
                            <span className="material-icons text-[20px]">edit</span>
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className={`w-24 h-24 rounded-full border-2 overflow-hidden shrink-0 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-100'}`}>
                                {(() => {
                                    const src = resolveProfileImageUrl(data.profile_picture_preview) || data.profile_picture_preview;
                                    return src ? (
                                    <img src={src} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <span className="material-icons text-4xl">business</span>
                                    </div>
                                );
                                })()}
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className={`text-base font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{data.company_name || 'Individual Employer'}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        <span className="material-icons text-sm">category</span> {data.industry}
                                    </span>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        <span className="material-icons text-sm">groups</span> {data.company_size}
                                    </span>
                                    {data.company_website && (
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            <span className="material-icons text-sm">link</span> Website
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {data.company_description && (
                            <div>
                                <span className={`block text-xs font-medium uppercase tracking-wider mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Description</span>
                                <p className={`text-sm line-clamp-3 break-all ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{data.company_description}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Targeted Services */}
                <div className={`border rounded-xl shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-5 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-500 text-xl">work</span>
                            <h3 className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Targeted Services</h3>
                        </div>
                        <button onClick={() => goToStep(4)} className={`transition-colors p-1 rounded ${darkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-600' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-200'}`}>
                            <span className="material-icons text-[20px]">edit</span>
                        </button>
                    </div>
                    <div className="p-5">
                        {(data.primary_hiring_needs || []).length === 0 ? (
                            <p className={`italic text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No services selected.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(data.primary_hiring_needs || []).map((need, idx) => (
                                    <span key={idx} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${darkMode ? 'bg-blue-900/40 border-blue-700 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                                        {need}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Hiring Stats */}
                <div className={`md:col-span-2 border rounded-xl shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-5 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-500 text-xl">tune</span>
                            <h3 className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Hiring Preferences</h3>
                        </div>
                        <button onClick={() => goToStep(4)} className={`transition-colors p-1 rounded ${darkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-600' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-200'}`}>
                            <span className="material-icons text-[20px]">edit</span>
                        </button>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ReviewItem
                            icon="payments"
                            label="Typical Budget"
                            value={data.typical_project_budget?.replace(/_/g, ' ')}
                            darkMode={darkMode}
                        />
                        <ReviewItem
                            icon="schedule"
                            label="Project Duration"
                            value={data.typical_project_duration?.replace(/_/g, ' ')}
                            darkMode={darkMode}
                        />
                        <ReviewItem
                            icon="star"
                            label="Exp. Level"
                            value={data.preferred_experience_level}
                            darkMode={darkMode}
                        />
                        <ReviewItem
                            icon="event"
                            label="Frequency"
                            value={data.hiring_frequency?.replace(/_/g, ' ')}
                            darkMode={darkMode}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto mb-6">
                <div className={`rounded-lg p-4 flex items-start gap-3 border ${darkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-100'}`}>
                    <span className={`material-icons mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>verified_user</span>
                    <div>
                        <h4 className={`text-sm font-semibold mb-1 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>Verification Status</h4>
                        <p className={`text-sm leading-relaxed ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                            As an employer, your profile is auto-approved upon completion. You can start posting jobs immediately.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto flex flex-col items-center gap-4">
                <button
                    onClick={onSubmit}
                    disabled={submitting}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl text-lg font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            Complete Profile
                            <span className="material-icons">check_circle</span>
                        </>
                    )}
                </button>
                <button onClick={onBack} disabled={submitting} className={`text-sm font-medium flex items-center gap-1 transition-colors py-2 disabled:opacity-50 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`}>
                    <span className="material-icons text-sm">arrow_back</span>
                    Back to previous step
                </button>
            </div>
        </main>
    );
}
