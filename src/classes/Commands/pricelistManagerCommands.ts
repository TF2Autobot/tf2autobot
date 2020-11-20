import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import Currencies from 'tf2-currencies';
import pluralize from 'pluralize';

import { removeLinkProtocol, testSKU, getItemFromParams } from './utils';

import Bot from '../Bot';
import CommandParser from '../CommandParser';
import { Entry, EntryData, PricelistChangedSource } from '../Pricelist';

import validator from '../../lib/validator';
import log from '../../lib/logger';

// Pricelist manager

export function addCommand(steamID: SteamID, message: string, bot: Bot): void {
    message = removeLinkProtocol(message);
    const params = CommandParser.parseParams(CommandParser.removeCommand(message)) as any;

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
        params.group = params.group.toString();
    }

    if (params.group === undefined) {
        // If group paramater is not defined, set it to null.
        params['group'] = 'all';
    }

    if (params.autoprice === undefined) {
        params.autoprice = true;
    }

    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        return;
    }

    if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);

        if (item === null) {
            return;
        }

        params.sku = SKU.fromObject(item);
    }

    bot.pricelist
        .addPrice(params as EntryData, true, PricelistChangedSource.Command)
        .then(entry => {
            const amount = bot.inventoryManager.getInventory().getAmount(entry.sku);
            bot.sendMessage(
                steamID,
                `✅ Added "${entry.name}"` +
                    `\n💲 Buy: ${entry.buy} | Sell: ${entry.sell}` +
                    `\n🛒 Intent: ${entry.intent === 2 ? 'bank' : entry.intent === 1 ? 'sell' : 'buy'}` +
                    `\n📦 Stock: ${amount} | Min: ${entry.min} | Max: ${entry.max}` +
                    `\n📋 Enabled: ${entry.enabled ? '✅' : '❌'}` +
                    `\n🔄 Autoprice: ${entry.autoprice ? '✅' : '❌'}` +
                    `${entry.group !== 'all' ? `\n🔰 Group: ${entry.group}` : ''}` +
                    `${entry.note.buy !== null ? `\n📥 Custom buying note: ${entry.note.buy}` : ''}` +
                    `${entry.note.sell !== null ? `\n📤 Custom selling note: ${entry.note.sell}` : ''}`
            );
        })
        .catch(err => {
            bot.sendMessage(steamID, `❌ Failed to add the item to the pricelist: ${err.message}`);
        });
}

