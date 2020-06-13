declare module 'tf2' {
    import SteamUser from 'steam-user';
    import EventEmitter from 'events';

    class TF2 extends EventEmitter {
        constructor(client: SteamUser);

        haveGCSession: boolean;

        premium: boolean;

        backpackSlots: number | undefined;

        craft(items: string[], recipe?: number): void;

        deleteItem(item: string): void;

        useItem(item: string): void;

        sortBackpack(sortType: number): void;
    }

    export = TF2;
}
