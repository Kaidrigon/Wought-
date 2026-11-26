
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
    Radio,
    Clock3,
    CalendarDays,
} from "lucide-react";

import useNowAiringAnime from "../../../hooks/anime/useNowAiringAnime";
import type { NowAiringAnimeData } from "../../../hooks/anime/useNowAiringAnime";

import "./NowAiringAnime.css";

function formatCountdown(airingAt: number, now: number): string {
    const difference = Math.max(0, airingAt * 1000 - now);

    if (difference <= 0) {
        return "RELEASED";
    }

    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) {
        return `${days}D ${hours}H ${minutes}M`;
    }

    if (hours > 0) {
        return `${hours}H ${minutes}M`;
    }

    return `${minutes}M`;
}

function formatAiringDate(airingAt: number): string {
    return new Date(airingAt * 1000).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
    });
}

function NowAiringCard({
    anime,
    index,
    now,
}: {
    anime: NowAiringAnimeData;
    index: number;
    now: number;
}) {
    const countdown = formatCountdown(anime.airing_at, now);
    const released = countdown === "RELEASED";

    return (
        <motion.article
            className="now-airing-card"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
                duration: 0.45,
                delay: Math.min(index * 0.045, 0.3),
            }}
        >
            <Link
                to={`/anime/tv/${anime.anilist_id}`}
                className="now-airing-card__link"
                aria-label={`View ${anime.title}`}
            >
                <div className="now-airing-card__poster">
                    {anime.poster_link ? (
                        <img
                            src={anime.poster_link}
                            alt={anime.title}
                            loading="lazy"
                        />
                    ) : (
                        <div className="now-airing-card__placeholder">
                            ARTWORK UNAVAILABLE
                        </div>
                    )}

                    <div className="now-airing-card__image-shade" />

                    <span className="now-airing-card__live">
                        <span />
                        ON AIR
                    </span>

                    <span className="now-airing-card__episode">
                        EP {String(anime.next_episode).padStart(2, "0")}
                    </span>

                    <div className="now-airing-card__poster-bottom">
                        <span>
                            {anime.season
                                ? `${anime.season} ${anime.season_year ?? ""}`
                                : anime.season_year ?? "CURRENT SEASON"}
                        </span>
                    </div>
                </div>

                <div className="now-airing-card__information">
                    <h3>{anime.title}</h3>

                    <div className="now-airing-card__genres">
                        {anime.genres?.slice(0, 2).join(" / ") ||
                            "ANIMATION"}
                    </div>

                    <div className="now-airing-card__schedule">
                        <div className="now-airing-card__schedule-icon">
                            <Clock3 size={14} />
                        </div>

                        <div className="now-airing-card__schedule-text">
                            <span>
                                {released ? "NEXT EPISODE" : "NEXT EPISODE IN"}
                            </span>

                            <strong className={released ? "is-released" : ""}>
                                {released
                                    ? `EP ${anime.next_episode} RELEASED`
                                    : countdown}
                            </strong>
                        </div>
                    </div>

                    <div className="now-airing-card__date">
                        <CalendarDays size={12} />
                        {formatAiringDate(anime.airing_at)}
                    </div>
                </div>
            </Link>
        </motion.article>
    );
}

function NowAiringSkeleton() {
    return (
        <div className="now-airing__skeleton-rail">
            {Array.from({ length: 5 }).map((_, index) => (
                <div className="now-airing__skeleton" key={index}>
                    <div className="now-airing__skeleton-poster" />
                    <div className="now-airing__skeleton-line" />
                    <div className="now-airing__skeleton-line now-airing__skeleton-line--short" />
                    <div className="now-airing__skeleton-info" />
                </div>
            ))}
        </div>
    );
}

export default function NowAiringAnime() {
    const { anime, loading, error } = useNowAiringAnime();

    const scrollRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(Date.now());
        }, 60_000);

        return () => window.clearInterval(interval);
    }, []);

    if (!loading && !error && anime.length === 0) {
        return null;
    }

    return (
        <motion.section
            className="now-airing"
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.08 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
        >
            <div className="now-airing__inner">
                <div className="now-airing__topline">
                    <span className="now-airing__eyebrow">
                        <span className="now-airing__signal" />
                        W+ / BROADCAST NETWORK
                    </span>

                    <span className="now-airing__edition">
                        LIVE SCHEDULE — 002
                    </span>
                </div>

                <div className="now-airing__header">
                    <div className="now-airing__heading">
                        <div className="now-airing__kicker">
                            <Radio size={14} />
                            CURRENTLY BROADCASTING
                        </div>

                        <h2>
                            Now <span>Airing.</span>
                        </h2>

                        <p>
                            New episodes are dropping. Your social life can
                            probably wait another week.
                        </p>
                    </div>

                    {!loading && !error && (
                        <div className="now-airing__controls">
                            <div className="now-airing__count">
                                <strong>
                                    {String(anime.length).padStart(2, "0")}
                                </strong>
                                <span>ACTIVE SERIES</span>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <NowAiringSkeleton />
                ) : error ? (
                    <div className="now-airing__error">
                        <Radio size={20} />
                        <div>
                            <strong>Broadcast signal interrupted.</strong>
                            <span>{error}</span>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="now-airing-results"
                            className="now-airing__rail"
                            ref={scrollRef}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            {anime.map((item, index) => (
                                <div
                                    className="now-airing__item"
                                    key={item.anilist_id}
                                >
                                    <NowAiringCard
                                        anime={item}
                                        index={index}
                                        now={now}
                                    />
                                </div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                )}

                <div className="now-airing__footer">
                    <span>
                        <span className="now-airing__footer-dot" />
                        BROADCAST STATUS: ACTIVE
                    </span>

                    <span>TIME UNTIL NEXT TRANSMISSION</span>
                </div>
            </div>
        </motion.section>
    );
}
