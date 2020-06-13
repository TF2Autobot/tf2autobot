declare module 'callback-queue' {
    export function add(key: string, callback: (err?: Error) => void): Function | false;
    export function remove(key: string, error: Error): void;
}
