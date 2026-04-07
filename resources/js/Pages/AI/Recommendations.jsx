import React, { useEffect, useMemo, useState } from "react";

import { Head, Link, router } from "@inertiajs/react";

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { useTheme } from "@/Contexts/ThemeContext";
import Pagination from "@/Components/Pagination";
import usePagination from "@/Hooks/usePagination";
import { resolveProfileImageUrl } from "@/utils/avatarUrl.js";

export default function Recommendations({
    recommendations,
    userType,
    hasError,
    skills = [],
    pageTitle = "AI Recommendations",
    bannerTitle,
    bannerDescription,
    openJobs = [],
    singleJobId = null,
}) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const isGigWorker = userType === "gig_worker";
    const isAimatchPage = pageTitle === "AI Match";

    const effectiveBannerTitle = bannerTitle ?? (isGigWorker ? "AI-Powered Job Recommendations" : "AI-Matched Gig Workers");
    const effectiveBannerDescription = bannerDescription ?? (isGigWorker
        ? "Our AI analyzes your skills, experience, and professional background to find the best job opportunities for you. Match scores are based on skill compatibility and experience alignment."
        : "Our AI evaluates gig worker profiles against your job requirements, focusing on skills match and experience level to find the best candidates for your projects.");

    const experienceOptions = [
        { label: "All experience levels", value: "all" },

        { label: "Beginner", value: "beginner" },

        { label: "Intermediate", value: "intermediate" },

        { label: "Expert", value: "expert" },
    ];

    const [filters, setFilters] = useState({
        experience: "all",
        budgetMin: "",
        budgetMax: "",
        skills: [],
    });

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        const params = new URLSearchParams(window.location.search);
        params.set("refresh", "1");
        router.get(window.location.pathname + "?" + params.toString(), {}, { preserveScroll: true, onFinish: () => setIsRefreshing(false) });
    };

    const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState(false);

    const availableSkills = useMemo(
        () =>
            (skills || [])

                .map((skill) => (typeof skill === "string" ? skill.trim() : ""))

                .filter((skill) => skill.length > 0),

        [skills],
    );

    const normalizedSelectedSkills = useMemo(
        () => filters.skills.map((skill) => skill.toLowerCase()),

        [filters.skills],
    );

    const budgetFilter = useMemo(() => {
        const parseBudgetValue = (value) => {
            if (value === "" || value === null || value === undefined) {
                return null;
            }

            if (typeof value === "number") {
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

    const baseFreelancerRecommendations = Array.isArray(recommendations)
        ? recommendations
        : [];

    const baseEmployerRecommendations =
        !Array.isArray(recommendations) && recommendations
            ? recommendations
            : {};

    useEffect(() => {
        if (typeof fetch === "undefined") return;
        const employerKeys = Object.keys(baseEmployerRecommendations || {});
        const firstJobData =
            employerKeys.length > 0
                ? baseEmployerRecommendations[employerKeys[0]]
                : null;
        const firstMatch =
            firstJobData && Array.isArray(firstJobData.matches) && firstJobData.matches.length
                ? firstJobData.matches[0]
                : null;
        // #region agent log
        fetch("http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Debug-Session-Id": "ae4463",
            },
            body: JSON.stringify({
                sessionId: "ae4463",
                runId: "pre-fix",
                hypothesisId: "I1,I2,I3",
                location: "Recommendations.jsx:mount",
                message: "employer page input snapshot",
                data: {
                    path:
                        typeof window !== "undefined"
                            ? window.location.pathname + window.location.search
                            : null,
                    isGigWorker,
                    recommendationsIsArray: Array.isArray(recommendations),
                    employerJobKeysCount: employerKeys.length,
                    firstJobId: employerKeys[0] || null,
                    firstJobHasMatches: !!(firstJobData && Array.isArray(firstJobData.matches)),
                    firstJobMatchesCount:
                        firstJobData && Array.isArray(firstJobData.matches)
                            ? firstJobData.matches.length
                            : null,
                    firstMatchKeys: firstMatch ? Object.keys(firstMatch) : [],
                    firstMatchReasonType: firstMatch ? typeof firstMatch.reason : null,
                    hasTopLevelInsights:
                        !!recommendations &&
                        !Array.isArray(recommendations) &&
                        Object.prototype.hasOwnProperty.call(recommendations, "insights"),
                },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
        // #endregion
    }, [isGigWorker, recommendations, baseEmployerRecommendations]);

    useEffect(() => {
        if (!isGigWorker || typeof fetch === "undefined") return;
        const items = Array.isArray(recommendations) ? recommendations : [];
        // #region agent log
        fetch("http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Debug-Session-Id": "104979",
            },
            body: JSON.stringify({
                sessionId: "104979",
                hypothesisId: "H5",
                location: "Recommendations.jsx:gig_worker_snapshot",
                message: "gig worker inertia payload",
                data: {
                    count: items.length,
                    reason_types: items.map((m) => typeof m?.reason),
                    reason_lens: items.map((m) =>
                        typeof m?.reason === "string" ? m.reason.trim().length : -1,
                    ),
                },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
        // #endregion
    }, [isGigWorker, recommendations]);

    const hasActiveFilters = useMemo(
        () =>
            filters.experience !== "all" ||
            filters.budgetMin !== "" ||
            filters.budgetMax !== "" ||
            filters.skills.length > 0,

        [filters],
    );

    const matchesExperience = (value) => {
        if (filters.experience === "all") {
            return true;
        }

        if (!value) {
            return false;
        }

        return value.toLowerCase() === filters.experience;
    };

    /** Normalize JSON/array/string skill payloads from API (Inertia / DB). */
    const normalizeSkillSetInput = (skillSet) => {
        if (skillSet == null) {
            return [];
        }
        if (typeof skillSet === "string") {
            const t = skillSet.trim();
            if (!t) {
                return [];
            }
            try {
                const parsed = JSON.parse(t);
                return Array.isArray(parsed) ? parsed : [t];
            } catch {
                return [t];
            }
        }
        return Array.isArray(skillSet) ? skillSet : [];
    };

    /** Jobs may store skills in required_skills and/or skills_requirements. */
    const collectJobSkillEntries = (job) => {
        if (!job || typeof job !== "object") {
            return [];
        }
        const out = [];
        out.push(...normalizeSkillSetInput(job.required_skills));
        out.push(...normalizeSkillSetInput(job.skills_requirements));

        const seen = new Set();
        const deduped = [];
        for (const skill of out) {
            const label =
                typeof skill === "string"
                    ? skill.trim()
                    : (skill?.skill ?? skill?.name ?? skill?.[0] ?? "")
                          .toString()
                          .trim();
            if (!label) {
                continue;
            }
            const key = label.toLowerCase();
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            deduped.push(skill);
        }

        return deduped;
    };

    const getInsightReason = (reason) => {
        if (typeof reason === "string" && reason.trim().length > 0) {
            return reason.trim();
        }

        return "Match generated from your skill fit and employer quality signals.";
    };

    /** Gig worker profile has no top-level experience_level; levels live on skills_with_experience rows. */
    const matchesWorkerExperience = (gigWorker) => {
        if (filters.experience === "all") {
            return true;
        }
        const target = filters.experience.toLowerCase();
        const legacy = gigWorker?.experience_level;
        if (legacy) {
            return String(legacy).toLowerCase() === target;
        }
        const raw = normalizeSkillSetInput(gigWorker?.skills_with_experience);
        if (raw.length === 0) {
            return false;
        }
        return raw.some((row) => {
            if (typeof row === "string") {
                return row.toLowerCase() === target;
            }
            const lvl =
                row?.experience_level ?? row?.proficiency ?? row?.[1] ?? "";
            return String(lvl).toLowerCase() === target;
        });
    };

    const getWorkerSkillsForFilter = (gigWorker) => {
        const sw = normalizeSkillSetInput(gigWorker?.skills_with_experience);
        if (sw.length > 0) {
            return sw;
        }
        return normalizeSkillSetInput(gigWorker?.skills);
    };

    const matchesSkillFilter = (skillSet) => {
        if (!normalizedSelectedSkills.length) {
            return true;
        }

        const list = normalizeSkillSetInput(skillSet);
        if (list.length === 0) {
            return false;
        }

        const normalizedSkillSet = list
            .map((skill) => {
                const name =
                    typeof skill === "string"
                        ? skill
                        : skill?.skill ?? skill?.name ?? skill?.[0] ?? "";
                return typeof name === "string" ? name.toLowerCase() : "";
            })
            .filter((skill) => skill.length > 0);

        if (normalizedSkillSet.length === 0) {
            return false;
        }

        return normalizedSelectedSkills.every((skill) =>
            normalizedSkillSet.includes(skill),
        );
    };

    const jobBudgetMatches = (minValue, maxValue) => {
        if (budgetFilter.min === null && budgetFilter.max === null) {
            return true;
        }

        const jobMin = minValue !== undefined ? minValue : null;

        const jobMax = maxValue !== undefined ? maxValue : null;

        const normalizedMin =
            jobMin === null || jobMin === "" || jobMin === undefined
                ? null
                : Number.isFinite(jobMin)
                    ? jobMin
                    : Number.isFinite(parseFloat(jobMin))
                        ? parseFloat(jobMin)
                        : null;

        const normalizedMax =
            jobMax === null || jobMax === "" || jobMax === undefined
                ? null
                : Number.isFinite(jobMax)
                    ? jobMax
                    : Number.isFinite(parseFloat(jobMax))
                        ? parseFloat(jobMax)
                        : null;

        if (normalizedMin === null && normalizedMax === null) {
            return true;
        }

        const rangeMin = normalizedMin ?? normalizedMax;

        const rangeMax = normalizedMax ?? normalizedMin;

        if (rangeMin === null && rangeMax === null) {
            return true;
        }

        if (
            budgetFilter.min !== null &&
            rangeMax !== null &&
            rangeMax < budgetFilter.min
        ) {
            return false;
        }

        if (
            budgetFilter.max !== null &&
            rangeMin !== null &&
            rangeMin > budgetFilter.max
        ) {
            return false;
        }

        return true;
    };

    const workerBudgetMatches = (hourlyRate) => {
        if (budgetFilter.min === null && budgetFilter.max === null) {
            return true;
        }

        if (
            hourlyRate === null ||
            hourlyRate === undefined ||
            hourlyRate === ""
        ) {
            return true;
        }

        const rate =
            typeof hourlyRate === "number"
                ? hourlyRate
                : Number.isFinite(parseFloat(hourlyRate))
                    ? parseFloat(hourlyRate)
                    : null;

        if (rate === null) {
            return true;
        }

        if (budgetFilter.min !== null && rate < budgetFilter.min) {
            return false;
        }

        if (budgetFilter.max !== null && rate > budgetFilter.max) {
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
                (selectedSkill) =>
                    selectedSkill.toLowerCase() === skill.toLowerCase(),
            );

            return {
                ...current,

                skills: alreadySelected
                    ? current.skills.filter(
                        (selectedSkill) =>
                            selectedSkill.toLowerCase() !==
                            skill.toLowerCase(),
                    )
                    : [...current.skills, skill],
            };
        });
    };

    const clearFilters = () => {
        setFilters({
            experience: "all",

            budgetMin: "",

            budgetMax: "",

            skills: [],
        });

        setIsSkillDropdownOpen(false);
    };

    const filteredFreelancerRecommendations = useMemo(() => {
        if (!isGigWorker) {
            return baseFreelancerRecommendations;
        }

        return baseFreelancerRecommendations.filter((match) => {
            const job = match.job || {};

            if (!matchesExperience(job.experience_level)) {
                return false;
            }

            if (!jobBudgetMatches(job.budget_min, job.budget_max)) {
                return false;
            }

            if (!matchesSkillFilter(collectJobSkillEntries(job))) {
                return false;
            }

            return true;
        });
    }, [
        isGigWorker,

        baseFreelancerRecommendations,

        filters,

        normalizedSelectedSkills,

        budgetFilter,
    ]);

    const filteredEmployerRecommendations = useMemo(() => {
        if (isGigWorker) {
            return baseEmployerRecommendations;
        }

        return Object.entries(baseEmployerRecommendations).reduce(
            (accumulator, [jobId, data]) => {
                const matches = Array.isArray(data.matches)
                    ? data.matches.filter((match) => {
                        const gigWorker = match.gig_worker || {};

                        if (!matchesWorkerExperience(gigWorker)) {
                            return false;
                        }

                        if (!workerBudgetMatches(gigWorker.hourly_rate)) {
                            return false;
                        }

                        if (!matchesSkillFilter(getWorkerSkillsForFilter(gigWorker))) {
                            return false;
                        }

                        return true;
                    })
                    : [];

                return {
                    ...accumulator,

                    [jobId]: {
                        ...data,

                        matches,
                    },
                };
            },
            {},
        );
    }, [
        isGigWorker,

        baseEmployerRecommendations,

        filters,

        normalizedSelectedSkills,

        budgetFilter,
    ]);

    // #region agent log
    useEffect(() => {
        if (typeof fetch === "undefined") {
            return;
        }
        const baseGig = Array.isArray(recommendations) ? recommendations.length : 0;
        const filteredGig = filteredFreelancerRecommendations.length;
        const employerMatchTotal = (obj) =>
            Object.values(obj || {}).reduce(
                (n, jd) => n + (Array.isArray(jd?.matches) ? jd.matches.length : 0),
                0,
            );
        fetch("http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Debug-Session-Id": "6fa68d",
            },
            body: JSON.stringify({
                sessionId: "6fa68d",
                hypothesisId: "F1",
                location: "Recommendations.jsx:filter_snapshot",
                message: "recommendation filter counts",
                data: {
                    isGigWorker,
                    hasActiveFilters,
                    baseGig,
                    filteredGig,
                    baseEmployerMatches: employerMatchTotal(baseEmployerRecommendations),
                    filteredEmployerMatches: employerMatchTotal(filteredEmployerRecommendations),
                },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
    }, [
        isGigWorker,
        hasActiveFilters,
        recommendations,
        filteredFreelancerRecommendations,
        baseEmployerRecommendations,
        filteredEmployerRecommendations,
    ]);
    // #endregion

    const employerHasInitialMatches = useMemo(
        () =>
            Object.values(baseEmployerRecommendations).some(
                (jobData) =>
                    jobData &&
                    Array.isArray(jobData.matches) &&
                    jobData.matches.length > 0,
            ),

        [baseEmployerRecommendations],
    );

    const employerNeedsToChooseJob = useMemo(
        () =>
            !isGigWorker &&
            Array.isArray(openJobs) &&
            openJobs.length > 0 &&
            Object.keys(baseEmployerRecommendations).length === 0,
        [isGigWorker, openJobs, baseEmployerRecommendations],
    );

    const filtersAppliedForFreelancer =
        hasActiveFilters && baseFreelancerRecommendations.length > 0;

    const filtersAppliedForEmployer =
        hasActiveFilters && employerHasInitialMatches;

    // Pagination for gig worker recommendations (5 items per page)
    const {
        currentPage: gigWorkerPage,
        totalPages: gigWorkerTotalPages,
        currentItems: paginatedGigWorkerRecs,
        goToPage: goToGigWorkerPage,
        shouldShowPagination: shouldShowGigWorkerPagination,
        totalItems: gigWorkerTotalItems,
        itemsPerPage: gigWorkerItemsPerPage,
    } = usePagination(filteredFreelancerRecommendations, 5);

    // Pagination for employer recommendations (5 jobs per page)
    const employerRecsArray = useMemo(() => {
        return Object.entries(filteredEmployerRecommendations || {}).filter(
            ([, jobData]) => jobData && Array.isArray(jobData.matches) && jobData.matches.length > 0
        );
    }, [filteredEmployerRecommendations]);

    const {
        currentPage: employerPage,
        totalPages: employerTotalPages,
        currentItems: paginatedEmployerRecs,
        goToPage: goToEmployerPage,
        shouldShowPagination: shouldShowEmployerPagination,
        totalItems: employerTotalItems,
        itemsPerPage: employerItemsPerPage,
    } = usePagination(employerRecsArray, 5);

    const getMatchScoreColor = (score) => {
        if (score >= 80) return "text-green-600";

        if (score >= 60) return "text-blue-600";

        if (score >= 30) return "text-yellow-600";

        return "text-orange-600";
    };

    const getMatchScoreColorDark = (score) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-blue-400";
        if (score >= 30) return "text-amber-400";
        return "text-orange-400";
    };

    const renderFreelancerRecommendations = (items, filtersApplied) => {
        if (!items || items.length === 0) {
            return (
                <div className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl border border-gray-700" : "bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200"}>
                    <div className="p-8 text-center">
                        <div className="text-6xl mb-4">🔍</div>

                        <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                            {filtersApplied
                                ? "No Results Found"
                                : "No Job Matches Found"}
                        </h3>

                        <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                            {filtersApplied
                                ? "Try adjusting your filters to see more AI recommendations."
                                : "We couldn't find any jobs matching your current skills and experience. Try updating your profile with more skills or check back later for new opportunities."}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <>
                <div className="space-y-6">
                    {items.map((match, index) => (
                        <div
                            key={index}
                            className={isDark
                                ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl border-l-4 border-blue-500 border border-gray-700 hover:border-blue-500/30 transition-all duration-200"
                                : "bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border-l-4 border-blue-500 border border-gray-200"
                            }
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl"></span>

                                            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                                                <Link
                                                    href={route(
                                                        "jobs.show",
                                                        match.job.id,
                                                    )}
                                                    className={isDark ? "hover:text-blue-400 transition-colors" : "hover:text-blue-600 transition-colors"}
                                                >
                                                    {match.job.title}
                                                </Link>
                                            </h3>
                                        </div>

                                        <div className={`text-sm flex items-center gap-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                            <span>
                                                Posted by:{" "}
                                                <span className="font-medium">
                                                    {match.job.employer &&
                                                        `${match.job.employer.first_name} ${match.job.employer.last_name}`}
                                                </span>
                                            </span>

                                            {match.job.experience_level && (
                                                <span className={isDark ? "px-3 py-1 bg-gray-700 text-gray-200 rounded-xl text-sm font-medium border border-gray-700" : "px-3 py-1 bg-gray-100 rounded-xl text-sm font-medium shadow-md"}>
                                                    {match.job.experience_level
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        match.job.experience_level.slice(
                                                            1,
                                                        )}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div
                                            className={`text-3xl font-bold ${isDark ? getMatchScoreColorDark(match.score) : getMatchScoreColor(match.score)}`}
                                        >
                                            {match.score}%
                                        </div>

                                        <div className={isDark ? "text-xs text-gray-500 font-medium" : "text-xs text-gray-500 font-medium"}>
                                            {match.score >= 80
                                                ? "🎯 Excellent"
                                                : match.score >= 60
                                                    ? "👍 Good"
                                                    : match.score >= 40
                                                        ? "✓ Fair"
                                                        : "⚠️ Weak"}{" "}
                                            Match
                                        </div>
                                    </div>
                                </div>

                                <div className={isDark ? "bg-blue-500/10 rounded-xl p-6 mb-4 border border-blue-500/20" : "bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-4 border border-blue-200 shadow-md"}>
                                    <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? "text-blue-300" : "text-blue-900"}`}>
                                        <span>🤖</span> AI Analysis - Why this
                                        matches your profile:
                                    </h4>

                                    <p className={isDark ? "text-gray-200 leading-relaxed" : "text-gray-700 leading-relaxed"}>
                                        {getInsightReason(match.reason)}
                                    </p>
                                </div>

                                {collectJobSkillEntries(match.job).length > 0 && (
                                        <div className="mb-4">
                                            <h4 className={`text-xs font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                                                Required Skills:
                                            </h4>

                                            <div className="flex flex-wrap gap-2">
                                                {collectJobSkillEntries(match.job).map(
                                                    (skill, idx) => {
                                                        const label =
                                                            typeof skill === "string"
                                                                ? skill
                                                                : skill?.skill ?? skill?.name ?? skill?.[0] ?? "";
                                                        return (
                                                            <span
                                                                key={idx}
                                                                className={isDark ? "px-3 py-1 bg-blue-500/10 text-blue-300 text-sm font-medium rounded-xl border border-blue-500/20" : "px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-xl shadow-md"}
                                                            >
                                                                {label}
                                                            </span>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    )}

                                <div className={`flex justify-between items-center pt-4 ${isDark ? "border-t border-gray-700" : "border-t border-gray-200"}`}>
                                    <div className={isDark ? "text-sm text-gray-400" : "text-sm text-gray-600"}>
                                        <span className="font-medium">Budget:</span>{" "}
                                        {match.job.budget_display ||
                                            `₱${match.job.budget_min || 0} - ₱${match.job.budget_max || 0}`}
                                        {match.job.budget_type && (
                                            <span className={isDark ? "text-xs text-gray-500 ml-1" : "text-xs text-gray-500 ml-1"}>
                                                ({match.job.budget_type})
                                            </span>
                                        )}
                                    </div>

                                    <Link
                                        href={route("jobs.show", match.job.id)}
                                        className={isDark
                                            ? "inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-500 border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-600/20 transition-all duration-300"
                                            : "inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border border-transparent rounded-xl font-semibold text-sm text-white uppercase tracking-widest shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                        }
                                    >
                                        View Job Details →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination for Gig Worker Recommendations */}
                {shouldShowGigWorkerPagination && (
                    <Pagination
                        currentPage={gigWorkerPage}
                        totalPages={gigWorkerTotalPages}
                        onPageChange={goToGigWorkerPage}
                        itemsPerPage={gigWorkerItemsPerPage}
                        totalItems={gigWorkerTotalItems}
                        variant={isDark ? "dark" : "light"}
                    />
                )}
            </>
        );
    };

    const renderEmployerRecommendations = (items, filtersApplied) => {
        const entries = Object.entries(items || {}).filter(
            ([, jobData]) => jobData && Array.isArray(jobData.matches),
        );

        const totalMatches = entries.reduce(
            (count, [, jobData]) => count + jobData.matches.length,

            0,
        );

        if (!entries.length || totalMatches === 0) {
            return (
                <div className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl border border-gray-700" : "bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200"}>
                    <div className="p-8 text-center">
                        <div className="text-6xl mb-4">👥</div>

                        <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                            {filtersApplied
                                ? "No Candidates Found"
                                : "No AI Matches Available"}
                        </h3>

                        <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                            {filtersApplied
                                ? "Try expanding your filters to discover more potential gig workers."
                                : "We could not find gig workers that match your current job postings. Check back soon or adjust your requirements."}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <>
                <div className="space-y-8">
                    {entries.map(([jobId, jobData]) => {
                        const matches = (jobData.matches || []).filter(
                            (match) => match && match.gig_worker,
                        );

                        if (!matches.length) {
                            return null;
                        }

                        const excellentMatches = matches.filter(
                            (match) => match.score >= 80,
                        );

                        const goodMatches = matches.filter(
                            (match) => match.score >= 60 && match.score < 80,
                        );

                        const basicMatches = matches.filter(
                            (match) => match.score > 0 && match.score < 60,
                        );

                        // #region agent log
                        if (typeof fetch !== "undefined")
                            fetch("http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-Debug-Session-Id": "ae4463",
                                },
                                body: JSON.stringify({
                                    sessionId: "ae4463",
                                    runId: "pre-fix",
                                    hypothesisId: "I2,I4,I5",
                                    location: "Recommendations.jsx:renderEmployerRecommendations",
                                    message: "employer recommendation buckets",
                                    data: {
                                        jobId,
                                        totalMatches: matches.length,
                                        excellentCount: excellentMatches.length,
                                        goodCount: goodMatches.length,
                                        basicCount: basicMatches.length,
                                        hasAnyReason: matches.some(
                                            (m) => typeof m.reason === "string" && m.reason.trim().length > 0,
                                        ),
                                        firstReasonPreview:
                                            matches[0] && typeof matches[0].reason === "string"
                                                ? matches[0].reason.slice(0, 120)
                                                : null,
                                    },
                                    timestamp: Date.now(),
                                }),
                            }).catch(() => {});
                        // #endregion

                        const getProfileUrl = (match, workerId) =>
                            match.profile_context_token
                                ? `/gig-worker/${workerId}/view?ctx=${encodeURIComponent(match.profile_context_token)}`
                                : `/gig-worker/${workerId}?job_id=${jobId}&job_title=${encodeURIComponent(jobData.job?.title || '')}&job_budget=${encodeURIComponent(jobData.job?.budget_min != null && jobData.job?.budget_max != null ? `₱${jobData.job.budget_min} - ₱${jobData.job.budget_max}` : 'Negotiable')}`;

                        const showEmptyState =
                            !excellentMatches.length &&
                            !goodMatches.length &&
                            !basicMatches.length;

                        return (
                            <div
                                key={jobId}
                                className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl border border-gray-700 hover:border-blue-500/30 transition-all duration-200" : "bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200"}
                            >
                                <div className="p-8">
                                    <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                                        Matches for:{" "}
                                        {jobData.job?.title || "Untitled Job"}
                                    </h3>

                                    <div className="space-y-4">
                                        {showEmptyState ? (
                                            <div className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                                <p>
                                                    No matching gig workers found
                                                    for this job.
                                                </p>

                                                <p className="text-sm mt-2">
                                                    Try adjusting your job
                                                    requirements or wait for more
                                                    gig workers to join the
                                                    platform.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                {excellentMatches.length > 0 && (
                                                    <>
                                                        <div className="mb-4">
                                                            <h4 className={isDark ? "text-sm font-medium text-green-400 mb-2" : "text-sm font-medium text-green-700 mb-2"}>
                                                                🎯 Excellent
                                                                Matches (
                                                                {
                                                                    excellentMatches.length
                                                                }
                                                                )
                                                            </h4>
                                                        </div>

                                                        {excellentMatches.map(
                                                            (match, index) => {
                                                                const worker =
                                                                    match.gig_worker ||
                                                                    {};

                                                                return (
                                                                    <div
                                                                        key={`excellent-${jobId}-${index}`}
                                                                        className={isDark ? "border border-green-500/30 bg-green-500/10 rounded-xl p-6" : "border border-green-200 bg-gradient-to-br from-green-50 to-white rounded-xl p-6 shadow-md"}
                                                                    >
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex-1 flex gap-4">
                                                                                <img
                                                                                    src={(() => {
                                                                                        const raw = worker.profile_picture;
                                                                                        const resolved = resolveProfileImageUrl(raw) || `https://ui-avatars.com/api/?name=${worker.first_name}+${worker.last_name}&background=random`;
                                                                                        // #region agent log
                                                                                        if (raw && typeof fetch !== 'undefined') fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c62b29'},body:JSON.stringify({sessionId:'c62b29',location:'Recommendations.jsx:profile_img',message:'Profile img URL',data:{raw,resolved:resolved.substring(0,80),noDoubleSlash:!resolved.includes('//')},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
                                                                                        // #endregion
                                                                                        return resolved;
                                                                                    })()}
                                                                                    alt={`${worker.first_name} ${worker.last_name}`}
                                                                                    className="w-16 h-16 rounded-full object-cover shadow-sm bg-white"
                                                                                />
                                                                                <div>
                                                                                    <h4 className={isDark ? "text-lg font-bold text-white hover:text-blue-400 transition-colors" : "text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"}>
                                                                                        <Link href={getProfileUrl(match, worker.id)} className="uppercase">
                                                                                            {worker.first_name} {worker.last_name}
                                                                                        </Link>
                                                                                    </h4>
                                                                                    <div className={isDark ? "text-sm font-medium text-blue-400 mt-0.5" : "text-sm font-medium text-blue-600 mt-0.5"}>
                                                                                        {worker.professional_title || "Gig Worker"}
                                                                                    </div>
                                                                                    <div className={isDark ? "text-xs text-gray-400 mt-1 flex flex-col gap-1" : "text-xs text-gray-600 mt-1 flex flex-col gap-1"}>
                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                            <span className="flex items-center gap-1">
                                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                                                                {worker.email}
                                                                                            </span>
                                                                                            {worker.email_verified_at && (
                                                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800" title="Email Verified">
                                                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                                                    Email
                                                                                                </span>
                                                                                            )}
                                                                                            {worker.id_verification_status === "verified" && (
                                                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800" title="Valid ID Verified">
                                                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                                                                    ID
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {(worker.city || worker.country) && (
                                                                                            <div className="flex items-center gap-1 mt-0.5 text-gray-500">
                                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                                                {[worker.city, worker.country].filter(Boolean).join(", ")}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="text-right">
                                                                                <div className={isDark ? "text-2xl font-bold text-green-400" : "text-2xl font-bold text-green-600"}>
                                                                                    {
                                                                                        match.score
                                                                                    }
                                                                                    %
                                                                                </div>

                                                                                <div className={isDark ? "text-sm text-gray-500" : "text-sm text-gray-500"}>
                                                                                    Match
                                                                                    Score
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className={isDark ? "bg-green-500/20 rounded-xl p-4 mt-3 border border-green-500/30" : "bg-green-100 rounded-xl p-4 mt-3 shadow-sm"}>
                                                                            <p className={isDark ? "text-sm text-gray-200" : "text-sm text-gray-700"}>
                                                                                {
                                                                                    match.reason
                                                                                }
                                                                            </p>
                                                                        </div>

                                                                        <div className="mt-4 flex justify-end">
                                                                            <Link
                                                                                href={getProfileUrl(match, worker.id)}
                                                                                className={isDark ? "inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-500 border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-green-600/20 transition-all duration-300" : "inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border border-transparent rounded-xl font-semibold text-sm text-white uppercase tracking-widest shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"}
                                                                            >
                                                                                View Profile →
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </>
                                                )}

                                                {goodMatches.length > 0 && (
                                                    <>
                                                        <div className="mb-4">
                                                            <h4 className={isDark ? "text-sm font-medium text-blue-400 mb-2" : "text-sm font-medium text-blue-700 mb-2"}>
                                                                👍 Good Matches (
                                                                {goodMatches.length}
                                                                )
                                                            </h4>

                                                            <p className={isDark ? "text-xs text-gray-400" : "text-xs text-gray-600"}>
                                                                These gig workers
                                                                have relevant skills
                                                                and could be a good
                                                                fit with some
                                                                training.
                                                            </p>
                                                        </div>

                                                        {goodMatches.map(
                                                            (match, index) => {
                                                                const worker =
                                                                    match.gig_worker ||
                                                                    {};

                                                                return (
                                                                    <div
                                                                        key={`good-${jobId}-${index}`}
                                                                        className={isDark ? "border border-blue-500/30 bg-blue-500/10 rounded-xl p-6" : "border border-blue-200 bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 shadow-md"}
                                                                    >
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex-1 flex gap-4">
                                                                                <img
                                                                                    src={(() => {
                                                                                        const raw = worker.profile_picture;
                                                                                        const resolved = resolveProfileImageUrl(raw) || `https://ui-avatars.com/api/?name=${worker.first_name}+${worker.last_name}&background=random`;
                                                                                        // #region agent log
                                                                                        if (raw && typeof fetch !== 'undefined') fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c62b29'},body:JSON.stringify({sessionId:'c62b29',location:'Recommendations.jsx:profile_img',message:'Profile img URL',data:{raw,resolved:resolved.substring(0,80),noDoubleSlash:!resolved.includes('//')},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
                                                                                        // #endregion
                                                                                        return resolved;
                                                                                    })()}
                                                                                    alt={`${worker.first_name} ${worker.last_name}`}
                                                                                    className="w-16 h-16 rounded-full object-cover shadow-sm bg-white"
                                                                                />
                                                                                <div>
                                                                                    <h4 className={isDark ? "text-lg font-bold text-white hover:text-blue-400 transition-colors" : "text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"}>
                                                                                        <Link href={getProfileUrl(match, worker.id)} className="uppercase">
                                                                                            {worker.first_name} {worker.last_name}
                                                                                        </Link>
                                                                                    </h4>
                                                                                    <div className={isDark ? "text-sm font-medium text-blue-400 mt-0.5" : "text-sm font-medium text-blue-600 mt-0.5"}>
                                                                                        {worker.professional_title || "Gig Worker"}
                                                                                    </div>
                                                                                    <div className={isDark ? "text-xs text-gray-400 mt-1 flex flex-col gap-1" : "text-xs text-gray-600 mt-1 flex flex-col gap-1"}>
                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                            <span className="flex items-center gap-1">
                                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                                                                {worker.email}
                                                                                            </span>
                                                                                            {worker.email_verified_at && (
                                                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800" title="Email Verified">
                                                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                                                    Email
                                                                                                </span>
                                                                                            )}
                                                                                            {worker.id_verification_status === "verified" && (
                                                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800" title="Valid ID Verified">
                                                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                                                                    ID
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {(worker.city || worker.country) && (
                                                                                            <div className="flex items-center gap-1 mt-0.5 text-gray-500">
                                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                                                {[worker.city, worker.country].filter(Boolean).join(", ")}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="text-right">
                                                                                <div className={isDark ? "text-2xl font-bold text-blue-400" : "text-2xl font-bold text-blue-600"}>
                                                                                    {
                                                                                        match.score
                                                                                    }
                                                                                    %
                                                                                </div>

                                                                                <div className={isDark ? "text-sm text-gray-500" : "text-sm text-gray-500"}>
                                                                                    Match
                                                                                    Score
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className={isDark ? "bg-blue-500/20 rounded-xl p-4 mt-3 border border-blue-500/30" : "bg-blue-100 rounded-xl p-4 mt-3 shadow-sm"}>
                                                                            <p className={isDark ? "text-sm text-gray-200" : "text-sm text-gray-700"}>
                                                                                {
                                                                                    match.reason
                                                                                }
                                                                            </p>
                                                                        </div>

                                                                        <div className="mt-4 flex justify-end">
                                                                            <Link
                                                                                href={getProfileUrl(match, worker.id)}
                                                                                className={isDark ? "inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-500 border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-600/20 transition-all duration-300" : "inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border border-transparent rounded-xl font-semibold text-sm text-white uppercase tracking-widest shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"}
                                                                            >
                                                                                View Profile →
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </>
                                                )}

                                                {basicMatches.length > 0 && (
                                                    <>
                                                        <div className="mb-4">
                                                            <h4 className={isDark ? "text-sm font-medium text-amber-400 mb-2" : "text-sm font-medium text-yellow-700 mb-2"}>
                                                                💡 Potential
                                                                Matches (
                                                                {
                                                                    basicMatches.length
                                                                }
                                                                )
                                                            </h4>

                                                            <p className={isDark ? "text-xs text-gray-400" : "text-xs text-gray-600"}>
                                                                These gig workers
                                                                show some relevant
                                                                background and could
                                                                develop into strong
                                                                candidates.
                                                            </p>
                                                        </div>

                                                        {basicMatches.map(
                                                            (match, index) => {
                                                                const worker =
                                                                    match.gig_worker ||
                                                                    {};

                                                                return (
                                                                    <div
                                                                        key={`basic-${jobId}-${index}`}
                                                                        className={isDark ? "border border-amber-500/30 bg-amber-500/10 rounded-xl p-6" : "border border-yellow-200 bg-gradient-to-br from-yellow-50 to-white rounded-xl p-6 shadow-md"}
                                                                    >
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex-1 flex gap-4">
                                                                                <img
                                                                                    src={(() => {
                                                                                        const raw = worker.profile_picture;
                                                                                        const resolved = resolveProfileImageUrl(raw) || `https://ui-avatars.com/api/?name=${worker.first_name}+${worker.last_name}&background=random`;
                                                                                        // #region agent log
                                                                                        if (raw && typeof fetch !== 'undefined') fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c62b29'},body:JSON.stringify({sessionId:'c62b29',location:'Recommendations.jsx:profile_img',message:'Profile img URL',data:{raw,resolved:resolved.substring(0,80),noDoubleSlash:!resolved.includes('//')},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
                                                                                        // #endregion
                                                                                        return resolved;
                                                                                    })()}
                                                                                    alt={`${worker.first_name} ${worker.last_name}`}
                                                                                    className="w-16 h-16 rounded-full object-cover shadow-sm bg-white"
                                                                                />
                                                                                <div>
                                                                                    <h4 className={isDark ? "text-lg font-bold text-white hover:text-blue-400 transition-colors" : "text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"}>
                                                                                        <Link href={getProfileUrl(match, worker.id)} className="uppercase">
                                                                                            {worker.first_name} {worker.last_name}
                                                                                        </Link>
                                                                                    </h4>
                                                                                    <div className={isDark ? "text-sm font-medium text-blue-400 mt-0.5" : "text-sm font-medium text-blue-600 mt-0.5"}>
                                                                                        {worker.professional_title || "Gig Worker"}
                                                                                    </div>
                                                                                    <div className={isDark ? "text-xs text-gray-400 mt-1 flex flex-col gap-1" : "text-xs text-gray-600 mt-1 flex flex-col gap-1"}>
                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                            <span className="flex items-center gap-1">
                                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                                                                {worker.email}
                                                                                            </span>
                                                                                            {worker.email_verified_at && (
                                                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800" title="Email Verified">
                                                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                                                    Email
                                                                                                </span>
                                                                                            )}
                                                                                            {worker.id_verification_status === "verified" && (
                                                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800" title="Valid ID Verified">
                                                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                                                                    ID
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {(worker.city || worker.country) && (
                                                                                            <div className={isDark ? "flex items-center gap-1 mt-0.5 text-gray-500" : "flex items-center gap-1 mt-0.5 text-gray-500"}>
                                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                                                {[worker.city, worker.country].filter(Boolean).join(", ")}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="text-right">
                                                                                <div className={isDark ? "text-2xl font-bold text-amber-400" : "text-2xl font-bold text-yellow-600"}>
                                                                                    {
                                                                                        match.score
                                                                                    }
                                                                                    %
                                                                                </div>

                                                                                <div className={isDark ? "text-sm text-gray-500" : "text-sm text-gray-500"}>
                                                                                    Match
                                                                                    Score
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className={isDark ? "bg-amber-500/20 rounded-xl p-4 mt-3 border border-amber-500/30" : "bg-yellow-100 rounded-xl p-4 mt-3 shadow-sm"}>
                                                                            <p className={isDark ? "text-sm text-gray-200" : "text-sm text-gray-700"}>
                                                                                {
                                                                                    match.reason
                                                                                }
                                                                            </p>
                                                                        </div>

                                                                        <div className="mt-4 flex justify-end">
                                                                            <Link
                                                                                href={getProfileUrl(match, worker.id)}
                                                                                className={isDark ? "inline-flex items-center px-6 py-3 bg-amber-600 hover:bg-amber-500 border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-amber-600/20 transition-all duration-300" : "inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 border border-transparent rounded-xl font-semibold text-sm text-white uppercase tracking-widest shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"}
                                                                            >
                                                                                View Profile →
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pagination for Employer Recommendations */}
                {shouldShowEmployerPagination && (
                    <Pagination
                        currentPage={employerPage}
                        totalPages={employerTotalPages}
                        onPageChange={goToEmployerPage}
                        itemsPerPage={employerItemsPerPage}
                        totalItems={employerTotalItems}
                        variant={isDark ? "dark" : "light"}
                    />
                )}
            </>
        );
    };

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? "dark" : undefined}
            header={
                <h2 className={`font-semibold text-xl leading-tight ${isDark ? "text-white tracking-tight" : "text-gray-800"}`}>
                    {pageTitle}
                </h2>
            }
        >
            <Head title={pageTitle} />

            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                rel="stylesheet"
            />

            <div className={`relative py-12 overflow-hidden ${isDark ? "min-h-screen bg-gray-900 font-sans" : "bg-white"}`} style={isDark ? { fontFamily: "Inter, system-ui, sans-serif" } : undefined}>
                {isDark ? (
                    <div className="fixed inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
                        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
                    </div>
                ) : (
                    <>
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div
                            className="absolute bottom-0 right-0 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl animate-pulse"
                            style={{ animationDelay: "2s" }}
                        ></div>
                    </>
                )}

                <div className="relative z-20 max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className={isDark
                        ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl mb-8 border border-gray-700"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 overflow-hidden shadow-xl sm:rounded-xl mb-8 border border-blue-500"
                    }>
                        <div className={isDark ? "p-8 text-white" : "p-8 text-white"}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-3xl">🤖</span>

                                <h3 className="text-xl font-bold">
                                    {effectiveBannerTitle}
                                </h3>

                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className={isDark
                                        ? "ml-auto flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-all border border-gray-700"
                                        : "ml-auto flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold transition-all"
                                    }
                                    style={isRefreshing ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                >
                                    <span className={isRefreshing ? "animate-spin" : ""}>
                                        {isRefreshing ? "⏳" : "🔄"}
                                    </span>
                                    {isRefreshing ? "Refreshing..." : "Refresh Matches"}
                                </button>
                            </div>

                            <p className={isDark ? "text-gray-200" : "text-blue-100"}>
                                {effectiveBannerDescription}
                            </p>

                            <div className={`mt-4 flex items-center gap-4 text-sm ${isDark ? "text-gray-400" : "text-blue-100"}`}>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                    80-100%: Excellent Match
                                </span>

                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                    60-79%: Good Match
                                </span>

                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                                    40-59%: Fair Match
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={isAimatchPage ? "" : "grid gap-6 lg:grid-cols-[320px_1fr]"}>
                        {!isAimatchPage && (
                            <aside className={isDark
                                ? "bg-gray-800 backdrop-blur-sm border border-gray-700 rounded-xl p-6 lg:sticky lg:top-24 h-max"
                                : "bg-white/90 backdrop-blur-md border-2 border-blue-200 rounded-xl shadow-2xl p-6 lg:sticky lg:top-24 h-max ring-1 ring-blue-100"
                            }>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                                        Filter Recommendations
                                    </h3>

                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className={isDark ? "text-sm font-medium text-blue-400 hover:text-blue-300" : "text-sm font-medium text-blue-600 hover:text-blue-700"}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                                            Experience Level
                                        </label>

                                        <select
                                            value={filters.experience}
                                            onChange={(event) =>
                                                setFilters((current) => ({
                                                    ...current,

                                                    experience: event.target.value,
                                                }))
                                            }
                                            className={isDark
                                                ? "w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                : "w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            }
                                        >
                                            {experienceOptions.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                    {...(isDark && { style: { backgroundColor: "#111827", color: "#e5e7eb" } })}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                                            Budget Range{" "}
                                            {isGigWorker
                                                ? "(Job)"
                                                : "(Hourly Rate)"}
                                        </label>

                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Min"
                                                value={filters.budgetMin}
                                                onChange={handleBudgetChange(
                                                    "budgetMin",
                                                )}
                                                className={isDark
                                                    ? "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    : "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                }
                                            />

                                            <span className={isDark ? "text-sm text-gray-500" : "text-sm text-gray-500"}>
                                                -
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Max"
                                                value={filters.budgetMax}
                                                onChange={handleBudgetChange(
                                                    "budgetMax",
                                                )}
                                                className={isDark
                                                    ? "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    : "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                }
                                            />
                                        </div>

                                        <p className={`mt-2 text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                            Set either value to narrow the
                                            recommendations by{" "}
                                            {isGigWorker
                                                ? "job budget"
                                                : "candidate rate"}
                                            .
                                        </p>
                                    </div>

                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className={`block text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                                                Required Skills
                                            </label>
                                            {availableSkills.length > 0 && (
                                                <span className={isDark ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30" : "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"}>
                                                    {availableSkills.length} available
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsSkillDropdownOpen(
                                                    (open) => !open,
                                                )
                                            }
                                            className={isDark
                                                ? "flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-100 shadow-sm hover:border-blue-500/50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                                : "flex w-full items-center justify-between rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-blue-400 hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                            }
                                        >
                                            <span>
                                                {filters.skills.length
                                                    ? `${filters.skills.length} skill${filters.skills.length > 1 ? "s" : ""} selected`
                                                    : "Select skills"}
                                            </span>

                                            <span className={isDark ? "text-xs text-gray-500" : "text-xs text-gray-500"}>
                                                {isSkillDropdownOpen ? "▲" : "▼"}
                                            </span>
                                        </button>

                                        {isSkillDropdownOpen && (
                                            <div className={isDark
                                                ? "absolute left-0 right-0 z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 p-3 shadow-xl"
                                                : "absolute left-0 right-0 z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border-2 border-blue-200 bg-white p-3 shadow-2xl ring-1 ring-blue-100"
                                            }>
                                                {availableSkills.length > 0 ? (
                                                    <>
                                                        <div className={isDark ? "mb-2 pb-2 border-b border-gray-700" : "mb-2 pb-2 border-b border-gray-200"}>
                                                            <p className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                                                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                                Skills from AI recommendations
                                                            </p>
                                                        </div>
                                                        {availableSkills.map((skill) => {
                                                            const isSelected =
                                                                filters.skills.some(
                                                                    (selectedSkill) =>
                                                                        selectedSkill.toLowerCase() ===
                                                                        skill.toLowerCase(),
                                                                );

                                                            return (
                                                                <label
                                                                    key={skill}
                                                                    className={isDark
                                                                        ? "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-100 hover:bg-gray-800 cursor-pointer transition-colors duration-150"
                                                                        : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                                                                    }
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                        checked={
                                                                            isSelected
                                                                        }
                                                                        onChange={() =>
                                                                            toggleSkillSelection(
                                                                                skill,
                                                                            )
                                                                        }
                                                                    />
                                                                    <span className="flex-1">{skill}</span>
                                                                    {isSelected && (
                                                                        <svg className={`w-4 h-4 ${isDark ? "text-blue-400" : "text-blue-600"}`} fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                        </svg>
                                                                    )}
                                                                </label>
                                                            );
                                                        })}
                                                    </>
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <svg className={`mx-auto h-8 w-8 ${isDark ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                        </svg>
                                                        <p className={`mt-2 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                                            No skills available yet
                                                        </p>
                                                        <p className={`mt-1 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                                            Skills will appear from AI recommendations
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <p className={`mt-2 text-xs flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            Filter AI matches by required skills
                                        </p>

                                        {filters.skills.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {filters.skills.map((skill) => (
                                                    <span
                                                        key={skill}
                                                        className={isDark
                                                            ? "inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-xs font-medium text-blue-300"
                                                            : "inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                                                        }
                                                    >
                                                        {skill}

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleSkillSelection(
                                                                    skill,
                                                                )
                                                            }
                                                            className={isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-500 hover:text-blue-700"}
                                                        >
                                                            x
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </aside>
                        )}

                        <div className="space-y-6">
                            {hasError ? (
                                <div className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl border border-gray-700" : "bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200"}>
                                    <div className="p-8 text-center">
                                        <div className="text-6xl mb-4">:(</div>

                                        <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                                            Recommendations Temporarily
                                            Unavailable
                                        </h3>

                                        <p className={isDark ? "text-gray-400 mb-4" : "text-gray-600 mb-4"}>
                                            We're experiencing high demand.
                                            Please try again in a few moments.
                                        </p>

                                        <button
                                            onClick={() =>
                                                window.location.reload()
                                            }
                                            className={isDark
                                                ? "inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-500 border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-600/20 transition-all duration-300"
                                                : "inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border border-transparent rounded-xl font-semibold text-sm text-white uppercase tracking-widest shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                            }
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                </div>
                            ) : employerNeedsToChooseJob ? (
                                <div className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl border border-gray-700" : "bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg sm:rounded-xl border border-gray-200"}>
                                    <div className="p-8">
                                        <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                                            Choose a job to see AI matches
                                        </h3>
                                        <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                            Select one of your open jobs below to view AI-matched gig workers or AI recommendations for that job.
                                        </p>
                                        <div className="space-y-3">
                                            {openJobs.map((job) => (
                                                <Link
                                                    key={job.id}
                                                    href={window.location.pathname + "?job_id=" + job.id}
                                                    className={`flex items-center justify-between w-full rounded-xl border p-4 text-left transition-all ${isDark
                                                        ? "border-gray-700 bg-gray-800 hover:border-blue-500/50 hover:bg-gray-700"
                                                        : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                                                        }`}
                                                >
                                                    <span className={isDark ? "font-medium text-white" : "font-medium text-gray-900"}>{job.title}</span>
                                                    <span className={isDark ? "text-sm text-gray-500" : "text-sm text-gray-500"}>
                                                        {job.created_at ? new Date(job.created_at).toLocaleDateString() : ""}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : isGigWorker ? (
                                renderFreelancerRecommendations(
                                    paginatedGigWorkerRecs,

                                    filtersAppliedForFreelancer,
                                )
                            ) : (
                                <>
                                    {singleJobId && (
                                        <div className="mb-4">
                                            <Link
                                                href={window.location.pathname}
                                                className={isDark ? "text-sm font-medium text-blue-400 hover:text-blue-300" : "text-sm font-medium text-blue-600 hover:text-blue-700"}
                                            >
                                                ← Choose a different job
                                            </Link>
                                        </div>
                                    )}
                                    {renderEmployerRecommendations(
                                        Object.fromEntries(paginatedEmployerRecs),

                                        filtersAppliedForEmployer,
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                body {
                    background: ${isDark ? "#111827" : "white"};
                    color: ${isDark ? "#e5e7eb" : "#333"};
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
