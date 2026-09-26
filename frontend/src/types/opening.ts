import type { Joke } from "./joke";
import type { OpeningCalendarEvent } from "../data/opening/calendar";

export interface VisitData {
    firstVisit: number;

    lastVisit: number;

    lastVisitDay: string;

    visitCount: number;

    completedOpening: boolean;
}
// import type { HistoryItem } from "./history";


export type OpeningReason =
    | "FIRST_VISIT"
    | "RETURNING_VISIT"
    | "EVENT"
    | "SLEEP"
    | "MOVIE_HISTORY"
    | "USER_TASTE";

export type OpeningSource =
    | "FIRST_VISIT"
    | "PRODUCTIVITY"
    | "EVENT"
    | "SLEEP"
    | "MOVIE"
    | "TV"
    | "ANIME"
    | "USERS";

export interface OpeningDecision {
    shouldShowOpening: boolean;

    priority: number;

    jokes: Joke[];

    reason: OpeningReason;

    source: OpeningSource;

    event?: OpeningCalendarEvent;

    // historyItem?: HistoryItem;
}