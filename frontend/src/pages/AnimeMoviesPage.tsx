import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from "react";

import {
    AnimatePresence,
    LazyMotion,
    MotionConfig,
    domAnimation,
    m,
} from "framer-motion";

import {
    ArrowDownWideNarrow,
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronDown,
    Film,
    RotateCcw,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";

import { API_BASE_URL } from "../services/api/api";

import type {
    AnimeData,
    AnimeDiscoverResponse,
    AnimeSortOption,
} from "../types/anime";

import AnimeMediaRow from "../components/media/AnimeMediaRow";

import "./AnimeMoviesPage.css";

/* =========================================================
   STATIC DATA (created once, never rebuilt on re-render)
========================================================= */

const GENRES = [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Ecchi",
    "Fantasy",
    "Horror",
    "Mahou Shoujo",
    "Mecha",
    "Music",
    "Mystery",
    "Psychological",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Thriller",
];

const SORT_OPTIONS: {
    value: AnimeSortOption;
    label: string;
    note: string;
}[] = [
    { value: "popularity", label: "Most Popular", note: "THE CROWD DECIDES" },
    { value: "score", label: "Highest Rated", note: "CRITICALLY LESS QUESTIONABLE" },
    { value: "trending", label: "Trending Now", note: "CURRENTLY MAKING NOISE" },
    { value: "newest", label: "Newest Releases", note: "FRESHLY TRANSMITTED" },
    { value: "oldest", label: "Oldest Releases", note: "FROM THE VAULT" },
];

const PAGE_SIZE = 20;
const MAX_PAGES = 500;
const CACHE_LIMIT = 40;

const SKELETON_ITEMS = Array.from({ length: 10 }, (_, index) => index);
const TICKER_COPIES = [0, 1, 2, 3];

const BAR_STYLES: CSSProperties[] = Array.from(
    { length: 18 },
    (_, index) => ({ "--bar-index": index }) as CSSProperties
);

/**
 * Dots sit on the orbit rings at different, uneven angles so they look
 * scattered. They are children of the rings, so they travel with them.
 */
const polar = (angle: number) => {
    const radians = (angle * Math.PI) / 180;

    return {
        left: `${(50 + 50 * Math.cos(radians)).toFixed(2)}%`,
        top: `${(50 + 50 * Math.sin(radians)).toFixed(2)}%`,
    };
};

const ORBIT_RINGS = [
    {
        id: "one",
        dots: [
            { angle: 32, size: 6 },
            { angle: 214, size: 4 },
        ],
    },
    {
        id: "two",
        dots: [
            { angle: 128, size: 5 },
            { angle: 306, size: 3 },
        ],
    },
    {
        id: "three",
        dots: [{ angle: 76, size: 4 }],
    },
].map((ring) => ({
    id: ring.id,
    dots: ring.dots.map((dot) => ({
        key: dot.angle,
        style: {
            ...polar(dot.angle),
            width: dot.size,
            height: dot.size,
        } as CSSProperties,
    })),
}));

/* =========================================================
   TYPES + RESPONSE HANDLING
========================================================= */

type AnimeDiscoverPayload = AnimeDiscoverResponse | AnimeData[];

interface PageResult {
    items: AnimeData[];
    totalResults: number;
    totalPages: number;
    hasNextPage: boolean;
}

const EMPTY_RESULT: PageResult = {
    items: [],
    totalResults: 0,
    totalPages: 1,
    hasNextPage: false,
};

// Supports both plain-array and paginated-object responses.
function normalizePayload(
    payload: AnimeDiscoverPayload,
    page: number
): PageResult {
    if (Array.isArray(payload)) {
        const hasNextPage = payload.length >= PAGE_SIZE;

        return {
            items: payload,
            totalResults: payload.length,
            totalPages: hasNextPage ? page + 1 : page,
            hasNextPage,
        };
    }

    return {
        items: payload.results ?? [],
        totalResults: payload.total_results ?? 0,
        totalPages: Math.max(1, Math.min(payload.total_pages ?? 1, MAX_PAGES)),
        hasNextPage: Boolean(payload.has_next_page),
    };
}

// Tiny in-memory cache so going back to a page you already saw is instant.
const pageCache = new Map<string, PageResult>();

function rememberPage(key: string, value: PageResult) {
    if (pageCache.size >= CACHE_LIMIT) {
        const oldest = pageCache.keys().next().value;
        if (oldest !== undefined) pageCache.delete(oldest);
    }

    pageCache.set(key, value);
}

/* =========================================================
   PAUSE INFINITE ANIMATIONS WHEN OFF-SCREEN
========================================================= */

function usePauseWhenOffscreen<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);

    useEffect(() => {
        const node = ref.current;

        if (!node || typeof IntersectionObserver === "undefined") return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                node.classList.toggle("is-offscreen", !entry.isIntersecting);
            },
            { rootMargin: "120px 0px" }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return ref;
}

