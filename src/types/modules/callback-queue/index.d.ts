declare module 'callback-queue' {
    // eslint-disable-next-line @typescript-eslint/ban-types
    export function add(key: string, callback: (err?: Error) => void): Function | false;
    export function remove(key: string, error: Error): void;
}
