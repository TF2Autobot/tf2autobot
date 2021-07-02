declare module '@tf2autobot/tf2' {
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

        removeItemAttribute(item: string, attribute: number): void;

        // Maybe just add
        applyStrangePart(item: string, strangPartItemID: string): void;

        applyStrangifierOrUnusualifier(item: string, strangifierOrUnusualifierID: string): void;
    }

    export = TF2;
}
