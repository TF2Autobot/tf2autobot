/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import SteamID from 'steamid';
import dayjs from 'dayjs';
import SKU from 'tf2-sku-2';
import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import pluralize from 'pluralize';
import request from 'request';
import { UnknownDictionary } from '../../types/common';

import log from '../../lib/logger';
import { sendAlert } from '../../lib/DiscordWebhook/export';

import Bot from '../Bot';

/**
 * An abstract class used for sending offers
 *
 * @remarks Add and remove specific types of items to an offer and send it
 */
export default abstract class Cart {
    private static carts: UnknownDictionary<Cart> = {};

    ourInventoryCount = 0;

    theirInventoryCount = 0;

    readonly partner: SteamID;

    protected token: string | null = null;

    protected notify = false;

    protected donation = false;

    protected offer: TradeOfferManager.TradeOffer | null = null;

    protected readonly bot: Bot;

    // TODO: Make it possible to add specific items to the cart

    protected our: { [sku: string]: ItemsDictContent } = {};

    protected their: { [sku: string]: ItemsDictContent } = {};

    protected canceled = false;

    protected cancelReason: string | undefined;

    constructor(partner: SteamID, bot: Bot);

    constructor(partner: SteamID, token: string, bot: Bot);

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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

    isDonating(isDonation: boolean): void {
        this.donation = isDonation;
    }

    sendNotification(message: string): void {
        if (this.notify) {
            this.bot.sendMessage(this.partner, message);
        }
    }

    isMade(): boolean {
        return this.offer?.state !== TradeOfferManager.ETradeOfferState['Invalid'];
    }

    getOffer(): TradeOffer | null {
        return this.offer;
    }

    getCancelReason(): string | undefined {
        return this.cancelReason;
    }

    getOurCount(sku: string): number {
        const isDefined = this.our[sku] !== undefined;
        return isDefined ? this.our[sku]['amount'] : 0;
    }

    getTheirCount(sku: string): number {
        const isDefined = this.their[sku] !== undefined;
        return isDefined ? this.their[sku]['amount'] : 0;
    }

    addOurItem(sku: string, amount = 1): void {
        const currentStock = this.bot.inventoryManager.getInventory().getAmount(sku, true);
        const entry = this.bot.pricelist.getPrice(sku, false);

        if (entry !== null) {
            this.our[sku] = {
                amount: this.getOurCount(sku) + amount,
                stock: currentStock,
                maxStock: entry.max
            };
        } else {
            this.our[sku] = {
                amount: this.getOurCount(sku) + amount,
                stock: currentStock,
                maxStock: 0
            };
        }

        if (this.our[sku]['amount'] < 1) {
            delete this.our[sku];
        }
    }

