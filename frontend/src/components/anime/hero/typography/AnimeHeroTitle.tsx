
import type { CSSProperties } from "react";
import { motion } from "framer-motion";

import "./AnimeHeroTitle.css";

interface AnimeHeroTitleProps {
    title: string;
    index: number;
}

export default function AnimeHeroTitle({
    title,
    index,
}: AnimeHeroTitleProps) {
    const characters = Array.from(title);

    return (
        <div className="anime-title">
            <motion.div
                className="anime-title__serial"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.55 }}
            >
                <span className="anime-title__serial-mark">
                    0{index + 1}
                </span>
                <span className="anime-title__serial-line" />
                <span>FEATURED WORK</span>
            </motion.div>

            <div className="anime-title__lockup">
                <span
                    className="anime-title__ghost"
                    aria-hidden="true"
                >
                    {title}
                </span>

                <h1
                    className="anime-title__heading"
                    aria-label={title}
                >
                    {characters.map((character, characterIndex) => (
                        <motion.span
                            key={`${character}-${characterIndex}`}
                            className={
                                character === " "
                                    ? "anime-title__character anime-title__character--space"
                                    : "anime-title__character"
                            }
                            aria-hidden="true"
                            initial={{
                                opacity: 0,
                                y: 65,
                                rotateX: -65,
                                skewX: -12,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                rotateX: 0,
                                skewX: 0,
                            }}
                            transition={{
                                delay: 0.24 + characterIndex * 0.025,
                                duration: 0.7,
                                ease: [0.16, 1, 0.3, 1],
                            }}
                            style={
                                {
                                    "--character-index": characterIndex,
                                } as CSSProperties
                            }
                        >
                            {character === " " ? "\u00A0" : character}
                        </motion.span>
                    ))}
                </h1>

                <motion.span
                    className="anime-title__side-mark"
                    initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.65, duration: 0.7 }}
                    aria-hidden="true"
                >
                    アニメ
                </motion.span>
            </div>

            <motion.div
                className="anime-title__underline"
                initial={{ scaleX: 0, transformOrigin: "left" }}
                animate={{ scaleX: 1 }}
                transition={{
                    delay: 0.62,
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                }}
            />
        </div>
    );
}
