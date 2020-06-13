declare module 'steam-tradeoffer-manager' {
    import { EventEmitter } from 'events';
    import SteamID from 'steamid';
    import SchemaManager from 'tf2-schema';

    interface UnknownKeys<T> {
        [key: string]: T;
    }

    interface Events {
        newOffer: (offer: SteamTradeOfferManager.TradeOffer) => void;
        receivedOfferChanged: (offer: SteamTradeOfferManager.TradeOffer, oldState: number) => void;
        sentOfferChanged: (offer: SteamTradeOfferManager.TradeOffer, oldState: number) => void;
        pollData: (pollData: SteamTradeOfferManager.PollData) => void;
        debug: (message: string) => void;
    }

    class SteamTradeOfferManager extends EventEmitter {
        constructor(options: any);

        steamID: SteamID | null;

        pollData: SteamTradeOfferManager.PollData;

        apiKey: string | null;

        pollInterval: number;

        getUserInventoryContents(
            steamID: SteamID | string,
            appid: number,
            contextid: string,
            tradeableOnly: boolean,
            callback: (
                err?: Error,
                inventory?: SteamTradeOfferManager.EconItem[],
                currency?: SteamTradeOfferManager.EconItem[]
            ) => void
        ): void;

        createOffer(partner: SteamID | string, token?: string): SteamTradeOfferManager.TradeOffer;

        getOffer(id: string | number, callback: (err?: Error, offer?: SteamTradeOfferManager.TradeOffer) => void): void;

        getOffers(
            filter: number,
            callback: (
                err?: Error,
                sent?: SteamTradeOfferManager.TradeOffer[],
                received?: SteamTradeOfferManager.TradeOffer[]
            ) => void
        ): void;

        getOffers(
            filter: number,
            historicalCutoff: Date,
            callback: (
                err?: Error,
                sent?: SteamTradeOfferManager.TradeOffer[],
                received?: SteamTradeOfferManager.TradeOffer[]
            ) => void
        ): void;

        doPoll(): void;

        setCookies(cookies: string[], callback?: (err?: Error) => void): void;

        setCookies(cookies: string[], familyViewPin: string, callback?: (err?: Error) => void): void;

        shutdown(): void;

        static EOfferFilter: any;

        static EResult: any;

        static ETradeOfferState: any;
    }

    namespace SteamTradeOfferManager {
        export type PollData = {
            sent: UnknownKeys<number>;
            received: UnknownKeys<number>;
            timestamps: UnknownKeys<number>;
            offersSince: number;
            offerData: UnknownKeys<any>;
        };

        export class EconItem {
            appid: number;

            contextid: string;

            assetid: string;

            classid: string;

            instanceid: string;

            amount: number;

            pos: number;

            id: string;

            background_color: string;

            icon_url: string;

            icon_url_large: string;

            tradable: boolean;

            actions: [
                {
                    link: string;
                    name: string;
                }
            ];

            name: string;

            name_color: string;

            type: string;

            market_name: string;

            market_hash_name: string;

            commodity: boolean;

            market_tradable_restriction: number;

            market_marketable_restriction: number;

            marketable: boolean;

            tags: [
                {
                    internal_name: string;
                    category: string;
                    name: string;
                    localized_tag_name: string;
                    color: string;
                    category_name: string;
                    localized_category_name: string;
                }
            ];

            is_currency: boolean;

            fraudwarnings: any[];

            descriptions: [
                {
                    value: string;
                    color?: string;
                }
            ];

            app_data: any;

            // Custom function added to prototype
            hasDescription(description: string): boolean;

            // Custom function added to prototype
            getAction(action: string): string | null;

            // FIXME: Don't overwrite getTag prototype as it already exists

            // Custom function added to prototype
            getTag(category: string): string | null;

            // Custom function added to prototype
            getSKU(schema: SchemaManager.Schema): string | null;
        }

        type TradeOfferItem = {
            id?: string;
            assetid: string;
            appid: number;
            contextid: string;
            amount?: number;
        };

        type UserDetails = {
            personaName: string;
            contexts: any;
            escrowDays: number;
            avatarIcon: string;
            avatarMedium: string;
            avatarFull: string;
        };

        export class TradeOffer {
            partner: SteamID;

            id: string | null;

            message: string | null;

            state: number;

            itemsToGive: EconItem[];

            itemsToReceive: EconItem[];

            isOurOffer: boolean;

            created: Date;

            updated: Date;

            expires: Date;

            confirmationMethod: number;

            _tempData: UnknownKeys<any>;

            manager: SteamTradeOfferManager;

            isGlitched(): boolean;

            data(): UnknownKeys<any>;

            data(key: string): any | undefined;

            data(key: string, value: any): void;

            addMyItem(item: TradeOfferItem): boolean;

            addMyItems(items: TradeOfferItem[]): number;

            addTheirItem(item: TradeOfferItem): boolean;

            addTheirItems(items: TradeOfferItem[]): number;

            setToken(token: string): void;

            setMessage(message: string): void;

            getUserDetails(callback: (err: Error | null, me?: UserDetails, them?: UserDetails) => void): void;

            accept(callback?: (err: Error | null, status?: string) => void): void;

            accept(skipStateUpdate: boolean, callback?: (err: Error | null, status?: string) => void): void;

            send(callback?: (err: Error | null, state?: string) => void): void;

            decline(callback?: (err: Error | null) => void): void;

            /**
             * Alias of decline
             * @param callback - Function to call when done
             */
            cancel(callback?: (err: Error | null) => void): void;

            // Custom function added to prototype
            log(level: string, message: string, ...meta: any[]);

            // Custom function added to prototype
            summarize(schema: SchemaManager.Schema): string;

            // Custom function added to prototype
            summarizeWithLink(schema: SchemaManager.Schema): string;

            // Custom function added to prototype
            summarizeSKU(): string;

            // Custom function added to prototype
            getDiff(): UnknownKeys<any> | null;
        }

        export class CustomError extends Error {
            cause?: string;

            eresult?: number;
        }
    }

    export = SteamTradeOfferManager;
}
