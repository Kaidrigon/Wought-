
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import useAnimeTrending from "../hooks/anime/useAnimeTrending";
import AnimeHero from "../components/anime/hero/AnimeHero";

import "./AnimePage.css";

export default function AnimePage() {
    const { anime, loading, error } = useAnimeTrending();
    const [activeIndex, setActiveIndex] = useState(0);

    const featuredAnime = anime.filter(
        (item) => item.backdrop_link || item.poster_link
    );

    const safeIndex =
        featuredAnime.length > 0
            ? activeIndex % featuredAnime.length
            : 0;

    const activeAnime = featuredAnime[safeIndex];

    const previousAnime = () => {
        setActiveIndex((current) =>
            current === 0 ? featuredAnime.length - 1 : current - 1
        );
    };

    const nextAnime = () => {
        setActiveIndex((current) =>
            current === featuredAnime.length - 1 ? 0 : current + 1
        );
    };

    if (loading) {
        return (
            <main className="anime-home anime-home--loading">
                <div className="anime-home__loader">
                    <span className="anime-home__loader-mark">W+</span>
                    <span>CONNECTING TO ANIMATION DIVISION</span>
                    <div className="anime-home__loader-line" />
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="anime-home anime-home--message">
                <div>
                    <span className="anime-home__eyebrow">
                        ANIMATION DIVISION / CONNECTION ERROR
                    </span>

                    <h1>Something interrupted the signal.</h1>
                    <p>{error}</p>

                    <button
                        className="anime-home__retry"
                        onClick={() => window.location.reload()}
                    >
                        Retry connection <ArrowRight size={16} />
                    </button>
                </div>
            </main>
        );
    }

    if (!activeAnime) {
        return (
            <main className="anime-home anime-home--message">
                <div>
                    <span className="anime-home__eyebrow">
                        ANIMATION DIVISION
                    </span>

                    <h1>No transmissions found.</h1>
                    <p>There is currently nothing to display.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="anime-home">
            <AnimeHero
                anime={activeAnime}
                activeIndex={safeIndex}
                total={featuredAnime.length}
                onPrevious={previousAnime}
                onNext={nextAnime}
            />
        </main>
    );
}
