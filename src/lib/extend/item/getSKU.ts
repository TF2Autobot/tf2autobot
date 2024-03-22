/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { EconItem } from '@tf2autobot/tradeoffer-manager';
import SchemaManager, { Item, Paints, Schema } from '@tf2autobot/tf2-schema';
import SKU from '@tf2autobot/tf2-sku';
import url from 'url';
import { fixItem } from '../../items';

interface ParsedDescriptions {
    craftable: boolean;
    effect: number;
    paintkit: number;
    target: number;
    output: number;
    outputQuality: number;
    paint: number;
}

let isCrate = false;
let isPainted = false;
let replaceQualityTo11 = false;
let replaceQualityTo15 = false;

let defindex: number = null;
let quality: number = null;
let killstreak: number = null;
let wear: number = null;
let paintkit: number = null;
let hasStatClock = false;
let parsedDescription: ParsedDescriptions = null;

export = function (
    schema: SchemaManager.Schema,
    normalizeFestivizedItems: boolean,
    normalizeStrangeAsSecondQuality: boolean,
    normalizePainted: boolean,
    normalizeCraftNumber: boolean,
    paintsInOptions: string[]
): { sku: string; isPainted: boolean } {
    const self = this as EconItem;

    isCrate = false;
    isPainted = false;
    replaceQualityTo11 = false;
    replaceQualityTo15 = false;

    if (self.appid != 440) {
        if (self.type && self.market_name) {
            return { sku: `${self.type}: ${self.market_name}`, isPainted: false };
        }

        return { sku: 'unknown', isPainted: false };
    }

    if (!self.market_hash_name) {
        throw new Error(
            `Item ${self.id} does not have the "market_hash_name" key, unable to correctly identify the item`
        );
    }

    defindex = getDefindex(self);
    quality = getQuality(self, schema);
    killstreak = getKillstreak(self);
    wear = getWear(self);
    paintkit = null;
    hasStatClock = false;

    parsedDescription = parseDescriptions(self, schema, schema.paints, normalizePainted, paintsInOptions);

    let item: Item = {
        defindex,
        quality,
        craftable: parsedDescription.craftable,
        killstreak,
        australium: isAustralium(self),
        festive: isFestive(self, normalizeFestivizedItems),
        effect: parsedDescription.effect,
        wear,
        paintkit: parsedDescription.paintkit,
        quality2: getElevatedQuality(self, normalizeStrangeAsSecondQuality),
        crateseries: getCrateSeries(self),
        target: parsedDescription.target,
        output: parsedDescription.output,
        outputQuality: parsedDescription.outputQuality,
        paint: parsedDescription.paint,
        craftnumber: getCraftNumber(self, schema, normalizeCraftNumber)
    };

    if (item.target === null) {
        item.target = getTarget(self, schema);
    }

    if (replaceQualityTo15) {
        item.quality = 15;
    }

    if (replaceQualityTo11) {
        item.quality = 11;
    }

    // Add missing properties, except if crates
    if (!isCrate) {
        item = fixItem(SKU.fromString(SKU.fromObject(item)), schema);
    }

    parsedDescription = null;
    if (item === null) {
        throw new Error('Unknown sku for item "' + self.market_hash_name + '"');
    }

    return { sku: SKU.fromObject(item), isPainted };
};

/**
 * Gets the defindex of an item
 * @param item -Item object
 */
function getDefindex(item: EconItem): number | null {
    if (item.app_data !== undefined) {
        return parseInt(item.app_data.def_index, 10);
    }

    const link = item.getAction('Item Wiki Page...');
    if (link !== null) {
        return parseInt(url.parse(link, true).query.id.toString(), 10);
    }

    // Last option is to get the name of the item and try and get the defindex that way

    return null;
}

/**
 * Gets the quality of an item
 * @param item - Item object
 */
function getQuality(item: EconItem, schema: SchemaManager.Schema): number | null {
    if (item.app_data !== undefined) {
        return parseInt(item.app_data.quality, 10);
    }

    const qualityFromTag = item.getItemTag('Quality');
    if (qualityFromTag !== null) {
        return schema.getQualityIdByName(qualityFromTag);
    }

    return null;
}

/**
 * Gets the killstreak tier of an item
 * @param item - Item object
 */
function getKillstreak(item: EconItem): number {
    const killstreaks = ['Professional ', 'Specialized ', ''];

    const index = killstreaks.findIndex(killstreak => item.market_hash_name.includes(killstreak + 'Killstreak '));

    return index === -1 ? 0 : 3 - index;
}

/**
 * Gets the wear of an item
 * @param item - Item object
 */
function getWear(item: EconItem): number | null {
    const itemWear = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle Scarred'].indexOf(
        item.getItemTag('Exterior')
    );

    return itemWear === -1 ? null : itemWear + 1;
}

