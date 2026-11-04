import type {
    PlayerEvent,
    PlayerOptions,
    PlayerRequest,
    PlayerStatus,
    VideoProvider,
} from "../types";

const VIDLY_ORIGIN = "https://vidly.pro";

let activeRequest: PlayerRequest | null = null;

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
): PlayerStatus | null {
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

export const vidlyProvider: VideoProvider = {
    id: "vidly",

    name: "Vidly",

    priority: 145,

    supports(request: PlayerRequest): boolean {
        if (
            !Number.isInteger(request.tmdbId) ||
            !request.tmdbId ||
            request.tmdbId <= 0
        ) {
            return false;
        }

        if (request.mediaType === "tv") {
            return (
                Number.isInteger(request.season) &&
                Number(request.season) > 0 &&
                Number.isInteger(request.episode) &&
                Number(request.episode) > 0
            );
        }

        return request.mediaType === "movie";
    },

    buildUrl(
        request: PlayerRequest,
        options: PlayerOptions
    ): string | null {
        if (!this.supports(request)) {
            return null;
        }

        const baseUrl = cleanBaseUrl(options.baseUrl);

        let url: string;

        if (request.mediaType === "movie") {
            url = `${baseUrl}/movie/${request.tmdbId}`;
        } else {
            url =
                `${baseUrl}/tv/${request.tmdbId}/` +
                `${request.season}/${request.episode}`;
        }

        activeRequest = { ...request };

        return url;
    },

    parseEvent(event: MessageEvent): PlayerEvent | null {
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

        if (!activeRequest) {
            return null;
        }

        const data = parseIncomingData(message.data);

        if (!data) {
            return null;
        }

        if (
            data.mediaType !== activeRequest.mediaType
        ) {
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
            provider: "vidly",

            mediaType: activeRequest.mediaType,

            tmdbId: activeRequest.tmdbId,
            imdbId: activeRequest.imdbId,

            season: activeRequest.season,
            episode: activeRequest.episode,

            status,

            currentTime,
            duration,
        };
    },
};