import type { HeroData } from "../../types/hero";

import HeroActions from "./HeroActions";

import "./HeroContent.css";

type HeroContentProps = {
    hero: HeroData;
};

export default function HeroContent({
    hero,
}: HeroContentProps) {
    return (
        <section className="hero-content">
            <div className="hero-content__eyebrow">
                <span className="hero-content__eyebrow-line" />
                <span className="hero-content__eyebrow-label">
                    FEATURED / {String(hero.tmdb_id).padStart(4, "0")}
                </span>
            </div>

            <div className="hero-content__identity">
                {hero.logo_link ? (
                    <img
                        src={hero.logo_link}
                        alt={hero.title}
                        className="hero-content__logo-image"
                    />
                ) : (
                    <h1 className="hero-content__title">
                        {hero.title}
                    </h1>
                )}
            </div>

            <HeroActions />
        </section>
    );
}
