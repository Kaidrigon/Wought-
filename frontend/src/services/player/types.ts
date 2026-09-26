export type PlayerMediaType =
    | "movie"
    | "tv";

export type PlayerProviderId =
    | "cinemaos"
    | "framextv"
    | "peachify"
    | "vidsrc";

export type PlayerRequest = {
    mediaType:
        PlayerMediaType;

    tmdbId?:
        number | null;

    imdbId?:
        string | null;

    season?:
        number | null;

    episode?:
        number | null;

    startAt?:
        number | null;

    autoplay?:
        boolean;

    autonext?:
        boolean;

    subtitleLanguage?:
        string | null;
};

export type PlayerOptions = {
    baseUrl: string;

    providerBaseUrls?:
        Partial<
            Record<
                PlayerProviderId,
                string
            >
        >;

    autoplay?:
        boolean;

    autonext?:
        boolean;

    subtitleLanguage?:
        string | null;
};

export type PlayerStatus =
    | "playing"
    | "paused"
    | "completed"
    | "seeked"
    | "timeupdate";

export type PlayerEvent = {
    provider:
        PlayerProviderId;

    mediaType:
        PlayerMediaType;

    tmdbId?:
        number | null;

    imdbId?:
        string | null;

    season?:
        number | null;

    episode?:
        number | null;

    status:
        PlayerStatus;

    currentTime:
        number;

    duration:
        number;
};

export interface VideoProvider {
    id:
        PlayerProviderId;

    name:
        string;

    priority:
        number;

    supports(
        request: PlayerRequest
    ): boolean;

    buildUrl(
        request: PlayerRequest,
        options: PlayerOptions
    ): string | null;

    parseEvent?(
        event: MessageEvent
    ): PlayerEvent | null;
}