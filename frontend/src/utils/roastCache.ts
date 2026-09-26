const ROAST_CACHE_KEY = "woughtplus_roast_cache";

/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 *
 * Change these values whenever you want.
 */

/*
 * Maximum number of roasts stored locally.
 *
 * When this limit is reached, the oldest roast
 * is removed before the new one is added.
 */
const MAX_ROAST_CACHE_SIZE = 50;

/*
 * How long a cached roast remains valid.
 *
 * 30 days by default.
 *
 * Example:
 * 7  = 7 days
 * 30 = 30 days
 * 60 = 60 days
 */
const ROAST_CACHE_EXPIRATION_DAYS = 30;

/*
 * Convert the expiration setting into milliseconds.
 */
const ROAST_CACHE_EXPIRATION_MS =
    ROAST_CACHE_EXPIRATION_DAYS *
    24 *
    60 *
    60 *
    1000;


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

/*
 * The three normal content types.
 */
export type RoastContentType =
    | "movie"
    | "tv"
    | "anime";

/*
 * Anime can additionally be identified as a movie
 * or a TV/series format.
 */
export type RoastAnimeFormat =
    | "movie"
    | "tv";

/*
 * One cached roast.
 *
 * IMPORTANT:
 *
 * We intentionally DO NOT store:
 * - title
 * - description
 *
 * The original description always comes from
 * TMDB/AniList.
 */
type RoastCacheEntry = {
    key: string;
    roast: string;
    createdAt: number;
};

type RoastCache = RoastCacheEntry[];


/*
 * ============================================================
 * CACHE KEY
 * ============================================================
 */

/*
 * Create the stable identity of the content.
 *
 * Movies:
 *
 *     movie:272
 *
 * TV:
 *
 *     tv:1399
 *
 * Anime:
 *
 *     anime:tv:21
 *
 * or:
 *
 *     anime:movie:21
 */
function createRoastKey(
    contentId: number,
    contentType: RoastContentType,
    animeFormat?: RoastAnimeFormat | null
): string {
    if (contentType === "anime") {
        return [
            "anime",
            animeFormat || "unknown",
            contentId,
        ].join(":");
    }

    return [
        contentType,
        contentId,
    ].join(":");
}


/*
 * ============================================================
 * READ CACHE
 * ============================================================
 */

/*
 * Read the roast cache from localStorage.
 *
 * If localStorage contains corrupted data,
 * safely return an empty cache instead of breaking
 * the application.
 */
function readRoastCache(): RoastCache {
    try {
        const stored = localStorage.getItem(
            ROAST_CACHE_KEY
        );

        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(
            (entry): entry is RoastCacheEntry =>
                entry &&
                typeof entry.key === "string" &&
                typeof entry.roast === "string" &&
                typeof entry.createdAt === "number"
        );
    } catch (error) {
        console.error(
            "Wought+ roast cache could not be read:",
            error
        );

        return [];
    }
}


/*
 * ============================================================
 * WRITE CACHE
 * ============================================================
 */

/*
 * Save the entire roast cache back to localStorage.
 */
function writeRoastCache(
    cache: RoastCache
): void {
    try {
        localStorage.setItem(
            ROAST_CACHE_KEY,
            JSON.stringify(cache)
        );
    } catch (error) {
        console.error(
            "Wought+ roast cache could not be saved:",
            error
        );
    }
}


/*
 * ============================================================
 * REMOVE EXPIRED ENTRIES
 * ============================================================
 */

/*
 * Remove roasts that are older than the configured
 * expiration period.
 *
 * This runs whenever we read the cache.
 *
 * That means expired roasts won't sit around
 * forever doing absolutely nothing.
 */
function removeExpiredRoasts(
    cache: RoastCache
): RoastCache {
    const now = Date.now();

    return cache.filter(
        (entry) =>
            now - entry.createdAt <
            ROAST_CACHE_EXPIRATION_MS
    );
}


/*
 * ============================================================
 * GET CACHED ROAST
 * ============================================================
 */

/*
 * Get a roast from localStorage.
 *
 * Returns:
 *
 *     string
 *
 * when a valid cached roast exists.
 *
 * Returns:
 *
 *     null
 *
 * when no valid roast exists.
 */
export function getCachedRoast(
    contentId: number,
    contentType: RoastContentType,
    animeFormat?: RoastAnimeFormat | null
): string | null {
    if (!Number.isFinite(contentId)) {
        return null;
    }

    const key = createRoastKey(
        contentId,
        contentType,
        animeFormat
    );

    let cache = readRoastCache();

    /*
     * Remove expired entries before searching.
     */
    const cleanedCache =
        removeExpiredRoasts(cache);

    /*
     * If expired entries were removed,
     * update localStorage.
     */
    if (
        cleanedCache.length !==
        cache.length
    ) {
        writeRoastCache(cleanedCache);
    }

    cache = cleanedCache;

    const entry = cache.find(
        (item) => item.key === key
    );

    if (!entry) {
        return null;
    }

    return entry.roast;
}


/*
 * ============================================================
 * SAVE ROAST
 * ============================================================
 */

/*
 * Save a newly generated roast.
 *
 * Only the following information is stored:
 *
 *     key
 *     roast
 *     createdAt
 *
 * NO title.
 *
 * NO description.
 */
export function saveRoast(
    contentId: number,
    roast: string,
    contentType: RoastContentType,
    animeFormat?: RoastAnimeFormat | null
): void {
    if (
        !Number.isFinite(contentId) ||
        !roast?.trim()
    ) {
        return;
    }

    const key = createRoastKey(
        contentId,
        contentType,
        animeFormat
    );

    /*
     * Read the existing cache.
     */
    let cache = readRoastCache();

    /*
     * Remove expired roasts first.
     */
    cache = removeExpiredRoasts(cache);

    /*
     * Remove an existing roast for the same title.
     *
     * This prevents duplicates.
     */
    cache = cache.filter(
        (entry) => entry.key !== key
    );

    /*
     * Add the new roast.
     */
    cache.push({
        key,
        roast: roast.trim(),
        createdAt: Date.now(),
    });

    /*
     * Sort oldest -> newest.
     */
    cache.sort(
        (a, b) =>
            a.createdAt - b.createdAt
    );

    /*
     * If we exceeded the maximum cache size,
     * remove the oldest entries.
     */
    if (
        cache.length >
        MAX_ROAST_CACHE_SIZE
    ) {
        cache = cache.slice(
            cache.length -
                MAX_ROAST_CACHE_SIZE
        );
    }

    /*
     * Save the final cache.
     */
    writeRoastCache(cache);
}


/*
 * ============================================================
 * CACHE SIZE
 * ============================================================
 */

/*
 * Returns the number of currently valid
 * cached roasts.
 */
export function getRoastCacheSize(): number {
    const cache = readRoastCache();

    const cleanedCache =
        removeExpiredRoasts(cache);

    if (
        cleanedCache.length !==
        cache.length
    ) {
        writeRoastCache(cleanedCache);
    }

    return cleanedCache.length;
}


/*
 * ============================================================
 * CLEAR CACHE
 * ============================================================
 */

/*
 * Development/testing helper.
 *
 * IMPORTANT:
 *
 * This ONLY removes:
 *
 *     woughtplus_roast_cache
 *
 * It does NOT touch:
 *
 *     token
 *     favorites
 *     watch progress
 *     history
 *     opening state
 *     or anything else.
 */
export function clearRoastCache(): void {
    try {
        localStorage.removeItem(
            ROAST_CACHE_KEY
        );
    } catch (error) {
        console.error(
            "Wought+ roast cache could not be cleared:",
            error
        );
    }
}