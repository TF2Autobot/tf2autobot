/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import Currencies from 'tf2-currencies';
import pluralize from 'pluralize';
import dayjs from 'dayjs';
import sleepasync from 'sleep-async';
import { removeLinkProtocol, testSKU, getItemFromParams } from './utils';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { Entry, EntryData, PricelistChangedSource } from '../../Pricelist';
import validator from '../../../lib/validator';
import log from '../../../lib/logger';

// Pricelist manager

export function addCommand(steamID: SteamID, message: string, bot: Bot): void {
    const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

    if (params.enabled === undefined) {
        params.enabled = true;
    }

    if (params.max === undefined) {
        params.max = 1;
    }

    if (params.min === undefined) {
        params.min = 0;
    }

    if (params.intent === undefined) {
        params.intent = 2;
    } else if (typeof params.intent === 'string') {
        const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());

        if (intent !== -1) {
            params.intent = intent;
        }
    }

    if (typeof params.buy === 'object') {
        params.buy.keys = params.buy.keys || 0;
        params.buy.metal = params.buy.metal || 0;

        if (params.autoprice === undefined) {
            params.autoprice = false;
        }
    }
    if (typeof params.sell === 'object') {
        params.sell.keys = params.sell.keys || 0;
        params.sell.metal = params.sell.metal || 0;

        if (params.autoprice === undefined) {
            params.autoprice = false;
        }
    }

    const isPremium = bot.handler.getBotInfo.premium;
    if (params.promoted !== undefined) {
        if (!isPremium) {
            return bot.sendMessage(
                steamID,
                `❌ This account is not Backpack.tf Premium. You can't use "promoted" parameter.`
            );
        }

        if (typeof params.promoted === 'boolean') {
            if (params.promoted === true) {
                params.promoted = 1;
            } else {
                params.promoted = 0;
            }
        } else {
            if (typeof params.promoted !== 'number') {
                return bot.sendMessage(steamID, '❌ "promoted" parameter must be either 0 (false) or 1 (true)');
            } else if (params.promoted < 0 || params.promoted > 1) {
                return bot.sendMessage(steamID, '❌ "promoted" parameter must be either 0 (false) or 1 (true)');
            }
        }
    } else {
        params['promoted'] = 0;
    }

    if (typeof params.note === 'object') {
        params.note.buy = params.note.buy || null;
        params.note.sell = params.note.sell || null;
    }

    if (params.note === undefined) {
        // If note parameter is not defined, set both note.buy and note.sell to null.
        params['note'] = { buy: null, sell: null };
    }

    if (params.group && typeof params.group !== 'string') {
        // if group parameter is defined, convert anything to string
        params.group = (params.group as string).toString();
    }

    if (typeof params.group === undefined) {
        // If group parameter is not defined, set it to null.
        params['group'] = 'all';
    }

    if (params.autoprice === undefined) {
        params.autoprice = true;
    }

    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        return bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
    }

    if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);

        if (item === null) {
            return bot.sendMessage(steamID, `❌ Item not found.`);
        }

        params.sku = SKU.fromObject(item);
    }

    bot.pricelist
        .addPrice(params as EntryData, true, PricelistChangedSource.Command)
        .then(entry => {
            bot.sendMessage(steamID, `✅ Added "${entry.name}"` + generateAddedReply(bot, isPremium, entry));
        })
        .catch(err => {
            bot.sendMessage(steamID, `❌ Failed to add the item to the pricelist: ${(err as Error).message}`);
        });
}

let stopAutoAdd = false;

export function stopAutoAddCommand(): void {
    stopAutoAdd = true;
}

