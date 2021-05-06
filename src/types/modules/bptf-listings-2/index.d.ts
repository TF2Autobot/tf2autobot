declare module 'bptf-listings-2' {
    import { EventEmitter } from 'events';
    import SchemaManager from 'tf2-schema-2';
    import SteamID from 'steamid';
    import TF2Currencies from 'tf2-currencies-2';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Events {
        ready: () => void;
        listings: (listings: ListingManager.Listing[]) => void;
        actions: (actions: { create: Record<string, unknown>[]; remove: string[] }) => void;
        pulse: (pulse: { status: string; current_time?: number; expire_at?: number; client?: string }) => void;
        inventory: (lastUpdated: number) => void;
        createListingsError: (err: Error) => void;
        deleteListingsError: (err: Error) => void;
    }

    class ListingManager extends EventEmitter {
        static EFailiureReason: Record<string, unknown>;

        constructor(options?: {
            token?: string;
            steamid?: string;
            userAgent?: string;
            waitTime?: number;
            batchSize?: number;
            schema?: SchemaManager.Schema;
        });

        token: string | undefined;

        steamid: SteamID;

        waitTime: number;

        batchSize: number;

        cap: number | null;

        promotes: number | null;

        listings: ListingManager.Listing[];

        actions: { create: Create[]; remove: string[] };

        ready: boolean;

        schema: SchemaManager.Schema | null;

        _timeout: ReturnType<typeof setTimeout>;

        _heartbeatInterval: ReturnType<typeof setInterval>;

        _inventoryInterval: ReturnType<typeof setInterval>;

        init(callback: (err: any) => void): void;

        registerUserAgent(
            callback: (
                err: any,
                body?: { status: string; current_time?: number; expire_at?: number; client?: string }
            ) => void
        ): void;

        stopUserAgent(callback: (err: any, body?: { status: string }) => void): void;

        getListings(callback: (err: any, body?: any) => any): void;

        findListing(search: string | number): ListingManager.Listing | null;

        findListings(sku: string): ListingManager.Listing[];

        createListing(listing: ListingManager.CreateListing): void;

        createListings(listings: ListingManager.CreateListing[]): void;

        removeListing(listingId: string): void;

        removeListings(listingIds: string[]): void;

        shutdown(): void;

        _processActions: (callback: (err?: Error) => void) => void;
    }

    interface Create {
        time: number;
        id?: string; // only when intent 1 (sell)
        sku?: string; // only when intent 0 (buy)
        intent: 0 | 1;
        promoted: 0 | 1;
        details: string;
        currencies: TF2Currencies;
        item?: Item; // only when intent 0 (buy)
    }

    interface Item {
        item_name: string;
        quality: string;
        craftable: 0 | 1;
    }

    namespace ListingManager {
        interface Item {
            defindex: number;
            quality: number;
            craftable?: boolean;
            killstreak?: number;
            australium?: boolean;
            effect?: number;
            festive?: boolean;
            paintkit?: number;
            wear?: number;
            quality2?: number;
            craftnumber?: number;
            crateseries?: number;
            target?: number;
            output?: number;
            outputQuality?: number;
        }

        interface CreateListing {
            id?: string;
            sku?: string;
            intent: 0 | 1;
            details?: string;
            promoted?: 0 | 1;
            currencies: TF2Currencies;
            time: number;
        }

        export class Listing {
            id: string;

            steamid: SteamID;

            intent: 0 | 1;

            promoted: 0 | 1;

            item: Record<string, unknown>;

            appid: number;

            currencies: TF2Currencies;

            offers: boolean;

            buyout: boolean;

            details: string;

            created: number;

            bump: number;

            getSKU(): string;

            getItem(): Item;

            getName(): string;

            update(properties: {
                time: number;
                currencies?: TF2Currencies;
                details?: string;
                promoted?: 0 | 1;
                offers?: boolean;
                buyout?: boolean;
            }): void;

            remove(): void;
        }
    }

    export = ListingManager;
}
