import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    motion,
    AnimatePresence,
} from "framer-motion";

import {
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";

import {
    useNavigate,
} from "react-router-dom";

import { useTheme } from "../providers/ThemeProvider";

import SearchNoResults from "../components/search/SearchNoResults";

import {
    apiFetch,
    API_BASE_URL,
} from "../services/api/api";

import "./SearchPage.css";

type SearchResult = {
    tmdb_id?: number;
    anilist_id?: number;
    media_type: string;
    title: string;
    release_date?: string;
    description?: string;
    poster_link?: string | null;
    backdrop_link?: string | null;
    genres?: string[];
};

type FilterState = {
    mediaType: string;
    genre: string;
};

export default function SearchPage() {
    const navigate = useNavigate();

    const { section } = useTheme();

    const isAnime = section === "anime";

    const [query, setQuery] = useState("");

    const [results, setResults] =
        useState<SearchResult[]>([]);

    const [loading, setLoading] =
        useState(false);

    const [loadingMore, setLoadingMore] =
        useState(false);

    const [error, setError] =
        useState("");

    const [page, setPage] =
        useState(1);

    const [hasMore, setHasMore] =
        useState(false);

    const [filtersOpen, setFiltersOpen] =
        useState(false);

    const [filters, setFilters] =
        useState<FilterState>({
            mediaType: "all",
            genre: "all",
        });

    const filterRef =
        useRef<HTMLDivElement | null>(null);

    const loadMoreRef =
        useRef<HTMLDivElement | null>(null);

    const searchRequestRef =
        useRef(0);

    /*
     * =================================================
     * NORMALIZE IMAGE URL
     * =================================================
     */

    function normalizeImageUrl(
        value?: string | null
    ) {
        if (!value) {
            return null;
        }

        if (
            value.startsWith("http://") ||
            value.startsWith("https://")
        ) {
            return value;
        }

        if (value.startsWith("/")) {
            return `${API_BASE_URL}${value}`;
        }

        return value;
    }

    /*
     * =================================================
     * LOAD SEARCH PAGE
     * =================================================
     */

    async function loadSearchPage(
        searchQuery: string,
        requestedPage: number,
        append: boolean
    ) {
        if (!searchQuery.trim()) {
            return;
        }

        const requestId =
            ++searchRequestRef.current;

        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setError("");
        }

        try {
            const endpoint = isAnime
                ? `/search/anime?title=${encodeURIComponent(
                    searchQuery.trim()
                )}&page=${requestedPage}`
                : `/search?title=${encodeURIComponent(
                    searchQuery.trim()
                )}&page=${requestedPage}`;

            const response =
                await apiFetch(endpoint);

            if (!response.ok) {
                const responseData =
                    await response
                        .json()
                        .catch(() => null);

                throw new Error(
                    responseData?.detail ||
                    "Nothing found."
                );
            }

            const data =
                await response.json();

            if (
                requestId !==
                searchRequestRef.current
            ) {
                return;
            }

            const normalizedResults =
                (Array.isArray(data)
                    ? data
                    : []
                ).map(
                    (
                        item: SearchResult
                    ) => ({
                        ...item,

                        poster_link:
                            normalizeImageUrl(
                                item.poster_link
                            ),

                        backdrop_link:
                            normalizeImageUrl(
                                item.backdrop_link
                            ),
                    })
                );

            if (append) {
                setResults(
                    (previous) => {
                        const existingKeys =
                            new Set(
                                previous.map(
                                    (item) =>
                                        item.tmdb_id ??
                                        item.anilist_id
                                )
                            );

                        const uniqueNewResults =
                            normalizedResults.filter(
                                (
                                    item: SearchResult
                                ) => {
                                    const key =
                                        item.tmdb_id ??
                                        item.anilist_id;

                                    return (
                                        key != null &&
                                        !existingKeys.has(
                                            key
                                        )
                                    );
                                }
                            );

                        return [
                            ...previous,
                            ...uniqueNewResults,
                        ];
                    }
                );
            } else {
                setResults(
                    normalizedResults
                );
            }

            /*
             * If the backend returned a full page,
             * assume another page may exist.
             *
             * If fewer than 10 results came back,
             * we've reached the end.
             */

            setHasMore(
                normalizedResults.length >= 10
            );

            setPage(
                requestedPage
            );
        } catch (searchError) {
            if (
                requestId !==
                searchRequestRef.current
            ) {
                return;
            }

            if (append) {
                console.error(
                    "Wought+ failed loading more results:",
                    searchError
                );

                setHasMore(false);
            } else {
                setResults([]);

                setError(
                    searchError instanceof Error
                        ? searchError.message
                        : "Something went wrong."
                );
            }
        } finally {
            if (
                requestId ===
                searchRequestRef.current
            ) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }

    /*
     * =================================================
     * SEARCH
     * =================================================
     */

    async function handleSearch() {
        const trimmedQuery =
            query.trim();

        if (
            !trimmedQuery ||
            loading
        ) {
            return;
        }

        setFilters({
            mediaType: "all",
            genre: "all",
        });

        setPage(1);

        setHasMore(false);

        await loadSearchPage(
            trimmedQuery,
            1,
            false
        );
    }

    /*
     * =================================================
     * LOAD MORE
     * =================================================
     */

    async function loadMore() {
        if (
            loading ||
            loadingMore ||
            !hasMore ||
            !query.trim()
        ) {
            return;
        }

        await loadSearchPage(
            query.trim(),
            page + 1,
            true
        );
    }

    /*
     * =================================================
     * KEYBOARD
     * =================================================
     */

    function handleKeyDown(
        event: React.KeyboardEvent<HTMLInputElement>
    ) {
        if (event.key === "Enter") {
            handleSearch();
        }
    }

    /*
     * =================================================
     * INFINITE SCROLL
     * =================================================
     */

    useEffect(() => {
        const target =
            loadMoreRef.current;

        if (!target) {
            return;
        }

        const observer =
            new IntersectionObserver(
                (entries) => {
                    const entry =
                        entries[0];

                    if (
                        entry.isIntersecting
                    ) {
                        loadMore();
                    }
                },
                {
                    rootMargin:
                        "500px",
                }
            );

        observer.observe(target);

        return () => {
            observer.disconnect();
        };
    }, [
        page,
        hasMore,
        loading,
        loadingMore,
        query,
        isAnime,
    ]);

    /*
     * =================================================
     * MEDIA TYPES
     * =================================================
     */

    const mediaTypes =
        useMemo(() => {
            const types =
                results
                    .map(
                        (item) =>
                            item.media_type
                    )
                    .filter(Boolean);

            return Array.from(
                new Set(types)
            );
        }, [results]);

    /*
     * =================================================
     * GENRES
     * =================================================
     */

    const genres =
        useMemo(() => {
            const allGenres =
                results.flatMap(
                    (item) =>
                        item.genres ?? []
                );

            return Array.from(
                new Set(allGenres)
            ).sort();
        }, [results]);

    /*
     * =================================================
     * FILTERED RESULTS
     * =================================================
     */

    const filteredResults =
        useMemo(() => {
            return results.filter(
                (item) => {
                    const mediaTypeMatches =
                        filters.mediaType ===
                            "all" ||
                        item.media_type ===
                            filters.mediaType;

                    const genreMatches =
                        filters.genre ===
                            "all" ||
                        item.genres?.includes(
                            filters.genre
                        );

                    return (
                        mediaTypeMatches &&
                        genreMatches
                    );
                }
            );
        }, [
            results,
            filters,
        ]);

    const hasActiveFilters =
        filters.mediaType !==
            "all" ||
        filters.genre !==
            "all";

    const hasSearched =
        results.length > 0 ||
        !!error;

    /*
     * =================================================
     * CLEAR FILTERS
     * =================================================
     */

    function clearFilters() {
        setFilters({
            mediaType: "all",
            genre: "all",
        });
    }

    /*
     * =================================================
     * FORMAT MEDIA TYPE
     * =================================================
     */

    function formatMediaType(
        type: string
    ) {
        if (type === "movie") {
            return "Movies";
        }

        if (type === "tv") {
            return "TV Shows";
        }

        if (type === "ova") {
            return "OVA";
        }

        if (type === "ona") {
            return "ONA";
        }

        if (type === "special") {
            return "Specials";
        }

        if (type === "music") {
            return "Music";
        }

        return type
            .replace(
                /[\_-]/g,
                " "
            )
            .replace(
                /\b\w/g,
                (char) =>
                    char.toUpperCase()
            );
    }

    /*
     * =================================================
     * OPEN RESULT
     * =================================================
     */

    function openResult(
        item: SearchResult
    ) {
        if (
            isAnime ||
            item.media_type ===
                "anime"
        ) {
            if (
                item.anilist_id ==
                null
            ) {
                return;
            }

            navigate(
                `/anime/anime/${item.anilist_id}`
            );

            return;
        }

        if (
            item.tmdb_id ==
            null
        ) {
            return;
        }

        if (
            item.media_type ===
            "tv"
        ) {
            navigate(
                `/cinema/tv/${item.tmdb_id}`
            );

            return;
        }

        navigate(
            `/cinema/movie/${item.tmdb_id}`
        );
    }

    /*
     * =================================================
     * FILTER OUTSIDE CLICK
     * =================================================
     */

    useEffect(() => {
        function handleOutsideClick(
            event: MouseEvent
        ) {
            if (
                filterRef.current &&
                !filterRef.current.contains(
                    event.target as Node
                )
            ) {
                setFiltersOpen(false);
            }
        }

        if (filtersOpen) {
            document.addEventListener(
                "mousedown",
                handleOutsideClick
            );
        }

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, [filtersOpen]);

    /*
     * =================================================
     * ESCAPE
     * =================================================
     */

    useEffect(() => {
        function handleEscape(
            event: KeyboardEvent
        ) {
            if (
                event.key ===
                "Escape"
            ) {
                setFiltersOpen(
                    false
                );
            }
        }

        document.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, []);

    /*
     * =================================================
     * PAGE
     * =================================================
     */

    return (
        <main
            className={
                `search-page ${
                    isAnime
                        ? "search-page--anime"
                        : "search-page--cinema"
                }`
            }
        >
            <div className="search-page__ambient" />

            <section className="search-page__hero">
                <motion.div
                    className="search-page__eyebrow"
                    initial={{
                        opacity: 0,
                        y: 8,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.45,
                    }}
                >
                    <span />

                    {isAnime
                        ? "ANILIST"
                        : "TMDB"}
                </motion.div>

                <motion.h1
                    initial={{
                        opacity: 0,
                        y: 18,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.55,
                        delay: 0.05,
                    }}
                >
                    {hasSearched
                        ? `Results for "${query.trim()}"`
                        : isAnime
                            ? "Find the next animated 2D shit you wanna cry on for months."
                            : "Search a movie. Don't type 'how to get a girlfriend', we stream fiction not miracles."}
                </motion.h1>

                {!hasSearched && (
                    <motion.p
                        className="search-page__subtitle"
                        initial={{
                            opacity: 0,
                        }}
                        animate={{
                            opacity: 1,
                        }}
                        transition={{
                            duration: 0.5,
                            delay: 0.15,
                        }}
                    >
                        {isAnime
                            ? "Your waifu is not waiting but i am so do it fast."
                            : "Movies, television, questionable life decisions."}
                    </motion.p>
                )}

                <motion.div
                    className="search-box"
                    initial={{
                        opacity: 0,
                        y: 20,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.55,
                        delay: 0.18,
                    }}
                >
                    <Search
                        className="search-box__icon"
                        size={21}
                        strokeWidth={1.8}
                    />

                    <input
                        value={query}
                        onChange={(event) =>
                            setQuery(
                                event.target.value
                            )
                        }
                        onKeyDown={
                            handleKeyDown
                        }
                        placeholder={
                            isAnime
                                ? "Search anime..."
                                : "Search movies or TV shows..."
                        }
                        aria-label="Search"
                    />

                    <button
                        type="button"
                        onClick={
                            handleSearch
                        }
                        disabled={
                            loading ||
                            !query.trim()
                        }
                    >
                        {loading
                            ? "Searching"
                            : "Search"}

                        <span>↵</span>
                    </button>
                </motion.div>
            </section>

            <AnimatePresence mode="wait">
                {results.length > 0 && (
                    <motion.section
                        className="search-results"
                        initial={{
                            opacity: 0,
                            y: 20,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        transition={{
                            duration: 0.45,
                        }}
                    >
                        <div className="search-results__toolbar">
                            <div>
                                <span className="search-results__count">
                                    {
                                        filteredResults.length
                                    }
                                </span>

                                <span>
                                    {" "}
                                    of{" "}
                                    {results.length}{" "}
                                    results
                                </span>
                            </div>

                            <div
                                className="search-filter"
                                ref={filterRef}
                            >
                                <button
                                    type="button"
                                    className={
                                        `search-results__filter ${
                                            filtersOpen
                                                ? "search-results__filter--open"
                                                : ""
                                        } ${
                                            hasActiveFilters
                                                ? "search-results__filter--active"
                                                : ""
                                        }`
                                    }
                                    onClick={() =>
                                        setFiltersOpen(
                                            (open) =>
                                                !open
                                        )
                                    }
                                    aria-expanded={
                                        filtersOpen
                                    }
                                >
                                    <SlidersHorizontal
                                        size={16}
                                    />

                                    Filter

                                    {hasActiveFilters && (
                                        <span className="search-results__filter-dot" />
                                    )}
                                </button>

                                <AnimatePresence>
                                    {filtersOpen && (
                                        <motion.div
                                            className="search-filter__panel"
                                            initial={{
                                                opacity: 0,
                                                y: -8,
                                                scale: 0.97,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                scale: 1,
                                            }}
                                            exit={{
                                                opacity: 0,
                                                y: -8,
                                                scale: 0.97,
                                            }}
                                            transition={{
                                                duration: 0.18,
                                            }}
                                        >
                                            <div className="search-filter__header">
                                                <div>
                                                    <span>
                                                        FILTER
                                                    </span>

                                                    <strong>
                                                        For those who skipped the motor skills tutorial
                                                    </strong>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFiltersOpen(
                                                            false
                                                        )
                                                    }
                                                    aria-label="Close filters"
                                                >
                                                    <X
                                                        size={17}
                                                    />
                                                </button>
                                            </div>

                                            <div className="search-filter__section">
                                                <span className="search-filter__label">
                                                    Type
                                                </span>

                                                <div className="search-filter__options">
                                                    <button
                                                        type="button"
                                                        className={
                                                            filters.mediaType ===
                                                            "all"
                                                                ? "is-selected"
                                                                : ""
                                                        }
                                                        onClick={() =>
                                                            setFilters(
                                                                (
                                                                    current
                                                                ) => ({
                                                                    ...current,
                                                                    mediaType:
                                                                        "all",
                                                                })
                                                            )
                                                        }
                                                    >
                                                        All
                                                    </button>

                                                    {mediaTypes.map(
                                                        (
                                                            type
                                                        ) => (
                                                            <button
                                                                key={
                                                                    type
                                                                }
                                                                type="button"
                                                                className={
                                                                    filters.mediaType ===
                                                                    type
                                                                        ? "is-selected"
                                                                        : ""
                                                                }
                                                                onClick={() =>
                                                                    setFilters(
                                                                        (
                                                                            current
                                                                        ) => ({
                                                                            ...current,
                                                                            mediaType:
                                                                                type,
                                                                        })
                                                                    )
                                                                }
                                                            >
                                                                {formatMediaType(
                                                                    type
                                                                )}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {genres.length >
                                                0 && (
                                                <div className="search-filter__section">
                                                    <span className="search-filter__label">
                                                        Genre
                                                    </span>

                                                    <div className="search-filter__options search-filter__options--genres">
                                                        <button
                                                            type="button"
                                                            className={
                                                                filters.genre ===
                                                                "all"
                                                                    ? "is-selected"
                                                                    : ""
                                                            }
                                                            onClick={() =>
                                                                setFilters(
                                                                    (
                                                                        current
                                                                    ) => ({
                                                                        ...current,
                                                                        genre:
                                                                            "all",
                                                                    })
                                                                )
                                                            }
                                                        >
                                                            All
                                                        </button>

                                                        {genres.map(
                                                            (
                                                                genre
                                                            ) => (
                                                                <button
                                                                    key={
                                                                        genre
                                                                    }
                                                                    type="button"
                                                                    className={
                                                                        filters.genre ===
                                                                        genre
                                                                            ? "is-selected"
                                                                            : ""
                                                                    }
                                                                    onClick={() =>
                                                                        setFilters(
                                                                            (
                                                                                current
                                                                            ) => ({
                                                                                ...current,
                                                                                genre,
                                                                            })
                                                                        )
                                                                    }
                                                                >
                                                                    {
                                                                        genre
                                                                    }
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="search-filter__footer">
                                                <span>
                                                    {
                                                        filteredResults.length
                                                    }{" "}
                                                    matching
                                                </span>

                                                {hasActiveFilters && (
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            clearFilters
                                                        }
                                                    >
                                                        Clear filters
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {filteredResults.length > 0 ? (
                            <>
                                <div className="search-grid">
                                    {filteredResults.map(
                                        (
                                            item,
                                            index
                                        ) => (
                                            <motion.article
                                                className="search-card"
                                                key={
                                                    item.tmdb_id ??
                                                    item.anilist_id ??
                                                    index
                                                }
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    openResult(
                                                        item
                                                    )
                                                }
                                                onKeyDown={(
                                                    event
                                                ) => {
                                                    if (
                                                        event.key ===
                                                            "Enter" ||
                                                        event.key ===
                                                            " "
                                                    ) {
                                                        event.preventDefault();

                                                        openResult(
                                                            item
                                                        );
                                                    }
                                                }}
                                                initial={{
                                                    opacity: 0,
                                                    y: 20,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    y: 0,
                                                }}
                                                transition={{
                                                    duration: 0.35,
                                                    delay:
                                                        Math.min(
                                                            index *
                                                                0.035,
                                                            0.35
                                                        ),
                                                }}
                                                whileHover={{
                                                    y: -6,
                                                }}
                                            >
                                                <div className="search-card__poster">
                                                    {item.poster_link ? (
                                                        <img
                                                            src={
                                                                item.poster_link
                                                            }
                                                            alt={
                                                                item.title
                                                            }
                                                            loading="lazy"
                                                            onError={(
                                                                event
                                                            ) => {
                                                                event.currentTarget.style.display =
                                                                    "none";
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="search-card__fallback">
                                                            Trust me, it looked so bad I've puked tenth time on my shirt which I havent changed it tho yet it still looks better than this poster.
                                                        </div>
                                                    )}

                                                    <div className="search-card__shade" />

                                                    <span className="search-card__type">
                                                        {formatMediaType(
                                                            item.media_type
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="search-card__info">
                                                    <h2>
                                                        {
                                                            item.title
                                                        }
                                                    </h2>

                                                    <div className="search-card__meta">
                                                        <span>
                                                            {item.release_date
                                                                ?.slice(
                                                                    0,
                                                                    4
                                                                ) ||
                                                                "Unknown"}
                                                        </span>

                                                        <span className="search-card__dot">
                                                            •
                                                        </span>

                                                        <span>
                                                            {isAnime
                                                                ? "Anime"
                                                                : item.media_type ===
                                                                    "movie"
                                                                    ? "Movie"
                                                                    : "TV"}
                                                        </span>
                                                    </div>

                                                    {item.genres &&
                                                        item.genres.length >
                                                            0 && (
                                                            <div className="search-card__genres">
                                                                {item.genres
                                                                    .slice(
                                                                        0,
                                                                        2
                                                                    )
                                                                    .map(
                                                                        (
                                                                            genre
                                                                        ) => (
                                                                            <span
                                                                                key={
                                                                                    genre
                                                                                }
                                                                            >
                                                                                {
                                                                                    genre
                                                                                }
                                                                            </span>
                                                                        )
                                                                    )}
                                                            </div>
                                                        )}
                                                </div>
                                            </motion.article>
                                        )
                                    )}
                                </div>

                                {hasMore && (
                                    <div
                                        ref={
                                            loadMoreRef
                                        }
                                        className="search-load-more"
                                        aria-hidden="true"
                                    >
                                        {loadingMore && (
                                            <div className="search-load-more__loading">
                                                <div className="search-load-more__orb" />

                                                <span>
                                                    digging through the archives...
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!hasMore &&
                                    results.length >=
                                        10 && (
                                        <div className="search-load-more__end">
                                            <span>
                                                THAT'S IT
                                            </span>

                                            <p>
                                                apparently the internet ran out of shit for you to watch.
                                            </p>
                                        </div>
                                    )}
                            </>
                        ) : (
                            <motion.div
                                className="search-filter-empty"
                                initial={{
                                    opacity: 0,
                                }}
                                animate={{
                                    opacity: 1,
                                }}
                            >
                                <SlidersHorizontal
                                    size={22}
                                />

                                <strong>
                                    This is the only filter i had bro.
                                </strong>

                                <span>
                                    and you broke it YOU MOTHER FUCKER RESET IT NOW!!
                                </span>

                                <button
                                    type="button"
                                    onClick={
                                        clearFilters
                                    }
                                >
                                    Reset filters
                                </button>
                            </motion.div>
                        )}
                    </motion.section>
                )}
            </AnimatePresence>

            {error && (
                <SearchNoResults
                    query={query}
                    isAnime={isAnime}
                />
            )}
        </main>
    );
}