export async function autoAddCommand(steamID: SteamID, message: string, bot: Bot): Promise<void> {
    const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

    if (params.sku !== undefined || params.name !== undefined || params.defindex !== undefined) {
        return bot.sendMessage(
            steamID,
            `❌ Please only define item listing settings parameters, more info:` +
                ` https://github.com/TF2Autobot/tf2autobot/wiki/What-is-the-pricelist%3F#i2---item-listing-settings-parameters.`
        );
    }

    if (!params) {
        bot.sendMessage(steamID, `⏳ Adding all items with default settings...`);
    }

    if (params.enabled === undefined) {
        params.enabled = true;
    }

    if (params.max === undefined) {
        params.max = 1;
    }

    if (params.min === undefined) {
        params.min = 0;
    }

    if (params.intent === undefined) {
        params.intent = 2;
    } else if (typeof params.intent === 'string') {
        const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());

        if (intent !== -1) {
            params.intent = intent;
        }
    }

    if (typeof params.buy === 'object') {
        params.buy.keys = params.buy.keys || 0;
        params.buy.metal = params.buy.metal || 0;

        if (params.autoprice === undefined) {
            params.autoprice = false;
        }
    }
    if (typeof params.sell === 'object') {
        params.sell.keys = params.sell.keys || 0;
        params.sell.metal = params.sell.metal || 0;

        if (params.autoprice === undefined) {
            params.autoprice = false;
        }
    }

    if (
        (params.sell !== undefined && params.buy === undefined) ||
        (params.sell === undefined && params.buy !== undefined)
    ) {
        return bot.sendMessage(steamID, `❌ Please set both buy and sell prices.`);
    }

    const isPremium = bot.handler.getBotInfo.premium;

    if (params.promoted !== undefined) {
        if (!isPremium) {
            return bot.sendMessage(
                steamID,
                `❌ This account is not Backpack.tf Premium. You can't use "promoted" paramter.`
            );
        }

        if (typeof params.promoted === 'boolean') {
            if (params.promoted === true) {
                params.promoted = 1;
            } else {
                params.promoted = 0;
            }
        } else {
            if (typeof params.promoted !== 'number') {
                return bot.sendMessage(steamID, '❌ "promoted" parameter must be either 0 (false) or 1 (true)');
            }

            if (params.promoted < 0 || params.promoted > 1) {
                return bot.sendMessage(steamID, '❌ "promoted" parameter must be either 0 (false) or 1 (true)');
            }
        }
    } else {
        params['promoted'] = 0;
    }

    if (typeof params.note === 'object') {
        params.note.buy = params.note.buy || null;
        params.note.sell = params.note.sell || null;
    }

    if (params.note === undefined) {
        // If note parameter is not defined, set both note.buy and note.sell to null.
        params['note'] = { buy: null, sell: null };
    }

    if (params.group && typeof params.group !== 'string') {
        // if group parameter is defined, convert anything to string
        params.group = (params.group as string).toString();
    }

    if (typeof params.group === undefined) {
        // If group parameter is not defined, set it to null.
        params['group'] = 'all';
    }

    if (params.autoprice === undefined) {
        params.autoprice = true;
    }

    const pricelist = bot.pricelist.getPrices;
    const dict = bot.inventoryManager.getInventory.getItems;

    const pureAndWeapons = ['5021;6', '5000;6', '5001;6', '5002;6'].concat(bot.craftWeapons.concat(bot.uncraftWeapons));

    for (const sku in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
            continue;
        }

        if (pureAndWeapons.some(pureOrWeaponsSKU => pureOrWeaponsSKU === sku)) {
            delete dict[sku];
        }
    }

    const total = Object.keys(dict).length;

    const totalTime = total * (params.autoprice ? 2 : 1) * 1000;
    const aSecond = 1 * 1000;
    const aMin = 1 * 60 * 1000;
    const anHour = 1 * 60 * 60 * 1000;

    bot.sendMessage(
        steamID,
        `⏳ Running automatic add items... Total items to add: ${total}` +
            `\n${params.autoprice ? 2 : 1} seconds in between items, so it will be about ${
                totalTime < aMin
                    ? `${Math.round(totalTime / aSecond)} seconds`
                    : totalTime < anHour
                    ? `${Math.round(totalTime / aMin)} minutes`
                    : `${Math.round(totalTime / anHour)} hours`
            } to complete. Send "!stopautoadd" to abort.`
    );

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const sku in dict) {
        if (stopAutoAdd) {
            bot.sendMessage(steamID, '----------\n🛑 Stopped auto-add items');
            stopAutoAdd = false;
            break;
        }

        if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
            continue;
        }

        if (pricelist.some(entry => entry.sku === sku)) {
            skipped++;
            bot.sendMessage(
                steamID,
                `----------\n⚠️ ${bot.schema.getName(SKU.fromString(sku))} (${sku}) already in pricelist, skipping...` +
                    `\n📜 Status: ${added} added, ${skipped} skipped, ${failed} failed / ${total} total, ${
                        total - added - skipped - failed
                    } remaining`
            );
            // Prevent spamming detection and cause the bot to stop sending messages
            await sleepasync().Promise.sleep(1 * 1000);
            continue;
        }

        if (params.autoprice === true) {
            await sleepasync().Promise.sleep(2 * 1000);
        } else {
            await sleepasync().Promise.sleep(1 * 1000);
        }

        params.sku = sku;

        bot.pricelist
            .addPrice(params as EntryData, true, PricelistChangedSource.Command)
            .then(entry => {
                added++;
                bot.sendMessage(
                    steamID,
                    `----------\n✅ Added "${entry.name}"` +
                        generateAddedReply(bot, isPremium, entry) +
                        `\n\n📜 Status: ${added} added, ${skipped} skipped, ${failed} failed / ${total} total, ${
                            total - added - skipped - failed
                        } remaining`
                );
            })
            .catch(err => {
                failed++;
                bot.sendMessage(
                    steamID,
                    `----------\n❌ Failed to add the item to the pricelist: ${(err as Error).message}` +
                        `\n\n📜 Status: ${added} added, ${skipped} skipped, ${failed} failed / ${total} total, ${
                            total - added - skipped - failed
                        } remaining`
                );
            });
    }

    bot.sendMessage(
        steamID,
        `----------\n✅ Done, summary: ${added} added, ${skipped} skipped, ${failed} failed / ${total} total`
    );

    stopAutoAdd = false;
}

