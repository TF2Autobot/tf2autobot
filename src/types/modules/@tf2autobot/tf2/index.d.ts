declare module '@tf2autobot/tf2' {
    import SteamUser from 'steam-user';
    import EventEmitter from 'events';

    export enum RemoveItemAttribute {
        Paint = 1031,
        CustomTexture = 1051,
        MakersMark = 1053,
        Killstreak = 1094,
        GiftedBy = 2570,
        Festivizer = 2572
    }

    export default class TF2 extends EventEmitter {
        constructor(client: SteamUser);

        haveGCSession: boolean;

        premium: boolean;

        backpackSlots: number | undefined;

        craft(items: string[], recipe?: number): void;

        deleteItem(item: string): void;

        useItem(item: string): void;

        sortBackpack(sortType: number): void;

        removeItemAttribute(item: string, attribute: RemoveItemAttribute): void;

        // Maybe just add
        applyStrangePart(item: string, strangPartItemID: string): void;

        applyStrangifierOrUnusualifier(item: string, strangifierOrUnusualifierID: string): void;
    }
}
