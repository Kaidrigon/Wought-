import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    ArrowLeft,
} from "lucide-react";

import {
    useTheme,
} from "../providers/ThemeProvider";

import VideoPlayer from "../components/player/VideoPlayer";

import {
    getDetails,
} from "../services/api/detailsApi";

import {
    buildPlayerUrl,
} from "../services/player/playerManager";

import {
    getLocalProgress,
    saveLocalProgress,
    clearLocalProgress,
} from "../services/player/playerProgress";

import type {
    DetailsData,
} from "../types/details";

import type {
    PlayerEvent,
    PlayerMediaType,
    PlayerProviderId,
    PlayerRequest,
} from "../services/player/types";

import "./WatchPage.css";


/*
 * =================================================
 * API / PLAYER CONFIGURATION
 * =================================================
 */

const API_BASE_URL =
    "http://0.0.0.0:8000";

const PEACHIFY_BASE_URL =
    import.meta.env.VITE_PEACHIFY_BASE_URL ??
    "https://peachify.top";

const FRAMEXTV_BASE_URL = 
    import.meta.env.VITE_FRAMEXTV_BASE_URL ?? 
    "https://framextv.tech";

const CINEMAOS_BASE_URL =
    import.meta.env.VITE_CINEMAOS_BASE_URL ??
    "https://cinemaos.tech";

const VIDSRC_BASE_URL =
    import.meta.env.VITE_VIDSRC_BASE_URL ??
    "https://vidsrc2.ru";


/*
 * =================================================
 * WATCH PAGE
 * =================================================
 */