function generateAddedReply(bot: Bot, isPremium: boolean, entry: Entry): string {
    const amount = bot.inventoryManager.getInventory.getAmount(entry.sku);
    return (
        `\n💲 Buy: ${entry.buy.toString()} | Sell: ${entry.sell.toString()}` +
        `\n🛒 Intent: ${entry.intent === 2 ? 'bank' : entry.intent === 1 ? 'sell' : 'buy'}` +
        `\n📦 Stock: ${amount} | Min: ${entry.min} | Max: ${entry.max}` +
        `\n📋 Enabled: ${entry.enabled ? '✅' : '❌'}` +
        `\n🔄 Autoprice: ${entry.autoprice ? '✅' : '❌'}` +
        (isPremium ? `\n📢 Promoted: ${entry.promoted === 1 ? '✅' : '❌'}` : '') +
        `${entry.group !== 'all' ? `\n🔰 Group: ${entry.group}` : ''}` +
        `${entry.note.buy !== null ? `\n📥 Custom buying note: ${entry.note.buy}` : ''}` +
        `${entry.note.sell !== null ? `\n📤 Custom selling note: ${entry.note.sell}` : ''}`
    );
}

export async function updateCommand(steamID: SteamID, message: string, bot: Bot): Promise<void> {
    const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

    if (typeof params.intent === 'string') {
        const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());

        if (intent !== -1) {
            params.intent = intent;
        }
    }

    if (params.all === true) {
        // TODO: Must have at least one other param
        const pricelist = bot.pricelist.getPrices;
        const keyPrice = bot.pricelist.getKeyPrice;

        let targetedPricelist: Entry[];
        let unTargetedPricelist: Entry[];
        let newPricelist: Entry[];

        if (params.promoted) {
            return bot.sendMessage(steamID, `❌ Parameter "promoted" can't be used with "!update all=true".`);
        }

        if (params.withgroup && params.withoutgroup) {
            return bot.sendMessage(
                steamID,
                `❌ Don't be dumb. Please choose only "withgroup" OR "withoutgroup", not both. Thanks.`
            );
        }

        if (params.withgroup) {
            targetedPricelist = pricelist.filter(entry =>
                entry.group ? [(params.withgroup as string).toLowerCase()].includes(entry.group.toLowerCase()) : false
            );
            unTargetedPricelist = pricelist.filter(entry =>
                entry.group ? ![(params.withgroup as string).toLowerCase()].includes(entry.group.toLowerCase()) : true
            );

            if (targetedPricelist.length === 0) {
                return bot.sendMessage(
                    steamID,
                    `❌ There is no entry with "${params.withgroup as string}" group found in your pricelist.`
                );
            }

            newPricelist = targetedPricelist;

            if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                if (
                    new Currencies(params.buy).toValue(keyPrice.metal) >=
                    new Currencies(params.sell).toValue(keyPrice.metal)
                ) {
                    return bot.sendMessage(steamID, `❌ Buying price can't be higher than selling price.`);
                } else if (
                    (params.buy !== null && params.sell === undefined) ||
                    (params.buy === undefined && params.sell !== null)
                ) {
                    return bot.sendMessage(steamID, `❌ You must include both buying and selling prices.`);
                }
            }
        } else if (params.withoutgroup) {
            // reverse of withgroup
            targetedPricelist = pricelist.filter(entry =>
                entry.group
                    ? ![(params.withoutgroup as string).toLowerCase()].includes(entry.group.toLowerCase())
                    : true
            );
            unTargetedPricelist = pricelist.filter(entry =>
                entry.group
                    ? [(params.withoutgroup as string).toLowerCase()].includes(entry.group.toLowerCase())
                    : false
            );

            if (targetedPricelist.length === 0) {
                return bot.sendMessage(
                    steamID,
                    `❌ There is no entry other than "${params.withoutgroup as string}" group found in your pricelist.`
                );
            }

            newPricelist = targetedPricelist;

            if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                if (
                    new Currencies(params.buy).toValue(keyPrice.metal) >=
                    new Currencies(params.sell).toValue(keyPrice.metal)
                ) {
                    return bot.sendMessage(steamID, `❌ Buying price can't be higher than selling price.`);
                } else if (
                    (params.buy !== null && params.sell === undefined) ||
                    (params.buy === undefined && params.sell !== null)
                ) {
                    return bot.sendMessage(steamID, `❌ You must include both buying and selling prices.`);
                }
            }
        } else {
            newPricelist = pricelist;

            if (bot.options.autokeys.enable) {
                // Autokeys is a feature, so when updating multiple entry with
                // "!update all=true", key entry will be removed from newPricelist.
                // https://github.com/idinium96/tf2autobot/issues/131
                const keyEntry = bot.pricelist.getPrice('5021;6');
                if (keyEntry !== null) {
                    const index = bot.pricelist.getIndex('5021;6');
                    newPricelist.splice(index, 1);
                }
            }
        }

        if (newPricelist.length === 0) {
            return bot.sendMessage(steamID, 'Your pricelist is empty.');
        }

        if (!params.withgroup && !params.withoutgroup) {
            if (typeof params.note === 'object') {
                return bot.sendMessage(
                    steamID,
                    `❌ Please specify "withgroup" or "withoutgroup" to change note.` +
                        `\nExample: "!update all=true&withgroup=<groupName>&note.buy=<yourNote>"`
                );
            }

            if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                return bot.sendMessage(
                    steamID,
                    `❌ Please specify "withgroup" or "withoutgroup" to change buying/selling price.\nExample:\n` +
                        `"!update all=true&withgroup=<groupName>&(buy.keys|buy.metal)=<buyingPrice>&(sell.keys|sell.metal)=<sellingPrice>"`
                );
            }
        }

        newPricelist.forEach((entry, i) => {
            if (params.intent || params.intent === 0) {
                entry.intent = params.intent as 0 | 1 | 2;
            }

            if (params.min === 0 || typeof params.min === 'number') {
                entry.min = params.min as number;
            }

            if (params.max === 0 || typeof params.max === 'number') {
                entry.max = params.max as number;
            }

            if (typeof params.enabled === 'boolean') {
                entry.enabled = params.enabled;
            }

            if (params.group) {
                entry.group = (params.group as string).toString();
            }

            if (params.removenote && typeof params.removenote === 'boolean' && params.removenote === true) {
                // Sending "!update all=true&removenote=true" will set both
                // note.buy and note.sell for entire/withgroup entries to null.
                if (entry.note) {
                    entry.note.buy = null;
                    entry.note.sell = null;
                }
            }

            if (typeof params.autoprice === 'boolean') {
                if (params.autoprice === false) {
                    entry.time = null;
                }
                entry.autoprice = params.autoprice;
            }

            if (params.withgroup || params.withoutgroup) {
                if (typeof params.note === 'object') {
                    // can change note if have withgroup/withoutgroup parameter
                    entry.note.buy = params.note.buy || entry.note.buy;
                    entry.note.sell = params.note.sell || entry.note.sell;
                }

                if (typeof params.buy === 'object' && params.buy !== null) {
                    entry.buy.keys = params.buy.keys || 0;
                    entry.buy.metal = params.buy.metal || 0;

                    if (params.autoprice === undefined) {
                        entry.autoprice = false;
                    }
                }

                if (typeof params.sell === 'object' && params.sell !== null) {
                    entry.sell.keys = params.sell.keys || 0;
                    entry.sell.metal = params.sell.metal || 0;

                    if (params.autoprice === undefined) {
                        entry.autoprice = false;
                    }
                }
            }

            if (i === 0) {
                const errors = validator(
                    {
                        sku: entry.sku,
                        enabled: entry.enabled,
                        intent: entry.intent,
                        max: entry.max,
                        min: entry.min,
                        autoprice: entry.autoprice,
                        buy: entry.buy.toJSON(),
                        sell: entry.sell.toJSON(),
                        promoted: entry.promoted,
                        group: entry.group,
                        note: entry.note,
                        time: entry.time
                    },
                    'pricelist'
                );

                if (errors !== null) {
                    throw new Error(errors.join(', '));
                }
            }
        });

        if (params.removenote) {
            delete params.removenote;
        }

        if (params.withgroup) {
            newPricelist = unTargetedPricelist.concat(newPricelist);
            delete params.withgroup;
        }

        if (params.withoutgroup) {
            newPricelist = unTargetedPricelist.concat(newPricelist);
            delete params.withoutgroup;
        }

        // FIXME: Make it so that it is not needed to remove all listings

        if (params.autoprice !== true) {
            await bot.handler.onPricelist(newPricelist);
            bot.sendMessage(steamID, '✅ Updated pricelist!');

            return await bot.listings.redoListings();
        }

        bot.sendMessage(steamID, '⌛ Updating prices...');

        return bot.pricelist
            .setupPricelist()
            .then(async () => {
                bot.sendMessage(steamID, '✅ Updated pricelist!');
                await bot.listings.redoListings();
            })
            .catch(err => {
                log.warn('Failed to update prices: ', err);
                return bot.sendMessage(steamID, `❌ Failed to update prices: ${(err as Error).message}`);
            });
    }

    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        return bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
    }

    if (typeof params.buy === 'object' && params.buy !== null) {
        params.buy.keys = params.buy.keys || 0;
        params.buy.metal = params.buy.metal || 0;

        if (params.autoprice === undefined) {
            params.autoprice = false;
        }
    }

    if (typeof params.sell === 'object' && params.sell !== null) {
        params.sell.keys = params.sell.keys || 0;
        params.sell.metal = params.sell.metal || 0;

        if (params.autoprice === undefined) {
            params.autoprice = false;
        }
    }

    if (params.resetgroup) {
        // if resetgroup (when sending "!update item=<itemName>&resetgroup=true") is defined,
        // first check if it's a booelan type
        if (typeof params.resetgroup === 'boolean') {
            // if it's boolean, then check if it's true
            if (params.resetgroup === true) {
                // if it's true, then set group key to null.
                params.group = 'all';
            }
        } else {
            // else if it's not a boolean type, then send message.
            return bot.sendMessage(steamID, '❌ "resetgroup" must be either "true" or "false".');
        }
        // delete resetgroup key from params so it will not trying to be added into pricelist (validator error)
        delete params.resetgroup;
    }

    const isPremium = bot.handler.getBotInfo.premium;
    if (params.promoted !== undefined) {
        if (!isPremium) {
            return bot.sendMessage(
                steamID,
                `❌ This account is not Backpack.tf Premium. You can't use "promoted" paramter.`
            );
        }

        if (typeof params.promoted === 'boolean') {
            if (params.promoted === true) {
                params.promoted = 1;
            } else {
                params.promoted = 0;
            }
        } else {
            if (typeof params.promoted !== 'number') {
                return bot.sendMessage(steamID, '❌ "promoted" parameter must be either 0 (false) or 1 (true)');
            }

            if (params.promoted < 0 || params.promoted > 1) {
                return bot.sendMessage(steamID, '❌ "promoted" parameter must be either 0 (false) or 1 (true)');
            }
        }
    }

    if (params.item !== undefined) {
        // Remove by full name
        let match = bot.pricelist.searchByName(params.item as string, false);
        if (match === null) {
            return bot.sendMessage(
                steamID,
                `❌ I could not find any items in my pricelist that contain "${params.item as string}"`
            );
        } else if (Array.isArray(match)) {
            const matchCount = match.length;
            if (match.length > 20) {
                match = match.splice(0, 20);
            }

            let reply = `I've found ${match.length} items. Try with one of the items shown below:\n${match.join(
                ',\n'
            )}`;

            if (matchCount > match.length) {
                const other = matchCount - match.length;
                reply += `,\nand ${other} other ${pluralize('item', other)}.`;
            }

            return bot.sendMessage(steamID, reply);
        }

        delete params.item;
        params.sku = match.sku;
    } else if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);

        if (item === null) {
            return bot.sendMessage(steamID, `❌ Item not found.`);
        }

        params.sku = SKU.fromObject(item);
    }

    if (!bot.pricelist.hasPrice(params.sku as string)) {
        return bot.sendMessage(steamID, '❌ Item is not in the pricelist.');
    }

    const itemEntry = bot.pricelist.getPrice(params.sku as string, false);

    if (typeof params.note === 'object') {
        params.note.buy = params.note.buy || itemEntry.note.buy;
        params.note.sell = params.note.sell || itemEntry.note.sell;
    }

    if (params.removenote) {
        // removenote to set both note.buy and note.sell to null.
        if (typeof params.removenote === 'boolean') {
            if (params.removenote === true) {
                params.note = { buy: null, sell: null };
            }
        } else {
            return bot.sendMessage(steamID, '❌ "removenote" must be either "true" or "false".');
        }

        delete params.removenote;
    }

    if (params.removebuynote && params.removesellnote) {
        return bot.sendMessage(
            steamID,
            '❌ Please only use either "removebuynote" or "removesellnote", not both, or if you wish to remove both buy and sell note, please use "removenote".'
        );
    }

    if (params.removebuynote) {
        if (typeof params.removebuynote === 'boolean') {
            if (params.removebuynote === true) {
                params.note = { buy: null, sell: itemEntry.note.sell };
            }
        } else {
            return bot.sendMessage(steamID, '❌ "removebuynote" must be either "true" or "false".');
        }

        delete params.removebuynote;
    }

    if (params.removesellnote) {
        if (typeof params.removesellnote === 'boolean') {
            if (params.removesellnote === true) {
                params.note = { buy: itemEntry.note.buy, sell: null };
            }
        } else {
            return bot.sendMessage(steamID, '❌ "removesellnote" must be either "true" or "false".');
        }

        delete params.removesellnote;
    }

    if (params.group && typeof params.group !== 'string') {
        // if group parameter is defined, convert anything to string
        params.group = (params.group as string).toString();
    }

    const entryData = bot.pricelist.getPrice(params.sku as string, false).getJSON();
    delete entryData.time;
    delete params.sku;

    if (Object.keys(params).length === 0) {
        return bot.sendMessage(steamID, '⚠️ Missing properties to update.');
    }

    // Update entry
    for (const property in params) {
        if (!Object.prototype.hasOwnProperty.call(params, property)) {
            continue;
        }

        entryData[property] = params[property];
    }

    const generateUpdateReply = (bot: Bot, isPremium: boolean, oldEntry: Entry, newEntry: Entry) => {
        const keyPrice = bot.pricelist.getKeyPrice;
        const amount = bot.inventoryManager.getInventory.getAmount(oldEntry.sku);
        return (
            `\n💲 Buy: ${
                oldEntry.buy.toValue(keyPrice.metal) !== newEntry.buy.toValue(keyPrice.metal)
                    ? `${oldEntry.buy.toString()} → ${newEntry.buy.toString()}`
                    : newEntry.buy.toString()
            } | Sell: ${
                oldEntry.sell.toValue(keyPrice.metal) !== newEntry.sell.toValue(keyPrice.metal)
                    ? `${oldEntry.sell.toString()} → ${newEntry.sell.toString()}`
                    : newEntry.sell.toString()
            }` +
            `\n📦 Stock: ${amount}` +
            ` | Min: ${oldEntry.min !== newEntry.min ? `${oldEntry.min} → ${newEntry.min}` : newEntry.min} | Max: ${
                oldEntry.max !== newEntry.max ? `${oldEntry.max} → ${newEntry.max}` : newEntry.max
            }` +
            `\n🛒 Intent: ${
                oldEntry.intent !== newEntry.intent
                    ? `${oldEntry.intent === 2 ? 'bank' : oldEntry.intent === 1 ? 'sell' : 'buy'} → ${
                          newEntry.intent === 2 ? 'bank' : newEntry.intent === 1 ? 'sell' : 'buy'
                      }`
                    : `${newEntry.intent === 2 ? 'bank' : newEntry.intent === 1 ? 'sell' : 'buy'}`
            }` +
            `\n📋 Enabled: ${
                oldEntry.enabled !== newEntry.enabled
                    ? `${oldEntry.enabled ? '✅' : '❌'} → ${newEntry.enabled ? '✅' : '❌'}`
                    : `${newEntry.enabled ? '✅' : '❌'}`
            }` +
            `\n🔄 Autoprice: ${
                oldEntry.autoprice !== newEntry.autoprice
                    ? `${oldEntry.autoprice ? '✅' : '❌'} → ${newEntry.autoprice ? '✅' : '❌'}`
                    : `${newEntry.autoprice ? '✅' : '❌'}`
            }` +
            (isPremium
                ? `\n📢 Promoted: ${
                      oldEntry.promoted !== newEntry.promoted
                          ? `${oldEntry.promoted === 1 ? '✅' : '❌'} → ${newEntry.promoted === 1 ? '✅' : '❌'}`
                          : `${newEntry.promoted === 1 ? '✅' : '❌'}`
                  }`
                : '') +
            `${
                newEntry.group !== 'all'
                    ? `\n🔰 Group: ${
                          oldEntry.group !== newEntry.group ? `${oldEntry.group} → ${newEntry.group}` : newEntry.group
                      }`
                    : ''
            }` +
            `${newEntry.note.buy !== null ? `\n📥 Custom buying note: ${newEntry.note.buy}` : ''}` +
            `${newEntry.note.sell !== null ? `\n📤 Custom selling note: ${newEntry.note.sell}` : ''}`
        );
    };

    bot.pricelist
        .updatePrice(entryData, true, PricelistChangedSource.Command)
        .then(entry => {
            bot.sendMessage(
                steamID,
                `✅ Updated "${entry.name}"` + generateUpdateReply(bot, isPremium, itemEntry, entry)
            );
        })
        .catch((err: ErrorRequest) => {
            bot.sendMessage(
                steamID,
                '❌ Failed to update pricelist entry: ' +
                    (err.body && err.body.message ? err.body.message : err.message)
            );
        });
}

