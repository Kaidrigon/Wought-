import type { HeroData } from "../../types/hero";

import { Star } from "lucide-react";

import "./HeroMeta.css";

type HeroMetaProps = {
    hero: HeroData;
};

export default function HeroMeta({
    hero,
}: HeroMetaProps) {

    const year =
        hero.release_date?.split("-")[0] ??
        "Unknown";

    return (

        <div className="hero-meta">

            <span className="hero-meta__year">
                {year}
            </span>

            <span className="hero-meta__dot" />

            <div className="hero-meta__genres">

                {hero.genres.map((genre) => (

                    <span
                        key={genre}
                        className="hero-meta__genre"
                    >
                        {genre}
                    </span>

                ))}

            </div>

            <span className="hero-meta__dot" />

            <div className="hero-meta__rating">

                <Star
                    size={16}
                    fill="currentColor"
                />

                <span>
                    TMDB
                </span>

            </div>

        </div>

    );

}