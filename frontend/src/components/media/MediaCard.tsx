import type { HeroData } from "../../types/hero";

import "./MediaCard.css";


type MediaCardProps = {
    media: HeroData;
};


export default function MediaCard({
    media,
}: MediaCardProps) {

    return (

        <article className="media-card">

            <div className="media-card__poster">

                {media.poster_link ? (

                    <img
                        src={media.poster_link}
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

        </article>

    );

}