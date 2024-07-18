import SteamID from 'steamid';
import dayjs from 'dayjs';
import SKU from '@tf2autobot/tf2-sku';
import TradeOfferManager, { OurTheirItemsDict, TradeOffer } from '@tf2autobot/tradeoffer-manager';
import pluralize from 'pluralize';
import { UnknownDictionary } from '../../types/common';
import Bot from '../Bot';
import Pricelist from '../Pricelist';
import { BPTFGetUserInfo } from '../MyHandler/interfaces';
import log from '../../lib/logger';
import { sendAlert } from '../DiscordWebhook/export';
import { apiRequest } from '../../lib/apiRequest';

/**
 * An abstract class used for sending offers
 *
 * @remarks Add and remove specific types of items to an offer and send it
 */
export default abstract class Cart {
    private static carts: UnknownDictionary<Cart> = {};

    protected ourInventoryCount = 0;

    protected theirInventoryCount = 0;

    protected ourItemsCount = 0;

    protected theirItemsCount = 0;

    readonly partner: SteamID;

    protected token: string | null = null;

    protected notify = false;

    protected donation = false;

    protected buyPremium = false;

    protected offer: TradeOfferManager.TradeOffer | null = null;

    protected readonly bot: Bot;

    // TODO: Make it possible to add specific items to the cart

    protected our: OurTheirItemsDict = {};

    protected their: OurTheirItemsDict = {};

    protected canceled = false;

    protected cancelReason: string | undefined;

    protected craftAll: string[] = [];

    protected uncraftAll: string[] = [];

    constructor(partner: SteamID, bot: Bot, craftAll: string[], uncraftAll: string[]);

    constructor(partner: SteamID, token: string, bot: Bot, craftAll: string[], uncraftAll: string[]);

    constructor(...args: [SteamID, Bot, string[], string[]] | [SteamID, string, Bot, string[], string[]]) {
        this.partner = args[0];

        if (args.length === 4) {
            this.bot = args[1];
            this.craftAll = args[2];
            this.uncraftAll = args[3];
        } else {
            this.bot = args[2];

            this.setToken = args[1];
            this.craftAll = args[3];
            this.uncraftAll = args[4];
        }
    }

    get isCanceled(): boolean {
        return this.canceled;
    }

    set setCanceled(reason: string) {
        this.canceled = true;
        this.cancelReason = reason;
    }

    // getToken(): string {
    //     return this.token;
    // }

    private set setToken(token: string | null) {
        this.token = token;
    }

    // getNotify(): boolean {
    //     return this.notify;
    // }

    set setNotify(allowed: boolean) {
        this.notify = allowed;
    }

    set isDonating(isDonation: boolean) {
        this.donation = isDonation;
    }

    set isBuyingPremium(isBuyingPremium: boolean) {
        this.buyPremium = isBuyingPremium;
    }

    set sendNotification(message: string) {
        if (this.notify) {
            this.bot.sendMessage(this.partner, message);
        }
    }

    get isMade(): boolean {
        return this.offer?.state !== TradeOfferManager.ETradeOfferState['Invalid'];
    }

    get getOffer(): TradeOffer | null {
        return this.offer;
    }

    get weapons(): string[] {
        const allWeapons = this.bot.handler.isWeaponsAsCurrency.withUncraft
            ? this.craftAll.concat(this.uncraftAll)
            : this.craftAll;

        const skusFromPricelist = Object.keys(this.bot.pricelist.getPrices);

        // return filtered weapons
        const filtered = allWeapons.filter(sku => !skusFromPricelist.includes(sku));
        return filtered;
    }

    get isWeaponsAsCurrencyEnabled(): boolean {
        return this.bot.options.miscSettings.weaponsAsCurrency.enable;
    }

    // getCancelReason(): string | undefined {
    //     return this.cancelReason;
    // }

    getOurCount(sku: string): number {
        return this.our[sku] || 0;
    }

    getOurGenericCount(sku: string): number {
        return this.getGenericCount(sku, s => this.getOurCount(s));
    }

    getGenericCount(sku: string, getCountFn: (sku: string) => number): number {
        const pSku = SKU.fromString(sku);
        if (pSku.quality === 5) {
            // try to count all unusual types
            const reduced = this.bot.effects
                .map(e => {
                    pSku.effect = e.id;
                    const s = SKU.fromObject(pSku);
                    return getCountFn(s);
                })
                // add up total found; total is undefined to being with
                .reduce((total, currentTotal) => (total ? total + currentTotal : currentTotal));
            return reduced;
        } else {
            return getCountFn(sku);
        }
    }

    getTheirCount(sku: string): number {
        return this.their[sku] || 0;
    }

