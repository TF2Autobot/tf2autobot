import { Currency } from '../types/TeamFortress2';
import { UnknownDictionary } from '../types/common';

import { EventEmitter } from 'events';
import moment from 'moment-timezone';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku';
import SchemaManager from 'tf2-schema';

import { XMLHttpRequest } from 'xmlhttprequest-ts';

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

        const australiumImageURL = {
            // Australium Ambassador
            '61;11;australium':
                'IUwYcXxrxqzlHh9rZCv2ADN8Mmsgy4N4MgGBvxVQuY7G2ZW8zJlfDUKJYCqxp8lnuW34wvJM3DIHgr-8CcAu9qsKYZG08QCvM/',
            // Australium Medi Gun
            '211;11;australium':
                'cUwoUWRLlrTZ8j8fqCc2ACfIHnpQ35pFWgGVtkFEqMuawNTQ-IwaaVfgICfRs9Vm9UXdmvpcwV4TipO4CZ0yx42dGigAL/',
            // Australium SMG
            '203;11;australium':
                'IUxQcWiTltzRHt8TnH_WJRrhXmYpmvchRimI4xlMtbOfmNGdhdlTGV_VdDqBjrV-9CH43uZMzV4f457UBxvSrc7I/',
            // Australium Stickybomb Launcher
            '207;11;australium':
                'cUxQFVBjpoTpMhcrZAfOZBuMInsgK4p9Z3QlnkBN8Ma2xNGBldwbGBfQHCqNj9Vy-UXJm6sVmVYS0oLlWeFm9soqSYbd_N4tEAYCODYMwr6jb/',
            // Australium Black Box
            '228;11;australium':
                'IUwUdXBjpujdbt8_pAfazBOESnN97tJUAiGc6wFl4ZbvjaDU0JFbGUvUJCPc-8QvqDXc36pI6V4_go-oCexKv6tWDpsnI5Q/',
            // Australium Blutsauger
            '36;11;australium':
                'IUwsUWBjqvy1Nt8_pAfazBOESnN97vZQFgGVtyQUrbeW2ZjM_IFHGA_JYC_BuoQ7qDyJlusVnUdO1orpQfRKv6tW-OVvZVQ/',
            // Australium Flame Thrower
            '208;11;australium':
                'IUwEdXBbnrDBRh9_jH82LB-wEpNY095dQl2AzwlAsY7GzY242JlbHUKRdD6JtrV_pCndhvcJgDI7jpe8Afgrq54LYc-5723D3DXU/',
            // Australium Force-A-Nature
            '45;11;australium':
                'IUwMeSBnuvQdBidr0CP6zD-8Mn-U55IJS3Hg4xFB_NbSzYjJkcwCRUaFaCaJopVzuWHBi65dnAILu8u9Te1--t9DCLfByZ9DzsRlF/',
            // Australium Frontier Justice
            '141;11;australium':
                'IUwEDUhX2sT1Rgt31GfuPDd8HlNYx2pxUyzFu31V6YrLiZWJiIVeUV6IKDvdi9wy-UXA3upY3VtG19eMDeAzusYLOMrcycIYb30r634E/',
            // Australium Grenade Launcher
            '206;11;australium':
                'cUwADWBXjvD1Pid3oDvqJGt8HlNYx2pxUyzFu31YtYObgYGFjJ12VBKYLDac78FC5WyYxvMU1DYC0pLpTcAq8sIOVNrEycIYbGbNsLhA/',
            // Australium Minigun
            '202;11;australium':
                'cUwoYUxLlrTZ8j8fqCc2ACfIHnpRl48RRjjczw1N_YuLmYjVhJwaSUvILCa1r8Fm5X3cwupFnAoXvob8DZ0yx4_oW5y4u/',
            // Australium Tomislav
            '424;11;australium':
                'IUxMeUBLxtDlVt8_pAfazBOESnN974chX2mQ9wQMrY-G3YGdhcwWXB_UPWKZt9wruUX9ivpFlAIWwou1VehKv6tXcWH-bzQ/',
            // Australium Rocket Launcher
            '205;11;australium':
                'cUxUeXhDnrDRCncblBfeeN-cPl94K6ZFH3jMlwgcsNeaxZDYwcQWbA_BbDvZprArqXSJluJ5hUYPur-xRKlnq4daUO65sbo8Wbc6SlA/',
            // Australium Scattergun
            '200;11;australium':
                'cUxQSXA_2vSpEncbZCv2ADN8Mmsgy4N4E2Gc-lQcsMuDlY2A2IQbHB6UGWK0-9V29WnY365E3BYTkpb1UewzqqsKYZAHhHABV/',
            // Australium Sniper Rifle
            '201;11;australium':
                'cUxQfVAvnqipKjsTjMvWDBOQ_l9sn4pUbiGI6wFUoYLftMjMzcFeQBPFYD6dsoF-_Wn9nvJ82B4fkpOgAelrq5ZyGbefBeMmAbQ/',
            // Australium Sniper Rifle 2 - weird
            '15072;11;australium':
                'cUxQfVAvnqipKjsTjMvWDBOQ_l9sn4pUbiGI6wFUoYLftMjMzcFeQBPFYD6dsoF-_Wn9nvJ82B4fkpOgAelrq5ZyGbefBeMmAbQ/',
            // Australium Axtinguisher
            '38;11;australium':
                'IUwYJSRLsvy1Km8DjH82cEfIPpN066ZRq1Td5lgQ1MrDhZmAyKgfHU_cLX6NtrAy8W3Bnup4zVdPur-heew3otoTCZ7R_ZcYMQZeUvB7w1w/',
            // Australium Eyelander
            '132;11;australium':
                'IUwQdXALvtypGt8_pAfazBOESnN974ZFWjW8ylVJ_Y-C3aWEyKwGbUvUHWaRpo1--CHE2vsRmUITh9bhWehKv6tX00uGxPA/',
            // Australium Knife
            '194;11;australium':
                'cUwwfVB3nhz9MhMzZAfOeD-VOyIJs55YAjDA8wAd6NrHnMm4xcFKSU_ZcCPQ49QzoXXQ0vcUxAYDu8vUWJ1teRmVbCw/',
            // Australium Wrench
            '197;11;australium':
                'cUxADWBXhsAdEh8TiMv6NGucF1Ypg4ZNWgG9qyAB5YOfjaTRmJweaB_cPCaNjpAq9CnVgvZI1UNTn8bhIOVK4UnPgIXo/'
        };

        const paintCan = {
            // A Color Similar to Slate
            '5052;6':
                'TbL_ROFcpnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvOvr1MdQ/',
            // A Deep Commitment to Purple
            '5031;6':
                'TeLfQYFp1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvVs13Vys/',
            // A Distinctive Lack of Hue
            '5040;6':
                'TYffEcEJhnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvXrHVMg0/',
            // A Mann's Mint
            '5076;6':
                'SLKqRMQ59nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvU8z3W20/',
            // After Eight
            '5077;6':
                'TbLfJME5hnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvWdo-dtk/',
            // Aged Moustache Grey
            '5038;6':
                'TeLPdNFslnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvFkHADQU/',
            // An Air of Debonair
            '5063;6':
                'TffPQfFZxnqWSMU5OD2NsHx3oIzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V0p8gFQg/',
            // An Extraordinary Abundance of Tinge
            '5039;6':
                'SMf6UeRJpnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv64ewDK8/',
            // Australium Gold
            '5037;6':
                'SMfqIdEs5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvsjysS5w/',
            // Balaclavas Are Forever
            '5062;6':
                'TaK_FOE59nqWSMU5OD2NgHxnAPzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V3lcfHzA/',
            // Color No. 216-190-216
            '5030;6':
                'SNcaJNRZRnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvFOcRWGY/',
            // Cream Spirit
            '5065;6':
                'SKevZLE8hnqWSMU5OD2IsHzHMPnShGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VQmu5hdU/',
            // Dark Salmon Injustice
            '5056;6':
                'SMcPkeFs1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvy3dkty0/',
            // Drably Olive
            '5053;6':
                'TRefgYEZxnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvMuQVCSQ/',
            // Indubitably Green
            '5027;6':
                'Tee_lNFZ5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvm153-6I/',
            // Mann Co. Orange
            '5032;6':
                'SKL_cbEppnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvTFGBHn4/',
            // Muskelmannbraun
            '5033;6':
                'SIfPcdFZlnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvcmoesjg/',
            // Noble Hatter's Violet
            '5029;6':
                'TcePMQFc1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvgXmHfsU/',
            // Operator's Overalls
            '5060;6':
                'TdcfMQEpRnqWSMU5OD2NoHwHEIkChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V-hQN5Nc/',
            // Peculiarly Drab Tincture
            '5034;6':
                'SKfKFOGJ1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvG7gZwMo/',
            // Pink as Hell
            '5051;6':
                'SPL_YRQ5hnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv9O7ytVg/',
            // Radigan Conagher Brown
            '5035;6':
                'TfcPRMEs1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv4OlkQfA/',
            // Team Spirit
            '5046;6':
                'SLcfMQEs5nqWSMU5OD2NwHzHZdmihGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VWwsKTpY/',
            // The Bitter Taste of Defeat and Lime
            '5054;6':
                'Tae6NMEp5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvvmRKa6k/',
            // The Color of a Gentlemann's Business Pants
            '5055;6':
                'SPeaUeGc9nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvoDEBbxU/',
            // The Value of Teamwork
            '5064;6':
                'TRefMYE5xnqWSMU5OD2NsKwicEzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8Vs4Ux0YY/',
            // Waterlogged Lab Coat
            '5061;6':
                'SIcflJGc9nqWSMU5OD2NEMzSVdmyhGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VT2CQ46M/',
            // Ye Olde Rustic Colour
            '5036;6':
                'TeKvZLFJtnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvmeRW1Z8/',
            // Zepheniah's Greed
            '5028;6':
                'Tde_ROEs5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvPiWjbeE/'
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
                itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICf${paintCan[newSku]}512fx512f`;
            } else if (item.australium === true) {
                const australiumSKU = parts[0] + ';11;australium';
                itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgE${australiumImageURL[australiumSKU]}512fx512f`;
            } else if (item.defindex === 266) {
                itemImageUrlPrint =
                    'https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEIUw8UXB_2uTNGmvfqDOCLDa5Zwo03sMhXgDQ_xQciY7vmYTRmKwDGUKENWfRt8FnvDSEwu5RlBYfnuasILma6aCYE/512fx512f';
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
                effectURL = `https://marketplace.tf/images/particles/${effectsId}_94x94.png`;
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

        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_PRICE_UPDATE_URL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(priceUpdate);
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
