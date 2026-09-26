/*import { RULE_PRIORITY } from "../../constants/priorities";

import { movieJokes } from "../../data/opening";

import {
    getLatestCompletedMovie,
    hasSeenMovieOpening,
} from "../../services/opening/MovieHistoryManager";

import type { OpeningDecision } from "../../types/opening";

export async function movieHistoryRule():
Promise<OpeningDecision | null> {

    const movie =
        await getLatestCompletedMovie();

    if (!movie) {

        return null;

    }

    const alreadySeen =
    await hasSeenMovieOpening(
        movie.media_id
    );

if (alreadySeen) {

    return null;

}

    const joke =
        movieJokes.find(
            joke =>
                joke.tmdbId ===
                movie.media_id
        );

    if (!joke) {

        return null;

    }

    return {

        shouldShowOpening: true,

        jokes: [joke],

        source: "MOVIE",

        reason: "MOVIE_HISTORY",

        priority:
            RULE_PRIORITY.MOVIE_HISTORY,

        historyItem: movie,

    };

}
    */