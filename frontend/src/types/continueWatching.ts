export type ContinueWatchingItem = {

    mediaId: number;

    mediaType: "movie" | "tv";

    title: string;

    poster: string | null;

    currentTime: number;

    duration: number;

    progressPercent: number;

    season: number | null;

    episode: number | null;

    updatedAt: number;

};