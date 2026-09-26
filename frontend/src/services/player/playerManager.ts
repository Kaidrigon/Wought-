import type {
    PlayerOptions,
    PlayerRequest,
    VideoProvider,
} from "./types";

import { cinemaosProvider } from "./providers/cinemaos";
import { framextvProvider } from "./providers/framextv";
import { peachifyProvider } from "./providers/peachify";
import { vidsrcProvider } from "./providers/vidsrc";

const providers: VideoProvider[] = [
    cinemaosProvider,
    framextvProvider,
    peachifyProvider,
    vidsrcProvider,
].sort(
    (a, b) =>
        b.priority - a.priority
);

function buildProviderUrl(
    provider: VideoProvider,
    request: PlayerRequest,
    options: PlayerOptions
): string | null {

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

export function getProviderCandidates(
    request: PlayerRequest
): VideoProvider[] {

    return providers.filter(
        (provider) =>
            provider.supports(request)
    );
}

export function selectProvider(
    request: PlayerRequest
): VideoProvider | null {

    const candidates =
        getProviderCandidates(
            request
        );

    return candidates[0] ?? null;
}

export function buildPlayerUrl(
    request: PlayerRequest,
    options: PlayerOptions,
    preferredProviderId?: string | null
): {
    provider: VideoProvider;
    url: string;
} | null {

    const candidates =
        getProviderCandidates(
            request
        );

    /*
     * User-selected provider gets
     * first attempt.
     */
    if (
        preferredProviderId
    ) {

        const preferredProvider =
            candidates.find(
                (provider) =>
                    provider.id ===
                    preferredProviderId
            );

        if (
            preferredProvider
        ) {

            const url =
                buildProviderUrl(
                    preferredProvider,
                    request,
                    options
                );

            if (url) {
                return {
                    provider:
                        preferredProvider,

                    url,
                };
            }
        }
    }

    /*
     * Otherwise / after failure:
     * try providers in priority order.
     */
    for (
        const provider of candidates
    ) {

        if (
            provider.id ===
            preferredProviderId
        ) {
            continue;
        }

        const url =
            buildProviderUrl(
                provider,
                request,
                options
            );

        if (url) {
            return {
                provider,
                url,
            };
        }
    }

    return null;
}

export function parsePlayerEvent(
    event: MessageEvent
) {

    for (
        const provider of providers
    ) {

        if (
            !provider.parseEvent
        ) {
            continue;
        }

        const parsed =
            provider.parseEvent(
                event
            );

        if (parsed) {
            return parsed;
        }
    }

    return null;
}
