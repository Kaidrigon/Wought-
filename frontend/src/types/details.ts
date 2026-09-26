export type DetailsType =
    | "movie"
    | "tv"
    | "anime";


export type DetailsPerson = {
    id: number;

    name: string;

    character?: string | null;

    profile_link?: string | null;

    department?: string | null;

    job?: string | null;
};


export type DetailsSeason = {
    season_number: number;

    name: string;

    overview?: string | null;

    air_date?: string | null;

    episode_count?: number | null;

    poster_link?: string | null;
};


export type DetailsData = {

    tmdb_id?: number;

    anilist_id?: number;


    title: string;

    description?: string | null;


    poster_link?: string | null;

    backdrop_link?: string | null;

    banner_link?: string | null;

    logo_link?: string | null;


    release_date?: string | null;

    first_air_date?: string | null;

    last_air_date?: string | null;


    runtime?: number | null;

    rating?: number | null;


    genres?: string[];

    language?: string | null;

    status?: string | null;

    tagline?: string | null;

    adult?: boolean;


    number_of_seasons?: number | null;

    number_of_episodes?: number | null;

    in_production?: boolean;


    romaji_title?: string | null;

    native_title?: string | null;

    format?: string | null;

    episodes?: number | null;

    duration?: number | null;

    season?: string | null;

    year?: number | null;

    studios?: string[];

    trailer?: string | null;

    seasons?: DetailsSeason[];

    cast?: DetailsPerson[];

    crew?: DetailsPerson[];
};