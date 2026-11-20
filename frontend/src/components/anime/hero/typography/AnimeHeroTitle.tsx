
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

    const isJapanese = /[\u3040-\u30ff\u3400-\u9fff]/u.test(title);
    const titleLength = characters.length;

    const lengthClass =
        titleLength > 42
            ? "anime-title--extra-long"
            : titleLength > 25
              ? "anime-title--long"
              : "";

    const animationStep =
        titleLength > 35 ? 0.008 : titleLength > 22 ? 0.014 : 0.025;

    const renderCharacters = (word: string, offset: number) =>
        Array.from(word).map((character, characterIndex) => (
            <motion.span
                key={`${offset}-${characterIndex}`}
                className="anime-title__character"
                aria-hidden="true"
                initial={{
                    opacity: 0,
                    y: 45,
                    rotateX: -45,
                    skewX: -8,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    skewX: 0,
                }}
                transition={{
                    delay:
                        0.24 +
                        Math.min((offset + characterIndex) * animationStep, 0.7),
                    duration: 0.65,
                    ease: [0.16, 1, 0.3, 1],
                }}
            >
                {character}
            </motion.span>
        ));

    const renderTitle = () => {
        // Japanese text can wrap naturally between individual characters.
        if (isJapanese) {
            return characters.map((character, characterIndex) => {
                if (/\s/u.test(character)) {
                    return character;
                }

                return (
                    <span
                        className="anime-title__japanese-character"
                        key={`${character}-${characterIndex}`}
                    >
                        {renderCharacters(character, characterIndex)}
                    </span>
                );
            });
        }

        // English text is grouped into words, so wrapping happens
        // between words instead of randomly between individual letters.
        const words = title.match(/\s+|[^\s]+/gu) ?? [title];

        let characterOffset = 0;

        return words.map((word, wordIndex) => {
            if (/^\s+$/u.test(word)) {
                characterOffset += Array.from(word).length;

                return (
                    <span
                        className="anime-title__space"
                        key={`space-${wordIndex}`}
                    >
                        {word}
                    </span>
                );
            }

            const currentOffset = characterOffset;
            characterOffset += Array.from(word).length;

            return (
                <span
                    className="anime-title__word"
                    key={`word-${wordIndex}`}
                >
                    {renderCharacters(word, currentOffset)}
                </span>
            );
        });
    };

    return (
        <div
            className={[
                "anime-title",
                lengthClass,
                isJapanese ? "anime-title--japanese" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <motion.div
                className="anime-title__serial"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.55 }}
            >
                <span className="anime-title__serial-mark">
                    {String(index + 1).padStart(2, "0")}
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
                    lang={isJapanese ? "ja" : undefined}
                >
                    {renderTitle()}
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
