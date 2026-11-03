import type {
    AnimePlayerEvent,
    AnimePlayerOptions,
    AnimePlayerRequest,
    AnimePlayerStatus,
    AnimeVideoProvider,
} from "../animeTypes";

const VIDNEST_ORIGIN = "https://vidnest.fun";

function cleanBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, "");
}

function parseIncomingData(
    data: unknown
): Record<string, unknown> | null {
    if (typeof data === "string") {
        try {
            const parsed: unknown = JSON.parse(data);

            if (
                parsed !== null &&
                typeof parsed === "object"
            ) {
                return parsed as Record<string, unknown>;
            }
        } catch {
            return null;
        }
    }

    if (
        data !== null &&
        typeof data === "object"
    ) {
        return data as Record<string, unknown>;
    }

    return null;
}

function toNumber(value: unknown): number | null {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
}

function mapEventStatus(
    eventName: unknown
): AnimePlayerStatus | null {
    switch (eventName) {
        case "play":
            return "playing";

        case "pause":
            return "paused";

        case "ended":
            return "completed";

        case "seeked":
            return "seeked";

        case "timeupdate":
            return "timeupdate";

        default:
            return null;
    }
}

function supportsAnimeRequest(
    request: AnimePlayerRequest
): boolean {
    if (
        !Number.isInteger(request.anilistId) ||
        request.anilistId <= 0
    ) {
        return false;
    }

    if (
        !Number.isInteger(request.episode) ||
        request.episode <= 0
    ) {
        return false;
    }

    const language = request.language ?? "sub";

    return (
        language === "sub" ||
        language === "dub"
    );
}

function buildAnimeUrl(
    request: AnimePlayerRequest,
    options: AnimePlayerOptions,
    route: "anime" | "animepahe"
): string | null {
    if (!supportsAnimeRequest(request)) {
        return null;
    }

    const language =
        request.language ??
        options.language ??
        "sub";

    const baseUrl = cleanBaseUrl(options.baseUrl);

    return (
        `${baseUrl}/${route}/` +
        `${request.anilistId}/` +
        `${request.episode}/` +
        `${language}`
    );
}

function parseVidNestEvent(
    event: MessageEvent,
    providerId:
        | "vidnest-anime"
        | "vidnest-animepahe"
): AnimePlayerEvent | null {
    if (event.origin !== VIDNEST_ORIGIN) {
        return null;
    }

    const data = parseIncomingData(event.data);

    if (!data || data.type !== "PLAYER_EVENT") {
        return null;
    }

    const status = mapEventStatus(data.event);

    if (!status) {
        return null;
    }

    const currentTime = toNumber(data.currentTime);
    const duration = toNumber(data.duration);

    if (
        currentTime == null ||
        duration == null
    ) {
        return null;
    }

    return {
        provider: providerId,

        // The anime manager enriches these from
        // the active request.
        anilistId: 0,
        episode: 0,

        status,
        currentTime,
        duration,
    };
}

export const vidnestAnimeProvider: AnimeVideoProvider = {
    id: "vidnest-anime",

    name: "VidNest",

    priority: 160,

    supports: supportsAnimeRequest,

    buildUrl(
        request: AnimePlayerRequest,
        options: AnimePlayerOptions
    ): string | null {
        return buildAnimeUrl(
            request,
            options,
            "anime"
        );
    },

    parseEvent(event: MessageEvent) {
        return parseVidNestEvent(
            event,
            "vidnest-anime"
        );
    },
};

export const vidnestAnimePaheProvider: AnimeVideoProvider = {
    id: "vidnest-animepahe",

    name: "AnimePahe",

    priority: 155,

    supports: supportsAnimeRequest,

    buildUrl(
        request: AnimePlayerRequest,
        options: AnimePlayerOptions
    ): string | null {
        return buildAnimeUrl(
            request,
            options,
            "animepahe"
        );
    },

    parseEvent(event: MessageEvent) {
        return parseVidNestEvent(
            event,
            "vidnest-animepahe"
        );
    },
};