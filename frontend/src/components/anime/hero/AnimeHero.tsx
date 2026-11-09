
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { motion } from "framer-motion";

import type { AnimeData } from "../../../types/anime";

import AnimeHeroArtwork from "./animations/AnimeHeroArtwork";
import AnimeHeroTitle from "./typography/AnimeHeroTitle";

import "./AnimeHero.css";

interface AnimeHeroProps {
    anime: AnimeData;
    activeIndex: number;
    total: number;
    onPrevious: () => void;
    onNext: () => void;
}

export default function AnimeHero({
    anime,
    activeIndex,
    total,
    onPrevious,
    onNext,
}: AnimeHeroProps) {
    return (
        <section className="anime-hero">
            <AnimeHeroArtwork anime={anime} />

            <div className="anime-hero__content">
                <motion.header
                    className="anime-hero__identity"
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.15 }}
                >
                    <span className="anime-hero__eyebrow">
                        <span className="anime-hero__status-dot" />
                        W+ / ANIMATION DIVISION
                    </span>

                    <span className="anime-hero__classification">
                        FEATURED TRANSMISSION
                    </span>
                </motion.header>

                <div className="anime-hero__information">
                    <AnimeHeroTitle
                        title={anime.title}
                        index={activeIndex}
                    />

                    <motion.div
                        className="anime-hero__metadata"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75, duration: 0.55 }}
                    >
                        {anime.release_date && (
                            <span>{anime.release_date}</span>
                        )}

                        <span className="anime-hero__metadata-dot" />

                        <span>
                            {anime.media_type === "movie" ? "FILM" : "SERIES"}
                        </span>

                        {anime.genres?.slice(0, 3).map((genre) => (
                            <span className="anime-hero__genre" key={genre}>
                                {genre}
                            </span>
                        ))}
                    </motion.div>

                    <motion.div
                        className="anime-hero__actions"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.55 }}
                    >
                        <Link
                            to={`/anime/anime/${anime.anilist_id}/watch`}
                            className="anime-hero__play"
                        >
                            <Play size={16} fill="currentColor" />
                            <span>PLAY NOW</span>
                        </Link>

                        <Link
                            to={`/anime/${anime.media_type}/${anime.anilist_id}`}
                            className="anime-hero__details"
                        >
                            DOSSIER
                            <ArrowRight size={16} />
                        </Link>
                    </motion.div>
                </div>
            </div>

            {total > 1 && (
                <div className="anime-hero__navigation">
                    <div className="anime-hero__counter">
                        <span>
                            {String(activeIndex + 1).padStart(2, "0")}
                        </span>

                        <span className="anime-hero__counter-divider" />

                        <span>
                            {String(total).padStart(2, "0")}
                        </span>
                    </div>

                    <div className="anime-hero__nav-buttons">
                        <button
                            type="button"
                            onClick={onPrevious}
                            aria-label="Previous anime"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <button
                            type="button"
                            onClick={onNext}
                            aria-label="Next anime"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            <div className="anime-hero__bottom-line">
                <span>WOUGHT+ ORIGINAL SIGNAL</span>
                <span>ANIMATION / {String(activeIndex + 1).padStart(3, "0")}</span>
            </div>
        </section>
    );
}
