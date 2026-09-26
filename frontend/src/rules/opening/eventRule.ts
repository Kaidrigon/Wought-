import { getTodayEvent } from "../../data/opening/calendar";
import { eventJokes } from "../../data/opening";
import { RULE_PRIORITY } from "../../constants/priorities";
import {
    createEventKey,
    hasSeenEvent,
} from "../../services/opening/EventHistoryManager";

import type { OpeningDecision } from "../../types/opening";

export function eventRule(): OpeningDecision | null {

    const event = getTodayEvent();


    if (!event) {

        return null;

    }

const eventKey =
    createEventKey(event);

if (
    hasSeenEvent(eventKey)
) {

    return null;

}

const jokes = eventJokes.filter(joke =>
    joke.tags.includes(event.tag)
);

    return {

        shouldShowOpening: true,

        jokes,

        source: "EVENT",

        reason: "EVENT",

        priority: RULE_PRIORITY.EVENT,

        event,
    };

}