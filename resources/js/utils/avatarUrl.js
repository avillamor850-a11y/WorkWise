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
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/storage/supabase/')) return u;
    if (u.startsWith('/supabase/')) return '/storage/supabase/' + u.slice(10);
    if (u.startsWith('/storage/')) return u;
    return '/storage/' + u.replace(/^\//, '');
}
