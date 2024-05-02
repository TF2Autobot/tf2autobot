/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
declare module '@tf2autobot/tradeoffer-manager' {
    import { EventEmitter } from 'events';
    import SteamID from 'steamid';
    import SchemaManager from '@tf2autobot/tf2-schema';
    import Currencies from '@tf2autobot/tf2-currencies';

    interface UnknownKeys<T> {
        [key: string]: T;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

        accessToken: string | null;

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

        static EOfferFilter: Map<string, number>;

        static EResult: Map<string, number>;

        static ETradeOfferState: Map<string, number>;
    }

    namespace SteamTradeOfferManager {
        export type PollData = {
            sent: UnknownKeys<number>;
            received: UnknownKeys<number>;
            timestamps: UnknownKeys<number>;
            offersSince: number;
            offerData: { [offerID: string]: OfferData };
        };

        export interface OfferData {
            partner?: string;
            handleTimestamp?: number;
            notify?: boolean;
            dict?: ItemsDict;
            keyOurSide?: boolean;
            value?: ItemsValue;
            prices?: Prices;
            handledByUs?: boolean;
            processOfferTime?: number;
            constructOfferTime?: number;
            processCounterTime?: number;
            actionTimestamp?: number;
            confirmationTime?: number;
            finishTimestamp?: number;
            isAccepted?: boolean;
            action?: Action;
            meta?: Meta;
            highValue?: HighValueOutput;
            _dupeCheck?: string[];
            _ourItems?: OutItems[];
            canceledByUser?: boolean;
            isFailedConfirmation?: boolean;
            isCanceledUnknown?: boolean;
            isInvalid?: boolean;
            isDeclined?: boolean;
            switchedState?: number;
            donation?: boolean;
            buyBptfPremium?: boolean;
        }

        export interface ItemsDict {
            our: OurTheirItemsDict;
            their: OurTheirItemsDict;
        }

        export interface OurTheirItemsDict {
            [sku: string]: number;
        }

        export interface ItemsValue {
            our?: Values;
            their?: Values;
            rate?: number;
        }

        export interface Values {
            total?: number;
            keys: number;
            metal: number;
        }

        export interface Prices {
            [priceKey: string]: {
                buy?: Currencies;
                sell?: Currencies;
            };
        }

        export interface Action {
            action: 'accept' | 'decline' | 'skip' | 'counter';
            reason: string;
        }

        export interface Overstocked {
            reason: '🟦_OVERSTOCKED';
            sku: string;
            buying: boolean;
            diff: number;
            amountCanTrade: number;
            amountOffered: number;
        }

        export interface Understocked {
            reason: '🟩_UNDERSTOCKED';
            sku: string;
            selling: boolean;
            diff: number;
            amountCanTrade: number;
            amountTaking: number;
        }

        export interface DisabledItems {
            reason: '🟧_DISABLED_ITEMS';
            sku: string;
        }

        export interface InvalidItems {
            reason: '🟨_INVALID_ITEMS';
            sku: string;
            buying: boolean;
            amount: number;
            price: string;
        }

        export interface InvalidValue {
            reason: '🟥_INVALID_VALUE';
            our: number;
            their: number;
            missing: number;
        }

        export interface DupeCheckFailed {
            reason: '🟪_DUPE_CHECK_FAILED';
            withError: boolean;
            assetid: string | string[];
            sku: string | string[];
            error?: string;
        }

        export interface DupedItems {
            reason: '🟫_DUPED_ITEMS';
            assetid: string;
            sku: string;
        }

        interface EscrowCheckFailed {
            reason: '⬜_ESCROW_CHECK_FAILED';
            error?: string;
        }

        interface BannedCheckFailed {
            reason: '⬜_BANNED_CHECK_FAILED';
            error?: string;
        }

        interface Halted {
            reason: '⬜_HALTED';
        }

        interface ReviewForced {
            reason: '⬜_REVIEW_FORCED';
        }

        interface BannedResults {
            [website: string]: string;
        }

        export type WrongAboutOffer =
            | Overstocked
            | Understocked
            | DisabledItems
            | InvalidItems
            | InvalidValue
            | DupeCheckFailed
            | DupedItems
            | EscrowCheckFailed
            | BannedCheckFailed
            | Halted
            | ReviewForced;

        export interface Meta {
            highValue?: HighValueOutput;
            highValueName?: string[];
            uniqueReasons?: string[];
            reasons?: WrongAboutOffer[];
            assetids?: string[];
            sku?: string[];
            result?: boolean[];
            banned?: BannedResults;
        }

        interface PartialSKUWithMention {
            [partialSKU: string]: boolean;
        }

        export interface ItemAttributes {
            s?: PartialSKUWithMention;
            sp?: PartialSKUWithMention;
            ks?: PartialSKUWithMention;
            ke?: PartialSKUWithMention;
            p?: PartialSKUWithMention;
            isFull?: boolean;
        }

        interface Items {
            [sku: string]: ItemAttributes;
        }

        interface HighValue {
            items: Items;
            isMention: boolean;
        }

        export interface HighValueOutput {
            items: {
                our: Items;
                their: Items;
            };
            isMention: {
                our: boolean;
                their: boolean;
            };
        }

        export interface OutItems {
            appid: number;
            contextid: string;
            assetid: string;
            amount: number;
        }

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

            app_data?: { def_index: string; quality?: string; quantity?: string; limited?: number };

            // Custom function added to prototype
            getAction(action: string): string | null;

            // Custom function added to prototype
            getItemTag(category: string): string | null;

            // Custom function added to prototype
            getSKU(
                schema: SchemaManager.Schema,
                normalizeFestivizedItems: boolean,
                normalizeStrangeAsSecondQuality: boolean,
                normalizePainted: boolean,
                normalizeCraftNumber: boolean,
                paintsInOptions: string[]
            ): { sku: string; isPainted: boolean } | null;
        }

        export class EconItemRB extends EconItem {
            new_assetid: string;

            new_contextid: string;

            rollback_new_assetid: string;

            rollback_new_contextid: string;
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

            removeMyItem(item: TradeOfferItem): boolean;

            removeMyItems(items: TradeOfferItem[]): number;

            removeTheirItem(item: TradeOfferItem): boolean;

            removeTheirItems(items: TradeOfferItem[]): number;

            setToken(token: string): void;

            setMessage(message: string): void;

            getUserDetails(callback: (err: Error | null, me?: UserDetails, them?: UserDetails) => void): void;

            accept(callback?: (err: Error | null, status?: string) => void): void;

            accept(skipStateUpdate: boolean, callback?: (err: Error | null, status?: string) => void): void;

            send(callback?: (err: Error | null, state?: string) => void): void;

            decline(callback?: (err: Error | null) => void): void;

            counter(): TradeOffer;

            /**
             * Alias of decline
             * @param callback - Function to call when done
             */
            cancel(callback?: (err: Error | null) => void): void;

            // https://github.com/DoctorMcKay/node-steam-tradeoffer-manager/wiki/TradeOffer#getexchangedetailsgetdetailsiffailed-callback
            getExchangeDetails(
                getDetailsIfFailed: boolean,
                callback: (
                    err?: Error,
                    status?: number,
                    tradeInitTime?: Date,
                    receivedItems?: EconItemRB[],
                    sentItems?: EconItemRB[]
                ) => void
            ): void;

            // Custom function added to prototype
            log(level: string, message: string, ...meta: any[]);

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
