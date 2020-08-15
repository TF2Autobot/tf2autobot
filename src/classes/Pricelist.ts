import { Currency } from '../types/TeamFortress2';
import { UnknownDictionary } from '../types/common';

import { EventEmitter } from 'events';
import moment from 'moment-timezone';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku';
import SchemaManager from 'tf2-schema';

import DiscordWebhook, { Webhook } from 'discord-webhook-ts';

import log from '../lib/logger';
import { getPricelist, getPrice } from '../lib/ptf-api';
import validator from '../lib/validator';

const maxAge = parseInt(process.env.MAX_PRICE_AGE) || 8 * 60 * 60;

export interface EntryData {
    sku: string;
    enabled: boolean;
    autoprice: boolean;
    max: number;
    min: number;
    intent: 0 | 1 | 2;
    buy?: Currency | null;
    sell?: Currency | null;
    time?: number | null;
}

export class Entry {
    sku: string;

    name: string;

    enabled: boolean;

    autoprice: boolean;

    max: number;

    min: number;

    intent: 0 | 1 | 2;

    buy: Currencies | null;

    sell: Currencies | null;

    time: number | null;

    constructor(entry: EntryData, schema: SchemaManager.Schema) {
        this.sku = entry.sku;
        this.name = schema.getName(SKU.fromString(entry.sku), false);
        this.enabled = entry.enabled;
        this.autoprice = entry.autoprice;
        this.max = entry.max;
        this.min = entry.min;
        this.intent = entry.intent;

        // TODO: Validate entry

        if (entry.buy && entry.sell) {
            // Added both buy and sell
            this.buy = new Currencies(entry.buy);
            this.sell = new Currencies(entry.sell);

            this.time = this.autoprice ? entry.time : null;
        } else {
            // Price not set yet
            this.buy = null;
            this.sell = null;
            this.time = null;
        }
    }

    hasPrice(): boolean {
        // TODO: Allow null buy / sell price depending on intent
        return this.buy !== null && this.sell !== null;
    }

    getJSON(): EntryData {
        return {
            sku: this.sku,
            enabled: this.enabled,
            autoprice: this.autoprice,
            max: this.max,
            min: this.min,
            intent: this.intent,
            buy: this.buy === null ? null : this.buy.toJSON(),
            sell: this.sell === null ? null : this.sell.toJSON(),
            time: this.time
        };
    }
}

export default class Pricelist extends EventEmitter {
    private readonly schema: SchemaManager.Schema;

    private readonly socket: SocketIOClient.Socket;

    private prices: Entry[] = [];

    private keyPrices: { buy: Currencies; sell: Currencies };

    private priceChanges: {
        sku: string;
        name: string;
        newPrice: Entry;
        time: string;
    }[] = [];

    constructor(schema: SchemaManager.Schema, socket: SocketIOClient.Socket) {
        super();
        this.schema = schema;
        this.socket = socket;

        this.socket.removeListener('price', this.handlePriceChange.bind(this));
        this.socket.on('price', this.handlePriceChange.bind(this));
    }

    getKeyPrices(): { buy: Currencies; sell: Currencies } {
        return this.keyPrices;
    }

    getKeyPrice(): Currencies {
        return this.keyPrices.sell;
    }

    getLength(): number {
        return this.prices.length;
    }

    getPrices(): Entry[] {
        return this.prices.slice(0);
    }

    hasPrice(sku: string, onlyEnabled = false): boolean {
        const index = this.getIndex(sku);

        if (index === -1) {
            return false;
        }

        const match = this.prices[index];

        return !onlyEnabled || match.enabled;
    }

    getPrice(sku: string, onlyEnabled = false): Entry | null {
        // Index of of item in pricelist
        const index = this.getIndex(sku);

        if (index === -1) {
            // Did not find a match
            return null;
        }

        const match = this.prices[index];

        if (onlyEnabled && !match.enabled) {
            // Item is not enabled
            return null;
        }

        return match;
    }

    searchByName(search: string, enabledOnly = true): Entry | string[] | null {
        search = search.toLowerCase();

        const match: Entry[] = [];

        for (let i = 0; i < this.prices.length; i++) {
            const entry = this.prices[i];

            if (enabledOnly && entry.enabled === false) {
                continue;
            }

            const name = entry.name.toLowerCase();

            if (search.includes('uncraftable')) {
                search = search.replace('uncraftable', 'non-craftable');
            }

            if (search === name) {
                // Found direct match
                return entry;
            }

            if (name.includes(search)) {
                match.push(entry);
            }
        }

        if (match.length === 0) {
            // No match
            return null;
        } else if (match.length === 1) {
            // Found one that matched the search
            return match[0];
        }

        // Found many that matched, return list of the names
        return match.map(entry => entry.name);
    }