let executed = false;
let lastExecutedTime: number | null = null;
let executeTimeout: NodeJS.Timeout;

export async function shuffleCommand(steamID: SteamID, bot: Bot): Promise<void> {
    const newExecutedTime = dayjs().valueOf();
    const timeDiff = newExecutedTime - lastExecutedTime;

    const pricelist = bot.pricelist.getPrices;

    if (pricelist.length === 0) {
        return bot.sendMessage(steamID, '❌ Pricelist is empty!');
    }

    if (executed === true) {
        return bot.sendMessage(
            steamID,
            `⚠️ You need to wait ${Math.trunc(
                (30 * 60 * 1000 - timeDiff) / (1000 * 60)
            )} minutes before you can shuffle pricelist/shuffle again.`
        );
    } else {
        clearTimeout(executeTimeout);
        lastExecutedTime = dayjs().valueOf();

        const shufflePricelist = (arr: Entry[]) => {
            return arr.sort(() => Math.random() - 0.5);
        };

        await bot.handler.onPricelist(shufflePricelist(pricelist));
        bot.sendMessage(steamID, '✅ Pricelist shuffled!');
        await bot.listings.redoListings();

        executed = true;
        executeTimeout = setTimeout(() => {
            lastExecutedTime = null;
            executed = false;
            clearTimeout(executeTimeout);
        }, 30 * 60 * 1000);
    }
}

