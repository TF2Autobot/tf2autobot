/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { EconItem } from '@tf2autobot/tradeoffer-manager';
import SchemaManager, { Paints, StrangeParts } from 'tf2-schema-2';
import SKU from 'tf2-sku-2';
import url from 'url';
import { MinimumItem } from '../../../types/TeamFortress2';
import { fixItem } from '../../items';

let isCrate = false;
let isPainted = false;

export = function (
    schema: SchemaManager.Schema,
    normalizeFestivizedItems: boolean,
    normalizeStrangeAsSecondQuality: boolean,
    normalizePainted: boolean,
    paints: Paints,
    paintsInOptions: string[],
    normalizeStrangeParts: boolean,
    strangeParts: StrangeParts,
    strangePartsInOptions: string[]
): { sku: string; isPainted: boolean } {
    const self = this as EconItem;

    isCrate = false;
    isPainted = false;

    if (self.appid != 440) {
        if (self.type && self.market_name) {
            return { sku: `${self.type}: ${self.market_name}`, isPainted: false };
        }

        return { sku: 'unknown', isPainted: false };
    }

    let item = Object.assign(
        {
            defindex: getDefindex(self),
            quality: getQuality(self, schema),
            craftable: isCraftable(self),
            killstreak: getKillstreak(self),
            australium: isAustralium(self),
            festive: isFestive(self, normalizeFestivizedItems),
            effect: getEffect(self, schema),
            wear: getWear(self),
            paintkit: getPaintKit(self, schema),
            quality2: getElevatedQuality(self, schema, normalizeStrangeAsSecondQuality),
            crateseries: getCrateSeries(self),
            paint: getPainted(self, normalizePainted, paints, paintsInOptions),
            strangeParts: getStrangeParts(self, normalizeStrangeParts, strangeParts, strangePartsInOptions)
        },
        getOutput(self, schema)
    ) as MinimumItem;

    if (item.target === null) {
        item.target = getTarget(self, schema);
    }

    // Add missing properties, except if crates
    if (!isCrate) {
        item = fixItem(SKU.fromString(SKU.fromObject(item)), schema);
    }

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

    const quality = item.getItemTag('Quality');
    const isExterior = item.getItemTag('Exterior');
    if (quality !== null) {
        if (isExterior !== null) {
            return 15;
        } else {
            return schema.getQualityIdByName(quality);
        }
    }

    return null;
}

/**
 * Determines if the item is craftable
 * @param item - Item object
 */
