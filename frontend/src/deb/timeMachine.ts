import { DEBUG } from "./config";

const DAY = 1000 * 60 * 60 * 24;

const HOUR = 1000 * 60 * 60;

export const DEBUG_HOUR_OFFSET = 0;

/*
0   = current hour
2   = two hours later
-3  = three hours earlier
*/

export const DEBUG_DAY_OFFSET =  0;
/*
    0  = today
    1  = tomorrow
    14 = pretend 14 days passed
    -3 = pretend 3 days ago
*/
export function getDebugNow(): number {

    if (!DEBUG) {
        return Date.now();
    }

    return (
    Date.now()
    + (DEBUG_DAY_OFFSET * DAY)
    + (DEBUG_HOUR_OFFSET * HOUR)
);

}