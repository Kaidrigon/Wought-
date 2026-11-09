
import { useEffect, useState } from "react";

import { apiFetch } from "../../services/api/api";
import type { AnimeData } from "../../types/anime";

interface UseAnimeTrendingReturn {
    anime: AnimeData[];
    loading: boolean;
    error: string | null;
}

export default function useAnimeTrending(): UseAnimeTrendingReturn {
    const [anime, setAnime] = useState<AnimeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchTrendingAnime() {
            try {
                setLoading(true);
                setError(null);

                const response = await apiFetch("/trending/anime?page=1");

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch trending anime (${response.status})`
                    );
                }

                const data: AnimeData[] = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error("Unexpected trending anime response.");
                }

                if (!cancelled) {
                    setAnime(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Something went wrong while loading anime."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchTrendingAnime();

        return () => {
            cancelled = true;
        };
    }, []);

    return { anime, loading, error };
}
