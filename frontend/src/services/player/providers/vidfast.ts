import type {
    PlayerEvent,
    PlayerRequest,
    PlayerOptions,
    VideoProvider,
} from "../types";

// These are the documented origins for PLAYER_EVENT messages.
const VIDFAST_ORIGINS = new Set([
    "https://vidfast.pro",
    "https://vidfast.in",
    "https://vidfast.io",
    "https://vidfast.me",
    "https://vidfast.net",
    "https://vidfast.pm",
    "https://vidfast.vc",
    "https://vidfast.bz",
]);

function cleanBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, "");
}

function buildQuery(
    request: PlayerRequest,
    options: PlayerOptions
): string {
    const params = new URLSearchParams();

    const autoplay =
        request.autoplay ??
        options.autoplay ??
        false;

    const autonext =
        request.autonext ??
        options.autonext ??
        false;

    params.set("autoPlay", String(autoplay));
    params.set("title", "true");
    params.set("poster", "true");
    params.set("fullscreenButton", "true");

    if (request.mediaType === "tv" && autonext) {
        params.set("nextButton", "true");
        params.set("autoNext", "true");
    }

    if (
        typeof request.startAt === "number" &&
        Number.isFinite(request.startAt) &&
        request.startAt > 0
    ) {
        params.set(
            "startAt",
            Math.floor(request.startAt).toString()
        );
    }

    const subtitleLanguage =
        request.subtitleLanguage ??
        options.subtitleLanguage;

    if (subtitleLanguage) {
        params.set("sub", subtitleLanguage);
    }

    return `?${params.toString()}`;
}

function parseEventStatus(
    eventName: string
): PlayerEvent["status"] | null {
    switch (eventName) {
        case "play":
            return "playing";

        case "pause":
            return "paused";

        case "seeked":
            return "seeked";

        case "ended":
            return "completed";

        case "timeupdate":
            return "timeupdate";

        default:
            return null;
    }
}

function getFiniteNumber(value: unknown): number | null {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

export const vidfastProvider: VideoProvider = {
    id: "vidfast",
    name: "VidFast",
    priority: 100,

    supports(request: PlayerRequest): boolean {
        if (
            request.mediaType !== "movie" &&
            request.mediaType !== "tv"
        ) {
            return false;
        }

        const hasTmdbId =
            request.tmdbId != null;

        const hasImdbId =
            typeof request.imdbId === "string" &&
            request.imdbId.trim().length > 0;

        if (!hasTmdbId && !hasImdbId) {
            return false;
        }

        if (request.mediaType === "tv") {
            if (
                request.season != null &&
                (
                    !Number.isInteger(request.season) ||
                    request.season < 1
                )
            ) {
                return false;
            }

            if (
                request.episode != null &&
                (
                    !Number.isInteger(request.episode) ||
                    request.episode < 1
                )
            ) {
                return false;
            }
        }

        return true;
    },

    buildUrl(
        request: PlayerRequest,
        options: PlayerOptions
    ): string | null {
        const baseUrl = cleanBaseUrl(options.baseUrl);

        const id =
            request.tmdbId != null
                ? request.tmdbId.toString()
                : request.imdbId?.trim();

        if (!id) {
            return null;
        }

        const query = buildQuery(request, options);

        if (request.mediaType === "movie") {
            return `${baseUrl}/movie/${id}${query}`;
        }

        // VidFast's TV endpoint requires both values.
        if (
            request.season == null ||
            request.episode == null
        ) {
            return null;
        }

        return (
            `${baseUrl}/tv/${id}/` +
            `${request.season}/` +
            `${request.episode}${query}`
        );
    },

    parseEvent(event: MessageEvent): PlayerEvent | null {
        if (
            !VIDFAST_ORIGINS.has(event.origin) ||
            !event.data
        ) {
            return null;
        }

        let data = event.data;

        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch {
                return null;
            }
        }

        if (
            typeof data !== "object" ||
            data === null ||
            data.type !== "PLAYER_EVENT" ||
            typeof data.data !== "object" ||
            data.data === null
        ) {
            return null;
        }

        const eventData = data.data;

        const status = parseEventStatus(
            eventData.event
        );

        if (!status) {
            return null;
        }

        const mediaType =
            eventData.mediaType === "tv"
                ? "tv"
                : eventData.mediaType === "movie"
                    ? "movie"
                    : null;

        if (!mediaType) {
            return null;
        }

        const currentTime =
            getFiniteNumber(eventData.currentTime);

        const duration =
            getFiniteNumber(eventData.duration);

        const tmdbId =
            getFiniteNumber(eventData.tmdbId);

        const season =
            getFiniteNumber(eventData.season);

        const episode =
            getFiniteNumber(eventData.episode);

        return {
            provider: "vidfast",
            mediaType,

            tmdbId:
                tmdbId != null
                    ? tmdbId
                    : null,

            season:
                season != null
                    ? season
                    : null,

            episode:
                episode != null
                    ? episode
                    : null,

            status,

            currentTime:
                currentTime != null
                    ? currentTime
                    : 0,

            duration:
                duration != null
                    ? duration
                    : 0,
        };
    },
};
