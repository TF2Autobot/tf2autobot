import SteamID from 'steamid';
import pluralize from 'pluralize';
import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';
import levenshtein from 'js-levenshtein';
import { UnknownDictionaryKnownValues } from '../../../types/common';
import { Item } from '../../../types/TeamFortress2';
import Bot from '../../Bot';
import { Entry } from '../../Pricelist';
import { genericNameAndMatch } from '../../Inventory';
import { fixItem } from '../../../lib/items';

export function getItemAndAmount(
    steamID: SteamID,
    message: string,
    bot: Bot,
    from?: 'buy' | 'sell' | 'buycart' | 'sellcart'
): { match: Entry; amount: number } | null {
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
        bot.sendMessage(
            steamID,
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
        return null;
    }

    let match = bot.pricelist.searchByName(name, true);
    if (match !== null && match instanceof Entry && typeof from !== 'undefined') {
        const opt = bot.options.commands;

        if (opt[from].enable === false && opt[from].disableForSKU.includes(match.sku)) {
            const custom = opt[from].customReply.disabledForSKU;
            bot.sendMessage(
                steamID,
                custom ? custom.replace(/%itemName%/g, match.name) : `❌ ${from} command is disabled for ${match.name}.`
            );
            return null;
        }
    }

    if (match === null) {
        // Search the item by Levenshtein distance to find a close match (if one exists)
        let lowestDistance = 999;
        let lowestUnusualDistance = 999;
        let closestMatch: Entry = null;
        let closestUnusualMatch: Entry = null;
        // Alternative match search for generic 'Unusual Hat Name' vs 'Sunbeams Hat Name'
        const genericEffect = genericNameAndMatch(name, bot.effects);
        for (const pricedItem of bot.pricelist.getPrices) {
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
            bot.sendMessage(
                steamID,
                `❌ I could not find any item names in my pricelist that contain "${name}". I may not be trading the item you are looking for.` +
                    '\n\nAlternatively, please try to:' +
                    '\n• Remove "The".' +
                    '\n• Remove "Unusual", just put effect and name. Example: "Kill-a-Watt Vive La France".' +
                    '\n• Remove plural (~s/~es/etc), example: "!buy 2 Mann Co. Supply Crate Key".' +
                    '\n• Some Taunts need "The" such as "Taunt: The High Five!", while others do not.' +
                    '\n• Check for a dash (-) like "All-Father" or "Mini-Engy".' +
                    `\n• Check for a single quote (') like "Orion's Belt" or "Chargin' Targe".` +
                    '\n• Check for a dot (.) like "Lucky No. 42" or "B.A.S.E. Jumper".' +
                    '\n• Check for an exclamation mark (!) like "Bonk! Atomic Punch".' +
                    `\n• If you're trading for uncraftable items, type it like "Non-Craftable Crit-a-Cola".`
            );
            return null;
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
            bot.sendMessage(
                steamID,
                `❓ I could not find any item names in my pricelist with an exact match for "${name}". Using closest item name match "${matchName}" instead.`
            );

            return {
                amount: amount,
                match: closestMatch
            };
        } else {
            bot.sendMessage(
                steamID,
                `❌ I could not find any item names in my pricelist that contain "${name}". I may not be trading the item you are looking for.` +
                    '\n\nAlternatively, please try to:' +
                    '\n• Remove "The".' +
                    '\n• Remove "Unusual", just put effect and name. Example: "Kill-a-Watt Vive La France".' +
                    '\n• Remove plural (~s/~es/etc), example: "!buy 2 Mann Co. Supply Crate Key".' +
                    '\n• Some Taunts need "The" such as "Taunt: The High Five!", while others do not.' +
                    '\n• Check for a dash (-) like "All-Father" or "Mini-Engy".' +
                    `\n• Check for a single quote (') like "Orion's Belt" or "Chargin' Targe".` +
                    '\n• Check for a dot (.) like "Lucky No. 42" or "B.A.S.E. Jumper".' +
                    '\n• Check for an exclamation mark (!) like "Bonk! Atomic Punch".' +
                    `\n• If you're trading for uncraftable items, type it like "Non-Craftable Crit-a-Cola".`
            );
            return null;
        }
    } else if (Array.isArray(match)) {
        const matchCount = match.length;

        if (match.length > 20) {
            match = match.splice(0, 20);
        }

        let reply = `I've found ${match.length} items. Try with one of the items shown below:\n${match.join(',\n')}`;
        if (matchCount > match.length) {
            const other = matchCount - match.length;
            reply += `,\nand ${other} other ${pluralize('item', other)}.`;
        }

        bot.sendMessage(steamID, reply);
        return null;
    }

    return {
        amount: amount,
        match: match
    };
}

