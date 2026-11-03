import type {
    PlayerEvent,
    PlayerOptions,
    PlayerRequest,
    PlayerStatus,
    VideoProvider,
} from "../types";

const VIDNEST_ORIGIN = "https://vidnest.fun";

let activeRequest: PlayerRequest | null = null;

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
): PlayerStatus | null {
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

export const vidnestProvider: VideoProvider = {
    id: "vidnest",

    name: "VidNest",

    priority: 150,

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

        const params = new URLSearchParams();

        if (
            request.startAt != null &&
            Number.isFinite(request.startAt) &&
            request.startAt > 0
        ) {
            const resumeParameter =
                request.mediaType === "movie"
                    ? "startAt"
                    : "progress";

            params.set(
                resumeParameter,
                String(Math.floor(request.startAt))
            );
        }

        activeRequest = { ...request };

        const query = params.toString();

        return query ? `${url}?${query}` : url;
    },

    parseEvent(event: MessageEvent): PlayerEvent | null {
        if (event.origin !== VIDNEST_ORIGIN) {
            return null;
        }

        const data = parseIncomingData(event.data);

        if (!data || data.type !== "PLAYER_EVENT") {
            // MEDIA_DATA is metadata, not a playback event.
            return null;
        }

        if (!activeRequest) {
            return null;
        }

        const status = mapEventStatus(data.event);

        if (!status) {
            return null;
        }

        const currentTime = toNumber(data.currentTime);
        const duration = toNumber(data.duration);

        if (currentTime == null || duration == null) {
            return null;
        }

        return {
            provider: "vidnest",

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