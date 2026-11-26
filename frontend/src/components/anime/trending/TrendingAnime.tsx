
import { useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

import type { AnimeData } from "../../../types/anime";
import AnimeMediaCard from "../../media/AnimeMediaCard";

import "./TrendingAnime.css";

interface TrendingAnimeProps {
    anime: AnimeData[];
}

export default function TrendingAnime({ anime }: TrendingAnimeProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    if (anime.length === 0) {
        return null;
    }

    return (
        <motion.section
            className="anime-trending"
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.08 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
        >
            <div className="anime-trending__inner">
                <div className="anime-trending__topline">
                    <span className="anime-trending__eyebrow">
                        <span className="anime-trending__signal" />
                        W+ / ANIMATION DIVISION
                    </span>

                    <span className="anime-trending__edition">
                        TREND REPORT — 001
                    </span>
                </div>

                <div className="anime-trending__header">
                    <div className="anime-trending__heading">
                        <div className="anime-trending__kicker">
                            <TrendingUp size={14} />
                            WHAT EVERYONE IS WATCHING
                        </div>

                        <h2>
                            Trending<span> Anime.</span>
                        </h2>

                        <p>
                            The titles currently taking over everyone's
                            watchlists. Apparently, How do we know? We asked Netflix, Crunchyroll, and a few other streaming services. Hey atleast we are the ones telling you that we stalked your squicky little ass :)
                        </p>
                    </div>

                    <div className="anime-trending__controls">
                        <span className="anime-trending__count">
                            <strong>{String(anime.length).padStart(2, "0")}</strong>
                            <span>TRANSMISSIONS</span>
                        </span>

                        
                    </div>
                </div>

                <div className="anime-trending__rail-wrap">
                    <div className="anime-trending__rail-marker">
                        <span>01</span>
                        <div />
                        <span>W+ TRENDING INDEX</span>
                    </div>

                    <div
                        className="anime-trending__rail"
                        ref={scrollRef}
                        aria-label="Trending anime"
                    >
                        {anime.map((item, index) => (
                            <div
                                className="anime-trending__item"
                                key={item.anilist_id}
                            >
                                <AnimeMediaCard
                                    anime={item}
                                    index={index}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="anime-trending__footer">
                    <span>
                        <span className="anime-trending__footer-dot" />
                        TRENDING SIGNAL ACTIVE
                    </span>

                    <span>SCROLL TO EXPLORE</span>
                </div>
            </div>
        </motion.section>
    );
}
