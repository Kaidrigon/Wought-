import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";

import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Languages,
} from "lucide-react";

import AnimeVideoPlayer from "../components/player/AnimeVideoPlayer";

import {
    buildAnimePlayerUrl,
    clearAnimePlayerRequest,
} from "../services/player/animePlayerManager";

import type {
    AnimePlayerEvent,
    AnimePlayerLanguage,
    AnimePlayerProviderId,
} from "../services/player/animeTypes";

import "./AnimeWatchPage.css";


/*
 * =================================================
 * PROVIDER CONFIGURATION
 * =================================================
 */

const MEGAPLAY_BASE_URL =
    import.meta.env.VITE_MEGAPLAY_BASE_URL ||
    "https://megaplay.buzz";

const FRAMEXTV_BASE_URL =
    import.meta.env.VITE_ANIME_FRAMEXTV_BASE_URL ||
    "https://framextv.tech";


/*
 * =================================================
 * ANIME WATCH PAGE
 * =================================================
 */

export default function AnimeWatchPage() {

    const navigate =
        useNavigate();

    const {
        id,
    } = useParams<{
        id: string;
    }>();

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();


    /*
     * =================================================
     * ANIME / EPISODE
     * =================================================
     */

    const animeId =
        Number(id);

    const episodeParam =
        Number(
            searchParams.get(
                "episode"
            ) ?? "1"
        );

    const episode =
        Number.isInteger(
            episodeParam
        ) &&
        episodeParam > 0
            ? episodeParam
            : 1;


    /*
     * =================================================
     * SEASON
     * =================================================
     *
     * frameXTV requires a season number.
     *
     * The current Wought+ anime route does not
     * expose seasons yet, so season 1 is used
     * by default.
     */

    const seasonParam =
        Number(
            searchParams.get(
                "season"
            ) ?? "1"
        );

    const season =
        Number.isInteger(
            seasonParam
        ) &&
        seasonParam > 0
            ? seasonParam
            : 1;


    /*
     * =================================================
     * LANGUAGE
     * =================================================
     */

    const languageParam =
        searchParams.get(
            "lang"
        );

    const language:
        AnimePlayerLanguage =
        languageParam === "dub"
            ? "dub"
            : "sub";


    /*
     * =================================================
     * PROVIDER
     * =================================================
     *
     * MegaPlay remains the default provider.
     */

    const [
        selectedProviderId,
        setSelectedProviderId,
    ] = useState<
        AnimePlayerProviderId
    >(
        "megaplay"
    );


    /*
     * =================================================
     * PLAYER
     * =================================================
     */

    const [
        player,
        setPlayer,
    ] = useState<{
        url:
            string;

        title:
            string;

    } | null>(
        null
    );


    const [
        error,
        setError,
    ] = useState<
        string | null
    >(
        null
    );


    /*
     * =================================================
     * VALID ID
     * =================================================
     */

    const validAnimeId =
        useMemo(() => {

            return (
                Number.isInteger(
                    animeId
                ) &&
                animeId > 0
            );

        }, [
            animeId,
        ]);


    /*
     * =================================================
     * BUILD PLAYER
     * =================================================
     *
     * This intentionally uses buildAnimePlayerUrl()
     * instead of buildAnimePlayer().
     *
     * buildAnimePlayer() automatically chooses the
     * highest-priority provider.
     *
     * buildAnimePlayerUrl() lets the user explicitly
     * choose MegaPlay or frameXTV.
     */

    useEffect(() => {

        if (
            !validAnimeId
        ) {

            setPlayer(
                null
            );

            setError(
                "That anime ID is not valid."
            );

            return;
        }

        setError(
            null
        );

        const result =
            buildAnimePlayerUrl(
                {
                    anilistId:
                        animeId,

                    season:
                        season,

                    episode:
                        episode,

                    language:
                        language,

                    autoplay:
                        true,

                    startAt:
                        null,
                },

                selectedProviderId,

                {
                    /*
                     * Fallback value.
                     *
                     * Each provider receives its own
                     * base URL through providerBaseUrls.
                     */

                    baseUrl:
                        MEGAPLAY_BASE_URL,

                    providerBaseUrls: {

                        megaplay:
                            MEGAPLAY_BASE_URL,

                        framextv:
                            FRAMEXTV_BASE_URL,

                    },

                    language:
                        language,

                    autoplay:
                        true,
                }
            );


        if (!result) {

            setPlayer(
                null
            );

            setError(
                `Wought+ couldn't build ${selectedProviderId} for this episode.`
            );

            return;
        }


        setPlayer({

            url:
                result.url,

            title:
                `Episode ${episode}`,

        });


        return () => {

            clearAnimePlayerRequest();

        };

    }, [
        animeId,
        episode,
        season,
        language,
        selectedProviderId,
        validAnimeId,
    ]);


    /*
     * =================================================
     * EPISODE
     * =================================================
     */

    function changeEpisode(
        nextEpisode:
            number
    ) {

        if (
            nextEpisode < 1
        ) {

            return;
        }

        setSearchParams({

            episode:
                String(
                    nextEpisode
                ),

            lang:
                language,

            ...(season > 1
                ? {
                    season:
                        String(
                            season
                        ),
                }
                : {}),
        });
    }


    /*
     * =================================================
     * LANGUAGE
     * =================================================
     */

    function changeLanguage(
        nextLanguage:
            AnimePlayerLanguage
    ) {

        setSearchParams({

            episode:
                String(
                    episode
                ),

            lang:
                nextLanguage,

            ...(season > 1
                ? {
                    season:
                        String(
                            season
                        ),
                }
                : {}),
        });
    }


    /*
     * =================================================
     * PROVIDER
     * =================================================
     */

    function changeProvider(
        providerId:
            AnimePlayerProviderId
    ) {

        if (
            providerId ===
            selectedProviderId
        ) {

            return;
        }

        setSelectedProviderId(
            providerId
        );
    }


    /*
     * =================================================
     * PLAYER EVENTS
     * =================================================
     */

    function handlePlayerEvent(
        event:
            AnimePlayerEvent
    ) {

        if (
            event.status ===
            "completed"
        ) {

            changeEpisode(
                episode + 1
            );
        }
    }


    /*
     * =================================================
     * ERROR
     * =================================================
     */

    if (
        error
    ) {

        return (

            <div className="anime-watch-page">

                <div className="anime-watch-page__state">

                    <button
                        type="button"
                        className="anime-watch-page__back"
                        onClick={() =>
                            navigate(
                                `/anime/anime/${animeId}`
                            )
                        }
                    >

                        <ArrowLeft
                            size={18}
                        />

                        <span>
                            Back
                        </span>

                    </button>

                    <h1>
                        {error}
                    </h1>

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

        <div className="anime-watch-page">

            <div className="anime-watch-page__topbar">

                <button
                    type="button"
                    className="anime-watch-page__back"
                    onClick={() =>
                        navigate(
                            `/anime/anime/${animeId}`
                        )
                    }
                >

                    <ArrowLeft
                        size={18}
                    />

                    <span>
                        Back
                    </span>

                </button>

            </div>


            <section className="anime-watch-page__player">

                {player ? (

                    <AnimeVideoPlayer

                        key={`${selectedProviderId}:${player.url}`}

                        url={
                            player.url
                        }

                        title={
                            player.title
                        }

                        onEvent={
                            handlePlayerEvent
                        }

                    />

                ) : (

                    <div className="anime-watch-page__player-state">

                        <span>
                            Preparing player...
                        </span>

                    </div>

                )}

            </section>


            <section className="anime-watch-page__controls">


                {/* =====================================
                    EPISODE CONTROLS
                    ===================================== */}

                <div className="anime-watch-page__episode-controls">

                    <button
                        type="button"
                        className="anime-watch-page__control"
                        disabled={
                            episode <= 1
                        }
                        onClick={() =>
                            changeEpisode(
                                episode - 1
                            )
                        }
                        aria-label="Previous episode"
                    >

                        <ChevronLeft
                            size={21}
                        />

                        <span>
                            Previous
                        </span>

                    </button>


                    <div className="anime-watch-page__episode">

                        <span>
                            EPISODE
                        </span>

                        <strong>
                            {episode}
                        </strong>

                    </div>


                    <button
                        type="button"
                        className="anime-watch-page__control"
                        onClick={() =>
                            changeEpisode(
                                episode + 1
                            )
                        }
                        aria-label="Next episode"
                    >

                        <span>
                            Next
                        </span>

                        <ChevronRight
                            size={21}
                        />

                    </button>

                </div>


                {/* =====================================
                    LANGUAGE
                    ===================================== */}

                <div className="anime-watch-page__language">

                    <Languages
                        size={18}
                    />

                    <div className="anime-watch-page__language-switch">

                        <button
                            type="button"
                            className={
                                language ===
                                "sub"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeLanguage(
                                    "sub"
                                )
                            }
                        >
                            SUB
                        </button>

                        <button
                            type="button"
                            className={
                                language ===
                                "dub"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeLanguage(
                                    "dub"
                                )
                            }
                        >
                            DUB
                        </button>

                    </div>

                </div>


                {/* =====================================
                    PROVIDER
                    ===================================== */}

                <div className="anime-watch-page__provider">

                    <span className="anime-watch-page__provider-label">
                        PROVIDER
                    </span>

                    <div className="anime-watch-page__provider-switch">

                        <button
                            type="button"
                            className={
                                selectedProviderId ===
                                "megaplay"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeProvider(
                                    "megaplay"
                                )
                            }
                        >
                            MegaPlay
                        </button>

                        <button
                            type="button"
                            className={
                                selectedProviderId ===
                                "framextv"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeProvider(
                                    "framextv"
                                )
                            }
                        >
                            frameXTV
                        </button>

                    </div>

                </div>

            </section>

        </div>
    );
}