/* =========================================================
   STATIC SECTIONS (memoised: they never re-render when
   filters, pages or dropdowns change)
========================================================= */

const Hero = memo(function Hero() {
    const ref = usePauseWhenOffscreen<HTMLElement>();

    return (
        <section ref={ref} className="anime-movies__intro">
            <div className="anime-movies__eyebrow">
                <span className="anime-movies__eyebrow-live">
                    <i />
                    ARCHIVE SIGNAL LIVE
                </span>
                <span>W+ / ANIMATION DIVISION</span>
                <span className="anime-movies__eyebrow-index">
                    SOME CURSE WORD TO MAKE YOU MAD.
                </span>
            </div>

            <div className="anime-movies__hero">
                <div className="anime-movies__hero-copy">
                    <m.p
                        className="anime-movies__overline"
                        initial={{ opacity: 0, x: -18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.55 }}
                    >
                        A COLLECTION OF MOVING PICTURES
                    </m.p>

                    <m.h1
                        initial={{ opacity: 0, y: 34, skewY: 2 }}
                        animate={{ opacity: 1, y: 0, skewY: 0 }}
                        transition={{
                            duration: 0.8,
                            ease: [0.2, 0.75, 0.2, 1],
                        }}
                    >
                        ANIME
                        <span className="anime-movies__title-slash">/</span>
                        <em>FILMS</em>
                        <span className="anime-movies__title-period">.</span>
                    </m.h1>

                    <m.div
                        className="anime-movies__hero-subline"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.28, duration: 0.55 }}
                    >
                        <span className="anime-movies__hero-index">A—001</span>
                        <p>
                            Stories, frames, and questionable life choices.
                            <br />
                            Curated by absolutely nobody.
                        </p>
                    </m.div>
                </div>

                <m.div
                    className="anime-movies__signal"
                    initial={{ opacity: 0, scale: 0.82, rotate: -12 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{
                        duration: 1,
                        delay: 0.2,
                        ease: [0.16, 1, 0.3, 1],
                    }}
                >
                    <div className="anime-movies__signal-label">
                        <span>TRANSMISSION</span>
                    </div>

                    <div className="anime-movies__orbit">
                        {ORBIT_RINGS.map((ring) => (
                            <div
                                key={ring.id}
                                className={`anime-movies__orbit-ring anime-movies__orbit-ring--${ring.id}`}
                            >
                                {ring.dots.map((dot) => (
                                    <span
                                        key={dot.key}
                                        className="anime-movies__orbit-dot"
                                        style={dot.style}
                                    />
                                ))}
                            </div>
                        ))}

                        <div className="anime-movies__orbit-core">
                            <span>W+</span>
                        </div>
                    </div>

                    <div className="anime-movies__signal-bottom">
                        <span>FREQUENCY 59.7</span>
                        <span className="anime-movies__signal-bars">
                            {BAR_STYLES.map((style, index) => (
                                <i key={index} style={style} />
                            ))}
                        </span>
                        <span>CONNECTED</span>
                    </div>

                    <div className="anime-movies__scanline" />
                </m.div>
            </div>

            <div className="anime-movies__hero-footer">
                <span>NOT EVERYTHING NEEDS A LIVE ACTION REMAKE.</span>
                <span>
                    SCROLL TO EXPLORE <ArrowDownWideNarrow size={14} />
                </span>
            </div>
        </section>
    );
});

const Ticker = memo(function Ticker() {
    const ref = usePauseWhenOffscreen<HTMLDivElement>();

    return (
        <div ref={ref} className="anime-movies__ticker" aria-hidden="true">
            <div className="anime-movies__ticker-track">
                {TICKER_COPIES.map((copy) => (
                    <span key={copy}>
                        ANIMATION IS NOT A GENRE
                        <i>✳</i>
                        HENTAI IS LOVE
                        <i>✳</i>
                        ARCHIVE OPEN
                        <i>✳</i>
                        ARCHIVE CLOSE COZ YOU ARE NOT GONNA READ THIS MUCH!!
                        <i>✳</i>
                    </span>
                ))}
            </div>
        </div>
    );
});

