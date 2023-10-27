import SteamID from 'steamid';
import { EconItem, ItemAttributes, PartialSKUWithMention } from '@tf2autobot/tradeoffer-manager';
import { Effect, Paints, StrangeParts } from '@tf2autobot/tf2-schema';
import SKU from '@tf2autobot/tf2-sku';
import { HighValue } from './Options';
import Bot from './Bot';
import { noiseMakers, spellsData, killstreakersData, sheensData } from '../lib/data';
import Pricelist from './Pricelist';
import log from '../lib/logger';

export default class Inventory {
    private readonly steamID: SteamID;

    private get getSteamID(): SteamID {
        return this.steamID;
    }

    private tradable: Dict = {};

    get getItems(): Dict {
        return this.tradable;
    }

    private nonTradable: Dict = {};

    get getTotalItems(): number {
        let items = 0;
        for (const sku in this.tradable) {
            if (!Object.prototype.hasOwnProperty.call(this.tradable, sku)) {
                continue;
            }

            items += this.tradable[sku].length;
        }
        for (const sku in this.nonTradable) {
            if (!Object.prototype.hasOwnProperty.call(this.nonTradable, sku)) {
                continue;
            }

            items += this.nonTradable[sku].length;
        }
        return items;
    }

    constructor(
        steamID: SteamID | string,
        private readonly bot: Bot,
        private readonly which: 'our' | 'their' | 'admin',
        private readonly boundInventoryGetter: (
            steamID: SteamID | string,
            appid: number,
            contextid: string,
            tradeableOnly: boolean,
            callback: (err?: Error, inventory?: EconItem[], currencies?: EconItem[]) => void
        ) => void
    ) {
        this.steamID = new SteamID(steamID.toString());
    }

    static fromItems(
        steamID: SteamID | string,
        items: EconItem[],
        bot: Bot,
        which: 'our' | 'their' | 'admin',
        boundInventoryGetter: (
            steamID: SteamID | string,
            appid: number,
            contextid: string,
            tradeableOnly: boolean,
            callback: (err?: Error, inventory?: EconItem[], currencies?: EconItem[]) => void
        ) => void
    ): Inventory {
        const inventory = new Inventory(steamID, bot, which, boundInventoryGetter);
        inventory.setItems = items;
        return inventory;
    }

    addItem(sku: string, assetid: string): void {
        (this.tradable[sku] = this.tradable[sku] || []).push({ id: assetid });
    }

    addNonTradableItem(sku: string, assetid: string): void {
        (this.nonTradable[sku] = this.nonTradable[sku] || []).push({ id: assetid });
    }

    removeItem(assetid: string): void;

    removeItem(item: EconItem): void;

    removeItem(...args: [string] | [EconItem]): void {
        const assetid = typeof args[0] === 'string' ? args[0] : args[0].id;

        const itemsTradable = this.tradable;
        const itemsNonTradable = this.nonTradable;

        // instead of only check for tradable or non-tradable, we check both.

        for (const sku in itemsTradable) {
            if (Object.prototype.hasOwnProperty.call(itemsTradable, sku)) {
                const assetids = itemsTradable[sku].map(item => item.id);
                const index = assetids.indexOf(assetid);

                if (index !== -1) {
                    this.tradable[sku].splice(index, 1);
                    if (this.tradable[sku].length === 0) {
                        delete this.tradable[sku];
                    }

                    break;
                }
            }
        }

        for (const sku in itemsNonTradable) {
            if (Object.prototype.hasOwnProperty.call(itemsNonTradable, sku)) {
                const assetids = itemsNonTradable[sku].map(item => item.id);
                const index = assetids.indexOf(assetid);

                if (index !== -1) {
                    this.nonTradable[sku].splice(index, 1);
                    if (this.nonTradable[sku].length === 0) {
                        delete this.nonTradable[sku];
                    }

                    break;
                }
            }
        }
    }

