/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import SteamID from 'steamid';
import SKU from '@tf2autobot/tf2-sku';
import Currencies from '@tf2autobot/tf2-currencies';
import pluralize from 'pluralize';
import dayjs from 'dayjs';
import * as timersPromises from 'timers/promises';
import { UnknownDictionary, UnknownDictionaryKnownValues } from '../../../types/common';
import { removeLinkProtocol, getItemFromParams } from '../functions/utils';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import Pricelist, { Entry, EntryData, PricelistChangedSource } from '../../Pricelist';
import validator from '../../../lib/validator';
import { testPriceKey } from '../../../lib/tools/export';
import IPricer from '../../IPricer';
import { Currency } from 'src/types/TeamFortress2';

// Pricelist manager

export default class PricelistManagerCommands {
    stopAutoAddCommand(): void {
        AutoAddQueue.stopJob();
    }

    static isSending = false;

    static isBulkOperation = false;

    constructor(private readonly bot: Bot, private priceSource: IPricer) {
        this.bot = bot;
    }

    async addCommand(steamID: SteamID, message: string): Promise<void> {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.enabled === undefined) {
            params.enabled = true;
        }

        if (params.min === undefined) {
            params.min = 0;
        }

        if (params.max === undefined) {
            params.max = 1;
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
        } else if (typeof params.buy !== 'object' && typeof params.sell === 'object') {
            params['buy'] = {
                keys: 0,
                metal: 0
            };
        }

        if (typeof params.sell === 'object') {
            params.sell.keys = params.sell.keys || 0;
            params.sell.metal = params.sell.metal || 0;

            if (params.autoprice === undefined) {
                params.autoprice = false;
            }
        } else if (typeof params.sell !== 'object' && typeof params.buy === 'object') {
            params['sell'] = {
                keys: 0,
                metal: 0
            };
        }

