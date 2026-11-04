import { useEffect, useRef, useState } from "react";

import {
    AnimatePresence,
    motion,
    useReducedMotion,
} from "framer-motion";

import {
    ArrowDownUp,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Film,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";

import { apiFetch } from "../services/api/api";
import type { HeroData } from "../types/hero";
import MediaCard from "../components/media/MediaCard";

import "./MoviesPage.css";

type DiscoverResponse = {
    results?: HeroData[];
    page?: number;
    total_pages?: number;
    total_results?: number;
};

const MOVIE_GENRES = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 14, name: "Fantasy" },
    { id: 36, name: "History" },
    { id: 27, name: "Horror" },
    { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Science Fiction" },
    { id: 53, name: "Thriller" },
    { id: 10752, name: "War" },
    { id: 37, name: "Western" },
];

const SORT_OPTIONS = [
    { value: "popularity.desc", label: "Most Popular" },
    { value: "vote_average.desc", label: "Top Rated" },
    { value: "primary_release_date.desc", label: "Newest First" },
    { value: "revenue.desc", label: "Highest Revenue" },
];

const gridVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.045,
        },
    },
};

const cardVariants = {
    hidden: {
        opacity: 0,
        y: 18,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.35,
            ease: "easeOut" as const,
        },
    },
};

/* =========================================
   W+ ORBITAL DECORATION
========================================= */

const ORBIT_VIEWBOX = 240;
const ORBIT_CENTER = ORBIT_VIEWBOX / 2;
const ORBIT_GLYPHS = ["·", "+", "°", "×", "∘"];

// Builds a closed elliptical path centred in the viewBox.
// `reverse` flips the travel direction.
function ellipsePath(rx: number, ry: number, reverse: boolean) {
    const sweep = reverse ? 0 : 1;

    return [
        `M ${ORBIT_CENTER - rx} ${ORBIT_CENTER}`,
        `A ${rx} ${ry} 0 1 ${sweep} ${ORBIT_CENTER + rx} ${ORBIT_CENTER}`,
        `A ${rx} ${ry} 0 1 ${sweep} ${ORBIT_CENTER - rx} ${ORBIT_CENTER}`,
    ].join(" ");
}

type OrbitRingProps = {
    rx: number;
    ry: number;
    tilt: number;
    count: number;
    duration: number;
    reverse?: boolean;
    satellite?: boolean;
    inner?: boolean;
    reduceMotion: boolean;
};

// One ring of ASCII glyphs travelling along a tilted ellipse.
// Every glyph gets a negative `begin` so they start evenly
// spread around the ring and loop seamlessly.
function OrbitRing({
    rx,
    ry,
    tilt,
    count,
    duration,
    reverse = false,
    satellite = false,
    inner = false,
    reduceMotion,
}: OrbitRingProps) {
    const path = ellipsePath(rx, ry, reverse);

    return (
        <g
            className={`movies-orbit-ring ${
                inner ? "movies-orbit-ring--inner" : ""
            }`}
            transform={`rotate(${tilt} ${ORBIT_CENTER} ${ORBIT_CENTER})`}
        >
            {Array.from({ length: count }, (_, index) => {
                const glyph =
                    ORBIT_GLYPHS[index % ORBIT_GLYPHS.length];

                if (reduceMotion) {
                    const angle = (index / count) * Math.PI * 2;

                    return (
                        <text
                            key={index}
                            className="movies-orbit__glyph"
                            x={ORBIT_CENTER + rx * Math.cos(angle)}
                            y={ORBIT_CENTER + ry * Math.sin(angle)}
                        >
                            {glyph}
                        </text>
                    );
                }

                return (
                    <text
                        key={index}
                        className="movies-orbit__glyph"
                    >
                        {glyph}

                        <animateMotion
                            dur={`${duration}s`}
                            begin={`${-(index / count) * duration}s`}
                            repeatCount="indefinite"
                            rotate="0"
                            path={path}
                        />
                    </text>
                );
            })}

            {satellite && (
                <circle
                    className="movies-orbit__satellite"
                    r={2.6}
                    cx={reduceMotion ? ORBIT_CENTER + rx : 0}
                    cy={reduceMotion ? ORBIT_CENTER : 0}
                >
                    {!reduceMotion && (
                        <animateMotion
                            dur={`${duration}s`}
                            repeatCount="indefinite"
                            path={path}
                        />
                    )}
                </circle>
            )}
        </g>
    );
}

