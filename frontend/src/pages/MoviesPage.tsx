
import { useEffect, useState } from "react";

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

export default function MoviesPage() {
    const [movies, setMovies] = useState<HeroData[]>([]);
    const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState("popularity.desc");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                    params.set("genre_id", String(selectedGenre));
                }

                const response = await apiFetch(
                    `/discover/movies?${params.toString()}`
                );

                if (!response.ok) {
                    throw new Error("Couldn't retrieve movies.");
                }

                const data = await response.json();

                if (cancelled) return;

                // Supports both a direct array and a paginated response.
                const results: HeroData[] = Array.isArray(data)
                    ? data
                    : (data as DiscoverResponse).results ?? [];

                setMovies(results);
                setTotalPages(
                    Array.isArray(data)
                        ? 1
                        : Math.max(1, (data as DiscoverResponse).total_pages ?? 1)
                );
            } catch (err) {
                if (cancelled) return;

                console.error("Movie discovery error:", err);
                setError("Something went wrong while loading movies.");
                setMovies([]);
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
    }, [page, selectedGenre, sortBy]);

    function changeGenre(genreId: number | null) {
        setSelectedGenre(genreId);
        setPage(1);
    }

    function changeSort(value: string) {
        setSortBy(value);
        setPage(1);
    }

    return (
        <main className="movies-page">
            <header className="movies-header">
                <div>
                    <span className="movies-eyebrow">
                        THE CINEMA COLLECTION
                    </span>

                    <h1>Movies</h1>

                    <p>
                        Find something worth watching.
                        Or don't. We're not your parents.
                    </p>
                </div>
            </header>

            <section className="movies-discovery">
                <div className="movies-toolbar">
                    <div className="movies-genres">
                        <button
                            className={`movies-genre ${
                                selectedGenre === null ? "active" : ""
                            }`}
                            onClick={() => changeGenre(null)}
                        >
                            All Movies
                        </button>

                        {MOVIE_GENRES.map((genre) => (
                            <button
                                key={genre.id}
                                className={`movies-genre ${
                                    selectedGenre === genre.id ? "active" : ""
                                }`}
                                onClick={() => changeGenre(genre.id)}
                            >
                                {genre.name}
                            </button>
                        ))}
                    </div>

                    <div className="movies-sort">
                        <label htmlFor="movies-sort-select">
                            Sort by
                        </label>

                        <select
                            id="movies-sort-select"
                            value={sortBy}
                            onChange={(event) => changeSort(event.target.value)}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="movies-results">
                    <div className="movies-results__heading">
                        <h2>
                            {selectedGenre === null
                                ? "Explore Movies"
                                : MOVIE_GENRES.find(
                                    (genre) => genre.id === selectedGenre
                                )?.name}
                        </h2>

                        <span>
                            Page {page} of {totalPages}
                        </span>
                    </div>

                    {loading ? (
                        <div className="movies-message">
                            Finding something worth your time...
                        </div>
                    ) : error ? (
                        <div className="movies-message movies-message--error">
                            {error}
                        </div>
                    ) : movies.length === 0 ? (
                        <div className="movies-message">
                            Nothing here. Surprisingly, even the algorithm
                            has limits.
                        </div>
                    ) : (
                        <div className="movies-grid">
                            {movies.map((movie) => (
                                <MediaCard
                                    key={`${movie.media_type}-${movie.tmdb_id}`}
                                    media={movie}
                                />
                            ))}
                        </div>
                    )}

                    <div className="movies-pagination">
                        <button
                            disabled={page <= 1 || loading}
                            onClick={() => setPage((current) => current - 1)}
                        >
                            Previous
                        </button>

                        <span>{page}</span>

                        <button
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}
