import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import IDVerificationBanner from '@/Components/IDVerificationBanner';
import { Head, Link, router } from '@inertiajs/react';
import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    UserCircleIcon,
    ChevronDownIcon,
    SparklesIcon,
    ClockIcon,
    ChartBarIcon,
    LinkIcon,
    CurrencyDollarIcon,
    GlobeAltIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';

function safeRoute(name, fallback = '/') {
    try {
        return route(name);
    } catch {
        return fallback;
    }
}

const SORT_OPTIONS = [
    {
        value: 'best_match',
        label: 'Best for Me',
        icon: SparklesIcon,
        description: 'Workers who match skills from your posted jobs',
        detail: 'Ranked by how many of your job’s required skills they have in their profile.',
    },
    {
        value: 'latest_registered',
        label: 'Latest Registered',
        icon: ClockIcon,
        description: 'Newest gig workers first',
        detail: 'Sorted by registration date from the database.',
    },
    {
        value: 'most_relevant',
        label: 'Most Relevant',
        icon: ChartBarIcon,
        description: 'Top rated & most experienced',
        detail: 'Ranked by average review rating and completed projects.',
    },
];

export default function EmployerDashboard({ auth, workers, filterOptions = {}, filters = {}, bestMatchHasSkills = false, profileSummary = null }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    // #region agent log
    useEffect(() => {
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'849b3f'},body:JSON.stringify({sessionId:'849b3f',hypothesisId:'H2','location':'Employer/Dashboard.jsx',message:'EmployerDashboard mounted',data:{pathname:typeof window!=='undefined'?window.location.pathname:null,hasAuth:!!auth,hasWorkers:!!workers},timestamp:Date.now()})}).catch(()=>{});
    }, []);
    // #endregion
    const skillOptions = filterOptions?.skills ?? [];
    const [search, setSearch] = useState(filters?.search ?? '');
    const [selectedSkills, setSelectedSkills] = useState(Array.isArray(filters?.skills) ? filters.skills : []);
    const [sort, setSort] = useState(filters?.sort ?? 'latest_registered');
    const [sortDir, setSortDir] = useState(filters?.sort_dir === 'asc' ? 'asc' : 'desc');
    const [showSkillDropdown, setShowSkillDropdown] = useState(false);
    const skillButtonRef = useRef(null);
    const skillDropdownRef = useRef(null);
    const filterBarRef = useRef(null);
    const workerGridRef = useRef(null);

    useEffect(() => {
        setSearch(filters?.search ?? '');
        setSelectedSkills(Array.isArray(filters?.skills) ? filters.skills : []);
        setSort(filters?.sort ?? 'latest_registered');
        setSortDir(filters?.sort_dir === 'asc' ? 'asc' : 'desc');
    }, [filters?.search, filters?.skills, filters?.sort, filters?.sort_dir]);

    useEffect(() => {
        if (!showSkillDropdown) return;
        const dropdownEl = skillDropdownRef.current;
        const buttonEl = skillButtonRef.current;
        const filterBarEl = filterBarRef.current;
        const gridEl = workerGridRef.current;
        const dropdownRect = dropdownEl?.getBoundingClientRect?.();
        const buttonRect = buttonEl?.getBoundingClientRect?.();
        const filterBarRect = filterBarEl?.getBoundingClientRect?.();
        const gridRect = gridEl?.getBoundingClientRect?.();
        const probeX = dropdownRect ? dropdownRect.left + Math.min(24, dropdownRect.width - 1) : null;
        const probeY = dropdownRect ? dropdownRect.top + Math.min(24, dropdownRect.height - 1) : null;
        const overlapProbeX = dropdownRect ? dropdownRect.left + Math.min(24, dropdownRect.width - 1) : null;
        const overlapProbeY = (dropdownRect && gridRect)
            ? Math.max(dropdownRect.top + 24, gridRect.top + 20)
            : null;
        const topElement = (probeX != null && probeY != null) ? document.elementFromPoint(probeX, probeY) : null;
        const overlapElement = (overlapProbeX != null && overlapProbeY != null) ? document.elementFromPoint(overlapProbeX, overlapProbeY) : null;
        const filterBarParent = filterBarEl?.parentElement;
        // #region agent log
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f47d3'},body:JSON.stringify({sessionId:'1f47d3',runId:'post-fix',hypothesisId:'H2',location:'Employer/Dashboard.jsx:dropdown_open_effect',message:'Dropdown visibility and layering snapshot',data:{showSkillDropdown,dropdownRect,buttonRect,filterBarRect,gridRect,dropdownZIndex:dropdownEl?window.getComputedStyle(dropdownEl).zIndex:null,dropdownPosition:dropdownEl?window.getComputedStyle(dropdownEl).position:null,filterBarZIndex:filterBarEl?window.getComputedStyle(filterBarEl).zIndex:null,filterBarOverflow:filterBarEl?window.getComputedStyle(filterBarEl).overflow:null,filterBarParentOverflow:filterBarParent?window.getComputedStyle(filterBarParent).overflow:null,gridZIndex:gridEl?window.getComputedStyle(gridEl).zIndex:null,gridPosition:gridEl?window.getComputedStyle(gridEl).position:null,probe:{x:probeX,y:probeY,topTag:topElement?.tagName ?? null,topClass:topElement?.className ?? null},overlapProbe:{x:overlapProbeX,y:overlapProbeY,topTag:overlapElement?.tagName ?? null,topClass:overlapElement?.className ?? null}},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
    }, [showSkillDropdown]);

    useEffect(() => {
        if (!showSkillDropdown) return;
        const onPointerDownCapture = (event) => {
            const dropdownEl = skillDropdownRef.current;
            const buttonEl = skillButtonRef.current;
            const target = event.target;
            const insideDropdown = !!(dropdownEl && target instanceof Node && dropdownEl.contains(target));
            const onButton = !!(buttonEl && target instanceof Node && buttonEl.contains(target));
            // #region agent log
            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f47d3'},body:JSON.stringify({sessionId:'1f47d3',runId:'post-fix',hypothesisId:'H5',location:'Employer/Dashboard.jsx:document_pointerdown_capture',message:'Pointer down while dropdown open',data:{insideDropdown,onButton,targetTag:(target && target.tagName) ? target.tagName : null,targetClass:(target && target.className) ? target.className : null},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        };
        document.addEventListener('pointerdown', onPointerDownCapture, true);
        return () => document.removeEventListener('pointerdown', onPointerDownCapture, true);
    }, [showSkillDropdown]);

    const applyFilters = (overrides = {}) => {
        const params = {
            search: overrides.search !== undefined ? overrides.search : search,
            skills: overrides.skills !== undefined ? overrides.skills : selectedSkills,
            sort: overrides.sort !== undefined ? overrides.sort : sort,
            sort_dir: overrides.sort_dir !== undefined ? overrides.sort_dir : sortDir,
        };
        router.get(route('employer.dashboard'), {
            search: params.search || undefined,
            'skills[]': params.skills?.length ? params.skills : undefined,
            sort: params.sort,
            sort_dir: params.sort_dir,
        }, { preserveState: true });
    };

    const handleSearchSubmit = (e) => {
        e?.preventDefault();
        applyFilters({ search });
    };

    const toggleSkill = (skillName) => {
        const next = selectedSkills.includes(skillName)
            ? selectedSkills.filter((s) => s !== skillName)
            : [...selectedSkills, skillName];
        setSelectedSkills(next);
        applyFilters({ skills: next });
    };

    const clearSkillFilter = () => {
        setSelectedSkills([]);
        applyFilters({ skills: [] });
    };

    const currentSort = filters?.sort ?? 'latest_registered';
    const currentSortDir = filters?.sort_dir === 'asc' ? 'asc' : 'desc';
    const activeOption = SORT_OPTIONS.find((o) => o.value === currentSort) ?? SORT_OPTIONS[1];
    const activeOptionDetail = currentSort === 'latest_registered'
        ? (currentSortDir === 'asc'
            ? 'Sorted by oldest registration date from the database.'
            : 'Sorted by newest registration date from the database.')
        : activeOption.detail;
    const showBestMatchHint = currentSort === 'best_match' && !bestMatchHasSkills;

    const getSortLabel = (opt, isActive) => {
        if (opt.value === 'latest_registered' && isActive) {
            return currentSortDir === 'asc'
                ? `${opt.label} (Oldest)`
                : `${opt.label} (Newest)`;
        }
        return opt.label;
    };

    const handleSortClick = (nextSort) => {
        let nextSortDir = currentSortDir;

        if (nextSort === 'latest_registered') {
            nextSortDir = currentSort === 'latest_registered'
                ? (currentSortDir === 'desc' ? 'asc' : 'desc')
                : 'desc';
        } else {
            nextSortDir = 'desc';
        }

        setSort(nextSort);
        setSortDir(nextSortDir);

        router.get(route('employer.dashboard'), {
            search: filters?.search || undefined,
            'skills[]': (filters?.skills?.length && filters.skills) || undefined,
            sort: nextSort,
            sort_dir: nextSortDir,
        }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : undefined}
            header={
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className={`text-xl font-semibold leading-tight tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            Find Gig Workers
                        </h2>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Find talent by name, title, or skills
                        </p>
                    </div>
                    <Link
                        href={route('jobs.create')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-600/20 transition-colors"
                    >
                        Post a Job
                    </Link>
                </div>
            }
        >
            <Head title="Browse Gig Workers - Employer Dashboard">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <div className={`min-h-screen font-sans ${isDark ? 'bg-gray-900' : 'bg-white'}`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-700/10 rounded-full blur-[100px]" style={{ animationDelay: '2s' }} />
                </div>

                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
                    {auth?.user?.profile_completed && (auth?.user?.id_verification_status?.status ?? auth?.user?.id_verification_status) !== 'verified' && (
                        <IDVerificationBanner
                            message="Complete Valid ID verification to build trust with gig workers and use all platform features."
                            buttonText="Verify your ID"
                            linkUrl={route('id-verification.show')}
                            variant="info"
                            dismissible={true}
                        />
                    )}

                    {profileSummary && (
                        <div className={`mb-4 rounded-xl border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Your Profiling Snapshot</p>
                                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Last updated: {profileSummary.computed_at ? new Date(profileSummary.computed_at).toLocaleString() : 'Not available yet'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-md ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>Complete: {profileSummary.completeness_score ?? 0}</span>
                                    <span className={`text-xs px-2 py-1 rounded-md ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>Activity: {profileSummary.activity_score_30d ?? 0}</span>
                                    <span className={`text-xs px-2 py-1 rounded-md ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>Intent: {profileSummary.intent_score ?? 0}</span>
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {(Array.isArray(profileSummary.segments) ? profileSummary.segments : []).map((segment) => (
                                    <span key={segment} className={isDark ? 'text-[11px] px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-300 border-blue-500/30' : 'text-[11px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200'}>
                                        {segment}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Global navigation: fixed-height container, content width */}
                    <div className="mb-6 w-full">
                        <nav
                            className={`inline-flex flex-nowrap gap-1 p-1.5 rounded-xl backdrop-blur-sm min-h-[3.25rem] box-border border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}
                            aria-label="Sort gig workers"
                        >
                            {SORT_OPTIONS.map((opt) => {
                                const isActive = currentSort === opt.value;
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleSortClick(opt.value)}
                                        className={`flex items-center justify-center gap-2 min-h-[2.5rem] px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                            : isDark ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                        <span>{getSortLabel(opt, isActive)}</span>
                                    </button>
                                );
                            })}
                        </nav>
                        <p className={`mt-2 text-sm min-h-[1.25rem] ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                            {activeOptionDetail}
                        </p>
                        {showBestMatchHint && (
                            <div className={`mt-2 flex items-start gap-2 p-3 rounded-xl text-sm min-h-0 box-border w-full border ${isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                                <InformationCircleIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                <p className="min-w-0">
                                    Post a job and add required skills to see workers ranked by how well they match your needs.
                                    <Link href={route('jobs.create')} className={`ml-1 font-medium transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                                        Post a job
                                    </Link>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Search and filters bar: fixed-height container */}
                    <div ref={filterBarRef} className={`relative z-30 rounded-xl backdrop-blur-sm p-4 mb-6 w-full box-border min-h-[4.5rem] border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-4 lg:items-center lg:min-h-[2.75rem]">
                            <div className="flex-1 min-w-0 w-full lg:max-w-xl">
                                <div className="relative">
                                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by name, job title, or skills..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onBlur={() => search && applyFilters({ search })}
                                        className={`block w-full min-w-0 pl-10 pr-3 py-2.5 h-11 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 transition-colors ${isDark ? 'bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'}`}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 min-h-[2.75rem]">
                                <div className="relative">
                                    <button
                                        ref={skillButtonRef}
                                        type="button"
                                        onClick={() => {
                                            const nextValue = !showSkillDropdown;
                                            const btnRect = skillButtonRef.current?.getBoundingClientRect?.();
                                            // #region agent log
                                            fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f47d3'},body:JSON.stringify({sessionId:'1f47d3',runId:'post-fix',hypothesisId:'H1',location:'Employer/Dashboard.jsx:skills_button_click',message:'Skills button toggled',data:{nextValue,currentValue:showSkillDropdown,btnRect},timestamp:Date.now()})}).catch(()=>{});
                                            // #endregion
                                            setShowSkillDropdown(nextValue);
                                        }}
                                        className={`inline-flex items-center h-11 px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap transition-colors border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 focus:ring-offset-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-offset-white'}`}
                                    >
                                        <FunnelIcon className={`h-5 w-5 mr-2 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                        <span className="truncate">Skills</span>
                                        {selectedSkills.length > 0 && (
                                            <span className="ml-2 bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full flex-shrink-0 border border-blue-500/30">
                                                {selectedSkills.length}
                                            </span>
                                        )}
                                        <ChevronDownIcon className={`h-4 w-4 ml-2 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                    </button>
                                    {showSkillDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => {
                                                // #region agent log
                                                fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1f47d3'},body:JSON.stringify({sessionId:'1f47d3',runId:'post-fix',hypothesisId:'H3',location:'Employer/Dashboard.jsx:overlay_click_close',message:'Overlay clicked to close dropdown',data:{showSkillDropdownBeforeClose:showSkillDropdown},timestamp:Date.now()})}).catch(()=>{});
                                                // #endregion
                                                setShowSkillDropdown(false);
                                            }} />
                                            <div ref={skillDropdownRef} className={`absolute left-0 mt-1 w-64 max-h-72 overflow-auto rounded-xl shadow-xl z-20 py-2 backdrop-blur-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                                {selectedSkills.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={clearSkillFilter}
                                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${isDark ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-gray-50'}`}
                                                    >
                                                        Clear skills filter
                                                    </button>
                                                )}
                                                {skillOptions.length === 0 ? (
                                                    <p className="px-4 py-2 text-sm text-gray-500">No skills in database yet</p>
                                                ) : (
                                                    skillOptions.map((name) => (
                                                        <button
                                                            key={name}
                                                            type="button"
                                                            onClick={() => toggleSkill(name)}
                                                            className={`w-full text-left px-4 py-2 text-sm flex items-center truncate transition-colors ${selectedSkills.includes(name) ? 'bg-blue-500/10 text-blue-300 font-medium' : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                                                        >
                                                            {selectedSkills.includes(name) && (
                                                                <span className="mr-2 text-blue-400 flex-shrink-0">✓</span>
                                                            )}
                                                            <span className="truncate">{name}</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center h-11 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 whitespace-nowrap min-w-[5rem] transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Search
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Results count: single line */}
                    <div className={`mb-4 h-5 flex items-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {workers.total > 0
                            ? `Showing ${workers.data?.length ?? 0} of ${workers.total} gig workers`
                            : 'No gig workers found. Try adjusting search or filters.'}
                    </div>

                    {/* Worker cards grid: fixed card dimensions */}
                    <div ref={workerGridRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                        {(workers.data ?? []).map((worker) => (
                            <div
                                key={worker.id}
                                className={`rounded-xl backdrop-blur-sm overflow-hidden flex flex-col w-full h-[420px] min-h-[420px] max-h-[420px] border transition-all duration-200 ${isDark ? 'bg-gray-800 border-gray-700 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg hover:shadow-gray-200'}`}
                            >
                                <div className="p-5 flex flex-col flex-1 min-h-0 overflow-hidden">
                                    {/* Avatar + name: fixed height */}
                                    <div className="flex items-center gap-3 flex-shrink-0 h-16 min-h-[4rem]">
                                        {(() => {
                                            const raw = worker.profile_picture;
                                            const resolved = raw ? (resolveProfileImageUrl(raw) || raw) : null;
                                            // #region agent log
                                            if (raw) fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aefa0a'},body:JSON.stringify({sessionId:'aefa0a',location:'Employer/Dashboard.jsx:worker_avatar',message:'Worker avatar URL',data:{raw,resolved,workerId:worker.id},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
                                            // #endregion
                                            return resolved ? (
                                            <img
                                                src={resolved}
                                                alt=""
                                                className={`w-12 h-12 rounded-full object-cover flex-shrink-0 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}
                                            />
                                        ) : (
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                                                <UserCircleIcon className="w-7 h-7 text-gray-500" />
                                            </div>
                                        );
                                        })()}
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <h3 className={`text-base font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                                {worker.full_name}
                                            </h3>
                                            {worker.professional_title ? (
                                                <p className={`text-sm font-medium truncate mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {worker.professional_title}
                                                </p>
                                            ) : (
                                                <div className="h-5" />
                                            )}
                                        </div>
                                    </div>
                                    {/* Bio: fixed height, clamped */}
                                    <div className="mt-3 flex-shrink-0 h-[4rem] overflow-hidden">
                                        {worker.bio ? (
                                            <p className={`text-sm line-clamp-3 leading-relaxed break-all ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {worker.bio}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No bio</p>
                                        )}
                                    </div>
                                    {/* Hourly + portfolio: fixed height */}
                                    <div className="mt-2 flex-shrink-0 h-6 overflow-hidden flex items-center">
                                        {(worker.hourly_rate != null && worker.hourly_rate !== '') || worker.portfolio_link ? (
                                            <div className={`flex flex-wrap items-center gap-x-4 gap-y-0 text-sm min-w-0 overflow-hidden ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {worker.hourly_rate != null && worker.hourly_rate !== '' && (
                                                    <span className="inline-flex items-center gap-1 flex-shrink-0">
                                                        <span>₱{Number(worker.hourly_rate).toLocaleString()}/hr</span>
                                                    </span>
                                                )}
                                                {worker.portfolio_link && (
                                                    <a
                                                        href={worker.portfolio_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center gap-1 truncate max-w-[10rem] transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <GlobeAltIcon className="h-4 w-4 flex-shrink-0" />
                                                        <span className="truncate">Portfolio</span>
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-500">—</span>
                                        )}
                                    </div>
                                    {/* Skills: fixed height, wrap with overflow hidden */}
                                    <div className="mt-3 flex-shrink-0 min-h-[2.5rem] max-h-[3rem] flex flex-wrap gap-1.5 items-center overflow-hidden">
                                        {worker.skills?.length > 0 ? (
                                            <>
                                                {worker.skills.slice(0, 6).map((skill) => (
                                                    <span
                                                        key={skill}
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium truncate max-w-[8rem] border ${isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-blue-100 text-blue-800 border-blue-200'}`}
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                                {worker.skills.length > 6 && (
                                                    <span className="text-xs text-gray-500 flex-shrink-0">+{worker.skills.length - 6}</span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-500">No skills listed</span>
                                        )}
                                    </div>
                                    {/* Spacer to push button down */}
                                    <div className="flex-1 min-h-2" />
                                    {/* Button: fixed at bottom, no overlap */}
                                    <div className={`flex-shrink-0 pt-4 mt-auto border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <Link
                                            href={worker.profile_url}
                                            className="inline-flex items-center justify-center w-full h-11 px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 transition-colors shadow-lg shadow-blue-600/20"
                                        >
                                            <LinkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                                            <span>View Profile</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination: fixed height row */}
                    {workers.data?.length > 0 && (workers.prev_page_url || workers.next_page_url) && (
                        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 min-h-[2.75rem] py-2">
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Page {workers.current_page} of {workers.last_page}
                            </p>
                            <div className="flex gap-2">
                                {workers.prev_page_url && (
                                    <Link
                                        href={workers.prev_page_url}
                                        className={`inline-flex items-center justify-center px-4 py-2 h-10 border rounded-lg text-sm font-medium min-w-[5rem] transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Previous
                                    </Link>
                                )}
                                {workers.next_page_url && (
                                    <Link
                                        href={workers.next_page_url}
                                        className="inline-flex items-center justify-center px-4 py-2 h-10 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 min-w-[5rem] shadow-lg shadow-blue-600/20 transition-colors"
                                    >
                                        Next
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer (same as Find Jobs page) */}
                    <div className="mt-10 -mx-4 sm:-mx-6 lg:-mx-8">
                        <div className={`px-4 sm:px-6 lg:px-8 py-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                            <div className="max-w-7xl mx-auto">
                                <footer className={`border-t pt-8 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                                        <div>
                                            <h3 className={`text-xl font-black mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>WorkWise</h3>
                                            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                The future of work, powered by elite intelligence and seamless collaboration.
                                            </p>
                                        </div>

                                        <div>
                                            <h4 className={`font-bold mb-3 uppercase tracking-widest text-xs ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>For Talent</h4>
                                            <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <li><Link href="/jobs" className={isDark ? 'hover:text-blue-500 transition-colors' : 'hover:text-blue-600 transition-colors'}>Browse Gigs</Link></li>
                                                <li><Link href="/ai/recommendations" className={isDark ? 'hover:text-blue-500 transition-colors' : 'hover:text-blue-600 transition-colors'}>AI Recommendations</Link></li>
                                                <li><Link href={safeRoute('role.selection')} className={isDark ? 'hover:text-blue-500 transition-colors' : 'hover:text-blue-600 transition-colors'}>Join as Expert</Link></li>
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className={`font-bold mb-3 uppercase tracking-widest text-xs ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>For Companies</h4>
                                            <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <li><Link href="/freelancers" className={isDark ? 'hover:text-blue-500 transition-colors' : 'hover:text-blue-600 transition-colors'}>Find Experts</Link></li>
                                                <li><Link href="/jobs/create" className={isDark ? 'hover:text-blue-500 transition-colors' : 'hover:text-blue-600 transition-colors'}>Post a Project</Link></li>
                                                <li><Link href={safeRoute('role.selection')} className={isDark ? 'hover:text-blue-500 transition-colors' : 'hover:text-blue-600 transition-colors'}>Scale Your Team</Link></li>
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className={`font-bold mb-3 uppercase tracking-widest text-xs ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Platform</h4>
                                            <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <li><Link href="/help" className={isDark ? 'hover:text-blue-500 transition-colors' : 'hover:text-blue-600 transition-colors'}>Help Center</Link></li>
                                                <li><Link href="/about" className={isDark ? 'hover:text-blue-500 transition-colors' : 'hover:text-blue-600 transition-colors'}>Our Vision</Link></li>
                                                <li><Link href="/privacy" className={isDark ? 'hover:text-blue-500 transition-colors' : 'hover:text-blue-600 transition-colors'}>Privacy</Link></li>
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
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
