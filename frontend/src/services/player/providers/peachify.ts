import type {
    PlayerEvent,
    PlayerOptions,
    PlayerRequest,
    VideoProvider,
} from "../types";


const PEACHIFY_ORIGIN =
    "https://peachify.top";


function cleanBaseUrl(
    baseUrl: string
): string {

    return baseUrl.replace(
        /\/+$/,
        ""
    );
}


function buildQuery(
    request: PlayerRequest,
    options: PlayerOptions
): string {

    const params =
        new URLSearchParams();


    /*
     * ================================================
     * AUTOPLAY
     * ================================================
     */

    const autoplay =
        request.autoplay ??
        options.autoplay ??
        true;

    params.set(
        "autoPlay",
        autoplay
            ? "true"
            : "false"
    );


    /*
     * ================================================
     * TV AUTO-NEXT
     * ================================================
     */

    const autonext =
        request.autonext ??
        options.autonext ??
        false;

    if (
        request.mediaType === "tv" &&
        autonext
    ) {

        params.set(
            "autoNext",
            "true"
        );

    }


    /*
     * ================================================
     * RESUME POSITION
     * ================================================
     */

    if (
        typeof request.startAt === "number" &&
        Number.isFinite(
            request.startAt
        ) &&
        request.startAt > 0
    ) {

        params.set(
            "startAt",
            Math.floor(
                request.startAt
            ).toString()
        );

    }


    /*
     * ================================================
     * SUBTITLES
     * ================================================
     */

    const subtitleLanguage =
        request.subtitleLanguage ??
        options.subtitleLanguage;

    if (subtitleLanguage) {

        params.set(
            "sub",
            subtitleLanguage
        );

    }


    const query =
        params.toString();


    return query
        ? `?${query}`
        : "";

}


function parseIncomingData(
    data: unknown
): Record<string, unknown> | null {

    if (!data) {
        return null;
    }


    /*
     * Some iframe providers send
     * postMessage data as a JSON string.
     */

    if (
        typeof data ===
        "string"
    ) {

        try {

            const parsed =
                JSON.parse(data);

            if (
                parsed &&
                typeof parsed ===
                    "object"
            ) {

                return parsed as Record<
                    string,
                    unknown
                >;

            }

        } catch {

            return null;

        }

    }


    if (
        typeof data ===
        "object"
    ) {

        return data as Record<
            string,
            unknown
        >;

    }


    return null;

}


function mapPlayerStatus(
    eventName: unknown
): PlayerEvent["status"] | null {

    switch (eventName) {

        case "play":
        case "playing":
            return "playing";


        case "pause":
        case "paused":
            return "paused";


        case "seeked":
            return "seeked";


        case "ended":
        case "completed":
        case "complete":
            return "completed";


        default:
            return null;

    }

}


export const peachifyProvider:
    VideoProvider = {

    /*
     * ================================================
     * PROVIDER INFO
     * ================================================
     */

    id: "peachify",

    name: "Peachify",

    /*
     * Higher than VidSrc.
     *
     * This makes Peachify the default provider.
     */

    priority: 150,


    /*
     * ================================================
     * SUPPORT CHECK
     * ================================================
     */

    supports(
        request: PlayerRequest
    ): boolean {

        /*
         * Peachify currently handles
         * movies and TV.
         */

        if (
            request.mediaType !== "movie" &&
            request.mediaType !== "tv"
        ) {

            return false;

        }


        /*
         * We need either a TMDB ID
         * or an IMDb ID.
         */

        if (
            !request.tmdbId &&
            !request.imdbId
        ) {

            return false;

        }


        /*
         * Validate TV season/episode
         * when supplied.
         */

        if (
            request.mediaType === "tv"
        ) {

            if (
                request.season != null &&
                (
                    !Number.isInteger(
                        request.season
                    ) ||
                    request.season < 1
                )
            ) {

                return false;

            }


            if (
                request.episode != null &&
                (
                    !Number.isInteger(
                        request.episode
                    ) ||
                    request.episode < 1
                )
            ) {

                return false;

            }

        }


        return true;

    },


    /*
     * ================================================
     * BUILD PLAYER URL
     * ================================================
     */

    buildUrl(
        request: PlayerRequest,
        options: PlayerOptions
    ): string | null {

        const baseUrl =
            cleanBaseUrl(
                options.baseUrl
            );


        /*
         * Prefer TMDB because Wought+
         * already uses TMDB IDs.
         */

        const id =
            request.tmdbId != null
                ? String(
                    request.tmdbId
                )
                : request.imdbId;


        if (!id) {

            return null;

        }


        const query =
            buildQuery(
                request,
                options
            );


        /*
         * ============================================
         * MOVIE
         * ============================================
         *
         * /embed/movie/{id}
         */

        if (
            request.mediaType ===
            "movie"
        ) {

            return (
                `${baseUrl}/embed/movie/` +
                `${id}${query}`
            );

        }


        /*
         * ============================================
         * TV EPISODE
         * ============================================
         *
         * /embed/tv/{id}/{season}/{episode}
         */

        if (
            request.season != null &&
            request.episode != null
        ) {

            return (
                `${baseUrl}/embed/tv/` +
                `${id}/` +
                `${request.season}/` +
                `${request.episode}` +
                `${query}`
            );

        }


        /*
         * Peachify's documented TV player
         * expects a specific episode.
         *
         * If there isn't one yet, don't build
         * a potentially invalid URL.
         */

        return null;

    },


    /*
     * ================================================
     * PLAYER EVENTS
     * ================================================
     */

    parseEvent(
        event: MessageEvent
    ): PlayerEvent | null {

        /*
         * SECURITY:
         *
         * Only accept messages originating
         * from Peachify.
         */

        if (
            event.origin !==
            PEACHIFY_ORIGIN
        ) {

            return null;

        }


        const data =
            parseIncomingData(
                event.data
            );


        if (!data) {

            return null;

        }


        /*
         * Ignore Peachify MEDIA_DATA.
         *
         * Wought+ remains the source of truth
         * for watch progress.
         */

        if (
            data.type ===
            "MEDIA_DATA"
        ) {

            return null;

        }


        /*
         * We only care about PLAYER_EVENT.
         */

        if (
            data.type !==
            "PLAYER_EVENT"
        ) {

            return null;

        }


        const eventData =
            data.data;


        if (
            !eventData ||
            typeof eventData !==
                "object"
        ) {

            return null;

        }


        const payload =
            eventData as Record<
                string,
                unknown
            >;


        /*
         * Peachify uses:
         *
         * event:
         * "play"
         * "pause"
         * "seeked"
         * "ended"
         */

        const status =
            mapPlayerStatus(
                payload.event
            );


        if (!status) {

            return null;

        }


        const currentTime =
            Number(
                payload.currentTime
            ) || 0;


        const duration =
            Number(
                payload.duration
            ) || 0;


        /*
         * Peachify reports the media type
         * as "movie" or "tv".
         */

        const mediaType =
            payload.mediaType === "tv"
                ? "tv"
                : "movie";


        return {

            provider:
                "peachify",

            mediaType,

            tmdbId:
                payload.tmdbId != null
                    ? Number(
                        payload.tmdbId
                    )
                    : null,

            imdbId:
                typeof payload.imdbId ===
                "string"
                    ? payload.imdbId
                    : null,

            season:
                payload.season != null
                    ? Number(
                        payload.season
                    )
                    : null,

            episode:
                payload.episode != null
                    ? Number(
                        payload.episode
                    )
                    : null,

            status,

            currentTime,

            duration,

        };

    },

};