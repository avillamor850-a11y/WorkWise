import React, { useState, useMemo } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import IDVerificationBanner from '@/Components/IDVerificationBanner';
import { formatDistanceToNow } from 'date-fns';
import Pagination from '@/Components/Pagination';
import usePagination from '@/Hooks/usePagination';
import { MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

function safeRoute(name, fallback = '/') {
    try {
        return route(name);
    } catch {
        return fallback;
    }
}

/**
 * Resolve profile image URL for display. Supabase paths are stored as /supabase/...
 * but the app serves them at /storage/supabase/...
 */
function resolveProfileImageUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const u = url.trim();
    if (u.startsWith('blob:') || u.startsWith('data:')) return u;
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/storage/supabase/')) return u;
    if (u.startsWith('/supabase/')) return '/storage/supabase/' + u.slice(9);
    if (u.startsWith('/storage/')) return u;
    return '/storage/' + u.replace(/^\//, '');
}

export default function JobsIndex({ jobs, availableSkills = [], filters: urlFilters = {} }) {
    const { auth } = usePage().props;
    const postedSortDirection = urlFilters.direction === 'asc' ? 'asc' : 'desc';

    const handlePostedSortChange = (e) => {
        const direction = e.target.value;
        router.get(route('jobs.index'), { direction }, { preserveScroll: true });
    };
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        experience: 'all',
        budgetMin: '',
        budgetMax: '',
        skills: [],
    });
    const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        jobId: null,
        action: null,
        title: '',
        message: '',
        confirmText: '',
        confirmColor: 'red'
    });

    const isEmployer = auth.user?.user_type === 'employer';
    const canPostJobs = auth.user?.profile_status === 'approved';
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const experienceOptions = [
        { label: 'All experience levels', value: 'all' },
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Expert', value: 'expert' },
    ];

    const normalizedSelectedSkills = useMemo(
        () => filters.skills.map((skill) => skill.toLowerCase()),
        [filters.skills]
    );

    const budgetFilter = useMemo(() => {
        const parseBudgetValue = (value) => {
            if (value === '' || value === null || value === undefined) {
                return null;
            }
            if (typeof value === 'number') {
                return Number.isFinite(value) ? value : null;
            }
            const numeric = parseFloat(value);
            return Number.isFinite(numeric) ? numeric : null;
        };
        return {
            min: parseBudgetValue(filters.budgetMin),
            max: parseBudgetValue(filters.budgetMax),
        };
    }, [filters.budgetMin, filters.budgetMax]);

    const [processing, setProcessing] = useState(false);

    // Parse legacy comma-separated skills
    const parseSkills = (skillsReq) => {
        if (!skillsReq) return [];
        if (Array.isArray(skillsReq)) return skillsReq;
        if (typeof skillsReq === 'string') {
            try {
                // Try to parse as JSON first (to catch arrays stored as strings)
                const parsed = JSON.parse(skillsReq);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                // Not JSON, treat as comma-separated string
                return skillsReq.split(',').map(s => s.trim()).filter(Boolean);
            }
        }
        return [];
    };

    // Safe parsing for structured skills
    const getStructuredSkills = (skillsRaw) => {
        if (!skillsRaw) return [];
        if (Array.isArray(skillsRaw)) return skillsRaw;
        if (typeof skillsRaw === 'string') {
            try {
                const parsed = JSON.parse(skillsRaw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    // Client-side filtering functions (fast, no API calls)
    const matchesSearch = (job) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        const titleMatch = job.title?.toLowerCase().includes(searchLower);
        const descMatch = job.description?.toLowerCase().includes(searchLower);

        // Check structured skills first, then fallback to legacy
        let skillsMatch = false;
        const structuredSkills = getStructuredSkills(job.skills_requirements);
        if (structuredSkills.length > 0) {
            skillsMatch = structuredSkills.some(s =>
                s.skill?.toLowerCase().includes(searchLower)
            );
        } else {
            skillsMatch = parseSkills(job.required_skills).some(skill =>
                skill.toLowerCase().includes(searchLower)
            );
        }

        return titleMatch || descMatch || skillsMatch;
    };

    const matchesExperience = (value) => {
        if (filters.experience === 'all') return true;
        if (!value) return false;
        return value.toLowerCase() === filters.experience;
    };

    const matchesSkillFilter = (skillSet) => {
        if (!normalizedSelectedSkills.length) return true;
        const jobSkills = parseSkills(skillSet);
        if (!Array.isArray(jobSkills) || jobSkills.length === 0) return false;

        const normalizedJobSkills = jobSkills
            .map((skill) => typeof skill === 'string' ? skill.toLowerCase() : '')
            .filter((skill) => skill.length > 0);

        if (normalizedJobSkills.length === 0) return false;

        return normalizedSelectedSkills.every((skill) =>
            normalizedJobSkills.includes(skill)
        );
    };

    const jobBudgetMatches = (minValue, maxValue) => {
        if (budgetFilter.min === null && budgetFilter.max === null) return true;

        const jobMin = minValue !== undefined ? minValue : null;
        const jobMax = maxValue !== undefined ? maxValue : null;

        const normalizedMin = jobMin === null || jobMin === '' || jobMin === undefined
            ? null
            : Number.isFinite(jobMin) ? jobMin : Number.isFinite(parseFloat(jobMin)) ? parseFloat(jobMin) : null;

        const normalizedMax = jobMax === null || jobMax === '' || jobMax === undefined
            ? null
            : Number.isFinite(jobMax) ? jobMax : Number.isFinite(parseFloat(jobMax)) ? parseFloat(jobMax) : null;

        if (normalizedMin === null && normalizedMax === null) return true;

        const rangeMin = normalizedMin ?? normalizedMax;
        const rangeMax = normalizedMax ?? normalizedMin;

        if (rangeMin === null && rangeMax === null) return true;

        if (budgetFilter.min !== null && rangeMax !== null && rangeMax < budgetFilter.min) {
            return false;
        }

        if (budgetFilter.max !== null && rangeMin !== null && rangeMin > budgetFilter.max) {
            return false;
        }

        return true;
    };

    const handleBudgetChange = (key) => (event) => {
        const { value } = event.target;
        setFilters((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const toggleSkillSelection = (skill) => {
        setFilters((current) => {
            const alreadySelected = current.skills.some(
                (selectedSkill) => selectedSkill.toLowerCase() === skill.toLowerCase()
            );
            return {
                ...current,
                skills: alreadySelected
                    ? current.skills.filter((selectedSkill) => selectedSkill.toLowerCase() !== skill.toLowerCase())
                    : [...current.skills, skill],
            };
        });
    };

    const clearFilters = () => {
        setSearch('');
        setFilters({
            experience: 'all',
            budgetMin: '',
            budgetMax: '',
            skills: [],
        });
        setIsSkillDropdownOpen(false);
    };

    const hasActiveFilters = useMemo(
        () =>
            search !== '' ||
            filters.experience !== 'all' ||
            filters.budgetMin !== '' ||
            filters.budgetMax !== '' ||
            filters.skills.length > 0,
        [search, filters]
    );

    // Fast client-side filtering with useMemo
    const filteredJobs = useMemo(() => {
        if (!jobs.data) return [];

        return jobs.data.filter((job) => {
            if (!matchesSearch(job)) return false;
            if (!matchesExperience(job.experience_level)) return false;
            if (!jobBudgetMatches(job.budget_min, job.budget_max)) return false;
            if (!matchesSkillFilter(job.required_skills)) return false;
            return true;
        });
    }, [jobs.data, search, filters, normalizedSelectedSkills, budgetFilter]);

    // Pagination for filtered jobs (5 items per page)
    const {
        currentPage,
        totalPages,
        currentItems: paginatedJobs,
        goToPage,
        shouldShowPagination,
        totalItems,
        itemsPerPage,
    } = usePagination(filteredJobs, 5);

    const formatAmount = (value) => {
        const number = Number(value ?? 0);
        return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getBudgetDisplay = (job) => {
        if (job.budget_type === 'fixed') {
            return `₱${formatAmount(job.budget_min)} - ₱${formatAmount(job.budget_max)}`;
        }
        return `₱${formatAmount(job.budget_min)} - ₱${formatAmount(job.budget_max)}/hr`;
    };

    const getExperienceBadge = (level) => {
        const badges = {
            beginner: 'bg-green-100 text-green-800',
            intermediate: 'bg-blue-100 text-blue-800',
            expert: 'bg-purple-100 text-purple-800'
        };
        return badges[level] || 'bg-gray-100 text-gray-800';
    };

    const getStatusBadge = (status) => {
        const badges = {
            open: 'bg-green-100 text-green-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-gray-100 text-gray-800',
            cancelled: 'bg-red-100 text-red-800',
            closed: 'bg-gray-100 text-gray-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusBadgeDark = (status) => {
        const badges = {
            open: 'bg-green-500/20 text-green-300 border border-green-500/30',
            in_progress: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
            completed: 'bg-gray-700 text-gray-400 border border-gray-600',
            cancelled: 'bg-red-500/20 text-red-300 border border-red-500/30',
            closed: 'bg-gray-700 text-gray-400 border border-gray-600'
        };
        return badges[status] || 'bg-gray-700 text-gray-400 border border-gray-600';
    };

    const getExperienceBadgeDark = (level) => {
        const badges = {
            beginner: 'bg-green-500/20 text-green-300 border border-green-500/30',
            intermediate: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
            expert: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
        };
        return badges[level] || 'bg-gray-700 text-gray-400 border border-gray-600';
    };

    const handleDeleteJob = (jobId) => {
        setConfirmModal({
            isOpen: true,
            jobId: jobId,
            action: 'delete',
            title: 'Delete Job',
            message: 'Are you sure you want to delete this job? This action cannot be undone and all proposals will be lost.',
            confirmText: 'Delete Job',
            confirmColor: 'red'
        });
    };

    const handleCloseJob = (jobId) => {
        setConfirmModal({
            isOpen: true,
            jobId: jobId,
            action: 'close',
            title: 'Close Job',
            message: 'Are you sure you want to close this job? This will prevent new proposals from being submitted.',
            confirmText: 'Close Job',
            confirmColor: 'yellow'
        });
    };

    const confirmAction = () => {
        setProcessing(true);
        if (confirmModal.action === 'delete') {
            router.delete(route('jobs.destroy', confirmModal.jobId), {
                onSuccess: () => {
                    setConfirmModal({ ...confirmModal, isOpen: false });
                    setProcessing(false);
                    router.reload();
                },
                onError: () => {
                    setProcessing(false);
                }
            });
        } else if (confirmModal.action === 'close') {
            router.patch(route('jobs.update', confirmModal.jobId),
                { status: 'closed' },
                {
                    onSuccess: () => {
                        setConfirmModal({ ...confirmModal, isOpen: false });
                        setProcessing(false);
                        router.reload();
                    },
                    onError: () => {
                        setProcessing(false);
                    }
                }
            );
        }
    };

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : undefined}
            header={
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className={`font-semibold text-xl leading-tight ${isDark ? 'text-gray-100 tracking-tight' : 'text-gray-800'}`}>
                            {isEmployer ? 'My Posted Jobs' : 'Browse Jobs'}
                        </h2>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {isEmployer
                                ? 'Manage your job postings and review proposals'
                                : 'Find your next gig work opportunity'
                            }
                        </p>
                    </div>
                    {isEmployer && (
                        canPostJobs ? (
                            <Link
                                href={route('jobs.create')}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-transparent rounded-lg font-semibold text-xs text-white uppercase tracking-widest shadow-lg shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition ease-in-out duration-150"
                            >
                                + Post New Job
                            </Link>
                        ) : (
                            <Link
                                href={safeRoute('employer.onboarding', '/onboarding/employer')}
                                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-lg font-semibold text-xs uppercase tracking-widest shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150 ${isDark ? 'bg-amber-600/90 hover:bg-amber-500 text-white focus:ring-amber-500 focus:ring-offset-gray-900' : 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500 focus:ring-offset-white'}`}
                            >
                                Complete setup to post jobs
                            </Link>
                        )
                    )}
                </div>
            }
        >
            <Head title={isEmployer ? 'My Jobs' : 'Browse Jobs'} />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

            <div className={`relative py-12 overflow-x-hidden ${isDark ? 'min-h-screen bg-gray-900 font-sans' : 'bg-white'}`} style={isDark ? { fontFamily: 'Inter, system-ui, sans-serif' } : undefined}>
                {/* Animated Background - light theme only */}
                {!isDark && (
                    <>
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                    </>
                )}
                {/* Dark theme ambient glow */}
                {isDark && (
                    <div className="fixed inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
                        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-700/10 rounded-full blur-[100px]" style={{ animationDelay: '2s' }} />
                    </div>
                )}

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Gig Worker View: search bar + filters (dark theme) */}
                    {!isEmployer ? (
                        <>
                            {auth.user?.profile_completed && auth.user?.id_verification_status !== 'verified' && (
                                <IDVerificationBanner
                                    message="Complete Valid ID verification to build trust with employers and unlock more opportunities."
                                    buttonText="Verify your ID"
                                    linkUrl={safeRoute('id-verification.show', '/id-verification')}
                                    variant="info"
                                    dismissible={true}
                                />
                            )}
                            {/* Search and filters bar */}
                            <div className={isDark ? "bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 w-full box-border overflow-visible" : "bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6 w-full box-border overflow-visible"}>
                                <form
                                    onSubmit={(e) => e.preventDefault()}
                                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center"
                                >
                                    <div className="flex-1 min-w-0 relative">
                                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0" />
                                        </div>
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Title, skills, description..."
                                            className={isDark ? "block w-full min-w-0 pl-10 pr-3 py-2.5 h-11 border border-gray-600 rounded-lg text-sm bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50" : "block w-full min-w-0 pl-10 pr-3 py-2.5 h-11 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
                                        <select
                                            value={filters.experience}
                                            onChange={(e) => setFilters((current) => ({ ...current, experience: e.target.value }))}
                                            className={isDark ? "h-11 rounded-lg border border-gray-600 pl-3 pr-8 py-2 text-sm text-gray-100 bg-gray-700 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[13rem]" : "h-11 rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm text-gray-700 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[13rem]"}
                                        >
                                            {experienceOptions.map((option) => (
                                                <option key={option.value} value={option.value} style={isDark ? { backgroundColor: '#1f2937', color: '#f3f4f6' } : undefined}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={postedSortDirection}
                                            onChange={handlePostedSortChange}
                                            aria-label="Sort jobs by posted date"
                                            className={isDark ? "h-11 rounded-lg border border-gray-600 pl-3 pr-8 py-2 text-sm text-gray-100 bg-gray-700 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[11rem]" : "h-11 rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm text-gray-700 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[11rem]"}
                                        >
                                            <option value="desc" style={isDark ? { backgroundColor: '#1f2937', color: '#f3f4f6' } : undefined}>Newest first</option>
                                            <option value="asc" style={isDark ? { backgroundColor: '#1f2937', color: '#f3f4f6' } : undefined}>Oldest first</option>
                                        </select>
                                        <div className="relative z-[60]">
                                            <button
                                                type="button"
                                                onClick={() => setIsSkillDropdownOpen((open) => !open)}
                                                className={isDark ? "inline-flex items-center h-11 px-3 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 whitespace-nowrap" : "inline-flex items-center h-11 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"}
                                            >
                                                <FunnelIcon className={`h-5 w-5 mr-2 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                                Skills
                                                {filters.skills.length > 0 && (
                                                    <span className={isDark ? "ml-2 bg-blue-500/30 text-blue-300 text-xs px-2 py-0.5 rounded-full flex-shrink-0" : "ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full flex-shrink-0"}>
                                                        {filters.skills.length}
                                                    </span>
                                                )}
                                                <ChevronDownIcon className={`h-4 w-4 ml-2 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                            </button>
                                            {isSkillDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-[55]" onClick={() => setIsSkillDropdownOpen(false)} aria-hidden="true" />
                                                    <div className={`absolute left-0 top-full mt-1 w-64 max-h-72 overflow-auto rounded-lg border shadow-lg z-[60] py-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                                        {filters.skills.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setFilters((current) => ({ ...current, skills: [] }))}
                                                                className={isDark ? "w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-gray-700" : "w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"}
                                                            >
                                                                Clear skills
                                                            </button>
                                                        )}
                                                        {availableSkills.length === 0 ? (
                                                            <p className={isDark ? "px-4 py-2 text-sm text-gray-500" : "px-4 py-2 text-sm text-gray-500"}>No skills available yet</p>
                                                        ) : (
                                                            availableSkills.map((skill) => {
                                                                const isSelected = filters.skills.some(
                                                                    (s) => s.toLowerCase() === skill.toLowerCase()
                                                                );
                                                                return (
                                                                    <button
                                                                        key={skill}
                                                                        type="button"
                                                                        onClick={() => toggleSkillSelection(skill)}
                                                                        className={`w-full text-left px-4 py-2 text-sm flex items-center truncate ${isDark ? (isSelected ? 'bg-blue-500/20 text-blue-300 font-medium' : 'text-gray-200 hover:bg-gray-700') : (isSelected ? 'bg-blue-50 text-blue-700 font-medium hover:bg-gray-50' : 'text-gray-700 hover:bg-gray-50')}`}
                                                                    >
                                                                        {isSelected && (
                                                                            <span className={`mr-2 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>✓</span>
                                                                        )}
                                                                        <span className="truncate">{skill}</span>
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {hasActiveFilters && (
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className={isDark ? "inline-flex items-center h-11 px-3 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-200 bg-gray-700 hover:bg-gray-600" : "inline-flex items-center h-11 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"}
                                            >
                                                Reset
                                            </button>
                                        )}
                                        <Link
                                            href={safeRoute('ai.recommendations.gigworker', safeRoute('ai.recommendations', '/ai/recommendations'))}
                                            className="inline-flex items-center h-11 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500"
                                        >
                                            AI Recommendations
                                        </Link>
                                    </div>
                                </form>
                            </div>

                            {/* Main content: jobs list */}
                            <div>
                                {filteredJobs.length === 0 ? (
                                    <div className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden border border-gray-700 rounded-xl" : "bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200"}>
                                        <div className="p-16 text-center">
                                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-gradient-to-br from-blue-100 to-blue-200'}`}>
                                                <svg className={isDark ? "w-12 h-12 text-blue-400" : "w-12 h-12 text-blue-600"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM16 10h.01M12 14h.01M8 14h.01M8 10h.01" />
                                                </svg>
                                            </div>
                                            <h3 className={isDark ? "text-2xl font-bold text-gray-100 mb-4" : "text-2xl font-bold text-gray-900 mb-4"}>
                                                No Jobs Found
                                            </h3>
                                            <p className={isDark ? "text-gray-400 text-lg mb-8 max-w-md mx-auto leading-relaxed" : "text-gray-600 text-lg mb-8 max-w-md mx-auto leading-relaxed"}>
                                                Try adjusting your search criteria or check back later for new opportunities.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {paginatedJobs.map((job) => {
                                            const emp = job.employer;
                                            const empName = (emp?.first_name && emp?.last_name)
                                                ? `${emp.first_name} ${emp.last_name}`.toUpperCase()
                                                : 'EMPLOYER';
                                            const empAvatarRaw = emp?.profile_picture || emp?.profile_photo;
                                            const empAvatarSrc = (empAvatarRaw && resolveProfileImageUrl(empAvatarRaw))
                                                || `https://ui-avatars.com/api/?name=${encodeURIComponent((emp?.first_name || '') + '+' + (emp?.last_name || ''))}&background=6366f1&color=fff`;
                                            return (
                                            <div key={job.id} className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden border border-gray-700 rounded-xl hover:border-blue-500/30 transition-all duration-200" : "bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200"}>
                                                <div className="p-8">
                                                    {/* Employer block: profile image, name (uppercase), company name */}
                                                    <div className={`flex items-center gap-3 mb-5 pb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                                        <img
                                                            src={empAvatarSrc}
                                                            alt=""
                                                            className={`w-12 h-12 rounded-full object-cover border-2 shadow-sm ${isDark ? 'border-gray-600' : 'border-gray-200'}`}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((emp?.first_name || '') + '+' + (emp?.last_name || ''))}&background=6366f1&color=fff`;
                                                            }}
                                                        />
                                                        <div className="min-w-0">
                                                            <div className={`font-semibold text-sm uppercase tracking-wide ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                                {empName}
                                                            </div>
                                                            {emp?.company_name ? (
                                                                <div className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    {emp.company_name}
                                                                </div>
                                                            ) : (
                                                                <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                    —
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-4 mb-4">
                                                                <h3 className={isDark ? "text-xl font-bold text-gray-100" : "text-xl font-bold text-gray-900"}>
                                                                    <Link
                                                                        href={`/jobs/${job.id}`}
                                                                        className={isDark ? "hover:text-blue-400 transition-colors duration-300" : "hover:text-blue-600 transition-colors duration-300"}
                                                                    >
                                                                        {job.title}
                                                                    </Link>
                                                                </h3>
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold shadow-md ${isDark ? getStatusBadgeDark(job.status) : getStatusBadge(job.status)}`}>
                                                                    {job.status === 'open' ? 'Open' : job.status.replace('_', ' ')}
                                                                </span>
                                                            </div>

                                                            <p className={isDark ? "text-gray-400 text-lg mb-6 line-clamp-3 break-all leading-relaxed" : "text-gray-700 text-lg mb-6 line-clamp-3 break-all leading-relaxed"}>
                                                                {job.description}
                                                            </p>

                                                            <div className={isDark ? "bg-blue-500/10 p-6 rounded-xl border border-blue-500/20 mb-6" : "bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100 mb-6"}>
                                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                                    <div>
                                                                        <div className={isDark ? "text-sm font-medium text-blue-400 mb-1" : "text-sm font-medium text-blue-600 mb-1"}>Budget</div>
                                                                        <div className={isDark ? "font-bold text-green-400 text-lg" : "font-bold text-green-600 text-lg"}>
                                                                            {getBudgetDisplay(job)}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div className={isDark ? "text-sm font-medium text-blue-400 mb-1" : "text-sm font-medium text-blue-600 mb-1"}>Duration</div>
                                                                        <div className={isDark ? "font-bold text-gray-100 text-lg" : "font-bold text-gray-900 text-lg"}>
                                                                            {job.estimated_duration_days} days
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div className={isDark ? "text-sm font-medium text-blue-400 mb-1" : "text-sm font-medium text-blue-600 mb-1"}>Experience</div>
                                                                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold shadow-md ${isDark ? getExperienceBadgeDark(job.experience_level) : getExperienceBadge(job.experience_level)}`}>
                                                                            {job.experience_level}
                                                                        </span>
                                                                    </div>
                                                                    {(job.is_remote || job.location) && (
                                                                        <div>
                                                                            <div className={isDark ? "text-sm font-medium text-blue-400 mb-1" : "text-sm font-medium text-blue-600 mb-1"}>Location</div>
                                                                            <div className={isDark ? "font-bold text-gray-100 text-lg" : "font-bold text-gray-900 text-lg"}>
                                                                                {job.is_remote ? '🌐 Remote' : `📍 ${job.location}`}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="mb-6">
                                                                <div className={isDark ? "text-sm font-medium text-blue-400 mb-3" : "text-sm font-medium text-blue-600 mb-3"}>Required Skills</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {getStructuredSkills(job?.skills_requirements).length > 0 ? (
                                                                        <>
                                                                            {getStructuredSkills(job.skills_requirements)
                                                                                .filter(s => s.importance === 'required')
                                                                                .slice(0, 5)
                                                                                .map((skill, index) => (
                                                                                    <div key={index} className={isDark ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20" : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 shadow-sm hover:shadow-md transition-all duration-200"}>
                                                                                        <span>{skill.skill}</span>
                                                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? getExperienceBadgeDark(skill.experience_level) : getExperienceBadge(skill.experience_level)}`}>
                                                                                            {skill.experience_level?.charAt(0).toUpperCase() || ''}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            {getStructuredSkills(job.skills_requirements).filter(s => s.importance === 'required').length > 5 && (
                                                                                <span className={isDark ? "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-400" : "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600"} title={`+${getStructuredSkills(job.skills_requirements).filter(s => s.importance === 'required').length - 5} more skills`}>
                                                                                    +{getStructuredSkills(job.skills_requirements).filter(s => s.importance === 'required').length - 5} more
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        parseSkills(job?.required_skills || []).slice(0, 5).map((skill, index) => (
                                                                            <span key={index} className={isDark ? "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20" : "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 shadow-sm hover:shadow-md transition-all duration-200"}>
                                                                                {skill}
                                                                            </span>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between">
                                                                <div className={`flex items-center space-x-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    <span>
                                                                        Posted by:
                                                                        <span className="font-medium ml-1">
                                                                            {job.employer ? `${job.employer.first_name} ${job.employer.last_name}` : 'Employer'}
                                                                        </span>
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span>{formatDistanceToNow(new Date(job.created_at))} ago</span>
                                                                    {job.bids_count !== undefined && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>{job.bids_count} proposal{job.bids_count !== 1 ? 's' : ''}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Link
                                                                        href={`/jobs/${job.id}`}
                                                                        className={isDark ? "text-sm text-blue-400 hover:text-blue-300" : "text-sm text-blue-600 hover:text-blue-800"}
                                                                    >
                                                                        View Details
                                                                    </Link>
                                                                    {job.status === 'open' && (
                                                                        <Link
                                                                            href={`/jobs/${job.id}`}
                                                                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300"
                                                                        >
                                                                            Submit Proposal
                                                                        </Link>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })}

                                        {/* Pagination */}
                                        {shouldShowPagination && (
                                            <Pagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                onPageChange={goToPage}
                                                itemsPerPage={itemsPerPage}
                                                totalItems={totalItems}
                                                variant={isDark ? "dark" : "light"}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Employer View - Dark theme, no sidebar, just jobs list */
                        <div className="mb-8">
                            {/* Jobs List */}
                            {jobs.data && jobs.data.length === 0 ? (
                                <div className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl border border-gray-700" : "bg-white backdrop-blur-sm overflow-hidden rounded-xl border border-gray-200 shadow-lg"}>
                                    <div className="p-16 text-center">
                                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-100 border border-blue-200'}`}>
                                            <svg className={isDark ? "w-12 h-12 text-blue-400" : "w-12 h-12 text-blue-600"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM16 10h.01M12 14h.01M8 14h.01M8 10h.01" />
                                            </svg>
                                        </div>
                                        <h3 className={isDark ? "text-2xl font-bold text-gray-100 mb-4" : "text-2xl font-bold text-gray-900 mb-4"}>
                                            No Jobs Posted Yet
                                        </h3>
                                        <p className={isDark ? "text-gray-400 text-lg mb-8 max-w-md mx-auto leading-relaxed" : "text-gray-600 text-lg mb-8 max-w-md mx-auto leading-relaxed"}>
                                            Start by posting your first job to find talented gig workers.
                                        </p>
                                        {canPostJobs ? (
                                            <Link
                                                href={route('jobs.create')}
                                                className="inline-flex items-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300"
                                            >
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                Post Your First Job
                                            </Link>
                                        ) : (
                                            <Link
                                                href={safeRoute('employer.onboarding', '/onboarding/employer')}
                                                className={`inline-flex items-center font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 ${isDark ? 'bg-amber-600/90 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                                            >
                                                Complete employer setup to post jobs
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <label htmlFor="employer-jobs-sort" className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Posted
                                        </label>
                                        <select
                                            id="employer-jobs-sort"
                                            value={postedSortDirection}
                                            onChange={handlePostedSortChange}
                                            aria-label="Sort jobs by posted date"
                                            className={isDark ? "h-11 rounded-lg border border-gray-600 pl-3 pr-8 py-2 text-sm text-gray-100 bg-gray-700 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[11rem]" : "h-11 rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm text-gray-700 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[11rem]"}
                                        >
                                            <option value="desc" style={isDark ? { backgroundColor: '#1f2937', color: '#f3f4f6' } : undefined}>Newest first</option>
                                            <option value="asc" style={isDark ? { backgroundColor: '#1f2937', color: '#f3f4f6' } : undefined}>Oldest first</option>
                                        </select>
                                    </div>
                                    {jobs.data && jobs.data.map((job) => (
                                        <div key={job.id} className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl border border-gray-700 hover:border-blue-500/30 transition-all duration-200" : "bg-white backdrop-blur-sm overflow-hidden rounded-xl border border-gray-200 shadow-lg hover:border-blue-300 transition-all duration-200"}>
                                            <div className="p-8">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-4 mb-4">
                                                            <h3 className={isDark ? "text-xl font-bold text-gray-100" : "text-xl font-bold text-gray-900"}>
                                                                <Link
                                                                    href={`/jobs/${job.id}`}
                                                                    className={isDark ? "hover:text-blue-400 transition-colors duration-300" : "hover:text-blue-600 transition-colors duration-300"}
                                                                >
                                                                    {job.title}
                                                                </Link>
                                                            </h3>
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold ${isDark ? getStatusBadgeDark(job.status) : getStatusBadge(job.status)}`}>
                                                                {job.status === 'open' ? 'Open' : job.status.replace('_', ' ')}
                                                            </span>
                                                        </div>

                                                        <p className={isDark ? "text-gray-400 text-lg mb-6 line-clamp-3 break-all leading-relaxed" : "text-gray-700 text-lg mb-6 line-clamp-3 break-all leading-relaxed"}>
                                                            {job.description}
                                                        </p>

                                                        <div className={isDark ? "bg-blue-500/10 p-6 rounded-xl border border-blue-500/20 mb-6" : "bg-blue-50 p-6 rounded-xl border border-blue-100 mb-6"}>
                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                                <div>
                                                                    <div className={isDark ? "text-sm font-medium text-blue-400 mb-1" : "text-sm font-medium text-blue-600 mb-1"}>Budget</div>
                                                                    <div className={isDark ? "font-bold text-green-400 text-lg" : "font-bold text-green-600 text-lg"}>
                                                                        {getBudgetDisplay(job)}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className={isDark ? "text-sm font-medium text-blue-400 mb-1" : "text-sm font-medium text-blue-600 mb-1"}>Duration</div>
                                                                    <div className={isDark ? "font-bold text-gray-100 text-lg" : "font-bold text-gray-900 text-lg"}>
                                                                        {job.estimated_duration_days} days
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className={isDark ? "text-sm font-medium text-blue-400 mb-1" : "text-sm font-medium text-blue-600 mb-1"}>Experience</div>
                                                                    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold ${isDark ? getExperienceBadgeDark(job.experience_level) : getExperienceBadge(job.experience_level)}`}>
                                                                        {job.experience_level}
                                                                    </span>
                                                                </div>
                                                                {(job.is_remote || job.location) && (
                                                                    <div>
                                                                        <div className={isDark ? "text-sm font-medium text-blue-400 mb-1" : "text-sm font-medium text-blue-600 mb-1"}>Location</div>
                                                                        <div className={isDark ? "font-bold text-gray-100 text-lg" : "font-bold text-gray-900 text-lg"}>
                                                                            {job.is_remote ? '🌐 Remote' : `📍 ${job.location}`}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mb-6">
                                                            <div className={isDark ? "text-sm font-medium text-blue-400 mb-3" : "text-sm font-medium text-blue-600 mb-3"}>Required Skills</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {getStructuredSkills(job?.skills_requirements).length > 0 ? (
                                                                    <>
                                                                        {getStructuredSkills(job.skills_requirements)
                                                                            .filter(s => s.importance === 'required')
                                                                            .slice(0, 5)
                                                                            .map((skill, index) => (
                                                                                <div key={index} className={isDark ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20" : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"}>
                                                                                    <span>{skill.skill}</span>
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? getExperienceBadgeDark(skill.experience_level) : getExperienceBadge(skill.experience_level)}`}>
                                                                                        {skill.experience_level?.charAt(0).toUpperCase() || ''}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        {getStructuredSkills(job.skills_requirements).filter(s => s.importance === 'required').length > 5 && (
                                                                            <span className={isDark ? "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-400 border border-gray-600" : "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600"} title={`+${getStructuredSkills(job.skills_requirements).filter(s => s.importance === 'required').length - 5} more skills`}>
                                                                                +{getStructuredSkills(job.skills_requirements).filter(s => s.importance === 'required').length - 5} more
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    parseSkills(job?.required_skills || []).slice(0, 5).map((skill, index) => (
                                                                        <span key={index} className={isDark ? "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20" : "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"}>
                                                                            {skill}
                                                                        </span>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                                            <div className={`flex items-center space-x-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                <span>
                                                                    Posted by:
                                                                    <span className={`font-medium ml-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                                                        {job.employer ? `${job.employer.first_name} ${job.employer.last_name}` : 'Employer'}
                                                                    </span>
                                                                </span>
                                                                <span>•</span>
                                                                <span>{formatDistanceToNow(new Date(job.created_at))} ago</span>
                                                                {job.bids_count !== undefined && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{job.bids_count} proposal{job.bids_count !== 1 ? 's' : ''}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center space-x-2 flex-wrap gap-2">
                                                                <Link
                                                                    href={`/jobs/${job.id}/edit`}
                                                                    className={isDark ? "text-sm text-blue-400 hover:text-blue-300 transition-colors" : "text-sm text-blue-600 hover:text-blue-700 transition-colors"}
                                                                >
                                                                    Edit
                                                                </Link>
                                                                {job.status === 'open' && (
                                                                    <button
                                                                        onClick={() => handleCloseJob(job.id)}
                                                                        className={isDark ? "text-sm text-amber-400 hover:text-amber-300 transition-colors" : "text-sm text-amber-600 hover:text-amber-700 transition-colors"}
                                                                    >
                                                                        Close
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDeleteJob(job.id)}
                                                                    className={isDark ? "text-sm text-red-400 hover:text-red-300 transition-colors" : "text-sm text-red-600 hover:text-red-700 transition-colors"}
                                                                >
                                                                    Delete
                                                                </button>
                                                                {job.status === 'open' && (
                                                                    <Link
                                                                        href={`/ai-recommendations/employer?job_id=${job.id}`}
                                                                        className={isDark ? "inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 py-2 px-4 rounded-xl transition-all duration-200" : "inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 py-2 px-4 rounded-xl transition-all duration-200"}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                                        AI Recommendations
                                                                    </Link>
                                                                )}
                                                                <Link
                                                                    href={`/jobs/${job.id}`}
                                                                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300"
                                                                >
                                                                    View Proposals ({job.bids_count || 0})
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Pagination - employer */}
                                    {jobs.links && jobs.links.length > 3 && (
                                        <div className={isDark ? "bg-gray-800 backdrop-blur-sm px-6 py-4 flex items-center justify-between border border-gray-700 rounded-xl" : "bg-white backdrop-blur-sm px-6 py-4 flex items-center justify-between border border-gray-200 rounded-xl shadow-lg"}>
                                            <div className="flex-1 flex justify-between sm:hidden gap-2">
                                                {jobs.prev_page_url && (
                                                    <Link
                                                        href={jobs.prev_page_url}
                                                        className={isDark ? "inline-flex items-center px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium rounded-lg text-gray-200 hover:text-gray-100 hover:bg-gray-700 transition-colors" : "inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"}
                                                    >
                                                        Previous
                                                    </Link>
                                                )}
                                                {jobs.next_page_url && (
                                                    <Link
                                                        href={jobs.next_page_url}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-colors ml-auto"
                                                    >
                                                        Next
                                                    </Link>
                                                )}
                                            </div>
                                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                                <div>
                                                    <p className={isDark ? "text-sm text-gray-400" : "text-sm text-gray-600"}>
                                                        Showing <span className={isDark ? "font-medium text-gray-200" : "font-medium text-gray-900"}>{jobs.from}</span> to{' '}
                                                        <span className={isDark ? "font-medium text-gray-200" : "font-medium text-gray-900"}>{jobs.to}</span> of{' '}
                                                        <span className={isDark ? "font-medium text-gray-200" : "font-medium text-gray-900"}>{jobs.total}</span> results
                                                    </p>
                                                </div>
                                                <div>
                                                        <nav className={`relative z-0 inline-flex rounded-lg overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                                                        {jobs.links.map((link, index) => (
                                                            <Link
                                                                key={index}
                                                                href={link.url || '#'}
                                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium transition-colors ${link.active
                                                                    ? 'bg-blue-600 text-white'
                                                                    : isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-gray-100 border-r border-gray-700 last:border-r-0' : 'bg-white text-gray-700 hover:bg-gray-50 border-r border-gray-300 last:border-r-0'
                                                                    }`}
                                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                            />
                                                        ))}
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Stats for Gig Workers */}
                    {!isEmployer && filteredJobs.length > 0 && (
                        <div className={isDark ? "mt-12 bg-gray-800 border border-gray-700 rounded-xl p-8" : "mt-12 bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-8 shadow-lg"}>
                            <h3 className={isDark ? "text-2xl font-bold text-gray-100 mb-6" : "text-2xl font-bold text-blue-900 mb-6"}>Market Insights</h3>
                            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isDark ? 'text-gray-200' : 'text-blue-800'}`}>
                                <div className="text-center">
                                    <div className={isDark ? "font-semibold text-blue-400 mb-2" : "font-semibold text-blue-700 mb-2"}>Filtered Jobs</div>
                                    <div className={isDark ? "text-3xl font-bold text-blue-400" : "text-3xl font-bold text-blue-600"}>{filteredJobs.length}</div>
                                </div>
                                <div className="text-center">
                                    <div className={isDark ? "font-semibold text-blue-400 mb-2" : "font-semibold text-blue-700 mb-2"}>Average Budget</div>
                                    <div className={isDark ? "text-3xl font-bold text-green-400" : "text-3xl font-bold text-green-600"}>
                                        ₱{formatAmount(Math.round(filteredJobs.reduce((sum, job) => sum + ((job.budget_min + job.budget_max) / 2), 0) / filteredJobs.length) || 0)}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className={isDark ? "font-semibold text-blue-400 mb-2" : "font-semibold text-blue-700 mb-2"}>Remote Opportunities</div>
                                    <div className={isDark ? "text-3xl font-bold text-purple-400" : "text-3xl font-bold text-purple-600"}>
                                        {Math.round((filteredJobs.filter(job => job.is_remote).length / filteredJobs.length) * 100) || 0}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer for Gig Worker Dashboard (same as Welcome page) */}
                    {!isEmployer && (
                        <div className="mt-10 -mx-4 sm:-mx-6 lg:-mx-8">
                            <div className={isDark ? "bg-gray-900 px-4 sm:px-6 lg:px-8 py-8" : "bg-gray-50 px-4 sm:px-6 lg:px-8 py-8"}>
                                <div className="max-w-7xl mx-auto">
                                    <footer className={isDark ? "border-t border-gray-700 pt-8" : "border-t border-gray-200 pt-8"}>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                                            <div>
                                                <h3 className={isDark ? "text-xl font-black text-gray-100 mb-3" : "text-xl font-black text-gray-900 mb-3"}>WorkWise</h3>
                                                <p className={isDark ? "text-gray-400 text-sm leading-relaxed" : "text-gray-600 text-sm leading-relaxed"}>
                                                    The future of work, powered by elite intelligence and seamless collaboration.
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className={isDark ? "font-bold text-gray-100 mb-3 uppercase tracking-widest text-xs" : "font-bold text-gray-900 mb-3 uppercase tracking-widest text-xs"}>For Talent</h4>
                                                <ul className={isDark ? "space-y-2 text-gray-400 text-sm" : "space-y-2 text-gray-600 text-sm"}>
                                                    <li><Link href="/jobs" className={isDark ? "hover:text-blue-500 transition-colors" : "hover:text-blue-600 transition-colors"}>Browse Gigs</Link></li>
                                                    <li><Link href="/ai/recommendations" className={isDark ? "hover:text-blue-500 transition-colors" : "hover:text-blue-600 transition-colors"}>AI Recommendations</Link></li>
                                                    <li><Link href={safeRoute('role.selection')} className={isDark ? "hover:text-blue-500 transition-colors" : "hover:text-blue-600 transition-colors"}>Join as Expert</Link></li>
                                                </ul>
                                            </div>

                                            <div>
                                                <h4 className={isDark ? "font-bold text-gray-100 mb-3 uppercase tracking-widest text-xs" : "font-bold text-gray-900 mb-3 uppercase tracking-widest text-xs"}>For Companies</h4>
                                                <ul className={isDark ? "space-y-2 text-gray-400 text-sm" : "space-y-2 text-gray-600 text-sm"}>
                                                    <li><Link href="/freelancers" className={isDark ? "hover:text-blue-500 transition-colors" : "hover:text-blue-600 transition-colors"}>Find Experts</Link></li>
                                                    <li><Link href="/jobs/create" className={isDark ? "hover:text-blue-500 transition-colors" : "hover:text-blue-600 transition-colors"}>Post a Project</Link></li>
                                                    <li><Link href={safeRoute('role.selection')} className={isDark ? "hover:text-blue-500 transition-colors" : "hover:text-blue-600 transition-colors"}>Scale Your Team</Link></li>
                                                </ul>
                                            </div>

                                            <div>
                                                <h4 className={isDark ? "font-bold text-gray-100 mb-3 uppercase tracking-widest text-xs" : "font-bold text-gray-900 mb-3 uppercase tracking-widest text-xs"}>Platform</h4>
                                                <ul className={isDark ? "space-y-2 text-gray-400 text-sm" : "space-y-2 text-gray-600 text-sm"}>
                                                    <li><Link href="/help" className={isDark ? "hover:text-blue-500 transition-colors" : "hover:text-blue-600 transition-colors"}>Help Center</Link></li>
                                                    <li><Link href="/about" className={isDark ? "hover:text-blue-500 transition-colors" : "hover:text-blue-600 transition-colors"}>Our Vision</Link></li>
                                                    <li><Link href="/privacy" className={isDark ? "hover:text-blue-500 transition-colors" : "hover:text-blue-600 transition-colors"}>Privacy</Link></li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className={`border-t py-5 text-center text-gray-500 text-sm font-medium ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                            <p>&copy; 2024 WorkWise. Built for the Next Generation.</p>
                                        </div>
                                    </footer>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-6 border border-gray-200 w-96 shadow-2xl rounded-xl bg-white/90 backdrop-blur-sm">
                        <div className="mt-3 text-center">
                            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${confirmModal.confirmColor === 'red' ? 'bg-red-100' : 'bg-yellow-100'
                                }`}>
                                <svg className={`h-6 w-6 ${confirmModal.confirmColor === 'red' ? 'text-red-600' : 'text-yellow-600'
                                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                                {confirmModal.title}
                            </h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500">
                                    {confirmModal.message}
                                </p>
                            </div>
                            <div className="items-center px-6 py-4">
                                <button
                                    onClick={confirmAction}
                                    disabled={processing}
                                    className={`px-6 py-3 ${confirmModal.confirmColor === 'red'
                                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                                        : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                                        } text-white font-semibold rounded-xl w-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none`}
                                >
                                    {processing ? 'Processing...' : confirmModal.confirmText}
                                </button>
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                    className="mt-4 px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl w-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                body {
                    background: ${isDark ? '#111827' : 'white'};
                    color: ${isDark ? '#e5e7eb' : '#333'};
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
