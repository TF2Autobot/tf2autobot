import { Items, TradeOffer } from '@tf2autobot/tradeoffer-manager';
import SKU from 'tf2-sku-2';
import Currencies from 'tf2-currencies-2';
import pluralize from 'pluralize';
import dayjs from 'dayjs';

import PriceCheckQueue from './requestPriceCheck';
import Bot from '../../../Bot';
import { EntryData } from '../../../Pricelist';
import log from '../../../../lib/logger';
import { sendAlert } from '../../../../lib/DiscordWebhook/export';
import { PaintedNames } from '../../../Options';
import { testSKU } from '../../../../lib/tools/export';

let itemsFromPreviousTrades: string[] = [];

const removeDuplicate = (skus: string[]): string[] => {
    const fix = new Set(skus);
    return [...fix];
};

let craftWeapons: string[] = [];

export default function updateListings(
    offer: TradeOffer,
    bot: Bot,
    highValue: { isDisableSKU: string[]; theirItems: string[]; items: Items }
): void {
    const opt = bot.options;
    const diff = offer.getDiff() || {};
    const weapons = opt.miscSettings.weaponsAsCurrency.enable
        ? opt.miscSettings.weaponsAsCurrency.withUncraft
            ? bot.craftWeapons.concat(bot.uncraftWeapons)
            : bot.craftWeapons
        : [];

    craftWeapons = weapons;

    const skus: string[] = [];

    const inventory = bot.inventoryManager.getInventory;
    const hv = highValue.items;
    const normalizePainted = opt.normalize.painted;
    const dwEnabled = opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '';
    const pure = ['5000;6', '5001;6', '5002;6'];

    for (const sku in diff) {
        if (!Object.prototype.hasOwnProperty.call(diff, sku)) {
            continue;
        }

        if (!testSKU(sku)) {
            continue;
        }

        const item = SKU.fromString(sku);
        const name = bot.schema.getName(item, false);

        const isNotPure = !pure.includes(sku);
        const isNotPureOrWeapons = !pure.concat(weapons).includes(sku);
        const inPrice = bot.pricelist.getPrice(sku, false);
        const existInPricelist = inPrice !== null;
        const amount = inventory.getAmount(sku, false, true);

        const isAdmin = bot.isAdmin(offer.partner);

        const itemNoPaint = SKU.fromString(sku);
        itemNoPaint.paint = null;
        const skuNoPaint = SKU.fromObject(itemNoPaint);
        const inPrice2 = bot.pricelist.getPrice(skuNoPaint, false);

        const isDisabledHV = highValue.isDisableSKU.includes(sku);

        const isNotSkinsOrWarPaint = item.wear === null;
        // if item is unusual and autoAddInvalidUnusual is set to true then we allow addInvalidUnusual.
        // If the item is not an unusual sku, we "allow" still (no-op)
        const addInvalidUnusual = item.quality === 5 ? opt.pricelist.autoAddInvalidUnusual.enable : true;

        const isAutoaddPainted = /;[p][0-9]+/.test(sku)
            ? false // sku must NOT include any painted partial sku
            : opt.pricelist.autoAddPaintedItems.enable && // autoAddPaintedItems must enabled
              normalizePainted.our === false && // must meet this setting
              normalizePainted.their === true && // must meet this setting
              hv && // this must be defined
              hv[sku]?.p && // painted must be defined
              hv[sku]?.s === undefined && // make sure spelled is undefined
              inPrice !== null && // base items must already in pricelist
              bot.pricelist.getPrice(`${sku};${Object.keys(hv[sku].p)[0]}`, false) === null && // painted items must not in pricelist
              inventory.getAmount(`${sku};${Object.keys(hv[sku].p)[0]}`, false, true) > 0;

        const isAutoAddPaintedFromAdmin = !isAdmin
            ? false
            : normalizePainted.our === false && // must meet this setting
              normalizePainted.their === true && // must meet this setting
              /;[p][0-9]+/.test(sku) && // sku must include any painted partial sku
              hv && // this must be defined
              hv[sku]?.p && // painted must be defined
              hv[sku]?.s === undefined && // make sure spelled is undefined
              inPrice === null && // painted items must not in pricelist
              inPrice2 !== null && // base items must already in pricelist
              amount > 0;

        const isAutoaddInvalidItems =
            !existInPricelist &&
            isNotPureOrWeapons &&
            sku !== '5021;6' && // not Mann Co. Supply Crate Key
            isNotSkinsOrWarPaint && // exclude War Paint (could be skins)
            addInvalidUnusual &&
            !isDisabledHV &&
            !isAdmin &&
            opt.pricelist.autoAddInvalidItems.enable;

        const receivedHighValueNotInPricelist =
            !existInPricelist &&
            isNotPureOrWeapons &&
            isNotSkinsOrWarPaint && // exclude War Paint (could be skins)
            isDisabledHV && // This is the only difference
            !isAdmin;

        const receivedUnusualNotInPricelist =
            !existInPricelist &&
            isNotPureOrWeapons &&
            isNotSkinsOrWarPaint &&
            item.quality === 5 &&
            opt.pricelist.autoAddInvalidUnusual.enable === false &&
            !isAdmin;

        const isAutoDisableHighValueItems =
            existInPricelist && isDisabledHV && isNotPureOrWeapons && opt.highValue.enableHold;

        const isAutoRemoveIntentSell =
            opt.pricelist.autoRemoveIntentSell.enable &&
            existInPricelist &&
            inPrice.intent === 1 &&
            (opt.autokeys.enable ? sku !== '5021;6' : true) && // not Mann Co. Supply Crate Key if Autokeys enabled
            amount < 1 && // current stock
            isNotPureOrWeapons;

        const isUpdatePartialPricedItem =
            inPrice !== null &&
            inPrice.autoprice &&
            inPrice.isPartialPriced &&
            amount < 1 && // current stock
            isNotPureOrWeapons;

        //

        if (isAutoaddPainted) {
            const pSKU = Object.keys(hv[sku].p)[0];
            const paintedSKU = `${sku};${pSKU}`;

            const priceFromOptions =
                opt.detailsExtra.painted[
                    bot.schema.getPaintNameByDecimal(parseInt(pSKU.replace('p', ''), 10)) as PaintedNames
                ].price;

            const keyPriceInRef = bot.pricelist.getKeyPrice.metal;
            const keyPriceInScrap = Currencies.toScrap(keyPriceInRef);

            let sellingKeyPrice = inPrice.sell.keys + priceFromOptions.keys;
            let sellingMetalPriceInRef = inPrice.sell.metal + priceFromOptions.metal;
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

            const isCustomPricer = bot.pricelist.isUseCustomPricer;

            bot.pricelist
                .addPrice(entry, true)
                .then(data => {
                    const msg =
                        `✅ Automatically added ${bot.schema.getName(SKU.fromString(paintedSKU), false)}` +
                        ` (${paintedSKU}) to sell.` +
                        `\nBase price: ${inPrice.buy.toString()}/${inPrice.sell.toString()}` +
                        `\nSelling for: ${data.sell.toString()} ` +
                        `(+ ${priceFromOptions.keys > 0 ? `${pluralize('key', priceFromOptions.keys, true)}, ` : ''}${
                            priceFromOptions.metal
                        } ref)` +
                        (isCustomPricer
                            ? '\n - Base selling price was fetched from custom auto-pricer'
                            : `\nhttps://www.prices.tf/items/${sku}`);

                    log.debug(msg);

                    if (opt.sendAlert.enable && opt.sendAlert.autoAddPaintedItems) {
                        if (dwEnabled) {
                            sendAlert('autoAddPaintedItems', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    addToQueu(paintedSKU, isNotPure, existInPricelist);
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

                    addToQueu(paintedSKU, isNotPure, existInPricelist);
                });
            //
        } else if (isAutoAddPaintedFromAdmin) {
            const priceFromOptions =
                opt.detailsExtra.painted[bot.schema.getPaintNameByDecimal(item.paint) as PaintedNames].price;

            const keyPriceInRef = bot.pricelist.getKeyPrice.metal;
            const keyPriceInScrap = Currencies.toScrap(keyPriceInRef);

            let sellingKeyPrice = inPrice.sell.keys + priceFromOptions.keys;
            let sellingMetalPriceInRef = inPrice.sell.metal + priceFromOptions.metal;
            const sellingMetalPriceInScrap = Currencies.toScrap(sellingMetalPriceInRef);

            if (sellingMetalPriceInScrap >= keyPriceInScrap) {
                const truncValue = Math.trunc(sellingMetalPriceInRef / keyPriceInRef);
                sellingKeyPrice =
                    sellingKeyPrice - truncValue <= 0 ? sellingKeyPrice + 1 : sellingKeyPrice + truncValue;
                sellingMetalPriceInRef = Currencies.toRefined(sellingMetalPriceInScrap - truncValue * keyPriceInScrap);
            }

            const entry = {
                sku: sku,
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

            const isCustomPricer = bot.pricelist.isUseCustomPricer;

            bot.pricelist
                .addPrice(entry, true)
                .then(data => {
                    const msg =
                        `✅ Automatically added ${name} (${sku}) to sell.` +
                        `\nBase price: ${inPrice2.buy.toString()}/${inPrice2.sell.toString()}` +
                        `\nSelling for: ${data.sell.toString()} ` +
                        `(+ ${priceFromOptions.keys > 0 ? `${pluralize('key', priceFromOptions.keys, true)}, ` : ''}${
                            priceFromOptions.metal
                        } ref)` +
                        (isCustomPricer
                            ? '\n - Base selling price was fetched from custom auto-pricer'
                            : `\nhttps://www.prices.tf/items/${skuNoPaint}`);

                    log.debug(msg);

                    if (opt.sendAlert.enable && opt.sendAlert.autoAddPaintedItems) {
                        if (dwEnabled) {
                            sendAlert('autoAddPaintedItems', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    addToQueu(sku, isNotPure, existInPricelist);
                })
                .catch(err => {
                    const msg = `❌ Failed to add ${name} (${sku}) to sell automatically: ${(err as Error).message}`;

                    log.warn(`Failed to add ${sku} to sell automatically:`, err);

                    if (opt.sendAlert.enable && opt.sendAlert.autoAddPaintedItems) {
                        if (dwEnabled) {
                            sendAlert('autoAddPaintedItemsFailed', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    addToQueu(sku, isNotPure, existInPricelist);
                });
            //
        } else if (isAutoaddInvalidItems) {
            // if the item sku is not in pricelist, not craftweapons or pure or skins or highValue items, and not
            // from ADMINS, then add INVALID_ITEMS to the pricelist.
            const entry = {
                sku: sku,
                enabled: true,
                autoprice: true,
                min: 0,
                max: 1,
                intent: 1,
                group: 'invalidItem'
            } as EntryData;

            bot.pricelist
                .addPrice(entry, true)
                .then(() => {
                    log.debug(`✅ Automatically added ${name} (${sku}) to sell.`);
                    addToQueu(sku, isNotPure, existInPricelist);
                })
                .catch(err => {
                    log.warn(`❌ Failed to add ${name} (${sku}) to sell automatically: ${(err as Error).message}`);
                    addToQueu(sku, isNotPure, existInPricelist);
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

            addToQueu(sku, isNotPure, existInPricelist);
        } else if (receivedUnusualNotInPricelist) {
            // if the item sku is not in pricelist, not craftweapons or pure or skins AND it's a Unusual (bought with Generic Unusual), and not
            // from ADMINS, and opt.pricelist.autoAddInvalidUnusual is false, then notify admin.
            const msg =
                'I have received an Unusual bought with Generic Unusual feature\n\nItem info: ' +
                (dwEnabled ? `[${name}](https://www.prices.tf/items/${sku}) (${sku})` : `${name} (${sku})`);

            if (opt.sendAlert.enable && opt.sendAlert.receivedUnusualNotInPricelist) {
                if (dwEnabled) {
                    sendAlert('unusualInvalidItems', bot, msg.replace(/"/g, '`'));
                } else {
                    bot.messageAdmins(msg, []);
                }
            }

            addToQueu(sku, isNotPure, existInPricelist);
        } else if (isAutoDisableHighValueItems) {
            // If item received is high value, temporarily disable that item so it will not be sellable.
            const oldGroup = inPrice.group;

            const entry: EntryData = {
                sku: sku, // required
                enabled: false, // required
                autoprice: inPrice.autoprice, // required
                min: inPrice.min, // required
                max: inPrice.max, // required
                intent: inPrice.intent, // required
                group: 'highValue'
            };

            if (!inPrice.autoprice) {
                // if not autopriced, then explicitly set the buy/sell prices
                // with the current buy/sell prices
                entry.buy = {
                    keys: inPrice.buy.keys,
                    metal: inPrice.buy.metal
                };
                entry.sell = {
                    keys: inPrice.sell.keys,
                    metal: inPrice.sell.metal
                };
            }

            bot.pricelist
                .updatePrice(entry, true)
                .then(() => {
                    log.debug(`✅ Automatically disabled ${sku}, which is a high value item.`);

                    let msg =
                        `I have temporarily disabled ${name} (${sku}) because it contains some high value spells/parts.` +
                        `\nYou can manually price it with "!update sku=${sku}&enabled=true&<buy and sell price>"` +
                        ` or just re-enable it with "!update sku=${sku}&enabled=true&group=${oldGroup}".` +
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

                    addToQueu(sku, isNotPure, existInPricelist);
                })
                .catch(err => {
                    log.warn(`❌ Failed to disable high value ${sku}: `, err);
                    addToQueu(sku, isNotPure, existInPricelist);
                });
            //
        } else if (isAutoRemoveIntentSell) {
            // If "automatic remove items with intent=sell" enabled and it's in the pricelist and no more stock,
            // then remove the item entry from pricelist.
            bot.pricelist
                .removePrice(sku, true)
                .then(() => {
                    log.debug(`✅ Automatically removed ${name} (${sku}) from pricelist.`);
                    addToQueu(sku, isNotPure, existInPricelist);
                })
                .catch(err => {
                    const msg = `❌ Failed to automatically remove ${name} (${sku}) from pricelist: ${
                        (err as Error).message
                    }`;
                    log.warn(`❌ Failed to automatically remove ${sku}`, err);

                    if (opt.sendAlert.enable && opt.sendAlert.autoRemoveIntentSellFailed) {
                        if (dwEnabled) {
                            sendAlert('autoRemoveIntentSellFailed', bot, msg);
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    addToQueu(sku, isNotPure, existInPricelist);
                });
        } else if (isUpdatePartialPricedItem) {
            // If item exist in pricelist with "isPartialPriced" set to true and we no longer have that in stock,
            // then update entry with the latest prices.

            const oldPrice = {
                buy: new Currencies(inPrice.buy),
                sell: new Currencies(inPrice.sell)
            };

            const oldTime = inPrice.time;

            const entry = {
                sku: sku,
                enabled: inPrice.enabled,
                autoprice: true,
                min: inPrice.min,
                max: inPrice.max,
                intent: inPrice.intent,
                group: inPrice.group,
                isPartialPriced: false
            } as EntryData;

            bot.pricelist
                .updatePrice(entry, true)
                .then(data => {
                    const msg =
                        `${dwEnabled ? `[${name}](https://www.prices.tf/items/${sku})` : name} (${sku})\n▸ ` +
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

                    addToQueu(sku, isNotPure, existInPricelist);
                })
                .catch(err => {
                    const msg = `❌ Failed to automatically update prices for ${name} (${sku}): ${
                        (err as Error).message
                    }`;
                    log.error(`❌ Failed to automatically update prices for ${sku}`, err);

                    if (opt.sendAlert.enable && opt.sendAlert.partialPrice.onFailedUpdatePartialPriced) {
                        if (dwEnabled) {
                            sendAlert('autoUpdatePartialPriceFailed', bot, msg);
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }

                    addToQueu(sku, isNotPure, existInPricelist);
                });
        } else {
            addToQueu(sku, isNotPure, existInPricelist);
        }
    }

    if (skus.length > 0) {
        const itemsToCheck = removeDuplicate(skus.concat(itemsFromPreviousTrades));
        checkPrevious(itemsToCheck);
        itemsFromPreviousTrades = skus.slice(0);
    }
}

function addToQueu(sku: string, isNotPure: boolean, isExistInPricelist: boolean): void {
    /**
     * Request priceheck on each sku involved in the trade, except craft weapons (if weaponsAsCurrency enabled) and pure.
     */
    if (isNotPure) {
        if (craftWeapons.includes(sku)) {
            if (isExistInPricelist) {
                // Only includes sku of weapons that are in the pricelist (enabled)
                PriceCheckQueue.enqueue(sku);
            }
        } else {
            PriceCheckQueue.enqueue(sku);
        }
    }
}

function checkPrevious(skus: string[]): void {
    skus.forEach(sku => {
        PriceCheckQueue.enqueue(sku);
    });
}