/* =========================================================
   PAGE
========================================================= */

export default function AnimeMoviesPage() {
    const [page, setPage] = useState(1);

    const [selectedGenre, setSelectedGenre] = useState("");
    const [genreSearch, setGenreSearch] = useState("");
    const [sortBy, setSortBy] = useState<AnimeSortOption>("popularity");

    const [genreOpen, setGenreOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);

    const [result, setResult] = useState<PageResult>(EMPTY_RESULT);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retryKey, setRetryKey] = useState(0);

    const toolbarRef = useRef<HTMLDivElement>(null);
    const ambientRef = usePauseWhenOffscreen<HTMLDivElement>();

    const {
        items: anime,
        totalResults,
        totalPages,
        hasNextPage,
    } = result;

    const filteredGenres = useMemo(() => {
        const query = genreSearch.trim().toLowerCase();

        if (!query) return GENRES;

        return GENRES.filter((genre) =>
            genre.toLowerCase().includes(query)
        );
    }, [genreSearch]);

    const selectedSort =
        SORT_OPTIONS.find((option) => option.value === sortBy) ??
        SORT_OPTIONS[0];

    /* ---------- data loading ---------- */

    useEffect(() => {
        const params = new URLSearchParams({
            category: "movie",
            page: String(page),
            sort_by: sortBy,
        });

        if (selectedGenre) {
            params.set("genre", selectedGenre);
        }

        const key = params.toString();
        const cached = pageCache.get(key);

        // Already seen this page: show it instantly, no skeleton flash.
        if (cached) {
            setResult(cached);
            setError("");
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `${API_BASE_URL}/discover/anime?${key}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(
                        `Anime request failed (${response.status})`
                    );
                }

                const payload: AnimeDiscoverPayload = await response.json();
                const next = normalizePayload(payload, page);

                rememberPage(key, next);
                setResult(next);
            } catch (requestError) {
                if (controller.signal.aborted) return;

                console.error("Anime discovery error:", requestError);
                setError(
                    "The archive refused to cooperate. Try reconnecting."
                );
                setResult(EMPTY_RESULT);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => controller.abort();
    }, [page, selectedGenre, sortBy, retryKey]);

    /* ---------- dropdown behaviour ---------- */

    const closeMenus = useCallback(() => {
        setGenreOpen(false);
        setSortOpen(false);
    }, []);

    const menuOpen = genreOpen || sortOpen;

    // Close on outside click or Escape (listeners only exist while open).
    useEffect(() => {
        if (!menuOpen) return;

        const onPointerDown = (event: PointerEvent) => {
            if (!toolbarRef.current?.contains(event.target as Node)) {
                closeMenus();
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeMenus();
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [menuOpen, closeMenus]);

    /* ---------- actions ---------- */

    const changeGenre = (genre: string) => {
        setSelectedGenre(genre);
        setGenreSearch("");
        setGenreOpen(false);
        setPage(1);
    };

    const changeSort = (sort: AnimeSortOption) => {
        setSortBy(sort);
        setSortOpen(false);
        setPage(1);
    };

    const clearFilters = () => {
        setSelectedGenre("");
        setGenreSearch("");
        setSortBy("popularity");
        closeMenus();
        setPage(1);
    };

    const retryRequest = () => {
        setRetryKey((current) => current + 1);
    };

    const goToPreviousPage = () => {
        setPage((current) => Math.max(1, current - 1));
    };

    const goToNextPage = () => {
        if (hasNextPage && page < totalPages) {
            setPage((current) => current + 1);
        }
    };

    const hasFilters = Boolean(selectedGenre) || sortBy !== "popularity";

    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation}>
                <main className="anime-movies">
                    <div
                        ref={ambientRef}
                        className="anime-movies__ambient"
                        aria-hidden="true"
                    >
                        <span className="anime-movies__ambient-glow" />
                        <span className="anime-movies__ambient-grid" />
                        <span className="anime-movies__noise" />
                    </div>

                    <div className="anime-movies__page-shell">
                        <Hero />
                        <Ticker />

                        <section className="anime-movies__catalogue">
                            <div className="anime-movies__section-heading">
                                <div>
                                    <span className="anime-movies__section-kicker">
                                        <span />
                                        THE COLLECTION
                                    </span>

                                    <h2>
                                        FILM
                                        <span> INDEX</span>
                                    </h2>
                                </div>

                                <div className="anime-movies__collection-count">
                                    <span>AVAILABLE RECORDS</span>
                                    <strong>
                                        {totalResults
                                            .toLocaleString("en-US")
                                            .padStart(4, "0")}
                                    </strong>
                                </div>
                            </div>

                            <div className="anime-movies__toolbar">
                                <div
                                    ref={toolbarRef}
                                    className="anime-movies__toolbar-left"
                                >
                                    <span className="anime-movies__toolbar-label">
                                        FILTER THE ARCHIVE
                                    </span>

                                    <div className="anime-movies__dropdown-wrap">
                                        <button
                                            type="button"
                                            className={`anime-movies__filter-button ${
                                                genreOpen ? "is-open" : ""
                                            }`}
                                            onClick={() => {
                                                setGenreOpen((open) => !open);
                                                setSortOpen(false);
                                                setGenreSearch("");
                                            }}
                                            aria-expanded={genreOpen}
                                        >
                                            <SlidersHorizontal size={15} />
                                            <span>
                                                {selectedGenre || "ALL GENRES"}
                                            </span>
                                            <ChevronDown size={15} />
                                        </button>

                                        <AnimatePresence>
                                            {genreOpen && (
                                                <m.div
                                                    className="anime-movies__dropdown anime-movies__genre-menu"
                                                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                                    transition={{ duration: 0.16 }}
                                                >
                                                    <div className="anime-movies__dropdown-heading">
                                                        <span>SELECT A FREQUENCY</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setGenreOpen(false)}
                                                            aria-label="Close genre menu"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>

                                                    <div className="anime-movies__genre-search">
                                                        <Search size={15} />
                                                        <input
                                                            type="text"
                                                            value={genreSearch}
                                                            onChange={(event) =>
                                                                setGenreSearch(event.target.value)
                                                            }
                                                            placeholder="Find a genre..."
                                                            autoFocus
                                                        />
                                                    </div>

                                                    <div className="anime-movies__genre-list">
                                                        <button
                                                            type="button"
                                                            className={!selectedGenre ? "is-selected" : ""}
                                                            onClick={() => changeGenre("")}
                                                        >
                                                            <span>ALL GENRES</span>
                                                            {!selectedGenre && <Check size={15} />}
                                                        </button>

                                                        {filteredGenres.map((genre) => (
                                                            <button
                                                                type="button"
                                                                key={genre}
                                                                className={
                                                                    selectedGenre === genre
                                                                        ? "is-selected"
                                                                        : ""
                                                                }
                                                                onClick={() => changeGenre(genre)}
                                                            >
                                                                <span>{genre}</span>
                                                                {selectedGenre === genre && (
                                                                    <Check size={15} />
                                                                )}
                                                            </button>
                                                        ))}

                                                        {filteredGenres.length === 0 && (
                                                            <p className="anime-movies__no-genres">
                                                                NO MATCHING FREQUENCIES FOUND BECAUSE EVEN THEY DONT WANNA GET CONNECT WITH YOU DUMB BITCH.
                                                            </p>
                                                        )}
                                                    </div>
                                                </m.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="anime-movies__dropdown-wrap">
                                        <button
                                            type="button"
                                            className={`anime-movies__filter-button ${
                                                sortOpen ? "is-open" : ""
                                            }`}
                                            onClick={() => {
                                                setSortOpen((open) => !open);
                                                setGenreOpen(false);
                                            }}
                                            aria-expanded={sortOpen}
                                        >
                                            <ArrowDownWideNarrow size={15} />
                                            <span>{selectedSort.label}</span>
                                            <ChevronDown size={15} />
                                        </button>

                                        <AnimatePresence>
                                            {sortOpen && (
                                                <m.div
                                                    className="anime-movies__dropdown anime-movies__sort-menu"
                                                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                                    transition={{ duration: 0.16 }}
                                                >
                                                    <div className="anime-movies__dropdown-heading">
                                                        <span>ARRANGE RECORDS</span>
                                                    </div>

                                                    {SORT_OPTIONS.map((option, index) => (
                                                        <button
                                                            type="button"
                                                            key={option.value}
                                                            className={
                                                                sortBy === option.value
                                                                    ? "is-selected"
                                                                    : ""
                                                            }
                                                            onClick={() => changeSort(option.value)}
                                                        >
                                                            <span className="anime-movies__sort-number">
                                                                0{index + 1}
                                                            </span>

                                                            <span className="anime-movies__sort-copy">
                                                                <strong>{option.label}</strong>
                                                                <small>{option.note}</small>
                                                            </span>

                                                            {sortBy === option.value && (
                                                                <Check size={15} />
                                                            )}
                                                        </button>
                                                    ))}
                                                </m.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {hasFilters && (
                                        <button
                                            type="button"
                                            className="anime-movies__clear"
                                            onClick={clearFilters}
                                        >
                                            <RotateCcw size={13} />
                                            RESET
                                        </button>
                                    )}
                                </div>

                                <div className="anime-movies__toolbar-right">
                                    <span className="anime-movies__live-indicator">
                                        {loading ? "SCANNING" : "ARCHIVE ONLINE"}
                                    </span>
                                    <span className="anime-movies__page-indicator">
                                        PAGE {String(page).padStart(2, "0")}
                                    </span>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <m.div
                                        key="loading"
                                        className="anime-movies__grid"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        {SKELETON_ITEMS.map((index) => (
                                            <div
                                                className={`anime-movies__skeleton anime-movies__skeleton--${index % 3}`}
                                                key={index}
                                            >
                                                <div className="anime-movies__skeleton-poster">
                                                    <span>RETRIEVING</span>
                                                </div>
                                                <div className="anime-movies__skeleton-line" />
                                                <div className="anime-movies__skeleton-line anime-movies__skeleton-line--short" />
                                            </div>
                                        ))}
                                    </m.div>
                                ) : error ? (
                                    <m.div
                                        key="error"
                                        className="anime-movies__message"
                                        initial={{ opacity: 0, y: 18 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="anime-movies__message-symbol">!</div>
                                        <span className="anime-movies__message-kicker">
                                            SIGNAL INTERRUPTED / ERROR 001
                                        </span>
                                        <h3>THE ARCHIVE WENT QUIET.</h3>
                                        <p>{error}</p>
                                        <button
                                            type="button"
                                            onClick={retryRequest}
                                            className="anime-movies__retry"
                                        >
                                            <RotateCcw size={15} />
                                            RETRY CONNECTION
                                        </button>
                                    </m.div>
                                ) : anime.length === 0 ? (
                                    <m.div
                                        key="empty"
                                        className="anime-movies__message"
                                        initial={{ opacity: 0, y: 18 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="anime-movies__message-symbol">
                                            <Film size={28} />
                                        </div>
                                        <span className="anime-movies__message-kicker">
                                            NO RECORDS DETECTED
                                        </span>
                                        <h3>NOTHING ON THIS FREQUENCY.</h3>
                                        <p>
                                            This particular corner of the archive is looking
                                            suspiciously empty.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className="anime-movies__retry"
                                        >
                                            CLEAR FILTERS
                                        </button>
                                    </m.div>
                                ) : (
                                    <m.div
                                        key={`${page}-${selectedGenre}-${sortBy}`}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        <AnimeMediaRow
                                            anime={anime}
                                            startIndex={(page - 1) * PAGE_SIZE}
                                        />
                                    </m.div>
                                )}
                            </AnimatePresence>

                            {!loading && !error && anime.length > 0 && (
                                <div className="anime-movies__pagination">
                                    <div className="anime-movies__pagination-info">
                                        <span>END OF CURRENT TRANSMISSION</span>
                                        <strong>
                                            {String(page).padStart(2, "0")}
                                            <i />
                                            {String(totalPages).padStart(2, "0")}
                                        </strong>
                                    </div>

                                    <div className="anime-movies__pagination-controls">
                                        <button
                                            type="button"
                                            onClick={goToPreviousPage}
                                            disabled={page <= 1}
                                            aria-label="Previous page"
                                        >
                                            <ArrowLeft size={17} />
                                            <span>PREVIOUS</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={goToNextPage}
                                            disabled={!hasNextPage || page >= totalPages}
                                            aria-label="Next page"
                                        >
                                            <span>NEXT</span>
                                            <ArrowRight size={17} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        <footer className="anime-movies__footer">
                            <span>W+ / ANIME ARCHIVE</span>
                            <span>STAY WEIRD.</span>
                        </footer>
                    </div>
                </main>
            </LazyMotion>
        </MotionConfig>
    );
}