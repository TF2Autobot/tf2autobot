import SteamID from 'steamid';
import moment from 'moment';
import SKU from 'tf2-sku';
import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import pluralize from 'pluralize';
import { XMLHttpRequest } from 'xmlhttprequest-ts';

import Bot from './Bot';
import { UnknownDictionary } from '../types/common';

export = Cart;

/**
 * An abstract class used for sending offers
 *
 * @remarks Add and remove specific types of items to an offer and send it
 */
abstract class Cart {
    private static carts: UnknownDictionary<Cart> = {};

    readonly partner: SteamID;

    protected token: string | null = null;

    protected notify = false;

    protected offer: TradeOfferManager.TradeOffer | null = null;

    protected readonly bot: Bot;

    // TODO: Make it possible to add specific items to the cart

    protected our: UnknownDictionary<number> = {};

    protected their: UnknownDictionary<number> = {};

    protected canceled = false;

    protected cancelReason: string | undefined;

    constructor(partner: SteamID, bot: Bot);

    constructor(partner: SteamID, token: string, bot: Bot);

    constructor(...args) {
        this.partner = args[0];

        if (args.length === 2) {
            this.bot = args[1];
        } else {
            this.bot = args[2];

            this.setToken(args[1]);
        }
    }

    isCanceled(): boolean {
        return this.canceled;
    }

    setCanceled(reason: string): void {
        this.canceled = true;
        this.cancelReason = reason;
    }

    getToken(): string {
        return this.token;
    }

    setToken(token: string | null): void {
        this.token = token;
    }

    getNotify(): boolean {
        return this.notify;
    }

    setNotify(allowed: boolean): void {
        this.notify = allowed;
    }

    sendNotification(message: string): void {
        if (this.notify) {
            this.bot.sendMessage(this.partner, message);
        }
    }

    isMade(): boolean {
        return this.offer?.state !== TradeOfferManager.ETradeOfferState.Invalid;
    }

    getOffer(): TradeOffer | null {
        return this.offer;
    }

    getCancelReason(): string | undefined {
        return this.cancelReason;
    }

    getOurCount(sku: string): number {
        return this.our[sku] || 0;
    }

    getTheirCount(sku: string): number {
        return this.their[sku] || 0;
    }

    addOurItem(sku: string, amount = 1): void {
        this.our[sku] = this.getOurCount(sku) + amount;

        if (this.our[sku] < 1) {
            delete this.our[sku];
        }
    }

    addTheirItem(sku: string, amount = 1): void {
        this.their[sku] = this.getTheirCount(sku) + amount;

        if (this.their[sku] < 1) {
            delete this.their[sku];
        }
    }

    removeOurItem(sku: string, amount: number | undefined = 1): void {
        if (amount === undefined) {
            delete this.our[sku];
        } else {
            this.addOurItem(sku, -amount);
        }
    }

    removeTheirItem(sku: string, amount: number | undefined = 1): void {
        if (amount === undefined) {
            delete this.their[sku];
        } else {
            this.addTheirItem(sku, -amount);
        }
    }

    clear(): void {
        this.our = {};
        this.their = {};
    }

    isEmpty(): boolean {
        return Object.keys(this.our).length === 0 && Object.keys(this.their).length === 0;
    }

    summarize(): string {
        const ourSummary = this.summarizeOur();

        let ourSummaryString: string;

        if (ourSummary.length > 1) {
            ourSummaryString =
                ourSummary.slice(0, ourSummary.length - 1).join(', ') + ' and ' + ourSummary[ourSummary.length - 1];
        } else if (ourSummary.length === 0) {
            ourSummaryString = 'nothing';
        } else {
            ourSummaryString = ourSummary.join(', ');
        }

        const theirSummary = this.summarizeTheir();

        let theirSummaryString: string;

        if (theirSummary.length > 1) {
            theirSummaryString =
                theirSummary.slice(0, theirSummary.length - 1).join(', ') +
                ' and ' +
                theirSummary[theirSummary.length - 1];
        } else if (theirSummary.length === 0) {
            theirSummaryString = 'nothing';
        } else {
            theirSummaryString = theirSummary.join(', ');
        }

        return `You will be offered ${ourSummaryString} for ${theirSummaryString}`;
    }

    summarizeOur(): string[] {
        const items: { name: string; amount: number }[] = [];

        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            items.push({ name: this.bot.schema.getName(SKU.fromString(sku), false), amount: this.our[sku] });
        }

        let summary: string[];

        if (items.length <= 1) {
            summary = items.map(v => {
                if (v.amount === 1) {
                    return 'a ' + v.name;
                } else {
                    return pluralize(v.name, v.amount, true);
                }
            });
        } else {
            summary = items.map(v => pluralize(v.name, v.amount, true));
        }

