import { UnknownDictionaryKnownValues } from '../types/common';

export function exponentialBackoff(n: number, base = 1000): number {
    return Math.pow(2, n) * base + Math.floor(Math.random() * base);
}

export function parseJSON(json: string): UnknownDictionaryKnownValues | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(json);
    } catch (err) {
        return null;
    }
}
