import {
    apiFetch,
    API_BASE_URL,
} from "./api";

import type { HeroData } from "../../types/hero";


function normalizeMediaLink(
    link: string | null
): string | null {

    if (!link) {
        return null;
    }

    if (
        link.startsWith("http://") ||
        link.startsWith("https://")
    ) {

        return link;

    }

    return `${API_BASE_URL}${link}`;

}


export async function getHeroMovies(): Promise<HeroData[]> {

    const response =
        await apiFetch("/trending");

    if (!response.ok) {

        throw new Error(
            "Failed to load trending movies."
        );

    }

    const data: HeroData[] =
        await response.json();

    return data
        .slice(0, 6)
        .map(movie => ({

            ...movie,

            poster_link:
                normalizeMediaLink(
                    movie.poster_link
                ),

            backdrop_link:
                normalizeMediaLink(
                    movie.backdrop_link
                ),

            logo_link:
                normalizeMediaLink(
                    movie.logo_link
                ),

        }));

}