export function updateCommand(steamID: SteamID, message: string, bot: Bot): void {
    message = removeLinkProtocol(message);
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    if (typeof params.intent === 'string') {
        const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());
        if (intent !== -1) {
            params.intent = intent;
        }
    }

    if (params.all === true) {
        // TODO: Must have atleast one other param
        const pricelist = bot.pricelist.getPrices();

        let targetedPricelist: Entry[];
        let unTargetedPricelist: Entry[];
        let newPricelist: Entry[];

        if (params.withgroup && params.withoutgroup) {
            bot.sendMessage(
                steamID,
                `❌ Don't be dumb. Please choose only "withgroup" OR "withoutgroup", not both. Thanks.`
            );
            return;
        }

        if (params.withgroup) {
            targetedPricelist = pricelist.filter(entry =>
                entry.group ? [params.withgroup.toLowerCase()].includes(entry.group.toLowerCase()) : false
            );
            unTargetedPricelist = pricelist.filter(entry =>
                entry.group ? ![params.withgroup.toLowerCase()].includes(entry.group.toLowerCase()) : true
            );

            if (targetedPricelist.length === 0) {
                bot.sendMessage(
                    steamID,
                    `❌ There is no entry with "${params.withgroup}" group found in your pricelist.`
                );
                return;
            }

            newPricelist = targetedPricelist;

            if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                if (new Currencies(params.buy) >= new Currencies(params.sell)) {
                    bot.sendMessage(steamID, `❌ Buying price can't be higher than selling price.`);
                    return;
                } else if (
                    (params.buy !== null && params.sell === undefined) ||
                    (params.buy === undefined && params.sell !== null)
                ) {
                    bot.sendMessage(steamID, `❌ You must include both buying and selling prices.`);
                    return;
                }
            }
        } else if (params.withoutgroup) {
            // reverse of withgroup
            targetedPricelist = pricelist.filter(entry =>
                entry.group ? ![params.withoutgroup.toLowerCase()].includes(entry.group.toLowerCase()) : true
            );
            unTargetedPricelist = pricelist.filter(entry =>
                entry.group ? [params.withoutgroup.toLowerCase()].includes(entry.group.toLowerCase()) : false
            );

            if (targetedPricelist.length === 0) {
                bot.sendMessage(
                    steamID,
                    `❌ There is no entry other than "${params.withoutgroup}" group found in your pricelist.`
                );
                return;
            }

            newPricelist = targetedPricelist;

            if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                if (new Currencies(params.buy) >= new Currencies(params.sell)) {
                    bot.sendMessage(steamID, `❌ Buying price can't be higher than selling price.`);
                    return;
                } else if (
                    (params.buy !== null && params.sell === undefined) ||
                    (params.buy === undefined && params.sell !== null)
                ) {
                    bot.sendMessage(steamID, `❌ You must include both buying and selling prices.`);
                    return;
                }
            }
        } else {
            newPricelist = pricelist;

            if (bot.options.enableAutoKeys) {
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
            bot.sendMessage(steamID, 'Your pricelist is empty.');
            return;
        }

        if (!params.withgroup) {
            if (typeof params.note === 'object') {
                bot.sendMessage(
                    steamID,
                    `❌ Please specify "withgroup" to change note.\nExample: "!update all=true&withgroup=<groupName>&note.buy=<yourNote>"`
                );
                return;
            }

            if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                bot.sendMessage(
                    steamID,
                    `❌ Please specify "withgroup" to change buying/selling price.\nExample:\n` +
                        `"!update all=true&withgroup=<groupName>&(buy.keys|buy.metal)=<buyingPrice>&(sell.keys|sell.metal)=<sellingPrice>"`
                );
                return;
            }
        }

        newPricelist.forEach((entry, i) => {
            if (params.intent || params.intent === 0) {
                entry.intent = params.intent as 0 | 1 | 2;
            }

            if (params.min === 0 || typeof params.min === 'number') {
                entry.min = params.min;
            }

            if (params.max === 0 || typeof params.max === 'number') {
                entry.max = params.max;
            }

            if (typeof params.enabled === 'boolean') {
                entry.enabled = params.enabled;
            }

            if (params.group) {
                entry.group = params.group.toString();
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
                    entry.autoprice = false;
                }
                entry.autoprice = params.autoprice;
            }

            if (params.withgroup) {
                if (typeof params.note === 'object') {
                    // can change note if have withgroup parameter
                    entry.note.buy = params.note.buy || null;
                    entry.note.sell = params.note.sell || null;
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
            bot.getHandler().onPricelist(newPricelist);
            bot.sendMessage(steamID, '✅ Updated pricelist!');
            bot.listings.redoListings().asCallback();
            return;
        }

        bot.sendMessage(steamID, '⌛ Updating prices...');

        bot.pricelist
            .setupPricelist()
            .then(() => {
                bot.sendMessage(steamID, '✅ Updated pricelist!');
                bot.listings.redoListings().asCallback();
            })
            .catch(err => {
                log.warn('Failed to update prices: ', err);
                bot.sendMessage(steamID, `❌ Failed to update prices: ${err.message}`);
                return;
            });
        return;
    }

    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        return;
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
            } // else if false, just ignore it.
        } else {
            // else if it's not a boolean type, then send message.
            bot.sendMessage(steamID, '❌ "resetgroup" must be either "true" or "false".');
            return;
        }

        // delete resetgroup key from params so it will not trying to be added into pricelist (validator error)
        delete params.resetgroup;
    }

    if (params.item !== undefined) {
        // Remove by full name
        let match = bot.pricelist.searchByName(params.item as string, false);

        if (match === null) {
            bot.sendMessage(steamID, `❌ I could not find any items in my pricelist that contain "${params.item}"`);
            return;
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

            bot.sendMessage(steamID, reply);
            return;
        }

        delete params.item;
        params.sku = match.sku;
    } else if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);

        if (item === null) {
            return;
        }

        params.sku = SKU.fromObject(item);
    }

    if (!bot.pricelist.hasPrice(params.sku as string)) {
        bot.sendMessage(steamID, '❌ Item is not in the pricelist.');
        return;
    }

    const itemEntry = bot.pricelist.getPrice(params.sku as string, false);

    if (typeof params.note === 'object') {
        params.note.buy = (params.note.buy === '' ? null : params.note.buy) || itemEntry.note.buy;
        params.note.sell = (params.note.sell === '' ? null : params.note.sell) || itemEntry.note.sell;
    }

    if (params.removenote) {
        // removenote to set both note.buy and note.sell to null.
        if (typeof params.removenote === 'boolean') {
            if (params.removenote === true) {
                params.note = { buy: null, sell: null };
            }
        } else {
            bot.sendMessage(steamID, '❌ "removenote" must be either "true" or "false".');
            return;
        }
        delete params.removenote;
    }

    if (params.removebuynote && params.removesellnote) {
        bot.sendMessage(
            steamID,
            '❌ Please only use either "removebuynote" or "removesellnote", not both, or if you wish to remove both buy and sell note, please use "removenote".'
        );
        return;
    }

    if (params.removebuynote) {
        if (typeof params.removebuynote === 'boolean') {
            if (params.removebuynote === true) {
                params.note = { buy: null, sell: itemEntry.note.sell };
            }
        } else {
            bot.sendMessage(steamID, '❌ "removebuynote" must be either "true" or "false".');
            return;
        }
        delete params.removebuynote;
    }

    if (params.removesellnote) {
        if (typeof params.removesellnote === 'boolean') {
            if (params.removesellnote === true) {
                params.note = { buy: itemEntry.note.buy, sell: null };
            }
        } else {
            bot.sendMessage(steamID, '❌ "removesellnote" must be either "true" or "false".');
            return;
        }
        delete params.removesellnote;
    }

    const entryData = bot.pricelist.getPrice(params.sku as string, false).getJSON();

    delete entryData.time;
    delete params.sku;

    if (Object.keys(params).length === 0) {
        bot.sendMessage(steamID, '⚠️ Missing properties to update.');
        return;
    }

    // Update entry
    for (const property in params) {
        if (!Object.prototype.hasOwnProperty.call(params, property)) {
            continue;
        }

        entryData[property] = params[property];
    }

    bot.pricelist
        .updatePrice(entryData, true, PricelistChangedSource.Command)
        .then(entry => {
            const amount = bot.inventoryManager.getInventory().getAmount(entry.sku);
            const keyPrice = bot.pricelist.getKeyPrice();
            bot.sendMessage(
                steamID,
                `✅ Updated "${entry.name}"` +
                    `\n💲 Buy: ${
                        itemEntry.buy.toValue(keyPrice.metal) !== entry.buy.toValue(keyPrice.metal)
                            ? `${itemEntry.buy} → ${entry.buy}`
                            : entry.buy
                    } | Sell: ${
                        itemEntry.sell.toValue(keyPrice.metal) !== entry.sell.toValue(keyPrice.metal)
                            ? `${itemEntry.sell} → ${entry.sell}`
                            : entry.sell
                    }` +
                    `\n📦 Stock: ${amount}` +
                    ` | Min: ${itemEntry.min !== entry.min ? `${itemEntry.min} → ${entry.min}` : entry.min} | Max: ${
                        itemEntry.max !== entry.max ? `${itemEntry.max} → ${entry.max}` : entry.max
                    }` +
                    `\n🛒 Intent: ${
                        itemEntry.intent !== entry.intent
                            ? `${itemEntry.intent === 2 ? 'bank' : itemEntry.intent === 1 ? 'sell' : 'buy'} → ${
                                  entry.intent === 2 ? 'bank' : entry.intent === 1 ? 'sell' : 'buy'
                              }`
                            : `${itemEntry.intent === 2 ? 'bank' : itemEntry.intent === 1 ? 'sell' : 'buy'}`
                    }` +
                    `\n📋 Enabled: ${
                        itemEntry.enabled !== entry.enabled
                            ? `${itemEntry.enabled ? '✅' : '❌'} → ${entry.enabled ? '✅' : '❌'}`
                            : `${entry.enabled ? '✅' : '❌'}`
                    }` +
                    `\n🔄 Autoprice: ${
                        itemEntry.autoprice !== entry.autoprice
                            ? `${itemEntry.autoprice ? '✅' : '❌'} → ${entry.autoprice ? '✅' : '❌'}`
                            : `${entry.autoprice ? '✅' : '❌'}`
                    }` +
                    `${
                        entry.group !== 'all'
                            ? `\n🔰 Group: ${
                                  itemEntry.group !== entry.group ? `${itemEntry.group} → ${entry.group}` : entry.group
                              }`
                            : ''
                    }` +
                    `${entry.note.buy !== null ? `\n📥 Custom buying note: ${entry.note.buy}` : ''}` +
                    `${entry.note.sell !== null ? `\n📤 Custom selling note: ${entry.note.sell}` : ''}`
            );
        })
        .catch(err => {
            bot.sendMessage(
                steamID,
                '❌ Failed to update pricelist entry: ' +
                    (err.body && err.body.message ? err.body.message : err.message)
            );
        });
}

