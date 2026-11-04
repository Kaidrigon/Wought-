import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import {
    ArrowDownWideNarrow,
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    Film,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Sparkles,
} from "lucide-react";

import { API_BASE_URL } from "../services/api/api";

import type {
    AnimeData,
    AnimeDiscoverResponse,
    AnimeSortOption,
} from "../types/anime";

import AnimeMediaCard from "../components/media/AnimeMediaCard";

import "./AnimeMoviesPage.css";

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
}[] = [
    { value: "popularity", label: "Most Popular" },
    { value: "score", label: "Highest Rated" },
    { value: "trending", label: "Trending Now" },
    { value: "newest", label: "Newest Releases" },
    { value: "oldest", label: "Oldest Releases" },
];

const PAGE_SIZE = 20;

export default function AnimeMoviesPage() {
    const [anime, setAnime] = useState<AnimeData[]>([]);
    const [page, setPage] = useState(1);

    const [selectedGenre, setSelectedGenre] = useState("");
    const [genreSearch, setGenreSearch] = useState("");
    const [sortBy, setSortBy] =
        useState<AnimeSortOption>("popularity");

    const [genreOpen, setGenreOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(false);

    const filteredGenres = useMemo(() => {
        const search = genreSearch.trim().toLowerCase();

        if (!search) return GENRES;

        return GENRES.filter((genre) =>
            genre.toLowerCase().includes(search)
        );
    }, [genreSearch]);

    const selectedSortLabel =
        SORT_OPTIONS.find((option) => option.value === sortBy)?.label ??
        "Most Popular";

    const loadAnime = useCallback(
        async (signal: AbortSignal) => {
            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams({
                    category: "movie",
                    page: String(page),
                    sort_by: sortBy,
                });

                if (selectedGenre) {
                    params.set("genre", selectedGenre);
                }

                const response = await fetch(
                    `${API_BASE_URL}/discover/anime?${params.toString()}`,
                    { signal }
                );

                if (!response.ok) {
                    throw new Error(
                        `Anime request failed (${response.status})`
                    );
                }

                const data: AnimeDiscoverResponse = await response.json();

                setAnime(data.results ?? []);
                setTotalPages(
                    Math.max(1, Math.min(data.total_pages ?? 1, 500))
                );
                setTotalResults(data.total_results ?? 0);
                setHasNextPage(Boolean(data.has_next_page));
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                console.error("Anime discovery error:", err);

                setError(
                    "The anime archive refused to cooperate. Try again."
                );

                setAnime([]);
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        },
        [page, selectedGenre, sortBy]
    );

    useEffect(() => {
        const controller = new AbortController();

        loadAnime(controller.signal);

        return () => controller.abort();
    }, [loadAnime]);

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
        setGenreOpen(false);
        setSortOpen(false);
        setPage(1);
    };

    const goToPreviousPage = () => {
        setPage((current) => Math.max(1, current - 1));
    };

    const goToNextPage = () => {
        if (hasNextPage && page < totalPages) {
            setPage((current) => current + 1);
        }
    };

    const hasFilters =
        Boolean(selectedGenre) || sortBy !== "popularity";

    return (
        <main className="anime-movies">
            <div className="anime-movies__noise" />

            <section className="anime-movies__intro">
                <div className="anime-movies__eyebrow">
                    <span className="anime-movies__eyebrow-line" />
                    <span>W+ ANIMATION DIVISION</span>
                    <span className="anime-movies__eyebrow-index">
                        ARCHIVE / 001
                    </span>
                </div>

                <div className="anime-movies__heading">
                    <div>
                        <motion.p
                            className="anime-movies__overline"
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            NOT EVERYTHING IS A MASTERPIECE.
                        </motion.p>

                        <motion.h1
                            initial={{ opacity: 0, y: 25 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.65 }}
                        >
                            ANIME<span> / </span>
                            <em>FILMS.</em>
                        </motion.h1>

                        <motion.p
                            className="anime-movies__description"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                        >
                            The animated feature collection.
                            <br />
                            Some are worth your time. Allegedly.
                        </motion.p>
                    </div>

                    <motion.div
                        className="anime-movies__stamp"
                        initial={{ opacity: 0, rotate: -12, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <Sparkles size={22} />
                        <span>ANIMATION</span>
                        <strong>01</strong>
                    </motion.div>
                </div>

                <div className="anime-movies__intro-footer">
                    <span>
                        <Film size={13} />
                        FEATURE-LENGTH ANIMATION
                    </span>

                    <span>POWERED BY ANILIST</span>
                </div>
            </section>

            <section className="anime-movies__collection">
                <div className="anime-movies__collection-heading">
                    <div>
                        <span className="anime-movies__section-index">
                            01 — THE COLLECTION
                        </span>

                        <h2>
                            Browse the <span>archive.</span>
                        </h2>
                    </div>

                    <div className="anime-movies__result-count">
                        <span>{totalResults.toLocaleString()}</span>
                        <small>ENTRIES FOUND</small>
                    </div>
                </div>

                <div className="anime-movies__toolbar">
                    <div className="anime-movies__toolbar-label">
                        <SlidersHorizontal size={15} />
                        <span>REFINE SELECTION</span>
                    </div>

                    <div className="anime-movies__filters">
                        <div className="anime-movies__filter-wrap">
                            <button
                                type="button"
                                className={`anime-movies__filter-button ${
                                    genreOpen ? "is-open" : ""
                                }`}
                                onClick={() => {
                                    setGenreOpen((open) => !open);
                                    setSortOpen(false);
                                }}
                                aria-expanded={genreOpen}
                            >
                                <span>
                                    {selectedGenre || "All genres"}
                                </span>
                                <ChevronDown size={15} />
                            </button>

                            <AnimatePresence>
                                {genreOpen && (
                                    <motion.div
                                        className="anime-movies__dropdown anime-movies__genre-dropdown"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        <div className="anime-movies__dropdown-search">
                                            <Search size={14} />

                                            <input
                                                value={genreSearch}
                                                onChange={(event) =>
                                                    setGenreSearch(event.target.value)
                                                }
                                                placeholder="Find a genre..."
                                                autoFocus
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className={`anime-movies__genre-option ${
                                                !selectedGenre ? "active" : ""
                                            }`}
                                            onClick={() => changeGenre("")}
                                        >
                                            All genres
                                        </button>

                                        <div className="anime-movies__genre-list">
                                            {filteredGenres.map((genre) => (
                                                <button
                                                    type="button"
                                                    key={genre}
                                                    className={`anime-movies__genre-option ${
                                                        selectedGenre === genre
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        changeGenre(genre)
                                                    }
                                                >
                                                    {genre}
                                                    {selectedGenre === genre && (
                                                        <span>✓</span>
                                                    )}
                                                </button>
                                            ))}

                                            {filteredGenres.length === 0 && (
                                                <p className="anime-movies__no-genres">
                                                    No matching genres.
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="anime-movies__filter-wrap">
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
                                <span>{selectedSortLabel}</span>
                                <ChevronDown size={15} />
                            </button>

                            <AnimatePresence>
                                {sortOpen && (
                                    <motion.div
                                        className="anime-movies__dropdown anime-movies__sort-dropdown"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        {SORT_OPTIONS.map((option, index) => (
                                            <button
                                                type="button"
                                                key={option.value}
                                                className={`anime-movies__sort-option ${
                                                    sortBy === option.value
                                                        ? "active"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    changeSort(option.value)
                                                }
                                            >
                                                <span className="anime-movies__sort-number">
                                                    0{index + 1}
                                                </span>

                                                <span>{option.label}</span>

                                                {sortBy === option.value && (
                                                    <span className="anime-movies__sort-check">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
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
                </div>

                {selectedGenre && (
                    <div className="anime-movies__active-filter">
                        <span>FILTERING BY</span>
                        <strong>{selectedGenre}</strong>
                        <button
                            type="button"
                            onClick={() => changeGenre("")}
                            aria-label="Remove genre filter"
                        >
                            ×
                        </button>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            className="anime-movies__grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                                <div
                                    className="anime-movies__skeleton"
                                    key={index}
                                >
                                    <div className="anime-movies__skeleton-poster" />
                                    <div className="anime-movies__skeleton-line" />
                                    <div className="anime-movies__skeleton-short" />
                                </div>
                            ))}
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            className="anime-movies__message"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <span>ARCHIVE ERROR / 500</span>
                            <h3>Well, this is awkward.</h3>
                            <p>{error}</p>
                            <button
                                type="button"
                                onClick={() => setPage((current) => current)}
                            >
                                TRY AGAIN
                            </button>
                        </motion.div>
                    ) : anime.length === 0 ? (
                        <motion.div
                            key="empty"
                            className="anime-movies__message"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <span>NO MATCHES FOUND</span>
                            <h3>Nothing in this section.</h3>
                            <p>Try another genre. The archive isn't judging.</p>
                            <button
                                type="button"
                                onClick={clearFilters}
                            >
                                CLEAR FILTERS
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={`${page}-${selectedGenre}-${sortBy}`}
                            className="anime-movies__grid"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            {anime.map((item, index) => (
                                <AnimeMediaCard
                                    key={item.anilist_id}
                                    anime={item}
                                    index={index}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!loading && !error && anime.length > 0 && (
                    <div className="anime-movies__pagination">
                        <span className="anime-movies__page-label">
                            PAGE <strong>{page}</strong>
                            <span> / </span>
                            {totalPages}
                        </span>

                        <div className="anime-movies__page-actions">
                            <button
                                type="button"
                                onClick={goToPreviousPage}
                                disabled={page <= 1}
                                aria-label="Previous page"
                            >
                                <ArrowLeft size={16} />
                                <span>PREVIOUS</span>
                            </button>

                            <button
                                type="button"
                                onClick={goToNextPage}
                                disabled={!hasNextPage || page >= totalPages}
                                aria-label="Next page"
                            >
                                <span>NEXT</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}