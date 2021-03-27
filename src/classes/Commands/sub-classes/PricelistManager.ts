/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import Currencies from 'tf2-currencies-2';
import pluralize from 'pluralize';
import dayjs from 'dayjs';
import sleepasync from 'sleep-async';
import { removeLinkProtocol, testSKU, getItemFromParams, fixSKU } from '../functions/utils';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { Entry, EntryData, PricelistChangedSource } from '../../Pricelist';
import Pricer, { RequestCheckResponse, RequestCheckFn } from '../../Pricer';
import validator from '../../../lib/validator';
import log from '../../../lib/logger';

// Pricelist manager

export default class PricelistManagerCommands {
    private stopAutoAdd = false;

    private executed = false;

    private lastExecutedTime: number | null = null;

    private executeTimeout: NodeJS.Timeout;

    private requestCheck: RequestCheckFn;

    stopAutoAddCommand(): void {
        this.stopAutoAdd = true;
    }

    constructor(private readonly bot: Bot, private priceSource: Pricer) {
        this.bot = bot;
        this.requestCheck = this.priceSource.requestCheck.bind(this.priceSource);
    }

    private requestPricecheck(entry: Entry): void {
        void this.requestCheck(entry.sku, 'bptf').asCallback((err: ErrorRequest, body: RequestCheckResponse) => {
            if (err) {
                log.debug(`❌ Failed to request pricecheck for ${entry.sku}: ${JSON.stringify(err)}`);
                return;
            }

            if (!body) {
                log.debug(`❌ Error while requesting price check for ${entry.sku} (returned null/undefined).`);
            } else {
                log.debug(`✅ Requested pricecheck for ${body.name} (${entry.sku}).`);
            }
        });
    }

    addCommand(steamID: SteamID, message: string): void {
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

        if (params.sku !== undefined && !testSKU(params.sku as string)) {
            return this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        }

        if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        params.sku = fixSKU(params.sku);

        this.bot.pricelist
            .addPrice(params as EntryData, true, PricelistChangedSource.Command)
            .then(entry => {
                this.bot.sendMessage(
                    steamID,
                    `✅ Added "${entry.name}" (${entry.sku})` + this.generateAddedReply(isPremium, entry)
                );

                this.requestPricecheck(entry);
            })
            .catch(err => {
                this.bot.sendMessage(steamID, `❌ Failed to add the item to the pricelist: ${(err as Error).message}`);
            });
    }

    private generateAddedReply(isPremium: boolean, entry: Entry): string {
        const amount = this.bot.inventoryManager.getInventory.getAmount(entry.sku);

        return (
            `\n💲 Buy: ${entry.buy.toString()} | Sell: ${entry.sell.toString()}` +
            `\n🛒 Intent: ${entry.intent === 2 ? 'bank' : entry.intent === 1 ? 'sell' : 'buy'}` +
            `\n📦 Stock: ${amount} | Min: ${entry.min} | Max: ${entry.max}` +
            `\n📋 Enabled: ${entry.enabled ? '✅' : '❌'}` +
            `\n🔄 Autoprice: ${entry.autoprice ? '✅' : '❌'}` +
            (isPremium ? `\n📢 Promoted: ${entry.promoted === 1 ? '✅' : '❌'}` : '') +
            `\n🔰 Group: ${entry.group}` +
            `${entry.note.buy !== null ? `\n📥 Custom buying note: ${entry.note.buy}` : ''}` +
            `${entry.note.sell !== null ? `\n📤 Custom selling note: ${entry.note.sell}` : ''}`
        );
    }

