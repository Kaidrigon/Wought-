
import type { AnimeData } from "../../../../types/anime";

import AnimeTransitionCanvas from "./AnimeTransitionCanvas";

import "./AnimeHeroArtwork.css";

interface AnimeHeroArtworkProps {
    anime: AnimeData;
}

export default function AnimeHeroArtwork({
    anime,
}: AnimeHeroArtworkProps) {
    const desktopImage =
        anime.backdrop_link ||
        anime.poster_link ||
        "";

    const mobileImage =
        anime.poster_link ||
        anime.backdrop_link ||
        "";

    return (
        <div className="anime-artwork">
            <AnimeTransitionCanvas
                desktopImage={desktopImage}
                mobileImage={mobileImage}
            />

            <div className="anime-artwork__grain" />

            <div className="anime-artwork__scanlines" />

            <div className="anime-artwork__vignette" />

            <div className="anime-artwork__shade" />

            <div
                className="anime-artwork__coordinates"
                aria-hidden="true"
            >
                <span>W+ / VISUAL SYSTEM</span>
                <span>ANIMATION FEED — ACTIVE</span>
            </div>

            <div
                className="anime-artwork__crosshair"
                aria-hidden="true"
            >
                <span />
                <span />
            </div>
        </div>
    );
}
