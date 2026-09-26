import { firstVisitRule } from "../../rules/opening/firstVisitRule";
import { returningVisitRule } from "../../rules/opening/returningVisitRule";
import { eventRule } from "../../rules/opening/eventRule";
import { sleepRule } from "../../rules/opening/sleepRule";
/*
import { movieHistoryRule } from "../../rules/opening/movieHistoryRule";
*/

import type { OpeningDecision } from "../../types/opening";

const openingRules = [

    eventRule,

    sleepRule,

    /*
    movieHistoryRule,
    */

    returningVisitRule,

    firstVisitRule,

];

export async function runOpeningRules():
Promise<OpeningDecision | null> {

    let winner: OpeningDecision | null = null;

    for (const rule of openingRules) {

        const result = await rule();

        if (!result) {
            continue;
        }

        if (

            winner === null ||

            result.priority > winner.priority

        ) {

            winner = result;

        }

    }

    return winner;

}