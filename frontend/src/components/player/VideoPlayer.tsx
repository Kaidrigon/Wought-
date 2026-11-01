
import { useEffect, useRef } from "react";

import { Maximize2 } from "lucide-react";

import "./VideoPlayer.css";

import {
    parsePlayerEvent,
} from "../../services/player/playerManager";

import type {
    PlayerEvent,
} from "../../services/player/types";

type VideoPlayerProps = {
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

    const containerRef =
        useRef<HTMLDivElement | null>(null);

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

    const handleFullscreen = async () => {
        const container =
            containerRef.current;

        if (!container) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await container.requestFullscreen();
            }
        } catch (error) {
            console.error(
                "Fullscreen request failed:",
                error
            );
        }
    };

    return (
        <div
            ref={containerRef}
            className="video-player"
        >
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

            <button
                type="button"
                className="video-player__fullscreen"
                onClick={handleFullscreen}
                aria-label="Toggle fullscreen"
                title="Fullscreen"
            >
                <Maximize2 size={20} />
            </button>
        </div>
    );
}