export default function WatchPage() {
    const {
        id,
        tv_id,
        season_number,
        episode_number,
    } = useParams<{
        id?: string;
        tv_id?: string;
        season_number?: string;
        episode_number?: string;
    }>();

    const location =
        useLocation();

    const navigate =
        useNavigate();

    const { section } =
        useTheme();


    /*
     * =================================================
     * MEDIA TYPE
     * =================================================
     */

    const isAnime =
        section === "anime";

    const isEpisodePage =
        tv_id != null &&
        season_number != null &&
        episode_number != null;

    const isTV =
        !isAnime &&
        (
            isEpisodePage ||
            location.pathname.includes("/tv/")
        );

    const mediaType: PlayerMediaType =
        isTV
            ? "tv"
            : "movie";


    /*
     * =================================================
     * IDS
     * =================================================
     */

    const rawMediaId =
        isEpisodePage
            ? tv_id
            : id;

    const numericMediaId =
        rawMediaId
            ? Number(rawMediaId)
            : NaN;

    const numericSeason =
        season_number != null
            ? Number(season_number)
            : null;

    const numericEpisode =
        episode_number != null
            ? Number(episode_number)
            : null;

    const validMediaId =
        Number.isInteger(
            numericMediaId
        ) &&
        numericMediaId > 0;

    const validEpisode =
        !isEpisodePage ||
        (
            Number.isInteger(
                numericSeason
            ) &&
            numericSeason! > 0 &&
            Number.isInteger(
                numericEpisode
            ) &&
            numericEpisode! > 0
        );


    /*
     * =================================================
     * STATE
     * =================================================
     */

    const [data, setData] =
        useState<DetailsData | null>(
            null
        );

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(
            null
        );


    /*
     * =================================================
     * PROVIDER
     * =================================================
     *
     * Peachify is the default.
     *
     * The user can switch between
     * Peachify, CinemaOS and VidSrc
     * underneath the player.
     */

    const [
            selectedProviderId,
        setSelectedProviderId,
    ] = useState<PlayerProviderId>(
        "cinemaos"
);


    /*
     * =================================================
     * EPISODE IDENTITY
     * =================================================
     *
     * Movies:
     *
     * movie:123
     *
     * TV episodes:
     *
     * tv:123:s1:e5
     *
     * This prevents one episode from overwriting
     * another episode's progress.
     */

    const progressMediaId =
        useMemo(() => {
            if (
                mediaType === "tv" &&
                isEpisodePage &&
                numericSeason != null &&
                numericEpisode != null
            ) {
                return (
                    `tv:${numericMediaId}:` +
                    `s${numericSeason}:` +
                    `e${numericEpisode}`
                );
            }

            return (
                `${mediaType}:${numericMediaId}`
            );
        }, [
            mediaType,
            isEpisodePage,
            numericMediaId,
            numericSeason,
            numericEpisode,
        ]);


    /*
     * =================================================
     * LOAD DETAILS
     * =================================================
     */

    useEffect(() => {
        if (
            isAnime ||
            !validMediaId ||
            !validEpisode
        ) {
            setError(
                isAnime
                    ? "Anime playback isn't wired into this player yet."
                    : "Invalid watch URL."
            );

            setLoading(false);

            return;
        }

        const loadDetails =
            async () => {
                try {
                    setLoading(true);
                    setError(null);

                    const details =
                        await getDetails(
                            mediaType,
                            numericMediaId
                        );

                    setData(details);
                } catch (err) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load this title."
                    );
                } finally {
                    setLoading(false);
                }
            };

        loadDetails();
    }, [
        isAnime,
        validMediaId,
        validEpisode,
        mediaType,
        numericMediaId,
    ]);


    /*
     * =================================================
     * LOCAL PROGRESS
     * =================================================
     */

    const savedProgress =
        useMemo(() => {
            if (
                !validMediaId ||
                !validEpisode
            ) {
                return null;
            }

            return getLocalProgress({
                mediaType,
                mediaId:
                    numericMediaId,
                season:
                    mediaType === "tv"
                        ? numericSeason
                        : null,
                episode:
                    mediaType === "tv"
                        ? numericEpisode
                        : null,
            });
        }, [
            mediaType,
            numericMediaId,
            numericSeason,
            numericEpisode,
            validMediaId,
            validEpisode,
        ]);

    const resumeTime =
        savedProgress?.currentTime ?? 0;


    /*
     * =================================================
     * PLAYER REQUEST
     * =================================================
     */

    const playerRequest =
        useMemo<PlayerRequest | null>(() => {
            if (
                !validMediaId ||
                !validEpisode ||
                isAnime
            ) {
                return null;
            }

            return {
                mediaType,

                tmdbId:
                    numericMediaId,

                season:
                    mediaType === "tv"
                        ? numericSeason
                        : null,

                episode:
                    mediaType === "tv"
                        ? numericEpisode
                        : null,

                startAt:
                    resumeTime > 0
                        ? resumeTime
                        : null,

                autoplay:
                    true,

                autonext:
                    mediaType === "tv",

                subtitleLanguage:
                    "en",
            };
        }, [
            validMediaId,
            validEpisode,
            isAnime,
            mediaType,
            numericMediaId,
            numericSeason,
            numericEpisode,
            resumeTime,
        ]);


    /*
     * =================================================
     * PROVIDER BASE URL
     * =================================================
     */


    /*
     * =================================================
     * PLAYER URL
     * =================================================
     *
     * The selected provider gets tried first.
     *
     * If it cannot build a URL,
     * playerManager can fall back to another
     * supported provider.
     */

