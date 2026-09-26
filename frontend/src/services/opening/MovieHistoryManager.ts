/*import { apiFetch } from "../api/api";

import type { HistoryItem } from "../../types/history";

export async function getLatestCompletedMovie() {

    const response =
        await apiFetch("/history");

    if (!response.ok) {

        return null;

    }

    const history =
        await response.json();

    return history.find(
        (item: HistoryItem) =>

            item.media_type ===
            "movie"

    ) ?? null;

}

export async function hasSeenMovieOpening(
    mediaId: number
): Promise<boolean> {

    const response =
        await apiFetch(
            `/opening/seen/movie/${mediaId}`
        );

    if (!response.ok) {

        return false;

    }

    const data =
        await response.json();

    return data.seen;

}
export async function markMovieOpeningSeen(
    movie: HistoryItem
): Promise<void> {

    await apiFetch(
        "/opening/seen",
        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json",

            },

            body: JSON.stringify({

                media_id:
                    movie.media_id,

                media_type:
                    movie.media_type,

                title:
                    movie.title,

            }),

        }

    );

}
    */