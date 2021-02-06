import * as i from 'steam-tradeoffer-manager';
import SKU from 'tf2-sku-2';
import Bot from '../../../Bot';
import * as t from '../../../../lib/tools/export';
import { sendTradeSummary } from '../../../../lib/DiscordWebhook/export';

export default function processAccepted(
    offer: i.TradeOffer,
    bot: Bot,
    isTradingKeys: boolean,
    processTime: number
): { theirHighValuedItems: string[]; isDisableSKU: string[]; items: i.Items | undefined } {
    const opt = bot.options;

    const isDisableSKU: string[] = [];
    const theirHighValuedItems: string[] = [];

    const accepted: Accepted = {
        invalidItems: [],
        disabledItems: [],
        overstocked: [],
        understocked: [],
        highValue: [],
        isMention: false
    };

    const offerReceived = offer.data('action') as i.Action;
    const offerSent = offer.data('highValue') as i.HighValueOutput;

    const isWebhookEnabled = opt.discordWebhook.tradeSummary.enable && opt.discordWebhook.tradeSummary.url.length > 0;

    if (offerReceived) {
        // doing this because if an offer is being made by bot (from command), then this is undefined
        if (offerReceived.reason === 'VALID_WITH_OVERPAY' || offerReceived.reason === 'MANUAL') {
            // only for accepted overpay with INVALID_ITEMS/OVERSTOCKED/UNDERSTOCKED or MANUAL offer
            if (offerReceived.meta?.uniqueReasons?.includes('🟨_INVALID_ITEMS')) {
                // doing this so it will only executed if includes 🟨_INVALID_ITEMS reason.

                (offerReceived.meta.reasons.filter(el => el.reason === '🟨_INVALID_ITEMS') as i.InvalidItems[]).forEach(
                    el => {
                        accepted.invalidItems.push(
                            `${
                                isWebhookEnabled
                                    ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                                    : bot.schema.getName(SKU.fromString(el.sku), false)
                            } - ${el.price}`
                        );
                    }
                );
            }
            if (offerReceived.meta?.uniqueReasons?.includes('🟧_DISABLED_ITEMS')) {
                // doing this so it will only executed if includes 🟧_DISABLED_ITEMS reason.

                (offerReceived.meta.reasons.filter(
                    el => el.reason === '🟧_DISABLED_ITEMS'
                ) as i.DisabledItems[]).forEach(el => {
                    accepted.disabledItems.push(
                        isWebhookEnabled
                            ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                            : bot.schema.getName(SKU.fromString(el.sku), false)
                    );
                });
            }
            if (offerReceived.meta?.uniqueReasons?.includes('🟦_OVERSTOCKED')) {
                // doing this so it will only executed if includes 🟦_OVERSTOCKED reason.

                (offerReceived.meta.reasons.filter(el =>
                    el.reason.includes('🟦_OVERSTOCKED')
                ) as i.Overstocked[]).forEach(el => {
                    accepted.overstocked.push(
                        `${
                            isWebhookEnabled
                                ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                                : bot.schema.getName(SKU.fromString(el.sku), false)
                        } (amount can buy was ${el.amountCanTrade})`
                    );
                });
            }

            if (offerReceived.meta?.uniqueReasons?.includes('🟩_UNDERSTOCKED')) {
                // doing this so it will only executed if includes 🟩_UNDERSTOCKED reason.

                (offerReceived.meta.reasons.filter(el =>
                    el.reason.includes('🟩_UNDERSTOCKED')
                ) as i.Understocked[]).forEach(el => {
                    accepted.understocked.push(
                        `${
                            isWebhookEnabled
                                ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                                : bot.schema.getName(SKU.fromString(el.sku), false)
                        } (amount can sell was ${el.amountCanTrade})`
                    );
                });
            }
        }

        if (offerReceived?.meta?.highValue && offerReceived.meta.highValue['has'] === undefined) {
            if (Object.keys(offerReceived.meta.highValue.items.their).length > 0) {
                // doing this to check if their side have any high value items, if so, push each name into accepted.highValue const.
                const itemsName = t.getHighValueItems(
                    offerReceived.meta.highValue.items.their,
                    bot,
                    bot.paints,
                    bot.strangeParts
                );

                for (const name in itemsName) {
                    if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                        continue;
                    }

                    accepted.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
                    theirHighValuedItems.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
                }

                if (offerReceived.meta.highValue.isMention.their) {
                    Object.keys(offerReceived.meta.highValue.items.their).forEach(sku => isDisableSKU.push(sku));

                    if (!bot.isAdmin(offer.partner)) {
                        accepted.isMention = true;
                    }
                }
            }

            if (Object.keys(offerReceived.meta.highValue.items.our).length > 0) {
                // doing this to check if our side have any high value items, if so, push each name into accepted.highValue const.
                const itemsName = t.getHighValueItems(
                    offerReceived.meta.highValue.items.our,
                    bot,
                    bot.paints,
                    bot.strangeParts
                );

                for (const name in itemsName) {
                    if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                        continue;
                    }

                    accepted.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
                }

                if (offerReceived.meta.highValue.isMention.our) {
                    if (!bot.isAdmin(offer.partner)) {
                        accepted.isMention = true;
                    }
                }
            }
        }
    } else if (offerSent && offerSent['has'] === undefined) {
        // This is for offer that bot created from commands

        if (offerSent.items && Object.keys(offerSent.items.their).length > 0) {
            const itemsName = t.getHighValueItems(offerSent.items.their, bot, bot.paints, bot.strangeParts);

            for (const name in itemsName) {
                if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                    continue;
                }

                accepted.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
                theirHighValuedItems.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
            }

            if (offerSent.isMention.their) {
                Object.keys(offerSent.items.their).forEach(sku => isDisableSKU.push(sku));

                if (!bot.isAdmin(offer.partner)) {
                    accepted.isMention = true;
                }
            }
        }

        if (offerSent.items && Object.keys(offerSent.items.our).length > 0) {
            const itemsName = t.getHighValueItems(offerSent.items.our, bot, bot.paints, bot.strangeParts);

            for (const name in itemsName) {
                if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                    continue;
                }

                accepted.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
            }

            if (offerSent.isMention.our) {
                if (!bot.isAdmin(offer.partner)) {
                    accepted.isMention = true;
                }
            }
        }
    }

    const isOfferSent = offer?.data('action') === undefined;

    if (isWebhookEnabled) {
        void sendTradeSummary(offer, accepted, bot, processTime, isTradingKeys, isOfferSent);
    } else {
        const slots = bot.tf2.backpackSlots;
        const itemsName = {
            invalid: accepted.invalidItems, // 🟨_INVALID_ITEMS
            disabled: accepted.disabledItems, // 🟧_DISABLED_ITEMS
            overstock: accepted.overstocked, // 🟦_OVERSTOCKED
            understock: accepted.understocked, // 🟩_UNDERSTOCKED
            duped: [],
            dupedFailed: [],
            highValue: accepted.highValue // 🔶_HIGH_VALUE_ITEMS
        };

        const keyPrices = bot.pricelist.getKeyPrices;
        const value = t.valueDiff(offer, keyPrices, isTradingKeys, opt.miscSettings.showOnlyMetal.enable);
        const itemList = t.listItems(offer, bot, itemsName, true);

        const autokeys = bot.handler.autokeys;
        const status = autokeys.getOverallStatus;
        bot.messageAdmins(
            'trade',
            `/me Trade #${offer.id} with ${offer.partner.getSteamID64()} is accepted. ✅` +
                t.summarizeToChat(offer, bot, 'summary-accepted', false, value, keyPrices, true, isOfferSent) +
                (itemList !== '-' ? `\n\nItem lists:\n${itemList}` : '') +
                `\n\n🔑 Key rate: ${keyPrices.buy.toString()}/${keyPrices.sell.toString()}` +
                ` (${keyPrices.src === 'manual' ? 'manual' : 'prices.tf'})` +
                `${
                    autokeys.isEnabled
                        ? ' | Autokeys: ' +
                          (autokeys.getActiveStatus
                              ? '✅' +
                                (status.isBankingKeys ? ' (banking)' : status.isBuyingKeys ? ' (buying)' : ' (selling)')
                              : '🛑')
                        : ''
                }` +
                `\n💰 Pure stock: ${t.pure.stock(bot).join(', ').toString()}` +
                `\n🎒 Total items: ${bot.inventoryManager.getInventory.getTotalItems}${
                    slots !== undefined ? `/${slots}` : ''
                }` +
                `\n⏱ Time taken: ${t.convertTime(processTime, opt.tradeSummary.showTimeTakenInMS)}` +
                `\n\nVersion ${process.env.BOT_VERSION}`,
            []
        );
    }

    return {
        theirHighValuedItems,
        isDisableSKU,
        items: offerReceived?.meta?.highValue?.items?.their || offerSent?.items?.their
    };
}

interface Accepted {
    invalidItems: string[];
    disabledItems: string[];
    overstocked: string[];
    understocked: string[];
    highValue: string[];
    isMention: boolean;
}
