import { Items, TradeOffer } from 'steam-tradeoffer-manager';
import SKU from 'tf2-sku-2';
import Currencies from 'tf2-currencies';
import pluralize from 'pluralize';
import Bot from '../../../Bot';
import { EntryData } from '../../../Pricelist';
import { requestCheck, RequestCheckResponse } from '../../../../lib/ptf-api';
import log from '../../../../lib/logger';
import { sendAlert } from '../../../../lib/DiscordWebhook/export';
import { PaintedNames } from '../../../Options';

export default function updateListings(
    offer: TradeOffer,
    bot: Bot,
    highValue: { isDisableSKU: string[]; theirItems: string[]; items: Items }
): void {
    const opt = bot.options;
    const diff = offer.getDiff() || {};
    const weapons = bot.handler.isWeaponsAsCurrency.enable
        ? bot.handler.isWeaponsAsCurrency.withUncraft
            ? bot.craftWeapons.concat(bot.uncraftWeapons)
            : bot.craftWeapons
        : [];

    for (const sku in diff) {
        if (!Object.prototype.hasOwnProperty.call(diff, sku)) {
            continue;
        }

        // Update listings
        bot.listings.checkBySKU(sku);

        const name = bot.schema.getName(SKU.fromString(sku), false);

        const isNotPureOrWeapons = !(
            (opt.miscSettings.weaponsAsCurrency.enable && weapons.includes(sku)) ||
            ['5021;6', '5000;6', '5001;6', '5002;6'].includes(sku)
        );

        // Request priceheck on each sku involved in the trade, except craft weapons,
        // and pure.
        if (isNotPureOrWeapons) {
            void requestCheck(sku, 'bptf').asCallback((err, body: RequestCheckResponse) => {
                if (err) {
                    log.debug(`❌ Failed to request pricecheck for ${name} (${sku}): ${JSON.stringify(err)}`);
                } else {
                    log.debug(
                        `✅ Requested pricecheck for ${
                            body.name.includes('War Paint') ||
                            body.name.includes('Mann Co. Supply Crate Series #') ||
                            body.name.includes('Salvaged Mann Co. Supply Crate #')
                                ? name
                                : body.name
                        } (${sku}).`
                    );
                }
            });
        }

        const inPrice = bot.pricelist.getPrice(sku, false);

        if (
            opt.normalize.painted.our === false && // must meet this setting
            opt.normalize.painted.their === true && // must meet this setting
            !/;[p][0-9]+/.test(sku) && // sku must NOT include any painted partial sku
            highValue.items && // this must be defined
            highValue.items[sku]?.p && // painted must be defined
            inPrice !== null && // base items must already in pricelist
            bot.pricelist.getPrice(`${sku};${Object.keys(highValue.items[sku].p)[0]}`, false) === null && // painted items must not in pricelist
            bot.inventoryManager.getInventory.getAmount(`${sku};${Object.keys(highValue.items[sku].p)[0]}`, true) > 0 &&
            opt.pricelist.autoAddPaintedItems.enable // autoAddPaintedItems must enabled
        ) {
            const pSKU = Object.keys(highValue.items[sku].p)[0];
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
                sellingKeyPrice = Math.trunc(sellingMetalPriceInRef / keyPriceInRef);
                sellingMetalPriceInRef = Currencies.toRefined(
                    sellingMetalPriceInScrap - sellingKeyPrice * keyPriceInScrap
                );
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
                        `\nhttps://www.prices.tf/items/${sku}`;

                    log.debug(msg);

                    if (opt.sendAlert.enable && opt.sendAlert.autoAddPaintedItems) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            sendAlert('autoAddPaintedItems', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }
                })
                .catch(err => {
                    const msg =
                        `❌ Failed to add ${bot.schema.getName(SKU.fromString(paintedSKU), false)}` +
                        ` (${paintedSKU}) sell automatically: ${(err as Error).message}`;

                    log.debug(msg);

                    if (opt.sendAlert.enable && opt.sendAlert.autoAddPaintedItems) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            sendAlert('autoAddPaintedItemsFailed', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }
                });
        } else if (
            inPrice === null &&
            isNotPureOrWeapons &&
            SKU.fromString(sku).wear === null && // exclude War Paint (could be skins)
            !highValue.isDisableSKU.includes(sku) &&
            !bot.isAdmin(offer.partner) &&
            opt.pricelist.autoAddInvalidItems.enable
        ) {
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
                .then(() => log.debug(`✅ Automatically added ${name} (${sku}) to sell.`))
                .catch(err =>
                    log.warn(`❌ Failed to add ${name} (${sku}) sell automatically: ${(err as Error).message}`)
                );
        } else if (
            inPrice === null &&
            isNotPureOrWeapons &&
            SKU.fromString(sku).wear === null &&
            highValue.isDisableSKU.includes(sku) && // This is the only difference
            !bot.isAdmin(offer.partner)
        ) {
            // if the item sku is not in pricelist, not craftweapons or pure or skins AND it's a highValue items, and not
            // from ADMINS, then notify admin.
            let msg =
                'I have received a high-valued items which is not in my pricelist.' + '\n\nItem information:\n\n- ';

            for (let i = 0; i < highValue.theirItems.length; i++) {
                if (highValue.theirItems[i].includes(name)) msg += highValue.theirItems[i];
            }

            if (opt.sendAlert.enable && opt.sendAlert.highValue.receivedNotInPricelist) {
                if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                    sendAlert('highValuedInvalidItems', bot, msg.replace(/"/g, '`'));
                } else {
                    bot.messageAdmins(msg, []);
                }
            }
        } else if (
            inPrice !== null &&
            highValue.isDisableSKU.includes(sku) &&
            (opt.normalize.painted.our === false
                ? !highValue.theirItems.some(
                      str =>
                          str.includes(name) &&
                          str.includes('🎨 Painted') &&
                          !(
                              str.includes('🎰 Parts') ||
                              str.includes('🔥 Killstreaker') ||
                              str.includes('✨ Sheen') ||
                              str.includes('🎃 Spells')
                          )
                  )
                : true) &&
            isNotPureOrWeapons &&
            opt.highValue.enableHold
        ) {
            // If item received is high value, temporarily disable that item so it will not be sellable.
            let entry: EntryData;

            if (!inPrice.autoprice) {
                // if not autopriced, then explicitly set the buy/sell prices
                // with the current buy/sell prices
                entry = {
                    sku: sku, // required
                    enabled: false, // required
                    autoprice: inPrice.autoprice, // required
                    buy: {
                        keys: inPrice.buy.keys,
                        metal: inPrice.buy.metal
                    },
                    sell: {
                        keys: inPrice.sell.keys,
                        metal: inPrice.sell.metal
                    },
                    min: inPrice.min, // required
                    max: inPrice.max, // required
                    intent: inPrice.intent, // required
                    group: 'highValue'
                };
            } else {
                entry = {
                    sku: sku, // required
                    enabled: false, // required
                    autoprice: inPrice.autoprice, // required
                    min: inPrice.min, // required
                    max: inPrice.max, // required
                    intent: inPrice.intent, // required
                    group: 'highValue'
                };
            }

            bot.pricelist
                .updatePrice(entry, true)
                .then(() => {
                    log.debug(`✅ Automatically disabled ${sku}, which is a high value item.`);

                    let msg =
                        `I have temporarily disabled ${name} (${sku}) because it contains some high value spells/parts.` +
                        `\nYou can manually price it with "!update sku=${sku}&enabled=true&<buy and sell price>"` +
                        ` or just re-enable it with "!update sku=${sku}&enabled=true".` +
                        '\n\nItem information:\n\n- ';

                    for (let i = 0; i < highValue.theirItems.length; i++) {
                        if (highValue.theirItems[i].includes(name)) msg += highValue.theirItems[i];
                    }

                    if (opt.sendAlert.enable && opt.sendAlert.highValue.gotDisabled) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            sendAlert('highValuedDisabled', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }
                })
                .catch(err => {
                    log.warn(`❌ Failed to disable high value ${sku}: ${(err as Error).message}`);
                });
        } else if (
            opt.pricelist.autoRemoveIntentSell.enable &&
            inPrice !== null &&
            inPrice.intent === 1 &&
            bot.inventoryManager.getInventory.getAmount(sku, true) < 1 && // current stock
            isNotPureOrWeapons
        ) {
            // If "automatic remove items with intent=sell" enabled and it's in the pricelist and no more stock,
            // then remove the item entry from pricelist.
            bot.pricelist
                .removePrice(sku, true)
                .then(() => log.debug(`✅ Automatically removed ${name} (${sku}) from pricelist.`))
                .catch(err => {
                    const msg = `❌ Failed to remove ${name} (${sku}) from pricelist: ${(err as Error).message}`;
                    log.warn(msg);

                    if (opt.sendAlert.enable && opt.sendAlert.autoRemoveIntentSellFailed) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            sendAlert('autoRemoveIntentSellFailed', bot, msg);
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }
                });
        }
    }
}
