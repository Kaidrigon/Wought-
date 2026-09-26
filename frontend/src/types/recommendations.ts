export type RecommendationMediaType = "movie" | "tv" | "anime";

export type RecommendationItem = {
    tmdb_id?: number;
    anilist_id?: number;

    media_type: RecommendationMediaType;

    title: string;
    release_date?: string | null;
    description?: string | null;
    rating?: number | null;

    poster_link?: string | null;
    genres?: string[];
};