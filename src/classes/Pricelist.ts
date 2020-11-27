/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { EventEmitter } from 'events';
import moment from 'moment-timezone';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';
import { Currency } from '../types/TeamFortress2';
import { UnknownDictionary } from '../types/common';

import Options from './Options';

import log from '../lib/logger';
import { getPricelist, getPrice } from '../lib/ptf-api';
import validator from '../lib/validator';

import { sendWebHookPriceUpdateV1 } from '../lib/DiscordWebhook/export';

export enum PricelistChangedSource {
    Command = 'COMMAND',
    Autokeys = 'AUTOKEYS',
    Other = 'OTHER'
}

export interface EntryData {
    sku: string;
    enabled: boolean;
    autoprice: boolean;
    max: number;
    min: number;
    intent: 0 | 1 | 2;
    buy?: Currency | null;
    sell?: Currency | null;
    promoted?: 0 | 1;
    group?: string | null;
    note?: { buy: string | null; sell: string | null };
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

    promoted: 0 | 1;

    group: string | null;

    note: { buy: string | null; sell: string | null };

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

        if (entry.promoted) {
            this.promoted = entry.promoted;
        } else {
            this.promoted = 0;
        }

        if (entry.group) {
            this.group = entry.group;
        } else {
            this.group = 'all';
        }

        if (entry.note) {
            this.note = entry.note;
        } else {
            this.note = { buy: null, sell: null };
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
            promoted: this.promoted,
            group: this.group,
            note: this.note,
            time: this.time
        };
    }
}

export default class Pricelist extends EventEmitter {
    private readonly schema: SchemaManager.Schema;

    private readonly socket: SocketIOClient.Socket;

    private prices: Entry[] = [];

    private globalKeyPrices: { buy: Currencies; sell: Currencies; src: string; time: number };

    private currentPTFKeyPrices: { buy: Currencies; sell: Currencies };

    private maxAge: number;

    constructor(schema: SchemaManager.Schema, socket: SocketIOClient.Socket, private options?: Options) {
        super();
        this.schema = schema;
        this.socket = socket;

        this.socket.removeListener('price', this.handlePriceChange.bind(this));
        this.socket.on('price', this.handlePriceChange.bind(this));
        this.maxAge = this.options.maxPriceAge || 8 * 60 * 60;
    }

    getKeyPrices(): { buy: Currencies; sell: Currencies; src: string; time: number } {
        return this.globalKeyPrices;
    }

