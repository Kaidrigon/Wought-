export type SeasonEpisode = {
    id: number;

    episode_number: number;

    name: string;

    overview?: string | null;

    air_date?: string | null;

    runtime?: number | null;

    rating?: number | null;

    still_link?: string | null;
};


export type SeasonData = {
    tv_id: number;

    season_number: number;

    name: string;

    overview?: string | null;

    poster_link?: string | null;

    air_date?: string | null;

    episode_count?: number | null;

    episodes: SeasonEpisode[];
};