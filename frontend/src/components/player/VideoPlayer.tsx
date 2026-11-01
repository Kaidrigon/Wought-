

import { useEffect } from "react";

import "./VideoPlayer.css";

import {
    parsePlayerEvent,
} from "../../services/player/playerManager";

import type {
    PlayerEvent,
    PlayerProviderId,
} from "../../services/player/types";

type VideoPlayerProps = {
    provider: PlayerProviderId;
    url: string;
    title?: string;
    onEvent?: (
        event: PlayerEvent
    ) => void;
};

const PROVIDER_SANDBOX: Record<
    PlayerProviderId,
    string
> = {
    cinemaos:
        "allow-scripts allow-same-origin allow-forms",

    framextv:
        "allow-scripts allow-same-origin allow-forms",

    vidsrc:
        "allow-scripts allow-same-origin allow-forms",
};

export default function VideoPlayer({
    provider,
    url,
    title = "Wought+ Player",
    onEvent,
}: VideoPlayerProps) {

    useEffect(() => {
        const handleMessage = (
            event: MessageEvent
        ) => {
            const playerEvent =
                parsePlayerEvent(event);

            if (!playerEvent) {
                return;
            }

            onEvent?.(playerEvent);
        };

        window.addEventListener(
            "message",
            handleMessage
        );

        return () => {
            window.removeEventListener(
                "message",
                handleMessage
            );
        };
    }, [onEvent]);

    return (
        <div className="video-player">
            <iframe
                className="video-player__iframe"
                src={url}
                title={title}
                sandbox={PROVIDER_SANDBOX[provider]}
                allowFullScreen
                allow="
                    autoplay;
                    fullscreen;
                    picture-in-picture;
                    encrypted-media
                "
                referrerPolicy="origin"
            />
        </div>
    );
}