function parseDescriptions(
    item: EconItem,
    schema: Schema,
    paints: Paints,
    normalizePainted: boolean,
    paintsInOptions: string[]
): ParsedDescriptions {
    const obj = {
        craftable: true,
        effect: null,
        paintkit: null,
        target: null,
        output: null,
        outputQuality: null,
        paint: null
    };

    if (!Array.isArray(item.descriptions)) {
        return obj;
    }

    let foundUncraftable = false;

    let containsCaseGlobal = false;
    let foundUnusual = false;

    let hasCaseCollection = false;
    let skin: string | null = null;
    let foundSkin = false;

    let outputIndex = -1;

    let foundPaint = false;

    const descCount = item.descriptions.length;

    for (let i = 0; i < descCount; i++) {
        if (!foundUncraftable && item.descriptions[i].value === '( Not Usable in Crafting )') {
            foundUncraftable = true;
            obj.craftable = false;
            continue;
        }

        if (!hasStatClock && item.descriptions[i].value === 'Strange Stat Clock Attached') {
            hasStatClock = true;
            continue;
        }

        if (!containsCaseGlobal && item.descriptions[i].value === 'Case Global Unusual Effect(s)') {
            containsCaseGlobal = true;
            continue;
        }

        if (!foundUnusual && !containsCaseGlobal && item.descriptions[i].value.startsWith('★ Unusual Effect: ')) {
            foundUnusual = true;
            obj.effect = schema.getEffectIdByName(item.descriptions[i].value.substring(18));
            continue;
        }

        if (!foundSkin && wear !== null) {
            if (!hasCaseCollection && item.descriptions[i].value.endsWith('Collection')) {
                hasCaseCollection = true;
                continue;
            } else if (
                hasCaseCollection &&
                (item.descriptions[i].value.startsWith('✔') || item.descriptions[i].value.startsWith('★'))
            ) {
                foundSkin = true;
                skin = item.descriptions[i].value.substring(1).replace(' War Paint', '').trim();
                continue;
            }
        }

        if (
            item.descriptions[i].value ==
            'You will receive all of the following outputs once all of the inputs are fulfilled.'
        ) {
            outputIndex = i;
            continue;
        }

        if (
            !normalizePainted &&
            !foundPaint &&
            item.descriptions[i].value.startsWith('Paint Color: ') &&
            item.descriptions[i].color === '756b5e'
        ) {
            foundPaint = true;
            const name = item.descriptions[i].value.replace('Paint Color: ', '').trim();

            if (paintsInOptions.includes(name.toLowerCase())) {
                isPainted = true;
                obj.paint = paints[name];
            }
            continue;
        }
    }

    if (skin === null) {
        if (hasCaseCollection && item.market_hash_name?.includes('Red Rock Roscoe Pistol')) {
            paintkit = 0;
            obj.paintkit = 0;
        }
    } else if (foundSkin) {
        const schemaItem = schema.getItemByDefindex(defindex);

        if (skin.includes('Mk.I')) {
            paintkit = schema.getSkinIdByName(skin);
        } else if (schemaItem !== null) {
            // Remove weapon from skin name
            paintkit = schema.getSkinIdByName(skin.replace(schemaItem.item_type_name, '').trim());
        } else {
            paintkit = schema.getSkinIdByName(skin);
        }

        obj.paintkit = paintkit;
    }

    if (outputIndex !== -1) {
        const output = item.descriptions[outputIndex + 1].value;

        if (killstreak !== 0) {
            // Killstreak Kit Fabricator

            const name = output
                .replace(['Killstreak', 'Specialized Killstreak', 'Professional Killstreak'][killstreak - 1], '')
                .replace('Kit', '')
                .trim();

            obj.target = schema.getItemByItemName(name).defindex;
            obj.outputQuality = 6;
            obj.output = [6527, 6523, 6526][killstreak - 1];
        } else if (output.includes(' Strangifier')) {
            // Strangifier Chemistry Set

            const name = output.replace('Strangifier', '').trim();

            obj.target = schema.getItemByItemName(name).defindex;
            obj.outputQuality = 6;
            obj.output = 6522;
        } else if (output.includes("Collector's")) {
            // Collector's Chemistry Set

            const name = output.replace("Collector's", '').trim();

            obj.outputQuality = 14;
            obj.output = schema.getItemByItemName(name).defindex;
        }
    }

    if (!normalizePainted && !foundPaint) {
        if (
            !item.type?.includes('Tool') &&
            paintsInOptions.includes('legacy paint') &&
            item.icon_url?.includes('SLcfMQEs5nqWSMU5OD2NwHzHZdmi')
        ) {
            isPainted = true;
            obj.paint = 5801378;
        }
    }

    return obj;
}

/**
 * Determines if the item is australium
 * @param item - Item object
 */
function isAustralium(item: EconItem): boolean {
    if (quality !== 11) {
        return false;
    }

    return item.market_hash_name.includes('Australium ');
}

/**
 * Determines if the item is festivized
 * @param item - Item object
 * @param normalizeFestivizedItems - toggle normalize festivized
 *
 */
function isFestive(item: EconItem, normalizeFestivizedItems: boolean): boolean {
    return !normalizeFestivizedItems && item.market_hash_name.includes('Festivized ');
}

/**
 * Gets the elevated quality of an item
 * @param item - Item object
 * @param normalizeStrangeAsSecondQuality - toggle strange unusual normalization
 */
