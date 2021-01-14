/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Effect, Paints, StrangeParts } from '../types/common';
import SteamID from 'steamid';
import TradeOfferManager, { EconItem, ItemAttributes } from 'steam-tradeoffer-manager';
import SchemaManager from 'tf2-schema-2';
import SKU from 'tf2-sku-2';
import Options from './Options';

import Bot from './Bot';
import log from '../lib/logger';

import { noiseMakers, craftAll, uncraftAll } from '../lib/data';
import { check, getFromSchema } from '../lib/tools/export';

export default class Inventory {
    private readonly steamID: SteamID;

    get getSteamID(): SteamID {
        return this.steamID;
    }

    private readonly manager: TradeOfferManager;

    private readonly schema: SchemaManager.Schema;

    private tradable: Dict = {};

    get getItems(): Dict {
        return this.tradable;
    }

    private nonTradable: Dict = {};

    get getTotalItems(): number {
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
        inventory.setItems = items;

        return inventory;
    }

    addItem(sku: string, assetid: string): void {
        const items = this.tradable;
        (items[sku] = items[sku] || []).push({ id: assetid });
    }

    removeItem(assetid: string): void;

    removeItem(item: EconItem): void;

    removeItem(...args: any[]): void {
        const assetid = typeof args[0] === 'string' ? args[0] : args[0].id;

        const items = this.tradable;

        for (const sku in items) {
            if (Object.prototype.hasOwnProperty.call(items, sku)) {
                const assetids = items[sku].map(item => item.id);

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
            this.manager.getUserInventoryContents(this.getSteamID, 440, '2', false, (err, items) => {
                if (err) {
                    return reject(err);
                }

                this.setItems = items;

                resolve();
            });
        });
    }

    private set setItems(items: EconItem[]) {
        // log.debug('parts: ', parts);
        this.tradable = Inventory.createDictionary(
            items.filter(item => item.tradable),
            this.schema,
            this.options,
            getFromSchema.getPaints(this.schema),
            getFromSchema.getStrangeParts(this.schema)
        );
        this.nonTradable = Inventory.createDictionary(
            items.filter(item => !item.tradable),
            this.schema,
            this.options,
            getFromSchema.getPaints(this.schema),
            getFromSchema.getStrangeParts(this.schema)
        );
    }

