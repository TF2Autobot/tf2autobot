import { TradeOffer } from 'steam-tradeoffer-manager';
import SKU from 'tf2-sku-2';

import Bot from '../../../Bot';
import { EntryData } from '../../../Pricelist';

import { sendAlert } from '../../../../lib/DiscordWebhook/export';
import { requestCheck, RequestCheckResponse } from '../../../../lib/ptf-api';
import { craftAll, uncraftAll } from '../../../../lib/data';
import log from '../../../../lib/logger';

export default function updateListings(
    offer: TradeOffer,
    bot: Bot,
    highValue: { isDisableSKU: string[]; theirItems: string[] }
): void {
    const opt = bot.options;
    const diff = offer.getDiff() || {};

    for (const sku in diff) {
        if (!Object.prototype.hasOwnProperty.call(diff, sku)) {
            continue;
        }

        // Update listings
        bot.listings.checkBySKU(sku);

        const item = SKU.fromString(sku);
        const name = bot.schema.getName(item, false);

        const isNotPureOrWeapons = !(
            (bot.options.weaponsAsCurrency.enable &&
                (craftAll.includes(sku) || (uncraftAll.includes(sku) && bot.options.weaponsAsCurrency.withUncraft))) ||
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

        // Automatically add any INVALID_ITEMS to sell, excluding any item name
        // that have War Paint (could be skins)

        const currentStock = bot.inventoryManager.getInventory().getAmount(sku);
        const inPrice = bot.pricelist.getPrice(sku, false);

        if (
            inPrice === null &&
            isNotPureOrWeapons &&
            item.wear === null &&
            !highValue.isDisableSKU.includes(sku) &&
            !bot.isAdmin(offer.partner)
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
                .addPrice(entry, false)
                .then(data => {
                    log.debug(`✅ Automatically added ${name} (${sku}) to sell.`);
                    bot.listings.checkBySKU(data.sku, data);
                })
                .catch((err: Error) => {
                    log.warn(`❌ Failed to add ${name} (${sku}) sell automatically: ${err.message}`);
                });
        } else if (
            inPrice === null &&
            isNotPureOrWeapons &&
            item.wear === null &&
            highValue.isDisableSKU.includes(sku) && // This is the only difference
            !bot.isAdmin(offer.partner)
        ) {
            // if the item sku is not in pricelist, not craftweapons or pure or skins AND it's a highValue items, and not
            // from ADMINS, then notify admin.
            let msg =
                'I have received a high-valued items which is not in my pricelist.' + '\n\nItem information:\n\n- ';

            for (let i = 0; i < highValue.theirItems.length; i++) {
                if (highValue.theirItems[i].includes(name)) {
                    msg += highValue.theirItems[i];
                }
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
                        if (highValue.theirItems[i].includes(name)) {
                            msg += highValue.theirItems[i];
                        }
                    }

                    if (opt.sendAlert.enable && opt.sendAlert.highValue.gotDisabled) {
                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            sendAlert('highValuedDisabled', bot, msg.replace(/"/g, '`'));
                        } else {
                            bot.messageAdmins(msg, []);
                        }
                    }
                })
                .catch((err: Error) => {
                    log.warn(`❌ Failed to disable high value ${sku}: ${err.message}`);
                });
        } else if (
            opt.autoRemoveIntentSell.enable &&
            inPrice !== null &&
            inPrice.intent === 1 &&
            currentStock < 1 &&
            isNotPureOrWeapons
        ) {
            // If "automatic remove items with intent=sell" enabled and it's in the pricelist and no more stock,
            // then remove the item entry from pricelist.
            bot.pricelist
                .removePrice(sku, true)
                .then(() => {
                    log.debug(`✅ Automatically removed ${name} (${sku}) from pricelist.`);
                })
                .catch((err: Error) => {
                    log.warn(`❌ Failed to remove ${name} (${sku}) from pricelist: ${err.message}`);
                });
        }
    }
}