    fetch(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.boundInventoryGetter(this.getSteamID, 440, '2', false, (err, items) => {
                if (err) {
                    return reject(err);
                }

                this.setItems = items;
                resolve();
            });
        });
    }

    private set setItems(items: EconItem[]) {
        this.tradable = Inventory.createDictionary(
            items.filter(item => item.tradable),
            this.bot,
            this.bot.strangeParts,
            this.which
        );
        this.nonTradable = Inventory.createDictionary(
            items.filter(item => !item.tradable),
            this.bot,
            this.bot.strangeParts,
            this.which
        );
    }

    findByAssetid(assetid: string): string | null {
        for (const sku in this.tradable) {
            if (!Object.prototype.hasOwnProperty.call(this.tradable, sku)) {
                continue;
            }

            if (!this.tradable[sku].find(item => item.id === assetid)) {
                continue;
            }

            return sku;
        }

        for (const sku in this.nonTradable) {
            if (!Object.prototype.hasOwnProperty.call(this.nonTradable, sku)) {
                continue;
            }

            if (!this.nonTradable[sku].find(item => item.id === assetid)) {
                continue;
            }

            return sku;
        }

        return null;
    }

    findBySKU(sku: string, tradableOnly = true): string[] {
        const tradable = (this.tradable[sku] || []).map(item => item?.id);
        if (tradableOnly) {
            // Copies the array
            return tradable.slice(0);
        }

        const nonTradable = (this.nonTradable[sku] || []).map(item => item?.id);

        return nonTradable.concat(tradable).slice(0);
    }

    findByPartialSku(partialSku: string, elevatedStrange = false): string[] {
        const matchingSkus: string[] = [];

        if (elevatedStrange) {
            partialSku = partialSku.replace(';strange', '');

            for (const sku in this.tradable) {
                if (sku.startsWith(partialSku) && sku.includes(';strange')) {
                    matchingSkus.push(...this.tradable[sku].map(item => item?.id));
                }
            }
        } else {
            for (const sku in this.tradable) {
                if (sku.startsWith(partialSku)) {
                    matchingSkus.push(...this.tradable[sku].map(item => item?.id));
                }
            }
        }
        return matchingSkus.slice(0);
    }

    getAmount({
        priceKey,
        includeNonNormalized,
        tradableOnly
    }: {
        priceKey: string;
        includeNonNormalized: boolean;
        tradableOnly?: boolean;
    }): number {
        if (Pricelist.isAssetId(priceKey)) {
            return null !== this.findByAssetid(priceKey) ? 1 : 0;
        }
        const sku = priceKey;
        const assetidInPricelist = this.bot.pricelist.assetidInPricelist;
        const amountToDeduct =
            assetidInPricelist && assetidInPricelist[sku] ? Object.keys(assetidInPricelist[sku]).length : 0;
        if (includeNonNormalized && !['5021;6', '5002;6', '5001;6', '5000;6'].includes(sku)) {
            // This is true only on src/lib/tools/summarizeOffer.ts @ L180, and src/classes/InventoryManager.ts @ L69
            let accAmount = this.findBySKU(sku, tradableOnly).length;

            const optNormalize = this.bot.options.normalize;
            const normFestivized = optNormalize.festivized;
            const normPainted = optNormalize.painted;
            const normStrange = optNormalize.strangeAsSecondQuality;

            const schemaItem = this.bot.schema.getItemBySKU(sku);
            if (schemaItem) {
                const canBeFestivized =
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    this.bot.schema.raw.items_game.items[`${schemaItem.defindex}`].tags?.can_be_festivized == 1;

                // Festivized
                if (
                    !sku.includes(';festive') &&
                    canBeFestivized &&
                    normFestivized.amountIncludeNonFestivized &&
                    !normFestivized.our
                ) {
                    const item = SKU.fromString(sku);
                    item.festive = true;
                    accAmount += this.findBySKU(SKU.fromObject(item), tradableOnly).length;
                }

                // Painted
                if (
                    !/;[p][0-9]+/.test(sku) &&
                    schemaItem.capabilities?.paintable &&
                    normPainted.amountIncludeNonPainted &&
                    !normPainted.our
                ) {
                    const paintPartialSKU = Object.values(this.bot.schema.paints);
                    for (const pSKU of paintPartialSKU) {
                        accAmount += this.findBySKU(`${sku};p${pSKU}`, tradableOnly).length;
                    }
                }

                // Strange as second quality
                if (
                    !sku.includes(';strange') &&
                    schemaItem.capabilities?.can_strangify &&
                    normPainted.amountIncludeNonPainted &&
                    !normStrange.our
                ) {
                    const item = SKU.fromString(sku);
                    item.quality2 = 11;
                    accAmount += this.findBySKU(SKU.fromObject(item), tradableOnly).length;
                }
            }

            return accAmount === 1 && amountToDeduct === 1 ? 1 : accAmount - amountToDeduct;
        }

        // else just return amount
        const amount = this.findBySKU(sku, tradableOnly).length;
        return amount === 1 && amountToDeduct === 1 ? 1 : amount - amountToDeduct;
    }

    getAmountOfGenerics({
        genericSkuString,
        tradableOnly
    }: {
        genericSkuString: string;
        tradableOnly?: boolean;
    }): number {
        const genericSku = SKU.fromString(genericSkuString);

        if (genericSku.quality === 5) {
            const skus = tradableOnly
                ? Object.keys(this.tradable)
                : Object.keys(this.tradable).concat(Object.keys(this.nonTradable));
            return skus
                .filter(sku => sku.startsWith(genericSkuString))
                .reduce((sum, sku) => {
                    const entryAmount = this.getAmount({
                        priceKey: sku,
                        includeNonNormalized: false,
                        tradableOnly
                    });
                    return sum + entryAmount;
                }, 0);
        } else {
            return this.getAmount({
                priceKey: genericSkuString,
                includeNonNormalized: false,
                tradableOnly
            });
        }
    }

    getCurrencies(weapons: string[], withPure: boolean): { [sku: string]: string[] } {
        const toObject: {
            [sku: string]: string[];
        } = {};

        if (withPure) {
            weapons = ['5021;6', '5002;6', '5001;6', '5000;6'].concat(weapons);
        }

        weapons.forEach(sku => {
            toObject[sku] = this.currenciesFindBySKU(sku);
        });

        return toObject;
    }

    currenciesFindBySKU(sku: string): string[] {
        const tradable = (this.tradable[sku] || [])
            .filter(item => {
                if (item) {
                    if (item.hv !== undefined) {
                        // if craft weapons has high value attributes, ignore
                        return false;
                    }
                    return true;
                }
                return false;
            })
            .map(item => item?.id);

        return tradable.slice(0);
    }

    private static paintedOptions: string[];

    private static spellsOptions: string[];

    private static strangePartsOptions: string[];

    private static killstreakersOptions: string[];

    private static sheensOptions: string[];

    private static paintedExceptionSkus: string[];

    private static spellsExceptionSkus: string[];

    private static strangePartsExceptionSkus: string[];

    private static killstreakersExceptionSkus: string[];

    private static sheensExceptionSkus: string[];

    private static paintedExceptionNotEmpty: boolean;

    private static spellsExceptionNotEmpty: boolean;

    private static strangePartsExceptionNotEmpty: boolean;

    private static killstreakersExceptionNotEmpty: boolean;

    private static sheensExceptionNotEmpty: boolean;

    static setOptions(paints: Paints, parts: StrangeParts, fromOpt: HighValue): void {
        this.paintedOptions =
            fromOpt.painted.names.length < 1 || fromOpt.painted.names[0] === ''
                ? Object.keys(paints).map(paint => paint.toLowerCase())
                : fromOpt.painted.names.map(paint => paint.toLowerCase());

        this.spellsOptions =
            fromOpt.spells.names.length < 1 || fromOpt.spells.names[0] === ''
                ? Object.keys(spellsData).map(spell => spell.toLowerCase())
                : fromOpt.spells.names.map(spell => spell.toLowerCase());

        this.strangePartsOptions =
            fromOpt.strangeParts.names.length < 1 || fromOpt.strangeParts.names[0] === ''
                ? Object.keys(parts).map(part => part.toLowerCase())
                : fromOpt.strangeParts.names.map(part => part.toLowerCase());

        this.killstreakersOptions =
            fromOpt.killstreakers.names.length < 1 || fromOpt.killstreakers.names[0] === ''
                ? Object.keys(killstreakersData).map(part => part.toLowerCase())
                : fromOpt.killstreakers.names.map(part => part.toLowerCase());

        this.sheensOptions =
            fromOpt.sheens.names.length < 1 || fromOpt.sheens.names[0] === ''
                ? Object.keys(sheensData).map(sheen => sheen.toLowerCase())
                : fromOpt.sheens.names.map(sheen => sheen.toLowerCase());

        this.paintedExceptionSkus = fromOpt.painted.exceptionSkus;
        this.paintedExceptionNotEmpty = this.paintedExceptionSkus.length > 0;

        this.spellsExceptionSkus = fromOpt.spells.exceptionSkus;
        this.spellsExceptionNotEmpty = this.spellsExceptionSkus.length > 0;

        this.strangePartsExceptionSkus = fromOpt.strangeParts.exceptionSkus;
        this.strangePartsExceptionNotEmpty = this.strangePartsExceptionSkus.length > 0;

        this.killstreakersExceptionSkus = fromOpt.killstreakers.exceptionSkus;
        this.killstreakersExceptionNotEmpty = this.killstreakersExceptionSkus.length > 0;

        this.sheensExceptionSkus = fromOpt.sheens.exceptionSkus;
        this.sheensExceptionNotEmpty = this.sheensExceptionSkus.length > 0;
    }

    private static createDictionary(
        items: EconItem[],
        bot: Bot,
        strangeParts: StrangeParts,
        which: 'our' | 'their' | 'admin'
    ): Dict {
        const dict: Dict = {};

        const itemsCount = items.length;
        const isAdmin = which === 'admin';

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const isNormalizeFestivized = isAdmin ? false : bot.options.normalize.festivized[which];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const isNormalizeStrangeAsSecondQuality = isAdmin ? false : bot.options.normalize.strangeAsSecondQuality[which];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const isNormalizePainted = isAdmin ? false : bot.options.normalize.painted[which];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const isNormalizeCraftNumber = isAdmin ? false : bot.options.normalize.craftNumber[which];

        for (let i = 0; i < itemsCount; i++) {
            const getSku = items[i].getSKU(
                bot.schema,
                isNormalizeFestivized,
                isNormalizeStrangeAsSecondQuality,
                isNormalizePainted,
                isNormalizeCraftNumber,
                this.paintedOptions
            );

            let sku = getSku.sku;

            if (
                getSku.isPainted &&
                this.paintedExceptionNotEmpty &&
                this.paintedExceptionSkus.some(exSku => sku.includes(exSku)) // do like this so ";5" is possible
            ) {
                sku = removePaintedPartialSku(sku);
            }

            const attributes = this.highValue(sku, items[i], bot.schema.paints, strangeParts);
            const attributesCount = Object.keys(attributes).length;

            const isUses =
                sku === '241;6' ? isFull(items[i], 'duel') : noiseMakers.has(sku) ? isFull(items[i], 'noise') : null;

            if (attributesCount === 0 && isUses === null) {
                (dict[sku] = dict[sku] || []).push({ id: items[i].id });
            } else {
                if (isUses !== null) {
                    (dict[sku] = dict[sku] || []).push({
                        id: items[i].id,
                        isFullUses: isUses
                    });
                } else {
                    (dict[sku] = dict[sku] || []).push({ id: items[i].id, hv: attributes });
                }
            }
        }

        return dict;
    }

    findUntradableJunk(): string[] {
        const result: string[] = [];
        for (const sku in this.nonTradable) {
            const item = SKU.fromString(sku);
            if (
                [
                    536, // Noise Maker - TF Birthday
                    537, // Party Hat
                    655, // Spirit of Giving
                    5826 // Soul Gargoyle
                ].includes(item.defindex)
            ) {
                for (const itemWithAssetid of this.nonTradable[sku]) {
                    result.push(itemWithAssetid.id);
                }
            }
        }

        return result;
    }

    private static highValue(
        sku: string,
        econ: EconItem,
        paints: Paints,
        parts: StrangeParts
    ): ItemAttributes | Record<string, never> {
        const attributes: ItemAttributes = {};

        const s: PartialSKUWithMention = {};
        const sp: PartialSKUWithMention = {};
        const ke: PartialSKUWithMention = {};
        const ks: PartialSKUWithMention = {};
        const p: PartialSKUWithMention = {};

        for (const content of econ.descriptions) {
            /**
             * For Strange Parts, example: "(Kills During Halloween: 0)"
             * remove "(" and ": <numbers>)" to get only the part name.
             */
            const partsString = content.value
                .replace('(', '')
                .replace(/: \d+\)/g, '')
                .trim();

            if (
                content.value.startsWith('Halloween:') &&
                content.value.endsWith('(spell only active during event)') &&
                content.color === '7ea9d1'
            ) {
                // Example: "Halloween: Voices from Below (spell only active during event)"
                // where "Voices from Below" is the spell name.
                // Color of this description must be rgb(126, 169, 209) or 7ea9d1
                // https://www.spycolor.com/7ea9d1#
                // Get the spell name
                // Starts from "Halloween:" (10), then the whole spell description minus 32 characters
                // from "(spell only active during event)", and trim any whitespaces.
                const spellName = content.value.substring(10, content.value.length - 32).trim();

                // push for storage, example: s-1000
                s[spellsData[spellName.replace('From', 'from')]] =
                    (this.spellsExceptionNotEmpty // check if exception not empty
                        ? !this.spellsExceptionSkus.some(exSku => sku.includes(exSku)) // if this true, make it false
                        : true) && this.spellsOptions.includes(spellName.toLowerCase());
            } else if (
                (['Kills', 'Assists'].includes(partsString)
                    ? econ.getItemTag('Type') === 'Cosmetic'
                    : Object.keys(parts).includes(partsString)) &&
                content.color === '756b5e'
            ) {
                // If the part name is "Kills" or "Assists", then confirm the item is a cosmetic, not a weapon.
                // Else, will scan through Strange Parts Object keys in this.strangeParts()
                // Color of this description must be rgb(117, 107, 94) or 756b5e
                // https://www.spycolor.com/756b5e#

                // if the particular strange part is one of the parts that the user wants,
                // then mention and put "(🌟)"
                // else no mention and just the name.
                sp[parts[partsString]] =
                    (this.strangePartsExceptionNotEmpty
                        ? !this.strangePartsExceptionSkus.some(exSku => sku.includes(exSku))
                        : true) && this.strangePartsOptions.includes(partsString.toLowerCase());
                //
            } else if (content.value.startsWith('Killstreaker: ') && content.color === '7ea9d1') {
                const extractedName = content.value.replace('Killstreaker: ', '').trim();
                ke[killstreakersData[extractedName]] =
                    (this.killstreakersExceptionNotEmpty
                        ? !this.killstreakersExceptionSkus.some(exSku => sku.includes(exSku))
                        : true) && this.killstreakersOptions.includes(extractedName.toLowerCase());
                //
            } else if (content.value.startsWith('Sheen: ') && content.color === '7ea9d1') {
                const extractedName = content.value.replace('Sheen: ', '').trim();
                ks[sheensData[extractedName]] =
                    (this.sheensExceptionNotEmpty
                        ? !this.sheensExceptionSkus.some(exSku => sku.includes(exSku))
                        : true) && this.sheensOptions.includes(extractedName.toLowerCase());
                //
            } else if (content.value.startsWith('Paint Color: ') && content.color === '756b5e') {
                const extractedName = content.value.replace('Paint Color: ', '').trim();
                p[`p${String(paints[extractedName])}`] =
                    (this.paintedExceptionNotEmpty
                        ? !this.paintedExceptionSkus.some(exSku => sku.includes(exSku))
                        : true) && this.paintedOptions.includes(extractedName.toLowerCase());
            }
        }

        if (
            !econ.type.includes('Tool') && // Not a Paint Can
            econ.icon_url.includes('SLcfMQEs5nqWSMU5OD2NwHzHZdmi') &&
            Object.keys(p).length === 0
        ) {
            p['p5801378'] = true; // Legacy Paint - no exception?
        }

        [s, sp, ke, ks, p].forEach((attachment, i) => {
            if (Object.keys(attachment).length > 0) {
                attributes[['s', 'sp', 'ke', 'ks', 'p'][i]] = attachment;
            }
        });

        return attributes;
    }

    clearFetch(): void {
        this.tradable = undefined;
        this.nonTradable = undefined;
    }
}