        return summary;
    }

    summarizeTheir(): string[] {
        const items: { name: string; amount: number }[] = [];

        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            items.push({ name: this.bot.schema.getName(SKU.fromString(sku), false), amount: this.their[sku] });
        }

        let summary: string[];

        if (items.length <= 1) {
            summary = items.map(v => {
                if (v.amount === 1) {
                    return 'a ' + v.name;
                } else {
                    return pluralize(v.name, v.amount, true);
                }
            });
        } else {
            summary = items.map(v => pluralize(v.name, v.amount, true));
        }

        return summary;
    }

    protected abstract preSendOffer(): Promise<void>;

    abstract constructOffer(): Promise<string>;

    sendOffer(): Promise<string | void> {
        if (this.isEmpty()) {
            return Promise.reject("❌ I don't or you don't have enough items for this trade");
        }

        if (this.offer === null) {
            return Promise.reject(new Error('❌ Offer has not yet been constructed'));
        }

        if (this.offer.data('dict') === undefined) {
            throw new Error('dict not saved on offer');
        }

        this.offer.data('handleTimestamp', moment().valueOf());

        this.offer.setMessage(
            'Powered by TF2 Automatic' + (process.env.OFFER_MESSAGE ? '. ' + process.env.OFFER_MESSAGE : '')
        );

        if (this.notify === true) {
            this.offer.data('notify', true);
        }

        if (this.isCanceled()) {
            return Promise.reject('Offer was canceled');
        }

        if (this.token !== null) {
            this.offer.setToken(this.token);
        }

        return this.preSendOffer()
            .then(() => {
                if (this.isCanceled()) {
                    return Promise.reject('Offer was canceled');
                }

                return this.bot.trades.sendOffer(this.offer);
            })
            .then(status => {
                // Offer finished, remove cart
                Cart.removeCart(this.partner);

                return status;
            })
            .catch(err => {
                if (!(err instanceof Error)) {
                    return Promise.reject(err);
                }

                const error = err as TradeOfferManager.CustomError;

                if (error.cause === 'TradeBan') {
                    return Promise.reject('You are trade banned');
                } else if (error.cause === 'ItemServerUnavailable') {
                    return Promise.reject(
                        "Team Fortress 2's item server may be down or Steam may be experiencing temporary connectivity issues"
                    );
                } else if (error.message.includes('can only be sent to friends')) {
                    // Just adding it here so that it is saved for future reference
                    return Promise.reject(error);
                } else if (
                    error.message.includes('maximum number of items allowed in your Team Fortress 2 inventory')
                ) {
                    return Promise.reject("I don't have space for more items in my inventory");
                } else if (error.eresult == 10 || error.eresult == 16) {
                    return Promise.reject(
                        "An error occurred while sending your trade offer, this is most likely because I've recently accepted a big offer"
                    );
                } else if (error.eresult == 15) {
                    const msg = "I don't, or the trade partner don't, have space for more items. Please take a look.";
                    if (process.env.DISABLE_SOMETHING_WRONG_ALERT === 'false') {
                        if (
                            process.env.DISABLE_DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT === 'false' &&
                            process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL
                        ) {
                            this.sendWebhookSomethingWrongAlert(msg);
                        } else {
                            this.bot.messageAdmins(msg, []);
                        }
                    }
                    return Promise.reject("I don't, or you don't, have space for more items");
                } else if (error.eresult == 20) {
                    return Promise.reject(
                        "Team Fortress 2's item server may be down or Steam may be experiencing temporary connectivity issues"
                    );
                } else if (error.eresult !== undefined) {
                    return Promise.reject(
                        `An error occurred while sending the offer (${TradeOfferManager.EResult[error.eresult]})`
                    );
                }

                return Promise.reject(err);
            });
    }

    private sendWebhookSomethingWrongAlert(msg: string): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');
        const ownerID = process.env.DISCORD_OWNER_ID;
        const time = moment()
            .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC') //timezone format: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
            .format('MMMM Do YYYY, HH:mm:ss ZZ');
        /*eslint-disable */
        const discordQueue = {
            username: process.env.DISCORD_WEBHOOK_USERNAME,
            avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL,
            content: `<@!${ownerID}> [Something Wrong alert]: "${msg}" - ${time}`
        };
        /*eslint-enable */
        request.send(JSON.stringify(discordQueue));
    }

    toString(): string {
        if (this.isEmpty()) {
            return '❌ Your cart is empty.';
        }

        let str = '🛒== YOUR CART ==🛒';

        str += '\n\nMy side (items you will receive):';
        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            const name = this.bot.schema.getName(SKU.fromString(sku), false);
            str += `\n- ${this.our[sku]}x ${name}`;
        }

        str += '\n\nYour side (items you will lose):';
        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            const name = this.bot.schema.getName(SKU.fromString(sku), false);
            str += `\n- ${this.their[sku]}x ${name}`;
        }
        str += '\n\nType !checkout to checkout and proceed trade, or !clearcart to cancel.';

        return str;
    }

    static hasCart(steamID: SteamID): boolean {
        return this.carts[steamID.getSteamID64()] !== undefined;
    }

    static getCart(steamID: SteamID): Cart | null {
        if (!this.hasCart(steamID)) {
            return null;
        }

        return this.carts[steamID.getSteamID64()];
    }

    static addCart(cart: Cart): void {
        this.carts[cart.partner.getSteamID64()] = cart;
    }

    static removeCart(steamID: SteamID): void {
        delete this.carts[steamID.getSteamID64()];
    }

    static stringify(steamID: SteamID): string {
        const cart = this.getCart(steamID);

        if (cart === null) {
            return '❌ Your cart is empty.';
        }

        return cart.toString();
    }
}
