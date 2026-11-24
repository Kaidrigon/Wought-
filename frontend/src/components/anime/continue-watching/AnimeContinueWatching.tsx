
import { ArrowRight, Play } from "lucide-react";

import useAnimeContinueWatching from "../../../hooks/anime/useAnimeContinueWatching";

import AnimeContinueWatchingCard from "./AnimeContinueWatchingCard";

import "./AnimeContinueWatching.css";

export default function AnimeContinueWatching() {
    const {
        items,
        loading,
    } = useAnimeContinueWatching();

    if (!loading && items.length === 0) {
        return null;
    }

    return (
        <section className="anime-continue">
            <div className="anime-continue__header">
                <div className="anime-continue__heading">
                    <span className="anime-continue__eyebrow">
                        YOUR ANIMATION LOG
                    </span>

                    <div className="anime-continue__title-row">
                        <h2>Continue Watching</h2>

                        <span className="anime-continue__count">
                            {loading ? "--" : String(items.length).padStart(2, "0")}
                        </span>
                    </div>

                    <p>
                        Your unfinished transmissions. Man you have backlogs even here also don't you felt shame?
                    </p>
                </div>

                <div className="anime-continue__header-mark">
                    <Play size={15} fill="currentColor" />

                    <span>RESUME SIGNAL</span>

                    <ArrowRight size={15} />
                </div>
            </div>

            <div className="anime-continue__content">
                {loading ? (
                    <div className="anime-continue__grid">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                className="anime-continue__skeleton"
                                key={index}
                            >
                                <div className="anime-continue__skeleton-poster" />

                                <div className="anime-continue__skeleton-line" />

                                <div className="anime-continue__skeleton-line anime-continue__skeleton-line--short" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="anime-continue__grid">
                        {items.map((anime) => (
                            <AnimeContinueWatchingCard
                                key={anime.media_id}
                                anime={anime}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