    private async validateEntry(entry: Entry): Promise<void> {
        if (entry.autoprice) {
            let price;

            try {
                price = await getPrice(entry.sku, 'bptf');
            } catch (err) {
                throw new Error(err.body && err.body.message ? err.body.message : err.message);
            }

            entry.buy = new Currencies(price.buy);
            entry.sell = new Currencies(price.sell);
            entry.time = price.time;
        }

        if (!entry.hasPrice()) {
            throw new Error('Pricelist entry does not have a price');
        }

        const keyPrice = this.getKeyPrice();

        if (entry.buy.toValue(keyPrice.metal) >= entry.sell.toValue(keyPrice.metal)) {
            throw new Error('Sell must be higher than buy');
        }
    }

    async getPricesTF(sku: string): Promise<any> {
        let price;
        try {
            price = await getPrice(sku, 'bptf');
        } catch (err) {
            price = null;
        }
        return price;
    }

    async addPrice(entryData: EntryData, emitChange: boolean): Promise<Entry> {
        const errors = validator(entryData, 'pricelist-add');

        if (errors !== null) {
            return Promise.reject(new Error(errors.join(', ')));
        }

        if (this.hasPrice(entryData.sku, false)) {
            throw new Error('Item is already priced');
        }

        const entry = new Entry(entryData, this.schema);

        await this.validateEntry(entry);

        // Add new price
        this.prices.push(entry);

        if (emitChange) {
            this.priceChanged(entry.sku, entry);
        }

        return entry;
    }

    async updatePrice(entryData: EntryData, emitChange: boolean): Promise<Entry> {
        const errors = validator(entryData, 'pricelist-add');

        if (errors !== null) {
            return Promise.reject(new Error(errors.join(', ')));
        }

        const entry = new Entry(entryData, this.schema);

        await this.validateEntry(entry);

        // Remove old price
        this.removePrice(entry.sku, false);

        // Add new price
        this.prices.push(entry);

        if (emitChange) {
            this.priceChanged(entry.sku, entry);
        }

        return entry;
    }

    removeAll(): Promise<any> {
        return new Promise(resolve => {
            if (this.getLength() !== 0) {
                this.prices = [];
                this.emit('pricelist', []);
            }

            return resolve();
        });
    }

    removePrice(sku: string, emitChange: boolean): Promise<Entry> {
        return new Promise((resolve, reject) => {
            const index = this.getIndex(sku);

            if (index === -1) {
                return reject(new Error('Item is not priced'));
            }

            // Found match, remove it
            const entry = this.prices.splice(index, 1)[0];

            if (emitChange) {
                this.priceChanged(sku, entry);
            }

            return resolve(entry);
        });
    }

    private getIndex(sku: string): number {
        // Get name of item
        const name = this.schema.getName(SKU.fromString(sku), false);

        return this.prices.findIndex(entry => entry.name === name);
    }

    setPricelist(prices: EntryData[]): Promise<void> {
        if (prices.length !== 0) {
            const errors = validator(
                {
                    sku: prices[0].sku,
                    enabled: prices[0].enabled,
                    intent: prices[0].intent,
                    max: prices[0].max,
                    min: prices[0].min,
                    autoprice: prices[0].autoprice,
                    buy: prices[0].buy,
                    sell: prices[0].sell,
                    time: prices[0].time
                },
                'pricelist'
            );

            if (errors !== null) {
                throw new Error(errors.join(', '));
            }
        }

        // @ts-ignore
        this.prices = prices.map(entry => new Entry(entry, this.schema));

        return this.setupPricelist();
    }

    setupPricelist(): Promise<void> {
        log.debug('Getting key price...');

        return getPrice('5021;6', 'bptf').then(keyPrices => {
            log.debug('Got key price');

            this.keyPrices = {
                buy: new Currencies(keyPrices.buy),
                sell: new Currencies(keyPrices.sell)
            };

            const entryKey = this.getPrice('5021;6');

            if (entryKey !== null && entryKey.autoprice) {
                // The price of a key in the pricelist can be different from keyPrices because the pricelist is not updated
                entryKey.buy = new Currencies(keyPrices.buy);
                entryKey.sell = new Currencies(keyPrices.sell);
                entryKey.time = keyPrices.time;
            }

            const old = this.getOld();

            if (old.length === 0) {
                return;
            }

            return this.updateOldPrices(old);
        });
    }

