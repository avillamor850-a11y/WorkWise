import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import taxonomy from '../../../../full_freelance_services_taxonomy.json';
import SkillExperienceSelector from '@/Components/SkillExperienceSelector';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';
import ErrorModal from '@/Components/ErrorModal';

export default function JobCreate() {
    // AI-suggested skills state
    const [suggestedSkills, setSuggestedSkills] = useState([]);
    const [skillSuggestLoading, setSkillSuggestLoading] = useState(false);
    const [fraudModalClosed, setFraudModalClosed] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    // Emerging skills and innovative roles
    const [emergingSkills, setEmergingSkills] = useState([]);
    const [innovativeRoles, setInnovativeRoles] = useState([]);
    // Suggested category state
    const [suggestedCategory, setSuggestedCategory] = useState('');

    // Flatten taxonomy into skills and category index (memoized for performance)
    const { skills: ALL_SKILLS, categories: CATEGORY_INDEX } = useMemo(() => {
        const skillsSet = new Set();
        const categories = [];
        (taxonomy.services || []).forEach(service => {
            (service.categories || []).forEach(cat => {
                categories.push({ name: cat.name, skills: cat.skills || [] });
                (cat.skills || []).forEach(s => skillsSet.add(s));
            });
        });
        return { skills: Array.from(skillsSet), categories };
    }, []);

    // Common synonym mappings to improve matching quality
    const SYNONYMS = useMemo(() => ({
        'react js': 'react',
        'react.js': 'react',
        'js': 'javascript',
        'node': 'node.js',
        'adobe premiere': 'adobe premiere pro',
        'davinci': 'davinci resolve',
        'ux': 'ui/ux',
        'ui': 'ui/ux',
        'ml': 'machine learning',
        'ai': 'machine learning',
        'ppc': 'ppc',
        'google ads': 'google ads',
        'facebook ads': 'facebook ads',
        'unity3d': 'unity',
        'c sharp': 'c#',
        'c plus plus': 'c++',
        'web dev': 'web development',
        'frontend': 'web development',
        'backend': 'web development',
        'laravel php': 'laravel'
    }), []);

    // Additional category/title synonyms to map common job titles to taxonomy categories
    const CATEGORY_SYNONYMS = useMemo(() => ({
        // Design
        'graphic designer': 'Graphic Design',
        'graphics designer': 'Graphic Design',
        'graphics design': 'Graphic Design',
        'logo designer': 'Logo Design & Branding',
        'branding expert': 'Logo Design & Branding',
        'brand designer': 'Logo Design & Branding',
        'ui designer': 'UI/UX Design',
        'ux designer': 'UI/UX Design',
        'ui/ux designer': 'UI/UX Design',
        'web designer': 'Web Design',
        'illustrator artist': 'Illustration',
        '2d animator': 'Animation',
        '3d animator': 'Animation',
        'motion designer': 'Animation',
        'video editor': 'Video Editing',
        '3d modeler': '3D Modeling',
        // Programming & Tech
        'frontend developer': 'Web Development',
        'front end developer': 'Web Development',
        'backend developer': 'Web Development',
        'back end developer': 'Web Development',
        'fullstack developer': 'Web Development',
        'full stack developer': 'Web Development',
        'react developer': 'Web Development',
        'vue developer': 'Web Development',
        'nextjs developer': 'Web Development',
        'wordpress developer': 'Web Development',
        'php developer': 'Web Development',
        'laravel developer': 'Web Development',
        'mobile developer': 'Mobile App Development',
        'react native developer': 'Mobile App Development',
        'flutter developer': 'Mobile App Development',
        'unity developer': 'Game Development',
        'unreal developer': 'Game Development',
        'software developer': 'Software Development',
        'api developer': 'API Integration & Automation',
        'integration engineer': 'API Integration & Automation',
        'database administrator': 'Database Management',
        'cybersecurity analyst': 'Cybersecurity',
        'ml engineer': 'Machine Learning',
        'ai engineer': 'AI & Machine Learning',
        'blockchain developer': 'Blockchain Development',
        // Marketing
        'seo specialist': 'SEO',
        'social media manager': 'Social Media Marketing',
        'content marketer': 'Content Marketing',
        'email marketer': 'Email Marketing',
        'affiliate marketer': 'Affiliate Marketing',
        'media buyer': 'Paid Advertising',
        'marketing analyst': 'Marketing Analytics',
        // Writing & Translation
        'content writer': 'Article & Blog Writing',
        'blog writer': 'Article & Blog Writing',
        'copywriter': 'Copywriting',
        'technical writer': 'Technical Writing',
        'ghostwriter': 'Ghostwriting',
        'proofreader': 'Proofreading & Editing',
        'translator': 'Translation',
        'transcriber': 'Transcription',
        // Music & Audio
        'voice over artist': 'Voice Over',
        'podcast editor': 'Podcast Editing',
        'sound designer': 'Sound Design',
        'songwriter': 'Songwriting',
        // Photo & Video
        'photographer': 'Photography',
        'photo editor': 'Photo Retouching',
        'videographer': 'Videography',
        'drone operator': 'Drone Videography',
        // Business & Consulting
        'business plan writer': 'Business Plan Writing',
        'startup consultant': 'Startup Consulting',
        'virtual assistant': 'Virtual Assistant',
        'project manager': 'Project Management',
        'accountant': 'Accounting & Bookkeeping',
        'legal consultant': 'Legal Consulting',
        // Data & Analytics
        'data entry specialist': 'Data Entry',
        'data visualization specialist': 'Data Visualization',
        'data analyst': 'Data Analysis',
        'data scientist': 'Machine Learning',
        'web scraper': 'Web Scraping',
        // E-Commerce & Product
        'shopify developer': 'E-commerce Development',
        'woocommerce developer': 'E-commerce Development',
        'magento developer': 'E-commerce Development',
        'product researcher': 'Product Research',
        'dropshipping specialist': 'Dropshipping',
        'amazon fba specialist': 'Amazon FBA',
        'store setup specialist': 'Store Setup',
        // Engineering & Architecture
        'cad designer': 'CAD Design',
        'mechanical engineer': 'Mechanical Engineering',
        'electrical engineer': 'Electrical Engineering',
        'civil engineer': 'Civil Engineering'
    }), []);

    // Get service categories from taxonomy for project_category
    const PROJECT_CATEGORIES = useMemo(() => {
        const categories = new Set();
        (taxonomy.services || []).forEach(service => {
            (service.categories || []).forEach(cat => {
                categories.add(cat.name);
            });
        });
        return Array.from(categories).sort();
    }, []);

    const normalize = (str) => (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9+.# ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const tokenize = (str) => normalize(str).split(' ');

    // Simple morphological root reducer to better match roles to categories (e.g., designer -> design)
    const rootify = (word) => {
        let w = word || '';
        if (w.length <= 3) return w;
        const rules = [
            { end: 'ers', cut: 3 },
            { end: 'er', cut: 2 },
            { end: 'ors', cut: 3 },
            { end: 'or', cut: 2 },
            { end: 'ing', cut: 3 },
            { end: 'ments', cut: 5 },
            { end: 'ment', cut: 4 },
            { end: 'ions', cut: 4 },
            { end: 'ion', cut: 3 },
            { end: 'ists', cut: 4 },
            { end: 'ist', cut: 3 },
            { end: 'als', cut: 3 },
            { end: 'al', cut: 2 },
            { end: 's', cut: 1 },
        ];
        for (const r of rules) {
            if (w.endsWith(r.end) && w.length > r.cut) {
                w = w.slice(0, -r.cut);
                break;
            }
        }
        return w;
    };

    const matchCategoriesFromText = (text) => {
        const textNorm = normalize(text || '');
        const tokens = tokenize(text || '');
        const tokensRoot = tokens.map(rootify);
        const matched = new Set();

        // Direct category name inclusion or token overlap
        CATEGORY_INDEX.forEach(cat => {
            const catNorm = normalize(cat.name);
            const catTokens = catNorm.split(' ');
            const catTokensRoot = catTokens.map(rootify);
            if (textNorm.includes(catNorm)) {
                matched.add(cat.name);
                return;
            }
            const overlap = catTokensRoot.filter(t => tokensRoot.includes(t)).length;
            const threshold = Math.min(2, catTokensRoot.length);
            if (overlap >= threshold) matched.add(cat.name);
        });

        // Category synonyms mapping (job titles -> categories)
        Object.entries(CATEGORY_SYNONYMS).forEach(([alias, catName]) => {
            if (textNorm.includes(normalize(alias))) matched.add(catName);
        });

        return Array.from(matched);
    };

    const scoreSkillMatch = (textNorm, tokens, skill) => {
        const sNorm = normalize(skill);
        let score = 0;
        if (textNorm.includes(sNorm)) score += 3; // exact phrase match
        const sTokens = sNorm.split(' ');
        const tokenHits = sTokens.filter(t => tokens.includes(t)).length;
        if (tokenHits >= Math.min(2, sTokens.length)) score += 2; // token overlap
        // synonym mapping
        Object.entries(SYNONYMS).forEach(([key, val]) => {
            const k = normalize(key);
            const v = normalize(val);
            if (textNorm.includes(k) && (v === sNorm || sNorm.includes(v))) {
                score += 2;
            }
        });
        return score;
    };

    const suggestSkills = (text, exclude = []) => {
        const textNorm = normalize(text || '');
        const tokens = tokenize(text || '');
        const excludeSet = new Set(exclude.map(normalize));
        const scored = [];
        // Enhanced category-based suggestions via direct names, token overlap, and synonyms
        const matchedCategories = matchCategoriesFromText(text);
        matchedCategories.forEach(catName => {
            const cat = CATEGORY_INDEX.find(c => normalize(c.name) === normalize(catName) || c.name === catName);
            if (!cat) return;
            (cat.skills || []).forEach(s => {
                if (!excludeSet.has(normalize(s))) {
                    // High score to ensure category skills rank at the top
                    scored.push({ skill: s, score: 5 });
                }
            });
        });
        // direct skill matching
        ALL_SKILLS.forEach(s => {
            if (excludeSet.has(normalize(s))) return;
            const score = scoreSkillMatch(textNorm, tokens, s);
            if (score > 0) scored.push({ skill: s, score });
        });
        // aggregate by highest score per skill
        const bySkill = new Map();
        scored.forEach(({ skill, score }) => {
            const prev = bySkill.get(skill) || 0;
            if (score > prev) bySkill.set(skill, score);
        });
        // sort and return top suggestions
        return Array.from(bySkill.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([skill]) => skill)
            .slice(0, 12);
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        description: '',
        project_category: '',
        skills_requirements: [],
        budget_type: 'fixed',
        budget_min: '',
        budget_max: '',
        experience_level: 'intermediate',
        estimated_duration_days: '',
        location: '',
        is_remote: false,
    });

    // Show fraud alert in modal; reset closed state when fraud_alert is cleared
    useEffect(() => {
        if (!errors.fraud_alert) setFraudModalClosed(false);
    }, [errors.fraud_alert]);

    const getCsrfHeaders = () => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': token,
            'X-Requested-With': 'XMLHttpRequest',
        };
    };

    // Debounced suggestion update when title/description change
    useEffect(() => {
        const t = setTimeout(() => {
            const text = `${data.title ?? ''} ${data.description ?? ''}`;
            const existingSkills = (Array.isArray(data.skills_requirements) ? data.skills_requirements : [])
                .filter(s => s != null && typeof s.skill === 'string')
                .map(s => s.skill);
            const suggestions = suggestSkills(text, existingSkills);
            setSuggestedSkills(suggestions);
            setSkillSuggestLoading(false);
        }, 300);
        setSkillSuggestLoading(true);
        return () => {
            clearTimeout(t);
        };
    }, [data.title, data.description, data.skills_requirements]);

    // Debounced category detection when title/description change
    useEffect(() => {
        const timer = setTimeout(() => {
            const text = `${data.title ?? ''} ${data.description ?? ''}`;
            const matchedCategories = matchCategoriesFromText(text);
            
            if (matchedCategories.length > 0) {
                setSuggestedCategory(matchedCategories[0]);
                // Auto-select if category is empty
                if (!data.project_category) {
                    setData('project_category', matchedCategories[0]);
                }
            } else {
                setSuggestedCategory('');
            }
        }, 300); // Debounce 300ms
        
        return () => clearTimeout(timer);
    }, [data.title, data.description]);

    // Server-backed recommendations: taxonomy, emerging skills, innovative roles
    useEffect(() => {
        const ctrl = new AbortController();
        const run = async () => {
            const existingSkills = (Array.isArray(data.skills_requirements) ? data.skills_requirements : [])
                .filter(s => s != null && typeof s.skill === 'string')
                .map(s => s.skill);
            const payload = {
                title: data.title,
                description: data.description,
                exclude: existingSkills,
            };
            try {
                const res = await fetch('/api/recommendations/skills', {
                    method: 'POST',
                    headers: getCsrfHeaders(),
                    body: JSON.stringify(payload),
                    signal: ctrl.signal,
                });
                if (!res.ok) return;
                const json = await res.json();
                // Merge: prefer server taxonomy suggestions when present
                if (Array.isArray(json.taxonomy_skills) && json.taxonomy_skills.length) {
                    setSuggestedSkills(json.taxonomy_skills);
                }
                setEmergingSkills(Array.isArray(json.emerging_skills) ? json.emerging_skills : []);
                setInnovativeRoles(Array.isArray(json.innovative_roles) ? json.innovative_roles : []);
            } catch (err) {
                // silently ignore network errors
            }
        };
        // Only call when there's some text
        if ((data.title && data.title.length > 0) || (data.description && data.description.length > 0)) {
            run();
        }
        return () => ctrl.abort();
    }, [data.title, data.description, data.skills_requirements]);

    const addSkillFromSuggestion = async (skill) => {
        // Case-insensitive, trimmed duplicate check
        const normalizedSkill = skill?.trim().toLowerCase();
        if (skill && !data.skills_requirements.some(s => s && typeof s.skill === 'string' && s.skill.trim().toLowerCase() === normalizedSkill)) {
            const newSkill = {
                skill: skill.trim(),
                experience_level: data.experience_level,
                importance: 'required'
            };
            setData('skills_requirements', [...data.skills_requirements, newSkill]);
            // log acceptance for learning
            try {
                await fetch('/api/recommendations/skills/accept', {
                    method: 'POST',
                    headers: getCsrfHeaders(),
                    body: JSON.stringify({ type: 'skill', value: skill, context: { source: 'taxonomy' } }),
                });
            } catch {}
        }
    };

    const addEmergingSkill = async (skill) => {
        // Case-insensitive, trimmed duplicate check
        const normalizedSkill = skill?.trim().toLowerCase();
        if (skill && !data.skills_requirements.some(s => s && typeof s.skill === 'string' && s.skill.trim().toLowerCase() === normalizedSkill)) {
            const newSkill = {
                skill: skill.trim(),
                experience_level: data.experience_level,
                importance: 'required'
            };
            setData('skills_requirements', [...data.skills_requirements, newSkill]);
            try {
                await fetch('/api/recommendations/skills/accept', {
                    method: 'POST',
                    headers: getCsrfHeaders(),
                    body: JSON.stringify({ type: 'skill', value: skill, context: { source: 'emerging' } }),
                });
            } catch {}
        }
    };

    const applyInnovativeRole = async (role) => {
        const nextTitle = data.title && data.title.length ? `${role} — ${data.title}` : role;
        setData('title', nextTitle);
        try {
            await fetch('/api/recommendations/skills/accept', {
                method: 'POST',
                headers: getCsrfHeaders(),
                body: JSON.stringify({ type: 'role', value: role, context: { page: 'jobs.create' } }),
            });
        } catch {}
    };

    const addAllSuggestedSkills = () => {
        // Case-insensitive, trimmed duplicate filtering
        const existingSkillsNormalized = (Array.isArray(data.skills_requirements) ? data.skills_requirements : [])
            .filter(s => s && typeof s.skill === 'string')
            .map(s => s.skill.trim().toLowerCase());
        const toAdd = suggestedSkills.filter((s) => !existingSkillsNormalized.includes(s.trim().toLowerCase()));
        if (toAdd.length > 0) {
            const newSkills = toAdd.map(skill => ({
                skill: skill.trim(),
                experience_level: data.experience_level,
                importance: 'required'
            }));
            setData('skills_requirements', [...data.skills_requirements, ...newSkills]);
        }
    };

    // Add all emerging skills helper
    const addAllEmergingSkills = () => {
        // Case-insensitive, trimmed duplicate filtering
        const existingSkillsNormalized = (Array.isArray(data.skills_requirements) ? data.skills_requirements : [])
            .filter(s => s && typeof s.skill === 'string')
            .map(s => s.skill.trim().toLowerCase());
        const toAdd = emergingSkills.filter((s) => !existingSkillsNormalized.includes(s.trim().toLowerCase()));
        if (toAdd.length > 0) {
            const newSkills = toAdd.map(skill => ({
                skill: skill.trim(),
                experience_level: data.experience_level,
                importance: 'required'
            }));
            setData('skills_requirements', [...data.skills_requirements, ...newSkills]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Comprehensive client-side validation
        const validationErrors = [];
        
        // Validate skills_requirements has at least one skill
        if (data.skills_requirements.length === 0) {
            validationErrors.push('Please add at least one required skill using the Skills Requirements section.');
        }
        
        // Validate description is at least 100 characters
        if (data.description.trim().length < 100) {
            validationErrors.push(`Job description must be at least 100 characters. Current length: ${data.description.trim().length} characters.`);
        }
        
        // Validate budget_max >= budget_min
        const budgetMin = parseFloat(data.budget_min);
        const budgetMax = parseFloat(data.budget_max);
        
        if (isNaN(budgetMin) || budgetMin < 0) {
            validationErrors.push('Please enter a valid minimum budget.');
        }
        
        if (isNaN(budgetMax) || budgetMax < 0) {
            validationErrors.push('Please enter a valid maximum budget.');
        }
        
        if (!isNaN(budgetMin) && !isNaN(budgetMax) && budgetMax < budgetMin) {
            validationErrors.push('Maximum budget must be greater than or equal to minimum budget.');
        }
        
        // Display validation errors if any
        if (validationErrors.length > 0) {
            alert('Please fix the following errors:\n\n' + validationErrors.map((err, idx) => `${idx + 1}. ${err}`).join('\n'));
            return;
        }
        
        // Submit form with error handling
        post(route('jobs.store'), {
            onError: (errors) => {
                console.error('Validation errors:', errors);
                // Scroll to top to show error messages
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            onSuccess: () => {
                console.log('Job posted successfully');
            }
        });
    };

    const barangays = [
        'Agus', 'Babag', 'Bankal', 'Baring', 'Basak', 'Buaya', 'Calawisan', 'Canjulao',
        'Caw-oy', 'Gun-ob', 'Ibo', 'Looc', 'Mactan', 'Maribago', 'Marigondon', 'Pajac',
        'Pajo', 'Poblacion', 'Punta Engaño', 'Pusok', 'Sabang', 'Santa Rosa', 'Subabasbas',
        'Talima', 'Tingo', 'Tingub', 'Tugbongan'
    ];

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : undefined}
            header={
                <div>
                    <h2 className={`font-semibold text-xl leading-tight tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        Post a New Job
                    </h2>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Find the perfect gig worker for your project
                    </p>
                </div>
            }
        >
            <Head title="Post a Job" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

            <ErrorModal
                isOpen={!!errors.fraud_alert && !fraudModalClosed}
                onClose={() => setFraudModalClosed(true)}
                title="Activity flagged for review"
                message={errors.fraud_alert ? (Array.isArray(errors.fraud_alert) ? errors.fraud_alert[0] : errors.fraud_alert) : ''}
                duration={0}
            />

            <div className={`relative min-h-screen py-12 overflow-hidden font-sans ${isDark ? 'bg-gray-900' : 'bg-white'}`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {isDark && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
                </div>
                )}
                {!isDark && (
                <>
                    <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                </>
                )}

                <div className="relative z-20 max-w-4xl mx-auto sm:px-6 lg:px-8">
                    {/* Progress Steps */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="flex items-center">
                                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-600/25">
                                    1
                                </div>
                                <span className={`ml-3 text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Job Details</span>
                            </div>
                            <div className={`w-16 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                            <div className="flex items-center">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border ${isDark ? 'bg-gray-700 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    2
                                </div>
                                <span className={`ml-3 text-sm font-semibold ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Review & Post</span>
                            </div>
                        </div>
                    </div>

                    <div className={isDark ? "bg-gray-800 backdrop-blur-sm overflow-hidden rounded-xl border border-gray-700" : "bg-white backdrop-blur-sm overflow-hidden rounded-xl border border-gray-200 shadow-lg"}>
                        <div className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Error Summary */}
                                {(() => {
                                    const formErrors = Object.entries(errors).filter(([key]) => key !== 'fraud_alert');
                                    return formErrors.length > 0 ? (
                                    <div className="bg-red-500/10 border-l-4 border-red-500/50 p-4 rounded-lg border border-red-500/20">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-200">
                                                    There {formErrors.length === 1 ? 'is' : 'are'} {formErrors.length} error{formErrors.length === 1 ? '' : 's'} with your submission
                                                </h3>
                                                <div className="mt-2 text-sm text-red-300/90">
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {formErrors.map(([field, message]) => (
                                                            <li key={field}>
                                                                <span className="font-medium capitalize">{field.replace(/_/g, ' ')}:</span> {Array.isArray(message) ? message[0] : message}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    ) : null;
                                })()}
                                
                                {/* Job Title */}
                                <div>
                                    <label htmlFor="title" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Job Title *
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className={isDark ? "w-full bg-gray-800 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 shadow-sm" : "w-full bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"}
                                        placeholder="e.g., Build a React.js E-commerce Website"
                                        required
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Write a clear, descriptive title that explains what you need done
                                    </p>
                                    {errors.title && <p className="mt-2 text-sm text-red-400">{errors.title}</p>}
                                </div>

                                {/* Job Description */}
                                <div>
                                    <label htmlFor="description" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Job Description *
                                    </label>
                                    <textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={6}
                                        className={isDark ? "w-full bg-gray-800 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 shadow-sm" : "w-full bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"}
                                        placeholder="Describe your project in detail. Include specific requirements, deliverables, and any important information gig workers should know..."
                                        required
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Minimum 100 characters. Be specific about what you need.
                                    </p>
                                    {errors.description && <p className="mt-2 text-sm text-red-400">{errors.description}</p>}
                                </div>

                                {/* AI-Suggested Skills */}
                                <div>
                                    {(skillSuggestLoading || suggestedSkills.length > 0) && (
                                        <div className="mt-4">
                                            <div className="flex items-center mb-2">
                                                <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>AI-Suggested Skills</span>
                                                {skillSuggestLoading && (
                                                    <span className="ml-2 text-xs text-blue-400 flex items-center">
                                                        <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400 mr-1"></span>
                                                        Analyzing...
                                                    </span>
                                                )}
                                                {!skillSuggestLoading && suggestedSkills.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={addAllSuggestedSkills}
                                                        disabled={suggestedSkills.every((s) => data.skills_requirements.some(sr => sr.skill === s))}
                                                        className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border transition ${suggestedSkills.every((s) => data.skills_requirements.some(sr => sr.skill === s)) ? (isDark ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed') : 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20'}`}
                                                        aria-disabled={suggestedSkills.every((s) => data.skills_requirements.some(sr => sr.skill === s))}
                                                        title="Add all suggested skills"
                                                    >
                                                        Add all
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {suggestedSkills.map((s) => {
                                                    const isAdded = data.skills_requirements.some(sr => sr.skill === s);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={s}
                                                            onClick={() => !isAdded && addSkillFromSuggestion(s)}
                                                            disabled={isAdded}
                                                            className={`group inline-flex items-center px-3 py-1 rounded-xl text-sm font-medium border transition ${isAdded ? 'bg-green-500/20 text-green-300 border-green-500/30 cursor-default' : isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40' : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'}`}
                                                            aria-disabled={isAdded}
                                                            title={isAdded ? 'Already added' : 'Add skill'}
                                                        >
                                                            <span className={`mr-2 ${isAdded ? 'text-green-400' : 'text-blue-400 group-hover:text-blue-300'}`}>{isAdded ? '✓' : '+'}</span>
                                                            {s}
                                                        </button>
                                                    );
                                                })}
                                                {!skillSuggestLoading && suggestedSkills.length === 0 && (
                                                    <span className="text-xs text-gray-500">No suggestions yet. Try adding more details to your title or description.</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Emerging Skills */}
                                {emergingSkills.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex items-center mb-2">
                                            <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Emerging Skills</span>
                                            <button
                                                type="button"
                                                onClick={addAllEmergingSkills}
                                                disabled={emergingSkills.every((s) => data.skills_requirements.some(sr => sr.skill === s))}
                                                className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border transition ${emergingSkills.every((s) => data.skills_requirements.some(sr => sr.skill === s)) ? (isDark ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed') : 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20'}`}
                                                aria-disabled={emergingSkills.every((s) => data.skills_requirements.some(sr => sr.skill === s))}
                                                title="Add all emerging skills"
                                            >
                                                Add all
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {emergingSkills.map((s) => {
                                                const isAdded = data.skills_requirements.some(sr => sr.skill === s);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={s}
                                                        onClick={() => !isAdded && addEmergingSkill(s)}
                                                        disabled={isAdded}
                                                        className={`group inline-flex items-center px-3 py-1 rounded-xl text-sm font-medium border transition ${isAdded ? 'bg-green-500/20 text-green-300 border-green-500/30 cursor-default' : isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40' : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'}`}
                                                        aria-disabled={isAdded}
                                                        title={isAdded ? 'Already added' : 'Add emerging skill'}
                                                    >
                                                        <span className={`mr-2 ${isAdded ? 'text-green-400' : 'text-blue-400 group-hover:text-blue-300'}`}>{isAdded ? '✓' : '+'}</span>
                                                        {s}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Innovative Roles */}
                                {innovativeRoles.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex items-center mb-2">
                                            <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Innovative Roles</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {innovativeRoles.map((r) => (
                                                <button
                                                    type="button"
                                                    key={r}
                                                    onClick={() => applyInnovativeRole(r)}
                                                    className="group inline-flex items-center px-3 py-1 rounded-xl text-sm font-medium border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition"
                                                    title="Apply role to title"
                                                >
                                                    <span className="mr-2 text-amber-400 group-hover:text-amber-300">↪</span>
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Budget */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-200 mb-4">
                                        Budget *
                                    </label>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="budget_type"
                                                    value="fixed"
                                                    checked={data.budget_type === 'fixed'}
                                                    onChange={(e) => setData('budget_type', e.target.value)}
                                                    className="text-blue-500 focus:ring-blue-500"
                                                />
                                                <span className={`ml-2 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Fixed Price</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="budget_type"
                                                    value="hourly"
                                                    checked={data.budget_type === 'hourly'}
                                                    onChange={(e) => setData('budget_type', e.target.value)}
                                                    className="text-blue-500 focus:ring-blue-500"
                                                />
                                                <span className={`ml-2 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Hourly Rate</span>
                                            </label>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {data.budget_type === 'fixed' ? 'Minimum Budget' : 'Minimum Rate/Hour'}
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                                                    <input
                                                        type="number"
                                                        value={data.budget_min}
                                                        onChange={(e) => setData('budget_min', e.target.value)}
                                                        className={isDark ? "w-full pl-8 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50" : "w-full pl-8 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
                                                        placeholder="0"
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {data.budget_type === 'fixed' ? 'Maximum Budget' : 'Maximum Rate/Hour'}
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                                                    <input
                                                        type="number"
                                                        value={data.budget_max}
                                                        onChange={(e) => setData('budget_max', e.target.value)}
                                                        className={isDark ? "w-full pl-8 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50" : "w-full pl-8 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
                                                        placeholder="0"
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {errors.budget_min && <p className="mt-2 text-sm text-red-400">{errors.budget_min}</p>}
                                    {errors.budget_max && <p className="mt-2 text-sm text-red-400">{errors.budget_max}</p>}
                                </div>

                                {/* Experience Level & Duration */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="experience_level" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            Experience Level *
                                        </label>
                                        <select
                                            id="experience_level"
                                            value={data.experience_level}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setData('experience_level', value);
                                                if (data.skills_requirements.length > 0) {
                                                    const valid = data.skills_requirements.filter(s => s != null && typeof s.skill === 'string');
                                                    setData('skills_requirements', valid.map(s => ({ ...s, experience_level: value })));
                                                }
                                            }}
                                            className={isDark ? "w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50" : "w-full bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
                                            required
                                        >
                                            <option value="beginner" style={isDark ? { backgroundColor: '#1f2937', color: '#e5e7eb' } : undefined}>Beginner (0-1 years)</option>
                                            <option value="intermediate" style={isDark ? { backgroundColor: '#1f2937', color: '#e5e7eb' } : undefined}>Intermediate (2-5 years)</option>
                                            <option value="expert" style={isDark ? { backgroundColor: '#1f2937', color: '#e5e7eb' } : undefined}>Expert (5+ years)</option>
                                        </select>
                                        {errors.experience_level && <p className="mt-2 text-sm text-red-400">{errors.experience_level}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="estimated_duration_days" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            Estimated Duration (Days) *
                                        </label>
                                        <input
                                            type="number"
                                            id="estimated_duration_days"
                                            value={data.estimated_duration_days}
                                            onChange={(e) => setData('estimated_duration_days', e.target.value)}
                                            className={isDark ? "w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50" : "w-full bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
                                            placeholder="e.g., 30"
                                            min="1"
                                            required
                                        />
                                        {errors.estimated_duration_days && <p className="mt-2 text-sm text-red-400">{errors.estimated_duration_days}</p>}
                                    </div>
                                </div>

                                {/* Project Category (Optional) */}
                                <div>
                                    <label htmlFor="project_category" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Project Category (Optional)
                                    </label>
                                    <select
                                        id="project_category"
                                        value={data.project_category}
                                        onChange={(e) => setData('project_category', e.target.value)}
                                        className={isDark ? "w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50" : "w-full bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
                                    >
                                        <option value="">Select a category</option>
                                        {PROJECT_CATEGORIES.map((category) => (
                                            <option
                                                key={category}
                                                value={category}
                                                style={isDark ? { backgroundColor: '#1f2937', color: '#e5e7eb' } : undefined}
                                            >
                                                {category === suggestedCategory ? `✨ ${category} (Suggested)` : category}
                                            </option>
                                        ))}
                                    </select>
                                    {suggestedCategory && (
                                        <p className="mt-1 text-sm text-blue-400 flex items-center">
                                            <span className="mr-1">💡</span>
                                            Suggested category based on your job details
                                        </p>
                                    )}
                                    {errors.project_category && <p className="mt-2 text-sm text-red-400">{errors.project_category}</p>}
                                </div>

                                {/* Skills Requirements */}
                                <div>
                                    <SkillExperienceSelector
                                        label="Skills Requirements *"
                                        description="Select the skills and experience levels required for this job"
                                        skills={data.skills_requirements}
                                        onChange={(skills) => setData('skills_requirements', skills)}
                                        type="required"
                                        maxSkills={10}
                                        defaultExperienceLevel={data.experience_level}
                                        variant={isDark ? "dark" : "light"}
                                    />
                                    {errors.skills_requirements && (
                                        <p className="mt-2 text-sm text-red-400">{errors.skills_requirements}</p>
                                    )}
                                    {data.skills_requirements.length === 0 && (
                                        <p className="mt-2 text-sm text-amber-400">
                                            💡 Tip: Use the AI-suggested skills above or add skills manually using the selector
                                        </p>
                                    )}
                                </div>

                                {/* Location & Remote */}
                                <div>
                                    <label className={`block text-sm font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Work Location
                                    </label>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={data.is_remote}
                                                    onChange={(e) => {
                                                        const isRemote = e.target.checked;
                                                        setData('is_remote', isRemote);
                                                        if (isRemote) setData('location', '');
                                                    }}
                                                    className="text-blue-500 focus:ring-blue-500 rounded"
                                                />
                                                <span className={`ml-2 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Remote Work</span>
                                            </label>
                                        </div>
                                        
                                        {!data.is_remote && (
                                            <div className="transition-all duration-200 ease-in-out">
                                                <label htmlFor="location" className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    Location *
                                                </label>
                                                <input
                                                    type="text"
                                                    id="location"
                                                    value={data.location}
                                                    onChange={(e) => setData('location', e.target.value)}
                                                    className={isDark ? "w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50" : "w-full bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
                                                    placeholder="e.g., City, Province"
                                                />
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Specify where the work needs to be performed
                                                </p>
                                            </div>
                                        )}
                                        
                                        {data.is_remote && (
                                            <p className="text-sm text-green-400 flex items-center">
                                                <span className="mr-1">✓</span>
                                                This job can be done from anywhere
                                            </p>
                                        )}
                                    </div>
                                    {errors.location && <p className="mt-2 text-sm text-red-400">{errors.location}</p>}
                                </div>

                                {/* Submit Buttons */}
                                <div className={`flex items-center justify-between pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <Link
                                        href={route('jobs.index')}
                                        className={isDark ? "inline-flex items-center px-4 py-2 border border-gray-700 shadow-sm text-sm font-medium rounded-xl text-gray-200 bg-gray-800 hover:bg-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900" : "inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-white"}
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? (
                                            <div className="flex items-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Posting Job...
                                            </div>
                                        ) : (
                                            'Post Job'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Tips Sidebar
                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Tips for a Great Job Post</h3>
                        <div className="space-y-3 text-sm text-blue-800">
                            <div className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span>Be specific about your requirements and deliverables</span>
                            </div>
                            <div className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span>Set a realistic budget based on project complexity</span>
                            </div>
                            <div className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span>Include examples or references if possible</span>
                            </div>
                            <div className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span>Respond promptly to gig worker questions</span>
                            </div>
                        </div>
                    </div> */}
                </div>
            </div>

            <style>{`
                body {
                    background: #111827;
                    color: #e5e7eb;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