function isCraftable(item: EconItem): boolean {
    return !item.hasDescription('( Not Usable in Crafting )');
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
 * Determines if the item is australium
 * @param item - Item object
 */
function isAustralium(item: EconItem): boolean {
    if (item.getItemTag('Quality') !== 'Strange') {
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
 * Gets the effect of an item
 * @param item - Item object
 */
function getEffect(item: EconItem, schema: SchemaManager.Schema): number | null {
    if (!Array.isArray(item.descriptions)) {
        return null;
    }

    if (item.descriptions.some(description => description.value === 'Case Global Unusual Effect(s)')) {
        return null;
    }

    const effects = item.descriptions.filter(description => description.value.startsWith('★ Unusual Effect: '));
    if (effects.length !== 1) {
        return null;
    }

    return schema.getEffectIdByName(effects[0].value.substring(18));
}

/**
 * Gets the wear of an item
 * @param item - Item object
 */
function getWear(item: EconItem): number | null {
    const wear = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle Scarred'].indexOf(
        item.getItemTag('Exterior')
    );

    return wear === -1 ? null : wear + 1;
}

/**
 * Get skin from item
 * @param item - Item object
 */
function getPaintKit(item: EconItem, schema: SchemaManager.Schema): number | null {
    if (getWear(item) === null) {
        return null;
    }

    let hasCaseCollection = false;
    let skin: string | null = null;

    const descriptionsCount = item.descriptions.length;

    for (let i = 0; i < descriptionsCount; i++) {
        if (!hasCaseCollection && item.descriptions[i].value.endsWith('Collection')) {
            hasCaseCollection = true;
        } else if (
            hasCaseCollection &&
            (item.descriptions[i].value.startsWith('✔') || item.descriptions[i].value.startsWith('★'))
        ) {
            skin = item.descriptions[i].value.substring(1).replace(' War Paint', '').trim();
            break;
        }
    }

    if (skin === null) {
        return null;
    }

    if (skin.includes('Mk.I')) {
        return schema.getSkinIdByName(skin);
    }

    const schemaItem = schema.getItemByDefindex(getDefindex(item));
    // Remove weapon from skin name
    if (schemaItem !== null) {
        skin = skin.replace(schemaItem.item_type_name, '').trim();
    }

    return schema.getSkinIdByName(skin);
}

/**
 * Gets the elevated quality of an item
 * @param item - Item object
 * @param normalizeStrangeAsSecondQuality - toggle strange unusual normalization
 */
function getElevatedQuality(
    item: EconItem,
    schema: SchemaManager.Schema,
    normalizeStrangeAsSecondQuality: boolean
): number | null {
    const isNotNormalized = !normalizeStrangeAsSecondQuality;
    const quality = getQuality(item, schema);

    const isUnusualHat =
        item.getItemTag('Type') === 'Cosmetic' &&
        quality === 5 &&
        item.type.includes('Strange') &&
        item.type.includes('Points Scored');
    const isOtherItemsNotStrangeQuality = item.type.startsWith('Strange') && quality !== 11;

    if (
        item.hasDescription('Strange Stat Clock Attached') ||
        ((isUnusualHat || isOtherItemsNotStrangeQuality) && isNotNormalized)
    ) {
        return 11;
    } else {
        return null;
    }
}

function getOutput(
    item: EconItem,
    schema: SchemaManager.Schema
): { target: number | null; output: number | null; outputQuality: number | null } {
    let index = -1;

    const descriptionsCount = item.descriptions.length;

    for (let i = 0; i < descriptionsCount; i++) {
        if (
            item.descriptions[i].value ==
            'You will receive all of the following outputs once all of the inputs are fulfilled.'
        ) {
            index = i;
            break;
        }
    }

    if (index === -1) {
        return {
            target: null,
            output: null,
            outputQuality: null
        };
    }

    const output = item.descriptions[index + 1].value;

    let target: number | null = null;
    let outputQuality: number | null = null;
    let outputDefindex: number | null = null;

    const killstreak = getKillstreak(item);
    if (killstreak !== 0) {
        // Killstreak Kit Fabricator

        const name = output
            .replace(['Killstreak', 'Specialized Killstreak', 'Professional Killstreak'][killstreak - 1], '')
            .replace('Kit', '')
            .trim();

        target = schema.getItemByItemName(name).defindex;
        outputQuality = 6;
        outputDefindex = [6527, 6523, 6526][killstreak - 1];
    } else if (output.includes(' Strangifier')) {
        // Strangifier Chemistry Set

        const name = output.replace('Strangifier', '').trim();

        target = schema.getItemByItemName(name).defindex;
        outputQuality = 6;
        outputDefindex = 6522;
    } else if (output.includes(" Collector's")) {
        // Collector's Chemistry Set

        const name = output.replace("Collector's", '').trim();

        outputQuality = 14;
        outputDefindex = schema.getItemByItemName(name).defindex;
    }

    return {
        target: target,
        output: outputDefindex,
        outputQuality: outputQuality
    };
}

function getTarget(item: EconItem, schema: SchemaManager.Schema): number | null {
    const defindex = getDefindex(item);

    if (defindex === null) {
        throw new Error('Could not get defindex of item "' + item.market_hash_name + '"');
    }

    if (item.market_hash_name.includes('Strangifier')) {
        // Strangifiers
        const gameItem = schema.raw.items_game.items[defindex];

        if (gameItem.attributes !== undefined && gameItem.attributes['tool target item'] !== undefined) {
            return parseInt(gameItem.attributes['tool target item'].value, 10);
        } else if (gameItem.static_attrs !== undefined && gameItem.static_attrs['tool target item'] !== undefined) {
            return parseInt(gameItem.static_attrs['tool target item'], 10);
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
    const defindex = getDefindex(item);

    let series: number | null = null;

    const crates: { [type: string]: { [name: string]: number } } = {
        is5022: {
            'Mann Co. Supply Crate Series #1': 1,
            'Mann Co. Supply Crate Series #3': 3,
            'Mann Co. Supply Crate Series #7': 7,
            'Mann Co. Supply Crate Series #12': 12,
            'Mann Co. Supply Crate Series #13': 13,
            'Mann Co. Supply Crate Series #18': 18,
            'Mann Co. Supply Crate Series #19': 19,
            'Mann Co. Supply Crate Series #23': 23,
            'Mann Co. Supply Crate Series #26': 26,
            'Mann Co. Supply Crate Series #31': 31,
            'Mann Co. Supply Crate Series #34': 34,
            'Mann Co. Supply Crate Series #39': 39,
            'Mann Co. Supply Crate Series #43': 43,
            'Mann Co. Supply Crate Series #47': 47,
            'Mann Co. Supply Crate Series #54': 54,
            'Mann Co. Supply Crate Series #57': 57,
            'Mann Co. Supply Crate Series #75': 75
        },
        is5041: {
            'Mann Co. Supply Crate Series #2': 2,
            'Mann Co. Supply Crate Series #4': 4,
            'Mann Co. Supply Crate Series #8': 8,
            'Mann Co. Supply Crate Series #11': 11,
            'Mann Co. Supply Crate Series #14': 14,
            'Mann Co. Supply Crate Series #17': 17,
            'Mann Co. Supply Crate Series #20': 20,
            'Mann Co. Supply Crate Series #24': 24,
            'Mann Co. Supply Crate Series #27': 27,
            'Mann Co. Supply Crate Series #32': 32,
            'Mann Co. Supply Crate Series #37': 37,
            'Mann Co. Supply Crate Series #42': 42,
            'Mann Co. Supply Crate Series #44': 44,
            'Mann Co. Supply Crate Series #49': 49,
            'Mann Co. Supply Crate Series #56': 56,
            'Mann Co. Supply Crate Series #71': 71,
            'Mann Co. Supply Crate Series #76': 76
        },
        is5045: {
            'Mann Co. Supply Crate Series #5': 5,
            'Mann Co. Supply Crate Series #9': 9,
            'Mann Co. Supply Crate Series #10': 10,
            'Mann Co. Supply Crate Series #15': 15,
            'Mann Co. Supply Crate Series #16': 16,
            'Mann Co. Supply Crate Series #21': 21,
            'Mann Co. Supply Crate Series #25': 25,
            'Mann Co. Supply Crate Series #28': 28,
            'Mann Co. Supply Crate Series #29': 29,
            'Mann Co. Supply Crate Series #33': 33,
            'Mann Co. Supply Crate Series #38': 38,
            'Mann Co. Supply Crate Series #41': 41,
            'Mann Co. Supply Crate Series #45': 45,
            'Mann Co. Supply Crate Series #55': 55,
            'Mann Co. Supply Crate Series #59': 59,
            'Mann Co. Supply Crate Series #77': 77
        },
        is5068: {
            'Salvaged Mann Co. Supply Crate Series #30': 30,
            'Salvaged Mann Co. Supply Crate Series #40': 40,
            'Salvaged Mann Co. Supply Crate Series #50': 50
        }
    };

    const itemHashMarketName = item.market_hash_name;

    if (defindex === 5022 && Object.keys(crates.is5022).includes(itemHashMarketName)) {
        series = crates.is5022[itemHashMarketName];
    } else if (defindex === 5041 && Object.keys(crates.is5041).includes(itemHashMarketName)) {
        series = crates.is5041[itemHashMarketName];
    } else if (defindex === 5045 && Object.keys(crates.is5045).includes(itemHashMarketName)) {
        series = crates.is5045[itemHashMarketName];
    } else if (defindex === 5068 && Object.keys(crates.is5068).includes(itemHashMarketName)) {
        series = crates.is5068[itemHashMarketName];
    }

    if (series !== null) {
        isCrate = true;
        return series;
    } else {
        return null;
    }
}

function getPainted(
    item: EconItem,
    normalizePainted: boolean,
    paints: Paints,
    paintsInOptions: string[]
): number | null {
    if (normalizePainted) {
        return null;
    }

    const descriptions = item.descriptions;
    const descriptionCount = descriptions.length;

    for (let i = 0; i < descriptionCount; i++) {
        if (descriptions[i].value.startsWith('Paint Color: ') && descriptions[i].color === '756b5e') {
            const name = descriptions[i].value.replace('Paint Color: ', '').trim();

            if (paintsInOptions.includes(name.toLowerCase())) {
                const paintDecimal = +paints[name].replace('p', '');
                isPainted = true;
                return paintDecimal;
            }
        }
    }

    if (
        !item.type.includes('Tool') &&
        paintsInOptions.includes('legacy paint') &&
        item.icon_url.includes('SLcfMQEs5nqWSMU5OD2NwHzHZdmi')
    ) {
        isPainted = true;
        return 5801378;
    }

    return null;
}

function getStrangeParts(
    item: EconItem,
    normalizeStrangeParts: boolean,
    strangeParts: StrangeParts,
    strangePartsInOptions: string[]
): number[] | null {
    if (normalizeStrangeParts) {
        return null;
    }

    const descriptions = item.descriptions;
    const descriptionCount = descriptions.length;

    const strangePartIds: number[] = [];

    for (let i = 0; i < descriptionCount; i++) {
        const desc = descriptions[i];
        const strangePartName = desc.value
            .replace('(', '')
            .replace(/: \d+\)/g, '')
            .trim();

        if (
            (['Kills', 'Assists'].includes(strangePartName)
                ? item.getItemTag('Type') === 'Cosmetic'
                : Object.keys(strangeParts).includes(strangePartName)) &&
            desc.color === '756b5e'
        ) {
            // Valid Strange Parts
            if (strangePartsInOptions.includes(strangePartName.toLowerCase())) {
                // Strange Parts included in highValue.strangeParts (or that value is set to default [])
                const strangePartId = +strangeParts[strangePartName].replace('sp', '');
                strangePartIds.push(strangePartId);
            }
        }
    }

    if (strangePartIds.length > 0) {
        return strangePartIds;
    }

    return null;
}