const player = useMemo(() => {
    if (!playerRequest) {
        return null;
    }

    return buildPlayerUrl(
        playerRequest,
        {
            /*
             * Fallback value.
             * Each provider gets its own
             * URL from providerBaseUrls.
             */
            baseUrl:
                CINEMAOS_BASE_URL,

            providerBaseUrls: {
                cinemaos:
                    CINEMAOS_BASE_URL,

                framextv:
                    FRAMEXTV_BASE_URL,

                peachify:
                    PEACHIFY_BASE_URL,

                vidsrc:
                    VIDSRC_BASE_URL,
            },

            autoplay: true,

            autonext:
                mediaType === "tv",

            subtitleLanguage:
                "en",
        },
        selectedProviderId
    );
}, [
    playerRequest,
    selectedProviderId,
    mediaType,
]);


    /*
     * =================================================
     * SAVE PROGRESS
     * =================================================
     */

    const persistProgress =
        useCallback(
            async (
                currentTime: number,
                duration: number,
                force = false
            ) => {
                if (
                    !validMediaId ||
                    !validEpisode ||
                    duration <= 0 ||
                    currentTime < 0
                ) {
                    return;
                }

                /*
                 * Avoid unnecessary tiny updates.
                 */

                if (
                    !force &&
                    currentTime < 5
                ) {
                    return;
                }

                saveLocalProgress(
                    {
                        mediaType,

                        mediaId:
                            numericMediaId,

                        season:
                            mediaType === "tv"
                                ? numericSeason
                                : null,

                        episode:
                            mediaType === "tv"
                                ? numericEpisode
                                : null,
                    },

                    currentTime,
                    duration
                );


                /*
                 * Logged-in users also sync to
                 * the Wought+ backend.
                 */

                const token =
                    localStorage.getItem(
                        "token"
                    );

                if (!token) {
                    return;
                }

                try {
                    await fetch(
                        `${API_BASE_URL}/progress`,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${token}`,
                            },

                            body:
                                JSON.stringify({
                                    media_id:
                                        progressMediaId,

                                    media_type:
                                        mediaType,

                                    title:
                                        data?.title ??
                                        "Unknown",

                                    poster:
                                        data?.poster_link ??
                                        null,

                                    current_time:
                                        Math.floor(
                                            currentTime
                                        ),

                                    duration:
                                        Math.floor(
                                            duration
                                        ),
                                }),
                        }
                    );
                } catch {
                    /*
                     * Local progress is still saved,
                     * so a backend failure doesn't
                     * destroy the user's resume point.
                     */
                }
            },
            [
                validMediaId,
                validEpisode,
                mediaType,
                numericMediaId,
                numericSeason,
                numericEpisode,
                progressMediaId,
                data,
            ]
        );


    /*
     * =================================================
     * PLAYER EVENTS
     * =================================================
     */

    const handlePlayerEvent =
        useCallback(
            (event: PlayerEvent) => {
                if (
                    event.mediaType !==
                    mediaType
                ) {
                    return;
                }


                /*
                 * If this is an episode player,
                 * make sure the event belongs to
                 * the current episode.
                 */

                if (
                    mediaType === "tv" &&
                    isEpisodePage
                ) {
                    if (
                        event.season != null &&
                        Number(
                            event.season
                        ) !==
                            numericSeason
                    ) {
                        return;
                    }

                    if (
                        event.episode != null &&
                        Number(
                            event.episode
                        ) !==
                            numericEpisode
                    ) {
                        return;
                    }
                }


                /*
                 * Normal playback event.
                 */

                if (
                    event.status ===
                    "playing"
                ) {
                    void persistProgress(
                        event.currentTime,
                        event.duration
                    );

                    return;
                }


                /*
                 * Save immediately when the user
                 * pauses or seeks.
                 */

                if (
                    event.status ===
                        "paused" ||
                    event.status ===
                        "seeked"
                ) {
                    void persistProgress(
                        event.currentTime,
                        event.duration,
                        true
                    );

                    return;
                }


                /*
                 * timeupdate is intentionally ignored
                 * for now.
                 *
                 * CinemaOS can emit these events
                 * frequently, so sending every one
                 * to the backend would create
                 * unnecessary requests.
                 *
                 * A throttled progress-sync layer
                 * can be added later.
                 */

                if (
                    event.status ===
                    "timeupdate"
                ) {
                    return;
                }


                /*
                 * Completed playback.
                 */

                if (
                    event.status ===
                    "completed"
                ) {
                    /*
                     * Remove local resume data
                     * because this item is finished.
                     */

                    clearLocalProgress({
                        mediaType,

                        mediaId:
                            numericMediaId,

                        season:
                            mediaType === "tv"
                                ? numericSeason
                                : null,

                        episode:
                            mediaType === "tv"
                                ? numericEpisode
                                : null,
                    });


                    /*
                     * Send 100% to backend.
                     *
                     * The backend will move it
                     * into Watch History.
                     */

                    void persistProgress(
                        event.duration,
                        event.duration,
                        true
                    );
                }
            },
            [
                mediaType,
                isEpisodePage,
                numericSeason,
                numericEpisode,
                numericMediaId,
                persistProgress,
            ]
        );
// back navigation
    const handleBack =
        () => {
            if (isEpisodePage) {
                navigate(
                    `/cinema/tv/${numericMediaId}/season/${numericSeason}`
                );

                return;
            }

            navigate(-1);
        };


    /*
     * =================================================
     * LOADING
     * =================================================
     */

    if (loading) {
        return (
            <div className="watch-page watch-page--state">
                <p>
                    Finding something you definitely
                    shouldn't be watching...
                </p>
            </div>
        );
    }


    /*
     * =================================================
     * ERROR
     * =================================================
     */

    if (
        error ||
        !data ||
        !player
    ) {
        return (
            <div className="watch-page watch-page--state">
                <div className="watch-page__error">
                    <h1>
                        Playback refused.
                    </h1>

                    <p>
                        {error ||
                            "Wought+ couldn't build a player for this title."}
                    </p>

                    <button
                        type="button"
                        className="watch-page__back"
                        onClick={handleBack}
                    >
                        <ArrowLeft
                            size={16}
                        />

                        Back
                    </button>
                </div>
            </div>
        );
    }


    /*
     * =================================================
     * TITLE
     * =================================================
     */

    const displayTitle =
        data.title ||
        "Untitled";

    const episodeLabel =
        isEpisodePage
            ? `S${String(
                  numericSeason
              ).padStart(2, "0")} E${String(
                  numericEpisode
              ).padStart(2, "0")}`
            : null;


    /*
     * =================================================
     * PAGE
     * =================================================
     */

    return (
        <div className="watch-page">

            <header className="watch-page__header">

                <button
                    type="button"
                    className="watch-page__back"
                    onClick={handleBack}
                >
                    <ArrowLeft
                        size={16}
                    />

                    Back
                </button>

            </header>


            <main className="watch-page__player">

                <VideoPlayer
                    key={`${player.provider.id}:${player.url}`}
                    url={player.url}
                    title={
                        episodeLabel
                            ? `${displayTitle} — ${episodeLabel}`
                            : displayTitle
                    }
                    onEvent={
                        handlePlayerEvent
                    }
                />


                <div
                    className="watch-page__providers"
                    aria-label="Video provider"
                >

                    <span className="watch-page__providers-label">
                        Provider
                    </span>


                    <div className="watch-page__provider-buttons">

                        
                        <button
                            type="button"
                                className={`watch-page__provider-button ${
                                selectedProviderId ===
                                "cinemaos"
                                    ? "watch-page__provider-button--active"
                                    : ""
                                    }`}
                                        onClick={() =>
                                            setSelectedProviderId(
                                            "cinemaos"
        )
    }
>
                                        CinemaOS
</button>

                                <button
                                    type="button"
                                    className={`watch-page__provider-button ${
        selectedProviderId ===
        "framextv"
            ? "watch-page__provider-button--active"
            : ""
    }`}
    onClick={() =>
        setSelectedProviderId(
            "framextv"
        )
    }
>
    frameXTV
</button>

    <button
    type="button"
    className={`watch-page__provider-button ${
        selectedProviderId ===
        "peachify"
            ? "watch-page__provider-button--active"
            : ""
    }`}
    onClick={() =>
        setSelectedProviderId(
            "peachify"
        )
    }
>
    Peachify
</button>

    <button
    type="button"
    className={`watch-page__provider-button ${
        selectedProviderId ===
        "vidsrc"
            ? "watch-page__provider-button--active"
            : ""
    }`}
    onClick={() =>
        setSelectedProviderId(
            "vidsrc"
        )
    }
>
    VidSrc
</button>
                    </div>

                </div>

            </main>


            {resumeTime > 0 && (
                <p className="watch-page__resume">
                    Resuming from{" "}
                    {Math.floor(
                        resumeTime
                    )}{" "}
                    seconds.
                </p>
            )}

        </div>
    );
}