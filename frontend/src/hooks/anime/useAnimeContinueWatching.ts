
import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "../../services/api/api";

const ANIME_PROGRESS_STORAGE_KEY = "wought_anime_progress";
const ANILIST_API_URL = "https://graphql.anilist.co";

export type AnimeContinueWatchingItem = {
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
    saved_at?: number;
    percentage: number;
};

type AniListMedia = {
    id: number;
    title?: {
        english?: string | null;
        romaji?: string | null;
        native?: string | null;
    };
    coverImage?: {
        extraLarge?: string | null;
        large?: string | null;
    };
};

type AniListResponse = {
    data?: {
        Page?: {
            media?: AniListMedia[];
        };
    };
};

type ProgressRecord = Omit<AnimeContinueWatchingItem, "percentage">;

function readLocalProgress(): ProgressRecord[] {
    try {
        const stored = localStorage.getItem(
            ANIME_PROGRESS_STORAGE_KEY
        );

        if (!stored) return [];

        const parsed = JSON.parse(stored);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(
            (item): item is ProgressRecord =>
                item &&
                item.media_source === "anime" &&
                item.media_type === "tv" &&
                item.media_id !== undefined
        );
    } catch (error) {
        console.warn(
            "[ANIME CONTINUE WATCHING] Could not read local progress:",
            error
        );

        return [];
    }
}

function getTimestamp(record: ProgressRecord): number {
    if (record.saved_at) {
        return Number(record.saved_at);
    }

    if (record.updated_at) {
        const timestamp = new Date(
            record.updated_at
        ).getTime();

        if (Number.isFinite(timestamp)) {
            return timestamp;
        }
    }

    return 0;
}

function mergeProgress(
    localRecords: ProgressRecord[],
    serverRecords: ProgressRecord[]
): ProgressRecord[] {
    const records = new Map<string, ProgressRecord>();

    for (const record of [...serverRecords, ...localRecords]) {
        const id = String(record.media_id);

        const existing = records.get(id);

        if (
            !existing ||
            getTimestamp(record) >= getTimestamp(existing)
        ) {
            records.set(id, {
                ...record,
                media_id: id,
            });
        }
    }

    return Array.from(records.values()).sort(
        (a, b) => getTimestamp(b) - getTimestamp(a)
    );
}

async function fetchAnimeMetadata(
    ids: number[]
): Promise<Map<number, AniListMedia>> {
    const metadata = new Map<number, AniListMedia>();

    if (ids.length === 0) return metadata;

    const query = `
        query ($ids: [Int]) {
            Page {
                media(id_in: $ids, type: ANIME) {
                    id
                    title {
                        english
                        romaji
                        native
                    }
                    coverImage {
                        extraLarge
                        large
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                query,
                variables: {
                    ids,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(
                `AniList returned ${response.status}`
            );
        }

        const data: AniListResponse = await response.json();

        for (const anime of data.data?.Page?.media ?? []) {
            metadata.set(anime.id, anime);
        }
    } catch (error) {
        console.warn(
            "[ANIME CONTINUE WATCHING] Metadata request failed:",
            error
        );
    }

    return metadata;
}

export default function useAnimeContinueWatching() {
    const [items, setItems] = useState<AnimeContinueWatchingItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProgress = useCallback(async () => {
        setLoading(true);

        try {
            const localRecords = readLocalProgress();
            let serverRecords: ProgressRecord[] = [];

            const token = localStorage.getItem("token");

            if (token) {
                try {
                    const response = await apiFetch(
                        "/progress?media_source=anime"
                    );

                    if (response.ok) {
                        const data = await response.json();

                        if (Array.isArray(data)) {
                            serverRecords = data.filter(
                                (item: ProgressRecord) =>
                                    item.media_source === "anime" &&
                                    item.media_type === "tv"
                            );
                        }
                    }
                } catch (error) {
                    console.warn(
                        "[ANIME CONTINUE WATCHING] Server progress request failed:",
                        error
                    );
                }
            }

            const mergedRecords = mergeProgress(
                localRecords,
                serverRecords
            );

            const validRecords = mergedRecords.filter(
                (item) => {
                    const id = Number(item.media_id);

                    return (
                        Number.isInteger(id) &&
                        id > 0 &&
                        Number(item.episode) > 0
                    );
                }
            );

            const ids = validRecords.map(
                (item) => Number(item.media_id)
            );

            const metadata = await fetchAnimeMetadata(ids);

            const formattedItems = validRecords.map((record) => {
                const anime = metadata.get(
                    Number(record.media_id)
                );

                const title =
                    anime?.title?.english ||
                    anime?.title?.romaji ||
                    record.title ||
                    `Anime ${record.media_id}`;

                const poster =
                    anime?.coverImage?.extraLarge ||
                    anime?.coverImage?.large ||
                    record.poster ||
                    null;

                const currentTime = Math.max(
                    0,
                    Number(record.current_time) || 0
                );

                const duration = Math.max(
                    0,
                    Number(record.duration) || 0
                );

                const percentage =
                    duration > 0
                        ? Math.min(
                            100,
                            Math.max(
                                0,
                                (currentTime / duration) * 100
                            )
                        )
                        : 0;

                return {
                    ...record,
                    title,
                    poster,
                    current_time: currentTime,
                    duration,
                    episode: Number(record.episode) || 1,
                    season: Number(record.season) || 1,
                    percentage,
                };
            });

            setItems(formattedItems);
        } catch (error) {
            console.error(
                "[ANIME CONTINUE WATCHING] Failed to load:",
                error
            );

            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProgress();
    }, [loadProgress]);

    return {
        items,
        loading,
        refresh: loadProgress,
    };
}
