import pluralize from 'pluralize';
import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';
import levenshtein from 'js-levenshtein';
import { UnknownDictionaryKnownValues } from '../../../types/common';
import { MinimumItem } from '../../../types/TeamFortress2';
import Pricelist, { Entry } from '../../Pricelist';
import { genericNameAndMatch } from '../../Inventory';
import { fixItem, standardizeItem } from '../../../lib/items';
import { testSKU } from '../../../lib/tools/export';
import Options from '../../Options';

export interface GetItemAndAmountResponse {
    info: {
        match: Entry;
        amount: number;
        message?: string;
    } | null;
    errorMessage?: string;
}

export function getItemAndAmount(
    message: string,
    pricelist: Pricelist,
    effects: SchemaManager.Effect[],
    options: Options,
    cartType?: 'buy' | 'sell' | 'buycart' | 'sellcart'
): GetItemAndAmountResponse {
    const errMsg = (message: string): GetItemAndAmountResponse => {
        return {
            info: null,
            errorMessage: message
        };
    };
    let name = removeLinkProtocol(message);
    let amount = 1;
    if (/^[-]?\d+$/.test(name.split(' ')[0])) {
        // Check if the first part of the name is a number, if so, then that is the amount the user wants to trade
        amount = parseInt(name.split(' ')[0]);
        name = name.replace(amount.toString(), '').trim();
    }

    if (1 > amount) {
        amount = 1;
    }

    if (['!price', '!sellcart', '!buycart', '!sell', '!buy', '!pc', '!s', '!b'].includes(name)) {
        return errMsg(
            '⚠️ You forgot to add a name. Here\'s an example: "' +
                (name.includes('!price')
                    ? '!price'
                    : name.includes('!sellcart')
                    ? '!sellcart'
                    : name.includes('!buycart')
                    ? '!buycart'
                    : name.includes('!sell')
                    ? '!sell'
                    : name.includes('!buy')
                    ? '!buy'
                    : name.includes('!pc')
                    ? '!pc'
                    : name.includes('!s')
                    ? '!s'
                    : '!b') +
                ' Team Captain"'
        );
    }

    let match = testSKU(name) ? pricelist.getPrice(name, true) : pricelist.searchByName(name, true);
    if (match !== null && match instanceof Entry && typeof cartType !== 'undefined') {
        const opt = options.commands;

        if (opt[cartType].enable === false && opt[cartType].disableForSKU.includes(match.sku)) {
            const custom = opt[cartType].customReply.disabledForSKU;
            return errMsg(
                custom
                    ? custom.replace(/%itemName%/g, match.name)
                    : `❌ ${cartType} command is disabled for ${match.name}.`
            );
        }
    }

    if (match === null) {
        // Search the item by Levenshtein distance to find a close match (if one exists)
        let lowestDistance = 999;
        let lowestUnusualDistance = 999;
        let closestMatch: Entry = null;
        let closestUnusualMatch: Entry = null;
        // Alternative match search for generic 'Unusual Hat Name' vs 'Sunbeams Hat Name'
        const genericEffect = genericNameAndMatch(name, effects);
        const prices = pricelist.getPrices;
        for (const sku in prices) {
            if (!Object.prototype.hasOwnProperty.call(prices, sku)) {
                continue;
            }

            const pricedItem = prices[sku];
            if (pricedItem.enabled) {
                const itemDistance = levenshtein(pricedItem.name, name);
                if (itemDistance < lowestDistance) {
                    lowestDistance = itemDistance;
                    closestMatch = pricedItem;
                }
                // genericNameAndMatch detected that the hat did start with an unusual effect
                // so we will check to see if a generic SKU is found
                if (genericEffect.effect) {
                    const itemDistance = levenshtein(pricedItem.name, genericEffect.name);
                    if (itemDistance < lowestUnusualDistance) {
                        lowestUnusualDistance = itemDistance;
                        closestUnusualMatch = pricedItem;
                    }
                }
            }
        }

        if (closestMatch === null) {
            return errMsg(
                `❌ I could not find any item names in my pricelist that contain "${name}". I may not be trading the item you are looking for.` +
                    '\n\nAlternatively, please try to:\n• ' +
                    [
                        'Remove "Unusual", just put effect and name. Example: "Kill-a-Watt Vive La France".',
                        'Remove plural (~s/~es/etc), example: "!buy 2 Mann Co. Supply Crate Key".',
                        'Check for a dash (-) i.e. "All-Father" or "Mini-Engy".',
                        `Check for a single quote (') i.e. "Orion's Belt" or "Chargin' Targe".`,
                        'Check for a dot (.) i.e. "Lucky No. 42" or "B.A.S.E. Jumper".',
                        'Check for an exclamation mark (!) i.e. "Bonk! Atomic Punch".',
                        `If you're trading for uncraftable items, type it i.e. "Non-Craftable Crit-a-Cola".`,
                        `If you're trading painted items, then includes paint name, such as "Anger (Paint: Australium Gold)".`,
                        `If you're entering the sku, make sure it's correct`,
                        `Last but not least, make sure to include pipe character " | " if you're trading Skins/War Paint i.e. Strange Cool Totally Boned | Pistol (Minimal Wear)`
                    ].join('\n• ')
            );
        }

        let matchName = closestMatch.name;

        // this case is true only if someone entered 'Sunbeams Team Captain'
        // and only 'Unusual Team Captain' was in the price list. If the
        // specific hat is in the list the scores will be equal and we'll
        // use the actual result
        if (lowestUnusualDistance < lowestDistance) {
            lowestDistance = lowestUnusualDistance;
            closestMatch = closestUnusualMatch;
            matchName = closestUnusualMatch.name;
            // don't mutate any Entry objects from getPrices as they are live objects in the pricelist
            closestMatch = closestMatch.clone();
            // make the generic match's name equal to the specific effect that trigger the generic hit.
            // if the hat named Sunbeams Team Captain, then the Entry result will be named Unusual Team Captain
            closestMatch.name = closestUnusualMatch.name.replace('Unusual', genericEffect.name);
            // the sku is generic '378;5' vs '378;5;u17' we we take the effect id that genericNameAndMatch
            // returned and use that so that the pricelist sku now hits on the correct shopping cart item
            closestMatch.sku = `${closestUnusualMatch.sku};u${genericEffect.effect.id}`;
        }

        // If we found an item that is different in 3-characters or less
        if (lowestDistance <= 3) {
            return {
                info: {
                    amount,
                    match: closestMatch,
                    message: `❓ I could not find any item names in my pricelist with an exact match for "${name}". Using closest item name match "${matchName}" instead.`
                }
            };
        } else {
            return errMsg(
                `❌ I could not find any item names in my pricelist that contain "${name}". I may not be trading the item you are looking for.` +
                    '\n\nAlternatively, please try to:\n• ' +
                    [
                        'Remove "Unusual", just put effect and name. Example: "Kill-a-Watt Vive La France".',
                        'Remove plural (~s/~es/etc), example: "!buy 2 Mann Co. Supply Crate Key".',
                        'Check for a dash (-) i.e. "All-Father" or "Mini-Engy".',
                        `Check for a single quote (') i.e. "Orion's Belt" or "Chargin' Targe".`,
                        'Check for a dot (.) i.e. "Lucky No. 42" or "B.A.S.E. Jumper".',
                        'Check for an exclamation mark (!) i.e. "Bonk! Atomic Punch".',
                        `If you're trading for uncraftable items, type it i.e. "Non-Craftable Crit-a-Cola".`,
                        `If you're trading painted items, then includes paint name, such as "Anger (Paint: Australium Gold)".`,
                        `If you're entering the sku, make sure it's correct`,
                        `Last but not least, make sure to include pipe character " | " if you're trading Skins/War Paint i.e. Strange Cool Totally Boned | Pistol (Minimal Wear)`
                    ].join('\n• ')
            );
        }
    } else if (Array.isArray(match)) {
        const matchCount = match.length;

        if (matchCount > 20) {
            match = match.splice(0, 20);
        }

        let reply = `I've found ${matchCount} items. Try with one of the items shown below:\n${match.join(',\n')}`;
        if (matchCount > match.length) {
            const other = matchCount - match.length;
            reply += `,\nand ${other} other ${pluralize('item', other)}.`;
        }

        return errMsg(reply);
    }

    return {
        info: {
            amount,
            match
        }
    };
}

