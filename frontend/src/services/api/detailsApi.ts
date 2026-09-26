import {
    apiFetch,
    API_BASE_URL,
} from "../api/api";

import type {
    SeasonData,
} from "../../types/seasons";

import type {
    DetailsData,
    DetailsType,
} from "../../types/details";

import type {
    PersonData,
} from "../../types/person";
import type { RecommendationItem } from "../../types/recommendations";

/* ================================================= */
/* URL NORMALIZATION                                 */
/* ================================================= */

function normalizeUrl(
    value?: string | null
): string | null {
    if (!value) {
        return null;
    }

    if (value.startsWith("/")) {
        return `${API_BASE_URL}${value}`;
    }

    return value;
}

/* ================================================= */
/* TITLE DETAILS                                     */
/* ================================================= */

export async function getDetails(
    type: DetailsType,
    id: number
): Promise<DetailsData> {

    const endpoint =
        type === "movie"
            ? `/movie/${id}`
            : type === "tv"
                ? `/tv/${id}`
                : `/anime/${id}`;

    const response =
        await apiFetch(endpoint);

    if (!response.ok) {
        const data =
            await response
                .json()
                .catch(() => null);

        throw new Error(
            data?.detail ||
            "Unable to load this title."
        );
    }

    const data =
        await response.json();

    return {
        ...data,

        poster_link:
            normalizeUrl(
                data.poster_link
            ),

        backdrop_link:
            normalizeUrl(
                data.backdrop_link
            ),

        banner_link:
            normalizeUrl(
                data.banner_link
            ),

        logo_link:
            normalizeUrl(
                data.logo_link
            ),

        /*
         * Normalize every season poster here.
         * This is important because the detail page
         * displays season posters directly.
         */
        seasons:
            Array.isArray(data.seasons)
                ? data.seasons.map(
                    (season: NonNullable<DetailsData["seasons"]>[number]) =>({
                        ...season,
                        poster_link:
                            normalizeUrl(
                                season.poster_link
                            ),
                    })
                )
                : [],

        /*
         * Normalize every cast profile image here.
         */
        cast:
            Array.isArray(data.cast)
                ? data.cast.map(
                    (person: NonNullable<DetailsData["cast"]>[number]) => ({
                        ...person,
                        profile_link:
                            normalizeUrl(
                                person.profile_link
                            ),
                    })
                )
                : [],

        /*
         * Normalize every crew profile image here.
         */
        crew:
            Array.isArray(data.crew)
                ? data.crew.map(
                    (person: NonNullable<DetailsData["crew"]>[number]) => ({
                        ...person,
                        profile_link:
                            normalizeUrl(
                                person.profile_link
                            ),
                    })
                )
                : [],
    };
}

/* ================================================= */
/* TV SEASON                                        */
/* ================================================= */

export async function getTVSeason(
    tvId: number,
    seasonNumber: number
): Promise<SeasonData> {

    const response =
        await apiFetch(
            `/tv/${tvId}/season/${seasonNumber}`
        );

    if (!response.ok) {
        const data =
            await response
                .json()
                .catch(() => null);

        throw new Error(
            data?.detail ||
            "Unable to load this season."
        );
    }

    const data =
        await response.json();

    return {
        ...data,

        poster_link:
            normalizeUrl(
                data.poster_link
            ),

        episodes:
            Array.isArray(data.episodes)
                ? data.episodes.map(
                    (
                        episode: NonNullable<
                            SeasonData["episodes"]
                        >[number]
                    ) => ({
                        ...episode,

                        still_link:
                            normalizeUrl(
                                episode.still_link
                            ),
                    })
                )
                : [],
    };
}

/* ================================================= */
/* PERSON                                            */
/* ================================================= */

export async function getPerson(
    personId: number,
    type: "cinema" | "anime"
): Promise<PersonData> {

    const endpoint =
        type === "anime"
            ? `/anime/person/${personId}`
            : `/person/${personId}`;

    const response =
        await apiFetch(endpoint);

    if (!response.ok) {
        const data =
            await response
                .json()
                .catch(() => null);

        throw new Error(
            data?.detail ||
            "Unable to load this person."
        );
    }

    const data =
        await response.json();

    return {
        ...data,

        profile_link:
            normalizeUrl(
                data.profile_link
            ),

        credits:
            Array.isArray(data.credits)
                ? data.credits.map(
                    (
                        credit: NonNullable<
                            PersonData["credits"]
                        >[number]
                    ) => ({
                        ...credit,

                        poster_link:
                            normalizeUrl(
                                credit.poster_link
                            ),
                    })
                )
                : [],
    };
}

/* Wought+ ROAST*/
export async function generateRoast(
    description: string,
    title?: string | null,
    mediaType?: string | null
): Promise<string> {

    if (!description?.trim()) {
        throw new Error(
            "A description is required."
        );
    }

    const response =
        await apiFetch("/roast", {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json",
            },

            body: JSON.stringify({
                description:
                    description.trim(),

                title:
                    title || null,

                media_type:
                    mediaType || null,
            }),
        });

    if (!response.ok) {
        const data =
            await response
                .json()
                .catch(() => null);

        throw new Error(
            data?.detail ||
            "Unable to generate Wought+ roast."
        );
    }

    const data =
        await response.json();

    if (
        !data?.roast ||
        typeof data.roast !== "string"
    ) {
        throw new Error(
            "Wought+ returned an empty roast."
        );
    }

    return data.roast.trim();
}
export async function getMovieRecommendations(
    movieId: number
): Promise<RecommendationItem[]> {
    const response = await apiFetch(
        `/recommendations/movie/${movieId}`
    );

    if (!response.ok) {
        throw new Error(
            "Unable to load movie recommendations."
        );
    }

    return response.json();
}

export async function getTVRecommendations(
    tvId: number
): Promise<RecommendationItem[]> {
    const response = await apiFetch(
        `/recommendations/tv/${tvId}`
    );

    if (!response.ok) {
        throw new Error(
            "Unable to load TV recommendations."
        );
    }

    return response.json();
}

export async function getAnimeRecommendations(
    animeId: number
): Promise<RecommendationItem[]> {
    const response = await apiFetch(
        `/recommendations/anime/${animeId}`
    );

    if (!response.ok) {
        throw new Error(
            "Unable to load anime recommendations."
        );
    }

    return response.json();
}