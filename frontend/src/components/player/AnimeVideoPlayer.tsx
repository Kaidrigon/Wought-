
import { useEffect } from "react";

import "./VideoPlayer.css";

import {
    parseAnimePlayerEvent,
} from "../../services/player/animePlayerManager";

import type {
    AnimePlayerEvent,
} from "../../services/player/animeTypes";

type AnimeVideoPlayerProps = {
    url: string;
    title?: string;
    onEvent?: (event: AnimePlayerEvent) => void;
};

export default function AnimeVideoPlayer({
    url,
    title = "Wought+ Anime Player",
    onEvent,
}: AnimeVideoPlayerProps) {
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Ignore messages that aren't coming from the player iframe.
            const iframe = document.querySelector<HTMLIFrameElement>(
                ".video-player__iframe"
            );

            if (
                iframe?.contentWindow &&
                event.source !== iframe.contentWindow
            ) {
                return;
            }

            // Log the raw message so we can inspect provider events.
            console.debug("[ANIME PLAYER] Raw message:", {
                origin: event.origin,
                data: event.data,
            });

            const playerEvent = parseAnimePlayerEvent(event);

            if (!playerEvent) {
                console.debug(
                    "[ANIME PLAYER] Message was not recognized."
                );
                return;
            }

            console.info(
                "[ANIME PLAYER] Parsed event:",
                playerEvent
            );

            onEvent?.(playerEvent);
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [onEvent]);

    return (
        <div className="video-player">
            <iframe
                className="video-player__iframe"
                src={url}
                title={title}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                referrerPolicy="origin"
            />
        </div>
    );
}
