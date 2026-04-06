import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const OTHER_VALUE = '__other__';

function defaultCsrfHeaders() {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-TOKEN': token,
        'X-Requested-With': 'XMLHttpRequest',
    };
}

/**
 * Taxonomy project category dropdown with "Others" + AI validation (Groq-backed API).
 */
export default function ProjectCategorySelect({
    categories,
    value,
    onChange,
    suggestedCategory = '',
    isDark = false,
    titleForContext = '',
    descriptionForContext = '',
    error,
    label = 'Project Category (Optional)',
    onOtherModeChange,
    id = 'project_category',
}) {
    const sorted = useMemo(() => (Array.isArray(categories) ? [...categories].sort() : []), [categories]);
    const categorySet = useMemo(() => new Set(sorted), [sorted]);

    const valueInList = value && categorySet.has(value);
    // Selecting "Others" clears parent value to ''; without explicit mode the select would show "" and hide the textbox (H1).
    const [isOtherMode, setIsOtherMode] = useState(() =>
        Boolean(value && !categorySet.has(value))
    );

    const selectValue = isOtherMode ? OTHER_VALUE : !value ? '' : valueInList ? value : OTHER_VALUE;

    const [otherText, setOtherText] = useState(() => (!value || valueInList ? '' : value));
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ tone: null, message: '', suggestions: [] });
    const abortRef = useRef(null);
    const lastRunRef = useRef(0);

    useEffect(() => {
        if (value && !categorySet.has(value)) {
            setOtherText(value);
            setIsOtherMode(true);
        }
        if (value && categorySet.has(value)) {
            setOtherText('');
            setIsOtherMode(false);
            setFeedback({ tone: null, message: '', suggestions: [] });
        }
    }, [value, categorySet]);

    const runValidate = useCallback(
        async (text) => {
            const trimmed = (text || '').trim();
            if (!trimmed) {
                setFeedback({ tone: null, message: '', suggestions: [] });
                return;
            }
            if (abortRef.current) abortRef.current.abort();
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            const runId = ++lastRunRef.current;
            setLoading(true);
            try {
                const res = await fetch('/api/recommendations/project-category', {
                    method: 'POST',
                    headers: defaultCsrfHeaders(),
                    body: JSON.stringify({
                        custom_label: trimmed,
                        title: titleForContext || null,
                        description: descriptionForContext || null,
                    }),
                    signal: ctrl.signal,
                });
                if (runId !== lastRunRef.current) return;
                if (!res.ok) {
                    setFeedback({
                        tone: 'error',
                        message: 'Could not verify category. Try again.',
                        suggestions: [],
                    });
                    return;
                }
                const json = await res.json();
                if (json.valid && json.canonical_category) {
                    setIsOtherMode(false);
                    onChange(json.canonical_category);
                    onOtherModeChange?.(false);
                    setFeedback({
                        tone: 'success',
                        message: json.message || 'Category accepted.',
                        suggestions: [],
                    });
                    return;
                }
                setFeedback({
                    tone: 'warn',
                    message: json.message || 'Pick a suggestion or refine your description.',
                    suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
                });
            } catch (e) {
                if (e.name === 'AbortError') return;
                setFeedback({
                    tone: 'error',
                    message: 'Could not verify category. Try again.',
                    suggestions: [],
                });
            } finally {
                if (runId === lastRunRef.current) setLoading(false);
            }
        },
        [onChange, onOtherModeChange, titleForContext, descriptionForContext]
    );

    const handleVerify = useCallback(() => {
        const trimmed = otherText.trim();
        if (trimmed.length < 2) {
            setFeedback({
                tone: 'warn',
                message: 'Enter at least 2 characters, then verify.',
                suggestions: [],
            });
            return;
        }
        runValidate(otherText);
    }, [otherText, runValidate]);

    // #region agent log
    useEffect(() => {
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bac085' },
            body: JSON.stringify({
                sessionId: 'bac085',
                hypothesisId: 'H1',
                location: 'ProjectCategorySelect.jsx:derived',
                message: 'selectValue and other panel',
                data: {
                    isOtherMode,
                    selectValue,
                    showTextbox: selectValue === OTHER_VALUE,
                    valueLen: value ? String(value).length : 0,
                },
                timestamp: Date.now(),
                runId: 'post-fix',
            }),
        }).catch(() => {});
    }, [isOtherMode, selectValue, value]);
    // #endregion

    const selectCls = isDark
        ? 'w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50'
        : 'w-full bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

    const inputCls = isDark
        ? 'w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50'
        : 'w-full bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

    return (
        <div>
            <label htmlFor={id} className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {label}
            </label>
            <select
                id={id}
                value={selectValue}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                        setIsOtherMode(false);
                        onChange('');
                        setOtherText('');
                        setFeedback({ tone: null, message: '', suggestions: [] });
                        onOtherModeChange?.(false);
                        return;
                    }
                    if (v === OTHER_VALUE) {
                        setIsOtherMode(true);
                        onChange('');
                        setOtherText('');
                        setFeedback({ tone: null, message: '', suggestions: [] });
                        onOtherModeChange?.(true);
                        return;
                    }
                    setIsOtherMode(false);
                    onChange(v);
                    setOtherText('');
                    setFeedback({ tone: null, message: '', suggestions: [] });
                    onOtherModeChange?.(false);
                }}
                className={selectCls}
            >
                <option value="">Select a category</option>
                {sorted.map((category) => (
                    <option
                        key={category}
                        value={category}
                        style={isDark ? { backgroundColor: '#1f2937', color: '#e5e7eb' } : undefined}
                    >
                        {category === suggestedCategory ? `✨ ${category} (Suggested)` : category}
                    </option>
                ))}
                <option value={OTHER_VALUE} style={isDark ? { backgroundColor: '#1f2937', color: '#e5e7eb' } : undefined}>
                    Others (describe your category)
                </option>
            </select>

            {selectValue === OTHER_VALUE && (
                <div className="mt-3 space-y-2">
                    <label htmlFor={`${id}_other`} className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Describe your project category
                    </label>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Type your category, then press Enter or Verify. If it does not match the taxonomy, suggestions use your job title and description.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                        <input
                            id={`${id}_other`}
                            type="text"
                            value={otherText}
                            onChange={(e) => {
                                setOtherText(e.target.value);
                                setFeedback({ tone: null, message: '', suggestions: [] });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleVerify();
                                }
                            }}
                            placeholder="e.g., drone mapping for agriculture"
                            className={`${inputCls} flex-1 min-w-0`}
                        />
                        <button
                            type="button"
                            onClick={handleVerify}
                            disabled={loading}
                            className={
                                isDark
                                    ? 'shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                                    : 'shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                            }
                        >
                            {loading ? 'Verifying…' : 'Verify'}
                        </button>
                    </div>
                    {loading && (
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Checking with AI…</p>
                    )}
                    {feedback.tone === 'success' && feedback.message && (
                        <p className="text-sm text-green-500">{feedback.message}</p>
                    )}
                    {feedback.tone === 'warn' && feedback.message && (
                        <p className="text-sm text-amber-500">{feedback.message}</p>
                    )}
                    {feedback.tone === 'error' && feedback.message && (
                        <p className="text-sm text-red-400">{feedback.message}</p>
                    )}
                    {feedback.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            <span className={`text-xs w-full ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Suggestions (from your job title and description):
                            </span>
                            {feedback.suggestions.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                        setIsOtherMode(false);
                                        onChange(s);
                                        onOtherModeChange?.(false);
                                        setFeedback({ tone: 'success', message: `Using “${s}”.`, suggestions: [] });
                                    }}
                                    className={
                                        isDark
                                            ? 'px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30'
                                            : 'px-3 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                                    }
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {suggestedCategory && selectValue !== OTHER_VALUE && (
                <p className="mt-1 text-sm text-blue-400 flex items-center">
                    <span className="mr-1">💡</span>
                    Suggested category based on your job details
                </p>
            )}
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
    );
}
