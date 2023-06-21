import { UnknownDictionaryKnownValues } from '../types/common';

export function exponentialBackoff(n: number, base = 1000): number {
    return Math.pow(2, n) * base + Math.floor(Math.random() * base);
}

export function parseJSON(json: string): UnknownDictionaryKnownValues | null {
    try {
        return JSON.parse(json) as UnknownDictionaryKnownValues;
    } catch (err) {
        return null;
    }
}

/** used to signal {@link https://axios-http.com/docs/cancellation|Cancellation} */
export function axiosAbortSignal(timeoutMs: number) {
    const abortController = new AbortController();
    setTimeout(() => abortController.abort(), timeoutMs || 0);

    return abortController.signal;
}
