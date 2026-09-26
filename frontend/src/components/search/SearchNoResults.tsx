import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, MessageCircle, Send } from "lucide-react";

type SearchNoResultsProps = {
    query: string;
    isAnime: boolean;
};

export default function SearchNoResults({
    query,
    isAnime,
}: SearchNoResultsProps) {

    const [replyOpen, setReplyOpen] =
        useState(false);

    const [reply, setReply] =
        useState("");

    const [replySent, setReplySent] =
        useState(false);

    function handleReplySubmit() {

        if (!reply.trim() || replySent) {
            return;
        }

        setReplySent(true);
    }

    return (

        <motion.section
            className={`search-empty ${
                isAnime
                    ? "search-empty--anime"
                    : "search-empty--cinema"
            }`}
            initial={{
                opacity: 0,
                y: 15,
            }}
            animate={{
                opacity: 1,
                y: 0,
            }}
            transition={{
                duration: 0.45,
            }}
        >

            <div className="search-empty__topline" />

            <p className="search-empty__label">
                {isAnime
                    ? "NO ANIME FOUND"
                    : "NOTHING FOUND"}
            </p>

            <h2>
                {isAnime
                    ? "You summoned absolutely nothing."
                    : "We looked. Nothing wanted to show up."}
            </h2>

            <p className="search-empty__description">

                You searched for{" "}

                <strong>
                    "{query.trim()}"
                </strong>

                .

                {" "}

                {isAnime
                    ? "Even the 2D population has standards."
                    : "Apparently even our database has standards."}

            </p>

            {!replySent && (

                <motion.button
                    type="button"
                    className="search-empty__talk"
                    onClick={() =>
                        setReplyOpen((current) => !current)
                    }
                    whileHover={{
                        y: -2,
                    }}
                    whileTap={{
                        scale: .97,
                    }}
                >

                    <MessageCircle
                        size={17}
                    />

                    {replyOpen
                        ? "Never mind"
                        : "Talk back"}

                    <ArrowUpRight
                        size={15}
                    />

                </motion.button>

            )}

            <AnimatePresence>

                {replyOpen && !replySent && (

                    <motion.div
                        className="search-empty__reply"
                        initial={{
                            opacity: 0,
                            height: 0,
                            y: -8,
                        }}
                        animate={{
                            opacity: 1,
                            height: "auto",
                            y: 0,
                        }}
                        exit={{
                            opacity: 0,
                            height: 0,
                            y: -8,
                        }}
                        transition={{
                            duration: .3,
                        }}
                    >

                        <div className="search-empty__reply-header">

                            <span>
                                Fine. Say your piece.
                            </span>

                            <span>
                                ONE SHOT
                            </span>

                        </div>

                        <textarea
                            value={reply}
                            onChange={(event) =>
                                setReply(
                                    event.target.value
                                )
                            }
                            placeholder={
                                isAnime
                                    ? "Complain to the fictional robot..."
                                    : "Tell Wought+ how disappointed you are..."
                            }
                            maxLength={280}
                            autoFocus
                        />

                        <div className="search-empty__reply-footer">

                            <span>
                                {reply.length}/280
                            </span>

                            <button
                                type="button"
                                onClick={
                                    handleReplySubmit
                                }
                                disabled={
                                    !reply.trim()
                                }
                            >

                                <Send
                                    size={15}
                                />

                                Send it

                            </button>

                        </div>

                    </motion.div>

                )}

            </AnimatePresence>

            <AnimatePresence>

                {replySent && (

                    <motion.div
                        className="search-empty__response"
                        initial={{
                            opacity: 0,
                            y: 12,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        transition={{
                            duration: .45,
                        }}
                    >

                        <div className="search-empty__response-label">
                            YOU
                        </div>

                        <div className="search-empty__user-reply">
                            {reply}
                        </div>

                        <div className="search-empty__response-label search-empty__response-label--wought">
                            WOUGHT+
                        </div>

                        <p>

                            {isAnime
                                ? "Yeah, whatever. As if I'm gonna read your stupid little opinion. It's 2026. Do you seriously still think anybody cares? Go touch some grass and leave me alone."
                                : "Yeah, whatever. As if I'm gonna read your stupid ass opinion. It's 2026. Do your stinky little ass still think anybody cares about you? Go fuck yourself."}

                        </p>

                        <span className="search-empty__response-final">
                            Conversation terminated.
                        </span>

                    </motion.div>

                )}

            </AnimatePresence>

        </motion.section>

    );
}