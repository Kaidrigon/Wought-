import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import { motion } from "framer-motion";

import {
    ArrowLeft,
} from "lucide-react";

import { useTheme } from "../providers/ThemeProvider";

import {
    getPerson,
} from "../services/api/detailsApi";

import type {
    PersonData,
} from "../types/person";

import "./PersonPage.css";

export default function PersonPage() {

    const { id } = useParams();

    const navigate = useNavigate();

    const { section } = useTheme();

    const [data, setData] =
        useState<PersonData | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const isAnime =
        section === "anime";

    useEffect(() => {

        async function loadPerson() {

            if (!id) {
                setError(
                    "Missing person ID."
                );

                setLoading(false);

                return;
            }

            const numericId =
                Number(id);

            if (
                !Number.isFinite(
                    numericId
                )
            ) {
                setError(
                    "Invalid person ID."
                );

                setLoading(false);

                return;
            }

            setLoading(true);

            setError("");

            setData(null);

            try {

                const result =
                    await getPerson(
                        numericId,
                        isAnime
                            ? "anime"
                            : "cinema"
                    );

                setData(result);

            } catch (personError) {

                setData(null);

                setError(
                    personError instanceof Error
                        ? personError.message
                        : "Unable to load this person."
                );

            } finally {

                setLoading(false);

            }
        }

        loadPerson();

    }, [
        id,
        isAnime,
    ]);

    function goBack() {
        navigate(-1);
    }

    function openCredit(
        creditId: number,
        mediaType?: string | null
    ) {

        /*
         * =================================================
         * ANIME
         * =================================================
         *
         * AniList media IDs must stay inside the
         * anime detail route.
         */

        if (isAnime) {

            navigate(
                `/anime/anime/${creditId}`
            );

            return;
        }

        /*
         * =================================================
         * CINEMA
         * =================================================
         *
         * TMDB credits use movie / tv routes.
         */

        if (
            mediaType === "tv"
        ) {

            navigate(
                `/cinema/tv/${creditId}`
            );

            return;
        }

        navigate(
            `/cinema/movie/${creditId}`
        );
    }

    if (loading) {

        return (
            <main
                className={`person-page ${
                    isAnime
                        ? "person-page--anime"
                        : "person-page--cinema"
                }`}
            >

                <div className="person-loading">

                    <div className="person-loading__orb" />

                    <p>
                        digging through the archives...
                    </p>

                </div>

            </main>
        );
    }

    if (
        error ||
        !data
    ) {

        return (
            <main
                className={`person-page ${
                    isAnime
                        ? "person-page--anime"
                        : "person-page--cinema"
                }`}
            >

                <div className="person-error">

                    <span>
                        404
                    </span>

                    <h1>
                        Who the hell is this?
                    </h1>

                    <p>
                        Either this person doesn't exist,
                        or the Wought+ archives decided
                        to stop cooperating.
                    </p>

                    <button
                        type="button"
                        onClick={goBack}
                    >

                        <ArrowLeft
                            size={17}
                        />

                        Go back

                    </button>

                </div>

            </main>
        );
    }

    return (
        <main
            className={`person-page ${
                isAnime
                    ? "person-page--anime"
                    : "person-page--cinema"
            }`}
        >

            {/* =========================================
                HEADER
            ========================================= */}

            <motion.section
                className="person-header"
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
                }}
            >

                <button
                    type="button"
                    className="person-header__back"
                    onClick={goBack}
                >

                    <ArrowLeft
                        size={17}
                    />

                    Back

                </button>

                <div className="person-header__content">

                    {data.profile_link ? (

                        <motion.img
                            src={
                                data.profile_link
                            }
                            alt={
                                data.name
                            }
                            className="person-header__image"
                            initial={{
                                opacity: 0,
                                scale: 0.96,
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                            }}
                            transition={{
                                duration: 0.6,
                            }}
                        />

                    ) : (

                        <div className="person-header__placeholder">
                            ?
                        </div>

                    )}

                    <div className="person-header__details">

                        <div className="person-section-label">

                            <span />

                            <p>
                                PERSON
                            </p>

                        </div>

                        <h1>
                            {data.name}
                        </h1>

                        {data.known_for_department && (

                            <p className="person-header__department">
                                {data.known_for_department}
                            </p>

                        )}

                    </div>

                </div>

            </motion.section>


            {/* =========================================
                INFORMATION
            ========================================= */}

            <motion.section
                className="person-information"
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

                <div className="person-section-label">

                    <span />

                    <p>
                        ARCHIVE DATA
                    </p>

                </div>

                <div className="person-information__grid">

                    {data.birthday && (

                        <div>

                            <small>
                                Birthday
                            </small>

                            <strong>
                                {data.birthday}
                            </strong>

                        </div>

                    )}

                    {data.deathday && (

                        <div>

                            <small>
                                Deathday
                            </small>

                            <strong>
                                {data.deathday}
                            </strong>

                        </div>

                    )}

                    {data.place_of_birth && (

                        <div>

                            <small>
                                Place of birth
                            </small>

                            <strong>
                                {data.place_of_birth}
                            </strong>

                        </div>

                    )}

                    {data.known_for_department && (

                        <div>

                            <small>
                                Department
                            </small>

                            <strong>
                                {data.known_for_department}
                            </strong>

                        </div>

                    )}

                </div>

            </motion.section>


            {/* =========================================
                BIOGRAPHY
            ========================================= */}

            {data.biography && (

                <motion.section
                    className="person-biography"
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
                        delay: 0.15,
                    }}
                >

                    <div className="person-section-label">

                        <span />

                        <p>
                            BIOGRAPHY
                        </p>

                    </div>

                    <p className="person-biography__text">
                        {data.biography}
                    </p>

                </motion.section>

            )}


            {/* =========================================
                KNOWN FOR
            ========================================= */}

            {data.credits.length > 0 && (

                <motion.section
                    className="person-credits"
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
                        delay: 0.2,
                    }}
                >

                    <div className="person-section-label">

                        <span />

                        <p>
                            KNOWN FOR
                        </p>

                    </div>

                    <div className="person-credits__grid">

                        {data.credits
                            .slice(0, 20)
                            .map((credit) => (

                                <button
                                    key={`${credit.media_type}-${credit.id}-${credit.title}`}
                                    type="button"
                                    className="person-credit-card"
                                    onClick={() =>
                                        openCredit(
                                            credit.id,
                                            credit.media_type
                                        )
                                    }
                                >

                                    <div className="person-credit-card__poster">

                                        {credit.poster_link ? (

                                            <img
                                                src={
                                                    credit.poster_link
                                                }
                                                alt={
                                                    credit.title
                                                }
                                            />

                                        ) : (

                                            <div className="person-credit-card__placeholder">
                                                ?
                                            </div>

                                        )}

                                    </div>

                                    <div className="person-credit-card__content">

                                        <strong>
                                            {credit.title}
                                        </strong>

                                        {credit.character && (

                                            <span>
                                                {credit.character}
                                            </span>

                                        )}

                                        {credit.job && (

                                            <span>
                                                {credit.job}
                                            </span>

                                        )}

                                        {credit.release_date && (

                                            <small>
                                                {
                                                    credit.release_date.slice(
                                                        0,
                                                        4
                                                    )
                                                }
                                            </small>

                                        )}

                                    </div>

                                </button>

                            ))}

                    </div>

                </motion.section>

            )}

        </main>
    );
}
