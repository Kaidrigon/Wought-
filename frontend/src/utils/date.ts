import { getDebugNow } from "../deb";

export function getCurrentTime(): number {

    return getDebugNow();

}

export function getTodayKey(): string {

    return new Date(getCurrentTime())
        .toISOString()
        .split("T")[0];

}

export function getCurrentHour(): number {

    return new Date(
        getCurrentTime()
    ).getHours();

}