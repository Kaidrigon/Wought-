import { motion } from "framer-motion";

import type { AnimeData } from "../../types/anime";

import AnimeMediaCard from "./AnimeMediaCard";

import "./AnimeMediaRow.css";

interface AnimeMediaRowProps {
    anime: AnimeData[];
    startIndex?: number;
}

export default function AnimeMediaRow({
    anime,
    startIndex = 0,
}: AnimeMediaRowProps) {
    if (!anime.length) return null;

    return (
        <motion.div
            className="anime-media-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.5,
                ease: [0.2, 0.8, 0.2, 1],
            }}
        >
            <div className="anime-media-row__grid">
                {anime.map((item, index) => {
                    const cardIndex = startIndex + index;

                    return (
                        <motion.div
                            key={item.anilist_id}
                            className="anime-media-row__item"
                            initial={{
                                opacity: 0,
                                y: 24,
                                scale: 0.98,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                            }}
                            transition={{
                                duration: 0.5,
                                delay: Math.min(index * 0.055, 0.4),
                                ease: [0.2, 0.8, 0.2, 1],
                            }}
                        >
                            <span
                                className="anime-media-row__index"
                                aria-hidden="true"
                            >
                                {String(cardIndex + 1).padStart(3, "0")}
                            </span>

                            <span
                                className="anime-media-row__corner"
                                aria-hidden="true"
                            />

                            <AnimeMediaCard
                                anime={item}
                                index={cardIndex}
                            />
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}