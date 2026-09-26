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


/*
 * =================================================
 * ANIME PROVIDERS
 * =================================================
 *
 * Higher priority = preferred by default.
 *
 * MegaPlay:
 * 200
 *
 * frameXTV:
 * 175
 */

const animeProviders:
    AnimeVideoProvider[] = [

        megaplayProvider,

        aframextvProvider,

    ].sort(

        (a, b) =>
            b.priority - a.priority

    );


/*
 * =================================================
 * ACTIVE REQUEST
 * =================================================
 *
 * Some providers do not reliably include
 * AniList ID / episode in postMessage events.
 *
 * We therefore remember the request that created
 * the current player and use it to enrich events.
 */

let activeAnimeRequest:
    AnimePlayerRequest | null = null;


/*
 * =================================================
 * PROVIDER LOOKUP
 * =================================================
 */

export function getAnimeProvider(
    providerId:
        AnimePlayerProviderId
):
    AnimeVideoProvider | null {

    return (

        animeProviders.find(
            (provider) =>
                provider.id ===
                providerId
        ) ?? null

    );
}


/*
 * =================================================
 * PROVIDER URL
 * =================================================
 */

function buildProviderUrl(
    provider:
        AnimeVideoProvider,

    request:
        AnimePlayerRequest,

    options:
        AnimePlayerOptions
):
    string | null {

    const providerBaseUrl =
        options.providerBaseUrls?.[
            provider.id
        ];

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


/*
 * =================================================
 * BUILD PLAYER URL
 * =================================================
 */

export function buildAnimePlayerUrl(
    request:
        AnimePlayerRequest,

    providerId:
        AnimePlayerProviderId,

    options:
        AnimePlayerOptions
):
    {
        provider:
            AnimeVideoProvider;

        url:
            string;

    } | null {

    const provider =
        getAnimeProvider(
            providerId
        );

    if (!provider) {
        return null;
    }

    if (
        !provider.supports(
            request
        )
    ) {
        return null;
    }

    const url =
        buildProviderUrl(

            provider,

            request,

            options

        );

    if (!url) {
        return null;
    }

    activeAnimeRequest = {
        ...request,
    };

    return {

        provider,

        url,

    };
}


/*
 * =================================================
 * AUTO SELECT PROVIDER
 * =================================================
 *
 * Providers are tried in priority order.
 */

export function buildAnimePlayer(
    request:
        AnimePlayerRequest,

    options:
        AnimePlayerOptions
):
    {
        provider:
            AnimeVideoProvider;

        url:
            string;

    } | null {

    for (
        const provider of
        animeProviders
    ) {

        if (
            !provider.supports(
                request
            )
        ) {
            continue;
        }

        const url =
            buildProviderUrl(

                provider,

                request,

                options

            );

        if (!url) {
            continue;
        }

        activeAnimeRequest = {
            ...request,
        };

        return {

            provider,

            url,

        };
    }

    return null;
}


/*
 * =================================================
 * PARSE ANIME PLAYER EVENT
 * =================================================
 */

export function parseAnimePlayerEvent(
    event:
        MessageEvent
):
    AnimePlayerEvent | null {

    /*
     * Try every registered anime provider.
     */

    for (
        const provider of
        animeProviders
    ) {

        if (
            !provider.parseEvent
        ) {
            continue;
        }

        const playerEvent =
            provider.parseEvent(
                event
            );

        if (!playerEvent) {
            continue;
        }

        /*
         * Enrich provider events with the
         * currently active anime request.
         */

        if (
            activeAnimeRequest
        ) {

            return {

                ...playerEvent,

                anilistId:
                    activeAnimeRequest
                        .anilistId,

                episode:
                    activeAnimeRequest
                        .episode,

            };
        }

        /*
         * Without an active request,
         * don't associate the event with
         * an arbitrary anime.
         */

        return null;
    }

    return null;
}


/*
 * =================================================
 * CLEAR ACTIVE REQUEST
 * =================================================
 */

export function clearAnimePlayerRequest():
    void {

    activeAnimeRequest =
        null;
}