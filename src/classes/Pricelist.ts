import { EventEmitter } from 'events';
import dayjs from 'dayjs';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';
import { Currency } from '../types/TeamFortress2';
import Options from './Options';
import Bot from './Bot';
import log from '../lib/logger';
import { getPricelist, getPrice, GetItemPriceResponse, Item } from '../lib/ptf-api';
import validator from '../lib/validator';
import { sendWebHookPriceUpdateV1 } from '../lib/DiscordWebhook/export';
import SocketManager from './MyHandler/SocketManager';

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
    intent: 0 | 1 | 2; // 'buy', 'sell', 'bank'
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

    private constructor(entry: EntryData, name: string) {
        this.sku = entry.sku;
        this.name = name;
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
            if (entry.note.buy?.includes('[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬]') || entry.note.sell?.includes('[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬]')) {
                // temporary upgrade v2 -> v3
                this.note = { buy: null, sell: null };
            } else {
                this.note = entry.note;
            }
        } else {
            this.note = { buy: null, sell: null };
        }
    }

    clone(): Entry {
        return new Entry(this.getJSON(), this.name);
    }

    static fromData(data: EntryData, schema: SchemaManager.Schema): Entry {
        return new Entry(data, schema.getName(SKU.fromString(data.sku), false));
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

    private prices: Entry[] = [];

    get getLength(): number {
        return this.prices.length;
    }

    get getPrices(): Entry[] {
        return this.prices.slice(0);
    }

    /**
     * Current global key rate (this changes if you manually price key).
     */
    private globalKeyPrices: KeyPrices;

    get getKeyPrices(): KeyPrices {
        return this.globalKeyPrices;
    }

    get getKeyPrice(): Currencies {
        return this.globalKeyPrices.sell;
    }

    /**
     * Current key rate before receiving new prices data, this
     * can be different with global key rate.
     * Will not update Global key rate if manually priced.
     */
    private currentPTFKeyPrices: { buy: Currencies; sell: Currencies };

    public readonly maxAge: number;

    private readonly boundHandlePriceChange;

    private retryGetKeyPrices: NodeJS.Timeout;

    constructor(
        schema: SchemaManager.Schema,
        private socketManager: SocketManager,
        private options?: Options,
        private readonly bot?: Bot
    ) {
        super();
        this.schema = schema;
        this.maxAge = this.options.pricelist.priceAge.maxInSeconds || 8 * 60 * 60;
        this.boundHandlePriceChange = this.handlePriceChange.bind(this);
    }

    init(): void {
        this.socketManager.on('price', this.boundHandlePriceChange);
    }

    hasPrice(sku: string, onlyEnabled = false): boolean {
        const index = this.getIndex(sku);
        if (index === -1) {
            return false;
        }

        const match = this.prices[index];
        return !onlyEnabled || match.enabled;
    }

    getPrice(sku: string, onlyEnabled = false, generics = false): Entry | null {
        const pSku = SKU.fromString(sku);
        // Index of of item in pricelist
        const index = this.getIndex(null, pSku);
        const gindex = index === -1 && generics ? this.getIndexWithGenerics(null, pSku) : -1;

        if (index === -1 && (!generics || (generics && gindex === -1))) {
            // Did not find a match
            return null;
        }

        let match = index !== -1 ? this.prices[index] : this.prices[gindex];
        if (gindex !== -1) {
            // we found a generic match for a specific sku so we are going to clone the generic entry
            // otherwise we would mutate the existing generic entry
            match = match.clone();

            const effectMatch = this.bot.effects.find(e => pSku.effect === e.id);
            match.name = match.name.replace('Unusual', effectMatch.name);
            match.sku = sku;

            // change any other options if needed here (possible spot for config)
        }

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

            if (search === name || search.replace(/the /g, '').trim() === name.replace(/the /g, '').trim()) {
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
        const keyPrices = this.getKeyPrices;

        if (entry.autoprice) {
            try {
                const pricePTF = await getPrice(entry.sku, 'bptf');

                entry.buy = new Currencies(pricePTF.buy);
                entry.sell = new Currencies(pricePTF.sell);
                entry.time = pricePTF.time;

                if (entry.sku === '5021;6') {
                    clearTimeout(this.retryGetKeyPrices);
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
            } catch (err) {
                throw new Error(`❌ Unable to get current prices for ${entry.sku}: ${JSON.stringify(err)}`);
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

    async getPricesTF(sku: string): Promise<ParsedPrice | null> {
        try {
            return await getPrice(sku, 'bptf').then(response => new ParsedPrice(response));
        } catch (err) {
            log.debug(`getPricesTF failed ${JSON.stringify(err)}`);
            return null;
        }
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

        if (entryData.sku === '5021;6') {
            if (entryData.buy !== undefined) {
                if (entryData.buy.keys > 0) {
                    throw new Error("Don't price Mann Co. Supply Crate Key with keys property");
                }
            }

            if (entryData.sell !== undefined) {
                if (entryData.sell.keys > 0) {
                    throw new Error("Don't price Mann Co. Supply Crate Key with keys property");
                }
            }
        }

        const entry = Entry.fromData(entryData, this.schema);

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

        if (entryData.sku === '5021;6') {
            if (entryData.buy !== undefined) {
                if (entryData.buy.keys > 0) {
                    throw new Error("Don't price Mann Co. Supply Crate Key with keys property");
                }
            }

            if (entryData.sell !== undefined) {
                if (entryData.sell.keys > 0) {
                    throw new Error("Don't price Mann Co. Supply Crate Key with keys property");
                }
            }
        }

        const entry = Entry.fromData(entryData, this.schema);
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

    shufflePricelist(newEntry: Entry[]): Promise<any> {
        return new Promise(resolve => {
            this.prices = newEntry;
            this.emit('pricelist', newEntry);

            return resolve();
        });
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
            if (this.getLength !== 0) {
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

    getIndex(sku: string, parsedSku?: SchemaManager.Item): number {
        // Get name of item
        const name = this.schema.getName(parsedSku ? parsedSku : SKU.fromString(sku), false);
        const findIndex = this.prices.findIndex(entry => entry.name === name);
        return findIndex;
    }

    /** returns index of sku's generic match otherwise returns -1 */
    getIndexWithGenerics(sku: string, parsedSku?: SchemaManager.Item): number {
        // Get name of item
        const pSku = parsedSku ? parsedSku : SKU.fromString(sku);
        if (pSku.quality === 5) {
            // try to find a generic price
            const name = this.schema.getName(pSku, false);

            const effectMatch = this.bot.effects.find(e => pSku.effect === e.id);
            if (effectMatch) {
                // this means the sku given had a matching effect so we are going from a specific to generic
                return this.prices.findIndex(entry => entry.name === name.replace(effectMatch.name, 'Unusual'));
            } else {
                // this means the sku given was already generic so we just return the index of the generic
                return this.getIndex(null, pSku);
            }
        } else {
            return -1;
        }
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

        this.prices = prices.map(entry => Entry.fromData(entry, this.schema));
        return this.setupPricelist();
    }

    setupPricelist(): Promise<void> {
        log.debug('Getting key prices...');
        const entryKey = this.getPrice('5021;6', false);

        return getPrice('5021;6', 'bptf')
            .then(keyPricesPTF => {
                log.debug('Got key price');

                const timePTF = keyPricesPTF.time;

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

                const old = this.getOld;
                if (old.length === 0) {
                    return;
                }

                return this.updateOldPrices(old);
            })
            .catch(err => {
                log.debug('❌ Unable to get key prices: ', err);

                if (entryKey !== null) {
                    log.debug('✅ Key entry exist, setting current and global key rate as is');
                    this.currentPTFKeyPrices = {
                        buy: entryKey.buy,
                        sell: entryKey.sell
                    };
                    this.globalKeyPrices = {
                        buy: entryKey.buy,
                        sell: entryKey.sell,
                        src: entryKey.time !== null ? 'ptf' : 'manual',
                        time: entryKey.time
                    };
                } else {
                    log.debug(
                        '⚠️ Key entry does not exist, setting random current and global key rate, retry in 15 minutes'
                    );
                    this.currentPTFKeyPrices = {
                        buy: new Currencies({
                            keys: 0,
                            metal: 50
                        }),
                        sell: new Currencies({
                            keys: 0,
                            metal: 60
                        })
                    };
                    this.globalKeyPrices = {
                        buy: new Currencies({
                            keys: 0,
                            metal: 50
                        }),
                        sell: new Currencies({
                            keys: 0,
                            metal: 60
                        }),
                        src: 'ptf',
                        time: 1600000000000
                    };

                    this.retryGetKeyPrices = setTimeout(() => {
                        void this.updateKeyRate();
                    }, 15 * 60 * 1000);
                }

                return;
            });
    }

    private updateKeyRate(): Promise<void> {
        const entryKey = this.getPrice('5021;6', false);
        clearTimeout(this.retryGetKeyPrices);

        return getPrice('5021;6', 'bptf')
            .then(keyPricesPTF => {
                log.debug('✅ Got current key prices, updating...');

                if (entryKey !== null && entryKey.autoprice) {
                    this.globalKeyPrices = {
                        buy: new Currencies(keyPricesPTF.buy),
                        sell: new Currencies(keyPricesPTF.sell),
                        src: 'ptf',
                        time: keyPricesPTF.time
                    };
                }
                this.currentPTFKeyPrices = {
                    buy: new Currencies(keyPricesPTF.buy),
                    sell: new Currencies(keyPricesPTF.sell)
                };
            })
            .catch(err => {
                log.debug('⚠️ Still unable to get current key prices, retrying in 15 minutes: ', err);
                this.retryGetKeyPrices = setTimeout(() => {
                    void this.updateKeyRate();
                }, 15 * 60 * 1000);
            });
    }

    private updateOldPrices(old: Entry[]): Promise<void> {
        log.debug('Getting pricelist...');

        return getPricelist('bptf').then(pricelist => {
            log.debug('Got pricelist');

            const groupedPrices = Pricelist.groupPrices(pricelist.items);

            let pricesChanged = false;

            // Go through our pricelist
            for (let i = 0; i < old.length; i++) {
                // const currPrice = old[i];
                if (old[i].autoprice !== true) {
                    continue;
                }

                const item = SKU.fromString(old[i].sku);
                // PricesTF includes "The" in the name, we need to use proper name
                const name = this.schema.getName(item, true);

                // Go through pricestf prices
                for (let j = 0; j < groupedPrices[item.quality][item.killstreak].length; j++) {
                    const newestPrice = groupedPrices[item.quality][item.killstreak][j];

                    if (name === newestPrice.name) {
                        // Found matching items
                        if (old[i].time < newestPrice.time) {
                            // Times don't match, update our price
                            old[i].buy = new Currencies(newestPrice.buy);
                            old[i].sell = new Currencies(newestPrice.sell);
                            old[i].time = newestPrice.time;

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

    private handlePriceChange(data: GetItemPriceResponse): void {
        if (data.source !== 'bptf') {
            return;
        }

        const match = this.getPrice(data.sku);
        if (data.sku === '5021;6') {
            /**New received prices data.*/
            const newPTF = {
                buy: new Currencies(data.buy),
                sell: new Currencies(data.sell)
            };

            const currGlobal = this.globalKeyPrices;
            const currPTF = this.currentPTFKeyPrices;

            const isEnableScrapAdjustmentWithAutoprice =
                this.options.autokeys.enable &&
                this.options.autokeys.scrapAdjustment.enable &&
                currGlobal.buy === currPTF.buy &&
                currGlobal.sell === currPTF.sell;

            if (match === null || match.autoprice || isEnableScrapAdjustmentWithAutoprice) {
                // Only update global key rate if key is not in pricelist
                // OR if exist, it's autoprice enabled (true)
                // OR if Autokeys and Scrap Adjustment enabled, then check whether
                // current global key rate are the same as current prices.tf key rate.
                // if same, means autopriced and need to update to the latest price
                // (and autokeys/scrap adjustment will update key prices after new trade).
                // else entirely, key was manually priced and ignore updating global key rate.
                this.globalKeyPrices = {
                    buy: newPTF.buy,
                    sell: newPTF.sell,
                    src: 'ptf',
                    time: data.time
                };
            }

            // currentPTFKeyPrices will still need to be updated.
            this.currentPTFKeyPrices = {
                buy: newPTF.buy,
                sell: newPTF.sell
            };
        }

        if (match !== null && match.autoprice) {
            match.buy = new Currencies(data.buy);
            match.sell = new Currencies(data.sell);
            match.time = data.time;

            this.priceChanged(match.sku, match);

            if (this.options.discordWebhook.priceUpdate.enable && this.options.discordWebhook.priceUpdate.url !== '') {
                const time = dayjs()
                    .tz(this.options.timezone ? this.options.timezone : 'UTC')
                    .format(
                        this.options.customTimeFormat ? this.options.customTimeFormat : 'MMMM Do YYYY, HH:mm:ss ZZ'
                    );

                sendWebHookPriceUpdateV1(data.sku, match, time, this.schema, this.options);
            }
        }
    }

    private priceChanged(sku: string, entry: Entry): void {
        this.emit('price', sku, entry);
        this.emit('pricelist', this.prices);
    }

    private get getOld(): Entry[] {
        if (this.maxAge <= 0) {
            return this.prices;
        }
        const now = dayjs().unix();

        return this.prices.filter(entry => entry.time + this.maxAge <= now);
    }

    static groupPrices(prices: Item[]): Group {
        const sorted: Group = {};

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

export interface KeyPrices {
    buy: Currencies;
    sell: Currencies;
    src: string;
    time: number;
}

export class ParsedPrice {
    sku?: string;

    name?: string;

    currency?: string;

    source?: string;

    time?: number;

    buy?: Currencies;

    sell?: Currencies;

    constructor(priceResponse: GetItemPriceResponse) {
        this.sku = priceResponse.sku;
        this.name = priceResponse.name;
        this.currency = priceResponse.currency;
        this.source = priceResponse.source;
        this.time = priceResponse.time;
        this.buy = new Currencies(priceResponse.buy);
        this.sell = new Currencies(priceResponse.sell);
    }
}

interface Group {
    [quality: string]: { [killstreak: string]: Item[] };
}