    async autoAddCommand(steamID: SteamID, message: string): Promise<void> {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

        if (params.sku !== undefined || params.name !== undefined || params.defindex !== undefined) {
            return this.bot.sendMessage(
                steamID,
                `❌ Please only define item listing settings parameters, more info:` +
                    ` https://github.com/TF2Autobot/tf2autobot/wiki/What-is-the-pricelist%3F#i2---item-listing-settings-parameters.`
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
        const skusFromPricelist = pricelist.map(entry => entry.sku);

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

        const total = Object.keys(clonedDict).length;

        const totalTime = total * (params.autoprice ? 2 : 1) * 1000;
        const aSecond = 1 * 1000;
        const aMin = 1 * 60 * 1000;
        const anHour = 1 * 60 * 60 * 1000;

        this.bot.sendMessage(
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

        for (const sku in clonedDict) {
            if (this.stopAutoAdd) {
                this.bot.sendMessage(steamID, '----------\n🛑 Stopped auto-add items');
                this.stopAutoAdd = false;
                break;
            }

            if (!Object.prototype.hasOwnProperty.call(clonedDict, sku)) {
                continue;
            }

            if (skusFromPricelist.includes(sku)) {
                skipped++;
                this.bot.sendMessage(
                    steamID,
                    `----------\n⚠️ ${this.bot.schema.getName(
                        SKU.fromString(sku)
                    )} (${sku}) already in pricelist, skipping...` +
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

            this.bot.pricelist
                .addPrice(params as EntryData, true, PricelistChangedSource.Command)
                .then(entry => {
                    added++;
                    this.bot.sendMessage(
                        steamID,
                        `----------\n✅ Added "${entry.name}" (${entry.sku})` +
                            this.generateAddedReply(isPremium, entry) +
                            `\n\n📜 Status: ${added} added, ${skipped} skipped, ${failed} failed / ${total} total, ${
                                total - added - skipped - failed
                            } remaining`
                    );

                    this.requestPricecheck(entry);
                })
                .catch(err => {
                    failed++;
                    this.bot.sendMessage(
                        steamID,
                        `----------\n❌ Failed to add the item to the pricelist: ${(err as Error).message}` +
                            `\n\n📜 Status: ${added} added, ${skipped} skipped, ${failed} failed / ${total} total, ${
                                total - added - skipped - failed
                            } remaining`
                    );
                });
        }

        await sleepasync().Promise.sleep(2 * 1000);
        this.bot.sendMessage(
            steamID,
            `----------\n✅ Done, summary: ${added} added, ${skipped} skipped, ${failed} failed / ${total} total`
        );

        this.stopAutoAdd = false;
    }

    async updateCommand(steamID: SteamID, message: string): Promise<void> {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

        if (typeof params.intent === 'string') {
            const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());

            if (intent !== -1) {
                params.intent = intent;
            }
        }

        if (params.all === true) {
            // TODO: Must have at least one other param
            const pricelist = this.bot.pricelist.getPrices;
            const keyPrice = this.bot.pricelist.getKeyPrice;

            let targetedPricelist: Entry[];
            let unTargetedPricelist: Entry[];
            let newPricelist: Entry[];

            if (params.promoted) {
                return this.bot.sendMessage(steamID, `❌ Parameter "promoted" can't be used with "!update all=true".`);
            }

            if (params.withgroup && params.withoutgroup) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Don't be dumb. Please choose only "withgroup" OR "withoutgroup", not both. Thanks.`
                );
            }

            if (params.withgroup) {
                targetedPricelist = pricelist.filter(entry =>
                    entry.group
                        ? [(params.withgroup as string).toLowerCase()].includes(entry.group.toLowerCase())
                        : false
                );
                unTargetedPricelist = pricelist.filter(entry =>
                    entry.group
                        ? ![(params.withgroup as string).toLowerCase()].includes(entry.group.toLowerCase())
                        : true
                );

                if (targetedPricelist.length === 0) {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ There is no entry with "${params.withgroup as string}" group found in your pricelist.`
                    );
                }

                newPricelist = targetedPricelist;

                if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                    if (
                        (params.buy !== null && params.sell === undefined) ||
                        (params.buy === undefined && params.sell !== null)
                    ) {
                        return this.bot.sendMessage(steamID, `❌ You must include both buying and selling prices.`);
                    } else if (
                        new Currencies(params.buy).toValue(keyPrice.metal) >=
                        new Currencies(params.sell).toValue(keyPrice.metal)
                    ) {
                        return this.bot.sendMessage(steamID, `❌ Buying price can't be higher than selling price.`);
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
                    return this.bot.sendMessage(
                        steamID,
                        `❌ There is no entry other than "${
                            params.withoutgroup as string
                        }" group found in your pricelist.`
                    );
                }

                newPricelist = targetedPricelist;

                if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                    if (
                        (params.buy !== null && params.sell === undefined) ||
                        (params.buy === undefined && params.sell !== null)
                    ) {
                        return this.bot.sendMessage(steamID, `❌ You must include both buying and selling prices.`);
                    } else if (
                        new Currencies(params.buy).toValue(keyPrice.metal) >=
                        new Currencies(params.sell).toValue(keyPrice.metal)
                    ) {
                        return this.bot.sendMessage(steamID, `❌ Buying price can't be higher than selling price.`);
                    }
                }
            } else {
                newPricelist = pricelist;

                if (this.bot.options.autokeys.enable) {
                    // Autokeys is a feature, so when updating multiple entry with
                    // "!update all=true", key entry will be removed from newPricelist.
                    // https://github.com/TF2Autobot/tf2autobot/issues/131
                    const keyEntry = this.bot.pricelist.getPrice('5021;6');
                    if (keyEntry !== null) {
                        const index = this.bot.pricelist.getIndex('5021;6');
                        newPricelist.splice(index, 1);
                    }
                }
            }

            if (newPricelist.length === 0) {
                return this.bot.sendMessage(steamID, 'Your pricelist is empty.');
            }

            if (!params.withgroup && !params.withoutgroup) {
                if (typeof params.note === 'object') {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ Please specify "withgroup" or "withoutgroup" to change note.` +
                            `\nExample: "!update all=true&withgroup=<groupName>&note.buy=<yourNote>"`
                    );
                }

                if (typeof params.buy === 'object' || typeof params.sell === 'object') {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ Please specify "withgroup" or "withoutgroup" to change buying/selling price.\nExample:\n` +
                            `"!update all=true&withgroup=<groupName>&(buy.keys|buy.metal)=<buyingPrice>&(sell.keys|sell.metal)=<sellingPrice>"`
                    );
                }
            }

            newPricelist.forEach((entry, i) => {
                if (typeof params.intent === 'number') {
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
                    }

                    if (typeof params.sell === 'object') {
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
                            min: entry.min,
                            max: entry.max,
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

            if (params.resetgroup) {
                delete params.resetgroup;
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
                await this.bot.handler.onPricelist(newPricelist);
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
                    log.warn('Failed to update prices: ', err);
                    return this.bot.sendMessage(steamID, `❌ Failed to update prices: ${(err as Error).message}`);
                });
        }

        if (params.sku !== undefined && !testSKU(params.sku as string)) {
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

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        params.sku = fixSKU(params.sku);

        if (!this.bot.pricelist.hasPrice(params.sku as string)) {
            return this.bot.sendMessage(steamID, '❌ Item is not in the pricelist.');
        }

        const itemEntry = this.bot.pricelist.getPrice(params.sku as string, false);

        if (typeof params.buy === 'object') {
            params.buy.keys = params.buy.keys || 0;
            params.buy.metal = params.buy.metal || 0;

            if (params.autoprice === undefined) {
                params.autoprice = false;
            }
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

        const entryData = this.bot.pricelist.getPrice(params.sku as string, false).getJSON();
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
            .updatePrice(entryData, true, PricelistChangedSource.Command)
            .then(entry => {
                this.bot.sendMessage(
                    steamID,
                    `✅ Updated "${entry.name}" (${entry.sku})` + this.generateUpdateReply(isPremium, itemEntry, entry)
                );

                this.requestPricecheck(entry);
            })
            .catch((err: ErrorRequest) => {
                this.bot.sendMessage(
                    steamID,
                    '❌ Failed to update pricelist entry: ' +
                        (err.body && err.body.message ? err.body.message : err.message)
                );
            });
    }

    private generateUpdateReply(isPremium: boolean, oldEntry: Entry, newEntry: Entry): string {
        const keyPrice = this.bot.pricelist.getKeyPrice;
        const amount = this.bot.inventoryManager.getInventory.getAmount(oldEntry.sku);

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
            `\n🔰 Group: ${
                oldEntry.group !== newEntry.group ? `${oldEntry.group} → ${newEntry.group}` : newEntry.group
            }` +
            `${newEntry.note.buy !== null ? `\n📥 Custom buying note: ${newEntry.note.buy}` : ''}` +
            `${newEntry.note.sell !== null ? `\n📤 Custom selling note: ${newEntry.note.sell}` : ''}`
        );
    }

    async shuffleCommand(steamID: SteamID): Promise<void> {
        const newExecutedTime = dayjs().valueOf();
        const timeDiff = newExecutedTime - this.lastExecutedTime;

        const pricelist = this.bot.pricelist.getPrices;

        if (pricelist.length === 0) {
            return this.bot.sendMessage(steamID, '❌ Pricelist is empty!');
        }

        if (this.executed === true) {
            return this.bot.sendMessage(
                steamID,
                `⚠️ You need to wait ${Math.trunc(
                    (30 * 60 * 1000 - timeDiff) / (1000 * 60)
                )} minutes before you can shuffle pricelist/shuffle again.`
            );
        } else {
            clearTimeout(this.executeTimeout);
            this.lastExecutedTime = dayjs().valueOf();

            const shufflePricelist = (arr: Entry[]) => {
                return arr.sort(() => Math.random() - 0.5);
            };

            await this.bot.handler.onPricelist(shufflePricelist(pricelist));
            this.bot.sendMessage(steamID, '✅ Pricelist shuffled!');
            await this.bot.listings.redoListings();

            this.executed = true;
            this.executeTimeout = setTimeout(() => {
                this.lastExecutedTime = null;
                this.executed = false;
                clearTimeout(this.executeTimeout);
            }, 30 * 60 * 1000);
        }
    }

    async removeCommand(steamID: SteamID, message: string): Promise<void> {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

        if (params.all === true) {
            // Remove entire pricelist
            const pricelistLength = this.bot.pricelist.getLength;
            if (pricelistLength === 0) {
                return this.bot.sendMessage(steamID, '❌ Your pricelist is already empty!');
            }

            const pricelist = this.bot.pricelist.getPrices;
            let newPricelist: Entry[] = [];
            let newPricelistCount: Entry[] = [];

            if (params.withgroup && params.withoutgroup) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Don't be dumb. Please choose only "withgroup" OR "withoutgroup", not both. Thanks.`
                );
            }

            if (params.withgroup) {
                // first filter out pricelist with ONLY "withgroup" value.
                newPricelistCount = pricelist.filter(entry =>
                    entry.group
                        ? [(params.withgroup as string).toLowerCase()].includes(entry.group.toLowerCase())
                        : false
                );

                if (newPricelistCount.length === 0) {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ There is no entry with "${params.withgroup as string}" group found in your pricelist.`
                    );
                }

                // then filter out pricelist with NOT "withgroup" value.
                newPricelist = pricelist.filter(entry =>
                    entry.group
                        ? ![(params.withgroup as string).toLowerCase()].includes(entry.group.toLowerCase())
                        : true
                );
            } else if (params.withoutgroup) {
                // reverse of withgroup
                newPricelistCount = pricelist.filter(entry =>
                    entry.group
                        ? ![(params.withoutgroup as string).toLowerCase()].includes(entry.group.toLowerCase())
                        : true
                );

                if (newPricelistCount.length === 0) {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ There is no entry other than "${
                            params.withoutgroup as string
                        }" group found in your pricelist.`
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
                return this.bot.sendMessage(
                    steamID,
                    '/pre ⚠️ Are you sure that you want to remove ' +
                        pluralize('item', newPricelistCount.length, true) +
                        '? Try again with i_am_sure=yes_i_am'
                );
            }

            if (params.withgroup || params.withoutgroup) {
                try {
                    await this.bot.pricelist.removeByGroup(newPricelist);
                    this.bot.sendMessage(steamID, `✅ Removed ${newPricelistCount.length} items from pricelist.`);
                    return await this.bot.listings.redoListings();
                } catch (err) {
                    return this.bot.sendMessage(steamID, `❌ Failed to clear pricelist: ${(err as Error).message}`);
                }
            } else {
                try {
                    await this.bot.pricelist.removeAll();
                    return this.bot.sendMessage(steamID, '✅ Cleared pricelist!');
                } catch (err) {
                    return this.bot.sendMessage(steamID, `❌ Failed to clear pricelist: ${(err as Error).message}`);
                }
            }
        }

        if (params.sku !== undefined && !testSKU(params.sku as string)) {
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
            params.sku = match.sku;
        } else if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        params.sku = fixSKU(params.sku);

        this.bot.pricelist
            .removePrice(params.sku as string, true)
            .then(entry => {
                this.bot.sendMessage(steamID, `✅ Removed "${entry.name}".`);

                this.requestPricecheck(entry);
            })
            .catch(err =>
                this.bot.sendMessage(steamID, `❌ Failed to remove pricelist entry: ${(err as Error).message}`)
            );
    }

    getSlotsCommand(steamID: SteamID): void {
        const listingsCap = this.bot.listingManager.cap;
        const currentUsedSlots = this.bot.listingManager.listings.length;

        return this.bot.sendMessage(steamID, `🏷️ Current listings slots: ${currentUsedSlots}/${listingsCap}`);
    }

    getCommand(steamID: SteamID, message: string): void {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.sku !== undefined && !testSKU(params.sku as string)) {
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
            params.sku = match.sku;
        } else if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        if (params.sku === undefined) {
            return this.bot.sendMessage(steamID, '❌ Missing item');
        }

        params.sku = fixSKU(params.sku);

        const match = this.bot.pricelist.getPrice(params.sku as string);
        if (match === null) {
            this.bot.sendMessage(steamID, `❌ Could not find item "${params.sku as string}" in the pricelist`);
        } else {
            this.bot.sendMessage(steamID, `/code ${this.generateOutput(match)}`);
        }
    }

    private generateOutput(filtered: Entry): string {
        const currentStock = this.bot.inventoryManager.getInventory.getAmount(filtered.sku, true);
        filtered['stock'] = currentStock;

        return JSON.stringify(filtered, null, 4);
    }

    async getAllCommand(steamID: SteamID, message: string): Promise<void> {
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        const pricelist = this.bot.pricelist.getPrices;
        if (pricelist.length === 0) {
            return this.bot.sendMessage(steamID, '❌ Your pricelist is empty.');
        }

        const isPremium = this.bot.handler.getBotInfo.premium;

        const list = pricelist.map((entry, i) => {
            const name = this.bot.schema.getName(SKU.fromString(entry.sku));
            const stock = this.bot.inventoryManager.getInventory.getAmount(entry.sku, true);

            return `${i + 1}. ${entry.sku} - ${name}${name.length > 40 ? '\n' : ' '}(${stock}, ${entry.min}, ${
                entry.max
            }, ${entry.intent}, ${entry.enabled ? '✅' : '❌'}, ${entry.autoprice ? '✅' : '❌'}${
                isPremium ? `, ${entry.promoted === 1 ? '✅' : '❌'}, ` : ', '
            }${entry.group})`;
        });

        const listCount = list.length;

        const limit = params.limit === undefined ? 50 : (params.limit as number) <= 0 ? -1 : (params.limit as number);

        this.bot.sendMessage(
            steamID,
            `Found ${pluralize('item', listCount, true)} in your pricelist${
                limit !== -1 && params.limit === undefined && listCount > 50
                    ? `, showing only ${limit} items (you can send with parameter limit=-1 to list all)`
                    : `${
                          limit < listCount && limit > 0 && params.limit !== undefined ? ` (limit set to ${limit})` : ''
                      }.`
            }\n\n 📌 #. "sku" - "name" ("Current Stock", "min", "max", "intent", "enabled", "autoprice", *"promoted", "group")\n\n` +
                '* - Only shown if your account is Backpack.tf Premium\n\n.'
        );

        const applyLimit = limit === -1 ? listCount : limit;
        const loops = Math.ceil(applyLimit / 50);

        for (let i = 0; i < loops; i++) {
            const last = loops - i === 1;
            const i50 = i * 50;

            const firstOrLast = i < 1 && limit > 0 && limit < 50 ? limit : i50 + (applyLimit - i50);

            this.bot.sendMessage(steamID, list.slice(i50, last ? firstOrLast : (i + 1) * 50).join('\n'));

            await sleepasync().Promise.sleep(1 * 1000);
        }
    }

    async findCommand(steamID: SteamID, message: string): Promise<void> {
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
            return this.bot.sendMessage(
                steamID,
                '⚠️ Only parameters available for !find command: enabled, max, min, intent, promoted, autoprice or group\nExample: !find intent=bank&max=2'
            );
        }

        let filter = this.bot.pricelist.getPrices;
        if (params.enabled !== undefined) {
            if (typeof params.enabled !== 'boolean') {
                return this.bot.sendMessage(steamID, '⚠️ enabled parameter must be "true" or "false"');
            }
            filter = filter.filter(entry => entry.enabled === params.enabled);
        }

        if (params.max !== undefined) {
            if (typeof params.max !== 'number') {
                return this.bot.sendMessage(steamID, '⚠️ max parameter must be an integer');
            }
            filter = filter.filter(entry => entry.max === params.max);
        }

        if (params.min !== undefined) {
            if (typeof params.min !== 'number') {
                return this.bot.sendMessage(steamID, '⚠️ min parameter must be an integer');
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

        if (params.group !== undefined) {
            if (typeof params.group !== 'string') {
                return this.bot.sendMessage(steamID, '⚠️ group parameter must be a string');
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

        const filterCount = filter.length;
        if (filterCount === 0) {
            this.bot.sendMessage(steamID, `No items found with ${display.join('&')}.`);
        } else {
            const isPremium = this.bot.handler.getBotInfo.premium;

            const list = filter.map((entry, i) => {
                const name = this.bot.schema.getName(SKU.fromString(entry.sku));
                const stock = this.bot.inventoryManager.getInventory.getAmount(entry.sku, true);

                return `${i + 1}. ${entry.sku} - ${name}${name.length > 40 ? '\n' : ' '}(${stock}, ${entry.min}, ${
                    entry.max
                }, ${entry.intent}, ${entry.enabled ? '✅' : '❌'}, ${entry.autoprice ? '✅' : '❌'}${
                    isPremium ? `, ${entry.promoted === 1 ? '✅' : '❌'}, ` : ', '
                }${entry.group})`;
            });
            const listCount = list.length;

            const limit =
                params.limit === undefined ? 50 : (params.limit as number) <= 0 ? -1 : (params.limit as number);

            this.bot.sendMessage(
                steamID,
                `Found ${pluralize('item', filterCount, true)} with ${display.join('&')}${
                    limit !== -1 && params.limit === undefined && listCount > 50
                        ? `, showing only ${limit} items (you can send with parameter limit=-1 to list all)`
                        : `${
                              limit < listCount && limit > 0 && params.limit !== undefined
                                  ? ` (limit set to ${limit})`
                                  : ''
                          }.`
                }\n\n 📌 #. "sku" - "name" ("Current Stock", "min", "max", "intent", "enabled", "autoprice", *"promoted", "group")\n\n` +
                    '* - Only shown if your account is Backpack.tf Premium\n\n.'
            );

            const applyLimit = limit === -1 ? listCount : limit;
            const loops = Math.ceil(applyLimit / 50);

            for (let i = 0; i < loops; i++) {
                const last = loops - i === 1;
                const i50 = i * 50;

                const firstOrLast = i < 1 && limit > 0 && limit < 50 ? limit : i50 + (applyLimit - i50);

                this.bot.sendMessage(steamID, list.slice(i50, last ? firstOrLast : (i + 1) * 50).join('\n'));

                await sleepasync().Promise.sleep(1 * 1000);
            }
        }
    }
}

interface ErrorRequest {
    body?: ErrorBody;
    message?: string;
}

interface ErrorBody {
    message: string;
}