function getElevatedQuality(item: EconItem, normalizeStrangeAsSecondQuality: boolean): number | null {
    const isNotNormalized = !normalizeStrangeAsSecondQuality;
    const isUnusualHat =
        item.getItemTag('Type') === 'Cosmetic' &&
        quality === 5 &&
        item.type?.includes('Strange') &&
        item.type?.includes('Points Scored');
    const isOtherItemsNotStrangeQuality = item.type?.startsWith('Strange') && quality !== 11;

    if (hasStatClock || ((isUnusualHat || isOtherItemsNotStrangeQuality) && isNotNormalized)) {
        if (typeof paintkit === 'number') {
            const hasRarityGradeTag = item.tags?.some(
                tag => tag.category === 'Rarity' && tag.category_name === 'Grade'
            );
            const hasWarPaintTypeTag = item.getItemTag('Type') === 'War Paint';

            if (hasWarPaintTypeTag || !hasRarityGradeTag) {
                replaceQualityTo11 = true;
                return null;
            } else if (hasRarityGradeTag && quality === 11) {
                replaceQualityTo15 = true;
                return 11;
            }
        }
        return 11;
    } else {
        return null;
    }
}

function getTarget(item: EconItem, schema: SchemaManager.Schema): number | null {
    if (defindex === null) {
        throw new Error('Could not get defindex of item "' + item.market_hash_name + '"');
    }

    if (item.market_hash_name.includes('Strangifier')) {
        // Strangifiers
        const gameItem = schema.raw.items_game.items[defindex];

        if (gameItem.attributes !== undefined && gameItem.attributes['tool target item'] !== undefined) {
            return parseInt(gameItem.attributes['tool target item'].value as string, 10);
        } else if (gameItem.static_attrs !== undefined && gameItem.static_attrs['tool target item'] !== undefined) {
            return parseInt(gameItem.static_attrs['tool target item'] as string, 10);
        }

        // Get schema item using market_hash_name
        const schemaItem = schema.getItemByItemName(item.market_hash_name.replace('Strangifier', '').trim());

        if (schemaItem !== null) {
            return schemaItem.defindex;
        }

        throw new Error('Could not find target for item "' + item.market_hash_name + '"');
    }

    const itemHashNameLength = item.market_hash_name.length;

    if (
        [
            6527, // general
            5726, // Rocket Launcher
            5727, // Scattergun
            5728, // Sniper Rifle
            5729, // Shotgun
            5730, // Ubersaw
            5731, // GRU
            5732, // Spy-cicle
            5733, // Axtinguisher
            5743, // Sticky Launcher
            5744, // Minigun
            5745, // Direct Hit
            5746, // Huntsman
            5747, // Backburner
            5748, // Backscatter
            5749, // Kritzkrieg
            5750, // Ambassador
            5751, // Frontier Justice
            5793, // Flaregun
            5794, // Wrench
            5795, // Revolver
            5796, // Machina
            5797, // Baby Face Blaster
            5798, // Huo Long Heatmaker
            5799, // Loose Cannon
            5800, // Vaccinator
            5801 // Air Strike
        ].includes(defindex)
    ) {
        // Killstreak Kit
        return schema.getItemByItemName(
            item.market_hash_name
                .substring(10, itemHashNameLength - 3)
                .replace('Killstreak', '')
                .trim()
        ).defindex;
    } else if (defindex === 6523) {
        // Specialized Killstreak Kit
        return schema.getItemByItemName(item.market_hash_name.substring(22, itemHashNameLength - 3).trim()).defindex;
    } else if (defindex === 6526) {
        // Professional Killstreak Kit
        return schema.getItemByItemName(item.market_hash_name.substring(23, itemHashNameLength - 3).trim()).defindex;
    } else if (defindex === 9258) {
        // Unusualifier
        return schema.getItemByItemName(item.market_hash_name.substring(7, itemHashNameLength - 12).trim()).defindex;
    }

    return null;
}

/**
 * Gets crate series of Mann Co. Supply Crate
 * @param item - Item object
 */
function getCrateSeries(item: EconItem): number | null {
    if (!item.market_hash_name.includes('Mann Co. Supply Crate Series #')) {
        return null;
    }

    if (![5022, 5041, 5045, 5068].includes(defindex)) {
        return null;
    }

    isCrate = true;
    return parseInt(item.market_hash_name.replace('Salvaged ', '').replace('Mann Co. Supply Crate Series #', ''));
}

function getCraftNumber(item: EconItem, schema: Schema, normalizeCraftNumber: boolean): number {
    if (normalizeCraftNumber) {
        return null;
    }

    if (isCrate) {
        return null;
    }

    const schemaItem = schema.getItemByDefindex(defindex);
    if (schemaItem.item_class === 'supply_crate') {
        return null;
    }

    if (defindex === 121) {
        // ignore Gentle Manne's Service Medal, because craft number (229) !== Medal number (133)
        return null;
    }

    const name = item.name;
    const withoutNumber = name.replace(/#\d+/, '');
    if (name === withoutNumber) {
        // no change
        return null;
    }

    const number = name.substring(withoutNumber.length + 1).trim();

    return parseInt(number);
}
