import { SLEEP_HISTORY_STORAGE_KEY } from "../../constants/opening";
import { getTodayKey } from "../../utils/date";

export function getLastSleepOpening(): string | null {

    return localStorage.getItem(
        SLEEP_HISTORY_STORAGE_KEY
    );

}

export function hasSeenSleepToday(): boolean {

    return (
        getLastSleepOpening() ===
        getTodayKey()
    );

}

export function markSleepSeenToday(): void {

    localStorage.setItem(
        SLEEP_HISTORY_STORAGE_KEY,
        getTodayKey()
    );

}

export function clearSleepHistory(): void {

    localStorage.removeItem(
        SLEEP_HISTORY_STORAGE_KEY
    );

}