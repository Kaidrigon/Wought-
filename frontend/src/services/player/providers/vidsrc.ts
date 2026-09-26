import type {
    PlayerEvent,
    PlayerRequest,
    PlayerOptions,
    VideoProvider,
} from "../types";

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

    if (autoplay) {
        params.set("autoplay", "1");
    } else {
        params.set("autoplay", "0");
    }

    if (
        request.mediaType === "tv" &&
        autonext
    ) {
        params.set("autonext", "1");
    }

    if (
        typeof request.startAt === "number" &&
        request.startAt > 0
    ) {
        params.set(
            "startAt",
            Math.floor(
                request.startAt
            ).toString()
        );
    }

    const subtitleLanguage =
        request.subtitleLanguage ??
        options.subtitleLanguage;

    if (subtitleLanguage) {
        params.set(
            "ds_lang",
            subtitleLanguage
        );
    }

    const query = params.toString();

    return query
        ? `?${query}`
        : "";
}

export const vidsrcProvider: VideoProvider = {
    id: "vidsrc",

    name: "VidSrc",

    priority: 100,

    supports(
        request: PlayerRequest
    ): boolean {
        /*
         * VidSrc currently supports movie/TV
         * style TMDB/IMDb identifiers.
         *
         * Anime is intentionally not handled here.
         */

        if (
            request.mediaType !== "movie" &&
            request.mediaType !== "tv"
        ) {
            return false;
        }

        if (
            !request.tmdbId &&
            !request.imdbId
        ) {
            return false;
        }

        if (
            request.mediaType === "tv"
        ) {
            if (
                request.season != null &&
                request.season < 1
            ) {
                return false;
            }

            if (
                request.episode != null &&
                request.episode < 1
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
        const baseUrl =
            cleanBaseUrl(
                options.baseUrl
            );

        const query =
            buildQuery(
                request,
                options
            );

        /*
         * Prefer TMDB when available because
         * our cinema detail system already uses
         * TMDB IDs.
         */

        const id =
            request.tmdbId
                ? request.tmdbId.toString()
                : request.imdbId;

        if (!id) {
            return null;
        }

        /*
         * Movie
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
         * TV episode
         *
         * /embed/tv/{id}/{season}/{episode}
         */

        if (
            request.season != null &&
            request.episode != null
        ) {
            return (
                `${baseUrl}/embed/tv/${id}/` +
                `${request.season}/` +
                `${request.episode}` +
                `${query}`
            );
        }

        /*
         * TV show picker
         *
         * /embed/tv/{id}
         */

        return (
            `${baseUrl}/embed/tv/` +
            `${id}${query}`
        );
    },

    parseEvent(
        event: MessageEvent
    ): PlayerEvent | null {
        /*
         * Ignore messages coming from our own page.
         */

        if (
            event.origin ===
            window.location.origin
        ) {
            return null;
        }

        if (!event.data) {
            return null;
        }

        let data =
            event.data;

        /*
         * Some providers may send postMessage
         * payloads as JSON strings.
         */

        if (
            typeof data ===
            "string"
        ) {
            try {
                data =
                    JSON.parse(
                        data
                    );
            } catch {
                return null;
            }
        }

        if (
            !data ||
            data.type !==
                "PLAYER_EVENT"
        ) {
            return null;
        }

        const eventData =
            data.data ?? data;

        const status =
            eventData.player_status;

        const currentTime =
            Number(
                eventData.player_progress
            ) || 0;

        const duration =
            Number(
                eventData.player_duration
            ) || 0;

        if (
            status !== "playing" &&
            status !== "paused" &&
            status !== "completed" &&
            status !== "seeked"
        ) {
            return null;
        }

        const mediaType =
            eventData.mediaType === "tv"
                ? "tv"
                : "movie";

        return {
            provider: "vidsrc",

            mediaType,

            tmdbId:
                eventData.tmdb != null
                    ? Number(
                            eventData.tmdb
                        )
                    : null,

            imdbId:
                eventData.imdb ||
                null,

            season:
                eventData.season != null
                    ? Number(
                            eventData.season
                        )
                    : null,

            episode:
                eventData.episode != null
                    ? Number(
                            eventData.episode
                        )
                    : null,

            status,

            currentTime,

            duration,
        };
    },
};
