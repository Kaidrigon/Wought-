import type {
    AnimePlayerEvent,
    AnimePlayerOptions,
    AnimePlayerRequest,
    AnimeVideoProvider,
} from "../animeTypes";


/*
 * =================================================
 * MEGAPLAY CONFIGURATION
 * =================================================
 */

const MEGAPLAY_ORIGIN =
    "https://megaplay.buzz";


/*
 * =================================================
 * HELPERS
 * =================================================
 */

function cleanBaseUrl(
    baseUrl: string
): string {
    return baseUrl.replace(
        /\/+$/,
        ""
    );
}


function parseIncomingData(
    data: unknown
): Record<string, unknown> | null {

    if (!data) {
        return null;
    }


    /*
     * Some iframe implementations send
     * postMessage data as a JSON string.
     */

    if (
        typeof data === "string"
    ) {
        try {
            const parsed =
                JSON.parse(data);

            if (
                parsed &&
                typeof parsed === "object"
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


    /*
     * Normal postMessage object.
     */

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


function mapPlayerEvent(
    eventName: unknown
): AnimePlayerEvent["status"] | null {

    switch (eventName) {

        case "play":
        case "playing":
            return "playing";

        case "pause":
        case "paused":
            return "paused";

        case "seeked":
            return "seeked";

        case "complete":
        case "completed":
        case "ended":
            return "completed";

        case "time":
        case "watching-log":
            return "timeupdate";

        case "error":
            return "error";

        default:
            return null;
    }
}


/*
 * =================================================
 * MEGAPLAY PROVIDER
 * =================================================
 */

export const megaplayProvider:
    AnimeVideoProvider = {

    id:
        "megaplay",

    name:
        "MegaPlay",

    /*
     * Anime-only provider.
     *
     * This is currently the only anime provider,
     * so it gets the highest priority.
     */

    priority:
        200,


    /*
     * =================================================
     * SUPPORT CHECK
     * =================================================
     */

    supports(
        request: AnimePlayerRequest
    ): boolean {

        if (
            !Number.isInteger(
                request.anilistId
            ) ||
            request.anilistId <= 0
        ) {
            return false;
        }


        if (
            !Number.isInteger(
                request.episode
            ) ||
            request.episode <= 0
        ) {
            return false;
        }


        if (
            request.language != null &&
            request.language !== "sub" &&
            request.language !== "dub"
        ) {
            return false;
        }


        return true;
    },


    /*
     * =================================================
     * BUILD URL
     * =================================================
     *
     * MegaPlay's documented AniList endpoint:
     *
     * /stream/ani/{anilist-id}/{episode}/{language}
     *
     * Example:
     *
     * /stream/ani/16498/1/sub
     */

    buildUrl(
        request: AnimePlayerRequest,
        options: AnimePlayerOptions
    ): string | null {

        if (
            !Number.isInteger(
                request.anilistId
            ) ||
            request.anilistId <= 0
        ) {
            return null;
        }


        if (
            !Number.isInteger(
                request.episode
            ) ||
            request.episode <= 0
        ) {
            return null;
        }


        const language =
            request.language ??
            options.language ??
            "sub";


        if (
            language !== "sub" &&
            language !== "dub"
        ) {
            return null;
        }


        const baseUrl =
            cleanBaseUrl(
                options.baseUrl
            );


        /*
         * MegaPlay currently documents
         * autoplay/resume behavior separately
         * from this URL.
         *
         * We therefore keep the URL limited
         * to the documented route.
         */

        return (
            `${baseUrl}/stream/ani/` +
            `${request.anilistId}/` +
            `${request.episode}/` +
            `${language}`
        );
    },


    /*
     * =================================================
     * PLAYER EVENTS
     * =================================================
     *
     * MegaPlay documents these events:
     *
     * time
     * complete
     * error
     * watching-log
     *
     * The provider also documents that the parent
     * page should validate event.origin.
     */

    parseEvent(
        event: MessageEvent
    ): AnimePlayerEvent | null {

        if (
            event.origin !==
            MEGAPLAY_ORIGIN
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
         * MegaPlay may expose the channel
         * "megacloud".
         *
         * We don't require it because the
         * documented playback events can also
         * arrive without that field.
         */


        /*
         * =================================================
         * WATCHING-LOG
         * =================================================
         */

        if (
            data.type ===
            "watching-log"
        ) {

            const payload =
                data as Record<
                    string,
                    unknown
                >;


            const currentTime =
                Number(
                    payload.currentTime
                );

            const duration =
                Number(
                    payload.duration
                );


            if (
                !Number.isFinite(
                    currentTime
                ) ||
                !Number.isFinite(
                    duration
                )
            ) {
                return null;
            }


            return {
                provider:
                    "megaplay",

                /*
                 * The postMessage event does not
                 * reliably include the AniList ID
                 * or episode.
                 *
                 * The anime player layer will
                 * associate this event with the
                 * currently active request.
                 */

                anilistId:
                    0,

                episode:
                    0,

                status:
                    "timeupdate",

                currentTime,

                duration,
            };
        }


        /*
         * =================================================
         * STANDARD EVENTS
         * =================================================
         */

        const eventName =
            data.event;


        const status =
            mapPlayerEvent(
                eventName
            );


        if (!status) {
            return null;
        }


        const currentTime =
            Number(
                data.time
            );


        const duration =
            Number(
                data.duration
            );


        /*
         * "complete" may not provide a
         * useful duration/time payload.
         *
         * We still emit the event so the
         * player can treat it as completion.
         */

        const safeCurrentTime =
            Number.isFinite(
                currentTime
            )
                ? currentTime
                : 0;

        const safeDuration =
            Number.isFinite(
                duration
            )
                ? duration
                : 0;


        return {
            provider:
                "megaplay",

            /*
             * MegaPlay's documented event
             * payload does not guarantee that
             * AniList ID / episode are included.
             *
             * These are filled by the anime
             * player manager later.
             */

            anilistId:
                0,

            episode:
                0,

            status,

            currentTime:
                safeCurrentTime,

            duration:
                safeDuration,
        };
    },
};