export interface GetItemFromParamsResponse {
    item: MinimumItem | null;
    errorMessage?: string;
}

export function getItemFromParams(
    params: UnknownDictionaryKnownValues,
    schema: SchemaManager.Schema
): GetItemFromParamsResponse {
    const errMsg = (message: string): GetItemFromParamsResponse => {
        return {
            item: null,
            errorMessage: message
        };
    };
    const item = SKU.fromString('');
    delete item.craftnumber;

    let foundSomething = false;
    if (params.item !== undefined) {
        foundSomething = true;

        const sku = schema.getSkuFromName(params.item);

        if (sku.includes('null') || sku.includes('undefined')) {
            return errMsg(
                `Invalid item name. The sku generate was ${sku}. Please report this to us on our Discord server, or create an issue on Github.`
            );
        }

        return { item: SKU.fromString(sku) };
    } else if (params.name !== undefined) {
        foundSomething = true;
        // Look for all items that have the same name

        const match: SchemaManager.SchemaItem[] = [];

        const items = schema.raw.schema.items;
        const itemsCount = items.length;

        for (let i = 0; i < itemsCount; i++) {
            const item = items[i];

            if (item.item_name === 'Name Tag' && item.defindex === 2093) {
                // skip and let it find Name Tag with defindex 5020
                continue;
            }

            if (item.item_name === params.name) {
                match.push(item);
            }
        }

        const matchCount = match.length;

        if (matchCount === 0) {
            return errMsg(`❌ Could not find an item in the schema with the name "${params.name as string}".`);
        } else if (matchCount !== 1) {
            const parsed = match.splice(0, 20).map(schemaItem => `${schemaItem.defindex} (${schemaItem.name})`);
            const parsedCount = parsed.length;

            let reply = `I've found ${matchCount} items with a matching name. Please use one of the defindexes below as "defindex":\n${parsed.join(
                ',\n'
            )}`;

            if (matchCount > parsedCount) {
                const other = matchCount - parsedCount;
                reply += `,\nand ${other} other ${pluralize('item', other)}.`;
            }

            return errMsg(reply);
        }

        item.defindex = match[0].defindex;
        item.quality = match[0].item_quality;
    }

    for (const key in params) {
        if (!Object.prototype.hasOwnProperty.call(params, key)) {
            continue;
        }

        if (item[key] !== undefined) {
            foundSomething = true;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            item[key] = params[key];
            break;
        }
    }

    if (!foundSomething) {
        return errMsg(
            '⚠️ Missing item properties. Please refer to: https://github.com/TF2Autobot/tf2autobot/wiki/What-is-the-pricelist'
        );
    }

    if (params.defindex !== undefined) {
        const schemaItem = schema.getItemByDefindex(params.defindex as number);
        if (schemaItem === null) {
            return errMsg(`❌ Could not find an item in the schema with the defindex "${params.defindex as number}".`);
        }

        item.defindex = schemaItem.defindex;

        if (item.quality === 0) {
            item.quality = schemaItem.item_quality;
        }
    }

    standardizeItem(item);

    if (typeof params.quality === 'number') {
        // user gave quality in number
        if (params.quality < 0 || params.quality > 15) {
            return errMsg(`Unknown quality "${params.quality}", it must in between 0 - 15.`);
        }

        item.quality = params.quality;
    } else if (params.quality !== undefined) {
        const quality = schema.getQualityIdByName(params.quality as string);
        if (quality === null) {
            return errMsg(`❌ Could not find a quality in the schema with the name "${params.quality as string}".`);
        }
        item.quality = quality;
    }

    if (params.craftable !== undefined) {
        if (typeof params.craftable !== 'boolean') {
            return errMsg(`Craftable must be "true" or "false".`);
        }
        item.craftable = params.craftable;
    }

    if (typeof params.paint === 'number') {
        const paint = schema.getPaintNameByDecimal(params.paint);
        if (paint === null) {
            return errMsg(`❌ Could not find a paint in the schema with the decimal "${params.paint}".`);
        }
        item.paint = params.paint;
    } else if (params.paint !== undefined) {
        const paint = schema.getPaintDecimalByName(params.paint as string);
        if (paint === null) {
            return errMsg(`❌ Could not find a paint in the schema with the name "${params.paint as string}".`);
        }
        item.paint = paint;
    }

    if (params.festive !== undefined) {
        if (typeof params.festive !== 'boolean') {
            return errMsg(`"festive" (for Festivized item) must be "true" or "false".`);
        }
        item.festive = params.festive;
    }

    if (params.australium !== undefined) {
        if (typeof params.australium !== 'boolean') {
            return errMsg(`Australium must be "true" or "false".`);
        }
        item.australium = params.australium;
    }

    if (typeof params.killstreak === 'number') {
        // user gave killstreak in number
        if (params.killstreak < 1 || params.killstreak > 3) {
            return errMsg(
                `Unknown killstreak "${params.killstreak}", it must either be 1 (Killstreak), 2 (Specialized Killstreak) or 3 (Professional Killstreak).`
            );
        }

        item.killstreak = params.killstreak;
    } else if (params.killstreak !== undefined) {
        const killstreaks = ['Killstreak', 'Specialized Killstreak', 'Professional Killstreak'];

        const ksCaseSensitive = killstreaks.indexOf(params.killstreak as string);
        const ksCaseInsensitive = killstreaks
            .map(killstreak => killstreak.toLowerCase())
            .indexOf(params.killstreak as string);

        if (ksCaseSensitive === -1 && ksCaseInsensitive === -1) {
            return errMsg(
                `Unknown killstreak "${
                    params.killstreak as string
                }", it must either be "Killstreak", "Specialized Killstreak", "Professional Killstreak".`
            );
        }

        item.killstreak = ksCaseSensitive !== -1 ? ksCaseSensitive + 1 : ksCaseInsensitive + 1;
    }

    if (typeof params.effect === 'number') {
        const effect = schema.getEffectById(params.effect);
        if (effect === null) {
            return errMsg(`❌ Could not find an unusual effect in the schema with the id "${params.effect}".`);
        }
        item.effect = schema.getEffectIdByName(effect);
    } else if (params.effect !== undefined) {
        const effect = schema.getEffectIdByName(params.effect as string);
        if (effect === null) {
            return errMsg(
                `❌ Could not find an unusual effect in the schema with the name "${params.effect as string}".`
            );
        }
        item.effect = effect;
    }

    if (typeof params.paintkit === 'number') {
        const paintkit = schema.getSkinById(params.paintkit);
        if (paintkit === null) {
            return errMsg(`❌ Could not find a skin in the schema with the id "${item.paintkit}".`);
        }
        item.paintkit = schema.getSkinIdByName(paintkit);
    } else if (params.paintkit !== undefined) {
        const paintkit = schema.getSkinIdByName(params.paintkit as string);
        if (paintkit === null) {
            return errMsg(`❌ Could not find a skin in the schema with the name "${item.paintkit}".`);
        }
        item.paintkit = paintkit;
    }

    if (params.quality2 !== undefined) {
        if (typeof params.quality2 !== 'boolean') {
            return errMsg(`❌ "quality2" must only be type boolean (true or false).`);
        }

        item.quality2 = params.quality2 ? 11 : null;
    }

    if (typeof params.wear === 'number') {
        // user gave wear in number
        if (params.wear < 1 || params.wear > 5) {
            return errMsg(
                `Unknown wear "${params.wear}", it must either be 1 (Factory New), 2 (Minimal Wear), 3 (Field-Tested), 4 (Well-Worn), or 5 (Battle Scarred).`
            );
        }

        item.wear = params.wear;
    } else if (params.wear !== undefined) {
        const wears = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle Scarred'];

        const wearCaseSensitive = wears.indexOf(params.wear as string);
        const wearCaseInsensitive = wears.map(wear => wear.toLowerCase()).indexOf(params.wear as string);

        if (wearCaseSensitive === -1 && wearCaseInsensitive === -1) {
            return errMsg(
                `Unknown wear "${
                    params.wear as string
                }", it must either be "Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", or "Battle Scarred".`
            );
        }

        item.wear = wearCaseSensitive !== -1 ? wearCaseSensitive + 1 : wearCaseInsensitive + 1;
    }

    if (typeof params.target === 'number') {
        const schemaItem = schema.getItemByDefindex(params.target);
        if (schemaItem === null) {
            return errMsg(`❌ Could not find an item in the schema with the target defindex "${params.target}".`);
        }

        item.target = schemaItem.defindex;
    } else if (params.target !== undefined) {
        const schemaItem = schema.getItemByItemName(params.target as string);
        if (schemaItem === null) {
            return errMsg(`❌ Could not find an item in the schema with the target name "${params.target as string}".`);
        }

        item.target = schemaItem.defindex;
    }

    if (typeof params.output === 'number') {
        // User gave defindex
        const schemaItem = schema.getItemByDefindex(params.output);
        if (schemaItem === null) {
            return errMsg(`❌ Could not find an item in the schema with a defindex of "${params.defindex as number}".`);
        }

        if (item.outputQuality === null) {
            item.quality = schemaItem.item_quality;
        }
    } else if (item.output !== null) {
        // Look for all items that have the same name
        const match: SchemaManager.SchemaItem[] = [];

        const items = schema.raw.schema.items;
        const itemsCount = schema.raw.schema.items.length;

        for (let i = 0; i < itemsCount; i++) {
            if (items[i].item_name === params.name) {
                match.push(items[i]);
            }
        }

        const matchCount = match.length;

        if (matchCount === 0) {
            return errMsg(`❌ Could not find an item in the schema with the name "${params.name as string}".`);
        } else if (matchCount !== 1) {
            const parsed = match.splice(0, 20).map(schemaItem => `${schemaItem.defindex} (${schemaItem.name})`);
            const parsedCount = parsed.length;

            let reply = `I've found ${matchCount} items with a matching name. Please use one of the defindexes below as "output":\n${parsed.join(
                ',\n'
            )}`;

            if (matchCount > parsedCount) {
                const other = matchCount - parsedCount;
                reply += `,\nand ${other} other ${pluralize('item', other)}.`;
            }

            return errMsg(reply);
        }

        item.output = match[0].defindex;
        if (item.outputQuality === null) {
            item.quality = match[0].item_quality;
        }
    }

    if (params.outputQuality !== undefined) {
        const quality = schema.getQualityIdByName(params.outputQuality as string);
        if (quality === null) {
            return errMsg(
                `❌ Could not find a quality in the schema with the name "${params.outputQuality as string}".`
            );
        }
        item.outputQuality = quality;
    }

    if (params.crateseries !== undefined) {
        if (typeof params.crateseries !== 'number') {
            return errMsg(`❌ crateseries must only be type number!.`);
        }

        if ([1, 3, 7, 12, 13, 18, 19, 23, 26, 31, 34, 39, 43, 47, 54, 57, 75].includes(params.crateseries)) {
            item.defindex = 5022;
        } else if ([2, 4, 8, 11, 14, 17, 20, 24, 27, 32, 37, 42, 44, 49, 56, 71, 76].includes(params.crateseries)) {
            item.defindex = 5041;
        } else if ([5, 9, 10, 15, 16, 21, 25, 28, 29, 33, 38, 41, 45, 55, 59, 77].includes(params.crateseries)) {
            item.defindex = 5045;
        } else if ([30, 40, 50].includes(params.crateseries)) {
            item.defindex = 5068;
        }

        item.crateseries = params.crateseries;
    }

    for (const key in params) {
        if (!Object.prototype.hasOwnProperty.call(params, key)) {
            continue;
        }

        if (item[key] !== undefined) {
            delete params[key];
        }
    }

    delete params.name;
    return { item: fixItem(item, schema) };
}

export function fixSKU(sku: string): string {
    if (sku.includes(';15') && sku.includes(';strange')) {
        // Only fix for Strange War Paint/Skins and Strange Unusual War Paint/Skins (weird variant)
        const item = SKU.fromString(sku);
        item.quality = 11;
        item.quality2 = null;
        return SKU.fromObject(item);
    }

    return sku;
}

export function removeLinkProtocol(message: string): string {
    return message.replace(/(\w+:|^)\/\//g, '');
}
