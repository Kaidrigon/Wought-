
import { useEffect, useState } from "react";

import { apiFetch } from "../../services/api/api";

export interface NowAiringAnimeData {
    anilist_id: number;
    media_type: "tv";
    title: string;
    release_date: string;
    description: string;
    poster_link: string | null;
    backdrop_link: string | null;
    genres: string[];
    average_score: number | null;
    total_episodes: number | null;
    season: string | null;
    season_year: number | null;
    next_episode: number;
    airing_at: number;
    time_until_airing: number;
}

interface NowAiringAnimeResponse {
    results: NowAiringAnimeData[];
    current_page: number;
    total_results: number;
    has_next_page: boolean;
}

interface UseNowAiringAnimeReturn {
    anime: NowAiringAnimeData[];
    loading: boolean;
    error: string | null;
}

export default function useNowAiringAnime(): UseNowAiringAnimeReturn {
    const [anime, setAnime] = useState<NowAiringAnimeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchNowAiringAnime() {
            try {
                setLoading(true);
                setError(null);

                const response = await apiFetch("/now-airing/anime?page=1");

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch now airing anime (${response.status})`
                    );
                }

                const data: NowAiringAnimeResponse = await response.json();

                if (!data || !Array.isArray(data.results)) {
                    throw new Error("Unexpected now airing anime response.");
                }

                if (!cancelled) {
                    setAnime(data.results);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Something went wrong while loading now airing anime."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchNowAiringAnime();

        return () => {
            cancelled = true;
        };
    }, []);

    return { anime, loading, error };
}
