import { useEffect } from "react";

import "./VideoPlayer.css";

import {
    parsePlayerEvent,
} from "../../services/player/playerManager";

import type {
    PlayerEvent,
} from "../../services/player/types";

type VideoPlayerProps = {
    provider?: string;
    url: string;
    title?: string;
    onEvent?: (
        event: PlayerEvent
    ) => void;
};

export default function VideoPlayer({
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
