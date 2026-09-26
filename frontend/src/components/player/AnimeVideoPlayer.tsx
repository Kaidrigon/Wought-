import { useEffect, useRef } from "react";

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

    onEvent?: (
        event: AnimePlayerEvent
    ) => void;
};


export default function AnimeVideoPlayer({
    url,
    title = "Wought+ Anime Player",
    onEvent,
}: AnimeVideoPlayerProps) {

    const iframeRef =
        useRef<HTMLIFrameElement | null>(
            null
        );


    useEffect(() => {

        const handleMessage = (
            event: MessageEvent
        ) => {

            const playerEvent =
                parseAnimePlayerEvent(
                    event
                );


            if (!playerEvent) {
                return;
            }


            onEvent?.(
                playerEvent
            );
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
                ref={iframeRef}
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