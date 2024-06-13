import { EventEmitter } from 'events';
import dayjs from 'dayjs';
import Currencies from '@tf2autobot/tf2-currencies';
import SKU from '@tf2autobot/tf2-sku';
import SchemaManager from '@tf2autobot/tf2-schema';
import { Currency } from '../types/TeamFortress2';
import Options from './Options';
import Bot from './Bot';
import log from '../lib/logger';
import validator from '../lib/validator';
import { sendWebHookPriceUpdateV1, sendAlert, sendFailedPriceUpdate } from './DiscordWebhook/export';
import IPricer, { GetItemPriceResponse, Item } from './IPricer';

export enum PricelistChangedSource {
    Command = 'COMMAND',
    Autokeys = 'AUTOKEYS',
    Other = 'OTHER'
}

export interface EntryData {
    sku: string;
    id?: string;
    enabled: boolean;
    autoprice: boolean;
    min: number;
    max: number;
    intent: 0 | 1 | 2; // 'buy', 'sell', 'bank'
    buy?: Currency | null;
    sell?: Currency | null;
    limit?: { buy: Currency | null; sell: Currency | null };
    promoted?: 0 | 1;
    group?: string | null;
    note?: { buy: string | null; sell: string | null };
    isPartialPriced?: boolean;
    time?: number | null;
}

export class Entry implements EntryData {
    sku: string;

    id?: string;

    name: string;

    enabled: boolean;

    autoprice: boolean;

    min: number;

    max: number;

    intent: 0 | 1 | 2;

    buy: Currencies | null;

    sell: Currencies | null;

    limit: { buy: Currencies | null; sell: Currencies | null };

    promoted: 0 | 1;

    group: string | null;

    note: { buy: string | null; sell: string | null };

    isPartialPriced: boolean;

    time: number | null;

    private constructor(entry: EntryData, name: string) {
        this.sku = entry.sku;

        if (entry.id) {
            this.id = entry.id;
        }

        this.name = name;
        this.enabled = entry.enabled;
        this.autoprice = entry.autoprice;
        this.min = entry.min;
        this.max = entry.max;

        if (entry.id) {
            // Always set to sell if id is defined
            this.intent = 1;
        } else {
            this.intent = entry.intent;
        }

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
            if (entry.group === 'isPartialPriced') {
                // temporary v3.7.x -> v3.8.0
                this.group = 'all';
                entry.isPartialPriced = true;
                this.isPartialPriced = true;
            } else {
                this.group = entry.group;
            }
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

        if (entry.isPartialPriced) {
            this.isPartialPriced = entry.isPartialPriced;
        } else {
            this.isPartialPriced = false;
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
        const obj = {
            sku: this.sku,
            enabled: this.enabled,
            autoprice: this.autoprice,
            min: this.min,
            max: this.max,
            intent: this.intent,
            buy: this.buy === null ? null : this.buy.toJSON(),
            sell: this.sell === null ? null : this.sell.toJSON(),
            promoted: this.promoted,
            group: this.group,
            note: this.note,
            isPartialPriced: this.isPartialPriced,
            time: this.time
        };

        if (this.id) {
            obj['id'] = this.id;
        }

        return obj;
    }
}

export interface PricesObject {
    [priceKey: string]: Entry;
}

export interface PricesDataObject {
    [priceKey: string]: EntryData;
}

export interface AssetidInPricelist {
    [sku: string]: { [assetid: string]: number };
}

export default class Pricelist extends EventEmitter {
    private prices: PricesObject = {};

    get getLength(): number {
        return Object.keys(this.prices).length;
    }

