import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import SkillExperienceSelector from '@/Components/SkillExperienceSelector';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTheme } from '@/Contexts/ThemeContext';

export default function JobEdit({ job }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [skillInput, setSkillInput] = useState('');

    // Helper function to safely parse required_skills
    const parseSkills = (skills) => {
        if (!skills) return [];

        // If it's already an array, return it
        if (Array.isArray(skills)) return skills;

        // If it's a string, try to parse it as JSON
        if (typeof skills === 'string') {
            try {
                const parsed = JSON.parse(skills);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }

        return [];
    };

    // Convert legacy required_skills to structured format if needed
    const getInitialSkillsRequirements = () => {
        // If we have structured skills, use them
        if (job.skills_requirements && job.skills_requirements.length > 0) {
            return job.skills_requirements;
        }
        
        // Otherwise, convert legacy required_skills to structured format
        const legacySkills = parseSkills(job.required_skills);
        if (legacySkills.length > 0) {
            return legacySkills.map(skill => ({
                skill: skill,
                experience_level: job.experience_level || 'intermediate',
                importance: 'required'
            }));
        }
        
        return [];
    };

    const { data, setData, processing, errors } = useForm({
        title: job.title || '',
        description: job.description || '',
        project_category: job.project_category || '',
        required_skills: parseSkills(job.required_skills),
        skills_requirements: getInitialSkillsRequirements(),
        nice_to_have_skills: job.nice_to_have_skills || [],
        budget_type: job.budget_type || 'fixed',
        budget_min: job.budget_min || '',
        budget_max: job.budget_max || '',
        experience_level: job.experience_level || 'intermediate',
        job_complexity: job.job_complexity || '',
        estimated_duration_days: job.estimated_duration_days || '',
        deadline: job.deadline ? job.deadline.split('T')[0] : '',
        location: job.location || '',
        is_remote: job.is_remote || false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        console.log('=== FORM SUBMISSION DEBUG ===');
        console.log('Job object:', job);
        console.log('Job ID:', job.id);
        console.log('Target URL:', `/jobs/${job.id}`);
        console.log('Form data:', data);
        console.log('Current URL:', window.location.href);

        // Ensure we're not submitting to edit route
        const targetUrl = `/jobs/${job.id}`;
        if (targetUrl.includes('/edit')) {
            console.error('ERROR: Target URL contains /edit!', targetUrl);
            return;
        }

        // Try using router directly instead of useForm patch
        router.patch(targetUrl, data, {
            preserveScroll: true,
            onStart: () => {
                console.log('Router request started');
            },
            onSuccess: (page) => {
                console.log('Router update successful', page);
                // Success handled by redirect in controller
            },
            onError: (errors) => {
                console.error('Router update errors:', errors);
            },
            onFinish: () => {
                console.log('Router request finished');
            }
        });
    };

    const addSkill = () => {
        if (skillInput.trim() && !data.required_skills.includes(skillInput.trim())) {
            setData('required_skills', [...data.required_skills, skillInput.trim()]);
            setSkillInput('');
        }
    };

    const removeSkill = (skillToRemove) => {
        setData('required_skills', data.required_skills.filter(skill => skill !== skillToRemove));
    };

    const handleSkillKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkill();
        }
    };

    const barangays = [
        'Agus', 'Babag', 'Bankal', 'Baring', 'Basak', 'Buaya', 'Calawisan', 'Canjulao',
        'Caw-oy', 'Gun-ob', 'Ibo', 'Looc', 'Mactan', 'Maribago', 'Marigondon', 'Pajac',
        'Pajo', 'Poblacion', 'Punta Engaño', 'Pusok', 'Sabang', 'Santa Rosa', 'Subabasbas',
        'Talima', 'Tingo', 'Tingub', 'Tugbongan'
    ];

    return (
        <AuthenticatedLayout
            pageTheme={isDark ? 'dark' : 'light'}
            header={
                <div>
                    <h2 className={`font-semibold text-xl leading-tight tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        Edit Job: {job.title}
                    </h2>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Update your job posting details
                    </p>
                </div>
            }
        >
            <Head title={`Edit Job: ${job.title}`} />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />

            <div className={`relative min-h-screen py-12 overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-blue-700/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-20 max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className={`backdrop-blur-sm overflow-hidden border rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
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
                                        className={isDark ? 'w-full border border-gray-600 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50' : 'w-full border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50'}
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
                                        className={isDark ? 'w-full border border-gray-600 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none' : 'w-full border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none'}
                                        placeholder="Describe your project in detail. Include specific requirements, deliverables, and any important information gig workers should know..."
                                        required
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Minimum 100 characters. Be specific about what you need.
                                    </p>
                                    {errors.description && <p className="mt-2 text-sm text-red-400">{errors.description}</p>}
                                </div>

                                {/* Required Skills */}
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Required Skills *
                                    </label>
                                    <div className="flex items-center space-x-2 mb-3">
                                        <input
                                            type="text"
                                            value={skillInput}
                                            onChange={(e) => setSkillInput(e.target.value)}
                                            onKeyDown={handleSkillKeyPress}
                                            className={isDark ? 'flex-1 border border-gray-600 rounded-xl bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50' : 'flex-1 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50'}
                                            placeholder="Type a skill and press Enter"
                                        />
                                        <button
                                            type="button"
                                            onClick={addSkill}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {data.required_skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-medium border ${isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-200'}`}
                                            >
                                                {skill}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSkill(skill)}
                                                    className={isDark ? 'ml-2 text-blue-400 hover:text-blue-300' : 'ml-2 text-blue-600 hover:text-blue-700'}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Add skills that are essential for this job (e.g., React.js, PHP, Graphic Design)
                                    </p>
                                    {errors.required_skills && <p className="mt-2 text-sm text-red-400">{errors.required_skills}</p>}
                                </div>

                                {/* Project Category */}
                                <div>
                                    <label htmlFor="project_category" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Project Category *
                                    </label>
                                    <select
                                        id="project_category"
                                        value={data.project_category}
                                        onChange={(e) => setData('project_category', e.target.value)}
                                        className={isDark ? 'w-full border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50' : 'w-full border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50'}
                                    >
                                        <option value="">Select a category</option>
                                        <option value="Web Development">Web Development</option>
                                        <option value="Mobile App Development">Mobile App Development</option>
                                        <option value="UI/UX Design">UI/UX Design</option>
                                        <option value="Graphic Design">Graphic Design</option>
                                        <option value="Content Writing">Content Writing</option>
                                        <option value="Video Editing">Video Editing</option>
                                        <option value="Data Analysis">Data Analysis</option>
                                        <option value="Virtual Assistant">Virtual Assistant</option>
                                    </select>
                                    {errors.project_category && <p className="mt-2 text-sm text-red-400">{errors.project_category}</p>}
                                </div>

                                {/* Job Complexity */}
                                <div>
                                    <label htmlFor="job_complexity" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Job Complexity *
                                    </label>
                                    <select
                                        id="job_complexity"
                                        value={data.job_complexity}
                                        onChange={(e) => setData('job_complexity', e.target.value)}
                                        className={isDark ? 'w-full border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50' : 'w-full border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50'}
                                    >
                                        <option value="">Select complexity</option>
                                        <option value="simple">Simple (e.g., basic website)</option>
                                        <option value="moderate">Moderate (e.g., medium-sized app)</option>
                                        <option value="complex">Complex (e.g., large-scale enterprise solution)</option>
                                    </select>
                                    {errors.job_complexity && <p className="mt-2 text-sm text-red-400">{errors.job_complexity}</p>}
                                </div>

                                {/* Skills Requirements */}
                                <SkillExperienceSelector
                                    label="Skills Requirements"
                                    description="Select the skills and experience levels required for this job"
                                    skills={data.skills_requirements}
                                    onChange={(skills) => setData('skills_requirements', skills)}
                                    type="required"
                                    maxSkills={10}
                                    variant={isDark ? 'dark' : 'light'}
                                />

                                {/* Nice to Have Skills */}
                                <SkillExperienceSelector
                                    label="Nice to Have Skills"
                                    description="Select optional skills that would be a bonus to have"
                                    skills={data.nice_to_have_skills}
                                    onChange={(skills) => setData('nice_to_have_skills', skills)}
                                    type="nice_to_have"
                                    maxSkills={5}
                                    variant={isDark ? 'dark' : 'light'}
                                />

                                {/* Budget */}
                                <div>
                                    <label className={`block text-sm font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
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
                                                    className="text-blue-500 focus:ring-blue-500/50"
                                                />
                                                <span className={`ml-2 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Fixed Price</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="budget_type"
                                                    value="hourly"
                                                    checked={data.budget_type === 'hourly'}
                                                    onChange={(e) => setData('budget_type', e.target.value)}
                                                    className="text-blue-500 focus:ring-blue-500/50"
                                                />
                                                <span className={`ml-2 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Hourly Rate</span>
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
                                                        className={isDark ? 'w-full pl-8 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50' : 'w-full pl-8 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50'}
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
                                                        className={isDark ? 'w-full pl-8 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50' : 'w-full pl-8 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50'}
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

                                {/* Estimated Duration */}
                                <div>
                                    <label htmlFor="estimated_duration_days" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Estimated Duration (Days) *
                                    </label>
                                    <input
                                        type="number"
                                        id="estimated_duration_days"
                                        value={data.estimated_duration_days}
                                        onChange={(e) => setData('estimated_duration_days', e.target.value)}
                                        className={isDark ? 'w-full border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50' : 'w-full border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50'}
                                        placeholder="e.g., 30"
                                        min="1"
                                        required
                                    />
                                    {errors.estimated_duration_days && <p className="mt-2 text-sm text-red-400">{errors.estimated_duration_days}</p>}
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
                                                    onChange={(e) => setData('is_remote', e.target.checked)}
                                                    className="text-blue-500 focus:ring-blue-500/50 rounded"
                                                />
                                                <span className={`ml-2 text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Remote Work</span>
                                            </label>
                                        </div>
                                        
                                        <div>
                                            <label htmlFor="location" className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Location (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                id="location"
                                                value={data.location}
                                                onChange={(e) => setData('location', e.target.value)}
                                                className={isDark ? 'w-full border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50' : 'w-full border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50'}
                                                placeholder="e.g., City, Province or leave empty for any location"
                                            />
                                            <p className="mt-1 text-sm text-gray-500">
                                                Specify a location if the work requires on-site presence, or leave empty for flexible location
                                            </p>
                                        </div>
                                    </div>
                                    {errors.location && <p className="mt-2 text-sm text-red-400">{errors.location}</p>}
                                </div>

                                {/* Deadline */}
                                <div>
                                    <label htmlFor="deadline" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                        Project Deadline (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        id="deadline"
                                        value={data.deadline}
                                        onChange={(e) => setData('deadline', e.target.value)}
                                        className={isDark ? 'w-full border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 [color-scheme:dark]' : 'w-full border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50'}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        When do you need this project completed?
                                    </p>
                                    {errors.deadline && <p className="mt-2 text-sm text-red-400">{errors.deadline}</p>}
                                </div>

                                {/* Submit Buttons */}
                                <div className={`flex items-center justify-between pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <div className="flex space-x-3">
                                        <Link
                                            href={`/jobs/${job.id}`}
                                            className={isDark ? 'inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-xl text-gray-200 bg-gray-700 hover:bg-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50' : 'inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50'}
                                        >
                                            Cancel
                                        </Link>
                                        <Link
                                            href="/jobs"
                                            className={isDark ? 'inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-xl text-gray-200 bg-gray-700 hover:bg-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50' : 'inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50'}
                                        >
                                            Back to Jobs
                                        </Link>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-blue-600 hover:bg-blue-500 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {processing ? (
                                            <div className="flex items-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Updating Job...
                                            </div>
                                        ) : (
                                            'Update Job'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Job Stats */}
                    <div className={`mt-8 border rounded-xl p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Job Statistics</h3>
                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            <div>
                                <div className="font-medium">Total Proposals</div>
                                <div className="text-2xl font-bold text-blue-400">{job.bids_count || 0}</div>
                            </div>
                            <div>
                                <div className="font-medium">Views</div>
                                <div className="text-2xl font-bold text-green-400">{job.views_count || 0}</div>
                            </div>
                            <div>
                                <div className="font-medium">Days Active</div>
                                <div className="text-2xl font-bold text-purple-400">
                                    {Math.ceil((new Date() - new Date(job.created_at)) / (1000 * 60 * 60 * 24))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
