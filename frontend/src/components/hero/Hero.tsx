import type { HeroData } from "../../types/hero";

import HeroContent from "./HeroContent";

import LiquidTransition from "./liquid/LiquidTransition";

import "./Hero.css";

type HeroDirection = "next" | "previous";

type HeroProps = {
    hero: HeroData;
    direction: HeroDirection;
    /** Other heroes in the list, so their images are preloaded. */
    neighbors?: HeroData[];
};

export default function Hero({ hero, direction, neighbors }: HeroProps) {
    return (
        <section className="hero-slide">
            <LiquidTransition
                desktopImage={hero.backdrop_link ?? "/placeholder.jpg"}
                mobileImage={hero.poster_link ?? hero.backdrop_link ?? "/placeholder.jpg"}
                direction={direction}
                preload={neighbors?.map((n) => ({
                    desktop: n.backdrop_link ?? "/placeholder.jpg",
                    mobile: n.poster_link ?? n.backdrop_link ?? "/placeholder.jpg",
                }))}
            />

            <HeroContent hero={hero} />
        </section>
    );
}