    get getPrices(): PricesObject {
        return this.prices;
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

    private transformedPricelistForBulk: { [p: string]: Item };

    private retryGetKeyPrices: NodeJS.Timeout;

    failedUpdateOldPrices: string[] = [];

    partialPricedUpdateBulk: string[] = [];

    autoResetPartialPriceBulk: string[] = [];

    private priceChangeCounter = 0;

    assetidInPricelist: AssetidInPricelist = {};

    checkAssetidInPricelistInterval: NodeJS.Timeout;

    set resetFailedUpdateOldPrices(value: number) {
        this.failedUpdateOldPrices.length = value;
    }

    constructor(
        private readonly priceSource: IPricer,
        private readonly schema: SchemaManager.Schema,
        private readonly options?: Options,
        private bot?: Bot
    ) {
        super();
        this.schema = schema;
        this.maxAge = this.options.pricelist.priceAge.maxInSeconds || 8 * 60 * 60;
        this.boundHandlePriceChange = this.handlePriceChange.bind(this);
    }

    get isUseCustomPricer(): boolean {
        return !(
            this.options.customPricerUrl === undefined ||
            this.options.customPricerUrl === '' || // empty == default which is api2.prices.tf
            this.options.customPricerUrl === 'https://api.prices.tf' ||
            this.options.customPricerUrl === 'https://api2.prices.tf'
        );
    }

    get isDwAlertEnabled(): boolean {
        const opt = this.bot.options.discordWebhook.sendAlert;
        return opt.enable && (opt.url.main !== '' || opt.url.partialPriceUpdate !== '');
    }

    init(): void {
        if (this.options.enableSocket) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            this.priceSource.bindHandlePriceEvent(this.boundHandlePriceChange);
        }
    }

    hasPrice({ priceKey, onlyEnabled = false }: { priceKey: string; onlyEnabled?: boolean }): boolean {
        if (!this.prices[priceKey]) {
            return false;
        }

        return this.prices[priceKey].enabled || !onlyEnabled;
    }

    getPrice({
        priceKey,
        onlyEnabled = false,
        getGenericPrice = false
    }: {
        priceKey: string;
        onlyEnabled?: boolean;
        getGenericPrice?: boolean;
    }): Entry | null {
        if (this.hasPrice({ priceKey, onlyEnabled: onlyEnabled })) {
            return this.prices[priceKey];
        }

        if (getGenericPrice && !Pricelist.isAssetId(priceKey)) {
            const genericSku = getGenericPrice ? priceKey.replace(/;u\d+/, '') : null;
            if (this.hasPrice({ priceKey: genericSku, onlyEnabled: onlyEnabled })) {
                return this.prices[genericSku];
            }
        }

        return null;
    }

    getPriceBySkuOrAsset({
        priceKey,
        onlyEnabled = false,
        getGenericPrice = false
    }: {
        priceKey: string;
        onlyEnabled?: boolean;
        getGenericPrice?: boolean;
    }): Entry | null {
        let entry = this.getPrice({ priceKey, onlyEnabled: onlyEnabled, getGenericPrice });

        if (Pricelist.isAssetId(priceKey) && !entry) {
            if (this.hasPrice({ priceKey, onlyEnabled: false }) && onlyEnabled) {
                // Is an asset, is priced, and is disabled
                return null;
            }

            entry = this.getPrice({
                priceKey: this.bot.inventoryManager.getInventory.findByAssetid(priceKey),
                onlyEnabled: onlyEnabled,
                getGenericPrice
            });
        }

        return entry;
    }

    /**
     * return true if the string matches all numbers
     * @param search - potential match string
     */
    static isAssetId(search: string): boolean {
        return /^[0-9]+$/.test(search);
    }