export function removeCommand(steamID: SteamID, message: string, bot: Bot): void {
    message = removeLinkProtocol(message);
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    if (params.all === true) {
        // Remove entire pricelist
        const pricelistLength = bot.pricelist.getLength();

        if (pricelistLength === 0) {
            bot.sendMessage(steamID, '❌ Your pricelist is already empty!');
            return;
        }

        const pricelist = bot.pricelist.getPrices();

        let newPricelist: Entry[] = [];
        let newPricelistCount: Entry[] = [];

        if (params.withgroup && params.withoutgroup) {
            bot.sendMessage(
                steamID,
                `❌ Don't be dumb. Please choose only "withgroup" OR "withoutgroup", not both. Thanks.`
            );
            return;
        }

        if (params.withgroup) {
            // first filter out pricelist with ONLY "withgroup" value.
            newPricelistCount = pricelist.filter(entry =>
                entry.group ? [params.withgroup.toLowerCase()].includes(entry.group.toLowerCase()) : false
            );

            if (newPricelistCount.length === 0) {
                bot.sendMessage(
                    steamID,
                    `❌ There is no entry with "${params.withgroup}" group found in your pricelist.`
                );
                return;
            }

            // then filter out pricelist with NOT "withgroup" value.
            newPricelist = pricelist.filter(entry =>
                entry.group ? ![params.withgroup.toLowerCase()].includes(entry.group.toLowerCase()) : true
            );
        } else if (params.withoutgroup) {
            // reverse of withgroup
            newPricelistCount = pricelist.filter(entry =>
                entry.group ? ![params.withoutgroup.toLowerCase()].includes(entry.group.toLowerCase()) : true
            );

            if (newPricelistCount.length === 0) {
                bot.sendMessage(
                    steamID,
                    `❌ There is no entry other than "${params.withoutgroup}" group found in your pricelist.`
                );
                return;
            }

            newPricelist = pricelist.filter(entry =>
                entry.group ? [params.withoutgroup.toLowerCase()].includes(entry.group.toLowerCase()) : false
            );
        } else {
            newPricelistCount = pricelist;
        }

        if (params.i_am_sure !== 'yes_i_am') {
            bot.sendMessage(
                steamID,
                '/pre ⚠️ Are you sure that you want to remove ' +
                    pluralize('item', newPricelistCount.length, true) +
                    '? Try again with i_am_sure=yes_i_am'
            );
            return;
        }

        if (params.withgroup || params.withoutgroup) {
            bot.pricelist
                .removeByGroup(newPricelist)
                .then(() => {
                    bot.sendMessage(steamID, `✅ Removed ${newPricelistCount.length} items from pricelist.`);
                    bot.listings.redoListings().asCallback();
                })
                .catch(err => {
                    bot.sendMessage(steamID, `❌ Failed to clear pricelist: ${err.message}`);
                });
            return;
        } else {
            bot.pricelist
                .removeAll()
                .then(() => {
                    bot.sendMessage(steamID, '✅ Cleared pricelist!');
                })
                .catch(err => {
                    bot.sendMessage(steamID, `❌ Failed to clear pricelist: ${err.message}`);
                });
            return;
        }
    }

    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        return;
    }

    if (params.item !== undefined) {
        // Remove by full name
        let match = bot.pricelist.searchByName(params.item as string, false);

        if (match === null) {
            bot.sendMessage(steamID, `❌ I could not find any items in my pricelist that contain "${params.item}"`);
            return;
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

            bot.sendMessage(steamID, reply);
            return;
        }

        delete params.item;
        params.sku = match.sku;
    } else if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);

        if (item === null) {
            return;
        }

        params.sku = SKU.fromObject(item);
    }

    bot.pricelist
        .removePrice(params.sku as string, true)
        .then(entry => {
            bot.sendMessage(steamID, `✅ Removed "${entry.name}".`);
        })
        .catch(err => {
            bot.sendMessage(steamID, `❌ Failed to remove pricelist entry: ${err.message}`);
        });
}

