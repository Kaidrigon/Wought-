import type {
    PlayerEvent,
    PlayerOptions,
    PlayerRequest,
    VideoProvider,
} from "../types";

const FRAMEXTV_ORIGIN =
    "https://framextv.tech";

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

    params.set(
        "autoplay",
        options.autoplay === false
            ? "0"
            : "1"
    );

    /*
     * Wought+ already handles resume
     * through startAt, so frameXTV
     * receives the same timestamp.
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

    return params.toString();
}

function toNumber(
    value: unknown
): number | null {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        typeof value === "string" &&
        value.trim() !== ""
    ) {
        const parsed =
            Number(value);

        if (
            Number.isFinite(parsed)
        ) {
            return parsed;
        }
    }

    return null;
}

function parseMessageData(
    event: MessageEvent
): Record<string, unknown> | null {
    const data = event.data;

    if (
        data &&
        typeof data === "object"
    ) {
        return data as Record<
            string,
            unknown
        >;
    }

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

    return null;
}

export const framextvProvider:
    VideoProvider = {

    id:
        "framextv",

    name:
        "frameXTV",

    priority:
        175,

    supports(
        request: PlayerRequest
    ): boolean {

        if (
            request.mediaType !==
                "movie" &&
            request.mediaType !==
                "tv"
        ) {
            return false;
        }

        if (
            !request.tmdbId ||
            request.tmdbId <= 0
        ) {
            return false;
        }

        if (
            request.mediaType ===
            "tv"
        ) {
            return (
                request.season != null &&
                request.season > 0 &&
                request.episode != null &&
                request.episode > 0
            );
        }

        return true;
    },

    buildUrl(
        request: PlayerRequest,
        options: PlayerOptions
    ): string | null {

        if (
            !this.supports(request)
        ) {
            return null;
        }

        const baseUrl =
            cleanBaseUrl(
                options.baseUrl
            );

        let path: string;

        if (
            request.mediaType ===
            "tv"
        ) {
            path =
                `/embed/${request.tmdbId}/${request.season}/${request.episode}`;
        } else {
            path =
                `/embed/${request.tmdbId}`;
        }

        const query =
            buildQuery(
                request,
                options
            );

        return query
            ? `${baseUrl}${path}?${query}`
            : `${baseUrl}${path}`;
    },

    parseEvent(
        event: MessageEvent
    ): PlayerEvent | null {

        if (
            event.origin !==
            FRAMEXTV_ORIGIN
        ) {
            return null;
        }

        const data =
            parseMessageData(
                event
            );

        if (!data) {
            return null;
        }

        const eventName =
            typeof data.event ===
            "string"
                ? data.event
                : "";

        if (
            eventName !==
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

            mediaType:
                "movie",

            status:
                "timeupdate",

            currentTime,

            duration,
        };
    },
};