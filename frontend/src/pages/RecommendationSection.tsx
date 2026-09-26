import { useEffect, useState } from "react";

import { motion } from "framer-motion";

import { ChevronRight, Star } from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useTheme } from "../providers/ThemeProvider";

import {
    getAnimeRecommendations,
    getMovieRecommendations,
    getTVRecommendations,
} from "../services/api/detailsApi";

import {
    API_BASE_URL,
} from "../services/api/api";

import type { DetailsType } from "../types/details";

import type {
    RecommendationItem,
} from "../types/recommendations";

import "./RecommendationSection.css";

type RecommendationSectionProps = {
    type: DetailsType;
    id: number;
};

/* =========================================================
   IMAGE URL NORMALIZATION
   ========================================================= */

function normalizeImageUrl(
    value?: string | null
) {
    if (!value) {
        return null;
    }

    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        return value;
    }

    if (value.startsWith("/")) {
        return `${API_BASE_URL}${value}`;
    }

    return value;
}

/* =========================================================
   RECOMMENDATION SECTION
   ========================================================= */

export default function RecommendationSection({
    type,
    id,
}: RecommendationSectionProps) {

    const navigate = useNavigate();

    const { section } = useTheme();

    const isAnime = section === "anime";

    const [recommendations, setRecommendations] =
        useState<RecommendationItem[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    /* =====================================================
       LOAD RECOMMENDATIONS
       ===================================================== */

    useEffect(() => {

        let cancelled = false;

        async function loadRecommendations() {

            setLoading(true);
            setError("");

            try {

                let result: RecommendationItem[];

                if (type === "anime") {

                    result =
                        await getAnimeRecommendations(id);

                } else if (type === "tv") {

                    result =
                        await getTVRecommendations(id);

                } else {

                    result =
                        await getMovieRecommendations(id);

                }

                if (cancelled) {
                    return;
                }

                setRecommendations(result);

            } catch (recommendationError) {

                if (cancelled) {
                    return;
                }

                console.error(
                    "Wought+ recommendations failed:",
                    recommendationError
                );

                setRecommendations([]);

                setError(
                    recommendationError instanceof Error
                        ? recommendationError.message
                        : "Unable to load recommendations."
                );

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }

            }

        }

        loadRecommendations();

        return () => {
            cancelled = true;
        };

    }, [id, type]);

    /* =====================================================
       NAVIGATION
       ===================================================== */

    function openRecommendation(
        recommendation: RecommendationItem
    ) {

        if (
            isAnime ||
            recommendation.media_type === "anime"
        ) {

            if (!recommendation.anilist_id) {
                return;
            }

            navigate(
                `/anime/anime/${recommendation.anilist_id}`
            );

            return;
        }

        if (!recommendation.tmdb_id) {
            return;
        }

        if (
            recommendation.media_type === "tv"
        ) {

            navigate(
                `/cinema/tv/${recommendation.tmdb_id}`
            );

            return;
        }

        navigate(
            `/cinema/movie/${recommendation.tmdb_id}`
        );
    }

    /* =====================================================
       EMPTY STATE
       ===================================================== */

    if (
        !loading &&
        recommendations.length === 0
    ) {
        return null;
    }

    /* =====================================================
       PAGE
       ===================================================== */

    return (

        <motion.section
            className={`recommendation-section ${
                isAnime
                    ? "recommendation-section--anime"
                    : "recommendation-section--cinema"
            }`}
            initial={{
                opacity: 0,
                y: 20,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
            transition={{
                duration: 0.6,
                delay: 0.1,
            }}
        >

            {/* HEADER */}

            <div className="recommendation-section__header">

                <div className="recommendation-section__heading">

                    <span />

                    <div>

                        <p>
                            {isAnime
                                ? "THE ALGORITHM"
                                : "Wought+ PICKS"}
                        </p>

                        <h2>
                            {isAnime
                                ? "You might like these too"
                                : "You might regret these too"}
                        </h2>

                    </div>

                </div>

                {!loading &&
                    recommendations.length > 0 && (

                        <span className="recommendation-section__count">

                            {recommendations.length} picks

                        </span>

                    )}

            </div>

            {/* CONTENT */}

            {loading ? (

                <div className="recommendation-section__loading">

                    {Array.from({
                        length: 6,
                    }).map((_, index) => (

                        <div
                            key={index}
                            className="recommendation-card recommendation-card--skeleton"
                        >

                            <div className="recommendation-card__poster" />

                            <div className="recommendation-card__skeleton-line" />

                            <div className="recommendation-card__skeleton-line recommendation-card__skeleton-line--short" />

                        </div>

                    ))}

                </div>

            ) : error ? (

                <div className="recommendation-section__empty">

                    <span>
                        THE ALGORITHM FAILED
                    </span>

                    <p>
                        even the recommendations gave up.
                    </p>

                </div>

            ) : (

                <div className="recommendation-section__rail">

                    {recommendations.map(
                        (recommendation) => (

                            <RecommendationCard
                                key={`${
                                    recommendation.media_type
                                }-${
                                    recommendation.tmdb_id ??
                                    recommendation.anilist_id
                                }`}
                                recommendation={
                                    recommendation
                                }
                                onClick={() =>
                                    openRecommendation(
                                        recommendation
                                    )
                                }
                            />

                        )
                    )}

                </div>

            )}

        </motion.section>
    );
}

/* =========================================================
   RECOMMENDATION CARD
   ========================================================= */

function RecommendationCard({
    recommendation,
    onClick,
}: {
    recommendation: RecommendationItem;
    onClick: () => void;
}) {

    const title =
        recommendation.title ||
        "Untitled";

    const year =
        recommendation.release_date &&
        recommendation.release_date !== "Unknown"
            ? recommendation.release_date.slice(0, 4)
            : null;

    const mediaLabel =
        recommendation.media_type === "anime"
            ? "ANIME"
            : recommendation.media_type === "tv"
                ? "TV"
                : "MOVIE";

    const rating =
        recommendation.rating != null
            ? recommendation.media_type === "anime"
                ? recommendation.rating / 10
                : recommendation.rating
            : null;

    /* =====================================================
       NORMALIZE POSTER URL
       ===================================================== */

    const posterUrl =
        normalizeImageUrl(
            recommendation.poster_link
        );

    return (

        <motion.button
            type="button"
            className="recommendation-card"
            onClick={onClick}
            whileHover={{
                y: -6,
            }}
            whileTap={{
                scale: 0.98,
            }}
        >

            {/* POSTER */}

            <div className="recommendation-card__poster">

                {posterUrl ? (

                    <img
                        src={posterUrl}
                        alt={title}
                        loading="lazy"
                    />

                ) : (

                    <div className="recommendation-card__placeholder">

                        ?

                    </div>

                )}

                <div className="recommendation-card__overlay" />

                <div className="recommendation-card__media">

                    {mediaLabel}

                </div>

                {rating != null && (

                    <div className="recommendation-card__rating">

                        <Star
                            size={11}
                            fill="currentColor"
                        />

                        {rating.toFixed(1)}

                    </div>

                )}

            </div>

            {/* CARD CONTENT */}

            <div className="recommendation-card__content">

                <strong>
                    {title}
                </strong>

                <div className="recommendation-card__meta">

                    {year && (
                        <span>
                            {year}
                        </span>
                    )}

                    {year && <i />}

                    <span>
                        {mediaLabel}
                    </span>

                </div>

            </div>

            <ChevronRight
                size={15}
                className="recommendation-card__arrow"
            />

        </motion.button>
    );
}