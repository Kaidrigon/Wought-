import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../services/api/api";
import type { HeroData } from "../../types/hero";

import "./MediaCard.css";

type MediaCardProps = {
    media: HeroData;
};

export default function MediaCard({
    media,
}: MediaCardProps) {
    const detailPath =
        media.media_type === "movie"
            ? `/cinema/movie/${media.tmdb_id}`
            : `/cinema/tv/${media.tmdb_id}`;
const posterSrc = media.poster_link
    ? media.poster_link.startsWith("http")
        ? media.poster_link
        : `${API_BASE_URL}${media.poster_link}`
    : null;
    return (
        <Link
            to={detailPath}
            className="media-card"
            aria-label={`View details for ${media.title}`}
        >
            <div className="media-card__poster">
                {posterSrc ? (
                    <img
                        src={posterSrc}
                        alt={media.title}
                        loading="lazy"
                    />
                ) : (
                    <div className="media-card__placeholder">
                        No poster
                    </div>
                )}
            </div>

            <div className="media-card__info">
                <h3 className="media-card__title">
                    {media.title}
                </h3>

                <div className="media-card__meta">
                    {media.release_date && (
                        <span>
                            {media.release_date.slice(0, 4)}
                        </span>
                    )}

                    <span>
                        {media.media_type === "movie"
                            ? "Movie"
                            : "TV"}
                    </span>
                </div>
            </div>
        </Link>
    );
}
