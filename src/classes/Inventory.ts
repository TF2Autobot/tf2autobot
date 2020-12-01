/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { UnknownDictionary } from '../types/common';
import SteamID from 'steamid';
import TradeOfferManager, { EconItem } from 'steam-tradeoffer-manager';
import SchemaManager from 'tf2-schema-2';
import Options from './Options';

import { craftAll, uncraftAll } from '../lib/data';

export default class Inventory {
    private readonly steamID: SteamID;

    private readonly manager: TradeOfferManager;

    private readonly schema: SchemaManager.Schema;

    private tradable: UnknownDictionary<string[]> = {};

    private nonTradable: UnknownDictionary<string[]> = {};

    private options: Options;

    constructor(steamID: SteamID | string, manager: TradeOfferManager, schema: SchemaManager.Schema, options: Options) {
        this.steamID = new SteamID(steamID.toString());
        this.manager = manager;
        this.schema = schema;
        this.options = options;
    }

    static fromItems(
        steamID: SteamID | string,
        items: EconItem[],
        manager: TradeOfferManager,
        schema: SchemaManager.Schema,
        options: Options
    ): Inventory {
        const inventory = new Inventory(steamID, manager, schema, options);

        // Funny how typescript allows calling a private function from a static function
        inventory.setItems(items);

        return inventory;
    }

    getSteamID(): SteamID {
        return this.steamID;
    }

    getItems(): UnknownDictionary<string[]> {
        return this.tradable;
    }

    getTotalItems(): number {
        let items = 0;
        const amountTradable = this.tradable;
        for (const sku in amountTradable) {
            items += amountTradable[sku].length;
        }
        const amountNonTradable = this.nonTradable;
        for (const sku in amountNonTradable) {
            items += amountNonTradable[sku].length;
        }
        return items;
    }

    addItem(sku: string, assetid: string): void {
        const items = this.tradable;
        (items[sku] = items[sku] || []).push(assetid);
    }

    removeItem(assetid: string): void;

    removeItem(item: EconItem): void;

    removeItem(...args: any[]): void {
        const assetid = typeof args[0] === 'string' ? args[0] : args[0].id;

        const items = this.tradable;

        for (const sku in items) {
            if (Object.prototype.hasOwnProperty.call(items, sku)) {
                const assetids = items[sku];

                const index = assetids.indexOf(assetid);

                if (index !== -1) {
                    assetids.splice(index, 1);
                    if (assetids.length === 0) {
                        delete items[sku];
                    }
                    break;
                }
            }
        }
    }

    fetch(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.manager.getUserInventoryContents(this.getSteamID(), 440, '2', false, (err, items) => {
                if (err) {
                    return reject(err);
                }

                this.setItems(items);

                resolve();
            });
        });
    }

    fetchWithReturn(): Promise<EconItem[]> {
        return new Promise((resolve, reject) => {
            this.manager.getUserInventoryContents(this.getSteamID(), 440, '2', false, (err, items) => {
                if (err) {
                    return reject(err);
                }

                this.setItems(items);

                resolve(items);
            });
        });
    }

    private setItems(items: EconItem[]): void {
        const tradable: EconItem[] = [];
        const nonTradable: EconItem[] = [];

        items.forEach(item => {
            if (item.tradable) {
                tradable.push(item);
            } else {
                nonTradable.push(item);
            }
        });

        this.tradable = Inventory.createDictionary(
            tradable,
            this.schema,
            this.options.normalize.festivized,
            this.options.normalize.strangeUnusual
        );
        this.nonTradable = Inventory.createDictionary(
            nonTradable,
            this.schema,
            this.options.normalize.festivized,
            this.options.normalize.strangeUnusual
        );
    }

    findByAssetid(assetid: string): string | null {
        for (const sku in this.tradable) {
            if (!Object.prototype.hasOwnProperty.call(this.tradable, sku)) {
                continue;
            }

            if (!this.tradable[sku].includes(assetid)) {
                continue;
            }

            return sku;
        }

        for (const sku in this.nonTradable) {
            if (!Object.prototype.hasOwnProperty.call(this.nonTradable, sku)) {
                continue;
            }

            if (!this.nonTradable[sku].includes(assetid)) {
                continue;
            }

            return sku;
        }

        return null;
    }

    findBySKU(sku: string, tradableOnly = true): string[] {
        const tradable = this.tradable[sku] || [];

        if (tradableOnly) {
            // Copies the array
            return tradable.slice(0);
        }

        const nonTradable = this.nonTradable[sku] || [];

        return nonTradable.concat(tradable);
    }

    getAmount(sku: string, tradableOnly?: boolean): number {
        return this.findBySKU(sku, tradableOnly).length;
    }

    getCurrencies(): { [key: string]: string[] } {
        const pure = ['5021;6', '5002;6', '5001;6', '5000;6'];
        const weapons = craftAll.concat(uncraftAll);
        const combine = pure.concat(weapons);

        const toObject: {
            [key: string]: string[];
        } = {};

        combine.forEach(sku => {
            toObject[sku] = this.findBySKU(sku);
        });

        return toObject;
    }

    private static createDictionary(
        items: EconItem[],
        schema: SchemaManager.Schema,
        normalizeFestivizedItems: boolean,
        normalizeStrangeUnusual: boolean
    ): UnknownDictionary<string[]> {
        const dict: UnknownDictionary<string[]> = {};

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const sku = item.getSKU(schema, normalizeFestivizedItems, normalizeStrangeUnusual);
            (dict[sku] = dict[sku] || []).push(item.id);
        }

        return dict;
    }
}