    addTheirItem(sku: string, amount = 1): void {
        const currentStock = this.bot.inventoryManager.getInventory().getAmount(sku, true);
        const entry = this.bot.pricelist.getPrice(sku, false);

        if (entry !== null) {
            this.their[sku] = {
                amount: this.getTheirCount(sku) + amount,
                stock: currentStock,
                maxStock: entry.max
            };
        } else {
            this.their[sku] = {
                amount: this.getTheirCount(sku) + amount,
                stock: currentStock,
                maxStock: 0
            };
        }

        if (this.their[sku]['amount'] < 1) {
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

            items.push({ name: this.bot.schema.getName(SKU.fromString(sku), false), amount: this.our[sku]['amount'] });
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

            items.push({
                name: this.bot.schema.getName(SKU.fromString(sku), false),
                amount: this.their[sku]['amount']
            });
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

    summarizeWithWeapons(): string {
        const ourSummary = this.summarizeOurWithWeapons();

        let ourSummaryString: string;

        if (ourSummary.length > 1) {
            ourSummaryString =
                ourSummary.slice(0, ourSummary.length - 1).join(', ') + ' and ' + ourSummary[ourSummary.length - 1];
        } else if (ourSummary.length === 0) {
            ourSummaryString = 'nothing';
        } else {
            ourSummaryString = ourSummary.join(', ');
        }

        const theirSummary = this.summarizeTheirWithWeapons();

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

    summarizeOurWithWeapons(): string[] {
        const items: { name: string; amount: number }[] = [];

        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            items.push({ name: this.bot.schema.getName(SKU.fromString(sku), false), amount: this.our[sku]['amount'] });
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

    summarizeTheirWithWeapons(): string[] {
        const items: { name: string; amount: number }[] = [];

        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            items.push({
                name: this.bot.schema.getName(SKU.fromString(sku), false),
                amount: this.their[sku]['amount']
            });
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

    abstract constructOfferWithWeapons(): Promise<string>;

    sendOffer(): Promise<string | void> {
        const opt = this.bot.options;

        if (this.isEmpty()) {
            return Promise.reject("❌ I don't or you don't have enough items for this trade");
        }

        if (this.offer === null) {
            return Promise.reject(new Error('❌ Offer has not yet been constructed'));
        }

        const pass = this.donation ? false : !this.bot.isAdmin(this.offer.partner);

        if (this.offer.itemsToGive.length > 0 && this.offer.itemsToReceive.length === 0 && pass) {
            return Promise.reject('Offer was mistakenly created to give free items to trade partner');
        }

        if (this.offer.data('dict') === undefined) {
            throw new Error('dict not saved on offer');
        }

        this.offer.data('handleTimestamp', dayjs().valueOf());

        this.offer.setMessage('Powered by TF2Autobot' + (opt.sendOfferMessage ? '. ' + opt.sendOfferMessage : ''));

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

                if (this.offer.itemsToGive.length > 0 && this.offer.itemsToReceive.length === 0 && pass) {
                    return Promise.reject('Offer was mistakenly created to give free items to trade partner');
                }

                return this.bot.trades.sendOffer(this.offer);
            })
            .then(status => {
                // Offer finished, remove cart
                Cart.removeCart(this.partner);

                this.donation = false;

                return status;
            })
            .catch(async err => {
                if (!(err instanceof Error)) {
                    return Promise.reject(err);
                }

                this.donation = false;

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
                    const msg = "I don't have space for more items in my inventory";

                    if (opt.sendAlert) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            sendAlert('full-backpack', this.bot, msg);
                        } else {
                            this.bot.messageAdmins(msg, []);
                        }
                    }
                    return Promise.reject(msg);
                } else if (error.eresult == 10 || error.eresult == 16) {
                    return Promise.reject(
                        "An error occurred while sending your trade offer, this is most likely because I've recently accepted a big offer"
                    );
                } else if (error.eresult == 15) {
                    const ourUsedSlots = this.ourInventoryCount;
                    const outTotalSlots = this.bot.tf2.backpackSlots;

                    const theirUsedSlots = this.theirInventoryCount;
                    const theirTotalSlots = await this.getTotalBackpackSlots(this.partner.getSteamID64());

                    let ourNumItems = 0;
                    for (const sku in this.our) {
                        if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                            continue;
                        }
                        ourNumItems += this.our[sku] !== undefined ? this.our[sku]['amount'] : 0;
                    }

                    let theirNumItems = 0;
                    for (const sku in this.their) {
                        if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                            continue;
                        }
                        theirNumItems += this.their[sku] !== undefined ? this.their[sku]['amount'] : 0;
                    }

                    const msg =
                        `Either I, or the trade partner, did not have enough backpack space to complete a trade. A summary of our backpacks can be seen below.` +
                        `\n⬅️ I would have received ${theirNumItems} item(s) → ${
                            ourUsedSlots + theirNumItems
                        } / ${outTotalSlots} slots used` +
                        `\n➡️ They would have received ${ourNumItems} item(s) → ${
                            theirUsedSlots + ourNumItems
                        } / ${theirTotalSlots} slots used`;
                    if (opt.sendAlert) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            sendAlert('full-backpack', this.bot, msg);
                        } else {
                            this.bot.messageAdmins(msg, []);
                        }
                    }
                    return Promise.reject(
                        `It appears as if ${
                            ourUsedSlots + theirNumItems > outTotalSlots ? 'my' : 'your'
                        } backpack is full!` +
                            `\n⬅️ I would have received ${theirNumItems} item(s) → ${
                                ourUsedSlots + theirNumItems
                            } / ${outTotalSlots} slots used` +
                            `\n➡️ You would have received ${ourNumItems} item(s) → ${
                                theirUsedSlots + ourNumItems
                            } / ${theirTotalSlots} slots used` +
                            `\nIf this is in error, please give Steam time to refresh our backpacks`
                    );
                } else if (error.eresult == 20) {
                    return Promise.reject(
                        "Team Fortress 2's item server may be down or Steam may be experiencing temporary connectivity issues"
                    );
                } else if (error.eresult !== undefined) {
                    return Promise.reject(
                        `An error occurred while sending the offer (${
                            TradeOfferManager.EResult[error.eresult] as string
                        })`
                    );
                }

                return Promise.reject(err);
            });
    }

    toString(isDonating: boolean): string {
        if (this.isEmpty()) {
            return '❌ Your cart is empty.';
        }

        let str = isDonating ? '💰 == DONATION CART == 💰' : '🛒== YOUR CART ==🛒';

        str += `\n\nMy side (items ${isDonating ? 'I will donate' : 'you will receive'}):`;
        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            const name = this.bot.schema.getName(SKU.fromString(sku), false);
            str += `\n- ${this.our[sku]['amount']}x ${name}`;
        }

        if (!isDonating) {
            str += '\n\nYour side (items you will lose):';
            for (const sku in this.their) {
                if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                    continue;
                }

                const name = this.bot.schema.getName(SKU.fromString(sku), false);
                str += `\n- ${this.their[sku]['amount']}x ${name}`;
            }
        }

        str += `\n\nType ${isDonating ? '"!donatenow"' : '"!checkout"'} to ${
            isDonating ? 'donate' : 'checkout'
        } and proceed trade, or "!clearcart" to cancel.`;

        return str;
    }

    toStringWithWeapons(isDonating: boolean): string {
        if (this.isEmpty()) {
            return '❌ Your cart is empty.';
        }

        let str = isDonating ? '💰 == DONATION CART == 💰' : '🛒== YOUR CART ==🛒';

        str += `\n\nMy side (items ${isDonating ? 'I will donate' : 'you will receive'}):`;
        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            const name = this.bot.schema.getName(SKU.fromString(sku), false);
            str += `\n- ${this.our[sku]['amount']}x ${name}`;
        }

        if (!isDonating) {
            str += '\n\nYour side (items you will lose):';
            for (const sku in this.their) {
                if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                    continue;
                }

                const name = this.bot.schema.getName(SKU.fromString(sku), false);
                str += `\n- ${this.their[sku]['amount']}x ${name}`;
            }
        }

        str += `\n\nType ${isDonating ? '"!donatenow"' : '"!checkout"'} to ${
            isDonating ? 'donate' : 'checkout'
        } and proceed trade, or "!clearcart" to cancel.`;

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

    static stringify(steamID: SteamID, enableCraftweaponAsCurrency: boolean, isDonating: boolean): string {
        const cart = this.getCart(steamID);

        if (cart === null) {
            return '❌ Your cart is empty.';
        }

        if (enableCraftweaponAsCurrency) {
            return cart.toStringWithWeapons(isDonating);
        } else {
            return cart.toString(isDonating);
        }
    }

    private async getTotalBackpackSlots(steamID64: string): Promise<number> {
        return new Promise(resolve => {
            request(
                {
                    url: 'https://backpack.tf/api/users/info/v1',
                    method: 'GET',
                    qs: {
                        key: process.env.BPTF_API_KEY,
                        steamids: steamID64
                    },
                    gzip: true,
                    json: true
                },
                (err, reponse, body) => {
                    if (err) {
                        log.debug('Failed requesting bot info from backpack.tf: ', err);
                        return resolve(0);
                    }

                    const user = body.users[steamID64];
                    const totalBackpackSlots = user.inventory ? user.inventory['440'].slots.total : 0;

                    return resolve(totalBackpackSlots);
                }
            );
        });
    }
}

interface ItemsDictContent {
    amount?: number;
    stock?: number;
    maxStock?: number;
}
