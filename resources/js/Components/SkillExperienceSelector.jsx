import React, { useState, useCallback, useEffect, useRef } from 'react';
import useSkillPipeline from '@/Hooks/useSkillPipeline.js';
import FuzzySkillPrompt from '@/Components/FuzzySkillPrompt';

export default function SkillExperienceSelector({
    label = 'Required Skills',
    description = 'Select the skills and experience levels required for this job',
    skills = [],
    onChange = () => { },
    type = 'required',
    maxSkills = 10,
    showImportance = true,
    defaultExperienceLevel = null,
    showCategoryChips = true,
    variant = 'light',
}) {
    const isDark = variant === 'dark';
    const useJobLevelOnly = defaultExperienceLevel != null && defaultExperienceLevel !== '';
    const effectiveLevel = useJobLevelOnly ? defaultExperienceLevel : null;

    const [input, setInput] = useState('');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [selectedLevel, setSelectedLevel] = useState('intermediate');
    const [selectedImportance, setSelectedImportance] = useState(type === 'nice_to_have' ? 'preferred' : 'required');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categorySkills, setCategorySkills] = useState([]);
    const debounceRef = useRef(null);

    const {
        suggestions, categories, loadSuggestions, loadCategorySkills,
        validateAndAdd, isValidating, validationError, setValidationError,
        fuzzyPrompt, acceptFuzzy, rejectFuzzy, dismissFuzzy,
    } = useSkillPipeline();

    const experienceLevels = ['beginner', 'intermediate', 'expert'];
    const importanceOptions = ['required', 'preferred'];

    // Debounced typeahead search
    useEffect(() => {
        clearTimeout(debounceRef.current);
        if (input.trim().length >= 1) {
            debounceRef.current = setTimeout(() => loadSuggestions(input.trim()), 250);
        }
        return () => clearTimeout(debounceRef.current);
    }, [input, loadSuggestions]);

    // Load category-specific skills when category changes
    useEffect(() => {
        if (selectedCategory) {
            loadCategorySkills(selectedCategory).then(setCategorySkills);
        } else {
            setCategorySkills([]);
        }
    }, [selectedCategory, loadCategorySkills]);

    const filteredSuggestions = input.trim()
        ? (() => {
            return suggestions.filter(s =>
                (typeof s === 'string' ? s : String(s)).toLowerCase().includes(input.toLowerCase()) &&
                !skills.some(sk => sk && typeof sk.skill === 'string' && sk.skill.trim().toLowerCase() === (typeof s === 'string' ? s : String(s)).trim().toLowerCase())
            ).map(s => typeof s === 'string' ? s : String(s)).slice(0, 8);
        })()
        : [];

    const addVerifiedSkill = useCallback((name) => {
        const trimmed = (name || '').trim();
        if (!trimmed || skills.length >= maxSkills) return;
        if (skills.some(s => s && typeof s.skill === 'string' && s.skill.trim().toLowerCase() === trimmed.toLowerCase())) return;

        onChange([...skills, {
            skill: trimmed,
            experience_level: useJobLevelOnly ? effectiveLevel : selectedLevel,
            importance: type === 'nice_to_have' ? 'preferred' : selectedImportance,
        }]);
        setInput('');
        setSelectedSkill(null);
        setSelectedLevel('intermediate');
        setSelectedImportance(type === 'nice_to_have' ? 'preferred' : 'required');
    }, [skills, maxSkills, onChange, useJobLevelOnly, effectiveLevel, selectedLevel, selectedImportance, type]);

    const addSkillWithPipeline = useCallback(async () => {
        const name = (selectedSkill || input).trim();
        if (!name || skills.length >= maxSkills) return;
        if (skills.some(s => s && typeof s.skill === 'string' && s.skill.trim().toLowerCase() === name.toLowerCase())) return;

        // If it's a known verified suggestion, skip the full pipeline
        const isVerified = suggestions.some(s => (typeof s === 'string' ? s : String(s)).toLowerCase() === name.toLowerCase());
        if (isVerified) {
            const canonical = suggestions.find(s => (typeof s === 'string' ? s : String(s)).toLowerCase() === name.toLowerCase()) || name;
            addVerifiedSkill(canonical);
            return;
        }

        const result = await validateAndAdd(name);
        if (result) {
            addVerifiedSkill(result.skill);
        }
    }, [selectedSkill, input, skills, maxSkills, suggestions, addVerifiedSkill, validateAndAdd]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkillWithPipeline();
        }
    }, [addSkillWithPipeline]);

    const removeSkill = useCallback((index) => {
        onChange(skills.filter((_, i) => i !== index));
    }, [skills, onChange]);

    const updateSkillLevel = useCallback((index, newLevel) => {
        const updated = [...skills];
        updated[index] = { ...updated[index], experience_level: newLevel };
        onChange(updated);
    }, [skills, onChange]);

    const updateSkillImportance = useCallback((index, newImportance) => {
        const updated = [...skills];
        updated[index] = { ...updated[index], importance: newImportance };
        onChange(updated);
    }, [skills, onChange]);

    return (
        <div className={isDark ? 'bg-white/5 p-4 rounded-xl border border-white/10' : 'bg-white p-4 rounded-lg border border-gray-300'}>
            <div className="mb-4">
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-white/90' : 'text-gray-700'}`}>{label}</label>
                {description && <p className={`text-sm mb-3 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{description}</p>}
            </div>

            {/* Fuzzy prompt */}
            {fuzzyPrompt && (
                <div className="mb-4">
                    <FuzzySkillPrompt prompt={fuzzyPrompt} onAccept={acceptFuzzy} onReject={rejectFuzzy} onDismiss={dismissFuzzy} variant={variant} />
                </div>
            )}

            {/* Validation error */}
            {validationError && (
                <div className={`mb-4 rounded-lg p-3 flex items-start gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                    <span className={isDark ? 'text-red-400' : 'text-red-500'}>&#9888;</span>
                    <p className={`text-sm flex-1 ${isDark ? 'text-red-300' : 'text-red-700'}`}>{validationError}</p>
                    <button onClick={() => setValidationError(null)} className={isDark ? 'text-red-400 hover:text-red-300 text-xs' : 'text-red-400 hover:text-red-600 text-xs'}>&#10005;</button>
                </div>
            )}

            {/* Category Chips */}
            {showCategoryChips && categories.length > 0 && (
                <div className="mb-4">
                    <label className={`block text-xs font-semibold uppercase mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Filter by Category</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('')}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${!selectedCategory
                                ? 'bg-blue-600 text-white border-blue-600'
                                : isDark ? 'bg-white/5 text-white/70 border-white/10 hover:border-blue-500/50' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                }`}
                        >
                            All
                        </button>
                        {categories.slice(0, 20).map(cat => (
                            <button
                                type="button"
                                key={cat}
                                onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : isDark ? 'bg-white/5 text-white/70 border-white/10 hover:border-blue-500/50' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Top skills for selected category */}
                    {selectedCategory && categorySkills.length > 0 && (
                        <div className="mb-3">
                            <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Top skills in <strong>{selectedCategory}</strong>:</p>
                            <div className="flex flex-wrap gap-2">
                                {categorySkills.map(s => {
                                    const skillStr = typeof s === 'string' ? s : String(s);
                                    const isAdded = skills.some(sk => sk && typeof sk.skill === 'string' && sk.skill.toLowerCase() === skillStr.toLowerCase());
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => !isAdded && addVerifiedSkill(skillStr)}
                                            disabled={isAdded}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${isAdded
                                                ? isDark ? 'bg-green-500/20 text-green-300 border-green-500/30 cursor-default' : 'bg-green-50 text-green-700 border-green-200 cursor-default'
                                                : isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20' : 'bg-indigo-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                                }`}
                                        >
                                            {isAdded ? '✓ ' : '+ '}{skillStr}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Skill Form */}
            <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`grid grid-cols-1 gap-3 ${useJobLevelOnly ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
                    {/* Skill Input */}
                    <div className="md:col-span-1">
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Skill Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => { setInput(e.target.value); setSelectedSkill(e.target.value); }}
                                onKeyPress={handleKeyPress}
                                placeholder="Type or add custom skill..."
                                className={isDark
                                    ? 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50'
                                    : 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                                }
                                disabled={isValidating}
                            />
                            {filteredSuggestions.length > 0 && (
                                <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto ${isDark ? 'bg-[#0A0D12] border border-white/10' : 'bg-white border border-gray-300'}`}>
                                    {filteredSuggestions.map((skill, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => { setSelectedSkill(skill); setInput(skill); addVerifiedSkill(skill); }}
                                            className={`w-full text-left px-3 py-2 text-sm ${isDark ? 'hover:bg-white/10 text-white/90' : 'hover:bg-blue-50 text-gray-700'}`}
                                        >
                                            {skill}
                                        </button>
                                    ))}
                                    {input.trim() && !filteredSuggestions.some(s => (typeof s === 'string' ? s : String(s)).toLowerCase() === input.trim().toLowerCase()) && (
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedSkill(input.trim()); addSkillWithPipeline(); }}
                                            className={`w-full text-left px-3 py-2 text-sm font-medium ${isDark ? 'hover:bg-green-500/20 text-green-300 border-t border-white/10' : 'hover:bg-green-50 text-green-700 border-t border-gray-200'}`}
                                        >
                                            + Add "{input.trim()}" as custom skill
                                        </button>
                                    )}
                                </div>
                            )}
                            {input.trim() && filteredSuggestions.length === 0 && !isValidating && (
                                <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg ${isDark ? 'bg-[#0A0D12] border border-white/10' : 'bg-white border border-gray-300'}`}>
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedSkill(input.trim()); addSkillWithPipeline(); }}
                                        className={`w-full text-left px-3 py-2 text-sm font-medium ${isDark ? 'text-green-300 hover:bg-green-500/20' : 'text-green-700 hover:bg-green-50'}`}
                                    >
                                        + Add "{input.trim()}" as custom skill
                                    </button>
                                </div>
                            )}
                            <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Press Enter to add skill</p>
                        </div>
                    </div>

                    {/* Experience Level */}
                    {!useJobLevelOnly && (
                        <div className="md:col-span-1">
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Experience Level</label>
                            <select
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value)}
                                className={isDark ? 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50' : 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
                            >
                                {experienceLevels.map(level => (
                                    <option key={level} value={level} {...(isDark && { style: { backgroundColor: '#0d1014', color: '#e5e7eb' } })}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Importance */}
                    {showImportance && type !== 'nice_to_have' && (
                        <div className="md:col-span-1">
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Importance</label>
                            <select
                                value={selectedImportance}
                                onChange={(e) => setSelectedImportance(e.target.value)}
                                className={isDark ? 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50' : 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'}
                            >
                                {importanceOptions.map(imp => (
                                    <option key={imp} value={imp} {...(isDark && { style: { backgroundColor: '#0d1014', color: '#e5e7eb' } })}>{imp.charAt(0).toUpperCase() + imp.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Add Button */}
                    <div className="md:col-span-1 flex flex-col">
                        <label className="block text-sm font-medium mb-1 invisible select-none">Add</label>
                        <button
                            type="button"
                            onClick={addSkillWithPipeline}
                            disabled={!selectedSkill || skills.length >= maxSkills || isValidating}
                            className={isDark
                                ? 'w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-white/20 disabled:cursor-not-allowed font-medium shadow-lg shadow-blue-600/20'
                                : 'w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium'
                            }
                        >
                            {isValidating ? 'Checking...' : '+ Add Skill'}
                        </button>
                    </div>
                </div>

                {skills.length >= maxSkills && (
                    <p className={`text-sm mt-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Maximum {maxSkills} skills reached</p>
                )}
            </div>

            {/* Selected Skills */}
            {skills.length > 0 && (
                <div className="space-y-2">
                    <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-white/90' : 'text-gray-700'}`}>Added Skills ({skills.length})</label>
                    <div className="space-y-2">
                        {skills.map((skill, idx) => (
                            <div key={idx} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex-1">
                                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{skill && typeof skill.skill === 'string' ? skill.skill : '(invalid skill)'}</p>
                                    <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                        {(skill.experience_level || effectiveLevel || 'intermediate').charAt(0).toUpperCase() + (skill.experience_level || effectiveLevel || 'intermediate').slice(1)}
                                        {showImportance && ` • ${(skill.importance || 'required').charAt(0).toUpperCase() + (skill.importance || 'required').slice(1)}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!useJobLevelOnly && (
                                        <select
                                            value={skill.experience_level}
                                            onChange={(e) => updateSkillLevel(idx, e.target.value)}
                                            className={isDark ? 'px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500' : 'px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'}
                                        >
                                            {experienceLevels.map(level => (
                                                <option key={level} value={level} {...(isDark && { style: { backgroundColor: '#0d1014', color: '#e5e7eb' } })}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                                            ))}
                                        </select>
                                    )}
                                    {showImportance && type !== 'nice_to_have' && (
                                        <select
                                            value={skill.importance}
                                            onChange={(e) => updateSkillImportance(idx, e.target.value)}
                                            className={isDark ? 'px-2 py-1 text-sm bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500' : 'px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'}
                                        >
                                            {importanceOptions.map(imp => (
                                                <option key={imp} value={imp} {...(isDark && { style: { backgroundColor: '#0d1014', color: '#e5e7eb' } })}>{imp.charAt(0).toUpperCase() + imp.slice(1)}</option>
                                            ))}
                                        </select>
                                    )}
                                    <button type="button" onClick={() => removeSkill(idx)} className={isDark ? 'px-3 py-1 text-red-400 hover:bg-red-500/20 rounded font-medium text-sm' : 'px-3 py-1 text-red-600 hover:bg-red-50 rounded font-medium text-sm'}>&#10005;</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {skills.length === 0 && (
                <div className={`text-center py-6 rounded-lg border border-dashed ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-300'}`}>
                    <p className={isDark ? 'text-white/50' : 'text-gray-500'}>No skills added yet. Add at least one skill above.</p>
                </div>
            )}
        </div>
    );
}
