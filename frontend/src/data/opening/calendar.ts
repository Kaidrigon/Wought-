import { EVENT_TAG } from "../../constants/events";

export interface OpeningCalendarEvent {

    id: string;

    month: number;

    day: number;

    tag: string;

}

export const openingCalendar: OpeningCalendarEvent[] = [

    {
        id: "new-year",
        month: 1,
        day: 1,
        tag: EVENT_TAG.NEW_YEAR,
    },

    {
        id: "christmas",
        month: 12,
        day: 25,
        tag: EVENT_TAG.CHRISTMAS,
    },

    {
        id: "halloween",
        month: 10,
        day: 31,
        tag: EVENT_TAG.HALLOWEEN,
    },

];

import { getCurrentTime } from "../../utils/date";

export function getTodayEvent() {

    const today = new Date(getCurrentTime());

    const month = today.getMonth() + 1;

    const day = today.getDate();

    return openingCalendar.find(event =>

        event.month === month &&
        event.day === day

    ) ?? null;

}