export async function removeCommand(steamID: SteamID, message: string, bot: Bot): Promise<void> {
    const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

    if (params.all === true) {
        // Remove entire pricelist
        const pricelistLength = bot.pricelist.getLength;
        if (pricelistLength === 0) {
            return bot.sendMessage(steamID, '❌ Your pricelist is already empty!');
        }

        const pricelist = bot.pricelist.getPrices;
        let newPricelist: Entry[] = [];
        let newPricelistCount: Entry[] = [];

        if (params.withgroup && params.withoutgroup) {
            return bot.sendMessage(
                steamID,
                `❌ Don't be dumb. Please choose only "withgroup" OR "withoutgroup", not both. Thanks.`
            );
        }

        if (params.withgroup) {
            // first filter out pricelist with ONLY "withgroup" value.
            newPricelistCount = pricelist.filter(entry =>
                entry.group ? [(params.withgroup as string).toLowerCase()].includes(entry.group.toLowerCase()) : false
            );

            if (newPricelistCount.length === 0) {
                return bot.sendMessage(
                    steamID,
                    `❌ There is no entry with "${params.withgroup as string}" group found in your pricelist.`
                );
            }

            // then filter out pricelist with NOT "withgroup" value.
            newPricelist = pricelist.filter(entry =>
                entry.group ? ![(params.withgroup as string).toLowerCase()].includes(entry.group.toLowerCase()) : true
            );
        } else if (params.withoutgroup) {
            // reverse of withgroup
            newPricelistCount = pricelist.filter(entry =>
                entry.group
                    ? ![(params.withoutgroup as string).toLowerCase()].includes(entry.group.toLowerCase())
                    : true
            );

            if (newPricelistCount.length === 0) {
                return bot.sendMessage(
                    steamID,
                    `❌ There is no entry other than "${params.withoutgroup as string}" group found in your pricelist.`
                );
            }

            newPricelist = pricelist.filter(entry =>
                entry.group
                    ? [(params.withoutgroup as string).toLowerCase()].includes(entry.group.toLowerCase())
                    : false
            );
        } else {
            newPricelistCount = pricelist;
        }

        if (params.i_am_sure !== 'yes_i_am') {
            return bot.sendMessage(
                steamID,
                '/pre ⚠️ Are you sure that you want to remove ' +
                    pluralize('item', newPricelistCount.length, true) +
                    '? Try again with i_am_sure=yes_i_am'
            );
        }

        if (params.withgroup || params.withoutgroup) {
            try {
                await bot.pricelist.removeByGroup(newPricelist);
                bot.sendMessage(steamID, `✅ Removed ${newPricelistCount.length} items from pricelist.`);
                return await bot.listings.redoListings();
            } catch (err) {
                return bot.sendMessage(steamID, `❌ Failed to clear pricelist: ${(err as Error).message}`);
            }
        } else {
            try {
                await bot.pricelist.removeAll();
                return bot.sendMessage(steamID, '✅ Cleared pricelist!');
            } catch (err) {
                return bot.sendMessage(steamID, `❌ Failed to clear pricelist: ${(err as Error).message}`);
            }
        }
    }

    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        return bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
    }

    if (params.item !== undefined) {
        // Remove by full name
        let match = bot.pricelist.searchByName(params.item as string, false);
        if (match === null) {
            return bot.sendMessage(
                steamID,
                `❌ I could not find any items in my pricelist that contain "${params.item as string}"`
            );
        } else if (Array.isArray(match)) {
            const matchCount = match.length;
            if (match.length > 20) match = match.splice(0, 20);

            let reply = `I've found ${match.length} items. Try with one of the items shown below:\n${match.join(
                ',\n'
            )}`;

            if (matchCount > match.length) {
                const other = matchCount - match.length;
                reply += `,\nand ${other} other ${pluralize('item', other)}.`;
            }

            return bot.sendMessage(steamID, reply);
        }

        delete params.item;
        params.sku = match.sku;
    } else if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);

        if (item === null) {
            return bot.sendMessage(steamID, `❌ Item not found.`);
        }

        params.sku = SKU.fromObject(item);
    }

    bot.pricelist
        .removePrice(params.sku as string, true)
        .then(entry => bot.sendMessage(steamID, `✅ Removed "${entry.name}".`))
        .catch(err => bot.sendMessage(steamID, `❌ Failed to remove pricelist entry: ${(err as Error).message}`));
}

