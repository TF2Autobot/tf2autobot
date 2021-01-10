declare module 'callback-queue' {
    export function add(key: string, callback: (err?: Error) => void): false | (() => void);
    export function remove(key: string, error: Error): void;
}
