/**
 * Resolve profile/avatar image URL for display.
 * Supabase paths may be stored as /supabase/... but the app serves them at /storage/supabase/...
 *
 * @param {string|null|undefined} url - Raw URL or path from backend
 * @returns {string|null} - URL safe for use in img src, or null
 */
export function resolveProfileImageUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const u = url.trim();
    // Local preview URLs (file picker) — must not be prefixed with /storage/
    if (u.startsWith('blob:') || u.startsWith('data:')) {
        // #region agent log
        fetch('http://127.0.0.1:7560/ingest/fe535072-11db-4206-82bf-3a98b77fb18e', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fe5f63' },
            body: JSON.stringify({
                sessionId: 'fe5f63',
                location: 'avatarUrl.js:resolveProfileImageUrl',
                message: 'blob_or_data_passthrough',
                data: { kind: u.startsWith('blob:') ? 'blob' : 'data' },
                timestamp: Date.now(),
                hypothesisId: 'H1',
                runId: 'post-fix',
            }),
        }).catch(() => {});
        // #endregion
        return u;
    }
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/storage/supabase/')) return u;
    if (u.startsWith('/supabase/')) return '/storage/supabase/' + u.slice(10);
    if (u.startsWith('/storage/')) return u;
    return '/storage/' + u.replace(/^\//, '');
}