export function getCommand(steamID: SteamID, message: string, bot: Bot): void {
    const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        return bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
    }

    if (params.item !== undefined) {
        // Remove by full name
        let match = bot.pricelist.searchByName(params.item as string, false);

        if (match === null) {
            return bot.sendMessage(
                steamID,
                `❌ I could not find any items in my pricelist that contain "${params.item as string}"`
            );
        } else if (Array.isArray(match)) {
            const matchCount = match.length;
            if (match.length > 20) {
                match = match.splice(0, 20);
            }

            let reply = `I've found ${match.length} items. Try with one of the items shown below:\n${match.join(
                ',\n'
            )}`;

            if (matchCount > match.length) {
                const other = matchCount - match.length;
                reply += `,\nand ${other} other ${pluralize('item', other)}.`;
            }

            return bot.sendMessage(steamID, reply);
        }

        delete params.item;
        params.sku = match.sku;
    } else if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);

        if (item === null) {
            return bot.sendMessage(steamID, `❌ Item not found.`);
        }

        params.sku = SKU.fromObject(item);
    }

    if (params.sku === undefined) {
        return bot.sendMessage(steamID, '❌ Missing item');
    }

    const match = bot.pricelist.getPrice(params.sku as string);
    if (match === null) {
        bot.sendMessage(steamID, `❌ Could not find item "${params.sku as string}" in the pricelist`);
    } else {
        bot.sendMessage(steamID, `/code ${generateOutput(match)}`);
    }
}

