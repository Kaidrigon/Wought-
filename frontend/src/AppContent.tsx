import {
    Routes,
    Route,
    Navigate,
} from "react-router-dom";


import SearchPage
    from "./pages/SearchPage";

import DetailPage
    from "./pages/DetailPage";

import SeasonPage
    from "./pages/SeasonPage";

import PersonDetailPage
    from "./pages/PersonDetailPage";

import WatchPage
    from "./pages/WatchPage";

import AnimeWatchPage
    from "./pages/AnimeWatchPage";

import AppLayout
    from "./components/layout/AppLayout/AppLayout";

import CinemaPage
    from "./pages/CinemaPage";

import AnimePage
    from "./pages/AnimePage";

import MoviesPage
    from "./pages/MoviesPage";

import TVShowsPage
    from "./pages/TVShowsPage";

import MyListPage
    from "./pages/MyListPage";

import SettingsPage
    from "./pages/SettingsPage";


export default function AppContent() {

    return (

        <AppLayout>

            <Routes>


                {/* ================================
                    ROOT
                ================================= */}

                <Route

                    path="/"

                    element={

                        <Navigate
                            to="/cinema"
                            replace
                        />

                    }

                />


                {/* ================================
                    HOME
                ================================= */}

                <Route

                    path="/cinema"

                    element={
                        <CinemaPage />
                    }

                />

                <Route

                    path="/anime"

                    element={
                        <AnimePage />
                    }

                />


                {/* ================================
                    MOVIES
                ================================= */}

                <Route

                    path="/cinema/movies"

                    element={
                        <MoviesPage />
                    }

                />

                <Route

                    path="/anime/movies"

                    element={
                        <MoviesPage />
                    }

                />


                {/* ================================
                    TV
                ================================= */}

                <Route

                    path="/cinema/tv-shows"

                    element={
                        <TVShowsPage />
                    }

                />

                <Route

                    path="/anime/tv-shows"

                    element={
                        <TVShowsPage />
                    }

                />


                {/* ================================
                    MY LIST
                ================================= */}

                <Route

                    path="/cinema/my-list"

                    element={
                        <MyListPage />
                    }

                />

                <Route

                    path="/anime/my-list"

                    element={
                        <MyListPage />
                    }

                />


                {/* ================================
                    SETTINGS
                ================================= */}

                <Route

                    path="/cinema/settings"

                    element={
                        <SettingsPage />
                    }

                />

                <Route

                    path="/anime/settings"

                    element={
                        <SettingsPage />
                    }

                />


                {/* ================================
                    SEARCH
                ================================= */}

                <Route

                    path="/cinema/search"

                    element={
                        <SearchPage />
                    }

                />

                <Route

                    path="/anime/search"

                    element={
                        <SearchPage />
                    }

                />


                {/* ================================
                    DETAIL PAGES
                ================================= */}

                <Route

                    path="/cinema/movie/:id"

                    element={
                        <DetailPage />
                    }

                />

                <Route

                    path="/cinema/tv/:id"

                    element={
                        <DetailPage />
                    }

                />

                <Route

                    path="/anime/anime/:id"

                    element={
                        <DetailPage />
                    }

                />


                {/* ================================
                    WATCH — CINEMA
                ================================= */}

                <Route

                    path="/cinema/movie/:id/watch"

                    element={
                        <WatchPage />
                    }

                />

                <Route

                    path="/cinema/tv/:id/watch"

                    element={
                        <WatchPage />
                    }

                />

                <Route

                    path="/cinema/tv/:tv_id/season/:season_number/episode/:episode_number/watch"

                    element={
                        <WatchPage />
                    }

                />


                {/* ================================
                    WATCH — ANIME
                ================================= */}

                <Route

                    path="/anime/anime/:id/watch"

                    element={
                        <AnimeWatchPage />
                    }

                />


                {/* ================================
                    PERSON DETAILS
                ================================= */}

                <Route

                    path="/cinema/person/:id"

                    element={
                        <PersonDetailPage />
                    }

                />

                <Route

                    path="/anime/person/:id"

                    element={
                        <PersonDetailPage />
                    }

                />


                {/* ================================
                    TV SEASON
                ================================= */}

                <Route

                    path="/cinema/tv/:tv_id/season/:season_number"

                    element={
                        <SeasonPage />
                    }

                />


            </Routes>

        </AppLayout>

    );

}