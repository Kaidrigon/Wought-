import type { HeroData } from "../types/hero";

import { getHeroMovies } from "../services/api/hero";
import { preloadHero } from "./preloadHero";

let heroStartupPromise:
    Promise<HeroData[]> | null = null;

export function preloadHeroStartup(): Promise<HeroData[]> {

    if (heroStartupPromise) {
        return heroStartupPromise;
    }

    heroStartupPromise = (async () => {

        const heroes =
            await getHeroMovies();


        if (heroes.length > 0) {

            await preloadHero(
                heroes[0]
            );

        }

        if (heroes.length > 1) {

            preloadHero(
                heroes[1]
            );

        }

        return heroes;

    })();

    return heroStartupPromise;
}