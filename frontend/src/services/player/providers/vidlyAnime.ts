import type {
    AnimePlayerEvent,
    AnimePlayerOptions,
    AnimePlayerRequest,
    AnimePlayerStatus,
    AnimeVideoProvider,
} from "../animeTypes";

const VIDLY_ORIGIN = "https://vidly.pro";

function cleanBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, "");
}

function parseIncomingData(
    data: unknown
): Record<string, unknown> | null {
    let parsed = data;

    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }

    if (
        parsed === null ||
        typeof parsed !== "object"
    ) {
        return null;
    }

    return parsed as Record<string, unknown>;
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

        case "timeupdate":
            return "timeupdate";

        default:
            return null;
    }
}

function supportsAnimeRequest(
    request: AnimePlayerRequest
): boolean {
    return (
        Number.isInteger(request.anilistId) &&
        request.anilistId > 0 &&
        Number.isInteger(request.episode) &&
        request.episode > 0 &&
        (
            (request.language ?? "sub") === "sub" ||
            (request.language ?? "sub") === "dub"
        )
    );
}

export const vidlyAnimeProvider: AnimeVideoProvider = {
    id: "vidly-anime",

    name: "Vidly",

    priority: 145,

    supports: supportsAnimeRequest,

    buildUrl(
        request: AnimePlayerRequest,
        options: AnimePlayerOptions
    ): string | null {
        if (!supportsAnimeRequest(request)) {
            return null;
        }

        const baseUrl = cleanBaseUrl(options.baseUrl);

        const language =
            request.language ??
            options.language ??
            "sub";

        return (
            `${baseUrl}/anime/` +
            `${request.anilistId}/` +
            `${request.episode}/` +
            `${language}`
        );
    },

    parseEvent(
        event: MessageEvent
    ): AnimePlayerEvent | null {
        if (event.origin !== VIDLY_ORIGIN) {
            return null;
        }

        const message = parseIncomingData(event.data);

        if (
            !message ||
            message.type !== "VIDLY_PLAYER_EVENT"
        ) {
            return null;
        }

        const data = parseIncomingData(message.data);

        if (!data || data.mediaType !== "anime") {
            return null;
        }

        const status = mapEventStatus(data.event);

        if (!status) {
            return null;
        }

        const currentTime = toNumber(data.currentTime);
        const duration = toNumber(data.duration);

        if (
            currentTime === null ||
            duration === null
        ) {
            return null;
        }

        return {
            provider: "vidly-anime",

            // The anime manager fills these from
            // the active anime request.
            anilistId: 0,
            episode: 0,

            status,
            currentTime,
            duration,
        };
    },
};