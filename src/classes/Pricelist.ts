import { EventEmitter } from 'events';
import dayjs from 'dayjs';
import Currencies from 'tf2-currencies-2';
import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';
import { Currency } from '../types/TeamFortress2';
import Options from './Options';
import Bot from './Bot';
import log from '../lib/logger';
import validator from '../lib/validator';
import { sendWebHookPriceUpdateV1, sendAlert } from '../lib/DiscordWebhook/export';
import SocketManager from './MyHandler/SocketManager';
import Pricer, { GetItemPriceResponse, Item } from './Pricer';

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
    private currentKeyPrices: { buy: Currencies; sell: Currencies };

    public readonly maxAge: number;

    private readonly boundHandlePriceChange;

    private retryGetKeyPrices: NodeJS.Timeout;

    constructor(
        private readonly priceSource: Pricer,
        private readonly schema: SchemaManager.Schema,
        private readonly socketManager: SocketManager,
        private readonly options?: Options,
        private bot?: Bot
    ) {
        super();
        this.schema = schema;
        this.maxAge = this.options.pricelist.priceAge.maxInSeconds || 8 * 60 * 60;
        this.boundHandlePriceChange = this.handlePriceChange.bind(this);
    }

    get isUseCustomPricer(): boolean {
        return this.options.customPricerUrl !== '' && this.options.customPricerApiToken !== '';
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
        const pricesCount = this.prices.length;

        for (let i = 0; i < pricesCount; i++) {
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

        const matchCount = match.length;

        if (matchCount === 0) {
            // No match
            return null;
        } else if (matchCount === 1) {
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
                const price = await this.priceSource.getPrice(entry.sku, 'bptf');

                const newPrices = {
                    buy: new Currencies(price.buy),
                    sell: new Currencies(price.sell)
                };

                if (entry.sku === '5021;6') {
                    clearTimeout(this.retryGetKeyPrices);

                    const canUseKeyPricesFromSource = this.verifyKeyPrices(newPrices);

                    if (!canUseKeyPricesFromSource) {
                        throw new Error(
                            'Broken key prices from source - Please make sure prices for Mann Co. Supply Crate Key (5021;6) are correct - ' +
                                'both buy and sell "keys" property must be 0 and value ("metal") must not 0'
                        );
                    }

                    this.globalKeyPrices = {
                        buy: newPrices.buy,
                        sell: newPrices.sell,
                        src: this.isUseCustomPricer ? 'customPricer' : 'ptf',
                        time: price.time
                    };

                    this.currentKeyPrices = newPrices;
                }

                entry.buy = newPrices.buy;
                entry.sell = newPrices.sell;
                entry.time = price.time;
                //
            } catch (err) {
                throw new Error(
                    `Unable to get current prices for ${entry.sku}: ${
                        (err as ErrorRequest).body && (err as ErrorRequest).body.message
                            ? (err as ErrorRequest).body.message
                            : (err as ErrorRequest).message
                    }`
                );
            }
        }

        if (!entry.hasPrice()) {
            throw new Error('Pricelist entry does not have a price');
        }

        if (entry.intent !== 0 || entry.sku === '5021;6') {
            if (entry.buy.toValue(keyPrices.buy.metal) >= entry.sell.toValue(keyPrices.sell.metal)) {
                throw new Error('Sell must be higher than buy');
            }
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

    async getItemPrices(sku: string): Promise<ParsedPrice | null> {
        try {
            return await this.priceSource.getPrice(sku, 'bptf').then(response => new ParsedPrice(response));
        } catch (err) {
            log.debug(`getItemPrices failed ${JSON.stringify(err)}`);
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

    setPricelist(prices: EntryData[], bot: Bot): Promise<void> {
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

        this.bot = bot;

        this.prices = prices.map(entry => Entry.fromData(entry, this.schema));
        return this.setupPricelist();
    }

    private verifyKeyPrices(prices: { buy: Currencies; sell: Currencies } | Entry): boolean {
        return prices.buy.keys === 0 && prices.sell.keys === 0 && prices.buy.metal > 0 && prices.sell.metal > 0;
    }

    setupPricelist(): Promise<void> {
        log.debug('Getting key prices...');
        const entryKey = this.getPrice('5021;6', false);

        return this.priceSource
            .getPrice('5021;6', 'bptf')
            .then(keyPrices => {
                log.debug('Got key price');

                const time = keyPrices.time;

                const newPrices = {
                    buy: new Currencies(keyPrices.buy),
                    sell: new Currencies(keyPrices.sell)
                };

                this.currentKeyPrices = newPrices;

                const canUseManuallyPriced = entryKey !== null ? this.verifyKeyPrices(entryKey) : false;

                if (entryKey !== null && !entryKey.autoprice && canUseManuallyPriced) {
                    // Here we just check the value for selling price for the Mann Co. Supply Crate Key must always more than 0
                    // If the owner set the selling price for like 1 ref or 0.11 ref, that's up to them
                    // I can easily buy an Australium for probably less than a key if they did that.
                    this.globalKeyPrices = {
                        buy: entryKey.buy,
                        sell: entryKey.sell,
                        src: 'manual',
                        time: entryKey.time
                    };
                    log.debug('Key rate is set based on current key prices in the pricelist.', this.globalKeyPrices);
                } else {
                    const canUseKeyPricesFromSource = this.verifyKeyPrices(newPrices);

                    if (!canUseKeyPricesFromSource) {
                        log.error(
                            `Broken key prices from source - Please make sure prices for Mann Co. Supply Crate Key (5021;6) are correct -` +
                                ` both buy and sell "keys" property must be 0 and value ("metal") must not 0. Using temporary key prices...`
                        );

                        this.useTemporaryKeyPrices(entryKey);
                    } else {
                        this.globalKeyPrices = {
                            buy: newPrices.buy,
                            sell: newPrices.sell,
                            src: this.isUseCustomPricer ? 'customPricer' : 'ptf',
                            time: time
                        };
                        log.debug(`Key rate is set based current key prices.`, this.globalKeyPrices);

                        if (entryKey !== null && entryKey.autoprice) {
                            // The price of a key in the pricelist can be different from keyPrices because the pricelist is not updated
                            entryKey.buy = newPrices.buy;
                            entryKey.sell = newPrices.sell;
                            entryKey.time = keyPrices.time;

                            if (this.verifyKeyPrices(entryKey) === false) {
                                log.warn(
                                    `Price for Mann Co. Supply Crate Key in your pricelist in not valid and has been reset to use current prices.`,
                                    this.globalKeyPrices
                                );
                            }
                        }
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

                this.useTemporaryKeyPrices(entryKey);

                return;
            });
    }

    private useTemporaryKeyPrices(entryKey: Entry): void {
        const canUseManuallyPriced = entryKey !== null ? this.verifyKeyPrices(entryKey) : false;

        if (canUseManuallyPriced) {
            log.debug('✅ Key entry exist, setting current and global key rate as is');
            this.currentKeyPrices = {
                buy: entryKey.buy,
                sell: entryKey.sell
            };
            this.globalKeyPrices = {
                buy: entryKey.buy,
                sell: entryKey.sell,
                src: entryKey.time !== null ? (this.isUseCustomPricer ? 'customPricer' : 'ptf') : 'manual',
                time: entryKey.time
            };
        } else {
            log.debug('⚠️ Key entry does not exist, setting random current and global key rate, retry in 15 minutes');
            const temporaryKeyPrices = {
                buy: new Currencies({
                    keys: 0,
                    metal: 50
                }),
                sell: new Currencies({
                    keys: 0,
                    metal: 60
                })
            };

            this.currentKeyPrices = temporaryKeyPrices;
            this.globalKeyPrices = {
                buy: temporaryKeyPrices.buy,
                sell: temporaryKeyPrices.sell,
                src: this.isUseCustomPricer ? 'customPricer' : 'ptf',
                time: 1614000000
            };

            this.retryGetKeyPrices = setTimeout(() => {
                void this.updateKeyPrices();
            }, 15 * 60 * 1000);
        }
    }

    private updateKeyPrices(): Promise<void> {
        const entryKey = this.getPrice('5021;6', false);
        clearTimeout(this.retryGetKeyPrices);

        return this.priceSource
            .getPrice('5021;6', 'bptf')
            .then(keyPrices => {
                log.debug('✅ Got current key prices, updating...');

                const updatedKeyPrices = {
                    buy: new Currencies(keyPrices.buy),
                    sell: new Currencies(keyPrices.sell)
                };

                const canUseKeyPricesFromSource = this.verifyKeyPrices(updatedKeyPrices);

                if (!canUseKeyPricesFromSource) {
                    log.debug('❌ Broken keyPrices, retrying in 15 minutes...');
                    this.retryGetKeyPrices = setTimeout(() => {
                        void this.updateKeyPrices();
                    }, 15 * 60 * 1000);

                    log.error(
                        'Broken key prices from source - Please make sure prices for Mann Co. Supply Crate Key (5021;6) are correct - ' +
                            'both buy and sell "keys" property must be 0 and value ("metal") must not 0'
                    );
                    return;
                }

                if (entryKey !== null && entryKey.autoprice) {
                    this.globalKeyPrices = {
                        buy: updatedKeyPrices.buy,
                        sell: updatedKeyPrices.sell,
                        src: this.isUseCustomPricer ? 'customPricer' : 'ptf',
                        time: keyPrices.time
                    };
                }
                this.currentKeyPrices = updatedKeyPrices;
            })
            .catch(err => {
                log.debug('⚠️ Still unable to get current key prices, retrying in 15 minutes: ', err);
                this.retryGetKeyPrices = setTimeout(() => {
                    void this.updateKeyPrices();
                }, 15 * 60 * 1000);
            });
    }

    private updateOldPrices(old: Entry[]): Promise<void> {
        log.debug('Getting pricelist...');

        return this.priceSource.getPricelist('bptf').then(pricelist => {
            log.debug('Got pricelist');

            const groupedPrices = Pricelist.groupPrices(pricelist.items);

            let pricesChanged = false;

            const inventory = this.bot.inventoryManager.getInventory;

            // Go through our pricelist
            const oldCount = old.length;
            const opt = this.options.pricelist.partialPriceUpdate;
            const excludedSKU = ['5021;6'].concat(opt.excludeSKU);
            const keyPrice = this.getKeyPrice.metal;

            for (let i = 0; i < oldCount; i++) {
                const currPrice = old[i];
                if (currPrice.autoprice !== true) {
                    continue;
                }

                const isInStock = inventory.getAmount(currPrice.sku, true) > 0;

                const item = SKU.fromString(currPrice.sku);
                // PricesTF (and custom pricer) includes "The" in the name, we need to use proper name
                const name = this.schema.getName(item, true);

                // Go through pricestf/custom pricer prices
                const grouped = groupedPrices[item.quality][item.killstreak];
                const groupedCount = grouped.length;

                for (let j = 0; j < groupedCount; j++) {
                    const newestPrice = grouped[j];

                    if (name === newestPrice.name) {
                        // Found matching items
                        if (currPrice.time < newestPrice.time) {
                            // Times don't match, update our price
                            const newBuy = new Currencies(newestPrice.buy);
                            const newSell = new Currencies(newestPrice.sell);

                            const newBuyValue = newBuy.toValue(keyPrice);
                            const newSellValue = newSell.toValue(keyPrice);

                            // TODO: Use last bought prices instead of current buying prices
                            const currBuyingValue = currPrice.buy.toValue(keyPrice);
                            const currSellingValue = currPrice.sell.toValue(keyPrice);

                            const isNotExceedThreshold = newestPrice.time - currPrice.time < opt.thresholdInSeconds;
                            const isNotExcluded = !excludedSKU.includes(currPrice.sku);

                            if (opt.enable && isInStock && isNotExceedThreshold && isNotExcluded) {
                                // if optPartialUpdate.enable is true and the item is currently in stock
                                // and difference between latest time and time recorded in pricelist is less than threshold

                                const isNegativeDiff = newSellValue - currBuyingValue < 0;

                                if (isNegativeDiff || currPrice.group === 'isPartialPriced') {
                                    // Only trigger this if difference of new selling price and current buying price is negative
                                    // Or item group is "isPartialPriced".

                                    if (newBuyValue < currSellingValue) {
                                        // if new buying price is less than current selling price
                                        // update only the buying price.
                                        currPrice.buy = newBuy;

                                        if (newSellValue > currSellingValue) {
                                            // If new selling price is more than old, then update selling price too
                                            currPrice.sell = newSell;
                                        }

                                        // no need to update time here

                                        currPrice.group = 'isPartialPriced';
                                        pricesChanged = true;
                                    } else if (newSellValue > currSellingValue) {
                                        // If new selling price is more than old, then update selling price too
                                        currPrice.sell = newSell;

                                        pricesChanged = true;
                                    }
                                } else {
                                    // else, just update as usual now (except if group is "isPartialPriced").
                                    if (currPrice.group !== 'isPartialPriced') {
                                        currPrice.buy = newBuy;
                                        currPrice.sell = newSell;
                                        currPrice.time = newestPrice.time;

                                        pricesChanged = true;
                                    }
                                }
                            } else {
                                // else if optPartialUpdate.enable is false and/or the item is currently not in stock
                                // and/or more than threshold, update everything

                                currPrice.buy = newBuy;
                                currPrice.sell = newSell;
                                currPrice.time = newestPrice.time;

                                pricesChanged = true;
                            }
                        }

                        // When a match is found remove it from the ptf/other source pricelist
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
        const opt = this.options;

        const newPrices = {
            buy: new Currencies(data.buy),
            sell: new Currencies(data.sell)
        };

        if (data.sku === '5021;6' && this.globalKeyPrices !== undefined) {
            /**New received prices data.*/

            const canUseKeyPricesFromSource = this.verifyKeyPrices(newPrices);

            if (!canUseKeyPricesFromSource) {
                log.error(
                    'Broken key prices from source - Please make sure prices for Mann Co. Supply Crate Key (5021;6) are correct - ' +
                        'both buy and sell "keys" property must be 0 and value ("metal") must not 0'
                );
                return;
            }

            const currGlobal = this.globalKeyPrices;
            const currPrices = this.currentKeyPrices;
            const optAutokeys = opt.autokeys;

            const isEnableScrapAdjustmentWithAutoprice =
                optAutokeys.enable &&
                optAutokeys.scrapAdjustment.enable &&
                currGlobal.buy === currPrices.buy &&
                currGlobal.sell === currPrices.sell;

            if (match === null || match.autoprice || isEnableScrapAdjustmentWithAutoprice) {
                // Only update global key rate if key is not in pricelist
                // OR if exist, it's autoprice enabled (true)
                // OR if Autokeys and Scrap Adjustment enabled, then check whether
                // current global key rate are the same as current prices.tf key rate.
                // if same, means autopriced and need to update to the latest price
                // (and autokeys/scrap adjustment will update key prices after new trade).
                // else entirely, key was manually priced and ignore updating global key rate.
                this.globalKeyPrices = {
                    buy: newPrices.buy,
                    sell: newPrices.sell,
                    src: this.isUseCustomPricer ? 'customPricer' : 'ptf',
                    time: data.time
                };
            }

            // currentKeyPrices will still need to be updated.
            this.currentKeyPrices = newPrices;
        }

        if (match !== null && match.autoprice) {
            const oldPrice = {
                buy: new Currencies(match.buy),
                sell: new Currencies(match.sell)
            };

            let pricesChanged = false;

            const optPartialUpdate = opt.pricelist.partialPriceUpdate;
            const isInStock = this.bot.inventoryManager.getInventory.getAmount(match.sku, true) > 0;
            const isNotExceedThreshold = data.time - match.time < optPartialUpdate.thresholdInSeconds;
            const isNotExcluded = !['5021;6'].concat(optPartialUpdate.excludeSKU).includes(match.sku);

            if (
                optPartialUpdate.enable &&
                isInStock &&
                isNotExceedThreshold &&
                this.globalKeyPrices !== undefined &&
                isNotExcluded
            ) {
                // if optPartialUpdate.enable is true and the item is currently in stock
                // and difference between latest time and time recorded in pricelist is less than threshold

                const keyPrice = this.getKeyPrice.metal;

                const newBuyValue = newPrices.buy.toValue(keyPrice);
                const newSellValue = newPrices.sell.toValue(keyPrice);

                // TODO: Use last bought prices instead of current buying prices
                const currBuyingValue = match.buy.toValue(keyPrice);
                const currSellingValue = match.sell.toValue(keyPrice);

                const isNegativeDiff = newSellValue - currBuyingValue < 0;

                if (isNegativeDiff || match.group === 'isPartialPriced') {
                    // Only trigger this if difference of new selling price and current buying price is negative
                    // Or item group is "isPartialPriced".

                    let isUpdate = false;

                    if (newBuyValue < currSellingValue) {
                        // if new buying price is less than current selling price
                        // update only the buying price.
                        match.buy = newPrices.buy;

                        if (newSellValue > currSellingValue) {
                            // If new selling price is more than old, then update selling price too
                            match.sell = newPrices.sell;
                        }

                        isUpdate = true;

                        // no need to update time here
                    } else if (newSellValue > currSellingValue) {
                        // If new selling price is more than old, then update selling price too
                        match.sell = newPrices.sell;
                        isUpdate = true;
                    }

                    if (isUpdate) {
                        match.group = 'isPartialPriced';
                        pricesChanged = true;
                        const dw = opt.discordWebhook.sendAlert;
                        const isDwEnabled = dw.enable && dw.url !== '';

                        const msg =
                            `${
                                isDwEnabled ? `[${match.name}](https://www.prices.tf/items/${match.sku})` : match.name
                            } (${match.sku}):\n▸ ` +
                            [
                                `old: ${oldPrice.buy.toString()}/${oldPrice.sell.toString()}`,
                                `current: ${match.buy.toString()}/${match.sell.toString()}`,
                                `pricestf: ${newPrices.buy.toString()}/${newPrices.sell.toString()}`
                            ].join('\n▸ ');

                        if (opt.sendAlert.partialPrice.onUpdate) {
                            if (isDwEnabled) {
                                sendAlert('isPartialPriced', this.bot, msg);
                            } else {
                                this.bot.messageAdmins('Partial price update\n\n' + msg, []);
                            }
                        }
                    }
                } else {
                    // else, just update as usual now (except if group is "isPartialPriced").
                    if (match.group !== 'isPartialPriced') {
                        match.buy = newPrices.buy;
                        match.sell = newPrices.sell;
                        match.time = data.time;

                        pricesChanged = true;
                    }
                }
            } else {
                // else if optPartialUpdate.enable is false and/or the item is currently not in stock
                // and/or more than threshold, update everything

                match.buy = newPrices.buy;
                match.sell = newPrices.sell;
                match.time = data.time;

                pricesChanged = true;

                if (pricesChanged) {
                    this.priceChanged(match.sku, match);
                }

                const dw = opt.discordWebhook.priceUpdate;

                if (dw.enable && dw.url !== '' && this.globalKeyPrices !== undefined) {
                    const currentStock = this.bot.inventoryManager.getInventory.getAmount(match.sku, true);
                    const showOnlyInStock = dw.showOnlyInStock ? currentStock > 0 : true;

                    if (showOnlyInStock) {
                        const tz = opt.timezone;
                        const format = opt.customTimeFormat;

                        const time = dayjs()
                            .tz(tz ? tz : 'UTC')
                            .format(format ? format : 'MMMM Do YYYY, HH:mm:ss ZZ');

                        sendWebHookPriceUpdateV1(
                            data.sku,
                            match,
                            time,
                            this.schema,
                            opt,
                            currentStock,
                            oldPrice,
                            this.getKeyPrice.metal,
                            this.isUseCustomPricer
                        );
                    }
                }
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

        const pricesCount = prices.length;

        for (let i = 0; i < pricesCount; i++) {
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

interface ErrorRequest {
    body?: ErrorBody;
    message?: string;
}

interface ErrorBody {
    message: string;
}
