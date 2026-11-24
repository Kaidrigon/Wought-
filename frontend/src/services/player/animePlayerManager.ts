
import type {
    AnimePlayerEvent,
    AnimePlayerOptions,
    AnimePlayerRequest,
    AnimePlayerProviderId,
    AnimeVideoProvider,
} from "./animeTypes";

import {
    megaplayProvider,
} from "./providers/megaplay";

import {
    aframextvProvider,
} from "./providers/aframextv";

import {
    vidnestAnimeProvider,
    vidnestAnimePaheProvider,
} from "./providers/vidnestAnime";

import {
    vidlyAnimeProvider,
} from "./providers/vidlyAnime";

const animeProviders: AnimeVideoProvider[] = [
    megaplayProvider,
    aframextvProvider,
    vidnestAnimeProvider,
    vidnestAnimePaheProvider,
    vidlyAnimeProvider,
].sort(
    (a, b) => b.priority - a.priority
);

let activeAnimeRequest: AnimePlayerRequest | null = null;

let activeAnimeProviderId: AnimePlayerProviderId | null = null;

export function getAnimeProvider(
    providerId: AnimePlayerProviderId
): AnimeVideoProvider | null {
    return (
        animeProviders.find(
            (provider) => provider.id === providerId
        ) ?? null
    );
}

function buildProviderUrl(
    provider: AnimeVideoProvider,
    request: AnimePlayerRequest,
    options: AnimePlayerOptions
): string | null {
    const providerBaseUrl =
        options.providerBaseUrls?.[provider.id];

    return provider.buildUrl(
        request,
        {
            ...options,
            baseUrl:
                providerBaseUrl ??
                options.baseUrl,
        }
    );
}

export function buildAnimePlayerUrl(
    request: AnimePlayerRequest,
    providerId: AnimePlayerProviderId,
    options: AnimePlayerOptions
): {
    provider: AnimeVideoProvider;
    url: string;
} | null {
    const provider = getAnimeProvider(providerId);

    if (!provider || !provider.supports(request)) {
        console.warn(
            "[ANIME PLAYER MANAGER] Provider does not support request:",
            {
                providerId,
                request,
            }
        );

        activeAnimeRequest = null;
        activeAnimeProviderId = null;

        return null;
    }

    const url = buildProviderUrl(
        provider,
        request,
        options
    );

    if (!url) {
        console.warn(
            "[ANIME PLAYER MANAGER] Could not build provider URL:",
            providerId
        );

        activeAnimeRequest = null;
        activeAnimeProviderId = null;

        return null;
    }

    activeAnimeRequest = { ...request };
    activeAnimeProviderId = provider.id;

    console.info(
        "[ANIME PLAYER MANAGER] Player initialized:",
        {
            provider: provider.id,
            anilistId: request.anilistId,
            episode: request.episode,
            language: request.language,
        }
    );

    return {
        provider,
        url,
    };
}

export function buildAnimePlayer(
    request: AnimePlayerRequest,
    options: AnimePlayerOptions
): {
    provider: AnimeVideoProvider;
    url: string;
} | null {
    activeAnimeRequest = null;
    activeAnimeProviderId = null;

    for (const provider of animeProviders) {
        if (!provider.supports(request)) {
            continue;
        }

        const url = buildProviderUrl(
            provider,
            request,
            options
        );

        if (!url) {
            continue;
        }

        activeAnimeRequest = { ...request };
        activeAnimeProviderId = provider.id;

        console.info(
            "[ANIME PLAYER MANAGER] Automatic provider selected:",
            provider.id
        );

        return {
            provider,
            url,
        };
    }

    console.warn(
        "[ANIME PLAYER MANAGER] No compatible provider found."
    );

    return null;
}

export function parseAnimePlayerEvent(
    event: MessageEvent
): AnimePlayerEvent | null {
    if (
        !activeAnimeRequest ||
        !activeAnimeProviderId
    ) {
        console.warn(
            "[ANIME PLAYER MANAGER] Received message without an active player request."
        );

        return null;
    }

    const provider = getAnimeProvider(
        activeAnimeProviderId
    );

    if (!provider?.parseEvent) {
        console.warn(
            "[ANIME PLAYER MANAGER] Active provider has no event parser:",
            activeAnimeProviderId
        );

        return null;
    }

    const playerEvent = provider.parseEvent(event);

    if (!playerEvent) {
        return null;
    }

    const enrichedEvent: AnimePlayerEvent = {
        ...playerEvent,
        anilistId: activeAnimeRequest.anilistId,
        episode: activeAnimeRequest.episode,
    };

    console.info(
        "[ANIME PLAYER MANAGER] Enriched player event:",
        enrichedEvent
    );

    return enrichedEvent;
}

export function clearAnimePlayerRequest(): void {
    console.info(
        "[ANIME PLAYER MANAGER] Clearing active player request."
    );

    activeAnimeRequest = null;
    activeAnimeProviderId = null;
}
