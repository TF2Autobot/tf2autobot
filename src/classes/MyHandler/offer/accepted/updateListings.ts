import { TradeOffer } from 'steam-tradeoffer-manager';
import SKU from 'tf2-sku-2';

import Bot from '../../../Bot';
import { EntryData } from '../../../Pricelist';

import { sendAlert } from '../../../../lib/DiscordWebhook/export';
import { requestCheck } from '../../../../lib/ptf-api';
import { craftAll, uncraftAll } from '../../../../lib/data';

import log from '../../../../lib/logger';

export default function updateListings(
    offer: TradeOffer,
    bot: Bot,
    highValue: { isDisableSKU: string[]; theirItems: string[] }
): void {
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
            craftAll.includes(sku) ||
            uncraftAll.includes(sku) ||
            ['5021;6', '5000;6', '5001;6', '5002;6'].includes(sku)
        );

        // Request priceheck on each sku involved in the trade, except craft weapons,
        // and pure.
        if (isNotPureOrWeapons) {
            requestCheck(sku, 'bptf').asCallback((err, body) => {
                if (err) {
                    log.debug(
                        '❌ Failed to request pricecheck for ' +
                            `${name} (${sku})` +
                            ': ' +
                            (err.body && err.body.message ? err.body.message : err.message)
                    );
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
            } as any;

            bot.pricelist
                .addPrice(entry as EntryData, false)
                .then(data => {
                    log.debug(`✅ Automatically added ${name} (${sku}) to sell.`);
                    bot.listings.checkBySKU(data.sku, data);
                })
                .catch(err => {
                    log.warn(`❌ Failed to add ${name} (${sku}) sell automatically: ${err.message}`);
                });
        } else if (
            inPrice !== null &&
            highValue.isDisableSKU.includes(sku) &&
            isNotPureOrWeapons &&
            bot.options.highValue.enableHold
        ) {
            // If item received is high value, temporarily disable that item so it will not be sellable.
            const entry = {
                sku: sku,
                enabled: false,
                autoprice: inPrice.autoprice,
                min: inPrice.min,
                max: inPrice.max,
                intent: inPrice.intent,
                group: 'highValue'
            } as any;

            bot.pricelist
                .updatePrice(entry as EntryData, true)
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

                    if (bot.options.discordWebhook.sendAlert.enable && bot.options.discordWebhook.sendAlert.url) {
                        sendAlert('highValuedDisabled', bot, msg.replace(/"/g, '`'));
                    } else {
                        bot.messageAdmins(msg, []);
                    }
                })
                .catch(err => {
                    log.warn(`❌ Failed to disable high value ${sku}: ${err.message}`);
                });
        } else if (
            bot.options.autoRemoveIntentSell &&
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
                .catch(err => {
                    log.warn(`❌ Failed to remove ${name} (${sku}) from pricelist: ${err.message}`);
                });
        }
    }
}