export function getItemFromParams(
    steamID: SteamID | string,
    params: UnknownDictionaryKnownValues,
    bot: Bot
): Item | null {
    const item = SKU.fromString('');
    delete item.craftnumber;

    let foundSomething = false;
    if (params.name !== undefined) {
        foundSomething = true;
        // Look for all items that have the same name

        const match: SchemaManager.SchemaItem[] = [];

        for (let i = 0; i < bot.schema.raw.schema.items.length; i++) {
            if (bot.schema.raw.schema.items[i].item_name === params.name) {
                match.push(bot.schema.raw.schema.items[i]);
            }
        }

        if (match.length === 0) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an item in the schema with the name "${params.name as string}".`
            );
            return null;
        } else if (match.length !== 1) {
            const matchCount = match.length;
            const parsed = match.splice(0, 20).map(schemaItem => `${schemaItem.defindex} (${schemaItem.name})`);

            let reply = `I've found ${matchCount} items with a matching name. Please use one of the defindexes below as "defindex":\n${parsed.join(
                ',\n'
            )}`;

            if (matchCount > parsed.length) {
                const other = matchCount - parsed.length;
                reply += `,\nand ${other} other ${pluralize('item', other)}.`;
            }

            bot.sendMessage(steamID, reply);
            return null;
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
        bot.sendMessage(
            steamID,
            '⚠️ Missing item properties. Please refer to: https://github.com/idinium96/tf2autobot/wiki/What-is-the-pricelist%3F'
        );
        return null;
    }

    if (params.defindex !== undefined) {
        const schemaItem = bot.schema.getItemByDefindex(params.defindex as number);
        if (schemaItem === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an item in the schema with the defindex "${params.defindex as number}".`
            );
            return null;
        }

        item.defindex = schemaItem.defindex;

        if (item.quality === 0) {
            item.quality = schemaItem.item_quality;
        }
    }

    if (params.quality !== undefined) {
        const quality = bot.schema.getQualityIdByName(params.quality as string);
        if (quality === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find a quality in the schema with the name "${params.quality as string}".`
            );
            return null;
        }
        item.quality = quality;
    }

    if (params.craftable !== undefined) {
        if (typeof params.craftable !== 'boolean') {
            bot.sendMessage(steamID, `Craftable must be "true" or "false".`);
            return null;
        }
        item.craftable = params.craftable;
    }

    if (params.paint !== undefined) {
        const paint = bot.schema.getPaintDecimalByName(params.paint as string);
        if (paint === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find a paint in the schema with the name "${params.paint as string}".`
            );
            return null;
        }
        item.paint = paint;
    }

    if (params.australium !== undefined) {
        if (typeof params.australium !== 'boolean') {
            bot.sendMessage(steamID, `Australium must be "true" or "false".`);
            return null;
        }
        item.australium = params.australium;
    }

    if (params.killstreak !== undefined) {
        const killstreak = parseInt(params.killstreak);
        if (isNaN(killstreak) || killstreak < 1 || killstreak > 3) {
            bot.sendMessage(
                steamID,
                `Unknown killstreak "${
                    params.killstreak as number
                }", it must either be 1 (Basic KS), 2 (Spec KS) or 3 (Pro KS).`
            );
            return null;
        }
        item.killstreak = killstreak;
    }

    if (params.paintkit !== undefined) {
        const paintkit = bot.schema.getSkinIdByName(params.paintkit as string);
        if (paintkit === null) {
            bot.sendMessage(steamID, `❌ Could not find a skin in the schema with the name "${item.paintkit}".`);
            return null;
        }
        item.paintkit = paintkit;
    }

    if (params.effect !== undefined) {
        const effect = bot.schema.getEffectIdByName(params.effect as string);
        if (effect === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an unusual effect in the schema with the name "${params.effect as number}".`
            );
            return null;
        }
        item.effect = effect;
    }

    if (typeof params.output === 'number') {
        // User gave defindex
        const schemaItem = bot.schema.getItemByDefindex(params.output);
        if (schemaItem === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an item in the schema with a defindex of "${params.defindex as number}".`
            );
            return null;
        }

        if (item.outputQuality === null) {
            item.quality = schemaItem.item_quality;
        }
    } else if (item.output !== null) {
        // Look for all items that have the same name
        const match: SchemaManager.SchemaItem[] = [];

        for (let i = 0; i < bot.schema.raw.schema.items.length; i++) {
            if (bot.schema.raw.schema.items[i].item_name === params.name) {
                match.push(bot.schema.raw.schema.items[i]);
            }
        }

        if (match.length === 0) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an item in the schema with the name "${params.name as string}".`
            );
            return null;
        } else if (match.length !== 1) {
            const matchCount = match.length;
            const parsed = match.splice(0, 20).map(schemaItem => `${schemaItem.defindex} (${schemaItem.name})`);

            let reply = `I've found ${matchCount} items with a matching name. Please use one of the defindexes below as "output":\n${parsed.join(
                ',\n'
            )}`;

            if (matchCount > parsed.length) {
                const other = matchCount - parsed.length;
                reply += `,\nand ${other} other ${pluralize('item', other)}.`;
            }

            bot.sendMessage(steamID, reply);
            return null;
        }

        item.output = match[0].defindex;
        if (item.outputQuality === null) {
            item.quality = match[0].item_quality;
        }
    }

    if (params.outputQuality !== undefined) {
        const quality = bot.schema.getQualityIdByName(params.outputQuality as string);
        if (quality === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find a quality in the schema with the name "${params.outputQuality as string}".`
            );
            return null;
        }
        item.outputQuality = quality;
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
    return fixItem(item, bot.schema);
}

export function removeLinkProtocol(message: string): string {
    return message.replace(/(\w+:|^)\/\//g, '');
}

export function testSKU(sku: string): boolean {
    return /^(\d+);([0-9]|[1][0-5])(;((uncraftable)|(untradable)|(australium)|(festive)|(strange)|((u|pk|td-|c|od-|oq-|p)\d+)|(w[1-5])|(kt-[1-3])|(n((100)|[1-9]\d?))))*?$/.test(
        sku
    );
}
