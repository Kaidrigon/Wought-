import { runOpeningRules } from "./RuleEngine";

/*
import { markMovieOpeningSeen } from "./MovieHistoryManager";
*/

import type { OpeningDecision } from "../../types/opening";

import {
    createEventKey,
    markEventSeen,
} from "./EventHistoryManager";

import { markSleepSeenToday } from "./SleepHistoryManager";

import {
    getVisitData,
    saveVisitData,
    createVisitData,
    updateVisitData,
    markOpeningCompleted,
} from "./VisitStorage";

export async function initializeOpeningSystem() {
    return await runOpeningRules();
}

export async function completeOpening(
    decision: OpeningDecision
) {
    const visit = getVisitData();

    if (!visit) {
        const newVisit = createVisitData();

        saveVisitData(
            markOpeningCompleted(newVisit)
        );
    } else {
        const updatedVisit = updateVisitData(visit);

        saveVisitData(
            markOpeningCompleted(updatedVisit)
        );
    }

    if (
        decision.reason === "EVENT" &&
        decision.event
    ) {
        const eventKey =
            createEventKey(decision.event);

        markEventSeen(eventKey);
    }

    if (
        decision.reason === "SLEEP"
    ) {
        markSleepSeenToday();
    }

    /*
    if (
        decision.reason === "MOVIE_HISTORY" &&
        decision.historyItem
    ) {
        await markMovieOpeningSeen(
            decision.historyItem
        );
    }
    */
}