function MovieSkeleton() {
    return (
        <div className="movies-skeleton">
            <div className="movies-skeleton__poster" />
            <div className="movies-skeleton__line" />
            <div className="movies-skeleton__line movies-skeleton__line--short" />
        </div>
    );
}

export default function MoviesPage() {
    const reduceMotion = useReducedMotion() ?? false;

    const [movies, setMovies] = useState<HeroData[]>([]);

    const [selectedGenre, setSelectedGenre] =
        useState<number | null>(null);

    const [sortBy, setSortBy] =
        useState("popularity.desc");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retryCount, setRetryCount] = useState(0);

    const [genreOpen, setGenreOpen] = useState(false);
    const [genreSearch, setGenreSearch] = useState("");
    const [sortOpen, setSortOpen] = useState(false);

    const genreRef = useRef<HTMLDivElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);

    const selectedGenreName =
        MOVIE_GENRES.find(
            (genre) => genre.id === selectedGenre
        )?.name ?? "All Genres";

    const filteredGenres = MOVIE_GENRES.filter((genre) =>
        genre.name.toLowerCase().includes(
            genreSearch.toLowerCase()
        )
    );

    const hasFilters =
        selectedGenre !== null ||
        sortBy !== "popularity.desc";

    // Close dropdowns when clicking outside or pressing Escape.
    useEffect(() => {
        function handleOutsideClick(event: PointerEvent) {
            const target = event.target as Node;

            if (!genreRef.current?.contains(target)) {
                setGenreOpen(false);
            }

            if (!sortRef.current?.contains(target)) {
                setSortOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setGenreOpen(false);
                setSortOpen(false);
            }
        }

        document.addEventListener(
            "pointerdown",
            handleOutsideClick
        );

        document.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                handleOutsideClick
            );

            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, []);

    // Fetch movies whenever the page, genre or sorting changes.
    useEffect(() => {
        let cancelled = false;

        async function fetchMovies() {
            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams({
                    page: String(page),
                    sort_by: sortBy,
                });

                if (selectedGenre !== null) {
                    params.set(
                        "genre_id",
                        String(selectedGenre)
                    );
                }

                const response = await apiFetch(
                    `/discover/movies?${params.toString()}`
                );

                if (!response.ok) {
                    throw new Error(
                        "Couldn't retrieve movies."
                    );
                }

                const data = await response.json();

                if (cancelled) return;

                // Support both the old array response and the
                // newer paginated response from the backend.
                const results: HeroData[] = Array.isArray(data)
                    ? data
                    : (data as DiscoverResponse).results ?? [];

                const responseData =
                    data as DiscoverResponse;

                setMovies(results);

                setTotalPages(
                    Array.isArray(data)
                        ? 1
                        : Math.max(
                            1,
                            Math.min(
                                responseData.total_pages ?? 1,
                                500
                            )
                        )
                );

                setTotalResults(
                    Array.isArray(data)
                        ? results.length
                        : responseData.total_results ?? 0
                );
            } catch (err) {
                if (cancelled) return;

                console.error(
                    "Movie discovery error:",
                    err
                );

                setError(
                    "Something went wrong while loading movies."
                );

                setMovies([]);
                setTotalResults(0);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchMovies();

        return () => {
            cancelled = true;
        };
    }, [page, selectedGenre, sortBy, retryCount]);

    function changeGenre(genreId: number | null) {
        setSelectedGenre(genreId);
        setPage(1);
        setGenreOpen(false);
        setGenreSearch("");
    }

    function changeSort(value: string) {
        setSortBy(value);
        setPage(1);
        setSortOpen(false);
    }

    function clearFilters() {
        setSelectedGenre(null);
        setSortBy("popularity.desc");
        setPage(1);
        setGenreSearch("");
        setGenreOpen(false);
        setSortOpen(false);
    }

    function changePage(nextPage: number) {
        if (
            nextPage < 1 ||
            nextPage > totalPages ||
            loading
        ) {
            return;
        }

        setPage(nextPage);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    const selectedSortName =
        SORT_OPTIONS.find(
            (option) => option.value === sortBy
        )?.label ?? "Most Popular";

    return (
        <main className="movies-page">
            <header className="movies-header">
                <motion.div
                    className="movies-header__content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.55,
                        ease: "easeOut",
                    }}
                >
                    <span className="movies-eyebrow">
                        <Film size={13} />
                        THE CINEMA COLLECTION
                    </span>

                    <h1>
                        Movies<span>.</span>
                    </h1>

                    <p>
                        Find something worth watching.
                        <br />
                        Or don't. We're not your parents.
                    </p>
                </motion.div>

                {/* Animated W+ decoration: two ASCII rings orbiting the wordmark */}
                <motion.div
                    className="movies-header__decoration"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        duration: 0.8,
                        delay: 0.15,
                    }}
                    aria-hidden="true"
                >
                    <svg
                        className="movies-orbit-svg"
                        viewBox={`0 0 ${ORBIT_VIEWBOX} ${ORBIT_VIEWBOX}`}
                        xmlns="http://www.w3.org/2000/svg"
                        focusable="false"
                    >
                        {/* W+ wordmark */}
                        <text
                            className="movies-orbit__core"
                            x={ORBIT_CENTER}
                            y={ORBIT_CENTER}
                        >
                            W+
                        </text>

                        {/* Outer ring: clockwise, with satellite */}
                        <OrbitRing
                            rx={108}
                            ry={46}
                            tilt={-28}
                            count={44}
                            duration={30}
                            satellite
                            reduceMotion={reduceMotion}
                        />

                        {/* Inner ring: counter-clockwise */}
                        <OrbitRing
                            rx={82}
                            ry={30}
                            tilt={32}
                            count={30}
                            duration={22}
                            reverse
                            inner
                            reduceMotion={reduceMotion}
                        />
                    </svg>
                </motion.div>
            </header>

            <section className="movies-discovery">
                <div className="movies-toolbar">
                    <div className="movies-toolbar__left">
                        <span className="movies-toolbar__label">
                            <SlidersHorizontal size={14} />
                            DISCOVER
                        </span>

                        {/* Genre dropdown */}
                        <div
                            className="movies-genre-dropdown"
                            ref={genreRef}
                        >
                            <button
                                type="button"
                                className={`movies-filter-button ${
                                    genreOpen ? "is-open" : ""
                                } ${
                                    selectedGenre !== null
                                        ? "has-selection"
                                        : ""
                                }`}
                                onClick={() => {
                                    setGenreOpen((open) => !open);
                                    setSortOpen(false);
                                }}
                                aria-expanded={genreOpen}
                                aria-haspopup="listbox"
                            >
                                <span>{selectedGenreName}</span>

                                <ChevronDown
                                    size={16}
                                    className="movies-filter-chevron"
                                />
                            </button>

                            <AnimatePresence>
                                {genreOpen && (
                                    <motion.div
                                        className="movies-genre-menu"
                                        initial={{
                                            opacity: 0,
                                            y: 10,
                                            scale: 0.97,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            y: 8,
                                            scale: 0.98,
                                        }}
                                        transition={{
                                            duration: 0.18,
                                        }}
                                    >
                                        <div className="movies-genre-menu__search">
                                            <Search size={15} />

                                            <input
                                                type="text"
                                                placeholder="Find a genre..."
                                                value={genreSearch}
                                                onChange={(event) =>
                                                    setGenreSearch(
                                                        event.target.value
                                                    )
                                                }
                                                aria-label="Search genres"
                                            />

                                            {genreSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setGenreSearch("")
                                                    }
                                                    aria-label="Clear genre search"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div
                                            className="movies-genre-menu__list"
                                            role="listbox"
                                            aria-label="Movie genres"
                                        >
                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={
                                                    selectedGenre === null
                                                }
                                                className={`movies-genre-option ${
                                                    selectedGenre === null
                                                        ? "active"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    changeGenre(null)
                                                }
                                            >
                                                <span>All Movies</span>

                                                {selectedGenre === null && (
                                                    <Check size={15} />
                                                )}
                                            </button>

                                            {filteredGenres.map((genre) => (
                                                <button
                                                    key={genre.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={
                                                        selectedGenre ===
                                                        genre.id
                                                    }
                                                    className={`movies-genre-option ${
                                                        selectedGenre ===
                                                        genre.id
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        changeGenre(genre.id)
                                                    }
                                                >
                                                    <span>{genre.name}</span>

                                                    {selectedGenre ===
                                                        genre.id && (
                                                        <Check size={15} />
                                                    )}
                                                </button>
                                            ))}

                                            {filteredGenres.length === 0 && (
                                                <div className="movies-genre-empty">
                                                    No genre matches that. Try a different search.
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Custom sort dropdown */}
                        <div
                            className="movies-sort"
                            ref={sortRef}
                        >
                            <button
                                type="button"
                                className={`movies-sort__trigger ${
                                    sortOpen ? "is-open" : ""
                                }`}
                                onClick={() => {
                                    setSortOpen((open) => !open);
                                    setGenreOpen(false);
                                }}
                                aria-expanded={sortOpen}
                                aria-haspopup="listbox"
                            >
                                <ArrowDownUp size={16} />

                                <span>{selectedSortName}</span>

                                <ChevronDown
                                    size={15}
                                    className="movies-sort__chevron"
                                />
                            </button>

                            <AnimatePresence>
                                {sortOpen && (
                                    <motion.div
                                        className="movies-sort__menu"
                                        role="listbox"
                                        aria-label="Sort movies"
                                        initial={{
                                            opacity: 0,
                                            y: 8,
                                            scale: 0.97,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            y: 8,
                                            scale: 0.97,
                                        }}
                                        transition={{
                                            duration: 0.18,
                                        }}
                                    >
                                        <span className="movies-sort__heading">
                                            SORT COLLECTION
                                        </span>

                                        {SORT_OPTIONS.map((option) => {
                                            const active =
                                                sortBy === option.value;

                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={active}
                                                    className={`movies-sort__option ${
                                                        active
                                                            ? "is-active"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        changeSort(
                                                            option.value
                                                        )
                                                    }
                                                >
                                                    <span>
                                                        {option.label}
                                                    </span>

                                                    {active && (
                                                        <Check size={16} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {hasFilters && (
                        <button
                            type="button"
                            className="movies-clear-filters"
                            onClick={clearFilters}
                        >
                            <X size={14} />
                            Clear filters
                        </button>
                    )}
                </div>

                <div className="movies-results">
                    <div className="movies-results__heading">
                        <div>
                            <span className="movies-results__eyebrow">
                                YOUR NEXT WATCH
                            </span>

                            <h2>
                                {selectedGenre === null
                                    ? "Explore Movies"
                                    : selectedGenreName}
                            </h2>
                        </div>

                        <div className="movies-results__count">
                            {loading
                                ? "Finding titles..."
                                : `${totalResults.toLocaleString()} titles`}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                className="movies-grid movies-grid--skeleton"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {Array.from(
                                    { length: 12 },
                                    (_, index) => (
                                        <MovieSkeleton key={index} />
                                    )
                                )}
                            </motion.div>
                        ) : error ? (
                            <motion.div
                                key="error"
                                className="movies-message movies-message--error"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Film size={28} />
                                <h3>Well, idk why it happened.</h3>
                                <p>{error}</p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setRetryCount((count) => count + 1)
                                    }
                                >
                                    Try again
                                </button>
                            </motion.div>
                        ) : movies.length === 0 ? (
                            <motion.div
                                key="empty"
                                className="movies-message"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Film size={28} />
                                <h3>Nothing to see here.</h3>
                                <p>
                                    Surprisingly, even the algorithm
                                    has limits.
                                </p>

                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key={`${page}-${selectedGenre}-${sortBy}`}
                                className="movies-grid"
                                variants={gridVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                            >
                                {movies.map((movie) => (
                                    <motion.div
                                        key={`${movie.media_type}-${movie.tmdb_id}`}
                                        variants={cardVariants}
                                    >
                                        <MediaCard media={movie} />
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!loading && !error && movies.length > 0 && (
                        <div className="movies-pagination">
                            <button
                                type="button"
                                className="movies-pagination__button"
                                disabled={page <= 1}
                                onClick={() => changePage(page - 1)}
                            >
                                <ChevronLeft size={17} />
                                <span>Previous</span>
                            </button>

                            <div className="movies-pagination__status">
                                <span>
                                    {String(page).padStart(2, "0")}
                                </span>
                                <i />
                                <span>
                                    {String(totalPages).padStart(2, "0")}
                                </span>
                            </div>

                            <button
                                type="button"
                                className="movies-pagination__button"
                                disabled={page >= totalPages}
                                onClick={() => changePage(page + 1)}
                            >
                                <span>Next</span>
                                <ChevronRight size={17} />
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}