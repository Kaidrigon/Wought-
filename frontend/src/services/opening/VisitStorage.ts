import { OPENING_STORAGE_KEY } from "../../constants/opening";
import type { VisitData } from "../../types/opening";
import {
    getCurrentTime,
    getTodayKey,
} from "../../utils/date";

export function getVisitData(): VisitData | null {

    const stored = localStorage.getItem(OPENING_STORAGE_KEY);

    if (!stored) {
        return null;
    }

    return JSON.parse(stored);

}

export function saveVisitData(data: VisitData): void {

    localStorage.setItem(
        OPENING_STORAGE_KEY,
        JSON.stringify(data)
    );

}

export function createVisitData(): VisitData {

    const now = getCurrentTime();

    const today = getTodayKey();

    return {

        firstVisit: now,

        lastVisit: now,

        lastVisitDay: today,

        visitCount: 1,

        completedOpening: false,

    };

}

export function updateVisitData(
    data: VisitData
): VisitData {

const now = getCurrentTime();

    const today = getTodayKey();

    if (data.lastVisitDay === today) {

        return {

            ...data,

            lastVisit: now,

        };

    }

    return {

        ...data,

        lastVisit: now,

        lastVisitDay: today,

        visitCount: data.visitCount + 1,

    };

}

export function markOpeningCompleted(
    data: VisitData
): VisitData {

    return {

        ...data,

        completedOpening: true,

    };

}


export function clearVisitData(): void {

    localStorage.removeItem(
        OPENING_STORAGE_KEY
    );

}