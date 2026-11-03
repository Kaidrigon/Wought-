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


const animeProviders: AnimeVideoProvider[] = [
    megaplayProvider,
    aframextvProvider,
    vidnestAnimeProvider,
    vidnestAnimePaheProvider,
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
        activeAnimeRequest = null;
        activeAnimeProviderId = null;
        return null;
    }

    activeAnimeRequest = { ...request };
    activeAnimeProviderId = provider.id;

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

        return {
            provider,
            url,
        };
    }

    return null;
}


export function parseAnimePlayerEvent(
    event: MessageEvent
): AnimePlayerEvent | null {
    if (
        !activeAnimeRequest ||
        !activeAnimeProviderId
    ) {
        return null;
    }

    const provider = getAnimeProvider(
        activeAnimeProviderId
    );

    if (!provider?.parseEvent) {
        return null;
    }

    const playerEvent = provider.parseEvent(event);

    if (!playerEvent) {
        return null;
    }

    return {
        ...playerEvent,

        anilistId: activeAnimeRequest.anilistId,
        episode: activeAnimeRequest.episode,
    };
}


export function clearAnimePlayerRequest(): void {
    activeAnimeRequest = null;
    activeAnimeProviderId = null;
}