        const isPremium = this.bot.handler.getBotInfo.premium;
        if (params.promoted !== undefined) {
            if (!isPremium) {
                return this.bot.sendMessage(
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
                    return this.bot.sendMessage(
                        steamID,
                        '❌ "promoted" parameter must be either 0 (false) or 1 (true)'
                    );
                } else if (params.promoted < 0 || params.promoted > 1) {
                    return this.bot.sendMessage(
                        steamID,
                        '❌ "promoted" parameter must be either 0 (false) or 1 (true)'
                    );
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
            params.group = String(params.group);
        }

        if (params.group === undefined) {
            // If group parameter is not defined, set it to null.
            params['group'] = 'all';
        }

        if (params.autoprice === undefined) {
            params.autoprice = true;
        }

        if (params.isPartialPriced === undefined) {
            params.isPartialPriced = false;
        }

        if (params.sku !== undefined && !testPriceKey(params.sku as string)) {
            return this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        }

        if (params.sku === undefined) {
            if (params.item !== undefined) {
                params.sku = this.bot.schema.getSkuFromName(params.item as string);

                if ((params.sku as string).includes('null') || (params.sku as string).includes('undefined')) {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ The sku for "${params.item as string}" returned "${params.sku as string}".` +
                            `\nIf the item name is correct, please let us know in our Discord server.`
                    );
                }

                delete params.item;
            } else {
                const item = getItemFromParams(steamID, params, this.bot);

                if (item === null) {
                    return this.bot.sendMessage(steamID, `❌ No item found to match parameters given check sku or id.`);
                }

                params.sku = SKU.fromObject(item);
            }
        }

        let priceKey: string = undefined;
        if (params.id) {
            priceKey = String(params.id);
            params.id = String(params.id);
            // force intent sell for assetid added
            params.intent = 1;
        }
        priceKey = priceKey ? priceKey : params.sku;
        return this.bot.pricelist
            .addPrice({ entryData: params as EntryData, emitChange: true, src: PricelistChangedSource.Command })
            .then(entry => {
                this.bot.sendMessage(
                    steamID,
                    `✅ Added "${entry.name}" (${priceKey})` + generateAddedReply(this.bot, isPremium, entry)
                );
            })
            .catch(err => {
                this.bot.sendMessage(steamID, `❌ Failed to add the item to the pricelist: ${(err as Error).message}`);
            });
    }

    async addbulkCommand(steamID: SteamID, message: string): Promise<void> {
        if (PricelistManagerCommands.isBulkOperation) {
            return this.bot.sendMessage(
                steamID,
                `❌ Bulk operation is still in progress. Please wait until it's completed.`
            );
        }

        const commandRemoved = CommandParser.removeCommand(removeLinkProtocol(message));

        if (!commandRemoved.includes('\n')) {
            return this.bot.sendMessage(
                steamID,
                `❌ Incorrect usage. If you want to only add one item, please use the !add command.\n` +
                    `Correct usage example: !addbulk sku=5021;6\nsku=30186;6&intent=buy\nsku=30994;6&sell.metal=4&buy.metal=1\n...` +
                    `(separated by a new line)`
            );
        }

        const itemsToAdd = commandRemoved.split('\n').filter(itemString => itemString !== '');
        const count = itemsToAdd.length;
        const errorMessage: string[] = [];
        const savedParams: { priceKey: string; params: EntryData }[] = [];
        let failed = 0;
        let failedNotUsingItemOrSkuParam = 0;

        const isPremium = this.bot.handler.getBotInfo.premium;
        for (let i = 0; i < count; i++) {
            const itemToAdd = itemsToAdd[i];

            const params = CommandParser.parseParams(itemToAdd);

            if (params.isPartialPriced !== undefined) {
                return this.bot.sendMessage(steamID, `❌ Cannot set "isPartialPriced" parameter!`);
            }

            params.isPartialPriced = false;

            if (params.sku !== undefined && !testPriceKey(params.sku as string)) {
                errorMessage.push(
                    `❌ Failed to add ${params.sku as string}: "sku" should not be empty or wrong format.`
                );
                failed++;
                continue;
            }

            if (params.sku === undefined) {
                if (params.item !== undefined) {
                    params.sku = this.bot.schema.getSkuFromName(params.item as string);

                    if ((params.sku as string).includes('null') || (params.sku as string).includes('undefined')) {
                        errorMessage.push(
                            `❌ Failed to add ${params.sku as string}: The sku for "${
                                params.item as string
                            }" returned "${params.sku as string}".` +
                                `\nIf the item name is correct, please let us know in our Discord server.`
                        );
                        failed++;
                        continue;
                    }

                    delete params.item;
                } else {
                    errorMessage.push(
                        `❌ Failed to add "${itemToAdd}": Please only use "sku" or "item" parameter, ` +
                            `OR check if you have missing something. Thank you.`
                    );
                    failed++;
                    failedNotUsingItemOrSkuParam++;
                    continue;
                }
            }

            if (params.enabled === undefined) {
                params.enabled = true;
            }

            if (params.min === undefined) {
                params.min = 0;
            }

            if (params.max === undefined) {
                params.max = 1;
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
            } else if (typeof params.buy !== 'object' && typeof params.sell === 'object') {
                params['buy'] = {
                    keys: 0,
                    metal: 0
                };
            }

            if (typeof params.sell === 'object') {
                params.sell.keys = params.sell.keys || 0;
                params.sell.metal = params.sell.metal || 0;

                if (params.autoprice === undefined) {
                    params.autoprice = false;
                }
            } else if (typeof params.sell !== 'object' && typeof params.buy === 'object') {
                params['sell'] = {
                    keys: 0,
                    metal: 0
                };
            }

            if (params.promoted !== undefined) {
                if (!isPremium) {
                    errorMessage.push(
                        `❌ Failed to add ${this.bot.schema.getName(SKU.fromString(params.sku as string))} (${
                            params.sku as string
                        }): This account is not Backpack.tf Premium. You can't use "promoted" parameter.`
                    );
                    failed++;
                    continue;
                }

                if (typeof params.promoted === 'boolean') {
                    if (params.promoted === true) {
                        params.promoted = 1;
                    } else {
                        params.promoted = 0;
                    }
                } else if (typeof params.promoted !== 'number' || params.promoted < 0 || params.promoted > 1) {
                    errorMessage.push(
                        `❌ Failed to add ${this.bot.schema.getName(SKU.fromString(params.sku as string))} (${
                            params.sku as string
                        }): "promoted" parameter must be either 0 (false) or 1 (true)`
                    );
                    failed++;
                    continue;
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
                params.group = String(params.group);
            }

            if (params.group === undefined) {
                // If group parameter is not defined, set it to null.
                params['group'] = 'all';
            }

            if (params.autoprice === undefined) {
                params.autoprice = true;
            }

            let priceKey: string = undefined;
            if (params.id) {
                priceKey = String(params.id);
                params.id = String(params.id);
            }
            priceKey = priceKey ? priceKey : params.sku;

            savedParams.push({ priceKey, params: params as EntryData });
        }

        if (failedNotUsingItemOrSkuParam === count) {
            return this.bot.sendMessage(
                steamID,
                `❌ Bulk add operation aborted: Please only use "sku" or "item" as the item identifying paramater. Thank you.`
            );
        }

        let added = 0;

        async function sendErrors(bot: Bot): Promise<void> {
            const errorCount = errorMessage.length;
            if (errorCount > 0) {
                const limit = 10;

                const loops = Math.ceil(errorCount / limit);

                for (let i = 0; i < loops; i++) {
                    const last = loops - i === 1;
                    const i10 = i * limit;

                    const firstOrLast = i < 1 ? limit : i10 + (errorCount - i10);

                    bot.sendMessage(steamID, errorMessage.slice(i10, last ? firstOrLast : (i + 1) * limit).join('\n'));

                    await timersPromises.setTimeout(3000);
                }
            }

            PricelistManagerCommands.isSending = false;
        }

        let isHasAutoprice = false;
        const count2 = savedParams.length;

        // yes it's longer, but much better than using Array.some() method
        for (let i = 0; i < count2; i++) {
            if (savedParams[i].params.autoprice) {
                isHasAutoprice = true;
                break;
            }
        }

        PricelistManagerCommands.isBulkOperation = true;

        if (isHasAutoprice) {
            try {
                this.bot.sendMessage(steamID, `⌛ Getting pricelist from the pricer...`);
                const pricerPricelist = await this.priceSource.getPricelist();
                const items = pricerPricelist.items;

                this.bot.sendMessage(steamID, `⌛ Got pricer pricelist, adding items to our pricelist...`);

                for (let i = 0; i < count2; i++) {
                    const entry = savedParams[i];
                    const isLast = count2 - i === 1;

                    this.bot.pricelist
                        .addPrice({
                            entryData: entry.params,
                            emitChange: true,
                            src: PricelistChangedSource.Command,
                            isBulk: true,
                            pricerItems: items,
                            isLast: isLast
                        })
                        .then(() => added++)
                        .catch(err => {
                            errorMessage.push(
                                `❌ Error adding ${this.bot.schema.getName(SKU.fromString(entry.params.sku))} (${
                                    entry.params.sku
                                }): ${(err as Error)?.message}`
                            );
                            failed++;
                        })
                        .finally(() => {
                            if (isLast) {
                                PricelistManagerCommands.isSending = true;
                                this.bot.sendMessage(
                                    steamID,
                                    `✅ Bulk add successful: ${added} added, ${failed} failed`
                                );

                                void sendErrors(this.bot);

                                PricelistManagerCommands.isBulkOperation = false;
                            }
                        });
                }
            } catch (err) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Bulk add operation aborted: Failed to obtain pricelist from pricer: ${(err as Error)?.message}`
                );
            }
        } else {
            for (let i = 0; i < count2; i++) {
                const entry = savedParams[i];
                const isLast = count2 - i === 1;

                this.bot.pricelist
                    .addPrice({
                        entryData: entry.params,
                        emitChange: true,
                        src: PricelistChangedSource.Command,
                        isBulk: true
                    })
                    .then(() => added++)
                    .catch(err => {
                        errorMessage.push(
                            `❌ Error adding ${this.bot.schema.getName(SKU.fromString(entry.params.sku))} (${
                                entry.params.sku
                            }): ${(err as Error)?.message}`
                        );
                        failed++;
                    })
                    .finally(() => {
                        if (isLast) {
                            PricelistManagerCommands.isSending = true;
                            this.bot.sendMessage(steamID, `✅ Bulk add successful: ${added} added, ${failed} failed`);

                            void sendErrors(this.bot);

                            PricelistManagerCommands.isBulkOperation = false;
                        }
                    });
            }
        }
    }

    autoAddCommand(steamID: SteamID, message: string, prefix: string): void {
        if (AutoAddQueue.isRunning()) {
            return this.bot.sendMessage(
                steamID,
                `❌ Autoadd is still running. Please wait until it's completed or send !stopautoadd to stop.`
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

        if (params.isPartialPriced !== undefined) {
            return this.bot.sendMessage(steamID, `❌ Cannot set "isPartialPriced" parameter!`);
        }

        if (params.sku !== undefined || params.name !== undefined || params.defindex !== undefined) {
            return this.bot.sendMessage(
                steamID,
                `❌ Please only define item listing settings parameters, more info:` +
                    ` https://github.com/TF2Autobot/tf2autobot/wiki/Listing-settings-parameters`
            );
        }

        if (!params) {
            this.bot.sendMessage(steamID, `⏳ Adding all items with default settings...`);
        }

        if (params.enabled === undefined) {
            params.enabled = true;
        }

        if (params.min === undefined) {
            params.min = 0;
        }

        if (params.max === undefined) {
            params.max = 1;
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
        } else if (typeof params.buy !== 'object' && typeof params.sell === 'object') {
            params['buy'] = {
                keys: 0,
                metal: 0
            };
        }

        if (typeof params.sell === 'object') {
            params.sell.keys = params.sell.keys || 0;
            params.sell.metal = params.sell.metal || 0;

            if (params.autoprice === undefined) {
                params.autoprice = false;
            }
        } else if (typeof params.sell !== 'object' && typeof params.buy === 'object') {
            params['sell'] = {
                keys: 0,
                metal: 0
            };
        }

        if (
            (params.sell !== undefined && params.buy === undefined) ||
            (params.sell === undefined && params.buy !== undefined)
        ) {
            return this.bot.sendMessage(steamID, `❌ Please set both buy and sell prices.`);
        }

        const isPremium = this.bot.handler.getBotInfo.premium;

        if (params.promoted !== undefined) {
            if (!isPremium) {
                return this.bot.sendMessage(
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
                    return this.bot.sendMessage(
                        steamID,
                        '❌ "promoted" parameter must be either 0 (false) or 1 (true)'
                    );
                }

                if (params.promoted < 0 || params.promoted > 1) {
                    return this.bot.sendMessage(
                        steamID,
                        '❌ "promoted" parameter must be either 0 (false) or 1 (true)'
                    );
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
            params.group = String(params.group);
        }

        if (params.group === undefined) {
            // If group parameter is not defined, set it to null.
            params['group'] = 'all';
        }

        if (params.autoprice === undefined) {
            params.autoprice = true;
        }

        const pricelist = this.bot.pricelist.getPrices;
        const skusFromPricelist = Object.keys(pricelist);

        const dict = this.bot.inventoryManager.getInventory.getItems;
        const clonedDict = Object.assign({}, dict);

        const pureAndWeapons = ['5021;6', '5000;6', '5001;6', '5002;6'].concat(
            this.bot.craftWeapons.concat(this.bot.uncraftWeapons)
        );

        for (const sku in clonedDict) {
            if (!Object.prototype.hasOwnProperty.call(clonedDict, sku)) {
                continue;
            }

            if (pureAndWeapons.includes(sku)) {
                delete clonedDict[sku];
            }
        }

        const skus = Object.keys(clonedDict);
        const total = skus.length;

        const totalTime = total * (params.autoprice ? 2 : 1) * 1000;
        const aSecond = 1000;
        const aMin = 60 * 1000;
        const anHour = 60 * 60 * 1000;

        this.bot.sendMessage(
            steamID,
            `⏳ Running automatic add items... Total items to add: ${total}` +
                `\n${params.autoprice ? 2 : 1} seconds in between items, so it will be about ${
                    totalTime < aMin
                        ? `${Math.round(totalTime / aSecond)} seconds`
                        : totalTime < anHour
                        ? `${Math.round(totalTime / aMin)} minutes`
                        : `${Math.round(totalTime / anHour)} hours`
                } to complete. Send "${prefix}stopautoadd" to abort.`
        );

        const autoAdd = new AutoAddQueue(this.bot, steamID, skusFromPricelist, params, isPremium);
        AutoAddQueue.addJob();

        autoAdd.enqueue = skus;
        void autoAdd.executeAutoAdd();
    }

    async updateCommand(steamID: SteamID, message: string, prefix: string): Promise<void> {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

        if (params.isPartialPriced !== undefined && params.isPartialPriced === true) {
            // Only disable
            return this.bot.sendMessage(steamID, `❌ Cannot update "isPartialPriced" parameter to true!`);
        }

        if (typeof params.intent === 'string') {
            const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());

            if (intent !== -1) {
                params.intent = intent;
            }
        }

        if (params.all === true) {
            //Check for invalid usages first
            if (!params.withgroup && !params.withoutgroup) {
                if (typeof params.note === 'object') {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ Please specify "withgroup" or "withoutgroup" to change note.` +
                            `\nExample: "${prefix}update all=true&withgroup=<groupName>&note.buy=<yourNote>"`
                    );
                }

                if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ Please specify "withgroup" or "withoutgroup" to change buying/selling price.\nExample:\n` +
                            `"${prefix}update all=true&withgroup=<groupName>&(buy.keys|buy.metal)=<buyingPrice>&(sell.keys|sell.metal)=<sellingPrice>"`
                    );
                }
            }
            if (params.promoted) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Parameter "promoted" can't be used with "${prefix}update all=true".`
                );
            }

            if (params.withgroup && params.withoutgroup) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Don't be dumb. Please choose only "withgroup" OR "withoutgroup", not both. Thanks.`
                );
            }
            const keyPrice = this.bot.pricelist.getKeyPrice;
            if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                if (
                    (params.buy !== null && params.sell === undefined) ||
                    (params.buy === undefined && params.sell !== null)
                ) {
                    return this.bot.sendMessage(steamID, `❌ You must include both buying and selling prices.`);
                } else if (
                    new Currencies(params.buy as Currency).toValue(keyPrice.metal) >=
                    new Currencies(params.sell as Currency).toValue(keyPrice.metal)
                ) {
                    return this.bot.sendMessage(steamID, `❌ Buying price can't be higher than selling price.`);
                }
            }
            // TODO: Must have at least one other param

            const pricelist = this.bot.pricelist.getPrices;

            if (Object.keys(pricelist).length === 0) {
                return this.bot.sendMessage(steamID, 'Your pricelist is empty.');
            }

            let changed = false;
            for (const sku in pricelist) {
                if (!Object.prototype.hasOwnProperty.call(pricelist, sku)) {
                    continue;
                }

                const entry = pricelist[sku];
                if (params.withgroup && entry.group !== params.withgroup) {
                    continue;
                }

                if (params.withoutgroup && entry.group === params.withoutgroup) {
                    continue;
                }

                // Autokeys is a feature, so when updating multiple entry with
                // "!update all=true", key entry will be removed from newPricelist.
                // https://github.com/TF2Autobot/tf2autobot/issues/131
                if (this.bot.options.autokeys.enable && sku == '5021;6') {
                    continue;
                }

                changed = true;

                if (params.intent || params.intent === 0) {
                    entry.intent = params.intent as 0 | 1 | 2;
                }

                if (typeof params.min === 'number') {
                    entry.min = params.min;
                }

                if (typeof params.max === 'number') {
                    entry.max = params.max;
                }

                if (typeof params.enabled === 'boolean') {
                    entry.enabled = params.enabled;
                }

                if (params.group) {
                    entry.group = String(params.group);
                }

                if (params.removenote === true) {
                    // Sending "!update all=true&removenote=true" will set both
                    // note.buy and note.sell for entire/withgroup entries to null.
                    entry.note.buy = null;
                    entry.note.sell = null;
                }

                if (params.resetgroup === true) {
                    entry.group = 'all';
                }

                if (typeof params.autoprice === 'boolean') {
                    if (params.autoprice === false) {
                        entry.time = null;
                    }

                    entry.autoprice = params.autoprice;
                }

                if (typeof params.isPartialPriced === 'boolean') {
                    entry.isPartialPriced = params.isPartialPriced;
                }

                if (params.withgroup || params.withoutgroup) {
                    if (typeof params.note === 'object') {
                        // can change note if have withgroup/withoutgroup parameter
                        entry.note.buy = params.note.buy || entry.note.buy;
                        entry.note.sell = params.note.sell || entry.note.sell;
                    }

                    if (typeof params.buy === 'object') {
                        entry.buy.keys = params.buy.keys || 0;
                        entry.buy.metal = params.buy.metal || 0;

                        if (params.autoprice === undefined) {
                            entry.autoprice = false;
                        }

                        entry.isPartialPriced = false;
                    }

                    if (typeof params.sell === 'object') {
                        entry.sell.keys = params.sell?.keys || 0;
                        entry.sell.metal = params.sell?.metal || 0;

                        if (params.autoprice === undefined) {
                            entry.autoprice = false;
                        }

                        entry.isPartialPriced = false;
                    }
                }

                pricelist[sku] = entry;
            }

            if (changed) {
                const errors = validator(pricelist, 'pricelist');
                if (errors !== null) {
                    throw new Error(errors.join(', '));
                }
            } else {
                if (params.withgroup) {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ There is no entry with "${params.withgroup as string}" group found in your pricelist.`
                    );
                } else if (params.withoutgroup) {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ There is no entry other than "${
                            params.withoutgroup as string
                        }" group found in your pricelist.`
                    );
                }
            }

