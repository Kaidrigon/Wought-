
import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Play,
} from "lucide-react";

import useAnimeTrending from "../hooks/anime/useAnimeTrending";

import "./AnimePage.css";

export default function AnimePage() {
    const { anime, loading, error } = useAnimeTrending();
    const [activeIndex, setActiveIndex] = useState(0);

    const featuredAnime = anime.filter(
        (item) => item.backdrop_link || item.poster_link
    );

    const activeAnime = featuredAnime[activeIndex];

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
            <section className="anime-hero">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeAnime.anilist_id}
                        className="anime-hero__slide"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45 }}
                    >
                        {activeAnime.backdrop_link && (
                            <img
                                className="anime-hero__backdrop"
                                src={activeAnime.backdrop_link}
                                alt=""
                            />
                        )}

                        {activeAnime.poster_link && (
                            <img
                                className="anime-hero__poster"
                                src={activeAnime.poster_link}
                                alt=""
                            />
                        )}

                        <div className="anime-hero__shade" />

                        <div className="anime-hero__content">
                            <div className="anime-hero__identity">
                                <span className="anime-hero__eyebrow">
                                    <span className="anime-hero__status-dot" />
                                    W+ / ANIMATION DIVISION
                                </span>

                                <span className="anime-hero__classification">
                                    FEATURED TRANSMISSION
                                </span>
                            </div>

                            <div className="anime-hero__information">
                                <span className="anime-hero__index">
                                    ANIME SIGNAL /{" "}
                                    {String(activeIndex + 1).padStart(2, "0")}
                                </span>

                                <h1>{activeAnime.title}</h1>

                                <div className="anime-hero__metadata">
                                    <span>{activeAnime.release_date}</span>
                                    <span className="anime-hero__metadata-dot" />
                                    <span>
                                        {activeAnime.media_type === "movie"
                                            ? "FILM"
                                            : "SERIES"}
                                    </span>

                                    {activeAnime.genres.slice(0, 3).map(
                                        (genre) => (
                                            <span
                                                className="anime-hero__genre"
                                                key={genre}
                                            >
                                                {genre}
                                            </span>
                                        )
                                    )}
                                </div>

                                <p className="anime-hero__description">
                                    {activeAnime.description ||
                                        "No description available for this transmission."}
                                </p>

                                <div className="anime-hero__actions">
                                    <Link
                                        to={`/anime/anime/${activeAnime.anilist_id}/watch`}
                                        className="anime-hero__play"
                                    >
                                        <Play size={17} fill="currentColor" />
                                        <span>PLAY NOW</span>
                                    </Link>

                                    <Link
                                        to={`/anime/${activeAnime.media_type}/${activeAnime.anilist_id}`}
                                        className="anime-hero__details"
                                    >
                                        DOSSIER
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {featuredAnime.length > 1 && (
                    <div className="anime-hero__navigation">
                        <div className="anime-hero__counter">
                            <span>
                                {String(activeIndex + 1).padStart(2, "0")}
                            </span>
                            <span className="anime-hero__counter-divider" />
                            <span>
                                {String(featuredAnime.length).padStart(2, "0")}
                            </span>
                        </div>

                        <div className="anime-hero__nav-buttons">
                            <button
                                type="button"
                                onClick={previousAnime}
                                aria-label="Previous anime"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <button
                                type="button"
                                onClick={nextAnime}
                                aria-label="Next anime"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="anime-hero__bottom-line">
                    <span>Wought+ ORIGINAL SIGNAL</span>
                    <span>ANIMATION / 001</span>
                </div>
            </section>
        </main>
    );
}
