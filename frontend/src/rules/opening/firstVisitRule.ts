import { getVisitData } from "../../services/opening/VisitStorage";

import { RULE_PRIORITY } from "../../constants/priorities";

import { firstVisitJokes } from "../../data/opening";

import type { OpeningDecision } from "../../types/opening";

export function firstVisitRule(): OpeningDecision | null {

    const visitData = getVisitData();

    if (visitData) {
        return null;
    }

    return {

    shouldShowOpening: true,

    priority: RULE_PRIORITY.FIRST_VISIT,

    jokes: firstVisitJokes,

    source: "FIRST_VISIT",

    reason: "FIRST_VISIT",

};

}