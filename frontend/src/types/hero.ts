export interface HeroData {

    tmdb_id: number;

    media_type: "movie" | "tv";

    title: string;

    release_date: string;

    description: string;

    poster_link: string | null;

    backdrop_link: string | null;

    logo_link: string | null;

    genres: string[];

}