const PROGRESS_PREFIX = "wought:progress:";

export type LocalProgress = {
    currentTime: number;
    duration: number;
    updatedAt: number;
};

export type ProgressIdentity = {
    mediaType: "movie" | "tv";

    mediaId: string | number;

    season?: number | null;
    episode?: number | null;
};

function buildKey(
    identity: ProgressIdentity
): string {
    const parts = [
        PROGRESS_PREFIX,
        identity.mediaType,
        String(identity.mediaId),
    ];

    if (identity.mediaType === "tv") {
        parts.push(
            `s${identity.season ?? 0}`,
            `e${identity.episode ?? 0}`
        );
    }

    return parts.join(":");
}

export function getLocalProgress(
    identity: ProgressIdentity
): LocalProgress | null {
    try {
        const raw = localStorage.getItem(
            buildKey(identity)
        );

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);

        if (
            typeof parsed.currentTime !== "number" ||
            typeof parsed.duration !== "number"
        ) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

export function saveLocalProgress(
    identity: ProgressIdentity,
    currentTime: number,
    duration: number
): void {
    if (
        !Number.isFinite(currentTime) ||
        !Number.isFinite(duration) ||
        duration <= 0
    ) {
        return;
    }

    const progress: LocalProgress = {
        currentTime,
        duration,
        updatedAt: Date.now(),
    };

    try {
        localStorage.setItem(
            buildKey(identity),
            JSON.stringify(progress)
        );
    } catch {
        // Ignore storage failures.
    }
}

export function clearLocalProgress(
    identity: ProgressIdentity
): void {
    try {
        localStorage.removeItem(
            buildKey(identity)
        );
    } catch {
        // Ignore storage failures.
    }
}