import type {

    AnimePlayerEvent,
    AnimePlayerOptions,
    AnimePlayerRequest,
    AnimeVideoProvider,

} from "../animeTypes";


/*
 * =================================================
 * FRAMEXTV CONFIGURATION
 * =================================================
 */

const FRAMEXTV_ORIGIN =
    "https://framextv.tech";


/*
 * =================================================
 * HELPERS
 * =================================================
 */

function cleanBaseUrl(
    baseUrl:
        string
):
    string {

    return baseUrl.replace(
        /\/+$/,
        ""
    );
}


function parseIncomingData(
    data:
        unknown
):
    Record<string, unknown> | null {

    if (!data) {
        return null;
    }

    /*
     * JSON string payload.
     */

    if (
        typeof data ===
        "string"
    ) {

        try {

            const parsed =
                JSON.parse(
                    data
                );

            if (
                parsed &&
                typeof parsed ===
                    "object"
            ) {

                return parsed as
                    Record<
                        string,
                        unknown
                    >;
            }

        } catch {

            return null;
        }
    }

    /*
     * Normal object payload.
     */

    if (
        typeof data ===
        "object"
    ) {

        return data as
            Record<
                string,
                unknown
            >;
    }

    return null;
}


function toNumber(
    value:
        unknown
):
    number | null {

    if (
        typeof value ===
        "number" &&
        Number.isFinite(
            value
        )
    ) {

        return value;
    }

    if (
        typeof value ===
        "string" &&
        value.trim() !== ""
    ) {

        const parsed =
            Number(value);

        if (
            Number.isFinite(
                parsed
            )
        ) {

            return parsed;
        }
    }

    return null;
}


/*
 * =================================================
 * FRAMEXTV PROVIDER
 * =================================================
 */

export const aframextvProvider:
    AnimeVideoProvider = {

    id:
        "framextv",

    name:
        "frameXTV",

    /*
     * Slightly below MegaPlay so MegaPlay
     * remains the default.
     */

    priority:
        175,


    /*
     * =================================================
     * SUPPORT CHECK
     * =================================================
     */

    supports(
        request:
            AnimePlayerRequest
    ):
        boolean {

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
            request.season != null &&
            (
                !Number.isInteger(
                    request.season
                ) ||
                request.season <= 0
            )
        ) {

            return false;
        }

        const language =
            request.language ??
            "sub";

        if (
            language !== "sub" &&
            language !== "dub"
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
     * frameXTV anime format:
     *
     * /embed/anime
     * ?id={anilistId}
     * &type=tv
     * &season={season}
     * &episode={episode}
     * &sub_type={sub|dub}
     */

    buildUrl(
        request:
            AnimePlayerRequest,

        options:
            AnimePlayerOptions
    ):
        string | null {

        if (
            !this.supports(
                request
            )
        ) {

            return null;
        }

        const baseUrl =
            cleanBaseUrl(
                options.baseUrl
            );

        const season =
            request.season ??
            1;

        const language =
            request.language ??
            options.language ??
            "sub";

        const params =
            new URLSearchParams();

        params.set(
            "id",
            String(
                request.anilistId
            )
        );

        params.set(
            "type",
            "tv"
        );

        params.set(
            "season",
            String(
                season
            )
        );

        params.set(
            "episode",
            String(
                request.episode
            )
        );

        params.set(
            "sub_type",
            language
        );

        /*
         * frameXTV supports autoplay
         * through the iframe query string.
         */

        params.set(
            "autoplay",
            options.autoplay === false
                ? "0"
                : "1"
        );

        /*
         * Resume support.
         *
         * The frameXTV docs support
         * both "t" and "start".
         *
         * We use "t".
         */

        if (
            request.startAt != null &&
            request.startAt > 0
        ) {

            params.set(
                "t",
                String(
                    Math.floor(
                        request.startAt
                    )
                )
            );
        }

        return (
            `${baseUrl}/embed/anime?` +
            params.toString()
        );
    },


    /*
     * =================================================
     * PLAYER EVENTS
     * =================================================
     *
     * frameXTV documents:
     *
     * frameXTV:timeupdate
     *
     * with:
     *
     * currentTime
     * duration
     */

    parseEvent(
        event:
            MessageEvent
    ):
        AnimePlayerEvent | null {

        if (
            event.origin !==
            FRAMEXTV_ORIGIN
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

        if (
            data.event !==
            "frameXTV:timeupdate"
        ) {

            return null;
        }

        const currentTime =
            toNumber(
                data.currentTime
            );

        const duration =
            toNumber(
                data.duration
            );

        if (
            currentTime == null ||
            duration == null
        ) {

            return null;
        }

        return {

            provider:
                "framextv",

            /*
             * The manager fills these
             * from activeAnimeRequest.
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
    },
};