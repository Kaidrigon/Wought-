import {
    apiFetch,
} from "../api/api";

export type BackendProgressItem = {

    media_id: string | number;

    media_type: "movie" | "tv";

    title: string;

    poster: string | null;

    current_time: number;

    duration: number;

    updated_at: string | number | null;

};

export async function getProgress(): Promise<
    BackendProgressItem[]
> {

    const response =
        await apiFetch(
            "/progress"
        );

    if (!response.ok) {

        throw new Error(
            "Unable to load watch progress."
        );

    }

    const data =
        await response.json();

    if (!Array.isArray(data)) {

        return [];

    }

    return data;
}