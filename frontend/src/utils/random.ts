import type { Joke } from "../types/joke";

export function getRandomJoke(jokes: Joke[]): Joke {
    const randomIndex = Math.floor(Math.random() * jokes.length);

    return jokes[randomIndex];
}

export function getRandomItem<T>(items: T[]): T {
    const randomIndex = Math.floor(Math.random() * items.length);

    return items[randomIndex];
}

export function shuffleArray<T>(array: T[]): T[] {

    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [copy[i], copy[j]] = [copy[j], copy[i]];

    }

    return copy;
}