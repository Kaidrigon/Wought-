
import {
    useEffect,
    useMemo,
    useRef,
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

import { apiFetch } from "../services/api/api";

import "./AnimeWatchPage.css";

/*
=================================================
PROVIDER CONFIGURATION
=================================================
*/

const MEGAPLAY_BASE_URL =
    import.meta.env.VITE_MEGAPLAY_BASE_URL ||
    "https://megaplay.buzz";

const FRAMEXTV_BASE_URL =
    import.meta.env.VITE_ANIME_FRAMEXTV_BASE_URL ||
    "https://framextv.tech";

const VIDNEST_BASE_URL =
    import.meta.env.VITE_VIDNEST_BASE_URL ||
    "https://vidnest.fun";

const VIDLY_BASE_URL =
    import.meta.env.VITE_VIDLY_BASE_URL ||
    "https://vidly.fun";

/*
=================================================
ANIME PROGRESS TYPES
=================================================
*/

type AnimeProgressRecord = {
    media_id: string;
    media_type: "tv";
    media_source: "anime";
    title: string;
    poster: string | null;
    current_time: number;
    duration: number;
    episode: number;
    season: number;
    updated_at?: string | number | null;
};

type LocalAnimeProgress = AnimeProgressRecord & {
    saved_at: number;
};

const ANIME_PROGRESS_STORAGE_KEY = "wought_anime_progress";

const PROGRESS_SAVE_INTERVAL = 15_000;

/*
=================================================
LOCAL STORAGE HELPERS
=================================================
*/

function getLocalAnimeProgress(): LocalAnimeProgress[] {
    try {
        const stored = localStorage.getItem(
            ANIME_PROGRESS_STORAGE_KEY
        );

        if (!stored) return [];

        const parsed = JSON.parse(stored);

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveLocalAnimeProgress(
    progress: LocalAnimeProgress
) {
    try {
        const existing = getLocalAnimeProgress();

        const updated = existing.filter(
            (item) => item.media_id !== progress.media_id
        );

        updated.unshift(progress);

        localStorage.setItem(
            ANIME_PROGRESS_STORAGE_KEY,
            JSON.stringify(updated.slice(0, 50))
        );
    } catch (error) {
        console.warn(
            "Unable to save local anime progress:",
            error
        );
    }
}

/*
=================================================
ANIME WATCH PAGE
=================================================
*/

export default function AnimeWatchPage() {
    const navigate = useNavigate();

    const { id } = useParams<{ id: string }>();

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    /*
    =================================================
    ANIME ID
    =================================================
    */

    const animeId = Number(id);

    const validAnimeId = useMemo(() => {
        return (
            Number.isInteger(animeId) &&
            animeId > 0
        );
    }, [animeId]);

    const mediaId = String(animeId);

    /*
    =================================================
    EPISODE
    =================================================
    */

    const hasExplicitEpisode =
        searchParams.has("episode");

    const episodeParam = Number(
        searchParams.get("episode") ?? "1"
    );

    const episode =
        Number.isInteger(episodeParam) &&
        episodeParam > 0
            ? episodeParam
            : 1;

    /*
    =================================================
    SEASON
    =================================================
    */

    const seasonParam = Number(
        searchParams.get("season") ?? "1"
    );

    const season =
        Number.isInteger(seasonParam) &&
        seasonParam > 0
            ? seasonParam
            : 1;

    /*
    =================================================
    LANGUAGE
    =================================================
    */

    const languageParam =
        searchParams.get("lang");

    const language: AnimePlayerLanguage =
        languageParam === "dub"
            ? "dub"
            : "sub";

    /*
    =================================================
    PROVIDER
    =================================================
    */

    const [
        selectedProviderId,
        setSelectedProviderId,
    ] = useState<AnimePlayerProviderId>(
        "megaplay"
    );

    /*
    =================================================
    PLAYER
    =================================================
    */

    const [
        player,
        setPlayer,
    ] = useState<{
        url: string;
        title: string;
    } | null>(null);

    const [
        error,
        setError,
    ] = useState<string | null>(null);

    /*
    =================================================
    PROGRESS STATE
    =================================================
    */

    const [
        progressReady,
        setProgressReady,
    ] = useState(false);

    const [
        resumeAt,
        setResumeAt,
    ] = useState(0);

    const lastKnownTimeRef = useRef(0);

    const lastKnownDurationRef = useRef(0);

    const lastProgressSaveRef = useRef(0);

    const completionHandledRef = useRef(false);

    /*
    =================================================
    RESTORE ANIME PROGRESS
    =================================================

    Logged-in users:
        Restore from the anime-only backend records.

    Guests:
        Restore from the anime-only localStorage key.

    If the user opened the normal anime detail page,
    restore the saved episode automatically.

    If the URL already contains an episode, respect
    that episode and restore its position only when
    it matches the saved episode.
    */

    useEffect(() => {
        let cancelled = false;

        async function restoreProgress() {
            setProgressReady(false);

            setResumeAt(0);

            lastKnownTimeRef.current = 0;
            lastKnownDurationRef.current = 0;

            if (!validAnimeId) {
                setProgressReady(true);
                return;
            }

            const token = localStorage.getItem("token");

            let savedProgress: AnimeProgressRecord | null = null;

            if (token) {
                try {
                    const response = await apiFetch(
                        "/progress?media_source=anime"
                    );

                    if (response.ok) {
                        const data = await response.json();

                        if (Array.isArray(data)) {
                            savedProgress =
                                data.find(
                                    (item: AnimeProgressRecord) =>
                                        String(item.media_id) === mediaId
                                ) ?? null;
                        }
                    }
                } catch (error) {
                    console.warn(
                        "Unable to restore anime progress from the server:",
                        error
                    );
                }
            } else {
                const localProgress =
                    getLocalAnimeProgress();

                savedProgress =
                    localProgress.find(
                        (item) => item.media_id === mediaId
                    ) ?? null;
            }

            if (cancelled) return;

            if (savedProgress) {
                const savedEpisode =
                    Number(savedProgress.episode) || 1;

                const savedSeason =
                    Number(savedProgress.season) || 1;

                const savedTime =
                    Math.max(
                        0,
                        Number(savedProgress.current_time) || 0
                    );

                const shouldRestoreEpisode =
                    !hasExplicitEpisode;

                const shouldRestorePosition =
                    shouldRestoreEpisode ||
                    savedEpisode === episode;

                if (shouldRestoreEpisode) {
                    setSearchParams({
                        episode: String(savedEpisode),
                        lang: language,
                        ...(savedSeason > 1
                            ? {
                                season: String(savedSeason),
                            }
                            : {}),
                    });
                }

                if (shouldRestorePosition) {
                    lastKnownTimeRef.current = savedTime;

                    lastKnownDurationRef.current =
                        Number(savedProgress.duration) || 0;

                    setResumeAt(savedTime);
                }
            }

            setProgressReady(true);
        }

        restoreProgress();

        return () => {
            cancelled = true;
        };
    }, [
        animeId,
        mediaId,
        validAnimeId,
    ]);

    /*
    =================================================
    SAVE ANIME PROGRESS
    =================================================

    The media_source field is always "anime".

    This prevents AniList IDs from colliding with
    TMDB IDs in cinema progress records.
    */

    async function saveAnimeProgress(
        currentTime: number,
        duration: number,
        completed = false
    ) {
        if (!validAnimeId) return;

        const safeCurrentTime = Math.max(
            0,
            Math.floor(currentTime)
        );

        const safeDuration = Math.max(
            0,
            Math.floor(duration)
        );

        if (
            !completed &&
            safeDuration > 0 &&
            safeCurrentTime / safeDuration < 0.05
        ) {
            return;
        }
    console.log("[ANIME PROGRESS] Saving locally...");
        const progressRecord: LocalAnimeProgress = {
            media_id: mediaId,
            media_type: "tv",
            media_source: "anime",
            title: `Anime ${animeId}`,
            poster: null,
            current_time: safeCurrentTime,
            duration: safeDuration,
            episode,
            season,
            saved_at: Date.now(),
        };

        if (completed) {
            /*
            The completed episode is advancing.
            Keep the next episode as the local
            continue-watching position.
            */

            saveLocalAnimeProgress({
                ...progressRecord,
                episode: episode + 1,
                current_time: 0,
                duration: 0,
            });

            lastKnownTimeRef.current = 0;
            lastKnownDurationRef.current = 0;
        } else {
            saveLocalAnimeProgress(progressRecord);
        }

        const token = localStorage.getItem("token");

        if (!token) return;

        try {
            const response = await apiFetch(
                "/progress",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        media_id: mediaId,
                        media_type: "tv",
                        media_source: "anime",
                        title: `Anime ${animeId}`,
                        poster: null,
                        current_time: safeCurrentTime,
                        duration: safeDuration,
                        episode,
                        season,
                        completed,
                    }),
                }
            );

            if (!response.ok) {
                console.warn(
                    "The server did not save anime progress."
                );
            }
        } catch (error) {
            console.warn(
                "Unable to save anime progress:",
                error
            );
        }
    }

    /*
    =================================================
    BUILD PLAYER
    =================================================
    */

    useEffect(() => {
        if (!progressReady) return;

        if (!validAnimeId) {
            setPlayer(null);

            setError("That anime ID is not valid.");

            return;
        }

        setError(null);

        const result = buildAnimePlayerUrl(
            {
                anilistId: animeId,
                season,
                episode,
                language,
                autoplay: true,
                startAt: resumeAt > 0
                    ? resumeAt
                    : null,
            },
            selectedProviderId,
            {
                baseUrl: MEGAPLAY_BASE_URL,

                providerBaseUrls: {
                    megaplay: MEGAPLAY_BASE_URL,
                    framextv: FRAMEXTV_BASE_URL,
                    "vidnest-anime": VIDNEST_BASE_URL,
                    "vidnest-animepahe": VIDNEST_BASE_URL,
                    "vidly-anime": VIDLY_BASE_URL,
                },

                language,
                autoplay: true,
            }
        );

        if (!result) {
            setPlayer(null);

            setError(
                `Wought+ couldn't build ${selectedProviderId} for this episode.`
            );

            return;
        }

        setPlayer({
            url: result.url,
            title: `Episode ${episode}`,
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
        progressReady,
        resumeAt,
    ]);

    /*
    =================================================
    EPISODE
    =================================================
    */

    function changeEpisode(nextEpisode: number) {
        if (nextEpisode < 1) return;

        completionHandledRef.current = false;

        lastKnownTimeRef.current = 0;
        lastKnownDurationRef.current = 0;

        lastProgressSaveRef.current = 0;

        setResumeAt(0);

        setSearchParams({
            episode: String(nextEpisode),
            lang: language,
            ...(season > 1
                ? {
                    season: String(season),
                }
                : {}),
        });
    }

    /*
    =================================================
    LANGUAGE
    =================================================
    */

    function changeLanguage(
        nextLanguage: AnimePlayerLanguage
    ) {
        setSearchParams({
            episode: String(episode),
            lang: nextLanguage,
            ...(season > 1
                ? {
                    season: String(season),
                }
                : {}),
        });
    }

    /*
    =================================================
    PROVIDER
    =================================================
    */

    function changeProvider(
        providerId: AnimePlayerProviderId
    ) {
        if (providerId === selectedProviderId) {
            return;
        }

        /*
        Keep the last known playback position
        when switching providers.
        */

        setResumeAt(lastKnownTimeRef.current);

        setSelectedProviderId(providerId);
    }

    /*
    =================================================
    PLAYER EVENTS
    =================================================
    */
    async function handlePlayerEvent(
        event: AnimePlayerEvent
    ) {
        console.log("[ANIME PLAYER EVENT]", event);
console.log("[EXPECTED]", {
    animeId,
    episode,
});
        if (
            event.anilistId !== animeId ||
            event.episode !== episode
        ) {
            return;
        }

        const currentTime = Math.max(
            0,
            Number(event.currentTime) || 0
        );

        const duration = Math.max(
            0,
            Number(event.duration) || 0
        );

        if (currentTime > 0) {
            lastKnownTimeRef.current = currentTime;
        }

        if (duration > 0) {
            lastKnownDurationRef.current = duration;
        }

        /*
        Save periodically during playback.

        Some providers only emit timeupdate events,
        so this is important for providers that do
        not send pause events.
        */

        if (
            event.status === "timeupdate" ||
            event.status === "playing" ||
            event.status === "seeked" ||
            event.status === "paused"
        ) {
            const now = Date.now();

            const shouldSaveImmediately =
                event.status === "paused" ||
                event.status === "seeked";

            const shouldSavePeriodically =
                now - lastProgressSaveRef.current >=
                PROGRESS_SAVE_INTERVAL;

            if (
                shouldSaveImmediately ||
                shouldSavePeriodically
            ) {
                lastProgressSaveRef.current = now;

                await saveAnimeProgress(
                    currentTime,
                    duration
                );
            }
        }

        /*
        Episode completion.

        Save the completion first, then move
        to the next episode.
        */

        if (
            event.status === "completed" &&
            !completionHandledRef.current
        ) {
            completionHandledRef.current = true;

            await saveAnimeProgress(
                currentTime,
                duration,
                true
            );

            changeEpisode(episode + 1);
        }
    }

    /*
    =================================================
    ERROR
    =================================================
    */

    if (error) {
        return (
            <div className="anime-watch-page">
                <div className="anime-watch-page__state">
                    <button
                        type="button"
                        className="anime-watch-page__back"
                        onClick={() =>
                            navigate(`/anime/anime/${animeId}`)
                        }
                    >
                        <ArrowLeft size={18} />

                        <span>Back</span>
                    </button>

                    <h1>{error}</h1>
                </div>
            </div>
        );
    }

    /*
    =================================================
    PAGE
    =================================================
    */

    return (
        <div className="anime-watch-page">
            <div className="anime-watch-page__topbar">
                <button
                    type="button"
                    className="anime-watch-page__back"
                    onClick={() =>
                        navigate(`/anime/anime/${animeId}`)
                    }
                >
                    <ArrowLeft size={18} />

                    <span>Back</span>
                </button>
            </div>

            <section className="anime-watch-page__player">
                {player ? (
                    <AnimeVideoPlayer
                        key={`${selectedProviderId}:${player.url}`}
                        url={player.url}
                        title={player.title}
                        onEvent={handlePlayerEvent}
                    />
                ) : (
                    <div className="anime-watch-page__player-state">
                        <span>
                            {progressReady
                                ? "Preparing player..."
                                : "Restoring your place..."}
                        </span>
                    </div>
                )}
            </section>

            <section className="anime-watch-page__controls">
                {/* EPISODE CONTROLS */}

                <div className="anime-watch-page__episode-controls">
                    <button
                        type="button"
                        className="anime-watch-page__control"
                        disabled={episode <= 1}
                        onClick={() =>
                            changeEpisode(episode - 1)
                        }
                        aria-label="Previous episode"
                    >
                        <ChevronLeft size={21} />

                        <span>Previous</span>
                    </button>

                    <div className="anime-watch-page__episode">
                        <span>EPISODE</span>

                        <strong>{episode}</strong>
                    </div>

                    <button
                        type="button"
                        className="anime-watch-page__control"
                        onClick={() =>
                            changeEpisode(episode + 1)
                        }
                        aria-label="Next episode"
                    >
                        <span>Next</span>

                        <ChevronRight size={21} />
                    </button>
                </div>

                {/* LANGUAGE */}

                <div className="anime-watch-page__language">
                    <Languages size={18} />

                    <div className="anime-watch-page__language-switch">
                        <button
                            type="button"
                            className={
                                language === "sub"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeLanguage("sub")
                            }
                        >
                            SUB
                        </button>

                        <button
                            type="button"
                            className={
                                language === "dub"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeLanguage("dub")
                            }
                        >
                            DUB
                        </button>
                    </div>
                </div>

                {/* PROVIDER */}

                <div className="anime-watch-page__provider">
                    <span className="anime-watch-page__provider-label">
                        PROVIDER
                    </span>

                    <div className="anime-watch-page__provider-switch">
                        <button
                            type="button"
                            className={
                                selectedProviderId === "megaplay"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeProvider("megaplay")
                            }
                        >
                            MegaPlay
                        </button>

                        <button
                            type="button"
                            className={
                                selectedProviderId === "vidnest-anime"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeProvider("vidnest-anime")
                            }
                        >
                            VidNest
                        </button>

                        <button
                            type="button"
                            className={
                                selectedProviderId === "vidnest-animepahe"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeProvider("vidnest-animepahe")
                            }
                        >
                            AnimePahe
                        </button>

                        <button
                            type="button"
                            className={
                                selectedProviderId === "vidly-anime"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeProvider("vidly-anime")
                            }
                        >
                            Vidly
                        </button>

                        <button
                            type="button"
                            className={
                                selectedProviderId === "framextv"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                changeProvider("framextv")
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
