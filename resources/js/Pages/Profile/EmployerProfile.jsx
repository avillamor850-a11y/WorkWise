import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import IDVerifiedBadge from '@/Components/IDVerifiedBadge';

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 'lg' }) {
    const sizeClass = size === 'lg' ? 'w-28 h-28 text-3xl' : 'w-10 h-10 text-sm';
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'E';
    const photoSrc = user.profile_picture || user.profile_photo;

    if (photoSrc) {
        return (
            <img
                src={photoSrc}
                alt={user.name}
                className={`${sizeClass} rounded-full border-4 border-blue-100 object-cover bg-white shadow-sm`}
            />
        );
    }
    return (
        <div className={`${sizeClass} rounded-full border-4 border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm`}>
            {initials}
        </div>
    );
}

// ─── Card (white, rounded, subtle shadow – reference style) ───────────────────
function Card({ children, className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
            {children}
        </div>
    );
}

export default function EmployerProfile({ user, stats, activeJobs, pastProjects, status }) {
    const goToEdit = () => router.visit(route('employer.profile.edit'));

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
        <AuthenticatedLayout>
            <Head title={`WorkWise – ${user.company_name || user.name}`} />

            <main className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* ─── LEFT COLUMN ───────────────────────────────────── */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Profile summary */}
                            <Card className="p-6 flex flex-col items-center text-center">
                                <div className="mb-4">
                                    <Avatar user={user} size="lg" />
                                </div>
                                <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
                                <p className="text-sm text-gray-500 mt-0.5">{user.company_name || 'Individual Employer'}</p>
                                <div className="flex flex-wrap justify-center gap-2 mt-4">
                                    {user.id_verification_status === 'verified' && (
                                        <IDVerifiedBadge size="sm" showText={true} />
                                    )}
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                        <span className="material-symbols-outlined text-sm">verified</span>
                                        Verified
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-medium border border-pink-100">
                                        <span className="material-symbols-outlined text-sm">business_center</span>
                                        Employer
                                    </span>
                                </div>
                                <div className="flex items-center justify-center gap-1.5 mt-4 text-gray-500 text-sm">
                                    <span className="material-symbols-outlined text-lg">location_on</span>
                                    {user.location || 'Location not set'}
                                </div>
                                <button
                                    type="button"
                                    onClick={goToEdit}
                                    className="mt-6 w-full py-2.5 px-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 text-sm font-medium transition flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                    Edit Profile
                                </button>
                            </Card>

                            {/* Quick Stats */}
                            <Card className="p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Stats</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <span className="material-symbols-outlined text-lg">work</span>
                                            </div>
                                            <span className="text-sm text-gray-600">Jobs Posted</span>
                                        </div>
                                        <span className="font-bold text-gray-900">{stats.jobs_posted}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                                <span className="material-symbols-outlined text-lg">payments</span>
                                            </div>
                                            <span className="text-sm text-gray-600">Total Spent</span>
                                        </div>
                                        <span className="font-bold text-gray-900">₱{stats.total_spent}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                                <span className="material-symbols-outlined text-lg">trending_up</span>
                                            </div>
                                            <span className="text-sm text-gray-600">Hire Rate</span>
                                        </div>
                                        <span className="font-bold text-gray-900">{stats.hire_rate}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Information */}
                            <Card className="p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Information</h3>
                                <div className="space-y-3">
                                    {user.company_website && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="material-symbols-outlined text-gray-400 text-lg">language</span>
                                            <a href={user.company_website.startsWith('http') ? user.company_website : `https://${user.company_website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                                {user.company_website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <span className="material-symbols-outlined text-gray-400 text-lg">calendar_today</span>
                                        Member since {user.joined_date}
                                    </div>
                                    {user.industry && (
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <span className="material-symbols-outlined text-gray-400 text-lg">category</span>
                                            {user.industry}
                                        </div>
                                    )}
                                    {user.company_size && (
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <span className="material-symbols-outlined text-gray-400 text-lg">groups</span>
                                            {user.company_size}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* ─── RIGHT COLUMN ───────────────────────────────────── */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* About */}
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-gray-900">About {user.company_name || user.name}</h2>
                                    <button type="button" onClick={goToEdit} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                        Edit
                                    </button>
                                </div>
                                <div className="text-gray-600 text-sm leading-relaxed space-y-2 break-all">
                                    {user.company_description ? (
                                        user.company_description.split('\n').map((p, i) => <p key={i}>{p}</p>)
                                    ) : (
                                        <p className="italic text-gray-400">No company description yet. Add one to attract better talent.</p>
                                    )}
                                    {user.bio && <p>{user.bio}</p>}
                                </div>
                            </Card>

                            {/* Active Jobs */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-gray-900">Active Jobs</h2>
                                    <button
                                        type="button"
                                        onClick={() => router.visit(route('jobs.create'))}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                                    >
                                        <span className="material-symbols-outlined text-lg">add</span>
                                        Post a New Job
                                    </button>
                                </div>

                                {activeJobs && activeJobs.length > 0 ? (
                                    <div className="space-y-4">
                                        {activeJobs.map((job, idx) => (
                                            <Card key={job.id} className={`p-6 border-l-4 ${idx % 2 === 0 ? 'border-l-blue-500' : 'border-l-purple-500'}`}>
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-base font-bold text-gray-900 mb-2">{job.title}</h3>
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
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
                                                                <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md">
                                                                    {skillLabel(skill)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <span className="text-2xl font-bold text-gray-900">{job.bids_count ?? 0}</span>
                                                        <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Proposals</span>
                                                        <Link
                                                            href={route('jobs.show', job.id)}
                                                            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                        >
                                                            View Proposals
                                                        </Link>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="p-12 text-center">
                                        <span className="material-symbols-outlined text-5xl text-gray-200 block mb-2">work_off</span>
                                        <p className="text-sm font-medium text-gray-500">No active job posts.</p>
                                        <button
                                            type="button"
                                            onClick={() => router.visit(route('jobs.create'))}
                                            className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition"
                                        >
                                            Start hiring now →
                                        </button>
                                    </Card>
                                )}
                            </div>

                            {/* Past Projects */}
                            <Card className="p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-6">Past Projects</h2>
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
                                                <div key={project.id} className="flex gap-4 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                                                    <div className="w-32 h-24 sm:w-40 sm:h-28 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-4xl text-gray-300">
                                                            {project.status === 'completed' ? 'task_alt' : 'rocket_launch'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900">{project.job?.title || project.title || 'Project'}</h4>
                                                        <p className="text-xs text-gray-500 mt-0.5">Completed {completedDate}</p>
                                                        {review && (
                                                            <div className="mt-2 flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <span key={star} className={star <= review.rating ? 'text-amber-400' : 'text-gray-200'}>
                                                                        ★
                                                                    </span>
                                                                ))}
                                                                <span className="text-sm font-medium text-gray-600 ml-1">{Number(review.rating).toFixed(1)}</span>
                                                            </div>
                                                        )}
                                                        {review?.comment && (
                                                            <p className="text-sm text-gray-600 mt-2 italic">&ldquo;{review.comment}&rdquo;</p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                                {initials}
                                                            </div>
                                                            <span className="text-xs text-gray-500">
                                                                Freelancer: <span className="font-medium text-gray-700">{displayName}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <span className="material-symbols-outlined text-5xl text-gray-200 block mb-2">history</span>
                                        <p className="text-sm text-gray-500">No past projects yet.</p>
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
