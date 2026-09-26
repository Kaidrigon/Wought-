import { useEffect, useState } from "react";

import type { HeroData } from "../types/hero";

import { preloadHeroStartup } from "../utils/heroStartup";

export function useHero() {

    const [heroes, setHeroes] =
        useState<HeroData[]>([]);

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {

        let cancelled = false;

        async function loadHeroes() {

            try {

                const movies =
                    await preloadHeroStartup();

                if (!cancelled) {

                    setHeroes(
                        movies
                    );

                }

            } finally {

                if (!cancelled) {

                    setLoading(false);

                }

            }

        }

        loadHeroes();

        return () => {

            cancelled = true;

        };

    }, []);

    return {

        heroes,

        loading,

    };

}