    findByAssetid(assetid: string): string | null {
        for (const sku in this.tradable) {
            if (!Object.prototype.hasOwnProperty.call(this.tradable, sku)) {
                continue;
            }

            if (!this.tradable[sku].find(item => item.id.includes(assetid))) {
                continue;
            }

            return sku;
        }

        for (const sku in this.nonTradable) {
            if (!Object.prototype.hasOwnProperty.call(this.nonTradable, sku)) {
                continue;
            }

            if (!this.nonTradable[sku].find(item => item.id.includes(assetid))) {
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
            const mapTradable = tradable.map(item => (item ? item.id : undefined));
            const sliceTradable = mapTradable.slice(0);
            // const toReturn = tradable.map(item => (item ? item.id : undefined)).slice(0);
            log.debug('src/Inventory: findBySKU(...) - tradableOnly', {
                mapTradable: mapTradable,
                sliceTradable: sliceTradable
            });
            return sliceTradable;
        }

        const nonTradable = this.nonTradable[sku] || [];

        const mapUntradable = nonTradable.map(item => (item ? item.id : undefined));
        const mapTradable = tradable.map(item => (item ? item.id : undefined));
        const concatBoth = mapUntradable.concat(mapTradable);

        // const toReturn = nonTradable
        //     .map(item => (item ? item.id : undefined))
        //     .concat(tradable.map(item => (item ? item.id : undefined)));

        log.debug('src/Inventory: findBySKU(...) - withNonTradable', {
            mapUntradable: mapUntradable,
            mapTradable: mapTradable,
            concatBoth: concatBoth
        });

        return concatBoth;
    }

    getAmount(sku: string, tradableOnly?: boolean): number {
        const amount = this.findBySKU(sku, tradableOnly).length;
        log.debug('src/Inventory: getAmount', amount);
        return amount;
    }

    getAmountOfGenerics(sku: string, tradableOnly?: boolean): number {
        const s = SKU.fromString(sku);

        if (s.quality === 5) {
            // generic getAmount so return total that match the generic sku type
            const getUnusual = getFromSchema.getUnusualEffects(this.schema);
            const mapUnusual = getUnusual.map(e => {
                s.effect = e.id;
                return this.getAmount(SKU.fromObject(s), tradableOnly);
            });
            const reduceUnusual = mapUnusual.reduce((total, currentTotal) =>
                total ? total + currentTotal : currentTotal
            );
            // const toReturn = getFromSchema
            //     .getUnusualEffects(this.schema)
            //     .map(e => {
            //         s.effect = e.id;
            //         return this.getAmount(SKU.fromObject(s), tradableOnly);
            //     })
            //     // add up total found; total is undefined to being with
            //     .reduce((total, currentTotal) => (total ? total + currentTotal : currentTotal));

            log.debug('src/Inventory: getAmountOfGenerics(...) - Quality === 5', {
                getUnusual: getUnusual,
                mapUnusual: mapUnusual,
                reduceUnusual: reduceUnusual
            });
            return reduceUnusual;
        } else {
            const callGetAmount = this.getAmount(sku, tradableOnly);
            log.debug('src/Inventory: getAmountOfGenerics(...) - Quality !== 5', callGetAmount);
            return callGetAmount;
        }
    }

    getCurrencies(bot: Bot): { [sku: string]: string[] } {
        const toObject: {
            [sku: string]: string[];
        } = {};

        ['5021;6', '5002;6', '5001;6', '5000;6']
            .concat(
                bot.handler.isWeaponsAsCurrency.enable
                    ? bot.handler.isWeaponsAsCurrency.withUncraft
                        ? craftAll.concat(uncraftAll)
                        : craftAll
                    : []
            )
            .forEach(sku => {
                toObject[sku] = this.findBySKU(sku);
            });

        return toObject;
    }

    private static createDictionary(
        items: EconItem[],
        schema: SchemaManager.Schema,
        opt: Options,
        paints: Paints,
        parts: StrangeParts
    ): Dict {
        const dict: Dict = {};

        for (let i = 0; i < items.length; i++) {
            const sku = items[i].getSKU(schema, opt.normalize.festivized, opt.normalize.strangeUnusual);
            const attributes = check.highValue(items[i], opt, paints, parts);

            let isDuel5xUses: boolean | null = null;
            if (sku === '241;6') {
                isDuel5xUses = check.is5xUses(items[i]);
            }

            let isNoiseMaker25xUses: boolean | null = null;
            if (Object.keys(noiseMakers).includes(sku)) {
                isNoiseMaker25xUses = check.is25xUses(items[i]);
            }

            if (Object.keys(attributes).length === 0 && isDuel5xUses === null && isNoiseMaker25xUses === null) {
                (dict[sku] = dict[sku] || []).push({ id: items[i].id });
            } else {
                if (isDuel5xUses !== null) {
                    (dict[sku] = dict[sku] || []).push({ id: items[i].id, isFullUses: isDuel5xUses });
                } else if (isNoiseMaker25xUses !== null) {
                    (dict[sku] = dict[sku] || []).push({ id: items[i].id, isFullUses: isNoiseMaker25xUses });
                } else {
                    (dict[sku] = dict[sku] || []).push({ id: items[i].id, hv: attributes });
                }
            }
        }

        // log.debug('dict: ', dict);
        return dict;
    }

    clearFetch(): void {
        this.tradable = undefined;
        this.nonTradable = undefined;
    }
}

export interface Dict {
    [sku: string]: DictItem[];
}

export interface DictItem {
    id: string;
    hv?: ItemAttributes;
    isFullUses?: boolean;
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
                : genericNameAndMatch(
                      bot.schema.getName(SKU.fromString(sku), false),
                      getFromSchema.getUnusualEffects(bot.schema)
                  ).name
    };
}