export async function findCommand(steamID: SteamID, message: string, bot: Bot): Promise<void> {
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));
    if (
        !(
            params.enabled !== undefined ||
            params.max !== undefined ||
            params.min !== undefined ||
            params.intent !== undefined ||
            params.autoprice !== undefined ||
            params.group !== undefined ||
            params.promoted !== undefined
        )
    ) {
        return bot.sendMessage(
            steamID,
            '⚠️ Only parameters available for !find command: enabled, max, min, intent, promoted, autoprice or group\nExample: !find intent=bank&max=2'
        );
    }

    let filter = bot.pricelist.getPrices;
    if (params.enabled !== undefined) {
        if (typeof params.enabled !== 'boolean') {
            return bot.sendMessage(steamID, '⚠️ enabled parameter must be "true" or "false"');
        }
        filter = filter.filter(entry => entry.enabled === params.enabled);
    }

    if (params.max !== undefined) {
        if (typeof params.max !== 'number') {
            return bot.sendMessage(steamID, '⚠️ max parameter must be an integer');
        }
        filter = filter.filter(entry => entry.max === params.max);
    }

    if (params.min !== undefined) {
        if (typeof params.min !== 'number') {
            return bot.sendMessage(steamID, '⚠️ min parameter must be an integer');
        }
        filter = filter.filter(entry => entry.min === params.min);
    }

    if (params.promoted !== undefined) {
        if (typeof params.promoted === 'boolean') {
            if (params.promoted === true) {
                filter = filter.filter(entry => entry.promoted === 1);
            } else {
                filter = filter.filter(entry => entry.promoted === 0);
            }
        } else {
            if (typeof params.promoted !== 'number') {
                return bot.sendMessage(steamID, '⚠️ promoted parameter must be either 0 (false) or 1 (true)');
            }

            if (params.promoted < 0 || params.promoted > 1) {
                return bot.sendMessage(steamID, '⚠️ "promoted" parameter must be either 0 (false) or 1 (true)');
            }
            filter = filter.filter(entry => entry.promoted === params.promoted);
        }
    }

    if (params.intent !== undefined) {
        if (typeof params.intent === 'string') {
            const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());
            if (intent !== -1) {
                params.intent = intent;
            }
        }

        if (typeof params.intent !== 'number' || params.intent < 0) {
            return bot.sendMessage(
                steamID,
                '⚠️ intent parameter must be "buy", "sell", or "bank" OR an integer of "0", "1" or "2" respectively'
            );
        }
        filter = filter.filter(entry => entry.intent === params.intent);
    }

    if (params.autoprice !== undefined) {
        if (typeof params.autoprice !== 'boolean') {
            return bot.sendMessage(steamID, '⚠️ autoprice parameter must be "true" or "false"');
        }
        filter = filter.filter(entry => entry.autoprice === params.autoprice);
    }

    if (params.group !== undefined) {
        if (typeof params.group !== 'string') {
            return bot.sendMessage(steamID, '⚠️ group parameter must be a string');
        }
        filter = filter.filter(entry => entry.group === params.group);
    }

    const parametersUsed = {
        enabled: params.enabled !== undefined ? `enabled=${(params.enabled as boolean).toString()}` : '',
        autoprice: params.autoprice !== undefined ? `autoprice=${(params.autoprice as boolean).toString()}` : '',
        max: params.max !== undefined ? `max=${params.max as number}` : '',
        min: params.min !== undefined ? `min=${params.min as number}` : '',
        intent:
            params.intent !== undefined
                ? `intent=${
                      (params.intent as number) === 0 ? 'buy' : (params.intent as number) === 1 ? 'sell' : 'bank'
                  }`
                : '',
        promoted:
            params.promoted !== undefined ? `promoted=${(params.promoted as number) === 1 ? 'true' : 'false'}` : '',
        group: params.group !== undefined ? `group=${params.group as string}` : ''
    };

    const parameters = Object.values(parametersUsed);
    const display = parameters.filter(param => param !== '');

    const length = filter.length;
    if (length === 0) {
        bot.sendMessage(steamID, `No items found with ${display.join('&')}.`);
    } else if (length > 20) {
        bot.sendMessage(
            steamID,
            `Found ${pluralize('item', length, true)} with ${display.join('&')}, showing only a max of 100 items`
        );
        bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 0, 20)}`);
        if (length <= 40) {
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 20, length > 40 ? 40 : length)}`);
        } else if (length <= 60) {
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 20, 40)}`);
            await sleepasync().Promise.sleep(1 * 1000);
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 40, length > 60 ? 60 : length)}`);
        } else if (length <= 80) {
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 20, 40)}`);
            await sleepasync().Promise.sleep(1 * 1000);
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 40, 60)}`);
            await sleepasync().Promise.sleep(1 * 1000);
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 60, length > 80 ? 80 : length)}`);
        } else if (length > 80) {
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 20, 40)}`);
            await sleepasync().Promise.sleep(1 * 1000);
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 40, 60)}`);
            await sleepasync().Promise.sleep(1 * 1000);
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 60, 80)}`);
            await sleepasync().Promise.sleep(1 * 1000);
            bot.sendMessage(steamID, `/code ${generateOutput(filter, true, 80, length > 100 ? 100 : length)}`);
        }
    } else {
        bot.sendMessage(steamID, `Found ${pluralize('item', filter.length, true)} with ${display.join('&')}`);
        bot.sendMessage(steamID, `/code ${generateOutput(filter)}`);
    }
}

function generateOutput(filtered: Entry[] | Entry, isSlice = false, start?: number, end?: number): string {
    return isSlice
        ? JSON.stringify((filtered as Entry[]).slice(start, end), null, 4)
        : JSON.stringify(filtered, null, 4);
}

interface ErrorRequest {
    body?: ErrorBody;
    message?: string;
}

interface ErrorBody {
    message: string;
}
