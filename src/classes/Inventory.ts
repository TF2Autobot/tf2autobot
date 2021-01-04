/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Effect, UnknownDictionary } from '../types/common';
import SteamID from 'steamid';
import TradeOfferManager, { EconItem } from 'steam-tradeoffer-manager';
import SchemaManager, { Schema, SchemaItem } from 'tf2-schema-2';
import SKU from 'tf2-sku-2';
import Options from './Options';

import { craftAll, uncraftAll } from '../lib/data';
import Bot from './Bot';

export default class Inventory {
    private readonly steamID: SteamID;

    private readonly manager: TradeOfferManager;

    private readonly schema: SchemaManager.Schema;

    private tradable: UnknownDictionary<string[]> = {};

    private nonTradable: UnknownDictionary<string[]> = {};

    private tradableEcon: EconItem[] = [];

    private options: Options;

    constructor(
        steamID: SteamID | string,
        manager: TradeOfferManager,
        schema: SchemaManager.Schema,
        options: Options,
        public unusualEffects: Array<Effect>
    ) {
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
        options: Options,
        unusualEffects: Array<Effect>
    ): Inventory {
        const inventory = new Inventory(steamID, manager, schema, options, unusualEffects);

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

    getItemsEcon(): EconItem[] {
        return this.tradableEcon;
    }

    getTotalItems(): number {
        let items = 0;
        const amountTradable = this.tradable;
        for (const sku in amountTradable) {
            if (!Object.prototype.hasOwnProperty.call(amountTradable, sku)) {
                continue;
            }
            items += amountTradable[sku].length;
        }
        const amountNonTradable = this.nonTradable;
        for (const sku in amountNonTradable) {
            if (!Object.prototype.hasOwnProperty.call(amountNonTradable, sku)) {
                continue;
            }
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

        this.tradableEcon = tradable;

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

    getAmountOfGenerics(sku: string, tradableOnly?: boolean): number {
        const s = SKU.fromString(sku);
        if (s.quality === 5) {
            // generic getAmount so return total that match the generic sku type
            return (
                this.unusualEffects
                    .map(e => {
                        s.effect = e.id;
                        return this.getAmount(SKU.fromObject(s), tradableOnly);
                    })
                    // add up total found; total is undefined to being with
                    .reduce((total, currentTotal) => (total ? total + currentTotal : currentTotal))
            );
        } else {
            return this.getAmount(sku, tradableOnly);
        }
    }

    getCurrencies(): { [sku: string]: string[] } {
        let pure = ['5000;6', '5001;6', '5002;6', '5021;6'];
        if (this.options.weaponsAsCurrency.enable) {
            pure = pure.concat(craftAll);
            if (this.options.weaponsAsCurrency.withUncraft) {
                pure = pure.concat(uncraftAll);
            }
        }

        const toObject: {
            [sku: string]: string[];
        } = {};

        pure.forEach(sku => {
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

export function getUnusualEffects(schema: Schema): Effect[] {
    return (schema.raw.schema as {
        items: SchemaItem[];
        attribute_controlled_attached_particles: Array<{
            system: string;
            id: number;
            name: string;
        }>;
    }).attribute_controlled_attached_particles.map(v => {
        return { name: v.name, id: v.id };
    });
}

/**
 * Function replaces specific effect string in name with 'Unusual'.
 *
 * If hat is named Sunbeams Team Captain, function will return the name Unusual
 * Team Captain and an effect id of 17. If the hat doesn't match, the name will just be what
 * was passed in. Ie Team Captain just returns Team Captain and the effect will be undefined.
 *
 * @param name - hat name
 * @param effects - Array of all unusual effects
 */
export function genericNameAndMatch(name: string, effects: Effect[]): { name: string; effect: Effect } {
    const effectMatch = effects.find(e => name.startsWith(e.name));
    return { name: effectMatch ? name.replace(effectMatch.name, 'Unusual') : name, effect: effectMatch };
}

/**
 * Function looks up the amount of SKU the bot can trade specifically and
 * generically.
 *
 * If the bot is set to only buy generic of a SKU, the amountCanTradeGeneric
 * will be larger and the match name will be the generic name otherwise the
 * name will be set to the specific SKU.
 * @param sku - string
 * @param bot - bot so we can look up amountCanTrade
 * @param buying - toggle tally only items that we are buying
 */
export function getSkuAmountCanTrade(
    sku: string,
    bot: Bot,
    buying = true
): { amountCanTradeGeneric: number; mostCanTrade: number; amountCanTrade: number; name: string } {
    const amountCanTrade = bot.inventoryManager.amountCanTrade(sku, buying);
    const amountCanTradeGeneric = bot.inventoryManager.amountCanTrade(sku, buying, true);
    const mostCanTrade = amountCanTrade > amountCanTradeGeneric ? amountCanTrade : amountCanTradeGeneric;
    return {
        amountCanTradeGeneric: amountCanTradeGeneric,
        amountCanTrade: amountCanTrade,
        mostCanTrade: mostCanTrade,
        name:
            amountCanTrade > amountCanTradeGeneric
                ? bot.schema.getName(SKU.fromString(sku))
                : genericNameAndMatch(bot.schema.getName(SKU.fromString(sku), false), bot.unusualEffects).name
    };
}
