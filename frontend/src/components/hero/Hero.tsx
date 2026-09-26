import type { HeroData } from "../../types/hero";

import HeroContent from "./HeroContent";

import LiquidTransition from "./liquid/LiquidTransition";

import "./Hero.css";

type HeroDirection =
    | "next"
    | "previous";

type HeroProps = {
    hero: HeroData;
    direction: HeroDirection;
};

export default function Hero({
    hero,
    direction,
}: HeroProps) {
    return (
        <section className="hero-slide">

            <LiquidTransition
                desktopImage={
                    hero.backdrop_link ??
                    "/placeholder.jpg"
                }
                mobileImage={
                    hero.poster_link ??
                    hero.backdrop_link ??
                    "/placeholder.jpg"
                }
                direction={
                    direction
                }
            />

            <HeroContent
                hero={hero}
            />

        </section>
    );
}