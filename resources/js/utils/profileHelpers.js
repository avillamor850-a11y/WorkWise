/**
 * Profile Helper Utilities
 *
 * Utilities for handling profile photo URLs and location display
 */

import { resolveProfileImageUrl } from '@/utils/avatarUrl.js';

/**
 * Get the correct URL for a profile photo
 * Delegates to resolveProfileImageUrl (handles http(s), /supabase/, /storage/, relative paths).
 *
 * @param {string|null} profilePhoto - The profile photo path or URL
 * @returns {string|null} - The correct URL to use, or null if no photo
 */
export const getProfilePhotoUrl = (profilePhoto) => resolveProfileImageUrl(profilePhoto);

/**
 * Get the location display string for a user
 * Returns only the barangay without appending "Lapu-Lapu City"
 * 
 * @param {Object|null} user - The user object with location data
 * @returns {string|null} - The barangay name, or null if no location data
 */
export const getLocationDisplay = (user) => {
    if (!user) {
        return null;
    }
    
    // Only show barangay if it exists, don't append "Lapu-Lapu City"
    if (user.barangay) {
        return user.barangay;
    }
    
    // Return null if no location data
    return null;
};
