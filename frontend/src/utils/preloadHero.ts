import type { HeroData } from "../types/hero";

function preloadImage(
    src: string | null
): Promise<void> {

    if (!src) {
        return Promise.resolve();
    }

    return new Promise(resolve => {

        const image = new Image();

        image.onload = () => {
            resolve();
        };

        image.onerror = () => {
            resolve();
        };

        image.src = src;

    });

}

export async function preloadHero(
    hero: HeroData
): Promise<void> {

    await Promise.all([

        preloadImage(
            hero.backdrop_link
        ),

        preloadImage(
            hero.logo_link
        ),

    ]);

}