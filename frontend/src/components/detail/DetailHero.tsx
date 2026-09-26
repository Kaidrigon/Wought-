import { useState } from "react";
import { Play, Plus, Star, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

import type { DetailsData } from "../../types/details";
import { TRAILER_BUTTON_LINES } from "../../data/trailerButtonLines";

import "./DetailHero.css";

type DetailHeroProps = {
    data: DetailsData;
    displayDescription: string;
    isRoastRevealing: boolean;
    roastStatus: string;
    onWatch: () => void;
    onAddToList: () => void;

};
export default function DetailHero({
    data,
    displayDescription,
    isRoastRevealing,
    roastStatus,
    onWatch,
    onAddToList,
}: DetailHeroProps) {
    const [trailerText] = useState(
        () =>
            TRAILER_BUTTON_LINES[
                Math.floor(
                    Math.random() * TRAILER_BUTTON_LINES.length
                )
            ]
    );

    const title = data.title || "Untitled";

    const releaseYear =
        data.release_date?.slice(0, 4) ||
        data.first_air_date?.slice(0, 4) ||
        data.year ||
        null;

    const runtimeText =
        data.runtime && data.runtime > 0
            ? `${data.runtime} min`
            : null;

    const rating =
        typeof data.rating === "number"
            ? data.rating.toFixed(1)
            : null;

    const heroImage =
        data.backdrop_link ||
        data.banner_link ||
        data.poster_link ||
        null;

    const genres = Array.isArray(data.genres)
        ? data.genres
        : [];

    const trailer = data.trailer || null;

    return (
        <section className="detail-hero">
            {heroImage && (
                <motion.img
                    className="detail-hero__background"
                    src={heroImage}
                    alt=""
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        duration: 0.8,
                        ease: "easeOut",
                    }}
                />
            )}

            <div className="detail-hero__wash" />
            <div className="detail-hero__bottom-fade" />

            <motion.div
                className="detail-hero__content"
                initial={{
                    opacity: 0,
                    y: 24,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                transition={{
                    duration: 0.55,
                    ease: "easeOut",
                }}
            >
                <div className="detail-hero__eyebrow">
                    <span />
                    {data.format || "FEATURE"}
                </div>

                {data.logo_link ? (
                    <img
                        className="detail-hero__logo"
                        src={data.logo_link}
                        alt={title}
                    />
                ) : (
                    <h1 className="detail-hero__title">
                        {title}
                    </h1>
                )}

                {data.logo_link && (
                    <h1 className="detail-hero__title detail-hero__title--fallback">
                        {title}
                    </h1>
                )}

                {data.tagline && (
                    <p className="detail-hero__tagline">
                        {data.tagline}
                    </p>
                )}

                <div className="detail-meta">
                    {releaseYear && (
                        <span>{releaseYear}</span>
                    )}

                    {releaseYear && runtimeText && <i />}

                    {runtimeText && (
                        <span>{runtimeText}</span>
                    )}

                    {rating && (
                        <>
                            <i />

                            <span className="detail-meta__rating">
                                <Star
                                    size={13}
                                    fill="currentColor"
                                />
                                {rating}
                            </span>
                        </>
                    )}
                </div>

                {genres.length > 0 && (
                    <div className="detail-genres">
                        {genres.map((genre, index) => (
                            <span
                                key={`${genre}-${index}`}
                            >
                                {genre}
                            </span>
                        ))}
                    </div>
                )}

                
    {displayDescription && (
    <div
        className={`detail-description ${
            isRoastRevealing
                ? "detail-description--roasting"
                : ""
        }`}
    >
        <p>
            <span className="detail-description__text">
                {displayDescription}
            </span>
            {isRoastRevealing && (
                <span
                    className="detail-description__cursor"
                    aria-hidden="true"
                />
            )}
        </p>
        {roastStatus && (
            <span className="detail-description__status">
                {roastStatus}
            </span>
        )}
    </div>

)}

                <div className="detail-actions">
                    <button
                        type="button"
                        className="detail-actions__watch"
                        onClick={onWatch}
                    >
                        <Play
                            size={17}
                            fill="currentColor"
                        />
                        Watch
                    </button>

                    {trailer && (
                        <button
                            type="button"
                            className="detail-actions__trailer"
                            onClick={() => {
                                window.open(
                                    trailer,
                                    "_blank",
                                    "noopener,noreferrer"
                                );
                            }}
                        >
                            <ExternalLink size={15} />
                            <span>{trailerText}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        className="detail-actions__list"
                        onClick={onAddToList}
                    >
                        <Plus size={17} />
                        My List
                    </button>
                </div>
            </motion.div>
        </section>
    );
}