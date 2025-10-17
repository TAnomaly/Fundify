import { getMediaBaseUrl } from '@/lib/api';

/**
 * Get the full URL for a media file
 * - If the URL is already a full URL (starts with http/https), return as is
 * - If it's a relative path, prepend the media base URL
 */
export const getFullMediaUrl = (url: string | undefined | null): string | undefined => {
    if (!url) return undefined;

    // If already a full URL (Cloudinary or other CDN), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // For relative paths, prepend the base URL
    const baseUrl = getMediaBaseUrl();
    return `${baseUrl}${url}`;
};
