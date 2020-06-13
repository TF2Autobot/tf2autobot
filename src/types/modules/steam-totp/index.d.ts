declare module 'steam-totp' {
    export function getAuthCode(secret: string): string;
    export function getAuthCode(secret: string, timeOffset: number): string;
    export function getAuthCode(
        secret: string,
        callback: (err: Error | null, code?: string, offset?: number, latency?: number) => void
    ): void;
    export function getAuthCode(
        secret: string,
        timeOffset: number,
        callback: (err: Error | null, code?: string, offset?: number, latency?: number) => void
    ): void;

    export function generateAuthCode(secret: string): string;
    export function generateAuthCode(secret: string, timeOffset: number): string;
    export function generateAuthCode(
        secret: string,
        callback: (err?: Error, code?: string, offset?: number, latency?: number) => void
    ): void;
    export function generateAuthCode(
        secret: string,
        timeOffset: number,
        callback: (err?: Error, code?: string, offset?: number, latency?: number) => void
    ): void;

    export function getConfirmationKey(identitySecret: string, time: number, tag: string): string;
    export function generateConfirmationKey(identitySecret: string, time: number, tag: string): string;

    export function getTimeOffset(callback: (err?: Error, offset?: number, latency?: number) => void): void;
    export function time(timeOffset?: number): number;
}