    getTheirGenericCount(sku: string): number {
        return this.getGenericCount(sku, s => this.getTheirCount(s));
    }

    addOurItem(priceKey: string, amount = 1): void {
        this.our[priceKey] = this.getOurCount(priceKey) + amount;

        if (this.our[priceKey] < 1) {
            delete this.our[priceKey];
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

    get isEmpty(): boolean {
        return Object.keys(this.our).length === 0 && Object.keys(this.their).length === 0;
    }

    summarize(isDonating: boolean, isBuyingPremium: boolean): string {
        const ourSummary = this.summarizeOur();
        const ourSummaryCount = ourSummary.length;

        let ourSummaryString: string;

        if (ourSummaryCount > 1) {
            ourSummaryString =
                ourSummary.slice(0, ourSummaryCount - 1).join(', ') + ' and ' + ourSummary[ourSummaryCount - 1];
        } else if (ourSummaryCount === 0) {
            ourSummaryString = 'nothing';
        } else {
            ourSummaryString = ourSummary.join(', ');
        }

        const theirSummary = this.summarizeTheir();
        const theirSummaryCount = theirSummary.length;

        let theirSummaryString: string;

        if (theirSummaryCount > 1) {
            theirSummaryString =
                theirSummary.slice(0, theirSummaryCount - 1).join(', ') + ' and ' + theirSummary[theirSummaryCount - 1];
        } else if (theirSummaryCount === 0) {
            theirSummaryString = 'nothing';
        } else {
            theirSummaryString = theirSummary.join(', ');
        }

        return `You${isDonating || isBuyingPremium ? `'re` : ' will'} ${
            isDonating ? 'donating' : isBuyingPremium ? 'purchasing premium with' : 'be offered'
        } ${ourSummaryString} ${
            isDonating ? 'to backpack.tf' : isBuyingPremium ? 'from backpack.tf' : `for ${theirSummaryString}`
        }`;
    }

    summarizeOur(): string[] {
        const items: { name: string; amount: number }[] = [];

        for (const priceKey in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, priceKey)) {
                continue;
            }

            let itemName: string;
            if (Pricelist.isAssetId(priceKey)) {
                itemName = this.bot.pricelist.getPriceBySkuOrAsset({ priceKey }).name + ` (${priceKey})`;
            } else {
                itemName = this.bot.schema.getName(SKU.fromString(priceKey), false);
            }

            items.push({ name: itemName, amount: this.our[priceKey] });
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
                amount: this.their[sku]
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
            //
        } else {
            summary = items.map(v => pluralize(v.name, v.amount, true));
        }

        return summary;
    }

    protected abstract preSendOffer(): Promise<void>;

    abstract constructOffer(): Promise<string>;

    sendOffer(): Promise<string | void> {
        const opt = this.bot.options;

        if (this.isEmpty) {
            return Promise.reject("❌ I don't or you don't have enough items for this trade");
        }

        if (this.offer === null) {
            return Promise.reject(new Error('❌ Offer has not yet been constructed'));
        }

        const pass = this.donation || this.buyPremium ? false : !this.bot.isAdmin(this.offer.partner);

        if (this.offer.itemsToGive.length > 0 && this.offer.itemsToReceive.length === 0 && pass) {
            return Promise.reject('Offer was mistakenly created to give free items to trade partner');
        }

        if (this.offer.data('dict') === undefined) {
            throw new Error('dict not saved on offer');
        }

        this.offer.data('handleTimestamp', dayjs().valueOf());

        this.offer.setMessage(opt.customMessage.sendOffer ? opt.customMessage.sendOffer : 'Thank you for the trade!');

        if (this.notify === true) {
            this.offer.data('notify', true);
        }

        if (this.isCanceled) {
            return Promise.reject('Offer was canceled');
        }

        if (this.token !== null) {
            this.offer.setToken(this.token);
        }

        return this.preSendOffer()
            .then(() => {
                if (this.isCanceled) {
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

                this.buyPremium = false;

                return status;
            })
            .catch(async err => {
                if (!(err instanceof Error)) {
                    return Promise.reject(err);
                }

                this.donation = false;

                this.buyPremium = false;

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

                    if (opt.sendAlert.enable && opt.sendAlert.backpackFull) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url.main !== '') {
                            sendAlert('full-backpack', this.bot, msg, null, err, [
                                this.offer.partner.getSteamID64(),
                                this.offer.id
                            ]);
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
                    const ourTotalSlots = this.bot.tf2.backpackSlots;

                    const theirUsedSlots = this.theirInventoryCount;
                    const theirTotalSlots = await this.getTotalBackpackSlots(this.partner.getSteamID64());

                    const ourNumItems = this.ourItemsCount;
                    const theirNumItems = this.theirItemsCount;

                    if (
                        theirTotalSlots === 0 ||
                        !(
                            (ourUsedSlots + theirNumItems) / ourTotalSlots >= 1 ||
                            (theirUsedSlots + ourNumItems) / theirTotalSlots >= 1
                        )
                    ) {
                        // Error 15 but failed to get their total slot, or not because inventory was full
                        return Promise.reject(`An error with code 15 (https://steamerrors.com/15) has occured`);
                    }

                    const dwEnabled =
                        opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url.main !== '';

                    const msg =
                        `Either I, or the trade partner${
                            !dwEnabled ? ` (${this.offer.partner.getSteamID64()})` : ''
                        }, ` +
                        `did not have enough backpack space (or near full) to complete a trade${
                            !dwEnabled ? (this.offer.id ? ` (${this.offer.id})` : '') : ''
                        }. ` +
                        `A summary of our backpacks can be seen below.` +
                        `\n⬅️ I would have received ${pluralize('item', theirNumItems, true)} → ${
                            ourUsedSlots + theirNumItems
                        } / ${ourTotalSlots} slots used` +
                        `\n➡️ They would have received ${pluralize('item', ourNumItems, true)} → ${
                            theirUsedSlots + ourNumItems
                        } / ${theirTotalSlots} slots used`;
                    if (opt.sendAlert.enable && opt.sendAlert.backpackFull) {
                        if (dwEnabled) {
                            sendAlert('full-backpack', this.bot, msg, null, err, [
                                this.offer.partner.getSteamID64(),
                                this.offer.id
                            ]);
                        } else {
                            this.bot.messageAdmins(msg, []);
                        }
                    }
                    return Promise.reject(
                        `It appears as if ${
                            ourUsedSlots + theirNumItems > ourTotalSlots ? 'my' : 'your'
                        } backpack is full/almost full!` +
                            `\n⬅️ I would have received ${pluralize('item', theirNumItems, true)} → ${
                                ourUsedSlots + theirNumItems
                            } / ${ourTotalSlots} slots used` +
                            `\n➡️ You would have received ${pluralize('item', ourNumItems, true)} → ${
                                theirUsedSlots + ourNumItems
                            } / ${theirTotalSlots} slots used` +
                            `\nIf this is in error, please give Steam time to refresh our backpacks.` +
                            '\nMore info about this error: https://steamerrors.com/15'
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

    toString(isDonating: boolean, prefix: string): string {
        if (this.isEmpty) {
            return '❌ Your cart is empty.';
        }

        const customTitle = this.bot.options.commands.cart.customReply.title;

        let str = isDonating ? '💰 == DONATION CART == 💰' : customTitle ? customTitle : '🛒== YOUR CART ==🛒';

        str += `\n\nMy side (items ${isDonating ? 'I will donate' : 'you will receive'}):`;
        for (const priceKey in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, priceKey)) {
                continue;
            }

            str += `\n- ${this.our[priceKey]}x `;
            if (Pricelist.isAssetId(priceKey)) {
                str += `${this.bot.pricelist.getPrice({ priceKey, onlyEnabled: false }).name} (${priceKey})`;
            } else {
                str += this.bot.schema.getName(SKU.fromString(priceKey), false);
            }
        }

        if (!isDonating) {
            str += '\n\nYour side (items you will lose):';
            for (const sku in this.their) {
                if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                    continue;
                }

                str += `\n- ${this.their[sku]}x ${this.bot.schema.getName(SKU.fromString(sku), false)}`;
            }
        }

        str += `\n\nType ${isDonating ? `"${prefix}donatenow"` : `"${prefix}checkout"`} to ${
            isDonating ? 'donate' : 'checkout'
        } and proceed trade, or "${prefix}clearcart" to cancel.`;

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

    static stringify(steamID: SteamID, isDonating: boolean, prefix: string): string {
        const cart = this.getCart(steamID);

        if (cart === null) {
            return '❌ Your cart is empty.';
        }

        return cart.toString(isDonating, prefix);
    }

    private async getTotalBackpackSlots(steamID64: string): Promise<number> {
        return new Promise(resolve => {
            apiRequest<BPTFGetUserInfo>({
                method: 'GET',
                url: 'https://api.backpack.tf/api/users/info/v1',
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                    Cookie: 'user-id=' + this.bot.userID
                },
                params: {
                    key: process.env.BPTF_API_KEY,
                    steamids: steamID64
                }
            })
                .then(body => {
                    const user = body.users[steamID64];
                    const totalBackpackSlots = user.inventory ? user.inventory['440'].slots.total : 0;

                    return resolve(totalBackpackSlots);
                })
                .catch(err => {
                    log.error('Failed requesting user info from backpack.tf: ', err);
                    return resolve(0);
                });
        });
    }
}
