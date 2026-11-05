import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import type { AnimeData } from "../../types/anime";

import "./AnimeMediaCard.css";

interface AnimeMediaCardProps {
    anime: AnimeData;
    index?: number;
}

export default function AnimeMediaCard({
    anime,
    index = 0,
}: AnimeMediaCardProps) {
    const detailPath = `/anime/movie/${anime.anilist_id}`;

    return (
        <motion.div
            className="anime-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.45,
                delay: Math.min(index * 0.045, 0.35),
            }}
        >
            <Link
                to={detailPath}
                className="anime-card__link"
                aria-label={`View details for ${anime.title}`}
            >
                <div className="anime-card__poster-wrap">
                    {anime.poster_link ? (
                        <img
                            className="anime-card__poster"
                            src={anime.poster_link}
                            alt={anime.title}
                            loading="lazy"
                        />
                    ) : (
                        <div className="anime-card__placeholder">
                            <span>ARTWORK MISSING</span>
                        </div>
                    )}

                    <div className="anime-card__overlay" />

                    <span className="anime-card__format">
                        {anime.media_type === "movie" ? "FILM" : "SERIES"}
                    </span>

                    <span className="anime-card__number">
                        {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="anime-card__bottom">
                        <span className="anime-card__year">
                            {anime.release_date || "YEAR UNKNOWN"}
                        </span>

                        <span className="anime-card__arrow">↗</span>
                    </div>
                </div>

                <div className="anime-card__info">
                    <h3 className="anime-card__title">
                        {anime.title}
                    </h3>

                    <p className="anime-card__genres">
                        {anime.genres.slice(0, 3).join(" / ") || "UNCLASSIFIED"}
                    </p>
                </div>
            </Link>
        </motion.div>
    );
}