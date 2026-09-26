export type PersonCredit = {
    id: number;
    title: string;
    media_type?: string | null;
    character?: string | null;
    job?: string | null;
    poster_link?: string | null;
    release_date?: string | null;
};

export type PersonData = {
    id: number;
    name: string;
    biography?: string | null;
    birthday?: string | null;
    deathday?: string | null;
    place_of_birth?: string | null;
    profile_link?: string | null;
    known_for_department?: string | null;
    credits: PersonCredit[];
};