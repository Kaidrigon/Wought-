export type AnimeCategory = "movie" | "tv";

export type AnimeSortOption =
    | "popularity"
    | "score"
    | "trending"
    | "newest"
    | "oldest";

export interface AnimeData {
    anilist_id: number;
    media_type: "movie" | "tv";
    title: string;
    release_date: string;
    description: string;
    poster_link: string | null;
    genres: string[];
}

export interface AnimeDiscoverResponse {
    results: AnimeData[];
    current_page: number;
    total_pages: number;
    total_results: number;
    has_next_page: boolean;
}