            if (params.removenote) {
                delete params.removenote;
            }

            if (params.resetgroup) {
                delete params.resetgroup;
            }

            if (params.withgroup) {
                delete params.withgroup;
            }

            if (params.withoutgroup) {
                delete params.withoutgroup;
            }

            // FIXME: Make it so that it is not needed to remove all listings

            if (params.autoprice !== true) {
                await this.bot.handler.onPricelist(pricelist);
                this.bot.sendMessage(steamID, '✅ Updated pricelist!');

                return await this.bot.listings.redoListings();
            }

            this.bot.sendMessage(steamID, '⌛ Updating prices...');

            return this.bot.pricelist
                .setupPricelist()
                .then(async () => {
                    this.bot.sendMessage(steamID, '✅ Updated pricelist!');
                    await this.bot.listings.redoListings();
                })
                .catch(err => {
                    return this.bot.sendMessage(steamID, `❌ Failed to update prices: ${(err as Error).message}`);
                });
        }

        if (params.sku !== undefined && !testPriceKey(params.sku as string)) {
            return this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
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
                return this.bot.sendMessage(steamID, '❌ "resetgroup" must be either "true" or "false".');
            }
            // delete resetgroup key from params so it will not trying to be added into pricelist (validator error)
            delete params.resetgroup;
        }

        const isPremium = this.bot.handler.getBotInfo.premium;
        if (params.promoted !== undefined) {
            if (!isPremium) {
                return this.bot.sendMessage(
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
                    return this.bot.sendMessage(
                        steamID,
                        '❌ "promoted" parameter must be either 0 (false) or 1 (true)'
                    );
                }

                if (params.promoted < 0 || params.promoted > 1) {
                    return this.bot.sendMessage(
                        steamID,
                        '❌ "promoted" parameter must be either 0 (false) or 1 (true)'
                    );
                }
            }
        }

        if (params.item !== undefined) {
            // Remove by full name
            let match = this.bot.pricelist.searchByName(params.item as string, false);

            if (match === null) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ I could not find any items in my pricelist that contain "${params.item as string}"`
                );
            } else if (Array.isArray(match)) {
                const matchCount = match.length;
                if (matchCount > 20) {
                    match = match.splice(0, 20);
                }

                let reply = `I've found ${matchCount} items. Try with one of the items shown below:\n${match.join(
                    ',\n'
                )}`;

                if (matchCount > match.length) {
                    const other = matchCount - match.length;
                    reply += `,\nand ${other} other ${pluralize('item', other)}.`;
                }

                return this.bot.sendMessage(steamID, reply);
            }

            delete params.item;
            params.sku = match.sku;
        } else if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);

            if (item !== null) {
                params.sku = SKU.fromObject(item);
            }
        }

        let priceKey: string = undefined;
        if (params.id) {
            priceKey = String(params.id);
            params.id = String(params.id);
        }
        priceKey = priceKey ? priceKey : params.sku;

        if (!this.bot.pricelist.hasPrice({ priceKey })) {
            return this.bot.sendMessage(steamID, '❌ Item is not in the pricelist.');
        }

        const itemEntry = this.bot.pricelist.getPrice({ priceKey, onlyEnabled: false });

        if (typeof params.buy === 'object') {
            params.buy.keys = params.buy.keys || 0;
            params.buy.metal = params.buy.metal || 0;

            if (params.autoprice === undefined) {
                params.autoprice = false;
            }

            params.isPartialPriced = false;
        } else if (typeof params.buy !== 'object' && typeof params.sell === 'object') {
            params['buy'] = {
                keys: itemEntry.buy.keys,
                metal: itemEntry.buy.metal
            };
        }

        if (typeof params.sell === 'object') {
            params.sell.keys = params.sell.keys || 0;
            params.sell.metal = params.sell.metal || 0;

            if (params.autoprice === undefined) {
                params.autoprice = false;
            }

            params.isPartialPriced = false;
        } else if (typeof params.sell !== 'object' && typeof params.buy === 'object') {
            params['sell'] = {
                keys: itemEntry.sell.keys,
                metal: itemEntry.sell.metal
            };
        }

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
                return this.bot.sendMessage(steamID, '❌ "removenote" must be either "true" or "false".');
            }

            delete params.removenote;
        }

        if (params.removebuynote && params.removesellnote) {
            return this.bot.sendMessage(
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
                return this.bot.sendMessage(steamID, '❌ "removebuynote" must be either "true" or "false".');
            }

            delete params.removebuynote;
        }

        if (params.removesellnote) {
            if (typeof params.removesellnote === 'boolean') {
                if (params.removesellnote === true) {
                    params.note = { buy: itemEntry.note.buy, sell: null };
                }
            } else {
                return this.bot.sendMessage(steamID, '❌ "removesellnote" must be either "true" or "false".');
            }

            delete params.removesellnote;
        }

        if (params.group && typeof params.group !== 'string') {
            // if group parameter is defined, convert anything to string
            params.group = String(params.group);
        }

        const entryData = this.bot.pricelist.getPrice({ priceKey, onlyEnabled: false }).getJSON(); //TODO: CONTINUE
        delete entryData.time;
        delete params.sku;

        if (Object.keys(params).length === 0) {
            return this.bot.sendMessage(steamID, '⚠️ Missing properties to update.');
        }

        // Update entry
        for (const property in params) {
            if (!Object.prototype.hasOwnProperty.call(params, property)) {
                continue;
            }

            entryData[property] = params[property];
        }

        this.bot.pricelist
            .updatePrice({
                priceKey,
                entryData,
                emitChange: true,
                src: PricelistChangedSource.Command
            })
            .then(entry => {
                this.bot.sendMessage(
                    steamID,
                    `✅ Updated "${entry.name}" (${priceKey})` + this.generateUpdateReply(isPremium, itemEntry, entry)
                );
            })
            .catch((err: ErrorRequest) => {
                this.bot.sendMessage(
                    steamID,
                    '❌ Failed to update pricelist entry: ' +
                        (err.body && err.body.message ? err.body.message : err.message)
                );
            });
    }

    async updatebulkCommand(steamID: SteamID, message: string): Promise<void> {
        if (PricelistManagerCommands.isBulkOperation) {
            return this.bot.sendMessage(
                steamID,
                `❌ Bulk operation is still in progress. Please wait until it's completed.`
            );
        }

        const commandRemoved = CommandParser.removeCommand(removeLinkProtocol(message));

        if (!commandRemoved.includes('\n')) {
            return this.bot.sendMessage(
                steamID,
                `❌ Incorrect usage. If you want to only update one item, please use the !update command.\n` +
                    `Correct usage example: !updatebulk sku=5021;6\nsku=30186;6&intent=buy\nsku=30994;6&sell.metal=4&buy.metal=1\n...` +
                    `(separated by a new line)`
            );
        }

        const itemsToUpdate = commandRemoved.split('\n').filter(itemString => itemString !== '');
        const count = itemsToUpdate.length;
        const errorMessage: string[] = [];
        const savedEntryData: { priceKey: string; params: EntryData }[] = [];
        let failed = 0;
        let failedNotUsingItemOrSkuParam = 0;

        const isPremium = this.bot.handler.getBotInfo.premium;

        for (let i = 0; i < count; i++) {
            const itemToUpdate = itemsToUpdate[i];

            const params = CommandParser.parseParams(itemToUpdate);
            let sku = params.sku as string;

            if (params.isPartialPriced !== undefined && params.isPartialPriced === true) {
                return this.bot.sendMessage(steamID, `❌ Cannot update "isPartialPriced" parameter to true!`);
            }

            if (params.all !== undefined) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Bulk update operation aborted: "all" parameter can only be used with the !update command!`
                );
            }

            if (sku !== undefined && !testPriceKey(sku)) {
                errorMessage.push(`❌ Failed to update ${sku}: "sku" should not be empty or wrong format.`);
                failed++;
                continue;
            }

            if (sku === undefined) {
                if (params.item !== undefined) {
                    sku = this.bot.schema.getSkuFromName(params.item as string);

                    if (sku.includes('null') || sku.includes('undefined')) {
                        errorMessage.push(
                            `❌ Failed to update ${sku}: The sku for "${params.item as string}" returned "${sku}".` +
                                `\nIf the item name is correct, please let us know in our Discord server.`
                        );
                        failed++;
                        continue;
                    }

                    delete params.item;
                } else {
                    errorMessage.push(
                        `❌ Failed to update "${itemToUpdate}": Please only use "sku" or "item" parameter, ` +
                            `OR check if you have missing something. Thank you.`
                    );
                    failed++;
                    failedNotUsingItemOrSkuParam++;
                    continue;
                }
            }

            let priceKey: string = undefined;
            if (params.id) {
                priceKey = String(params.id);
                params.id = String(params.id);
            }
            priceKey = priceKey ? priceKey : sku;

            if (this.bot.pricelist.getPrice({ priceKey }) === null) {
                errorMessage.push(
                    `❌ Failed to update ${this.bot.schema.getName(
                        SKU.fromString(sku)
                    )} (${sku}): ❌ Item is not in the pricelist.`
                );
                failed++;
                continue;
            }

            if (!this.bot.pricelist.hasPrice({ priceKey })) {
                errorMessage.push(
                    `❌ Failed to update ${this.bot.schema.getName(
                        SKU.fromString(sku)
                    )} (${sku}): ❌ Item was not properly priced. Try remove and re-add the item.`
                );
                failed++;
                continue;
            }

            if (typeof params.intent === 'string') {
                const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());

                if (intent !== -1) {
                    params.intent = intent;
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
                    return this.bot.sendMessage(steamID, '❌ "resetgroup" must be either "true" or "false".');
                }
                // delete resetgroup key from params so it will not trying to be added into pricelist (validator error)
                delete params.resetgroup;
            }

            if (params.promoted !== undefined) {
                if (!isPremium) {
                    return this.bot.sendMessage(
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
                        return this.bot.sendMessage(
                            steamID,
                            '❌ "promoted" parameter must be either 0 (false) or 1 (true)'
                        );
                    }

                    if (params.promoted < 0 || params.promoted > 1) {
                        return this.bot.sendMessage(
                            steamID,
                            '❌ "promoted" parameter must be either 0 (false) or 1 (true)'
                        );
                    }
                }
            }

            const itemEntry = this.bot.pricelist.getPrice({ priceKey, onlyEnabled: false });

            if (typeof params.buy === 'object') {
                params.buy.keys = params.buy.keys || 0;
                params.buy.metal = params.buy.metal || 0;

                if (params.autoprice === undefined) {
                    params.autoprice = false;
                }

                params.isPartialPriced = false;
            } else if (typeof params.buy !== 'object' && typeof params.sell === 'object') {
                params['buy'] = {
                    keys: itemEntry.buy.keys,
                    metal: itemEntry.buy.metal
                };
            }

            if (typeof params.sell === 'object') {
                params.sell.keys = params.sell.keys || 0;
                params.sell.metal = params.sell.metal || 0;

                if (params.autoprice === undefined) {
                    params.autoprice = false;
                }

                params.isPartialPriced = false;
            } else if (typeof params.sell !== 'object' && typeof params.buy === 'object') {
                params['sell'] = {
                    keys: itemEntry.sell.keys,
                    metal: itemEntry.sell.metal
                };
            }

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
                    return this.bot.sendMessage(steamID, '❌ "removenote" must be either "true" or "false".');
                }

                delete params.removenote;
            }

            if (params.removebuynote && params.removesellnote) {
                return this.bot.sendMessage(
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
                    return this.bot.sendMessage(steamID, '❌ "removebuynote" must be either "true" or "false".');
                }

                delete params.removebuynote;
            }

            if (params.removesellnote) {
                if (typeof params.removesellnote === 'boolean') {
                    if (params.removesellnote === true) {
                        params.note = { buy: itemEntry.note.buy, sell: null };
                    }
                } else {
                    return this.bot.sendMessage(steamID, '❌ "removesellnote" must be either "true" or "false".');
                }

                delete params.removesellnote;
            }

            if (params.group && typeof params.group !== 'string') {
                // if group parameter is defined, convert anything to string
                params.group = String(params.group);
            }

            const entryData = this.bot.pricelist.getPrice({ priceKey, onlyEnabled: false }).getJSON(); //TODO: CONTINUE
            delete entryData.time;
            delete params.sku;

            if (Object.keys(params).length === 0) {
                return this.bot.sendMessage(steamID, '⚠️ Missing properties to update.');
            }

            // Update entry
            for (const property in params) {
                if (!Object.prototype.hasOwnProperty.call(params, property)) {
                    continue;
                }

                entryData[property] = params[property];
            }

            savedEntryData.push({ priceKey, params: entryData });
        }

        let updated = 0;

        async function sendErrors(bot: Bot): Promise<void> {
            const errorCount = errorMessage.length;
            if (errorCount > 0) {
                const limit = 10;

                const loops = Math.ceil(errorCount / limit);

                for (let i = 0; i < loops; i++) {
                    const last = loops - i === 1;
                    const i10 = i * limit;

                    const firstOrLast = i < 1 ? limit : i10 + (errorCount - i10);

                    bot.sendMessage(steamID, errorMessage.slice(i10, last ? firstOrLast : (i + 1) * limit).join('\n'));

                    await timersPromises.setTimeout(3000);
                }
            }

            PricelistManagerCommands.isSending = false;
        }

        if (failedNotUsingItemOrSkuParam === count) {
            return this.bot.sendMessage(
                steamID,
                `❌ Bulk update operation aborted: Please only use "sku" or "item" as the item identifying paramater. Thank you.`
            );
        }

        let isHasAutoprice = false;
        const count2 = savedEntryData.length;

        // yes it's longer, but much better than using Array.some() method
        for (let i = 0; i < count2; i++) {
            if (savedEntryData[i].params.autoprice) {
                isHasAutoprice = true;
                break;
            }
        }

        PricelistManagerCommands.isBulkOperation = true;

        if (isHasAutoprice) {
            try {
                this.bot.sendMessage(steamID, `⌛ Getting pricelist from the pricer...`);
                const pricerPricelist = await this.priceSource.getPricelist();
                const items = pricerPricelist.items;

                this.bot.sendMessage(steamID, `⌛ Got pricer pricelist, updating items...`);

                for (let i = 0; i < count2; i++) {
                    const entry = savedEntryData[i];
                    const isLast = count2 - i === 1;

                    this.bot.pricelist
                        .updatePrice({
                            priceKey: entry.priceKey,
                            entryData: entry.params,
                            emitChange: true,
                            src: PricelistChangedSource.Command,
                            isBulk: true,
                            pricerItems: items,
                            isLast
                        })
                        .then(() => updated++)
                        .catch(err => {
                            if (Pricelist.isAssetId(entry.priceKey)) {
                                errorMessage.push(`❌ Error removing ${entry.priceKey}): ${(err as Error)?.message}`);
                            } else {
                                errorMessage.push(
                                    `❌ Error removing ${this.bot.schema.getName(
                                        SKU.fromString(String(entry.priceKey))
                                    )} (${entry.priceKey}): ${(err as Error)?.message}`
                                );
                            }
                            failed++;
                        })
                        .finally(() => {
                            if (isLast) {
                                PricelistManagerCommands.isSending = true;
                                this.bot.sendMessage(
                                    steamID,
                                    `✅ Bulk update successful: ${updated} updated, ${failed} failed`
                                );

                                void sendErrors(this.bot);

                                PricelistManagerCommands.isBulkOperation = false;
                            }
                        });
                }
            } catch (err) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Bulk update operation aborted: Failed to obtain pricelist from pricer: ${
                        (err as Error)?.message
                    }`
                );
            }
        } else {
            for (let i = 0; i < count2; i++) {
                const entry = savedEntryData[i];
                const isLast = count2 - i === 1;

                this.bot.pricelist
                    .updatePrice({
                        priceKey: entry.priceKey,
                        entryData: entry.params,
                        emitChange: true,
                        src: PricelistChangedSource.Command,
                        isBulk: true
                    })
                    .then(() => updated++)
                    .catch(err => {
                        if (Pricelist.isAssetId(entry.priceKey)) {
                            errorMessage.push(`❌ Error removing ${entry.priceKey}): ${(err as Error)?.message}`);
                        } else {
                            errorMessage.push(
                                `❌ Error removing ${this.bot.schema.getName(
                                    SKU.fromString(String(entry.priceKey))
                                )} (${entry.priceKey}): ${(err as Error)?.message}`
                            );
                        }
                        failed++;
                    })
                    .finally(() => {
                        if (isLast) {
                            PricelistManagerCommands.isSending = true;
                            this.bot.sendMessage(
                                steamID,
                                `✅ Bulk update successful: ${updated} updated, ${failed} failed`
                            );

                            void sendErrors(this.bot);

                            PricelistManagerCommands.isBulkOperation = false;
                        }
                    });
            }
        }
    }

    private generateUpdateReply(isPremium: boolean, oldEntry: Entry, newEntry: Entry): string {
        const keyPrice = this.bot.pricelist.getKeyPrice;
        const amount = this.bot.inventoryManager.getInventory.getAmount({
            priceKey: oldEntry.id ?? oldEntry.sku,
            includeNonNormalized: false
        });

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
            `\n½🔄 isPartialPriced: ${
                oldEntry.isPartialPriced !== newEntry.isPartialPriced
                    ? `${oldEntry.isPartialPriced ? '✅' : '❌'} → ${newEntry.isPartialPriced ? '✅' : '❌'}`
                    : `${newEntry.isPartialPriced ? '✅' : '❌'}`
            }` +
            (isPremium
                ? `\n📢 Promoted: ${
                      oldEntry.promoted !== newEntry.promoted
                          ? `${oldEntry.promoted === 1 ? '✅' : '❌'} → ${newEntry.promoted === 1 ? '✅' : '❌'}`
                          : `${newEntry.promoted === 1 ? '✅' : '❌'}`
                  }`
                : '') +
            `\n🔰 Group: ${
                oldEntry.group !== newEntry.group ? `${oldEntry.group} → ${newEntry.group}` : newEntry.group
            }` +
            `${newEntry.note.buy !== null ? `\n📥 Custom buying note: ${newEntry.note.buy}` : ''}` +
            `${newEntry.note.sell !== null ? `\n📤 Custom selling note: ${newEntry.note.sell}` : ''}`
        );
    }

    async removeCommand(steamID: SteamID, message: string): Promise<void> {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

        if (params.all === true) {
            // Remove entire pricelist
            const pricelistLength = this.bot.pricelist.getLength;
            if (pricelistLength === 0) {
                return this.bot.sendMessage(steamID, '❌ Your pricelist is already empty!');
            }
            if (params.withgroup && params.withoutgroup) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Don't be dumb. Please choose only "withgroup" OR "withoutgroup", not both. Thanks.`
                );
            }

            const pricelist = this.bot.pricelist.getPrices;
            let newPricelist = Object.assign({}, pricelist);

            if (params.withgroup || params.withoutgroup) {
                for (const sku in newPricelist) {
                    if (!Object.prototype.hasOwnProperty.call(newPricelist, sku)) continue;
                    const entity = newPricelist[sku];
                    if (params.withgroup && entity.group === params.withgroup) delete newPricelist[sku];
                    else if (params.withoutgroup && entity.group !== params.withoutgroup) delete newPricelist[sku];
                }
            } else {
                newPricelist = {};
            }

            const removeCount = pricelistLength - Object.keys(newPricelist).length;
            if (params.i_am_sure !== 'yes_i_am') {
                return this.bot.sendMessage(
                    steamID,
                    '/pre ⚠️ Are you sure that you want to remove ' +
                        pluralize('item', removeCount, true) +
                        '? Try again with i_am_sure=yes_i_am'
                );
            }

            if (params.withgroup || params.withoutgroup) {
                try {
                    this.bot.pricelist.setNewPricelist(newPricelist);
                    this.bot.sendMessage(steamID, `✅ Removed ${removeCount} items from pricelist.`);
                    return await this.bot.listings.redoListings();
                } catch (err) {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ Failed to clear pricelist with/without group: ${(err as Error).message}`
                    );
                }
            } else {
                try {
                    this.bot.pricelist.removeAll();
                    return this.bot.sendMessage(steamID, '✅ Cleared pricelist!');
                } catch (err) {
                    return this.bot.sendMessage(steamID, `❌ Failed to clear pricelist: ${(err as Error).message}`);
                }
            }
        }

        let sku = params.sku as string;

        if (sku !== undefined && !testPriceKey(sku)) {
            return this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        }

        if (params.item !== undefined) {
            // Remove by full name
            let match = this.bot.pricelist.searchByName(params.item as string, false);

            if (match === null) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ I could not find any items in my pricelist that contain "${params.item as string}"`
                );
            } else if (Array.isArray(match)) {
                const matchCount = match.length;
                if (matchCount > 20) {
                    match = match.splice(0, 20);
                }

                let reply = `I've found ${matchCount} items. Try with one of the items shown below:\n${match.join(
                    ',\n'
                )}`;

                if (matchCount > match.length) {
                    const other = matchCount - match.length;
                    reply += `,\nand ${other} other ${pluralize('item', other)}.`;
                }

                return this.bot.sendMessage(steamID, reply);
            }

            delete params.item;
            sku = match.sku;
        } else if (sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);

            if (item !== null) {
                sku = SKU.fromObject(item);
            }
        }

        let priceKey: string = undefined;
        if (params.id) {
            priceKey = String(params.id);
            params.id = String(params.id);
        }
        priceKey = priceKey ? priceKey : sku;

        this.bot.pricelist
            .removePrice(priceKey, true)
            .then(entry => {
                this.bot.sendMessage(steamID, `✅ Removed "${entry.name}".`);
            })
            .catch(err => {
                this.bot.sendMessage(steamID, `❌ Failed to remove pricelist entry: ${(err as Error).message}`);
            });
    }

    removebulkCommand(steamID: SteamID, message: string): void {
        if (PricelistManagerCommands.isBulkOperation) {
            return this.bot.sendMessage(
                steamID,
                `❌ Bulk operation is still in progress. Please wait until it's completed.`
            );
        }

        const commandRemoved = CommandParser.removeCommand(removeLinkProtocol(message));

        if (!commandRemoved.includes('\n')) {
            return this.bot.sendMessage(
                steamID,
                `❌ Incorrect usage. If you want to only remove one item, please use the !remove command.\n` +
                    `Correct usage example: !removebulk sku=5021;6\nsku=30186;6\nsku=30994;6\nitem=Genuine Horace\n...` +
                    `(separated by a new line)`
            );
        }

        const itemsToRemove = commandRemoved.split('\n').filter(itemString => itemString !== '');
        const count = itemsToRemove.length;
        const errorMessage: string[] = [];
        const priceKeysToRemove: string[] = [];
        let failed = 0;
        let failedNotUsingItemOrSkuParam = 0;

        for (let i = 0; i < count; i++) {
            const itemToRemove = itemsToRemove[i];

            const params = CommandParser.parseParams(itemToRemove);
            let sku = params.sku as string;

            if (params.all !== undefined) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Bulk remove operation aborted: "all" parameter can only be used with the !remove command!`
                );
            }

            if (sku !== undefined && !testPriceKey(sku)) {
                errorMessage.push(`❌ Failed to remove ${sku}: "sku" should not be empty or wrong format.`);
                failed++;
                continue;
            }

            if (sku === undefined) {
                if (params.item !== undefined) {
                    sku = this.bot.schema.getSkuFromName(params.item as string);

                    if (sku.includes('null') || sku.includes('undefined')) {
                        errorMessage.push(
                            `❌ Failed to remove ${sku}: The sku for "${params.item as string}" returned "${sku}".` +
                                `\nIf the item name is correct, please let us know in our Discord server.`
                        );
                        failed++;
                        continue;
                    }

                    delete params.item;
                } else {
                    errorMessage.push(
                        `❌ Failed to remove "${itemToRemove}": Please only use "sku" or "item" parameter, ` +
                            `OR check if you have missing something. Thank you.`
                    );
                    failed++;
                    failedNotUsingItemOrSkuParam++;
                    continue;
                }
            }

            if (this.bot.pricelist.getPrice({ priceKey: sku }) === null) {
                errorMessage.push(
                    `❌ Failed to remove ${this.bot.schema.getName(
                        SKU.fromString(sku)
                    )} (${sku}): ❌ Item is not in the pricelist.`
                );
                failed++;
                continue;
            }

            priceKeysToRemove.push(sku);
        }

        let removed = 0;

        async function sendErrors(bot: Bot): Promise<void> {
            const errorCount = errorMessage.length;
            if (errorCount > 0) {
                const limit = 10;

                const loops = Math.ceil(errorCount / limit);

                for (let i = 0; i < loops; i++) {
                    const last = loops - i === 1;
                    const i10 = i * limit;

                    const firstOrLast = i < 1 ? limit : i10 + (errorCount - i10);

                    bot.sendMessage(steamID, errorMessage.slice(i10, last ? firstOrLast : (i + 1) * limit).join('\n'));

                    await timersPromises.setTimeout(3000);
                }
            }

            PricelistManagerCommands.isSending = false;
        }

        if (failedNotUsingItemOrSkuParam === count) {
            return this.bot.sendMessage(
                steamID,
                `❌ Bulk remove operation aborted: Please only use "sku" or "item" as the item identifying paramater. Thank you.`
            );
        }

        PricelistManagerCommands.isBulkOperation = true;

        const count2 = priceKeysToRemove.length;

        for (let i = 0; i < count2; i++) {
            const priceKey = priceKeysToRemove[i];
            const isLast = count2 - i === 1;

            this.bot.pricelist
                .removePrice(priceKey, true)
                .then(() => removed++)
                .catch(err => {
                    if (Pricelist.isAssetId(priceKey)) {
                        errorMessage.push(`❌ Error removing ${priceKey}): ${(err as Error)?.message}`);
                    } else {
                        errorMessage.push(
                            `❌ Error removing ${this.bot.schema.getName(
                                SKU.fromString(String(priceKey))
                            )} (${priceKey}): ${(err as Error)?.message}`
                        );
                    }
                    failed++;
                })
                .finally(() => {
                    if (isLast) {
                        PricelistManagerCommands.isSending = true;
                        this.bot.sendMessage(
                            steamID,
                            `✅ Bulk remove successful: ${removed} removed, ${failed} failed`
                        );

                        void sendErrors(this.bot);

                        PricelistManagerCommands.isBulkOperation = false;
                    }
                });
        }
    }

    getSlotsCommand(steamID: SteamID): void {
        const listingsCap = this.bot.listingManager.cap;
        const active = this.bot.listingManager.listings.filter(listing => listing.archived !== true).length;
        const archived = this.bot.listingManager.listings.filter(listing => listing.archived === true).length;

        return this.bot.sendMessage(
            steamID,
            `🏷️ Current Backpack.tf listings slots:\n- Active: ${active}/${listingsCap}\n- Archived: ${archived}`
        );
    }

    getGroupsCommand(steamID: SteamID): void {
        const pricelist = this.bot.pricelist.getPrices;
        if (Object.keys(pricelist).length === 0) {
            return this.bot.sendMessage(steamID, '❌ Your pricelist is empty.');
        }

        const groups = new Map<string, number>();
        for (const priceKey of Object.keys(pricelist)) {
            const entry = pricelist[priceKey];
            const group = entry.group;
            if (!groups.has(group)) {
                groups.set(group, 0);
            }
            groups.set(group, groups.get(group) + 1);
        }

        let answer = `You have ${groups.size} groups in total:\n`;
        [...groups.keys()].forEach((group, i) => {
            const amount = groups.get(group);
            answer += `${i + 1}. ${group} (${amount} ${amount === 1 ? 'entry' : 'entries'})\n`;
        });

        return this.bot.sendMessage(steamID, answer);
    }

    getCommand(steamID: SteamID, message: string): void {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        let sku = params.sku as string;
        if (sku !== undefined && !testPriceKey(sku)) {
            return this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        }

        if (params.item !== undefined) {
            // Remove by full name
            let match = this.bot.pricelist.searchByName(params.item as string, false);

            if (match === null) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ I could not find any items in my pricelist that contain "${params.item as string}"`
                );
            } else if (Array.isArray(match)) {
                const matchCount = match.length;
                if (matchCount > 20) {
                    match = match.splice(0, 20);
                }

                let reply = `I've found ${matchCount} items. Try with one of the items shown below:\n${match.join(
                    ',\n'
                )}`;

                if (matchCount > match.length) {
                    const other = matchCount - match.length;
                    reply += `,\nand ${other} other ${pluralize('item', other)}.`;
                }

                return this.bot.sendMessage(steamID, reply);
            }

            delete params.item;
            sku = match.sku;
        } else if (sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);

            if (item !== null) {
                sku = SKU.fromObject(item);
            }
        }

        if (sku === undefined && undefined === params.id) {
            return this.bot.sendMessage(steamID, '❌ Missing item');
        }

        let priceKey: string = undefined;
        if (params.id) {
            priceKey = String(params.id);
            params.id = String(params.id);
        }
        priceKey = priceKey ? priceKey : sku;
        const match = this.bot.pricelist.getPrice({ priceKey });
        if (match === null) {
            this.bot.sendMessage(steamID, `❌ Could not find item "${priceKey}" in the pricelist`);
        } else {
            this.bot.sendMessage(steamID, `/code ${this.generateOutput(match)}`);
        }
    }

    private generateOutput(filtered: Entry): string {
        const currentStock = this.bot.inventoryManager.getInventory.getAmount({
            priceKey: filtered.id ?? filtered.sku,
            includeNonNormalized: false,
            tradableOnly: true
        });
        filtered['stock'] = currentStock;

        return JSON.stringify(filtered, null, 4);
    }

    async getAllCommand(steamID: SteamID, message: string): Promise<void> {
        if (PricelistManagerCommands.isSending) {
            return this.bot.sendMessage(steamID, '❌ Please wait.');
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        const pricelist = this.bot.pricelist.getPrices;
        if (Object.keys(pricelist).length === 0) {
            return this.bot.sendMessage(steamID, '❌ Your pricelist is empty.');
        }

        const isPremium = this.bot.handler.getBotInfo.premium;

        const list = Object.keys(pricelist).map((priceKey, i) => {
            const entry = pricelist[priceKey];
            const name = entry.name;
            const stock = this.bot.inventoryManager.getInventory.getAmount({
                priceKey,
                includeNonNormalized: false,
                tradableOnly: true
            });

            return `${i + 1}. ${priceKey} - ${name}${name.length > 40 ? '\n' : ' '}(${stock}, ${entry.min}, ${
                entry.max
            }, ${entry.intent === 2 ? 'bank' : entry.intent === 1 ? 'sell' : 'buy'}, ${entry.enabled ? '✅' : '❌'}, ${
                entry.autoprice ? '✅' : '❌'
            }, ${entry.group}, ${entry.isPartialPriced ? '✅' : '❌'}${
                isPremium ? `, ${entry.promoted === 1 ? '✅' : '❌'}` : ''
            })`;
        });

        const listCount = list.length;

        const limit = params.limit === undefined ? 15 : (params.limit as number) <= 0 ? -1 : (params.limit as number);

        PricelistManagerCommands.isSending = true;
        this.bot.sendMessage(
            steamID,
            `Found ${pluralize('item', listCount, true)} in your pricelist${
                limit !== -1 && params.limit === undefined && listCount > 15
                    ? `, showing only ${limit} items (you can send with parameter limit=-1 to list all)`
                    : `${
                          limit < listCount && limit > 0 && params.limit !== undefined ? ` (limit set to ${limit})` : ''
                      }.`
            }\n\n 📌 #. "sku|id" - "name" ("Current Stock", "min", "max", "intent", "enabled", "autoprice", "group", "isPartialPriced", *"promoted")\n\n` +
                '* - Only shown if your account is Backpack.tf Premium\n\n.'
        );

        const applyLimit = limit === -1 ? listCount : limit;
        const loops = Math.ceil(applyLimit / 15);

        for (let i = 0; i < loops; i++) {
            const last = loops - i === 1;
            const i15 = i * 15;

            const firstOrLast = i < 1 && limit > 0 && limit < 15 ? limit : i15 + (applyLimit - i15);

            this.bot.sendMessage(steamID, list.slice(i15, last ? firstOrLast : (i + 1) * 15).join('\n'));

            await timersPromises.setTimeout(3000);
        }

        PricelistManagerCommands.isSending = false;
    }

    async partialPriceUpdateCommand(steamID: SteamID, message: string): Promise<void> {
        if (PricelistManagerCommands.isSending) {
            return this.bot.sendMessage(steamID, '❌ Please wait.');
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        const pricelist = Object.assign({}, this.bot.pricelist.getPrices);

        if (Object.keys(pricelist).length === 0) {
            return this.bot.sendMessage(steamID, '❌ Your pricelist is empty.');
        }

        const isPpuEnabled = this.bot.options.pricelist.partialPriceUpdate.enable;

        if (!isPpuEnabled) {
            return this.bot.sendMessage(
                steamID,
                '❌ This feature is disabled. Read more: ' +
                    'https://github.com/TF2Autobot/tf2autobot/wiki/Configure-your-options.json-file#--partial-price-update--'
            );
        }

        for (const sku in pricelist) {
            if (!pricelist[sku].isPartialPriced) {
                delete pricelist[sku];
            }
        }

        if (Object.keys(pricelist).length === 0) {
            return this.bot.sendMessage(steamID, '❌ No items with ppu enabled found.');
        }

        const keyPrice = this.bot.pricelist.getKeyPrice.metal;
        const list = Object.keys(pricelist).map((sku, i) => {
            const entry = pricelist[sku];
            const name = entry.name;
            const time = dayjs.unix(entry.time).fromNow();

            const isOneScrapDifference =
                Currencies.toScrap(entry.sell.keys * keyPrice + entry.sell.metal) -
                    Currencies.toScrap(entry.buy.keys * keyPrice + entry.buy.metal) ===
                1;

            return `${i + 1}. ${entry.sku} - ${name} (since ${time}), oneScrapDiff? ${
                isOneScrapDifference ? '✅' : '❌'
            }`;
        });

        const listCount = list.length;

        const limit = params.limit === undefined ? 15 : (params.limit as number) <= 0 ? -1 : (params.limit as number);

        PricelistManagerCommands.isSending = true;
        this.bot.sendMessage(
            steamID,
            (!isPpuEnabled ? '⚠️ Partial Price Update disabled, but found ' : 'Found ') +
                `${pluralize('item', listCount, true)} in your pricelist that ${pluralize(
                    'is',
                    listCount,
                    true
                )} currently being partial priced${
                    limit !== -1 && params.limit === undefined && listCount > 15
                        ? `, showing only ${limit} items (you can send with parameter limit=-1 to list all)`
                        : `${
                              limit < listCount && limit > 0 && params.limit !== undefined
                                  ? ` (limit set to ${limit})`
                                  : ''
                          }.`
                }`
        );

        const applyLimit = limit === -1 ? listCount : limit;
        const loops = Math.ceil(applyLimit / 15);

        for (let i = 0; i < loops; i++) {
            const last = loops - i === 1;
            const i15 = i * 15;

            const firstOrLast = i < 1 && limit > 0 && limit < 15 ? limit : i15 + (applyLimit - i15);

            this.bot.sendMessage(steamID, list.slice(i15, last ? firstOrLast : (i + 1) * 15).join('\n'));

            await timersPromises.setTimeout(3000);
        }

        PricelistManagerCommands.isSending = false;
    }

    async findCommand(steamID: SteamID, message: string): Promise<void> {
        if (PricelistManagerCommands.isSending) {
            return this.bot.sendMessage(steamID, '❌ Please wait.');
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(message));
        if (
            !(
                params.enabled !== undefined ||
                params.max !== undefined ||
                params.min !== undefined ||
                params.intent !== undefined ||
                params.autoprice !== undefined ||
                params.group !== undefined ||
                params.promoted !== undefined ||
                params.isPartialPriced !== undefined
            )
        ) {
            return this.bot.sendMessage(
                steamID,
                '⚠️ Only parameters available for !find command: enabled, max, min, intent,' +
                    ' promoted, autoprice, isPartialPriced, or group\nExample: !find intent=bank&max=2'
            );
        }

        const pricelist = this.bot.pricelist.getPrices;
        let filter = Object.keys(pricelist).map(sku => {
            return pricelist[sku];
        });

        if (params.enabled !== undefined) {
            if (typeof params.enabled !== 'boolean') {
                return this.bot.sendMessage(steamID, '⚠️ enabled parameter must be "true" or "false"');
            }
            filter = filter.filter(entry => entry.enabled === params.enabled);
        }

        if (params.min !== undefined) {
            if (typeof params.min !== 'number') {
                return this.bot.sendMessage(steamID, '⚠️ min parameter must be an integer');
            }
            filter = filter.filter(entry => entry.min === params.min);
        }

        if (params.max !== undefined) {
            if (typeof params.max !== 'number') {
                return this.bot.sendMessage(steamID, '⚠️ max parameter must be an integer');
            }
            filter = filter.filter(entry => entry.max === params.max);
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
                    return this.bot.sendMessage(steamID, '⚠️ promoted parameter must be either 0 (false) or 1 (true)');
                }

                if (params.promoted < 0 || params.promoted > 1) {
                    return this.bot.sendMessage(
                        steamID,
                        '⚠️ "promoted" parameter must be either 0 (false) or 1 (true)'
                    );
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
                return this.bot.sendMessage(
                    steamID,
                    '⚠️ intent parameter must be "buy", "sell", or "bank" OR an integer of "0", "1" or "2" respectively'
                );
            }
            filter = filter.filter(entry => entry.intent === params.intent);
        }

        if (params.autoprice !== undefined) {
            if (typeof params.autoprice !== 'boolean') {
                return this.bot.sendMessage(steamID, '⚠️ autoprice parameter must be "true" or "false"');
            }
            filter = filter.filter(entry => entry.autoprice === params.autoprice);
        }

        if (params.isPartialPriced !== undefined) {
            if (typeof params.isPartialPriced !== 'boolean') {
                return this.bot.sendMessage(steamID, '⚠️ isPartialPriced parameter must be "true" or "false"');
            }
            filter = filter.filter(entry => entry.isPartialPriced === params.isPartialPriced);
        }

        if (params.group !== undefined) {
            if (typeof params.group !== 'string') {
                return this.bot.sendMessage(steamID, '⚠️ group parameter must be a string');
            }
            filter = filter.filter(entry => entry.group === params.group);
        }

        const parametersUsed = {
            enabled: params.enabled !== undefined ? `enabled=${(params.enabled as boolean).toString()}` : '',
            autoprice: params.autoprice !== undefined ? `autoprice=${(params.autoprice as boolean).toString()}` : '',
            isPartialPriced:
                params.isPartialPriced !== undefined
                    ? `isPartialPriced=${(params.isPartialPriced as boolean).toString()}`
                    : '',
            min: params.min !== undefined ? `min=${params.min as number}` : '',
            max: params.max !== undefined ? `max=${params.max as number}` : '',
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

        const filterCount = filter.length;
        if (filterCount === 0) {
            this.bot.sendMessage(steamID, `No items found with ${display.join('&')}.`);
        } else {
            const isPremium = this.bot.handler.getBotInfo.premium;

            const list = filter.map((entry, i) => {
                const priceKey = entry.id ? entry.id : entry.sku;
                const name = entry.name;
                const stock = this.bot.inventoryManager.getInventory.getAmount({
                    priceKey,
                    includeNonNormalized: false,
                    tradableOnly: true
                });

                return `${i + 1}. ${priceKey} - ${name}${name.length > 40 ? '\n' : ' '}(${stock}, ${entry.min}, ${
                    entry.max
                }, ${entry.intent === 2 ? 'bank' : entry.intent === 1 ? 'sell' : 'buy'}, ${
                    entry.enabled ? '✅' : '❌'
                }, ${entry.autoprice ? '✅' : '❌'}, ${entry.group}, ${entry.isPartialPriced ? '✅' : '❌'}${
                    isPremium ? `, ${entry.promoted === 1 ? '✅' : '❌'}` : ''
                })`;
            });
            const listCount = list.length;

            const limit =
                params.limit === undefined ? 15 : (params.limit as number) <= 0 ? -1 : (params.limit as number);

            PricelistManagerCommands.isSending = true;
            this.bot.sendMessage(
                steamID,
                `Found ${pluralize('item', filterCount, true)} with ${display.join('&')}${
                    limit !== -1 && params.limit === undefined && listCount > 15
                        ? `, showing only ${limit} items (you can send with parameter limit=-1 to list all)`
                        : `${
                              limit < listCount && limit > 0 && params.limit !== undefined
                                  ? ` (limit set to ${limit})`
                                  : ''
                          }.`
                }\n\n 📌 #. "sku" - "name" ("Current Stock", "min", "max", "intent", "enabled", "autoprice", "group", "isPartialPriced", *"promoted",)\n\n` +
                    '* - Only shown if your account is Backpack.tf Premium.\n\n.'
            );

            const applyLimit = limit === -1 ? listCount : limit;
            const loops = Math.ceil(applyLimit / 15);

            for (let i = 0; i < loops; i++) {
                const last = loops - i === 1;
                const i15 = i * 15;

                const firstOrLast = i < 1 && limit > 0 && limit < 15 ? limit : i15 + (applyLimit - i15);

                this.bot.sendMessage(steamID, list.slice(i15, last ? firstOrLast : (i + 1) * 15).join('\n'));

                await timersPromises.setTimeout(3000);
            }

            PricelistManagerCommands.isSending = false;
        }
    }
}

function generateAddedReply(bot: Bot, isPremium: boolean, entry: Entry): string {
    const amount = bot.inventoryManager.getInventory.getAmount({
        priceKey: entry.id ?? entry.sku,
        includeNonNormalized: false
    });

    return (
        `\n💲 Buy: ${entry.buy.toString()} | Sell: ${entry.sell.toString()}` +
        `\n🛒 Intent: ${entry.intent === 2 ? 'bank' : entry.intent === 1 ? 'sell' : 'buy'}` +
        `\n📦 Stock: ${amount} | Min: ${entry.min} | Max: ${entry.max}` +
        `\n📋 Enabled: ${entry.enabled ? '✅' : '❌'}` +
        `\n🔄 Autoprice: ${entry.autoprice ? '✅' : '❌'}` +
        `\n½🔄 isPartialPriced: ${entry.isPartialPriced ? '✅' : '❌'}` +
        (isPremium ? `\n📢 Promoted: ${entry.promoted === 1 ? '✅' : '❌'}` : '') +
        `\n🔰 Group: ${entry.group}` +
        `${entry.note.buy !== null ? `\n📥 Custom buying note: ${entry.note.buy}` : ''}` +
        `${entry.note.sell !== null ? `\n📤 Custom selling note: ${entry.note.sell}` : ''}`
    );
}

class AutoAddQueue {
    // reference: https://www.youtube.com/watch?v=bK7I79hcm08

    private static autoAdd: UnknownDictionary<boolean> = {};

    private skus: string[] = [];

    private added = 0;

    private skipped = 0;

    private failed = 0;

    private total = 0;

    constructor(
        private readonly bot: Bot,
        private readonly steamID: SteamID,
        private readonly skusToSkip: string[],
        private params: UnknownDictionaryKnownValues,
        private readonly isPremium: boolean
    ) {
        this.params = params;
    }

    set enqueue(skus: string[]) {
        this.skus = skus;
        this.total = skus.length;
    }

    async executeAutoAdd(): Promise<void> {
        if (AutoAddQueue.autoAdd['1'] === false) {
            AutoAddQueue.removeJob();
            return this.bot.sendMessage(this.steamID, '----------\n🛑 Stopped auto-add items');
        }

        await timersPromises.setTimeout(2000);

        this.params.sku = this.sku;

        if (this.skusToSkip.includes(this.sku)) {
            this.skipped++;
            const remaining = this.total - this.added - this.skipped - this.failed;

            this.bot.sendMessage(
                this.steamID,
                `----------\n⚠️ ${this.bot.schema.getName(SKU.fromString(this.sku))} (${
                    this.sku
                }) already in pricelist, skipping...` +
                    `\n📜 Status: ${this.added} added, ${this.skipped} skipped, ${this.failed} failed / ${this.total} total, ${remaining} remaining`
            );

            this.dequeue();

            if (this.isEmpty) {
                AutoAddQueue.removeJob();
                return this.bot.sendMessage(
                    this.steamID,
                    `----------\n✅ Done, summary: ${this.added} added, ${this.skipped} skipped, ${this.failed} failed / ${this.total} total`
                );
            }

            void this.executeAutoAdd();
        } else {
            const entryData = this.params as EntryData;
            // todo should this be assetid to prevent profit loss?
            this.bot.pricelist
                .addPrice({ entryData, emitChange: true, src: PricelistChangedSource.Command })
                .then(entry => {
                    this.added++;
                    const remaining = this.total - this.added - this.skipped - this.failed;

                    this.bot.sendMessage(
                        this.steamID,
                        `----------\n✅ Added "${entry.name}" (${entry.sku})` +
                            generateAddedReply(this.bot, this.isPremium, entry) +
                            `\n\n📜 Status: ${this.added} added, ${this.skipped} skipped, ${this.failed} failed / ${this.total} total, ${remaining} remaining`
                    );
                })
                .catch(err => {
                    this.failed++;
                    const remaining = this.total - this.added - this.skipped - this.failed;

                    this.bot.sendMessage(
                        this.steamID,
                        `----------\n❌ Failed to add the item to the pricelist: ${(err as Error).message}` +
                            `\n\n📜 Status: ${this.added} added, ${this.skipped} skipped, ${this.failed} failed / ${this.total} total, ${remaining} remaining`
                    );
                })
                .finally(() => {
                    this.dequeue();

                    if (this.isEmpty) {
                        AutoAddQueue.removeJob();
                        return this.bot.sendMessage(
                            this.steamID,
                            `----------\n✅ Done, summary: ${this.added} added, ${this.skipped} skipped, ${this.failed} failed / ${this.total} total`
                        );
                    }

                    void this.executeAutoAdd();
                });
        }
    }

    private dequeue(): void {
        this.skus.shift();
    }

    private get sku(): string {
        return this.skus[0];
    }

    private get isEmpty(): boolean {
        return this.skus.length === 0;
    }

    static addJob(): void {
        this.autoAdd['1'] = true;
    }

    static isRunning(): boolean {
        return this.autoAdd['1'] !== undefined;
    }

    static stopJob(): void {
        this.autoAdd['1'] = false;
    }

    private static removeJob(): void {
        delete this.autoAdd['1'];
    }
}

interface ErrorRequest {
    body?: ErrorBody;
    message?: string;
}

interface ErrorBody {
    message: string;
}
