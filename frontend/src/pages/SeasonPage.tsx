import { useEffect, useState } from "react";

import { Link, useParams } from "react-router-dom";
import "./SeasonPage.css";

import {
    ArrowLeft,
    Calendar,
    Clock,
    Star,
} from "lucide-react";

import {
    getTVSeason,
} from "../services/api/detailsApi";

import type {
    SeasonData,
} from "../types/seasons";


export default function SeasonPage() {

    const {
        tv_id,
        season_number,
    } = useParams<{
        tv_id: string;
        season_number: string;
    }>();


    const [season, setSeason] =
        useState<SeasonData | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);


    useEffect(() => {

        if (!tv_id || !season_number) {
            setError(
                "Invalid season URL."
            );

            setLoading(false);

            return;
        }


        const loadSeason =
            async () => {

                try {

                    setLoading(true);

                    setError(null);


                    const data =
                        await getTVSeason(
                            Number(tv_id),
                            Number(season_number)
                        );


                    setSeason(data);

                } catch (err) {

                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load this season."
                    );

                } finally {

                    setLoading(false);

                }

            };


        loadSeason();

    }, [
        tv_id,
        season_number,
    ]);


    /*
     * =================================================
     * LOADING
     * =================================================
     */

    if (loading) {

        return (

            <div className="season-page">

                <div className="season-loading">

                    <div className="season-loading__orb" />

                    <p>
                        Loading season...
                    </p>

                </div>

            </div>

        );

    }


    /*
     * =================================================
     * ERROR
     * =================================================
     */

    if (error || !season) {

        return (

            <div className="season-page">

                <div className="season-error">

                    <span>
                        SEASON ERROR
                    </span>

                    <h1>
                        This season refused to show up.
                    </h1>

                    <p>
                        {error ||
                            "Unable to load this season."}
                    </p>

                    <Link
                        to={`/cinema/tv/${tv_id}`}
                        className="season-error__back"
                    >
                        <ArrowLeft size={16} />

                        Back to series

                    </Link>

                </div>

            </div>

        );

    }


    /*
     * =================================================
     * PAGE
     * =================================================
     */

    return (

        <div className="season-page">


            {/* =========================================
                HEADER
            ========================================== */}

            <section className="season-header">

                <div className="season-header__back">

                    <Link
                        to={`/cinema/tv/${tv_id}`}
                    >
                        <ArrowLeft size={16} />

                        Back to series
                    </Link>

                </div>


                <div className="season-header__content">


                    {season.poster_link && (

                        <img
                            src={season.poster_link}
                            alt={season.name}
                            className="season-header__poster"
                        />

                    )}


                    <div className="season-header__info">

                        <span className="season-header__eyebrow">
                            SEASON {season.season_number}
                        </span>


                        <h1>
                            {season.name}
                        </h1>


                        {season.overview && (

                            <p className="season-header__overview">
                                {season.overview}
                            </p>

                        )}


                        <div className="season-header__meta">

                            {season.air_date && (

                                <span>

                                    <Calendar
                                        size={15}
                                    />

                                    {new Date(
                                        season.air_date
                                    ).getFullYear()}

                                </span>

                            )}


                            <span>

                                {season.episode_count ?? 0}

                                {" "}

                                {season.episode_count === 1
                                    ? "episode"
                                    : "episodes"}

                            </span>

                        </div>

                    </div>

                </div>

            </section>


            {/* =========================================
                EPISODES
            ========================================== */}

            <section className="season-episodes">

                <div className="season-section-heading">

                    <span />

                    <p>
                        EPISODES
                    </p>

                </div>


                <div className="season-episodes__list">

                    {season.episodes.length === 0 ? (

                        <div className="season-empty">

                            No episodes found.

                        </div>

                    ) : (

                        season.episodes.map(
                            (episode) => (

                                <Link
    key={episode.id}
    to={`/cinema/tv/${tv_id}/season/${season_number}/episode/${episode.episode_number}/watch`}
    className="season-episode"
>


                                    <div className="season-episode__image">

                                        {episode.still_link ? (

                                            <img
                                                src={
                                                    episode.still_link
                                                }
                                                alt={
                                                    episode.name
                                                }
                                                loading="lazy"
                                            />

                                        ) : (

                                            <div className="season-episode__image--empty">
                                                NO IMAGE
                                            </div>

                                        )}

                                    </div>


                                    <div className="season-episode__content">

                                        <div className="season-episode__top">

                                            <span className="season-episode__number">

                                                E
                                                {String(
                                                    episode.episode_number
                                                ).padStart(
                                                    2,
                                                    "0"
                                                )}

                                            </span>


                                            <h2>
                                                {episode.name}
                                            </h2>

                                        </div>


                                        {episode.overview && (

                                            <p>
                                                {
                                                    episode.overview
                                                }
                                            </p>

                                        )}


                                        <div className="season-episode__meta">


                                            {episode.air_date && (

                                                <span>

                                                    <Calendar
                                                        size={14}
                                                    />

                                                    {episode.air_date}

                                                </span>

                                            )}


                                            {episode.runtime && (

                                                <span>

                                                    <Clock
                                                        size={14}
                                                    />

                                                    {
                                                        episode.runtime
                                                    }
                                                    min

                                                </span>

                                            )}


                                            {episode.rating != null && (

                                                <span>

                                                    <Star
                                                        size={14}
                                                    />

                                                    {
                                                        episode.rating.toFixed(
                                                            1
                                                        )
                                                    }

                                                </span>

                                            )}

                                        </div>

                                    </div>

                                </Link>

                            )
                        )

                    )}

                </div>

            </section>

        </div>

    );

}