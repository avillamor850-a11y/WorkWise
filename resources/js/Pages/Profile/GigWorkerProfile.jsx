import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import IDVerifiedBadge from '@/Components/IDVerifiedBadge';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

// ─── Skill color palette ───────────────────────────────────────────────────────
const SKILL_COLORS = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
    { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
    { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
    { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100' },
    { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
];
const SKILL_COLORS_DARK = [
    { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
    { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
    { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
];
const colorFor = (i, dark = false) => (dark ? SKILL_COLORS_DARK : SKILL_COLORS)[i % (dark ? SKILL_COLORS_DARK : SKILL_COLORS).length];

const proficiencyLabel = (p) => {
    if (!p) return null;
    return p.charAt(0).toUpperCase() + p.slice(1);
};

// ─── Avatar / initials helpers ────────────────────────────────────────────────
function Avatar({ user, size = 'lg', dark = false }) {
    const sizeClass = size === 'lg' ? 'w-32 h-32 text-4xl' : 'w-10 h-10 text-sm';
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'GW';
    const borderClass = dark ? 'border-gray-600' : 'border-white';

    if (user.profile_picture) {
        const resolved = resolveProfileImageUrl(user.profile_picture) || user.profile_picture;
        // #region agent log
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aefa0a'},body:JSON.stringify({sessionId:'aefa0a',location:'GigWorkerProfile.jsx:Avatar',message:'Profile img URL',data:{raw:user.profile_picture,resolved},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        return (
            <img
                src={resolved}
                alt={user.name}
                className={`${sizeClass} rounded-full border-4 ${borderClass} shadow-md object-cover bg-white`}
            />
        );
    }

    return (
        <div className={`${sizeClass} rounded-full border-4 ${borderClass} shadow-md bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold`}>
            {initials}
        </div>
    );
}

// ─── Section Cards ─────────────────────────────────────────────────────────────
function Card({ children, className = '', dark = false }) {
    return (
        <div className={dark ? `bg-gray-800 rounded-xl border border-gray-700 ${className}` : `bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
            {children}
        </div>
    );
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────
function StatRow({ icon, label, value, iconBg, iconColor, dark = false }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`p-2 ${iconBg} ${iconColor} rounded-lg`}>
                <span className="material-icons text-xl">{icon}</span>
            </div>
            <div>
                <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-500'}`}>{label}</p>
                <p className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
            </div>
        </div>
    );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, action, dark = false }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            {action}
        </div>
    );
}

function EditBtn({ onClick, dark = false }) {
    return (
        <button
            onClick={onClick}
            className={dark ? "text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/20 transition-colors" : "text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"}
        >
            <span className="material-icons text-base">edit</span>
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GigWorkerProfile({ user, status, jobContext, pastProjects = [] }) {
    const rawSkills = user.skills_with_experience;
    const skills = Array.isArray(rawSkills) ? rawSkills : [];
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'GW';

    const [linkPreview, setLinkPreview] = useState({ data: null, loading: false, error: false });
    useEffect(() => {
        if (!user.portfolio_link) return;
        setLinkPreview((p) => ({ ...p, loading: true, error: false }));
        const url = encodeURIComponent(user.portfolio_link);
        fetch(`/api/link-preview?url=${url}`)
            .then((res) => res.json())
            .then((data) => setLinkPreview({ data, loading: false, error: !!data.error }))
            .catch(() => setLinkPreview((p) => ({ ...p, loading: false, error: true })));
    }, [user.portfolio_link]);

    const { auth } = usePage().props;
    const authUser = auth?.user;
    const isEmployerViewing = authUser?.user_type === 'employer';
    const isOwnProfile = authUser?.id === user.id;

    const [isHiring, setIsHiring] = useState(false);

    const handleHireMe = () => {
        setIsHiring(true);

        // Prefer job context from props (decoded from encrypted ctx), then URL
        const jobId = jobContext?.job_id ?? new URLSearchParams(window.location.search).get('job_id');
        const jobTitle = jobContext?.job_title ?? new URLSearchParams(window.location.search).get('job_title');
        const jobBudget = jobContext?.job_budget ?? new URLSearchParams(window.location.search).get('job_budget');

        let messageText = "Hi! I viewed your profile and I'm interested in discussing a potential job opportunity with you.";
        if (jobId && jobTitle) {
            messageText = `[JOB_PREVIEW] ${JSON.stringify({
                id: jobId,
                title: jobTitle,
                budget: jobBudget || "Negotiable"
            })}`;
        }

        window.axios.post(route('messages.store'), {
            receiver_id: user.id,
            message: messageText
        }).then(() => {
            router.visit(route('messages.conversation', user.id));
        }).catch((error) => {
            console.error("Error sending hire message", error);
            setIsHiring(false);
            router.visit(route('messages.conversation', user.id));
        });
    };

    const goToEdit = () => router.visit('/profile/gig-worker/edit');
    const goToOnboarding = () => router.visit(route('gig-worker.onboarding'));

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <AuthenticatedLayout pageTheme={isDark ? 'dark' : undefined}>
            <Head title={`${user.name} – Profile`} />

            <div className={`min-h-screen pb-16 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Ambient glow */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
                </div>

                {/* Back to Browse Gig Workers (when employer is viewing) */}
                {isEmployerViewing && (
                    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                        <Link
                            href={route('employer.dashboard')}
                            className="inline-flex items-center gap-2 text-sm font-medium text-gray-200 hover:text-gray-100 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                            Back to Browse Gig Workers
                        </Link>
                    </div>
                )}

                {/* ─── Cover + Profile Hero ──────────────────────────────── */}
                <div className="relative z-10 bg-gray-800 border-b border-gray-700 mb-6">
                    {/* Cover banner */}
                    <div
                        className="h-48 relative"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #6366f1 100%)' }}
                    >
                        <div className="absolute top-6 right-12 w-32 h-32 rounded-full bg-gray-800 border border-gray-700" />
                        <div className="absolute -top-4 right-32 w-48 h-48 rounded-full bg-gray-800 border border-gray-700" />
                    </div>

                    {/* Profile info row */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 relative">
                        <div className="flex flex-col md:flex-row items-end md:items-end justify-between -mt-6 md:-mt-6 relative z-10 gap-4">
                            <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                                <div className="relative shrink-0">
                                    <Avatar user={user} size="lg" dark={isDark} />
                                    {!isEmployerViewing && (
                                        <button
                                            onClick={goToEdit}
                                            className="absolute bottom-1 right-1 bg-gray-700 border border-gray-600 p-1.5 rounded-full text-gray-200 hover:text-gray-100 hover:bg-gray-600 transition-colors"
                                        >

                                        </button>
                                    )}
                                </div>
                                <div className="text-center md:text-left mb-0 md:mb-0">
                                    <h1 className="text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                        {user.name}
                                        {user.profile_completed && (
                                            <span className="material-icons text-blue-400 text-xl" title="Verified">verified</span>
                                        )}
                                        {user.id_verification_status === 'verified' && (
                                            <IDVerifiedBadge size="md" showText={true} />
                                        )}
                                    </h1>
                                    <p className="text-gray-200 font-medium">
                                        {user.professional_title || 'Gig Worker'}
                                    </p>
                                    <p className="text-sm text-gray-500 flex items-center justify-center md:justify-start gap-1 mt-0.5">
                                        <span className="material-icons text-sm">mail_outline</span>
                                        {user.email}
                                    </p>
                                    <p className="text-sm text-gray-500 flex items-center justify-center md:justify-start gap-1 mt-0.5">
                                        <span className="material-icons text-sm">location_on</span>
                                        {user.location || 'Location not set'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 items-center shrink-0 w-full md:w-auto justify-center md:justify-end md:mt-4">
                                {!isEmployerViewing && (
                                    <button className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700 transition flex items-center gap-2">
                                        <span className="material-icons text-lg">share</span>
                                        Share
                                    </button>
                                )}
                                {isEmployerViewing ? (
                                    <button
                                        onClick={handleHireMe}
                                        disabled={isHiring}
                                        className={`px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20 tracking-wide uppercase ${isHiring ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isHiring ? (
                                            <span className="w-5 h-5 border-2 border-gray-600 border-t-gray-100 rounded-full animate-spin"></span>
                                        ) : (
                                            <span className="material-icons text-lg">work</span>
                                        )}
                                        {isHiring ? 'Processing...' : 'Hire Me'}
                                    </button>
                                ) : isOwnProfile && (
                                    <button
                                        onClick={goToEdit}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
                                    >
                                        <span className="material-icons text-lg">edit</span>
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Main 3-column grid ─────────────────────────────────── */}
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* ── LEFT SIDEBAR ───────────────────────────────── */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Profile Stats */}
                            <Card className="p-5" dark={isDark}>
                                <SectionHeader title="Profile Stats" dark={isDark} />
                                <div className="space-y-4">
                                    <StatRow icon="payments" label="Total Earned" value="₱0" iconBg={isDark ? "bg-green-500/20" : "bg-green-50"} iconColor={isDark ? "text-green-400" : "text-green-600"} dark={isDark} />
                                    <StatRow icon="work_history" label="Total Jobs" value="0" iconBg={isDark ? "bg-blue-500/20" : "bg-blue-50"} iconColor={isDark ? "text-blue-400" : "text-blue-600"} dark={isDark} />
                                    <StatRow icon="schedule" label="Total Hours" value="0" iconBg={isDark ? "bg-purple-500/20" : "bg-purple-50"} iconColor={isDark ? "text-purple-400" : "text-purple-600"} dark={isDark} />
                                </div>
                                <div className={`mt-6 pt-6 ${isDark ? 'border-t border-gray-700' : 'border-t border-gray-100'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Job Success</span>
                                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>—</span>
                                    </div>
                                    <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }} />
                                    </div>
                                </div>
                            </Card>

                            {/* Hourly Rate */}
                            <Card className="p-5" dark={isDark}>
                                <div className="mb-5">
                                    <SectionHeader
                                        title="Hourly Rate"
                                        action={!isEmployerViewing ? <EditBtn onClick={goToEdit} dark={isDark} /> : null}
                                        dark={isDark}
                                    />
                                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {user.hourly_rate
                                            ? <>₱{Number(user.hourly_rate).toFixed(2)} <span className={`text-sm font-normal ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>/hr</span></>
                                            : <span className={isDark ? 'text-gray-500 text-base font-normal' : 'text-gray-400 text-base font-normal'}>Not set</span>
                                        }
                                    </p>
                                </div>

                                <div>
                                    <SectionHeader
                                        title="Availability"
                                        action={!isEmployerViewing ? <EditBtn onClick={goToEdit} dark={isDark} /> : null}
                                        dark={isDark}
                                    />
                                    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${isDark ? 'text-green-400 bg-green-500/20 border-green-500/30' : 'text-green-600 bg-green-50 border-green-100'}`}>
                                        <span className="material-icons text-lg">bolt</span>
                                        <span className="font-medium">Available for work</span>
                                    </div>
                                    <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Response time: &lt; 24 hours</p>
                                </div>
                            </Card>

                            {/* Resume */}
                            {user.resume_file && (
                                <Card className="p-5" dark={isDark}>
                                    <SectionHeader title="Resume / CV" dark={isDark} />
                                    <a
                                        href={user.resume_file}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors group ${isDark ? 'border-gray-600 bg-gray-800 hover:bg-blue-500/20 hover:border-blue-500/30' : 'border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200'}`}
                                    >
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                                            <span className="material-icons text-blue-400">description</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate group-hover:text-blue-400 ${isDark ? 'text-white' : 'text-gray-900'}`}>Download CV</p>
                                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>PDF / DOC</p>
                                        </div>
                                        <span className="material-icons text-gray-500 group-hover:text-blue-400">download</span>
                                    </a>
                                </Card>
                            )}

                            {/* Boost Profile CTA (if not completed) */}
                            {!user.profile_completed && (
                                <div
                                    className="rounded-xl p-5 text-gray-100 border border-gray-700"
                                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)' }}
                                >
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <span className="material-icons text-yellow-400">star</span>
                                        Boost Profile
                                    </h3>
                                    <p className="text-sm text-blue-200 mb-4">Complete your portfolio to increase visibility by 25%.</p>
                                    <button
                                        onClick={goToOnboarding}
                                        className="w-full py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-sm font-medium transition"
                                    >
                                        Complete Setup
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── CENTER COLUMN ──────────────────────────────── */}
                        <div className="lg:col-span-6 space-y-6">
                            {/* About Me */}
                            <Card className="p-6" dark={isDark}>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>About Me</h2>
                                    {!isEmployerViewing && <EditBtn onClick={goToEdit} dark={isDark} />}
                                </div>
                                {user.bio ? (
                                    <div className={`text-sm leading-relaxed space-y-2 ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>
                                        {user.bio.split('\n').map((para, i) => (
                                            <p className="break-all" key={i}>{para}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <span className={`material-icons text-4xl mb-2 ${isDark ? 'text-gray-500' : 'text-gray-200'}`}>person_outline</span>
                                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No bio yet.</p>
                                        {!isEmployerViewing && (
                                            <button onClick={goToEdit} className={`mt-3 text-sm font-medium ${isDark ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}`}>Add your bio</button>
                                        )}
                                    </div>
                                )}
                            </Card>

                            {/* Work History */}
                            <Card className="p-6" dark={isDark}>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Work History</h2>
                                </div>
                                {pastProjects && pastProjects.length > 0 ? (
                                    <div className="space-y-6">
                                        {pastProjects.map((project) => {
                                            const review = project.reviews && project.reviews[0];
                                            const completedDate = project.completed_at
                                                ? new Date(project.completed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                                : project.created_at
                                                    ? new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                                    : '—';
                                            const emp = project.employer;
                                            const empInitials = emp ? `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase() : '—';
                                            const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employer' : '—';
                                            return (
                                                <div key={project.id} className={`flex gap-4 pb-6 last:pb-0 ${isDark ? 'border-b border-gray-700 last:border-0' : 'border-b border-gray-100 last:border-0'}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{project.job?.title || 'Project'}</h4>
                                                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                            {project.status === 'completed' ? `Completed ${completedDate}` : 'In Progress'}
                                                        </p>
                                                        {review && (
                                                            <div className="mt-2 flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <span key={star} className={star <= review.rating ? 'text-amber-400' : (isDark ? 'text-gray-500' : 'text-gray-200')}>
                                                                        ★
                                                                    </span>
                                                                ))}
                                                                <span className={`text-sm font-medium ml-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{Number(review.rating).toFixed(1)}</span>
                                                            </div>
                                                        )}
                                                        {review?.comment && (
                                                            <p className={`text-sm mt-2 italic ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>&ldquo;{review.comment}&rdquo;</p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-3">
                                                            {(() => {
                                                                const raw = emp?.profile_picture;
                                                                const resolved = raw ? (resolveProfileImageUrl(raw) || raw) : null;
                                                                // #region agent log
                                                                if (raw) fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aefa0a'},body:JSON.stringify({sessionId:'aefa0a',location:'GigWorkerProfile.jsx:emp_avatar',message:'Employer avatar URL',data:{raw,resolved,empName},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
                                                                // #endregion
                                                                return resolved ? (
                                                                <img src={resolved} alt={empName} className={`w-8 h-8 rounded-full object-cover border ${isDark ? 'border-gray-600' : 'border-gray-100'}`} />
                                                            ) : (
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                                                    {empInitials}
                                                                </div>
                                                            );
                                                            })()}
                                                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                                Client: <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{empName}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-10">
                                        <span className={`material-icons text-5xl mb-3 ${isDark ? 'text-gray-500' : 'text-gray-200'}`}>work_outline</span>
                                        <p className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>No completed jobs yet</p>
                                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Your completed work history will appear here.</p>
                                        {!isEmployerViewing && isOwnProfile && (
                                            <Link href={route('jobs.index')} className={`mt-4 inline-block text-sm font-medium ${isDark ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}`}>
                                                Browse available jobs →
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </Card>

                            {/* Portfolio */}
                            <Card className="p-6" dark={isDark}>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Portfolio</h2>
                                    {user.portfolio_link && (
                                        <a
                                            href={user.portfolio_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                        >
                                            <span className="material-icons text-base">open_in_new</span>
                                            View Site
                                        </a>
                                    )}
                                </div>

                                {user.portfolio_link ? (
                                    <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                                        {linkPreview.loading ? (
                                            <div className={`p-6 flex items-center justify-center gap-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                <div className={`w-5 h-5 border-2 rounded-full animate-spin ${isDark ? 'border-gray-600 border-t-blue-400' : 'border-gray-300 border-t-blue-600'}`} />
                                                <span className="text-sm">Loading preview…</span>
                                            </div>
                                        ) : linkPreview.error || !linkPreview.data ? (
                                            <a
                                                href={user.portfolio_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-3 p-4 rounded-xl border-0 transition-colors group ${isDark ? 'bg-gray-800 hover:bg-blue-500/10' : 'bg-gray-50 hover:bg-blue-50'}`}
                                            >
                                                <div className={`h-12 w-12 rounded-lg flex items-center justify-center shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                                                    <span className="material-icons text-blue-400 text-2xl">language</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold truncate group-hover:text-blue-400 ${isDark ? 'text-white' : 'text-gray-900'}`}>Portfolio Website</p>
                                                    <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{user.portfolio_link}</p>
                                                </div>
                                                <span className={`material-icons group-hover:text-blue-400 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>arrow_forward</span>
                                            </a>
                                        ) : (
                                            <a
                                                href={user.portfolio_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block group"
                                            >
                                                {linkPreview.data.image && (
                                                    <div className="aspect-[2/1] w-full overflow-hidden bg-gray-700">
                                                        <img
                                                            src={linkPreview.data.image}
                                                            alt=""
                                                            className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                                                        />
                                                    </div>
                                                )}
                                                <div className="p-4">
                                                    {linkPreview.data.site_name && (
                                                        <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                            {linkPreview.data.site_name}
                                                        </p>
                                                    )}
                                                    <p className={`text-base font-semibold line-clamp-2 group-hover:text-blue-400 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {linkPreview.data.title || 'Portfolio Website'}
                                                    </p>
                                                    {linkPreview.data.description && (
                                                        <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            {linkPreview.data.description}
                                                        </p>
                                                    )}
                                                    <p className={`text-xs mt-2 truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{user.portfolio_link}</p>
                                                    <span className="inline-flex items-center gap-1 text-sm text-blue-400 font-medium mt-2 group-hover:underline">
                                                        Open portfolio
                                                        <span className="material-icons text-base">open_in_new</span>
                                                    </span>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <span className={`material-icons text-5xl mb-3 ${isDark ? 'text-gray-500' : 'text-gray-200'}`}>folder_open</span>
                                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No portfolio link added.</p>
                                        {!isEmployerViewing && (
                                            <button onClick={goToEdit} className={`mt-3 text-sm font-medium ${isDark ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}`}>Add portfolio link</button>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* ── RIGHT SIDEBAR ─────────────────────────────── */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Top Skills */}
                            <Card className="p-5" dark={isDark}>
                                <SectionHeader
                                    title="Top Skills"
                                    action={!isEmployerViewing ? <EditBtn onClick={goToEdit} dark={isDark} /> : null}
                                    dark={isDark}
                                />
                                {skills.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {skills.map((sk, i) => {
                                            const c = colorFor(i, isDark);
                                            return (
                                                <div key={i} className="group relative">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
                                                        {sk.skill}
                                                    </span>
                                                    {sk.proficiency && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                            {proficiencyLabel(sk.proficiency)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No skills added.</p>
                                        {!isEmployerViewing && (
                                            <button onClick={goToEdit} className={`mt-2 text-xs ${isDark ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}`}>Add skills</button>
                                        )}
                                    </div>
                                )}
                            </Card>

                            {/* Skills with proficiency */}
                            {skills.length > 0 && (
                                <Card className="p-5" dark={isDark}>
                                    <SectionHeader title="Expertise Levels" dark={isDark} />
                                    <div className="space-y-3">
                                        {skills.slice(0, 6).map((sk, i) => {
                                            const pct = sk.proficiency === 'expert' ? 95 : sk.proficiency === 'intermediate' ? 65 : 35;
                                            const barColor = sk.proficiency === 'expert' ? 'bg-blue-600' : sk.proficiency === 'intermediate' ? 'bg-blue-400' : 'bg-blue-500/50';
                                            return (
                                                <div key={i}>
                                                    <div className={`flex justify-between text-xs font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        <span>{sk.skill}</span>
                                                        <span className={isDark ? 'text-gray-500 capitalize' : 'text-gray-400 capitalize'}>{sk.proficiency}</span>
                                                    </div>
                                                    <div className={`w-full rounded-full h-1.5 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                                        <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            )}

                            {/* Languages placeholder */}
                            <Card className="p-5" dark={isDark}>
                                <SectionHeader
                                    title="Languages"
                                    action={!isEmployerViewing ? <EditBtn onClick={goToEdit} dark={isDark} /> : null}
                                    dark={isDark}
                                />
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>English</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'text-gray-500 bg-gray-700' : 'text-gray-500 bg-gray-100'}`}>Native</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Linked Accounts */}
                            <Card className="p-5" dark={isDark}>
                                <SectionHeader title="Linked Accounts" dark={isDark} />
                                <div className="space-y-4">
                                    {user.portfolio_link ? (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white">
                                                    <span className="material-icons text-sm">language</span>
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Portfolio</p>
                                                    <p className="text-xs text-green-400 flex items-center gap-0.5">
                                                        <span className="material-icons text-xs">check_circle</span> Linked
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    {!isEmployerViewing && (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded border-2 border-dashed flex items-center justify-center ${isDark ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
                                                    <span className="material-icons text-lg">add</span>
                                                </div>
                                                <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Link Account</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                    </div>
                </div>
            </div>

            <style>{`
                body { background: #111827; color: #e5e7eb; font-family: 'Inter', system-ui, sans-serif; }
            `}</style>
        </AuthenticatedLayout>
    );
}
