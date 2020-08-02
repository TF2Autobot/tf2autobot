declare module 'sleep-async' {
    export default function(): {
        Promise: {
            sleep(timeout: number): Promise<void>;
        };
    };
}
