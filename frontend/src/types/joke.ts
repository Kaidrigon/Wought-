export interface Joke {
    id: string;
    weight: number;
    tags: string[];
    text: string;
    tmdbId?: number;
    tvdbId?: number;
    anilistId?: number;
}