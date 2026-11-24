
import { Link } from "react-router-dom";
import { Play } from "lucide-react";

import type {
    AnimeContinueWatchingItem,
} from "../../../hooks/anime/useAnimeContinueWatching";

import "./AnimeContinueWatchingCard.css";

type AnimeContinueWatchingCardProps = {
    anime: AnimeContinueWatchingItem;
};

export default function AnimeContinueWatchingCard({
    anime,
}: AnimeContinueWatchingCardProps) {
    const watchUrl =
        `/anime/anime/${anime.media_id}/watch` +
        `?episode=${anime.episode}` +
        `&season=${anime.season}`;

    const formatTime = (seconds: number) => {
        const safeSeconds = Math.max(
            0,
            Math.floor(seconds)
        );

        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor(
            (safeSeconds % 3600) / 60
        );

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }

        return `${minutes}m`;
    };

    const remainingTime =
        anime.duration > anime.current_time
            ? anime.duration - anime.current_time
            : 0;

    return (
        <Link
            to={watchUrl}
            className="anime-continue-card"
            aria-label={`Continue watching ${anime.title}, episode ${anime.episode}`}
        >
            <div className="anime-continue-card__poster">
                {anime.poster ? (
                    <img
                        src={anime.poster}
                        alt={anime.title}
                        loading="lazy"
                    />
                ) : (
                    <div className="anime-continue-card__poster-placeholder">
                        <span>W+</span>
                    </div>
                )}

                <div className="anime-continue-card__overlay">
                    <span className="anime-continue-card__play">
                        <Play size={22} fill="currentColor" />
                    </span>
                </div>

                <div className="anime-continue-card__episode-tag">
                    S{anime.season} · EP {anime.episode}
                </div>

                <div className="anime-continue-card__progress">
                    <span
                        style={{
                            width: `${anime.percentage}%`,
                        }}
                    />
                </div>
            </div>

            <div className="anime-continue-card__information">
                <h3 title={anime.title}>
                    {anime.title}
                </h3>

                <div className="anime-continue-card__metadata">
                    <span>
                        Episode {anime.episode}
                    </span>

                    {anime.duration > 0 && (
                        <>
                            <span className="anime-continue-card__separator">
                                /
                            </span>

                            <span>
                                {formatTime(remainingTime)} left
                            </span>
                        </>
                    )}
                </div>
            </div>
        </Link>
    );
}