    searchByName(search: string, enabledOnly = true): Entry | string[] | null {
        // if this happens to be an id search, just try to get the price
        if (Pricelist.isAssetId(search)) {
            return this.getPrice({ priceKey: search, onlyEnabled: enabledOnly });
        }
        const sku = this.schema.getSkuFromName(search);

        if (this.hasPrice({ priceKey: sku, onlyEnabled: enabledOnly })) {
            return this.prices[sku];
        }

        // If unable to find by SKU, we iterate pricelist and search with name

        search = search.toLowerCase();

        const match: Entry[] = [];
        const ArraySKU = Object.keys(this.prices);
        const pricesCount = ArraySKU.length;

        for (let i = 0; i < pricesCount; i++) {
            // Filter out assets
            // Note to myself: I only realized this is needed because disabled items were entering in UserCart:constructOffer() and throwing errors
            if (Pricelist.isAssetId(ArraySKU[i])) {
                continue;
            }

            const entry = this.prices[ArraySKU[i]];

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
        const matchedNames = match.map(entry => entry.name);
        return matchedNames;
    }

    private async validateEntry(entry: Entry, src: PricelistChangedSource, isBulk: boolean): Promise<void> {
        const keyPrices = this.getKeyPrices;

        if (entry.autoprice && !entry.isPartialPriced && !isBulk) {
            // skip this part if autoprice is false and/or isPartialPriced is true
            const price: GetItemPriceResponse = await this.priceSource.getPrice(entry.sku).catch(err => {
                throw new Error(
                    `Unable to get current prices for ${entry.sku}: ${
                        (err as ErrorRequest).body && (err as ErrorRequest).body.message
                            ? (err as ErrorRequest).body.message
                            : (err as ErrorRequest).message
                    }`
                );
            });

            const newPrices = {
                buy: new Currencies(price.buy),
                sell: new Currencies(price.sell)
            };

            if (entry.sku === '5021;6') {
                clearTimeout(this.retryGetKeyPrices);

                const canUseKeyPricesFromSource = Pricelist.verifyKeyPrices(newPrices);

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
        } else if (isBulk) {
            if (entry.autoprice) {
                const item = this.transformedPricelistForBulk[entry.sku];

                if (item === undefined) {
                    throw new Error('Item is not priced - please manually price this item');
                }

                const newPrices = {
                    buy: new Currencies(item.buy),
                    sell: new Currencies(item.sell)
                };

                if (entry.sku === '5021;6') {
                    clearTimeout(this.retryGetKeyPrices);

                    const canUseKeyPricesFromSource = Pricelist.verifyKeyPrices(newPrices);

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
                        time: item.time
                    };

                    this.currentKeyPrices = newPrices;
                }

                entry.buy = newPrices.buy;
                entry.sell = newPrices.sell;
                entry.time = item.time;
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
            return await this.priceSource.getPrice(sku).then(response => new ParsedPrice(response));
        } catch (err) {
            const errStringify = JSON.stringify(err);
            const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
            log.debug(`getItemPrices failed ${errMessage}`);
            return null;
        }
    }

    async addPrice({
        entryData,
        emitChange,
        src = PricelistChangedSource.Other,
        isBulk = false,
        pricerItems = null,
        isLast = null
    }: {
        entryData: EntryData;
        emitChange: boolean;
        src?: PricelistChangedSource;
        isBulk?: boolean;
        pricerItems?: Item[];
        isLast?: boolean;
    }): Promise<Entry> {
        const errors = validator(entryData, 'pricelist-add');

        if (errors !== null) {
            throw new Error(errors.join(', '));
        }
        if (this.hasPrice({ priceKey: entryData.id ?? entryData.sku, onlyEnabled: false })) {
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

        if (!this.schema.checkExistence(SKU.fromString(entryData.sku))) {
            throw new Error(`Item with sku ${entryData.sku} does not exist.`);
        }

        const entry = Entry.fromData(entryData, this.schema);

        if (isBulk && pricerItems !== null && this.transformedPricelistForBulk === undefined) {
            this.transformedPricelistForBulk = Pricelist.transformPricesFromPricer(pricerItems);
        }

        await this.validateEntry(entry, src, isBulk);
        // Add new price
        const priceKey = entry.id ?? entry.sku;
        this.prices[priceKey] = entry;
        const isAssetid = Pricelist.isAssetId(priceKey);

        if (emitChange) {
            this.priceChanged(priceKey, entry);
            if (isAssetid) {
                // make sure to also check for sku (amount might changed)
                this.priceChanged(entry.sku, entry);
            }
        }

        if (isBulk && isLast) {
            this.transformedPricelistForBulk = undefined;
        }

        if (isAssetid) {
            this.cacheAssetidInPricelist();
        }

        return entry;
    }

    async updatePrice({
        priceKey,
        entryData,
        emitChange,
        src = PricelistChangedSource.Other,
        isBulk = false,
        pricerItems = null,
        isLast = null
    }: {
        priceKey: string;
        entryData: EntryData;
        emitChange: boolean;
        src?: PricelistChangedSource;
        isBulk?: boolean;
        pricerItems?: Item[];
        isLast?: boolean;
    }): Promise<Entry> {
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

        if (isBulk && pricerItems !== null && this.transformedPricelistForBulk === undefined) {
            this.transformedPricelistForBulk = Pricelist.transformPricesFromPricer(pricerItems);
        }

        await this.validateEntry(entry, src, isBulk);

        // Update to new price
        this.prices[priceKey] = entry;

        if (emitChange) {
            this.priceChanged(priceKey, entry);
        }

        if (isBulk && isLast) {
            this.transformedPricelistForBulk = undefined;
        }

        return entry;
    }

    setNewPricelist(newEntry: PricesObject): void {
        this.prices = newEntry;
        this.emit('pricelist', newEntry);
    }

    removeAll(): void {
        if (this.getLength !== 0) {
            this.prices = {};
            this.emit('pricelist', []);
        }
    }

    removePrice(priceKey: string, emitChange: boolean): Promise<Entry> {
        return new Promise((resolve, reject) => {
            if (!this.hasPrice({ priceKey })) {
                return reject(new Error('Item is not priced'));
            }

            const entry = Object.assign({}, this.prices[priceKey]); //TODO: do we need to copy it ?
            delete this.prices[priceKey];

            if (emitChange) {
                this.priceChanged(priceKey, entry);
            }

            if (Pricelist.isAssetId(priceKey)) {
                this.removeCacheAssetidInPricelist(priceKey);
            }

            return resolve(entry);
        });
    }

    replacePriceEntry(oldId: string, newEntry: EntryData): void {
        this.removePrice(oldId, true)
            .then(() => {
                this.bot.pricelist
                    .addPrice({ entryData: newEntry, emitChange: true })
                    .then(() => {
                        log.info(`Successfully replaced ${oldId} to ${newEntry.id}`);
                    })
                    .catch(err => {
                        log.error(`Error replacing ${oldId} to ${newEntry.id}: `, err);
                    });
            })
            .catch(err => {
                log.error(`Error removing ${oldId} while replacing to ${newEntry.id}: `, err);
            });
    }

    private cacheAssetidInPricelist(): void {
        Object.keys(this.prices).forEach(priceKey => {
            if (Pricelist.isAssetId(priceKey)) {
                if (this.assetidInPricelist[this.prices[priceKey].sku] === undefined) {
                    this.assetidInPricelist[this.prices[priceKey].sku] = {};
                }
                this.assetidInPricelist[this.prices[priceKey].sku][priceKey] = 1;
            }
        });
    }

    private removeCacheAssetidInPricelist(assetid: string): void {
        Object.keys(this.assetidInPricelist).forEach(sku => {
            if (this.assetidInPricelist[sku] && this.assetidInPricelist[sku][assetid] !== undefined) {
                delete this.assetidInPricelist[sku][assetid];
            }

            if (Object.keys(this.assetidInPricelist[sku]).length < 1) {
                delete this.assetidInPricelist[sku];
            }
        });
    }

    private checkCacheAssetidInPricelist(): void {
        const inv = this.bot.inventoryManager.getInventory;
        Object.keys(this.prices).forEach(priceKey => {
            if (Pricelist.isAssetId(priceKey) && inv.findByAssetid(priceKey) === null) {
                // Make sure assetid in pricelist exists, if not, remove it.
                this.removePrice(priceKey, true)
                    .then(() => {
                        this.removeCacheAssetidInPricelist(priceKey);
                        log.info(`✅ Automatically removed ${priceKey} (no longer exists)`);
                    })
                    .catch(err => {
                        log.error('❌ Failed to automatically remove assetid from pricelist (no longer exists):', err);
                    });
            }
        });
    }

    private initCheckCache(): void {
        this.checkAssetidInPricelistInterval = setInterval(() => {
            this.checkCacheAssetidInPricelist();
        }, 2.5 * 60 * 1000);
    }

    async setPricelist(prices: PricesDataObject, bot: Bot): Promise<void> {
        let errors = validator(prices, 'prices-data-object');

        if (errors !== null) {
            throw new Error(errors.join(', '));
        }

        this.bot = bot;

        for (const sku in prices) {
            if (!Object.prototype.hasOwnProperty.call(prices, sku)) {
                continue;
            }

            this.prices[sku] = Entry.fromData(prices[sku], this.schema);
        }

        errors = validator(this.prices, 'pricelist');
        if (errors !== null) {
            throw new Error(errors.join(', '));
        }

        this.cacheAssetidInPricelist();
        this.checkCacheAssetidInPricelist();
        this.initCheckCache();

        return this.setupPricelist();
    }

    private static verifyKeyPrices(prices: { buy: Currencies; sell: Currencies } | Entry): boolean {
        return prices.buy.keys === 0 && prices.sell.keys === 0 && prices.buy.metal > 0 && prices.sell.metal > 0;
    }

    setupPricelist(): Promise<void> {
        log.debug('Getting key prices...');
        const entryKey = this.getPrice({ priceKey: '5021;6', onlyEnabled: false });

        return this.priceSource
            .getPrice('5021;6')
            .then(keyPrices => {
                log.debug('Got key price');

                const time = keyPrices.time;

                const newPrices = {
                    buy: new Currencies(keyPrices.buy),
                    sell: new Currencies(keyPrices.sell)
                };

                this.currentKeyPrices = newPrices;

                const canUseManuallyPriced = entryKey !== null ? Pricelist.verifyKeyPrices(entryKey) : false;

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
                    const canUseKeyPricesFromSource = Pricelist.verifyKeyPrices(newPrices);

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

                            if (Pricelist.verifyKeyPrices(entryKey) === false) {
                                log.warn(
                                    `Price for Mann Co. Supply Crate Key in your pricelist in not valid and has been reset to use current prices.`,
                                    this.globalKeyPrices
                                );
                            }
                        }
                    }
                }

                const old = this.getOld;
                if (Object.keys(old).length === 0) {
                    return;
                }

                return this.updateOldPrices(old)
                    .then(() => {
                        log.debug('Done update old prices...');
                    })
                    .catch(err => {
                        log.error('Error on updateOldPrices:', err);
                    });
            })
            .catch(err => {
                log.error('❌ Unable to get key prices: ', err);

                this.useTemporaryKeyPrices(entryKey);

                return;
            });
    }

