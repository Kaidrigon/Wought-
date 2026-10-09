import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    getDetails,
} from "../../services/api/detailsApi";

import {
    getProgress,
} from "../../services/player/progressApi";

import type {
    ContinueWatchingItem,
} from "../../types/continueWatching";

import "./ContinueWatchingSection.css";

const LOCAL_PROGRESS_PREFIX =
    "wought:progress:";

type LocalProgress = {

    currentTime: number;

    duration: number;

    updatedAt: number;

};

function getProgressPercent(
    currentTime: number,
    duration: number
): number {

    if (
        !Number.isFinite(currentTime) ||
        !Number.isFinite(duration) ||
        duration <= 0
    ) {
        return 0;
    }

    return Math.min(
        100,
        Math.max(
            0,
            (currentTime / duration) * 100
        )
    );
}

function parseLocalProgressKey(
    key: string
) {

    if (
        !key.startsWith(
            LOCAL_PROGRESS_PREFIX
        )
    ) {
        return null;
    }

    const parts =
        key.split(":");

    /*
     * movie:
     * wought:progress:movie:123
     */

    if (
        parts[2] === "movie" &&
        parts.length === 4
    ) {

        const mediaId =
            Number(parts[3]);

        if (!Number.isFinite(mediaId)) {
            return null;
        }

        return {
            mediaType: "movie" as const,
            mediaId,
            season: null,
            episode: null,
        };
    }

    /*
     * TV episode:
     * wought:progress:tv:456:s1:e3
     */

    if (
        parts[2] === "tv" &&
        parts.length === 6
    ) {

        const mediaId =
            Number(parts[3]);

        const season =
            Number(
                parts[4].replace(
                    "s",
                    ""
                )
            );

        const episode =
            Number(
                parts[5].replace(
                    "e",
                    ""
                )
            );

        if (
            !Number.isFinite(mediaId) ||
            !Number.isFinite(season) ||
            !Number.isFinite(episode)
        ) {
            return null;
        }

        return {
            mediaType: "tv" as const,
            mediaId,
            season,
            episode,
        };
    }

    return null;
}

function readGuestProgress(): Array<{
    mediaType: "movie" | "tv";
    mediaId: number;
    season: number | null;
    episode: number | null;
    progress: LocalProgress;
}> {

    const results: Array<{
        mediaType: "movie" | "tv";
        mediaId: number;
        season: number | null;
        episode: number | null;
        progress: LocalProgress;
    }> = [];

    try {

        for (
            let index = 0;
            index < localStorage.length;
            index++
        ) {

            const key =
                localStorage.key(index);

            if (!key) {
                continue;
            }

            const identity =
                parseLocalProgressKey(
                    key
                );

            if (!identity) {
                continue;
            }

            const raw =
                localStorage.getItem(key);

            if (!raw) {
                continue;
            }

            try {

                const parsed =
                    JSON.parse(raw);

                if (
                    typeof parsed.currentTime !==
                        "number" ||
                    typeof parsed.duration !==
                        "number" ||
                    typeof parsed.updatedAt !==
                        "number" ||
                    parsed.duration <= 0
                ) {
                    continue;
                }

                const percent =
                    getProgressPercent(
                        parsed.currentTime,
                        parsed.duration
                    );

                /*
                 * WatchPage clears completed
                 * progress, but this protects
                 * the UI if something stale
                 * remains in storage.
                 */

                if (percent >= 95) {
                    continue;
                }

                results.push({
                    ...identity,
                    progress: {
                        currentTime:
                            parsed.currentTime,
                        duration:
                            parsed.duration,
                        updatedAt:
                            parsed.updatedAt,
                    },
                });

            } catch {
                continue;
            }
        }

    } catch {
        return [];
    }

    return results;
}

function formatTime(
    seconds: number
): string {

    if (
        !Number.isFinite(seconds) ||
        seconds <= 0
    ) {
        return "0m";
    }

    const totalSeconds =
        Math.floor(seconds);

    const hours =
        Math.floor(
            totalSeconds / 3600
        );

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    if (hours > 0) {

        return `${hours}h ${minutes}m`;

    }

    return `${minutes}m`;
}

function getWatchPath(
    item: ContinueWatchingItem
): string {

    if (
        item.mediaType === "movie"
    ) {

        return (
            `/cinema/movie/` +
            `${item.mediaId}/watch`
        );
    }

    if (
        item.season != null &&
        item.episode != null
    ) {

        return (
            `/cinema/tv/` +
            `${item.mediaId}` +
            `/season/` +
            `${item.season}` +
            `/episode/` +
            `${item.episode}` +
            `/watch`
        );
    }

    return (
        `/cinema/tv/` +
        `${item.mediaId}/watch`
    );
}

function ContinueWatchingCard({
    item,
}: {
    item: ContinueWatchingItem;
}) {

    const navigate =
        useNavigate();

    const remaining =
        Math.max(
            0,
            item.duration -
            item.currentTime
        );

    const handleResume =
        () => {

            navigate(
                getWatchPath(item)
            );
        };

    return (
        <article
            className="continue-card"
            onClick={
                handleResume
            }
        >

            <div className="continue-card__poster">

                {item.poster ? (

                    <img
                        src={item.poster}
                        alt={item.title}
                        loading="lazy"
                    />

                ) : (

                    <div className="continue-card__poster-placeholder">
                        W+
                    </div>

                )}

                <div className="continue-card__overlay">

                    <span className="continue-card__resume">
                        RESUME
                    </span>

                </div>

                <div className="continue-card__progress">

                    <div
                        className="continue-card__progress-value"
                        style={{
                            width:
                                `${item.progressPercent}%`,
                        }}
                    />

                </div>

            </div>

            <div className="continue-card__info">

                <h3 className="continue-card__title">
                    {item.title}
                </h3>

                <div className="continue-card__meta">

                    {item.mediaType === "tv" &&
                        item.season != null &&
                        item.episode != null && (

                        <span>
                            S{item.season}
                            {" · "}
                            E{item.episode}
                        </span>

                    )}

                    {item.mediaType === "movie" && (

                        <span>
                            MOVIE
                        </span>

                    )}

                    <span>
                        {Math.round(
                            item.progressPercent
                        )}%
                    </span>

                </div>

                <div className="continue-card__remaining">
                    {formatTime(remaining)}
                    {" remaining"}
                </div>

            </div>

        </article>
    );
}