    private updateOldPrices(old: Entry[]): Promise<void> {
        log.debug('Getting pricelist...');

        return getPricelist('bptf').then(pricelist => {
            log.debug('Got pricelist');

            const groupedPrices = Pricelist.groupPrices(pricelist.items as any[]);

            let pricesChanged = false;

            // Go through our pricelist
            for (let i = 0; i < old.length; i++) {
                const currPrice = old[i];
                if (currPrice.autoprice !== true) {
                    continue;
                }

                const item = SKU.fromString(currPrice.sku);
                // PricesTF includes "The" in the name, we need to use proper name
                const name = this.schema.getName(item, true);

                // Go through pricestf prices
                for (let j = 0; j < groupedPrices[item.quality][item.killstreak].length; j++) {
                    const newestPrice = groupedPrices[item.quality][item.killstreak][j];

                    if (name === newestPrice.name) {
                        // Found matching items
                        if (currPrice.time < newestPrice.time) {
                            // Times don't match, update our price
                            currPrice.buy = new Currencies(newestPrice.buy);
                            currPrice.sell = new Currencies(newestPrice.sell);
                            currPrice.time = newestPrice.time;

                            pricesChanged = true;
                        }

                        // When a match is found remove it from the ptf pricelist
                        groupedPrices[item.quality][item.killstreak].splice(j, 1);
                        break;
                    }
                }
            }

            if (pricesChanged) {
                this.emit('pricelist', this.prices);
            }
        });
    }

    private handlePriceChange(data: any): void {
        if (data.source !== 'bptf') {
            return;
        }

        if (data.sku === '5021;6') {
            this.keyPrices = {
                buy: new Currencies(data.buy),
                sell: new Currencies(data.sell)
            };
        }

        const match = this.getPrice(data.sku);
        if (match !== null && match.autoprice) {
            match.buy = new Currencies(data.buy);
            match.sell = new Currencies(data.sell);
            match.time = data.time;

            this.priceChanged(match.sku, match);

            if (
                process.env.DISABLE_DISCORD_WEBHOOK_PRICE_UPDATE === 'false' &&
                process.env.DISCORD_WEBHOOK_PRICE_UPDATE_URL
            ) {
                const time = moment()
                    .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC')
                    .format(
                        process.env.CUSTOM_TIME_FORMAT ? process.env.CUSTOM_TIME_FORMAT : 'MMMM Do YYYY, HH:mm:ss ZZ'
                    );

                this.priceChanges.push({
                    sku: data.sku,
                    name: this.schema.getName(SKU.fromString(match.sku), false),
                    newPrice: match,
                    time: time
                });

                if (this.priceChanges.length > 9) {
                    this.sendWebHookPriceUpdate(this.priceChanges);
                    this.priceChanges.length = 0;
                }
            }
        }
    }

    private priceChanged(sku: string, entry: Entry): void {
        this.emit('price', sku, entry);
        this.emit('pricelist', this.prices);
    }

