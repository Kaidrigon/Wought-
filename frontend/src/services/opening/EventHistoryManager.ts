import { EVENT_HISTORY_STORAGE_KEY } from "../../constants/opening";

import { getCurrentTime } from "../../utils/date";

import type { OpeningCalendarEvent } from "../../data/opening/calendar";

export function getSeenEvents(): string[] {

    const stored = localStorage.getItem(
        EVENT_HISTORY_STORAGE_KEY
    );

    if (!stored) {
        return [];
    }

    return JSON.parse(stored);

}

export function createEventKey(
    event: OpeningCalendarEvent
): string {

    const year = new Date(
        getCurrentTime()
    ).getFullYear();

    return `${event.id}-${year}`;

}

export function hasSeenEvent(
    eventKey: string
): boolean {

    return getSeenEvents().includes(
        eventKey
    );

}

export function markEventSeen(
    eventKey: string
): void {



    const events = getSeenEvents();

    

    if (events.includes(eventKey)) {
        
        return;
    }

    events.push(eventKey);

    

    localStorage.setItem(
        EVENT_HISTORY_STORAGE_KEY,
        JSON.stringify(events)
    );


}

export function clearEventHistory(): void {

    localStorage.removeItem(
        EVENT_HISTORY_STORAGE_KEY
    );

}