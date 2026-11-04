import { useEffect, useRef, useState } from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import {
    ArrowDownUp,
    CalendarDays,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Tv,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";

import { apiFetch } from "../services/api/api";
import type { HeroData } from "../types/hero";
import MediaCard from "../components/media/MediaCard";

import "./TVShowsPage.css";

type DiscoverResponse = {
    results?: HeroData[];
    page?: number;
    total_pages?: number;
    total_results?: number;
};

const TV_GENRES = [
    { id: 10759, name: "Action & Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 10762, name: "Kids" },
    { id: 9648, name: "Mystery" },
    { id: 10763, name: "News" },
    { id: 10764, name: "Reality" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
    { id: 10766, name: "Soap" },
    { id: 10767, name: "Talk" },
    { id: 10768, name: "War & Politics" },
    { id: 37, name: "Western" },
];

const SORT_OPTIONS = [
    { value: "popularity.desc", label: "Most Popular" },
    { value: "popularity.asc", label: "Least Popular" },
    { value: "vote_average.desc", label: "Top Rated" },
    { value: "vote_average.asc", label: "Lowest Rated" },
    { value: "first_air_date.desc", label: "Newest First" },
    { value: "first_air_date.asc", label: "Oldest First" },
];

const CURRENT_YEAR = new Date().getFullYear();

const YEAR_OPTIONS = Array.from(
    { length: CURRENT_YEAR - 1949 },
    (_, index) => CURRENT_YEAR - index
);

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

function TVSkeleton() {
    return (
        <div className="movies-skeleton">
            <div className="movies-skeleton__poster" />
            <div className="movies-skeleton__line" />
            <div className="movies-skeleton__line movies-skeleton__line--short" />
        </div>
    );
}

export default function TVShowsPage() {
    const [shows, setShows] = useState<HeroData[]>([]);

    const [selectedGenre, setSelectedGenre] =
        useState<number | null>(null);

    const [selectedYear, setSelectedYear] =
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
    const [yearOpen, setYearOpen] = useState(false);

    const genreRef = useRef<HTMLDivElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);
    const yearRef = useRef<HTMLDivElement>(null);

    const selectedGenreName =
        TV_GENRES.find(
            (genre) => genre.id === selectedGenre
        )?.name ?? "All TV Genres";

    const selectedSortName =
        SORT_OPTIONS.find(
            (option) => option.value === sortBy
        )?.label ?? "Most Popular";

    const filteredGenres = TV_GENRES.filter((genre) =>
        genre.name.toLowerCase().includes(
            genreSearch.toLowerCase()
        )
    );

    const hasFilters =
        selectedGenre !== null ||
        selectedYear !== null ||
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

            if (!yearRef.current?.contains(target)) {
                setYearOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setGenreOpen(false);
                setSortOpen(false);
                setYearOpen(false);
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

    // Fetch TV shows whenever a filter or page changes.
    useEffect(() => {
        let cancelled = false;

        async function fetchShows() {
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

                if (selectedYear !== null) {
                    params.set(
                        "year",
                        String(selectedYear)
                    );
                }

                const response = await apiFetch(
                    `/discover/tv?${params.toString()}`
                );

                if (!response.ok) {
                    throw new Error(
                        "Couldn't retrieve TV shows."
                    );
                }

                const data = await response.json();

                if (cancelled) return;

                const results: HeroData[] = Array.isArray(data)
                    ? data
                    : (data as DiscoverResponse).results ?? [];

                const responseData =
                    data as DiscoverResponse;

                setShows(results);

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
                    "TV discovery error:",
                    err
                );

                setError(
                    "Something went wrong while loading TV shows."
                );

                setShows([]);
                setTotalResults(0);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchShows();

        return () => {
            cancelled = true;
        };
    }, [
        page,
        selectedGenre,
        selectedYear,
        sortBy,
        retryCount,
    ]);

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

    function changeYear(year: number | null) {
        setSelectedYear(year);
        setPage(1);
        setYearOpen(false);
    }

    function clearFilters() {
        setSelectedGenre(null);
        setSelectedYear(null);
        setSortBy("popularity.desc");
        setPage(1);

        setGenreSearch("");
        setGenreOpen(false);
        setSortOpen(false);
        setYearOpen(false);
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

    return (
        <main className="movies-page tv-shows-page">
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
                        <Tv size={13} />
                        THE TELEVISION COLLECTION
                    </span>

                    <h1>
                        TV Shows<span>.</span>
                    </h1>

                    <p>
                        Entire seasons of questionable decisions.
                        <br />
                        Find your next obsession. Because you are so done with your life only lines like this makes you feel good.
                    </p>
                </motion.div>

                {/* Animated W+ orbital decoration */}
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
                    <div className="movies-orbit">
                        <div className="movies-orbit__track">
                            <span className="movies-orbit__symbols">
                                · + ° × · ∘ + · × ° ·
                            </span>

                            <span className="movies-orbit__satellite" />
                        </div>
                    </div>

                    <div className="movies-orbit movies-orbit--inner">
                        <div className="movies-orbit__track">
                            <span className="movies-orbit__symbols">
                                + · ∘ ° × · +
                            </span>
                        </div>
                    </div>

                    <div className="movies-orbit__core">
                        <span>W+</span>
                    </div>
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
                                    setYearOpen(false);
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
                                                aria-label="Search TV genres"
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
                                            aria-label="TV genres"
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
                                                <span>All Shows</span>

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
                                                    Man are your hands filled with cum?
                                                    then are you dyslexic? or are you trying to be jessus
                                                    coz you have been typing stuff that doesnt even exist retard.
                                                    
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* First-air year dropdown */}
                        <div
                            className="movies-sort tv-year-filter"
                            ref={yearRef}
                        >
                            <button
                                type="button"
                                className={`movies-sort__trigger ${
                                    yearOpen ? "is-open" : ""
                                }`}
                                onClick={() => {
                                    setYearOpen((open) => !open);
                                    setGenreOpen(false);
                                    setSortOpen(false);
                                }}
                                aria-expanded={yearOpen}
                                aria-haspopup="listbox"
                            >
                                <CalendarDays size={16} />

                                <span>
                                    {selectedYear ?? "Any Year"}
                                </span>

                                <ChevronDown
                                    size={15}
                                    className="movies-sort__chevron"
                                />
                            </button>

                            <AnimatePresence>
                                {yearOpen && (
                                    <motion.div
                                        className="movies-sort__menu tv-year-filter__menu"
                                        role="listbox"
                                        aria-label="Filter by first-air year"
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
                                            FIRST AIRED
                                        </span>

                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={
                                                selectedYear === null
                                            }
                                            className={`movies-sort__option ${
                                                selectedYear === null
                                                    ? "is-active"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                changeYear(null)
                                            }
                                        >
                                            <span>Any Year</span>

                                            {selectedYear === null && (
                                                <Check size={16} />
                                            )}
                                        </button>

                                        <div className="tv-year-filter__list">
                                            {YEAR_OPTIONS.map((year) => {
                                                const active =
                                                    selectedYear === year;

                                                return (
                                                    <button
                                                        key={year}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={active}
                                                        className={`movies-sort__option ${
                                                            active
                                                                ? "is-active"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            changeYear(year)
                                                        }
                                                    >
                                                        <span>{year}</span>

                                                        {active && (
                                                            <Check size={16} />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sort dropdown */}
                        <div
                            className="movies-sort tv-sort-filter"
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
                                    setYearOpen(false);
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
                                        aria-label="Sort TV shows"
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
                                YOUR NEXT EXCUSE TO STAY UP ALL NIGHT because you are one boring unemployed motherfucker.
                            </span>

                            <h2>
                                {selectedGenre === null
                                    ? "Explore TV Shows"
                                    : selectedGenreName}
                            </h2>
                        </div>

                        <div className="movies-results__count">
                            {loading
                                ? "Finding shows..."
                                : `${totalResults.toLocaleString()} shows`}
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
                                        <TVSkeleton key={index} />
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
                                <Tv size={28} />

                                <h3>
                                    Well, this episode went wrong.
                                </h3>

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
                        ) : shows.length === 0 ? (
                            <motion.div
                                key="empty"
                                className="movies-message"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Tv size={28} />

                                <h3>
                                    Nothing is airing here.
                                </h3>

                                <p>
                                    The algorithm has apparently run out
                                    of things to recommend.
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
                                key={`${page}-${selectedGenre}-${selectedYear}-${sortBy}`}
                                className="movies-grid"
                                variants={gridVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                            >
                                {shows.map((show) => (
                                    <motion.div
                                        key={`${show.media_type}-${show.tmdb_id}`}
                                        variants={cardVariants}
                                    >
                                        <MediaCard media={show} />
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!loading && !error && shows.length > 0 && (
                        <div className="movies-pagination">
                            <button
                                type="button"
                                className="movies-pagination__button"
                                disabled={page <= 1}
                                onClick={() =>
                                    changePage(page - 1)
                                }
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
                                onClick={() =>
                                    changePage(page + 1)
                                }
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