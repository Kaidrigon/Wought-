import { RETURNING_VISITOR_DAYS } from "../../constants/opening";
import { RULE_PRIORITY } from "../../constants/priorities";
import { returningJokes } from "../../data/opening";    
import { getCurrentTime } from "../../utils/date";
import { getVisitData } from "../../services/opening/VisitStorage";

import type { OpeningDecision } from "../../types/opening";

export function returningVisitRule(): OpeningDecision | null {

    const visit = getVisitData();

    if (!visit) {
        return null;
    }

    const now = getCurrentTime();

    const daysSinceVisit =
        (now - visit.lastVisit) /
        (1000 * 60 * 60 * 24);


    if (daysSinceVisit < RETURNING_VISITOR_DAYS) {
        return null;
    }

    return {

        shouldShowOpening: true,

        jokes: returningJokes,

        source: "PRODUCTIVITY",

        reason: "RETURNING_VISIT",

        priority: RULE_PRIORITY.RETURNING_VISIT,
    };

}