    getKeyPrice(): Currencies {
        return this.globalKeyPrices.sell;
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

            if (entry.name === null) {
                // Check if entry.name is null, if true, get the name
                if (entry.sku !== null) {
                    // Check if entry.sku not null, if yes, then get name from it
                    entry.name = this.schema.getName(SKU.fromString(entry.sku), false);

                    if (entry.name === null) {
                        // If entry.name still null after getting its name, then skip current iteration
                        continue;
                    }
                } else {
                    // Else if entry.sku is null, then skip current iteration
                    continue;
                }
            }

            // Bot can crash here if entry.name is null
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

    private async validateEntry(entry: Entry, src: PricelistChangedSource): Promise<void> {
        const keyPrices = this.getKeyPrices();

        if (entry.autoprice) {
            let pricePTF;

            try {
                pricePTF = await getPrice(entry.sku, 'bptf');
            } catch (err) {
                throw new Error(err.body && err.body.message ? err.body.message : err.message);
            }

            entry.buy = new Currencies(pricePTF.buy);
            entry.sell = new Currencies(pricePTF.sell);
            entry.time = pricePTF.time;

            if (entry.sku === '5021;6') {
                this.globalKeyPrices = {
                    buy: entry.buy,
                    sell: entry.sell,
                    src: 'ptf',
                    time: entry.time
                };

                this.currentPTFKeyPrices = {
                    buy: entry.buy,
                    sell: entry.sell
                };
            }
        }

        if (!entry.hasPrice()) {
            throw new Error('Pricelist entry does not have a price');
        }

        if (entry.buy.toValue(keyPrices.buy.metal) >= entry.sell.toValue(keyPrices.sell.metal)) {
            throw new Error('Sell must be higher than buy');
        }

        if (entry.sku === '5021;6' && !entry.autoprice && src === PricelistChangedSource.Command) {
            // update key rate if manually set the price
            this.globalKeyPrices = {
                buy: entry.buy,
                sell: entry.sell,
                src: 'manual',
                time: null
            };
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

    async addPrice(
        entryData: EntryData,
        emitChange: boolean,
        src: PricelistChangedSource = PricelistChangedSource.Other
    ): Promise<Entry> {
        const errors = validator(entryData, 'pricelist-add');

        if (errors !== null) {
            return Promise.reject(new Error(errors.join(', ')));
        }

        if (this.hasPrice(entryData.sku, false)) {
            throw new Error('Item is already priced');
        }

        const entry = new Entry(entryData, this.schema);

        await this.validateEntry(entry, src);

        // Add new price
        this.prices.push(entry);

        if (emitChange) {
            this.priceChanged(entry.sku, entry);
        }

        return entry;
    }

    async updatePrice(
        entryData: EntryData,
        emitChange: boolean,
        src: PricelistChangedSource = PricelistChangedSource.Other
    ): Promise<Entry> {
        const errors = validator(entryData, 'pricelist-add');

        if (errors !== null) {
            return Promise.reject(new Error(errors.join(', ')));
        }

        const entry = new Entry(entryData, this.schema);

        await this.validateEntry(entry, src);

        // Remove old price
        await this.removePrice(entry.sku, false);

        // Add new price
        this.prices.push(entry);

        if (emitChange) {
            this.priceChanged(entry.sku, entry);
        }

        return entry;
    }

    removeByGroup(newEntry: Entry[]): Promise<any> {
        return new Promise(resolve => {
            this.prices = newEntry;
            this.emit('pricelist', newEntry);

            return resolve();
        });
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

    getIndex(sku: string): number {
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
                    promoted: prices[0].promoted,
                    group: prices[0].group,
                    note: prices[0].note,
                    time: prices[0].time
                },
                'pricelist'
            );

            if (errors !== null) {
                throw new Error(errors.join(', '));
            }
        }

        this.prices = prices.map(entry => new Entry(entry, this.schema));

        return this.setupPricelist();
    }

    setupPricelist(): Promise<void> {
        log.debug('Getting key prices...');

        return getPrice('5021;6', 'bptf').then(keyPricesPTF => {
            log.debug('Got key price');

            const entryKey = this.getPrice('5021;6', false);
            const timePTF = keyPricesPTF.time as number;

            this.currentPTFKeyPrices = {
                buy: new Currencies(keyPricesPTF.buy),
                sell: new Currencies(keyPricesPTF.sell)
            };

            if (entryKey !== null && !entryKey.autoprice) {
                this.globalKeyPrices = {
                    buy: entryKey.buy,
                    sell: entryKey.sell,
                    src: 'manual',
                    time: entryKey.time
                };
                log.debug('Key rate is set based on current key prices in the pricelist.', this.globalKeyPrices);
            } else {
                this.globalKeyPrices = {
                    buy: new Currencies(keyPricesPTF.buy),
                    sell: new Currencies(keyPricesPTF.sell),
                    src: 'ptf',
                    time: timePTF
                };
                log.debug('Key rate is set based current key prices.', this.globalKeyPrices);

                if (entryKey !== null && entryKey.autoprice) {
                    // The price of a key in the pricelist can be different from keyPrices because the pricelist is not updated
                    entryKey.buy = new Currencies(keyPricesPTF.buy);
                    entryKey.sell = new Currencies(keyPricesPTF.sell);
                    entryKey.time = keyPricesPTF.time;
                }
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
        const opt = this.options;

        if (data.source !== 'bptf') {
            return;
        }

        const match = this.getPrice(data.sku);

        if (data.sku === '5021;6') {
            const currentGlobalKeyBuyingPrice = this.globalKeyPrices.buy.metal;
            const currentGlobalKeySellingPrice = this.globalKeyPrices.sell.metal;
            const currentPTFBuyingPrice = this.currentPTFKeyPrices.buy.metal;
            const currentPTFSellingPrice = this.currentPTFKeyPrices.sell.metal;

            const isEnableScrapAdjustmentWithAutoprice =
                opt.autokeys.enable &&
                opt.autokeys.scrapAdjustment.enable &&
                currentGlobalKeyBuyingPrice === currentPTFBuyingPrice &&
                currentGlobalKeySellingPrice === currentPTFSellingPrice;

            if (match === null || (match !== null && match.autoprice) || isEnableScrapAdjustmentWithAutoprice) {
                // Only update global key rate if key is not in pricelist
                // OR if exist, it's autoprice enabled (true)
                // OR if Autokeys and Scrap Adjustment enabled, then check whether
                // current global key rate are the same as current prices.tf key rate.
                // if same, means autopriced and need to update to the latest price
                // (and autokeys/scrap adjustment will update key prices after new trade).
                // else entirely, key was manually priced and ignore updating global key rate.
                this.globalKeyPrices = {
                    buy: new Currencies(data.buy),
                    sell: new Currencies(data.sell),
                    src: 'ptf',
                    time: data.time
                };
            }

            // currentPTFKeyPrices will still need to be updated.
            this.currentPTFKeyPrices = {
                buy: new Currencies(data.buy),
                sell: new Currencies(data.sell)
            };
        }

        if (match !== null && match.autoprice) {
            match.buy = new Currencies(data.buy);
            match.sell = new Currencies(data.sell);
            match.time = data.time;

            this.priceChanged(match.sku, match);

            if (opt.discordWebhook.priceUpdate.enable && opt.discordWebhook.priceUpdate.url !== '') {
                const time = moment()
                    .tz(opt.timezone ? opt.timezone : 'UTC')
                    .format(opt.customTimeFormat ? opt.customTimeFormat : 'MMMM Do YYYY, HH:mm:ss ZZ');

                sendWebHookPriceUpdateV1(
                    data.sku,
                    this.schema.getName(SKU.fromString(match.sku), false),
                    match,
                    time,
                    this.schema,
                    opt
                );
                // this.priceChanges.push({
                //     sku: data.sku,
                //     name: this.schema.getName(SKU.fromString(match.sku), false),
                //     newPrice: match,
                //     time: time
                // });

                // if (this.priceChanges.length > 4) {
                //     this.sendWebHookPriceUpdate(this.priceChanges);
                //     this.priceChanges.length = 0;
                // }
            }
        }
    }

    private priceChanged(sku: string, entry: Entry): void {
        this.emit('price', sku, entry);
        this.emit('pricelist', this.prices);
    }

    private getOld(): Entry[] {
        if (this.maxAge <= 0) {
            return this.prices;
        }

        const now = moment().unix();

        return this.prices.filter(entry => entry.time + this.maxAge <= now);
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
