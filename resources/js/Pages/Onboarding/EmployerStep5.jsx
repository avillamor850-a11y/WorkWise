// ─── Stat Item (Reusable for review) ──────────────────────────────────────────
function ReviewItem({ label, value, icon }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 transition-all hover:bg-gray-100">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-icons text-xl">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-900 truncate">{value || 'Not specified'}</p>
            </div>
        </div>
    );
}

export default function EmployerStep5Review({ data, onSubmit, onBack, submitting, goToStep }) {
    return (
        <main className="max-w-4xl mx-auto px-4 py-8 mb-20">
            <div className="mb-10 text-center">
                <div className="flex justify-center mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        Step 5 of 5
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Review Your Profile</h1>
                <p className="text-gray-500 max-w-lg mx-auto">Everything looks great! Take a quick look before we finalize.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Company Info & Bio */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-600 text-xl">business</span>
                            <h3 className="font-semibold text-gray-900">Company Identity</h3>
                        </div>
                        <button onClick={() => goToStep(2)} className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-200">
                            <span className="material-icons text-[20px]">edit</span>
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-24 h-24 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-100 shrink-0">
                                {data.profile_picture_preview ? (
                                    <img src={data.profile_picture_preview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <span className="material-icons text-4xl">business</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className="text-base font-medium text-gray-900">{data.company_name || 'Individual Employer'}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200 flex items-center gap-1">
                                        <span className="material-icons text-sm">category</span> {data.industry}
                                    </span>
                                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200 flex items-center gap-1">
                                        <span className="material-icons text-sm">groups</span> {data.company_size}
                                    </span>
                                    {data.company_website && (
                                        <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200 flex items-center gap-1">
                                            <span className="material-icons text-sm">link</span> Website
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {data.company_description && (
                            <div>
                                <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</span>
                                <p className="text-sm text-gray-700 line-clamp-3 break-all">{data.company_description}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Targeted Services */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-600 text-xl">work</span>
                            <h3 className="font-semibold text-gray-900">Targeted Services</h3>
                        </div>
                        <button onClick={() => goToStep(4)} className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-200">
                            <span className="material-icons text-[20px]">edit</span>
                        </button>
                    </div>
                    <div className="p-5">
                        {(data.primary_hiring_needs || []).length === 0 ? (
                            <p className="text-gray-400 italic text-sm">No services selected.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(data.primary_hiring_needs || []).map((need, idx) => (
                                    <span key={idx} className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
                                        {need}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Hiring Stats */}
                <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-blue-600 text-xl">tune</span>
                            <h3 className="font-semibold text-gray-900">Hiring Preferences</h3>
                        </div>
                        <button onClick={() => goToStep(4)} className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-200">
                            <span className="material-icons text-[20px]">edit</span>
                        </button>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ReviewItem
                            icon="payments"
                            label="Typical Budget"
                            value={data.typical_project_budget?.replace(/_/g, ' ')}
                        />
                        <ReviewItem
                            icon="schedule"
                            label="Project Duration"
                            value={data.typical_project_duration?.replace(/_/g, ' ')}
                        />
                        <ReviewItem
                            icon="star"
                            label="Exp. Level"
                            value={data.preferred_experience_level}
                        />
                        <ReviewItem
                            icon="event"
                            label="Frequency"
                            value={data.hiring_frequency?.replace(/_/g, ' ')}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto mb-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                    <span className="material-icons text-blue-600 mt-0.5">verified_user</span>
                    <div>
                        <h4 className="text-sm font-semibold text-blue-800 mb-1">Verification Status</h4>
                        <p className="text-sm text-blue-700 leading-relaxed">
                            As an employer, your profile is auto-approved upon completion. You can start posting jobs immediately.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto flex flex-col items-center gap-4">
                <button
                    onClick={onSubmit}
                    disabled={submitting}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl text-lg font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
                <button onClick={onBack} disabled={submitting} className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-1 transition-colors py-2 disabled:opacity-50">
                    <span className="material-icons text-sm">arrow_back</span>
                    Back to previous step
                </button>
            </div>
        </main>
    );
}
