import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import IDVerifiedBadge from '@/Components/IDVerifiedBadge';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 'lg', isDark }) {
    const sizeClass = size === 'lg' ? 'w-28 h-28 text-3xl' : 'w-10 h-10 text-sm';
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'E';
    const raw = user.profile_picture || user.profile_photo;
    const photoSrc = raw ? (resolveProfileImageUrl(raw) || raw) : null;

    if (photoSrc) {
        return (
            <img
                src={photoSrc}
                alt={user.name}
                className={`${sizeClass} rounded-full border-4 object-cover shadow-sm ${isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}
            />
        );
    }
    return (
        <div className={`${sizeClass} rounded-full border-4 flex items-center justify-center font-bold shadow-sm ${isDark ? 'border-gray-600 bg-gray-700 text-blue-400' : 'border-gray-300 bg-gray-200 text-blue-600'}`}>
            {initials}
        </div>
    );
}

// ─── Card (dark, rounded, subtle shadow) ───────────────────────────────────────
function Card({ children, className = '', isDark }) {
    return (
        <div className={`rounded-xl border shadow-sm ${className} ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'}`}>
            {children}
        </div>
    );
}

function getSegmentCta(segments = []) {
    if (segments.includes('ready_to_hire')) {
        return {
            label: 'Post a New Job',
            href: route('jobs.create'),
        };
    }
    if (segments.includes('active_seeker')) {
        return {
            label: 'Browse gigs',
            href: route('jobs.index'),
        };
    }
    if (segments.includes('new_user')) {
        return {
            label: 'Complete setup',
            href: route('employer.onboarding'),
        };
    }

    return {
        label: 'Find gig workers',
        href: route('employer.dashboard'),
    };
}

export default function EmployerProfile({ user, stats, activeJobs, pastProjects, status, profileSummary = null }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const goToEdit = () => router.visit(route('employer.profile.edit'));
    const segments = Array.isArray(profileSummary?.segments) ? profileSummary.segments : [];
    const segmentCta = getSegmentCta(segments);

    const formatJobBudget = (job) => {
        if (job.budget_type === 'fixed' && (job.budget_min != null || job.budget_max != null)) {
            const min = job.budget_min != null ? Number(job.budget_min) : Number(job.budget_max);
            const max = job.budget_max != null ? Number(job.budget_max) : min;
            if (min === max) return `Fixed Price – ₱${(min / 1000).toFixed(0)}k`;
            return `Fixed Price – ₱${(min / 1000).toFixed(0)}k - ₱${(max / 1000).toFixed(0)}k`;
        }
        if (job.budget_min != null || job.budget_max != null) {
            const min = job.budget_min ?? job.budget_max ?? 0;
            const max = job.budget_max ?? job.budget_min ?? 0;
            return `Hourly – ₱${Number(min).toFixed(0)} - ₱${Number(max).toFixed(0)}/hr`;
        }
        return job.budget_type === 'fixed' ? 'Fixed Price' : 'Hourly';
    };

    const skillLabel = (skill) => (typeof skill === 'string' ? skill : skill?.skill ?? '');

    return (
        <AuthenticatedLayout pageTheme={isDark ? 'dark' : undefined}>
            <Head title={`WorkWise – ${user.company_name || user.name}`} />

            <main className={isDark ? 'min-h-screen bg-gray-900' : 'min-h-screen bg-white'}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* ─── LEFT COLUMN ───────────────────────────────────── */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Profile summary */}
                            <Card className="p-6 flex flex-col items-center text-center" isDark={isDark}>
                                <div className="mb-4">
                                    <Avatar user={user} size="lg" isDark={isDark} />
                                </div>
                                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</h1>
                                <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{user.company_name || 'Individual Employer'}</p>
                                {user.email && (
                                    <div className={`flex items-center justify-center gap-1.5 mt-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <span className="material-symbols-outlined text-lg">mail</span>
                                        <a href={`mailto:${user.email}`} className={isDark ? 'text-gray-300 hover:text-blue-400 hover:underline' : 'text-gray-700 hover:text-blue-600 hover:underline'}>{user.email}</a>
                                    </div>
                                )}
                                <div className="flex flex-wrap justify-center gap-2 mt-4">
                                    {user.id_verification_status === 'verified' && (
                                        <IDVerifiedBadge size="sm" showText={true} variant={isDark ? 'dark' : 'light'} />
                                    )}
                                    <span className={isDark ? "inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-900/50 text-blue-300 text-xs font-medium border border-blue-700" : "inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium border border-blue-200"}>
                                        <span className="material-symbols-outlined text-sm">verified</span>
                                        Verified
                                    </span>
                                    <span className={isDark ? "inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-900/50 text-pink-300 text-xs font-medium border border-pink-700" : "inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-medium border border-pink-200"}>
                                        <span className="material-symbols-outlined text-sm">business_center</span>
                                        Employer
                                    </span>
                                </div>
                                <div className={`flex items-center justify-center gap-1.5 mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <span className="material-symbols-outlined text-lg">location_on</span>
                                    {user.location || 'Location not set'}
                                </div>
                                <button
                                    type="button"
                                    onClick={goToEdit}
                                    className={isDark ? "mt-6 w-full py-2.5 px-4 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600 hover:border-gray-500 text-sm font-medium transition flex items-center justify-center gap-2" : "mt-6 w-full py-2.5 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-sm font-medium transition flex items-center justify-center gap-2"}
                                >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                    Edit Profile
                                </button>
                            </Card>

                            {/* Quick Stats */}
                            <Card className="p-5" isDark={isDark}>
                                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Quick Stats</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={isDark ? "w-9 h-9 rounded-lg bg-blue-900/50 flex items-center justify-center text-blue-400" : "w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"}>
                                                <span className="material-symbols-outlined text-lg">work</span>
                                            </div>
                                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Jobs Posted</span>
                                        </div>
                                        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.jobs_posted}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={isDark ? "w-9 h-9 rounded-lg bg-green-900/50 flex items-center justify-center text-green-400" : "w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-green-600"}>
                                                <span className="material-symbols-outlined text-lg">payments</span>
                                            </div>
                                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Spent</span>
                                        </div>
                                        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>₱{stats.total_spent}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={isDark ? "w-9 h-9 rounded-lg bg-amber-900/50 flex items-center justify-center text-amber-400" : "w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600"}>
                                                <span className="material-symbols-outlined text-lg">trending_up</span>
                                            </div>
                                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Hire Rate</span>
                                        </div>
                                        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.hire_rate}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Profile Insights */}
                            <Card className="p-5" isDark={isDark}>
                                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Profile Insights</h3>
                                {profileSummary ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className={`rounded-lg p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Complete</p>
                                                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{profileSummary.completeness_score ?? 0}</p>
                                            </div>
                                            <div className={`rounded-lg p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Activity</p>
                                                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{profileSummary.activity_score_30d ?? 0}</p>
                                            </div>
                                            <div className={`rounded-lg p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Intent</p>
                                                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{profileSummary.intent_score ?? 0}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {segments.length > 0 ? (
                                                segments.map((segment) => (
                                                    <span
                                                        key={segment}
                                                        className={isDark ? 'text-[11px] px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-300 border-blue-500/30' : 'text-[11px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200'}
                                                    >
                                                        {segment}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>No segments yet</span>
                                            )}
                                        </div>
                                        <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                            Last updated: {profileSummary.computed_at ? new Date(profileSummary.computed_at).toLocaleString() : 'Not available yet'}
                                        </p>
                                        <Link
                                            href={segmentCta.href}
                                            className={isDark ? 'inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300' : 'inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700'}
                                        >
                                            {segmentCta.label}
                                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                                        </Link>
                                    </div>
                                ) : (
                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Not available yet</p>
                                )}
                            </Card>

                            {/* Information */}
                            <Card className="p-5" isDark={isDark}>
                                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Information</h3>
                                <div className="space-y-3">
                                    {user.company_website && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="material-symbols-outlined text-gray-500 text-lg">language</span>
                                            <a href={user.company_website.startsWith('http') ? user.company_website : `https://${user.company_website}`} target="_blank" rel="noopener noreferrer" className={isDark ? "text-blue-400 hover:text-blue-300 hover:underline truncate" : "text-blue-600 hover:text-blue-700 hover:underline truncate"}>
                                                {user.company_website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    )}
                                    <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <span className="material-symbols-outlined text-gray-500 text-lg">calendar_today</span>
                                        Member since {user.joined_date}
                                    </div>
                                    {user.industry && (
                                        <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <span className="material-symbols-outlined text-gray-500 text-lg">category</span>
                                            {user.industry}
                                        </div>
                                    )}
                                    {user.company_size && (
                                        <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <span className="material-symbols-outlined text-gray-500 text-lg">groups</span>
                                            {user.company_size}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* ─── RIGHT COLUMN ───────────────────────────────────── */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* About */}
                            <Card className="p-6" isDark={isDark}>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>About {user.company_name || user.name}</h2>
                                    <button type="button" onClick={goToEdit} className={isDark ? "text-blue-400 hover:text-blue-300 text-sm font-medium" : "text-blue-600 hover:text-blue-700 text-sm font-medium"}>
                                        Edit
                                    </button>
                                </div>
                                <div className={`text-sm leading-relaxed space-y-2 break-all ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {user.company_description ? (
                                        user.company_description.split('\n').map((p, i) => <p key={i}>{p}</p>)
                                    ) : (
                                        <p className="italic text-gray-500">No company description yet. Add one to attract better talent.</p>
                                    )}
                                    {user.bio && <p>{user.bio}</p>}
                                </div>
                            </Card>

                            {/* Active Jobs */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Active Jobs</h2>
                                    <button
                                        type="button"
                                        onClick={() => router.visit(route('jobs.create'))}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                                    >
                                        <span className="material-symbols-outlined text-lg">add</span>
                                        Post a New Job
                                    </button>
                                </div>

                                {activeJobs && activeJobs.length > 0 ? (
                                    <div className="space-y-4">
                                        {activeJobs.map((job, idx) => (
                                            <Card key={job.id} className={`p-6 border-l-4 ${idx % 2 === 0 ? 'border-l-blue-500' : 'border-l-purple-500'}`} isDark={isDark}>
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={`text-base font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{job.title}</h3>
                                                        <div className={`flex flex-wrap items-center gap-3 text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            <span className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-sm">schedule</span>
                                                                Posted {typeof job.created_at === 'string' ? new Date(job.created_at).toLocaleDateString() : '—'}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-sm">payments</span>
                                                                {formatJobBudget(job)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-sm">work_history</span>
                                                                {job.experience_level || 'Any'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(Array.isArray(job.required_skills) ? job.required_skills : []).slice(0, 5).map((skill, i) => (
                                                                <span key={i} className={isDark ? "px-2.5 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-md" : "px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md"}>
                                                                    {skillLabel(skill)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{job.bids_count ?? 0}</span>
                                                        <span className={`text-xs uppercase font-semibold tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Proposals</span>
                                                        <Link
                                                            href={route('jobs.show', job.id)}
                                                            className={isDark ? "mt-2 text-blue-400 hover:text-blue-300 text-sm font-medium" : "mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"}
                                                        >
                                                            View Proposals
                                                        </Link>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="p-12 text-center" isDark={isDark}>
                                        <span className={`material-symbols-outlined text-5xl block mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>work_off</span>
                                        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No active job posts.</p>
                                        <button
                                            type="button"
                                            onClick={() => router.visit(route('jobs.create'))}
                                            className={isDark ? "mt-4 text-blue-300 hover:text-blue-200 font-medium text-sm bg-blue-900/50 hover:bg-blue-800/50 px-4 py-2 rounded-lg transition" : "mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition"}
                                        >
                                            Start hiring now →
                                        </button>
                                    </Card>
                                )}
                            </div>

                            {/* Past Projects */}
                            <Card className="p-6" isDark={isDark}>
                                <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Past Projects</h2>
                                {pastProjects && pastProjects.length > 0 ? (
                                    <div className="space-y-6">
                                        {pastProjects.map((project) => {
                                            const review = project.reviews && project.reviews[0];
                                            const completedDate = project.completed_at
                                                ? new Date(project.completed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                                : project.created_at
                                                    ? new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                                    : '—';
                                            const gw = project.gig_worker;
                                            const initials = gw ? `${gw.first_name?.[0] || ''}${gw.last_name?.[0] || ''}`.toUpperCase() : '—';
                                            const displayName = gw ? `${gw.first_name || ''} ${gw.last_name || ''}`.trim() || 'Gig Worker' : '—';
                                            return (
                                                <div key={project.id} className={`flex gap-4 pb-6 border-b last:border-0 last:pb-0 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{project.job?.title || project.title || 'Project'}</h4>
                                                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Completed {completedDate}</p>
                                                        {review && (
                                                            <div className="mt-2 flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <span key={star} className={star <= review.rating ? 'text-amber-400' : (isDark ? 'text-gray-600' : 'text-gray-300')}>
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
                                                            <div className={isDark ? "w-8 h-8 rounded-full bg-pink-900/50 text-pink-300 flex items-center justify-center text-xs font-bold shrink-0" : "w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-bold shrink-0"}>
                                                                {initials}
                                                            </div>
                                                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                Freelancer: <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{displayName}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <span className={`material-symbols-outlined text-5xl block mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>history</span>
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No past projects yet.</p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </AuthenticatedLayout>
    );
}