async function loadGuestItems(): Promise<
    ContinueWatchingItem[]
> {

    const entries =
        readGuestProgress();

    if (
        entries.length === 0
    ) {
        return [];
    }

    const items =
        await Promise.all(
            entries.map(
                async entry => {

                    try {

                        const details =
                            await getDetails(
                                entry.mediaType,
                                entry.mediaId
                            );

                        return {
                            mediaId:
                                entry.mediaId,

                            mediaType:
                                entry.mediaType,

                            title:
                                details.title ??
                                "Unknown title",

                            poster:
                                details.poster_link ??
                                null,

                            currentTime:
                                entry.progress
                                    .currentTime,

                            duration:
                                entry.progress
                                    .duration,

                            progressPercent:
                                getProgressPercent(
                                    entry.progress
                                        .currentTime,
                                    entry.progress
                                        .duration
                                ),

                            season:
                                entry.season,

                            episode:
                                entry.episode,

                            updatedAt:
                                entry.progress
                                    .updatedAt,
                        };

                    } catch {

                        return null;

                    }
                }
            )
        );

    return items
        .filter(
            (
                item
            ): item is ContinueWatchingItem =>
                item !== null
        )
        .sort(
            (a, b) =>
                b.updatedAt -
                a.updatedAt
        );
}

async function loadLoggedInItems(): Promise<
    ContinueWatchingItem[]
> {

    const progress =
        await getProgress();

    return progress
        .map(
            item => {

                const mediaId =
                    Number(
                        item.media_id
                    );

                const progressPercent =
                    getProgressPercent(
                        item.current_time,
                        item.duration
                    );

                /*
                 * Completed items should already
                 * be removed by the backend.
                 * This is an additional frontend
                 * safeguard.
                 */

                if (
                    progressPercent >= 95 ||
                    !Number.isFinite(mediaId)
                ) {
                    return null;
                }

                let season:
                    number | null = null;

                let episode:
                    number | null = null;

                if (
                    item.media_type === "tv" &&
                    typeof item.media_id ===
                        "string"
                ) {

                    const match =
                        item.media_id.match(
                            /^tv:\d+:s(\d+):e(\d+)$/
                        );

                    if (match) {

                        season =
                            Number(match[1]);

                        episode =
                            Number(match[2]);

                    }
                }

                return {
                    mediaId,

                    mediaType:
                        item.media_type,

                    title:
                        item.title ||
                        "Unknown title",

                    poster:
                        item.poster ||
                        null,

                    currentTime:
                        item.current_time,

                    duration:
                        item.duration,

                    progressPercent,

                    season,

                    episode,

                    updatedAt:
                        typeof item.updated_at ===
                            "number"
                            ? item.updated_at
                            : 0,
                };

            }
        )
        .filter(
            (
                item
            ): item is ContinueWatchingItem =>
                item !== null
        )
        .sort(
            (a, b) =>
                b.updatedAt -
                a.updatedAt
        );
}

export default function ContinueWatchingSection() {

    const [
        items,
        setItems,
    ] = useState<
        ContinueWatchingItem[]
    >([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    useEffect(() => {

        let cancelled = false;

        const load =
            async () => {

                setLoading(true);

                try {

                    const token =
                        localStorage.getItem(
                            "token"
                        );

                    let nextItems:
                        ContinueWatchingItem[];

                    if (token) {

                        try {

                            nextItems =
                                await loadLoggedInItems();

                        } catch {

                            /*
                             * If the token is stale
                             * or the backend is unavailable,
                             * gracefully fall back to
                             * local progress.
                             */

                            nextItems =
                                await loadGuestItems();

                        }

                    } else {

                        nextItems =
                            await loadGuestItems();

                    }

                    if (!cancelled) {

                        setItems(
                            nextItems
                        );

                    }

                } catch {

                    if (!cancelled) {

                        setItems([]);

                    }

                } finally {

                    if (!cancelled) {

                        setLoading(false);

                    }

                }
            };

        void load();

        return () => {

            cancelled = true;

        };

    }, []);

    if (
        loading ||
        items.length === 0
    ) {
        return null;
    }

    return (
        <section className="continue-watching-section">

            <div className="continue-watching-section__header">

                <div>

                    <div className="continue-watching-section__eyebrow">
                        CONTINUE WATCHING
                    </div>

                    <h2 className="continue-watching-section__title">
                        Because apparently you had
                        the audacity to stop watching.
                    </h2>

                </div>

            </div>

            <div className="continue-watching-section__row">

                {items.map(
                    item => (

                        <ContinueWatchingCard
                            key={[
                                item.mediaType,
                                item.mediaId,
                                item.season,
                                item.episode,
                            ].join("-")}
                            item={item}
                        />

                    )
                )}

            </div>

        </section>
    );
}