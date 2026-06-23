
/**
 * Extracts the video ID from various RuTube URL formats.
 * Supported formats:
 * - https://rutube.ru/video/1234567890abcdef1234567890abcdef/
 * - https://rutube.ru/play/embed/1234567890abcdef1234567890abcdef
 * 
 * @param url The RuTube video URL
 * @returns The video ID or null if not found
 */
export const getRutubeId = (url: string): string | null => {
    if (!url) return null;

    try {
        const parsedUrl = new URL(url);
        if (!['rutube.ru', 'www.rutube.ru'].includes(parsedUrl.hostname)) {
            return null;
        }

        const match = parsedUrl.pathname.match(
            /^\/(?:video|play\/embed)\/([a-zA-Z0-9]+)\/?$/,
        );
        return match?.[1] ?? null;
    } catch {
        return null;
    }
};

/**
 * Generates a RuTube embed URL from a video ID.
 * @param videoId The RuTube video ID
 * @returns The embed URL
 */
export const getRutubeEmbedUrl = (videoId: string): string => {
    return `https://rutube.ru/play/embed/${videoId}`;
};
