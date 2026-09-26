import { NIGHT_START, NIGHT_END } from "../../constants/opening";
import { RULE_PRIORITY } from "../../constants/priorities";

import { sleepJokes } from "../../data/opening";

import { getCurrentHour } from "../../utils/date";

import {
    hasSeenSleepToday,
} from "../../services/opening/SleepHistoryManager";

import type { OpeningDecision } from "../../types/opening";

export function sleepRule(): OpeningDecision | null {

    const hour = getCurrentHour();

    const isNight =
        hour >= NIGHT_START &&
        hour < NIGHT_END;

    if (!isNight) {
        return null;
    }

    if (hasSeenSleepToday()) {
        return null;
    }

    return {

        shouldShowOpening: true,

        jokes: sleepJokes,

        source: "SLEEP",

        reason: "SLEEP",

        priority: RULE_PRIORITY.SLEEP,

    };

}