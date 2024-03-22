import SteamID from 'steamid';
import pluralize from 'pluralize';
import SKU from '@tf2autobot/tf2-sku';
import SchemaManager from '@tf2autobot/tf2-schema';
import levenshtein from 'js-levenshtein';
import { UnknownDictionaryKnownValues } from '../../../types/common';
import { MinimumItem } from '../../../types/TeamFortress2';
import Bot from '../../Bot';
import Pricelist, { Entry } from '../../Pricelist';
import { genericNameAndMatch } from '../../Inventory';
import { fixItem } from '../../../lib/items';
import { testPriceKey } from '../../../lib/tools/export';

export function getItemAndAmount(
    steamID: SteamID,
    message: string,
    bot: Bot,
    prefix: string,
    from?: 'buy' | 'sell' | 'buycart' | 'sellcart'
): { match: Entry; priceKey: string; amount: number } | null {
    const parsedMessage = parseItemAndAmountFromMessage(message);
    const name = parsedMessage.name;
    let amount = parsedMessage.amount;

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

    let priceKey: string;
    let match = testPriceKey(name)
        ? bot.pricelist.getPriceBySkuOrAsset({ priceKey: name, onlyEnabled: true })
        : bot.pricelist.searchByName(name, true);
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

        if (Pricelist.isAssetId(name)) {
            priceKey = name;
            amount = 1;
        } else {
            priceKey = match.sku;
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
        const pricelist = bot.pricelist.getPrices;
        for (const priceKey in pricelist) {
            if (!Object.prototype.hasOwnProperty.call(pricelist, priceKey) || Pricelist.isAssetId(priceKey)) {
                continue;
            }

            const pricedItem = pricelist[priceKey];
            if (pricedItem.name === null) {
                // This looks impossible, but can occur I guess.
                // https://github.com/TF2Autobot/tf2autobot/issues/882

                bot.sendMessage(steamID, `❌ Something went wrong. Please try again.`);
                return null;
            }

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

        const notFound = (name: string, prefix: string) => {
            return (
                `❌ I could not find any item names in my pricelist that contain "${name}". I may not be trading the item you are looking for.` +
                '\n\nAlternatively, please try to:\n• ' +
                [
                    'Remove "Unusual", just put effect and name. Example: "Kill-a-Watt Vive La France".',
                    `Remove plural (~s/~es/etc), example: "${prefix}buy 2 Mann Co. Supply Crate Key".`,
                    'Check for a dash (-) i.e. "All-Father" or "Mini-Engy".',
                    `Check for a single quote (') i.e. "Orion's Belt" or "Chargin' Targe".`,
                    'Check for a dot (.) i.e. "Lucky No. 42" or "B.A.S.E. Jumper".',
                    'Check for an exclamation mark (!) i.e. "Bonk! Atomic Punch".',
                    `If you're trading for uncraftable items, type it i.e. "Non-Craftable Crit-a-Cola".`,
                    `If you're trading painted items, then includes paint name, such as "Anger (Paint: Australium Gold)".`,
                    `If you're entering the sku, make sure it's correct`,
                    `Last but not least, if you're trading Skins/War Paint, make sure to put the correct item full name or sku, i.e. Strange Cool Totally Boned Pistol (Minimal Wear)`
                ].join('\n• ')
            );
        };

        if (closestMatch === null) {
            bot.sendMessage(steamID, notFound(name, prefix));

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
                priceKey: closestMatch.sku,
                match: closestMatch
            };
        } else {
            bot.sendMessage(steamID, notFound(name, prefix));

            return null;
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

        bot.sendMessage(steamID, reply);
        return null;
    }

    return {
        amount: amount,
        priceKey: priceKey,
        match: match
    };
}

export function parseItemAndAmountFromMessage(message: string): { name: string; amount: number } {
    let name = removeLinkProtocol(message);
    let amount = 1;
    const args = name.split(' ');
    if (/^[-]?\d+$/.test(args[0]) && args.length > 1) {
        // Check if the first part of the name is a number, if so, then that is the amount the user wants to trade
        amount = parseInt(args[0]);
        name = name.replace(amount.toString(), '').trim();
    } else if (Pricelist.isAssetId(args[0]) && args.length === 1) {
        // Check if the only parameter is an assetid
        name = args[0];
    }

    if (1 > amount) {
        amount = 1;
    }

    return { name: name, amount: amount };
}

export function getItemFromParams(
    steamID: SteamID | string,
    params: UnknownDictionaryKnownValues,
    bot: Bot
): MinimumItem | null {
    if (params.id) {
        const item = bot.inventoryManager.getInventory.findByAssetid(String(params.id));
        if (null !== item) {
            return SKU.fromString(item);
        } else {
            return null;
        }
    }
    const item = SKU.fromString('');
    delete item.craftnumber;

    let foundSomething = false;
    if (params.item !== undefined) {
        const sku = bot.schema.getSkuFromName(params.item as string);

        if (sku.includes('null') || sku.includes('undefined')) {
            bot.sendMessage(
                steamID,
                `Invalid item name. The sku generate was ${sku}. Please report this to us on our Discord server, or create an issue on Github.`
            );
            return null;
        }

        return SKU.fromString(sku);
    } else if (params.name !== undefined) {
        foundSomething = true;
        // Look for all items that have the same name

        const match: SchemaManager.SchemaItem[] = [];

        const itemsCount = bot.schema.raw.schema.items.length;

        for (let i = 0; i < itemsCount; i++) {
            const item = bot.schema.raw.schema.items[i];

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
            bot.sendMessage(
                steamID,
                `❌ Could not find an item in the schema with the name "${params.name as string}".`
            );
            return null;
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
            '⚠️ Missing item properties. Please refer to: https://github.com/TF2Autobot/tf2autobot/wiki/What-is-the-pricelist'
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

    if (
        [
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
        ].includes(item.defindex)
    ) {
        // Standardize all specific Basic Killstreak Kit
        item.defindex = 6527;
    } else if (item.defindex === 5738) {
        // Standardize different versions of Mann Co. Stockpile Crate
        item.defindex = 5737;
    } else if (
        [
            5661, // Pomson 6000 Strangifier
            5721, // Pretty Boy's Pocket Pistol Strangifier
            5722, // Phlogistinator Strangifier
            5723, // Cleaner's Carbine Strangifier
            5724, // Private Eye Strangifier
            5725, // Big Chief Strangifier
            5753, // Air Strike Strangifier
            5754, // Classic Strangifier
            5755, // Manmelter Strangifier
            5756, // Vaccinator Strangifier
            5757, // Widowmaker Strangifier
            5758, // Anger Strangifier
            5759, // Apparition's Aspect Strangifier
            5783, // Cow Mangler 5000 Strangifier
            5784, // Third Degree Strangifier
            5804 // Righteous Bison Strangifier
        ].includes(item.defindex)
    ) {
        // Standardize defindex for Strangifier
        item.defindex = 6522;
    } else if (
        [
            20001, // Cosmetic Strangifier Recipe 1 Rare
            20005, // Cosmetic Strangifier Recipe 2
            20008, // Rebuild Strange Weapon Recipe
            20009 // Cosmetic Strangifier Recipe 3
        ].includes(item.defindex)
    ) {
        // Standardize defindex for Strangifier Chemistry Set
        item.defindex = 20000;
    }

    if (typeof params.quality === 'number') {
        // user gave quality in number
        if (params.quality < 0 || params.quality > 15) {
            bot.sendMessage(steamID, `Unknown quality "${params.quality}", it must in between 0 - 15.`);
            return null;
        }

        item.quality = params.quality;
    } else if (params.quality !== undefined) {
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

    if (typeof params.paint === 'number') {
        const paint = bot.schema.getPaintNameByDecimal(params.paint);
        if (paint === null) {
            bot.sendMessage(steamID, `❌ Could not find a paint in the schema with the decimal "${params.paint}".`);
            return null;
        }
        item.paint = params.paint;
    } else if (params.paint !== undefined) {
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

    if (params.festive !== undefined) {
        if (typeof params.festive !== 'boolean') {
            bot.sendMessage(steamID, `"festive" (for Festivized item) must be "true" or "false".`);
            return null;
        }
        item.festive = params.festive;
    }

    if (params.australium !== undefined) {
        if (typeof params.australium !== 'boolean') {
            bot.sendMessage(steamID, `Australium must be "true" or "false".`);
            return null;
        }
        item.australium = params.australium;
    }

    if (typeof params.killstreak === 'number') {
        // user gave killstreak in number
        if (params.killstreak < 1 || params.killstreak > 3) {
            bot.sendMessage(
                steamID,
                `Unknown killstreak "${params.killstreak}", it must either be 1 (Killstreak), 2 (Specialized Killstreak) or 3 (Professional Killstreak).`
            );
            return null;
        }

        item.killstreak = params.killstreak;
    } else if (params.killstreak !== undefined) {
        const killstreaks = ['Killstreak', 'Specialized Killstreak', 'Professional Killstreak'];

        const ksCaseSensitive = killstreaks.indexOf(params.killstreak as string);
        const ksCaseInsensitive = killstreaks
            .map(killstreak => killstreak.toLowerCase())
            .indexOf(params.killstreak as string);

        if (ksCaseSensitive === -1 && ksCaseInsensitive === -1) {
            bot.sendMessage(
                steamID,
                `Unknown killstreak "${
                    params.killstreak as string
                }", it must either be "Killstreak", "Specialized Killstreak", "Professional Killstreak".`
            );
            return null;
        }

        item.killstreak = ksCaseSensitive !== -1 ? ksCaseSensitive + 1 : ksCaseInsensitive + 1;
    }

    if (typeof params.effect === 'number') {
        const effect = bot.schema.getEffectById(params.effect);
        if (effect === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an unusual effect in the schema with the id "${params.effect}".`
            );
            return null;
        }
        item.effect = bot.schema.getEffectIdByName(effect);
    } else if (params.effect !== undefined) {
        const effect = bot.schema.getEffectIdByName(params.effect as string);
        if (effect === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an unusual effect in the schema with the name "${params.effect as string}".`
            );
            return null;
        }
        item.effect = effect;
    }

    if (typeof params.paintkit === 'number') {
        const paintkit = bot.schema.getSkinById(params.paintkit);
        if (paintkit === null) {
            bot.sendMessage(steamID, `❌ Could not find a skin in the schema with the id "${item.paintkit}".`);
            return null;
        }
        item.paintkit = bot.schema.getSkinIdByName(paintkit);
    } else if (params.paintkit !== undefined) {
        const paintkit = bot.schema.getSkinIdByName(params.paintkit as string);
        if (paintkit === null) {
            bot.sendMessage(steamID, `❌ Could not find a skin in the schema with the name "${item.paintkit}".`);
            return null;
        }
        item.paintkit = paintkit;
    }

    if (params.quality2 !== undefined) {
        if (typeof params.quality2 !== 'boolean') {
            bot.sendMessage(steamID, `❌ "quality2" must only be type boolean (true or false).`);
            return null;
        }

        item.quality2 = params.quality2 ? 11 : null;
    }

    if (typeof params.wear === 'number') {
        // user gave wear in number
        if (params.wear < 1 || params.wear > 5) {
            bot.sendMessage(
                steamID,
                `Unknown wear "${params.wear}", it must either be 1 (Factory New), 2 (Minimal Wear), 3 (Field-Tested), 4 (Well-Worn), or 5 (Battle Scarred).`
            );
            return null;
        }

        item.wear = params.wear;
    } else if (params.wear !== undefined) {
        const wears = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle Scarred'];

        const wearCaseSensitive = wears.indexOf(params.wear as string);
        const wearCaseInsensitive = wears.map(wear => wear.toLowerCase()).indexOf(params.wear as string);

        if (wearCaseSensitive === -1 && wearCaseInsensitive === -1) {
            bot.sendMessage(
                steamID,
                `Unknown wear "${
                    params.wear as string
                }", it must either be "Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", or "Battle Scarred".`
            );
            return null;
        }

        item.wear = wearCaseSensitive !== -1 ? wearCaseSensitive + 1 : wearCaseInsensitive + 1;
    }

    if (typeof params.target === 'number') {
        const schemaItem = bot.schema.getItemByDefindex(params.target);
        if (schemaItem === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an item in the schema with the target defindex "${params.target}".`
            );
            return null;
        }

        item.target = schemaItem.defindex;
    } else if (params.target !== undefined) {
        const schemaItem = bot.schema.getItemByItemName(params.target as string);
        if (schemaItem === null) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an item in the schema with the target name "${params.target as string}".`
            );
            return null;
        }

        item.target = schemaItem.defindex;
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
        const itemsCount = bot.schema.raw.schema.items.length;

        for (let i = 0; i < itemsCount; i++) {
            if (bot.schema.raw.schema.items[i].item_name === params.name) {
                match.push(bot.schema.raw.schema.items[i]);
            }
        }

        const matchCount = match.length;

        if (matchCount === 0) {
            bot.sendMessage(
                steamID,
                `❌ Could not find an item in the schema with the name "${params.name as string}".`
            );
            return null;
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

    if (params.crateseries !== undefined) {
        if (typeof params.crateseries !== 'number') {
            bot.sendMessage(steamID, `❌ crateseries must only be type number!.`);
            return null;
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
    return fixItem(item, bot.schema);
}

export function removeLinkProtocol(message: string): string {
    return message.replace(/(\w+:|^)\/\//g, '');
}