function removePaintedPartialSku(sku: string): string {
    return sku.replace(/;[p][0-9]+/, '');
}

export interface Dict {
    [sku: string]: DictItem[];
}

export interface DictItem {
    id: string;
    hv?: ItemAttributes;
    isFullUses?: boolean;
}

function isFull(item: EconItem, type: 'duel' | 'noise'): boolean {
    for (const content of item.descriptions) {
        if (
            content.value.includes(`This is a limited use item. Uses: ${type === 'noise' ? '25' : '5'}`) &&
            content.color === '00a000'
        ) {
            return true;
        }
    }

    return false;
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
 * @param tradeIntent - trade intention is either 'buying' or 'selling'
 */
export function getSkuAmountCanTrade(
    sku: string,
    bot: Bot,
    tradeIntent: 'buying' | 'selling' = 'buying'
): { amountCanTradeGeneric: number; mostCanTrade: number; amountCanTrade: number; name: string } {
    const amountCanTrade = bot.inventoryManager.amountCanTrade({
        priceKey: sku,
        tradeIntent,
        getGenericAmount: false
    });
    const amountCanTradeGeneric = bot.inventoryManager.amountCanTrade({
        priceKey: sku,
        tradeIntent,
        getGenericAmount: true
    });

    return {
        amountCanTradeGeneric: amountCanTradeGeneric,
        amountCanTrade: amountCanTrade,
        mostCanTrade: amountCanTrade > amountCanTradeGeneric ? amountCanTrade : amountCanTradeGeneric,
        name:
            amountCanTrade > amountCanTradeGeneric
                ? bot.schema.getName(SKU.fromString(sku))
                : genericNameAndMatch(bot.schema.getName(SKU.fromString(sku), false), bot.effects).name
    };
}
