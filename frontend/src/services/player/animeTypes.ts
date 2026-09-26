export type AnimePlayerLanguage =
    | "sub"
    | "dub";


export type AnimePlayerProviderId =
    | "megaplay"
    | "framextv";


export type AnimePlayerRequest = {

    anilistId:
        number;

    episode:
        number;

    season?:
        number;

    language?:
        AnimePlayerLanguage;

    startAt?:
        number | null;

    autoplay?:
        boolean;
};


export type AnimePlayerOptions = {

    baseUrl:
        string;

    providerBaseUrls?:
        Partial<
            Record<
                AnimePlayerProviderId,
                string
            >
        >;

    language?:
        AnimePlayerLanguage;

    autoplay?:
        boolean;
};


export type AnimePlayerStatus =
    | "playing"
    | "paused"
    | "completed"
    | "seeked"
    | "timeupdate"
    | "error";


export type AnimePlayerEvent = {

    provider:
        AnimePlayerProviderId;

    anilistId:
        number;

    episode:
        number;

    status:
        AnimePlayerStatus;

    currentTime:
        number;

    duration:
        number;
};


export interface AnimeVideoProvider {

    id:
        AnimePlayerProviderId;

    name:
        string;

    priority:
        number;

    supports(
        request:
            AnimePlayerRequest
    ): boolean;

    buildUrl(
        request:
            AnimePlayerRequest,

        options:
            AnimePlayerOptions
    ):
        string | null;

    parseEvent?(
        event:
            MessageEvent
    ):
        AnimePlayerEvent | null;
}