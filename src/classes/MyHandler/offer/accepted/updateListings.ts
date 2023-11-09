import { Items, TradeOffer, ItemsDict } from '@tf2autobot/tradeoffer-manager';
import SKU from '@tf2autobot/tf2-sku';
import Currencies from '@tf2autobot/tf2-currencies';
import pluralize from 'pluralize';
import dayjs from 'dayjs';

import PriceCheckQueue from './requestPriceCheck';
import Bot from '../../../Bot';
import Pricelist, { EntryData } from '../../../Pricelist';
import { Attributes } from '../../../TF2GC';
import log from '../../../../lib/logger';
import { sendAlert } from '../../../DiscordWebhook/export';
import { PaintedNames } from '../../../Options';
import { testPriceKey } from '../../../../lib/tools/export';

let craftWeapons: string[] = [];

export default function updateListings(
    offer: TradeOffer,
    bot: Bot,
    highValue: { isDisableSKU: string[]; theirItems: string[]; items: Items }
): void {
    const opt = bot.options;
    const diff = offer.getDiff() || {};
    const dict = offer.data('dict') as ItemsDict;
    const weapons = opt.miscSettings.weaponsAsCurrency.enable
        ? opt.miscSettings.weaponsAsCurrency.withUncraft
            ? bot.craftWeapons.concat(bot.uncraftWeapons)
            : bot.craftWeapons
        : [];

    craftWeapons = weapons;

    const isPricecheckRequestEnabled = opt.miscSettings.pricecheckAfterTrade.enable;
    const alwaysRemoveCustomTexture = opt.miscSettings.alwaysRemoveItemAttributes.customTexture.enable;

    const inventory = bot.inventoryManager.getInventory;
    const highValueItems = highValue.items;
    const normalizePainted = opt.normalize.painted;
    const dwEnabled = opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url.main !== '';
    const pure = ['5000;6', '5001;6', '5002;6'];
    const pureWithWeapons = pure.concat(weapons);
    const isAdmin = bot.isAdmin(offer.partner);

    for (const priceKey in diff) {
        if (!Object.prototype.hasOwnProperty.call(diff, priceKey)) {
            continue;
        }

        if (!testPriceKey(priceKey)) {
            continue;
        }

        if (bot.pricelist.getPriceBySkuOrAsset({ priceKey })?.id) {
            bot.pricelist
                .removePrice(priceKey, true)
                .then(() => {
                    const msg = `✅ Automatically removed ${priceKey} from pricelist.`;
                    log.debug(msg);
                    if (opt.sendAlert.enable && opt.sendAlert.autoRemoveAssetidSuccess) {
                        if (dwEnabled) {
                            sendAlert('autoRemoveAssetidSuccess', bot, msg, null, null, [priceKey]);
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }
                })
                .catch(err => {
                    const msg = `❌ Failed to automatically remove ${priceKey} from pricelist: ${
                        (err as Error).message
                    }`;
                    log.warn(msg, err);

                    if (opt.sendAlert.enable && opt.sendAlert.autoRemoveAssetidFailed) {
                        if (dwEnabled) {
                            sendAlert('autoRemoveAssetidFailed', bot, msg, null, null, [priceKey]);
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }
                });

            continue;
        }

        const item = SKU.fromString(priceKey);
        const name = bot.schema.getName(item, false);

        const isNotPure = !pure.includes(priceKey);
        const isNotPureOrWeapons = !pureWithWeapons.includes(priceKey);

        const priceListEntry = bot.pricelist.getPrice({ priceKey, onlyEnabled: false });
        const existsInPricelist = null !== priceListEntry;
        const isAssetId = Pricelist.isAssetId(priceKey);
        const amount = inventory.getAmount({ priceKey, includeNonNormalized: false, tradableOnly: true });

        const itemNoPaint = SKU.fromString(priceKey);
        itemNoPaint.paint = null;
        const skuNoPaint = SKU.fromObject(itemNoPaint);
        const priceListEntryWithoutPaint = bot.pricelist.getPrice({ priceKey: skuNoPaint, onlyEnabled: false });
        const inPriceListWithoutPaint = null !== priceListEntryWithoutPaint;

        const isDisabledHV = highValue.isDisableSKU.includes(priceKey);

        const isNotSkinsOrWarPaint = item.wear === null;
        // if item is unusual and autoAddInvalidUnusual is set to true then we allow addInvalidUnusual.
        // If the item is not an unusual sku, we "allow" still (no-op)
        const addInvalidUnusual = item.quality === 5 ? opt.pricelist.autoAddInvalidUnusual.enable : true;

        const isAutopriceManuallyPricedItem =
            opt.pricelist.autoResetToAutopriceOnceSold.enable &&
            existsInPricelist &&
            priceListEntry.autoprice === false &&
            priceListEntry.intent === 2 && // Only if intent is set to bank
            amount === 0; // No longer exist

        const common1 =
            normalizePainted.our === false && // must meet this setting
            normalizePainted.their === true && // must meet this setting
            highValueItems && // this must be defined
            highValueItems[priceKey]?.p && // painted must be defined
            highValueItems[priceKey]?.s === undefined; // make sure spelled is undefined

        const isAutoaddPainted = /;[p][0-9]+/.test(priceKey)
            ? false // sku must NOT include any painted partial sku
            : opt.pricelist.autoAddPaintedItems.enable && // autoAddPaintedItems must enabled
              common1 &&
              existsInPricelist && // base items must already in pricelist
              !bot.pricelist.getPrice({
                  priceKey: `${priceKey};${Object.keys(highValueItems[priceKey].p)[0]}`,
                  onlyEnabled: false
              }) && // painted items must not in pricelist
              inventory.getAmount({
                  priceKey: `${priceKey};${Object.keys(highValueItems[priceKey].p)[0]}`,
                  includeNonNormalized: false,
                  tradableOnly: true
              }) > 0;

        const isAutoAddPaintedFromAdmin = !isAdmin
            ? false
            : /;[p][0-9]+/.test(priceKey) && // sku must include any painted partial sku
              common1 &&
              !existsInPricelist && // painted items must not in pricelist
              inPriceListWithoutPaint && // base items must already in pricelist
              amount > 0;

        const common2 =
            !existsInPricelist &&
            isNotPureOrWeapons &&
            isNotSkinsOrWarPaint && // exclude War Paint (could be skins)
            !isAdmin;

        const isAutoaddInvalidItems =
            opt.pricelist.autoAddInvalidItems.enable &&
            common2 &&
            priceKey !== '5021;6' && // not Mann Co. Supply Crate Key
            addInvalidUnusual &&
            !isDisabledHV;

        const receivedHighValueNotInPricelist = common2 && isDisabledHV;

        const receivedUnusualNotInPricelist =
            opt.pricelist.autoAddInvalidUnusual.enable === false && common2 && item.quality === 5;

        const isAutoDisableHighValueItems =
            opt.highValue.enableHold && existsInPricelist && isDisabledHV && isNotPureOrWeapons;

        const common3 =
            amount < 1 && // current stock
            isNotPureOrWeapons;

        const isAutoRemoveIntentSell =
            opt.pricelist.autoRemoveIntentSell.enable &&
            existsInPricelist &&
            priceListEntry.intent === 1 &&
            (opt.autokeys.enable ? priceKey !== '5021;6' : true) && // not Mann Co. Supply Crate Key if Autokeys enabled
            common3;

        const isUpdatePartialPricedItem =
            existsInPricelist && priceListEntry.autoprice && priceListEntry.isPartialPriced && common3;

        //

        if (isAutopriceManuallyPricedItem) {
            const entry: EntryData = {
                sku: priceListEntry.sku,
                intent: priceListEntry.intent,
                enabled: priceListEntry.enabled,
                min: priceListEntry.min,
                max: priceListEntry.max,
                autoprice: true, // We only change this
                note: priceListEntry.note,
                promoted: priceListEntry.promoted,
                group: priceListEntry.group
            };

            bot.pricelist
                .updatePrice({ priceKey, entryData: entry, emitChange: true })
                .then(updatedEntry => {
                    const msg =
                        `✅ Automatically reset ${priceListEntry.sku} to autoprice (item sold).` +
                        `\nPrevious: ${priceListEntry.buy.toString()}/${priceListEntry.sell.toString()}` +
                        `\nNew: ${updatedEntry.buy.toString()}/${updatedEntry.sell.toString()}`;
                    log.debug(msg);

                    if (opt.sendAlert.enable && opt.sendAlert.autoResetToAutopriceOnceSold) {
                        if (dwEnabled) {
                            sendAlert('autoResetToAutopriceOnceSold', bot, msg, null, null, [priceListEntry.sku]);
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                })
                .catch(err => {
                    log.warn(`❌ Failed to automatically reset ${priceListEntry.sku} to autoprice: `, err);
                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                });
        }
        if (isAutoaddPainted) {
            const pSKU = Object.keys(highValueItems[priceKey].p)[0];
            const paintedSKU = `${priceKey};${pSKU}`;

            const priceFromOptions =
                opt.detailsExtra.painted[
                    bot.schema.getPaintNameByDecimal(parseInt(pSKU.replace('p', ''), 10)) as PaintedNames
                ].price;

            const keyPriceInRef = bot.pricelist.getKeyPrice.metal;
            const keyPriceInScrap = Currencies.toScrap(keyPriceInRef);

            let sellingKeyPrice = priceListEntry.sell.keys + priceFromOptions.keys;
            let sellingMetalPriceInRef = priceListEntry.sell.metal + priceFromOptions.metal;
            const sellingMetalPriceInScrap = Currencies.toScrap(sellingMetalPriceInRef);

            if (sellingMetalPriceInScrap >= keyPriceInScrap) {
                const truncValue = Math.trunc(sellingMetalPriceInRef / keyPriceInRef);
                sellingKeyPrice =
                    sellingKeyPrice - truncValue <= 0 ? sellingKeyPrice + 1 : sellingKeyPrice + truncValue;
                sellingMetalPriceInRef = Currencies.toRefined(sellingMetalPriceInScrap - truncValue * keyPriceInScrap);
            }

            const entry = {
                sku: paintedSKU,
                enabled: true,
                autoprice: false,
                buy: {
                    keys: 0,
                    metal: 1 // always set like this for buying price
                },
                sell: {
                    keys: sellingKeyPrice,
                    metal: sellingMetalPriceInRef
                },
                min: 0,
                max: 1,
                intent: 1,
                group: 'painted'
            } as EntryData;

            bot.pricelist
                .addPrice({ entryData: entry, emitChange: true })
                .then(data => {
                    const msg =
                        `✅ Automatically added ${bot.schema.getName(SKU.fromString(paintedSKU), false)}` +
                        ` (${paintedSKU}) to sell.` +
                        `\nBase price: ${priceListEntry.buy.toString()}/${priceListEntry.sell.toString()}` +
                        `\nSelling for: ${data.sell.toString()} ` +
                        `(+ ${priceFromOptions.keys > 0 ? `${pluralize('key', priceFromOptions.keys, true)}, ` : ''}${
                            priceFromOptions.metal
                        } ref)` +
                        `\nItem page: https://autobot.tf/items/${priceKey}`;

                    log.debug(msg);

                    if (opt.sendAlert.enable && opt.sendAlert.autoAddPaintedItems) {
                        if (dwEnabled) {
                            sendAlert('autoAddPaintedItems', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    if (isPricecheckRequestEnabled) addToQ(paintedSKU, isNotPure, existsInPricelist);
                })
                .catch(err => {
                    const msg =
                        `❌ Failed to add ${bot.schema.getName(SKU.fromString(paintedSKU), false)}` +
                        ` (${paintedSKU}) to sell automatically: ${(err as Error).message}`;

                    log.warn(`Failed to add ${paintedSKU} to sell automatically:`, err);

                    if (opt.sendAlert.enable && opt.sendAlert.autoAddPaintedItems) {
                        if (dwEnabled) {
                            sendAlert('autoAddPaintedItemsFailed', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    if (isPricecheckRequestEnabled) addToQ(paintedSKU, isNotPure, existsInPricelist);
                });
            //
        } else if (isAutoAddPaintedFromAdmin) {
            const priceFromOptions =
                opt.detailsExtra.painted[bot.schema.getPaintNameByDecimal(item.paint) as PaintedNames].price;

            const keyPriceInRef = bot.pricelist.getKeyPrice.metal;
            const keyPriceInScrap = Currencies.toScrap(keyPriceInRef);

            let sellingKeyPrice = priceListEntryWithoutPaint.sell.keys + priceFromOptions.keys;
            let sellingMetalPriceInRef = priceListEntryWithoutPaint.sell.metal + priceFromOptions.metal;
            const sellingMetalPriceInScrap = Currencies.toScrap(sellingMetalPriceInRef);

            if (sellingMetalPriceInScrap >= keyPriceInScrap) {
                const truncValue = Math.trunc(sellingMetalPriceInRef / keyPriceInRef);
                sellingKeyPrice =
                    sellingKeyPrice - truncValue <= 0 ? sellingKeyPrice + 1 : sellingKeyPrice + truncValue;
                sellingMetalPriceInRef = Currencies.toRefined(sellingMetalPriceInScrap - truncValue * keyPriceInScrap);
            }

            const entry = {
                sku: priceKey,
                enabled: true,
                autoprice: false,
                buy: {
                    keys: 0,
                    metal: 1 // always set like this for buying price
                },
                sell: {
                    keys: sellingKeyPrice,
                    metal: sellingMetalPriceInRef
                },
                min: 0,
                max: 1,
                intent: 1,
                group: 'painted'
            } as EntryData;

            bot.pricelist
                .addPrice({ entryData: entry, emitChange: true })
                .then(data => {
                    const msg =
                        `✅ Automatically added ${name} (${priceKey}) to sell.` +
                        `\nBase price: ${priceListEntryWithoutPaint.buy.toString()}/${priceListEntryWithoutPaint.sell.toString()}` +
                        `\nSelling for: ${data.sell.toString()} ` +
                        `(+ ${priceFromOptions.keys > 0 ? `${pluralize('key', priceFromOptions.keys, true)}, ` : ''}${
                            priceFromOptions.metal
                        } ref)` +
                        `\nItem page: https://autobot.tf/items/${skuNoPaint}`;

                    log.debug(msg);

                    if (opt.sendAlert.enable && opt.sendAlert.autoAddPaintedItems) {
                        if (dwEnabled) {
                            sendAlert('autoAddPaintedItems', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                })
                .catch(err => {
                    const msg = `❌ Failed to add ${name} (${priceKey}) to sell automatically: ${
                        (err as Error).message
                    }`;

                    log.warn(`Failed to add ${priceKey} to sell automatically:`, err);

                    if (opt.sendAlert.enable && opt.sendAlert.autoAddPaintedItems) {
                        if (dwEnabled) {
                            sendAlert('autoAddPaintedItemsFailed', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                });
            //
        } else if (isAutoaddInvalidItems) {
            // if the item sku is not in pricelist, not craftweapons or pure or skins or highValue items, and not
            // from ADMINS, then add INVALID_ITEMS to the pricelist.
            const entry = {
                sku: priceKey,
                enabled: true,
                autoprice: true,
                min: 0,
                max: 1,
                intent: 1,
                group: 'invalidItem'
            } as EntryData;

            bot.pricelist
                .addPrice({ entryData: entry, emitChange: true })
                .then(() => {
                    log.debug(`✅ Automatically added ${name} (${priceKey}) to sell.`);
                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                })
                .catch(err => {
                    log.warn(`❌ Failed to add ${name} (${priceKey}) to sell automatically: ${(err as Error).message}`);
                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                });
            //
        } else if (receivedHighValueNotInPricelist) {
            // if the item sku is not in pricelist, not craftweapons or pure or skins AND it's a highValue items, and not
            // from ADMINS, then notify admin.
            let msg =
                'I have received a high-valued items which is not in my pricelist.' + '\n\nItem information:\n\n- ';

            const theirCount = highValue.theirItems.length;

            for (let i = 0; i < theirCount; i++) {
                if (highValue.theirItems[i].includes(name)) {
                    msg += `${highValue.isDisableSKU[i]}: ` + highValue.theirItems[i];
                }
            }

            if (opt.sendAlert.enable && opt.sendAlert.highValue.receivedNotInPricelist) {
                if (dwEnabled) {
                    sendAlert('highValuedInvalidItems', bot, msg.replace(/"/g, '`'));
                } else {
                    bot.messageAdmins(msg, []);
                }
            }

            if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
        } else if (receivedUnusualNotInPricelist) {
            // if the item sku is not in pricelist, not craftweapons or pure or skins AND it's a Unusual (bought with Generic Unusual), and not
            // from ADMINS, and opt.pricelist.autoAddInvalidUnusual is false, then notify admin.
            const msg =
                'I have received an Unusual bought with Generic Unusual feature\n\nItem info: ' +
                (dwEnabled ? `[${name}](https://autobot.tf/items/${priceKey}) (${priceKey})` : `${name} (${priceKey})`);

            if (opt.sendAlert.enable && opt.sendAlert.receivedUnusualNotInPricelist) {
                if (dwEnabled) {
                    sendAlert('unusualInvalidItems', bot, msg.replace(/"/g, '`'));
                } else {
                    bot.messageAdmins(msg, []);
                }
            }

            if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
        } else if (isAutoDisableHighValueItems) {
            // If item received is high value, temporarily disable that item so it will not be sellable.
            const oldGroup = priceListEntry.group;

            const entry: EntryData = {
                sku: priceKey,
                enabled: false, // We only change this
                autoprice: priceListEntry.autoprice,
                min: priceListEntry.min,
                max: priceListEntry.max,
                intent: priceListEntry.intent,
                note: priceListEntry.note,
                promoted: priceListEntry.promoted,
                group: priceListEntry.group
            };

            if (!priceListEntry.autoprice) {
                // if not autopriced, then explicitly set the buy/sell prices
                // with the current buy/sell prices
                entry.buy = {
                    keys: priceListEntry.buy.keys,
                    metal: priceListEntry.buy.metal
                };
                entry.sell = {
                    keys: priceListEntry.sell.keys,
                    metal: priceListEntry.sell.metal
                };
            }

            if (!opt.highValue.retainOldGroup) {
                entry.group = opt.highValue.customGroup ? opt.highValue.customGroup : 'highValue';
            }

            bot.pricelist
                .updatePrice({ priceKey, entryData: entry, emitChange: true })
                .then(() => {
                    log.debug(`✅ Automatically disabled ${priceKey}, which is a high value item.`);
                    const prefix = bot.getPrefix();

                    let msg =
                        `I have temporarily disabled ${name} (${priceKey}) because it contains some high value spells/parts.` +
                        `\nYou can manually price it with "${prefix}update sku=${priceKey}&enabled=true&<buy and sell price>"` +
                        ` or just re-enable it with "${prefix}update sku=${priceKey}&enabled=true${
                            opt.highValue.retainOldGroup ? '' : `&group=${oldGroup}".`
                        }` +
                        '\n\nItem information:\n\n- ';

                    const theirCount = highValue.theirItems.length;

                    for (let i = 0; i < theirCount; i++) {
                        if (highValue.theirItems[i].includes(name)) msg += highValue.theirItems[i];
                    }

                    if (opt.sendAlert.enable && opt.sendAlert.highValue.gotDisabled) {
                        if (dwEnabled) {
                            sendAlert('highValuedDisabled', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                })
                .catch(err => {
                    log.warn(`❌ Failed to disable high value ${priceKey}: `, err);
                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                });
            //
        } else if (isAutoRemoveIntentSell) {
            // If "automatic remove items with intent=sell" enabled and it's in the pricelist and no more stock,
            // then remove the item entry from pricelist.
            bot.pricelist
                .removePrice(priceKey, true)
                .then(() => {
                    log.debug(`✅ Automatically removed ${name} (${priceKey}) from pricelist.`);
                    if (isPricecheckRequestEnabled && !isAssetId) addToQ(priceKey, isNotPure, existsInPricelist);
                })
                .catch(err => {
                    const msg = `❌ Failed to automatically remove ${name} (${priceKey}) from pricelist: ${
                        (err as Error).message
                    }`;
                    log.warn(`❌ Failed to automatically remove ${priceKey}`, err);

                    if (opt.sendAlert.enable && opt.sendAlert.autoRemoveIntentSellFailed) {
                        if (dwEnabled) {
                            sendAlert('autoRemoveIntentSellFailed', bot, msg);
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    if (isPricecheckRequestEnabled && !isAssetId) addToQ(priceKey, isNotPure, existsInPricelist);
                });
        } else if (isUpdatePartialPricedItem) {
            // If item exist in pricelist with "isPartialPriced" set to true and we no longer have that in stock,
            // then update entry with the latest prices.

            const oldPrice = {
                buy: new Currencies(priceListEntry.buy),
                sell: new Currencies(priceListEntry.sell)
            };

            const oldTime = priceListEntry.time;

            const entry = {
                sku: priceKey,
                enabled: priceListEntry.enabled,
                autoprice: true,
                min: priceListEntry.min,
                max: priceListEntry.max,
                intent: priceListEntry.intent,
                group: priceListEntry.group,
                isPartialPriced: false
            } as EntryData;

            bot.pricelist
                .updatePrice({ priceKey: entry.sku, entryData: entry, emitChange: true })
                .then(data => {
                    const msg =
                        `${dwEnabled ? `[${name}](https://autobot.tf/items/${priceKey})` : name} (${priceKey})\n▸ ` +
                        [
                            `old: ${oldPrice.buy.toString()}/${oldPrice.sell.toString()}`,
                            `new: ${data.buy.toString()}/${data.sell.toString()}`
                        ].join('\n▸ ') +
                        `\n - Partial priced since ${dayjs.unix(oldTime).fromNow()}` +
                        `\n - Current prices last update: ${dayjs.unix(data.time).fromNow()}`;

                    log.debug(msg);

                    if (opt.sendAlert.enable && opt.sendAlert.partialPrice.onSuccessUpdatePartialPriced) {
                        if (dwEnabled) {
                            sendAlert('autoUpdatePartialPriceSuccess', bot, msg);
                        } else {
                            bot.messageAdmins('✅ Automatically update partially priced item - ' + msg, []);
                        }
                    }

                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                })
                .catch(err => {
                    let msg = `❌ Failed to automatically update partially priced for ${name} (${priceKey}) and the item has been temporarily disabled.\n\nError: ${
                        (err as Error).message
                    }`;
                    log.error(`❌ Failed to automatically update prices for ${priceKey}`, err);

                    entry.autoprice = false;
                    entry.enabled = false;
                    bot.pricelist
                        .updatePrice({ priceKey: entry.sku, entryData: entry, emitChange: true })
                        .then(() => {
                            log.info(`${name} (${priceKey}) has been temporarily disabled.`);

                            if (opt.sendAlert.enable && opt.sendAlert.partialPrice.onFailedUpdatePartialPriced) {
                                if (dwEnabled) {
                                    sendAlert('autoUpdatePartialPriceFailed', bot, msg);
                                } else {
                                    bot.messageAdmins(msg, []);
                                }
                            }
                        })
                        .catch(err => {
                            log.error(`Error disabling ${name} (${priceKey}):`, err);

                            if (opt.sendAlert.enable && opt.sendAlert.partialPrice.onFailedUpdatePartialPriced) {
                                if (dwEnabled) {
                                    msg = `❌ Failed to automatically disable partially priced ${name} (${priceKey}) after failing to get the latest item price.`;
                                    sendAlert('autoUpdatePartialPriceFailedToDisable', bot, msg);
                                } else {
                                    bot.messageAdmins(msg, []);
                                }
                            }
                        });

                    if (isPricecheckRequestEnabled) addToQ(priceKey, isNotPure, existsInPricelist);
                });
        } else {
            if (isPricecheckRequestEnabled && !isAssetId) addToQ(priceKey, isNotPure, existsInPricelist);
        }

        if (
            [474, 619, 623, 625].includes(item.defindex) &&
            alwaysRemoveCustomTexture &&
            dict.their[priceKey] !== undefined
        ) {
            const amountTraded = dict.their[priceKey];
            const assetids = inventory.findBySKU(priceKey, true).sort((a, b) => parseInt(b) - parseInt(a)); // descending order
            const assetidsTraded = assetids.slice(0).splice(0, amountTraded);

            log.debug(`Adding ${priceKey} (${assetidsTraded.join(', ')}) to the queue to remove custom texture...`);

            assetidsTraded.forEach(assetid => {
                bot.tf2gc.removeAttributes(priceKey, assetid, Attributes.CustomTexture, err => {
                    if (err) log.debug(`Error remove custom texture for ${priceKey} (${assetid})`, err);
                });
            });

            // if (opt.miscSettings.alwaysRemoveItemAttributes.giftedByTag.enable) {
            //     assetidsTraded.forEach(assetid => {
            //         bot.tf2gc.removeAttributes(sku, assetid, Attributes.GiftedBy, err => {
            //             if (err) log.debug(`Error remove giftedBy tag for ${sku} (${assetid})`, err);
            //         });
            //     });
            // }
        }
    }
}

function addToQ(sku: string, isNotPure: boolean, existsInPricelist: boolean): void {
    /**
     * Request pricecheck on each sku involved in the trade, except craft weapons (if weaponsAsCurrency enabled) and pure.
     */
    if (isNotPure) {
        if (craftWeapons.includes(sku)) {
            if (existsInPricelist) {
                // Only includes sku of weapons that are in the pricelist (enabled)
                PriceCheckQueue.enqueue(sku);
            }
        } else {
            PriceCheckQueue.enqueue(sku);
        }
    }
}