    private sendWebHookPriceUpdate(data: { sku: string; name: string; newPrice: Entry; time: string }[]): void {
        const embed: {
            author: {
                name: string;
                url: string;
                icon_url: string;
            };
            footer: {
                text: string;
            };
            thumbnail: {
                url: string;
            };
            image: {
                url: string;
            };
            title: string;
            description: string;
            color: string;
        }[] = [];

        const paintCan = {
            '5052;6': '2f4f4f', // A Color Similar to Slate
            '5031;6': '7d4071', // A Deep Commitment to Purple
            '5040;6': '141414', // A Distinctive Lack of Hue
            '5076;6': 'bcddb3', // A Mann's Mint
            '5077;6': '2d2d24', // After Eight
            '5038;6': '7e7e7e', // Aged Moustache Grey
            '5063;6': '654740', // An Air of Debonair
            '5039;6': 'e6e6e6', // An Extraordinary Abundance of Tinge
            '5037;6': 'e7b53b', // Australium Gold
            '5062;6': '3b1f23', // Balaclavas Are Forever
            '5030;6': 'd8bed8', // Color No. 216-190-216
            '5065;6': 'c36c2d', // Cream Spirit
            '5056;6': 'e9967a', // Dark Salmon Injustice
            '5053;6': '808000', // Drably Olive
            '5027;6': '729e42', // Indubitably Green
            '5032;6': 'cf7336', // Mann Co. Orange
            '5033;6': 'a57545', // Muskelmannbraun
            '5029;6': '51384a', // Noble Hatter's Violet
            '5060;6': '483838', // Operator's Overalls
            '5034;6': 'c5af91', // Peculiarly Drab Tincture
            '5051;6': 'ff69b4', // Pink as Hell
            '5035;6': '694d3a', // Radigan Conagher Brown
            '5046;6': 'b8383b', // Team Spirit
            '5054;6': '32cd32', // The Bitter Taste of Defeat and Lime
            '5055;6': 'f0e68c', // The Color of a Gentlemann's Business Pants
            '5064;6': '803020', // The Value of Teamwork
            '5061;6': 'a89a8c', // Waterlogged Lab Coat
            '5036;6': '7c6c57', // Ye Olde Rustic Colour
            '5028;6': '424f3b' // Zepheniah's Greed
        };

        const qualityColor = {
            '0': '11711154', // Normal - #B2B2B2
            '1': '5076053', // Genuine - #4D7455
            '3': '4678289', // Vintage - #476291
            '5': '8802476', // Unusual - #8650AC
            '6': '16766720', // Unique - #FFD700
            '7': '7385162', // Community - #70B04A
            '8': '10817401', // Valve - #A50F79
            '9': '7385162', //Self-Made - #70B04A
            '11': '13593138', //Strange - #CF6A32
            '13': '3732395', //Haunted - #38F3AB
            '14': '11141120', //Collector's - #AA0000
            '15': '16711422' // Decorated Weapon
        };

        data.forEach(data => {
            const parts = data.sku.split(';');
            const newSku = parts[0] + ';6';
            const newItem = SKU.fromString(newSku);
            const newName = this.schema.getName(newItem, false);

            const itemImageUrl = this.schema.getItemByItemName(newName);

            let itemImageUrlPrint: string;

            const item = SKU.fromString(data.sku);

            if (!itemImageUrl || !item) {
                itemImageUrlPrint = 'https://jberlife.com/wp-content/uploads/2019/07/sorry-image-not-available.jpg';
            } else if (Object.keys(paintCan).includes(newSku)) {
                itemImageUrlPrint = `https://backpack.tf/images/440/cans/Paint_Can_${paintCan[newSku]}.png`;
            } else if (item.australium === true) {
                itemImageUrlPrint = `https://scrap.tf/img/items/440/${item.defindex}-gold.png`;
            } else if (item.paintkit !== null) {
                itemImageUrlPrint = `https://scrap.tf/img/items/warpaint/${encodeURIComponent(newName)}_${
                    item.paintkit
                }_${item.wear}_${item.festive === true ? 1 : 0}.png`;
            } else {
                itemImageUrlPrint = itemImageUrl.image_url_large;
            }

            let effectsId: string;

            if (parts[2]) {
                effectsId = parts[2].replace('u', '');
            }

            let effectURL: string;

            if (!effectsId) {
                effectURL = '';
            } else {
                effectURL = `https://backpack.tf/images/440/particles/${effectsId}_94x94.png`;
            }

            const qualityItem = parts[1];
            const qualityColorPrint = qualityColor[qualityItem].toString();

            /*eslint-disable */
            embed.push({
                author: {
                    name: data.name,
                    url: `https://www.prices.tf/items/${data.sku}`,
                    icon_url:
                        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3d/3dba19679c4a689b9d24fa300856cbf3d948d631_full.jpg'
                },
                footer: {
                    text: `Item's SKU: ${data.sku} • ${data.time}`
                },
                thumbnail: {
                    url: itemImageUrlPrint
                },
                image: {
                    url: effectURL
                },
                title: '',
                description:
                    `**※  Buy:** ${data.newPrice.buy.toString()}\n` +
                    `**※ Sell:** ${data.newPrice.sell.toString()}\n` +
                    (process.env.DISCORD_WEBHOOK_PRICE_UPDATE_ADDITIONAL_DESCRIPTION_NOTE
                        ? process.env.DISCORD_WEBHOOK_PRICE_UPDATE_ADDITIONAL_DESCRIPTION_NOTE
                        : ''),
                color: qualityColorPrint
            });
            /*eslint-enable */
        });

        /*eslint-disable */
        const priceUpdate = {
            username: process.env.DISCORD_WEBHOOK_USERNAME,
            avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL,
            content: '',
            embeds: embed
        };
        /*eslint-enable */

        const discordClient = new DiscordWebhook(process.env.DISCORD_WEBHOOK_PRICE_UPDATE_URL);
        const requestBody: Webhook.input.POST = priceUpdate;
        discordClient.execute(requestBody);
    }

    private getOld(): Entry[] {
        if (maxAge <= 0) {
            return this.prices;
        }

        const now = moment().unix();

        return this.prices.filter(entry => entry.time + maxAge <= now);
    }

    static groupPrices(prices: any[]): UnknownDictionary<UnknownDictionary<any[]>> {
        const sorted: UnknownDictionary<UnknownDictionary<any[]>> = {};

        for (let i = 0; i < prices.length; i++) {
            if (prices[i].buy === null) {
                continue;
            }

            const item = SKU.fromString(prices[i].sku);

            if (!sorted[item.quality]) {
                // Group is not defined yet
                sorted[item.quality] = {};
            }

            if (sorted[item.quality][item.killstreak] !== undefined) {
                sorted[item.quality][item.killstreak].push(prices[i]);
            } else {
                sorted[item.quality][item.killstreak] = [prices[i]];
            }
        }

        return sorted;
    }
}