export function getCommand(steamID: SteamID, message: string, bot: Bot): void {
    message = removeLinkProtocol(message);
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        return;
    }

    if (params.item !== undefined) {
        // Remove by full name
        let match = bot.pricelist.searchByName(params.item as string, false);

        if (match === null) {
            bot.sendMessage(steamID, `❌ I could not find any items in my pricelist that contain "${params.item}"`);
            return;
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

            bot.sendMessage(steamID, reply);
            return;
        }

        delete params.item;
        params.sku = match.sku;
    } else if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);

        if (item === null) {
            return;
        }

        params.sku = SKU.fromObject(item);
    }

    if (params.sku === undefined) {
        bot.sendMessage(steamID, '❌ Missing item');
        return;
    }

    const match = bot.pricelist.getPrice(params.sku as string);

    if (match === null) {
        bot.sendMessage(steamID, `❌ Could not find item "${params.sku}" in the pricelist`);
    } else {
        bot.sendMessage(steamID, `/code ${JSON.stringify(match, null, 4)}`);
    }
}

export function findCommand(steamID: SteamID, message: string, bot: Bot): void {
    const params = CommandParser.parseParams(CommandParser.removeCommand(message));

    if (
        !(
            params.enabled !== undefined ||
            params.max !== undefined ||
            params.min !== undefined ||
            params.intent !== undefined ||
            params.autoprice !== undefined ||
            params.group !== undefined
        )
    ) {
        bot.sendMessage(
            steamID,
            '⚠️ Only parameters available for !find command: enabled, max, min, intent, autoprice or group\nExample: !find intent=bank&max=2'
        );
        return;
    }

    const pricelist = bot.pricelist.getPrices();
    let filter = pricelist;

    if (params.enabled !== undefined) {
        if (typeof params.enabled !== 'boolean') {
            bot.sendMessage(steamID, '⚠️ enabled parameter must be "true" or "false"');
            return;
        }
        filter = filter.filter(entry => entry.enabled === params.enabled);
    }

    if (params.max !== undefined) {
        if (typeof params.max !== 'number') {
            bot.sendMessage(steamID, '⚠️ max parameter must be an integer');
            return;
        }
        filter = filter.filter(entry => entry.max === params.max);
    }

    if (params.min !== undefined) {
        if (typeof params.min !== 'number') {
            bot.sendMessage(steamID, '⚠️ min parameter must be an integer');
            return;
        }
        filter = filter.filter(entry => entry.min === params.min);
    }

    if (params.intent !== undefined) {
        if (typeof params.intent === 'string') {
            const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());
            if (intent !== -1) {
                params.intent = intent;
            }
        }

        if (typeof params.intent !== 'number' || params.intent < 0) {
            bot.sendMessage(
                steamID,
                '⚠️ intent parameter must be "buy", "sell", or "bank" OR an integer of "0", "1" or "2" respectively'
            );
            return;
        }
        filter = filter.filter(entry => entry.intent === params.intent);
    }

    if (params.autoprice !== undefined) {
        if (typeof params.autoprice !== 'boolean') {
            bot.sendMessage(steamID, '⚠️ autoprice parameter must be "true" or "false"');
            return;
        }
        filter = filter.filter(entry => entry.autoprice === params.autoprice);
    }

    if (params.group !== undefined) {
        if (typeof params.group !== 'string') {
            bot.sendMessage(steamID, '⚠️ group parameter must be a string');
            return;
        }
        filter = filter.filter(entry => entry.group === params.group);
    }

    const parametersUsed = {
        enabled: params.enabled !== undefined ? 'enabled=' + params.enabled.toString() : '',
        autoprice: params.autoprice !== undefined ? 'autoprice=' + params.autoprice.toString() : '',
        max: params.max !== undefined ? 'max=' + params.max.toString() : '',
        min: params.min !== undefined ? 'min=' + params.min.toString() : '',
        intent: params.intent !== undefined ? 'intent=' + params.intent.toString() : '',
        group: params.group !== undefined ? 'group=' + params.group.toString() : ''
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
        bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(0, 20), null, 4)}`);
        if (length <= 40) {
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(20, length > 40 ? 40 : length), null, 4)}`);
        } else if (length <= 60) {
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(20, 40), null, 4)}`);
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(40, length > 60 ? 60 : length), null, 4)}`);
        } else if (length <= 80) {
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(20, 40), null, 4)}`);
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(40, 60), null, 4)}`);
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(60, length > 80 ? 80 : length), null, 4)}`);
        } else if (length > 80) {
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(20, 40), null, 4)}`);
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(40, 60), null, 4)}`);
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(60, 80), null, 4)}`);
            bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(80, length > 100 ? 100 : length), null, 4)}`);
        }
    } else {
        bot.sendMessage(steamID, `Found ${pluralize('item', filter.length, true)} with ${display.join('&')}`);
        bot.sendMessage(steamID, `/code ${JSON.stringify(filter, null, 4)}`);
    }
}