    private useTemporaryKeyPrices(entryKey: Entry): void {
        const canUseManuallyPriced = entryKey !== null ? Pricelist.verifyKeyPrices(entryKey) : false;

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
                    metal: 67
                }),
                sell: new Currencies({
                    keys: 0,
                    metal: 70
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
        const entryKey = this.getPrice({ priceKey: '5021;6', onlyEnabled: false });
        clearTimeout(this.retryGetKeyPrices);

        return this.priceSource
            .getPrice('5021;6')
            .then(keyPrices => {
                log.debug('✅ Got current key prices, updating...');

                const updatedKeyPrices = {
                    buy: new Currencies(keyPrices.buy),
                    sell: new Currencies(keyPrices.sell)
                };

                const canUseKeyPricesFromSource = Pricelist.verifyKeyPrices(updatedKeyPrices);

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

    private updateOldPrices(old: PricesObject): Promise<void> {
        log.debug('Getting pricelist...');

        return this.priceSource.getPricelist().then(pricelist => {
            log.debug('Got pricelist');

            const transformedPrices = Pricelist.transformPricesFromPricer(pricelist.items);

            let pricesChanged = false;

            const inventory = this.bot.inventoryManager.getInventory;

            // Go through our pricelist
            const ppu = this.options.pricelist.partialPriceUpdate;
            const excludedSKU = ['5021;6'].concat(ppu.excludeSKU);
            const keyPrice = this.getKeyPrice.metal;

            for (const sku in old) {
                if (!Object.prototype.hasOwnProperty.call(old, sku)) {
                    continue;
                }

                const currPrice = old[sku];
                if (currPrice.autoprice !== true) {
                    continue;
                }

                if (transformedPrices[sku]) {
                    const newestPrice = transformedPrices[sku];
                    // Found matching items
                    if (currPrice.time >= newestPrice.time) {
                        continue;
                    }

                    //TODO: CONTINUE / FINISH

                    // We received a newer price, update our price
                    const oldPrices = {
                        buy: new Currencies(currPrice.buy),
                        sell: new Currencies(currPrice.sell)
                    };

                    const newPrices = {
                        buy: new Currencies(newestPrice.buy),
                        sell: new Currencies(newestPrice.sell)
                    };

                    const newBuyValue = newPrices.buy.toValue(keyPrice);
                    const newSellValue = newPrices.sell.toValue(keyPrice);

                    // TODO: Use last bought prices instead of current buying prices
                    const currBuyingValue = currPrice.buy.toValue(keyPrice);
                    const currSellingValue = currPrice.sell.toValue(keyPrice);

                    const isInStock =
                        inventory.getAmount({
                            priceKey: sku,
                            includeNonNormalized: false,
                            tradableOnly: true
                        }) > 0;
                    const isNotExceedThreshold = newestPrice.time - currPrice.time < ppu.thresholdInSeconds;
                    const isNotExcluded = !excludedSKU.includes(sku);
                    const maxIsOne = currPrice.max === 1;

                    // https://github.com/TF2Autobot/tf2autobot/issues/506
                    // https://github.com/TF2Autobot/tf2autobot/pull/520

                    if (ppu.enable && isInStock && isNotExceedThreshold && isNotExcluded && maxIsOne) {
                        const isNegativeDiff = newSellValue - currBuyingValue <= 0;
                        const isBuyingChanged = currBuyingValue !== newBuyValue;

                        if (isNegativeDiff || isBuyingChanged || currPrice.isPartialPriced) {
                            if (newSellValue > currBuyingValue || newSellValue > currSellingValue) {
                                currPrice.sell = newPrices.sell;
                            } else {
                                currPrice.sell = Currencies.toCurrencies(currBuyingValue + 1, keyPrice);
                            }

                            const msg = this.generatePartialPriceUpdateMsg(oldPrices, currPrice, newPrices);
                            this.partialPricedUpdateBulk.push(msg);
                            pricesChanged = true;
                        } else {
                            if (!currPrice.isPartialPriced) {
                                currPrice.buy = newPrices.buy;
                                currPrice.sell = newPrices.sell;
                                currPrice.time = newestPrice.time;

                                pricesChanged = true;
                            }
                        }
                    } else {
                        if (
                            !currPrice.isPartialPriced || // partialPrice is false - update as usual
                            (currPrice.isPartialPriced && !isNotExceedThreshold) || // Still partialPrice AND and has exceeded threshold
                            (currPrice.isPartialPriced && !isInStock) // OR, still partialPrice true AND and no longer in stock
                        ) {
                            currPrice.buy = newPrices.buy;
                            currPrice.sell = newPrices.sell;
                            currPrice.time = newestPrice.time;

                            if (currPrice.isPartialPriced) {
                                currPrice.isPartialPriced = false; // reset to default
                                this.autoResetPartialPriceBulk.push(sku);
                            }

                            pricesChanged = true;
                        }
                    }
                }
            }

            if (pricesChanged) {
                this.emit('pricelist', this.prices);
            }
        });
    }

    private generatePartialPriceUpdateMsg(oldPrices: BuyAndSell, currPrices: Entry, newPrices: BuyAndSell): string {
        return (
            `${
                this.isDwAlertEnabled
                    ? `[${currPrices.name}](https://autobot.tf/items/${currPrices.sku})`
                    : currPrices.name
            } (${currPrices.sku}):\n▸ ` +
            [
                `old: ${oldPrices.buy.toString()}/${oldPrices.sell.toString()}`,
                `current: ${currPrices.buy.toString()}/${currPrices.sell.toString()}`,
                `pricestf: ${newPrices.buy.toString()}/${newPrices.sell.toString()}`
            ].join('\n▸ ') +
            `\n - Time in pricelist: ${currPrices.time} (${dayjs.unix(currPrices.time).fromNow()})`
        );
    }

    private generatePartialPriceResetMsg(oldPrices: BuyAndSell, currPrices: Entry): string {
        return (
            `${
                this.isDwAlertEnabled
                    ? `[${currPrices.name}](https://autobot.tf/items/${currPrices.sku})`
                    : currPrices.name
            } (${currPrices.sku}):\n▸ ` +
            [
                `old: ${oldPrices.buy.toString()}/${oldPrices.sell.toString()}`,
                `current: ${currPrices.buy.toString()}/${currPrices.sell.toString()}`
            ].join('\n▸ ')
        );
    }

    private handlePriceChange(data: GetItemPriceResponse): void {
        const match = this.getPrice({ priceKey: data.sku });
        const opt = this.bot.options;
        const dw = opt.discordWebhook.priceUpdate;
        const isDwEnabled = dw.enable && dw.url !== '';

        let newPrices: BuyAndSell;

        try {
            newPrices = {
                buy: new Currencies(data.buy),
                sell: new Currencies(data.sell)
            };
        } catch (err) {
            log.error(`Fail to update ${data.sku}`, {
                error: err as Error,
                rawData: data
            });

            if (isDwEnabled && dw.showFailedToUpdate) {
                sendFailedPriceUpdate(
                    data,
                    err as Error,
                    this.isUseCustomPricer,
                    this.options,
                    this.bot.handler.getBotInfo
                );
            }

            return;
        }

        if (data.sku === '5021;6' && this.globalKeyPrices !== undefined) {
            /**New received prices data.*/

            const canUseKeyPricesFromSource = Pricelist.verifyKeyPrices(newPrices);

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

            const keyPrice = this.getKeyPrice.metal;
            const oldBuyValue = oldPrice.buy.toValue(keyPrice);
            const newBuyValue = newPrices.buy.toValue(keyPrice);
            const oldSellValue = oldPrice.sell.toValue(keyPrice);
            const newSellValue = newPrices.sell.toValue(keyPrice);

            const buyChangesValue = Math.round(newBuyValue - oldBuyValue);
            const sellChangesValue = Math.round(newSellValue - oldSellValue);

            if (buyChangesValue === 0 && sellChangesValue === 0) {
                // Ignore
                return;
            }

            let pricesChanged = false;
            const currentStock = this.bot.inventoryManager.getInventory.getAmount({
                priceKey: match.sku,
                includeNonNormalized: false,
                tradableOnly: true
            });

            const ppu = opt.pricelist.partialPriceUpdate;
            const isInStock = currentStock > 0;
            const isNotExceedThreshold = data.time - match.time < ppu.thresholdInSeconds;
            const isNotExcluded = !['5021;6'].concat(ppu.excludeSKU).includes(match.sku);
            const maxIsOne = match.max === 1;

            // https://github.com/TF2Autobot/tf2autobot/issues/506
            // https://github.com/TF2Autobot/tf2autobot/pull/520

            if (ppu.enable && isInStock && isNotExceedThreshold && isNotExcluded && maxIsOne) {
                const keyPrice = this.getKeyPrice.metal;

                const newBuyValue = newPrices.buy.toValue(keyPrice);
                const newSellValue = newPrices.sell.toValue(keyPrice);

                // TODO: Use last bought prices instead of current buying prices
                const currBuyingValue = match.buy.toValue(keyPrice);
                const currSellingValue = match.sell.toValue(keyPrice);

                const isNegativeDiff = newSellValue - currBuyingValue <= 0;
                const isBuyingChanged = currBuyingValue !== newBuyValue;

                if (match.isPartialPriced || isNegativeDiff || isBuyingChanged) {
                    if (newSellValue > currBuyingValue || newSellValue > currSellingValue) {
                        log.debug('ppu - update selling price with the latest price');
                        match.sell = newPrices.sell;
                    } else {
                        log.debug('ppu - update selling price with minimum profit of 1 scrap');
                        match.sell = Currencies.toCurrencies(currBuyingValue + 1, keyPrice);
                    }

                    match.isPartialPriced = true;
                    pricesChanged = true;

                    const msg = this.generatePartialPriceUpdateMsg(oldPrice, match, newPrices);

                    if (opt.sendAlert.enable && opt.sendAlert.partialPrice.onUpdate) {
                        if (this.isDwAlertEnabled) {
                            sendAlert('isPartialPriced', this.bot, msg);
                        } else {
                            this.bot.messageAdmins('Partial price update\n\n' + msg, []);
                        }
                    }
                } else {
                    if (!match.isPartialPriced) {
                        match.buy = newPrices.buy;
                        match.sell = newPrices.sell;
                        match.time = data.time;

                        pricesChanged = true;
                    }
                }
            } else {
                if (
                    !match.isPartialPriced || // partialPrice is false - update as usual
                    (match.isPartialPriced && !isNotExceedThreshold) || // Still partialPrice AND and has exceeded threshold
                    (match.isPartialPriced && !isInStock) // OR, still partialPrice true AND and no longer in stock
                ) {
                    match.buy = newPrices.buy;
                    match.sell = newPrices.sell;
                    match.time = data.time;

                    if (match.isPartialPriced) {
                        log.debug('ppu - reset partial price', {
                            isExceededThreshold: !isNotExceedThreshold,
                            isNotInStock: !isInStock
                        });
                        match.isPartialPriced = false; // reset to default

                        const msg = this.generatePartialPriceResetMsg(oldPrice, match);

                        if (opt.sendAlert.enable && opt.sendAlert.partialPrice.onResetAfterThreshold) {
                            if (this.isDwAlertEnabled) {
                                sendAlert('autoResetPartialPrice', this.bot, msg);
                            } else {
                                this.bot.messageAdmins('Partial price reset\n\n' + msg, []);
                            }
                        }
                    }

                    pricesChanged = true;
                }
            }

            if (pricesChanged) {
                this.priceChanged(match.sku, match);
            }

            if (isDwEnabled) {
                const showOnlyInStock = dw.showOnlyInStock ? currentStock > 0 : true;

                if (showOnlyInStock) {
                    const tz = opt.timezone;
                    const format = opt.customTimeFormat;

                    const time = dayjs()
                        .tz(tz ? tz : 'UTC')
                        .format(format ? format : 'MMMM Do YYYY, HH:mm:ss ZZ');

                    sendWebHookPriceUpdateV1(
                        this.schema,
                        opt,
                        match.sku,
                        time,
                        newPrices,
                        oldPrice,
                        currentStock,
                        match.sku === '5021;6' ? undefined : keyPrice,
                        buyChangesValue,
                        sellChangesValue,
                        this.isUseCustomPricer,
                        this.bot.handler.getBotInfo
                    );
                }
            }
        }
    }

    private priceChanged(priceKey: string | number, entry: Entry): void {
        this.emit('price', priceKey, entry);

        if (++this.priceChangeCounter % this.options.pricelist.rewriteFile.count === 0) {
            // reference: https://github.com/Hhanuska/tf2autobot/commit/54c408936cc923d56d525f01726c042a84e1ec75
            this.emit('pricelist', this.prices);

            this.priceChangeCounter = 0;
        }
    }

    private get getOld(): PricesObject {
        if (this.maxAge <= 0) {
            return this.prices;
        }

        const now = dayjs().unix();
        const prices = Object.assign({}, this.prices); //TODO: better way to copy ?

        for (const sku in prices) {
            if (!Object.prototype.hasOwnProperty.call(prices, sku)) {
                continue;
            }

            if (this.prices[sku].time + this.maxAge > now) {
                delete prices[sku];
            }
        }

        return prices;
    }

    static transformPricesFromPricer(prices: Item[]): { [p: string]: Item } {
        return prices.reduce((obj, i) => {
            obj[i.sku] = i;
            return obj;
        }, {});
    }
}

export interface KeyPrices {
    buy: Currencies;
    sell: Currencies;
    src: string;
    time: number;
}

export interface BuyAndSell {
    buy: Currencies;
    sell: Currencies;
}

export class ParsedPrice {
    sku?: string;

    currency?: string;

    source?: string;

    time?: number;

    buy?: Currencies;

    sell?: Currencies;

    constructor(priceResponse: GetItemPriceResponse) {
        this.sku = priceResponse.sku;
        this.currency = priceResponse.currency;
        this.source = priceResponse.source;
        this.time = priceResponse.time;
        this.buy = new Currencies(priceResponse.buy);
        this.sell = new Currencies(priceResponse.sell);
    }
}

interface ErrorRequest {
    body?: ErrorBody;
    message?: string;
}

interface ErrorBody {
    message: string;
}
