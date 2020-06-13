import { EconItem } from 'steam-tradeoffer-manager';
import SchemaManager from 'tf2-schema';

import SKU from 'tf2-sku';
import url from 'url';

import { fixItem } from '../../items';

export = function(schema: SchemaManager.Schema): string {
    // @ts-ignore
    const self = this as EconItem;

    if (self.appid != 440) {
        return 'unknown';
    }

    let item = Object.assign(
        {
            defindex: getDefindex(self),
            quality: getQuality(self, schema),
            craftable: isCraftable(self),
            killstreak: getKillstreak(self),
            australium: isAustralium(self),
            festive: isFestive(self),
            effect: getEffect(self, schema),
            wear: getWear(self),
            paintkit: getPaintKit(self, schema),
            quality2: getElevatedQuality(self)
        },
        getOutput(self, schema)
    );

    if (item.target === null) {
        item.target = getTarget(self, schema);
    }

    // Adds missing properties
    item = fixItem(SKU.fromString(SKU.fromObject(item)), schema);

    if (item === null) {
        throw new Error('Unknown sku for item "' + self.market_hash_name + '"');
    }

    return SKU.fromObject(item);
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

    const quality = item.getTag('Quality');
    if (quality !== null) {
        return schema.getQualityIdByName(quality);
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
    if (item.getTag('Quality') !== 'Strange') {
        return false;
    }

    return item.market_hash_name.includes('Australium ');
}

/**
 * Determines if thje item is festivized
 * @param item - Item object
 */
function isFestive(item: EconItem): boolean {
    return item.market_hash_name.includes('Festivized ');
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
        item.getTag('Exterior')
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

    for (let i = 0; i < item.descriptions.length; i++) {
        const description = item.descriptions[i].value;

        if (!hasCaseCollection && description.endsWith('Collection')) {
            hasCaseCollection = true;
        } else if (hasCaseCollection && (description.startsWith('✔') || description.startsWith('★'))) {
            skin = description
                .substring(1)
                .replace(' War Paint', '')
                .trim();
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
    skin = skin.replace(schemaItem.item_type_name, '').trim();

    return schema.getSkinIdByName(skin);
}

/**
 * Gets the elevated quality of an item
 * @param item - Item object
 */
function getElevatedQuality(item: EconItem): number | null {
    if (item.hasDescription('Strange Stat Clock Attached')) {
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

    for (let i = 0; i < item.descriptions.length; i++) {
        const description = item.descriptions[i].value;

        if (description == 'You will receive all of the following outputs once all of the inputs are fulfilled.') {
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

    if (defindex === 6527) {
        // Killstreak Kit
        return schema.getItemByItemName(
            item.market_hash_name
                .substring(10, item.market_hash_name.length - 3)
                .replace('Killstreak', '')
                .trim()
        ).defindex;
    } else if (defindex === 6523) {
        // Specialized Killstreak Kit
        return schema.getItemByItemName(item.market_hash_name.substring(22, item.market_hash_name.length - 3).trim())
            .defindex;
    } else if (defindex === 6526) {
        // Professional Killstreak Kit
        return schema.getItemByItemName(item.market_hash_name.substring(23, item.market_hash_name.length - 3).trim())
            .defindex;
    }

    return null;
}
