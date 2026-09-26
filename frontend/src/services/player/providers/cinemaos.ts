import type {
    PlayerEvent,
    PlayerOptions,
    PlayerRequest,
    VideoProvider,
} from "../types";


const CINEMAOS_ORIGIN =
    "https://cinemaos.tech";


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
     * =================================================
     * AUTOPLAY
     * =================================================
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
     * =================================================
     * TV AUTO-NEXT
     * =================================================
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
     * =================================================
     * RESUME POSITION
     * =================================================
     */

    if (
        typeof request.startAt === "number" &&
        Number.isFinite(
            request.startAt
        ) &&
        request.startAt > 0
    ) {
        params.set(
            "startTime",
            Math.floor(
                request.startAt
            ).toString()
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
     * CinemaOS may send
     * postMessage data as JSON.
     */

    if (
        typeof data === "string"
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
        typeof data === "object"
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


        case "timeupdate":
            return "timeupdate";


        /*
         * playerstatus is a status response,
         * not a playback state we need to
         * persist separately.
         */

        case "playerstatus":
            return "timeupdate";


        default:
            return null;
    }
}


export const cinemaosProvider:
    VideoProvider = {

    /*
     * =================================================
     * PROVIDER INFO
     * =================================================
     */

    id: "cinemaos",

    name: "CinemaOS",

    priority: 200,


    /*
     * =================================================
     * SUPPORT CHECK
     * =================================================
     */

    supports(
        request: PlayerRequest
    ): boolean {

        if (
            request.mediaType !== "movie" &&
            request.mediaType !== "tv"
        ) {
            return false;
        }


        if (
            request.tmdbId == null &&
            request.imdbId == null
        ) {
            return false;
        }


        /*
         * CinemaOS uses TMDB IDs.
         *
         * IMDb fallback is intentionally
         * not supported because its documented
         * endpoint only accepts TMDB IDs.
         */

        if (
            request.tmdbId == null
        ) {
            return false;
        }


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
     * =================================================
     * BUILD PLAYER URL
     * =================================================
     */

    buildUrl(
        request: PlayerRequest,
        options: PlayerOptions
    ): string | null {

        const baseUrl =
            cleanBaseUrl(
                options.baseUrl
            );


        if (
            request.tmdbId == null
        ) {
            return null;
        }


        const id =
            String(
                request.tmdbId
            );


        const query =
            buildQuery(
                request,
                options
            );


        /*
         * =================================================
         * MOVIE
         * =================================================
         *
         * /player/{tmdb_id}
         */

        if (
            request.mediaType === "movie"
        ) {
            return (
                `${baseUrl}/player/` +
                `${id}${query}`
            );
        }


        /*
         * =================================================
         * TV EPISODE
         * =================================================
         *
         * /player/{tmdb_id}/{season}/{episode}
         */

        if (
            request.season != null &&
            request.episode != null
        ) {
            return (
                `${baseUrl}/player/` +
                `${id}/` +
                `${request.season}/` +
                `${request.episode}` +
                `${query}`
            );
        }


        /*
         * CinemaOS requires a specific
         * season + episode for TV playback.
         */

        return null;
    },


    /*
     * =================================================
     * PLAYER EVENTS
     * =================================================
     */

    parseEvent(
        event: MessageEvent
    ): PlayerEvent | null {

        /*
         * SECURITY:
         *
         * Only accept messages originating
         * from CinemaOS.
         */

        if (
            event.origin !==
            CINEMAOS_ORIGIN
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
         * Ignore MEDIA_DATA.
         *
         * Wought+ remains the source
         * of truth for progress.
         */

        if (
            data.type ===
            "MEDIA_DATA"
        ) {
            return null;
        }


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


        const mediaType =
            payload.mediaType === "tv"
                ? "tv"
                : "movie";


        return {
            provider:
                "cinemaos",

            mediaType,

            tmdbId:
                payload.tmdbId != null
                    ? Number(
                        payload.tmdbId
                    )
                    : null,

            imdbId:
                null,

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
