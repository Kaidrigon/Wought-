import { useEffect, useState } from "react";

import type { HeroData } from "../types/hero";
import { apiFetch, API_BASE_URL } from "../services/api/api";


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


export function useTrending() {

    const [trending, setTrending] =
        useState<HeroData[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);


    useEffect(() => {

        let cancelled = false;


        async function loadTrending() {

            try {

                const response =
                    await apiFetch("/trending");

                if (!response.ok) {
                    throw new Error(
                        "Failed to load trending content."
                    );
                }

                const data: HeroData[] =
                    await response.json();

                const normalized =
                    data.map(item => ({

                        ...item,

                        poster_link:
                            normalizeMediaLink(
                                item.poster_link
                            ),

                        backdrop_link:
                            normalizeMediaLink(
                                item.backdrop_link
                            ),

                        logo_link:
                            normalizeMediaLink(
                                item.logo_link
                            ),

                    }));


                if (!cancelled) {

                    setTrending(normalized);
                    setError(null);

                }

            } catch (err) {

                if (!cancelled) {

                    setError(
                        err instanceof Error
                            ? err.message
                            : "Something went wrong."
                    );

                }

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }

            }

        }


        loadTrending();


        return () => {
            cancelled = true;
        };

    }, []);


    return {
        trending,
        loading,
        error,
    };

}