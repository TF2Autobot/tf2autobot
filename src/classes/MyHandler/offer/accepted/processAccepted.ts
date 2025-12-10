import * as i from '@tf2autobot/tradeoffer-manager';
import SKU from '@tf2autobot/tf2-sku';
import * as timersPromises from 'timers/promises';
import Bot from '../../../Bot';
import { KeyPrices } from '../../../Pricelist';
import log from '../../../../lib/logger';
import * as t from '../../../../lib/tools/export';
import { sendTradeSummary } from '../../../DiscordWebhook/export';
import { FIFOEntry } from '../../../InventoryCostBasis';

export default async function processAccepted(
    offer: i.TradeOffer,
    bot: Bot,
    timeTakenToComplete: number
): Promise<{ theirHighValuedItems: string[]; isDisableSKU: string[]; items: i.Items | undefined }> {
    const opt = bot.options;

    const isDisableSKU: string[] = [];
    const theirHighValuedItems: string[] = [];

    // Calculate and store profit data asynchronously
    await calculateProfitData(offer, bot).catch(err => {
        log.error('Failed to calculate profit data:', err);
    });

    const accepted: Accepted = {
        invalidItems: [],
        disabledItems: [],
        overstocked: [],
        understocked: [],
        highValue: [],
        isMention: false
    };

    const offerReceived = offer.data('action') as i.Action;
    const meta = offer.data('meta') as i.Meta;
    const highValue = offer.data('highValue') as i.HighValueOutput; // can be both offer received and offer sent

    const isWebhookEnabled = opt.discordWebhook.tradeSummary.enable && opt.discordWebhook.tradeSummary.url.length > 0;

    if (offerReceived) {
        // doing this because if an offer is being made by bot (from command), then this is undefined
        if (['VALID_WITH_OVERPAY', 'MANUAL', 'MANUAL-FORCE', 'AUTO-RETRY'].includes(offerReceived.reason)) {
            // only for accepted overpay with INVALID_ITEMS/OVERSTOCKED/UNDERSTOCKED or MANUAL offer
            if (meta?.uniqueReasons?.includes('🟨_INVALID_ITEMS')) {
                // doing this so it will only executed if includes 🟨_INVALID_ITEMS reason.

                meta.reasons
                    .filter(el => el.reason === '🟨_INVALID_ITEMS')
                    .forEach(el => {
                        const name = t.testPriceKey(el.sku)
                            ? bot.schema.getName(SKU.fromString(el.sku), false)
                            : el.sku;

                        accepted.invalidItems.push(`${isWebhookEnabled ? `_${name}_` : name} - ${el.price}`);
                    });
            }
            if (meta?.uniqueReasons?.includes('🟧_DISABLED_ITEMS')) {
                // doing this so it will only executed if includes 🟧_DISABLED_ITEMS reason.

                meta.reasons
                    .filter(el => el.reason === '🟧_DISABLED_ITEMS')
                    .forEach(el => {
                        accepted.disabledItems.push(
                            isWebhookEnabled
                                ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                                : bot.schema.getName(SKU.fromString(el.sku), false)
                        );
                    });
            }
            if (meta?.uniqueReasons?.includes('🟦_OVERSTOCKED')) {
                // doing this so it will only executed if includes 🟦_OVERSTOCKED reason.

                (meta.reasons.filter(el => el.reason.includes('🟦_OVERSTOCKED')) as i.Overstocked[]).forEach(el => {
                    accepted.overstocked.push(
                        `${
                            isWebhookEnabled
                                ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                                : bot.schema.getName(SKU.fromString(el.sku), false)
                        } (amount can buy was ${el.amountCanTrade}, offered ${el.amountOffered})`
                    );
                });
            }

            if (meta?.uniqueReasons?.includes('🟩_UNDERSTOCKED')) {
                // doing this so it will only executed if includes 🟩_UNDERSTOCKED reason.

                (meta.reasons.filter(el => el.reason.includes('🟩_UNDERSTOCKED')) as i.Understocked[]).forEach(el => {
                    accepted.understocked.push(
                        `${
                            isWebhookEnabled
                                ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                                : bot.schema.getName(SKU.fromString(el.sku), false)
                        } (amount can sell was ${el.amountCanTrade}, taken ${el.amountTaking})`
                    );
                });
            }
        }

        if (highValue && highValue['has'] === undefined) {
            if (Object.keys(highValue.items.their).length > 0) {
                // doing this to check if their side have any high value items, if so, push each name into accepted.highValue const.
                const itemsName = t.getHighValueItems(highValue.items.their, bot);

                for (const name in itemsName) {
                    if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                        continue;
                    }

                    accepted.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
                    theirHighValuedItems.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
                }

                if (highValue.isMention.their) {
                    Object.keys(highValue.items.their).forEach(sku => isDisableSKU.push(sku));

                    if (!bot.isAdmin(offer.partner)) {
                        accepted.isMention = true;
                    }
                }
            }

            if (Object.keys(highValue.items.our).length > 0) {
                // doing this to check if our side have any high value items, if so, push each name into accepted.highValue const.
                const itemsName = t.getHighValueItems(highValue.items.our, bot);

                for (const name in itemsName) {
                    if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                        continue;
                    }

                    accepted.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
                }

                if (highValue.isMention.our) {
                    if (!bot.isAdmin(offer.partner)) {
                        accepted.isMention = true;
                    }
                }
            }
        }
    } else if (highValue && highValue['has'] === undefined) {
        // This is for offer that bot created from commands

        if (highValue.items && Object.keys(highValue.items.their).length > 0) {
            const itemsName = t.getHighValueItems(highValue.items.their, bot);

            for (const name in itemsName) {
                if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                    continue;
                }

                accepted.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
                theirHighValuedItems.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
            }

            if (highValue.isMention.their) {
                Object.keys(highValue.items.their).forEach(sku => isDisableSKU.push(sku));

                if (!bot.isAdmin(offer.partner)) {
                    accepted.isMention = true;
                }
            }
        }

        if (highValue.items && Object.keys(highValue.items.our).length > 0) {
            const itemsName = t.getHighValueItems(highValue.items.our, bot);

            for (const name in itemsName) {
                if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                    continue;
                }

                accepted.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
            }

            if (highValue.isMention.our) {
                if (!bot.isAdmin(offer.partner)) {
                    accepted.isMention = true;
                }
            }
        }
    }

    const isOfferSent = offer.data('action') === undefined;
    const timeTakenToProcessOrConstruct = (offer.data('constructOfferTime') ||
        offer.data('processOfferTime')) as number;
    const timeTakenToCounterOffer = offer.data('processCounterTime') as number | undefined;

    if (isWebhookEnabled) {
        void sendTradeSummary(
            offer,
            accepted,
            bot,
            timeTakenToComplete,
            timeTakenToProcessOrConstruct,
            timeTakenToCounterOffer,
            isOfferSent
        );
    } else {
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

        const value = t.valueDiff(offer);
        const itemList = t.listItems(offer, bot, itemsName, true);

        void sendToAdmin(
            bot,
            offer,
            value,
            itemList,
            keyPrices,
            isOfferSent,
            timeTakenToComplete,
            timeTakenToProcessOrConstruct,
            timeTakenToCounterOffer
        );
    }

    return {
        theirHighValuedItems,
        isDisableSKU,
        items: highValue?.items?.their
    };
}

export async function sendToAdmin(
    bot: Bot,
    offer: i.TradeOffer,
    value: t.ValueDiff,
    itemList: string,
    keyPrices: KeyPrices,
    isOfferSent: boolean,
    timeTakenToComplete: number,
    timeTakenToProcessOrConstruct: number,
    timeTakenToCounterOffer: number | undefined
): Promise<void> {
    const opt = bot.options;
    const slots = bot.tf2.backpackSlots;
    const autokeys = bot.handler.autokeys;
    const status = autokeys.getOverallStatus;
    const isCustomPricer = bot.pricelist.isUseCustomPricer;

    const tSum = opt.tradeSummary;
    const cT = tSum.customText;
    const cTKeyRate = cT.keyRate.steamChat ? cT.keyRate.steamChat : '🔑 Key rate:';
    const cTPureStock = cT.pureStock.steamChat ? cT.pureStock.steamChat : '💰 Pure stock:';
    const cTTotalItems = cT.totalItems.steamChat ? cT.totalItems.steamChat : '🎒 Total items:';
    const cTTimeTaken = cT.timeTaken.steamChat ? cT.timeTaken.steamChat : '⏱ Time taken:';
    const cTOfferMessage = cT.offerMessage.steamChat ? cT.offerMessage.steamChat : '💬 Offer message:';

    const customInitializer = opt.steamChat.customInitializer.acceptedTradeSummary;
    const isShowOfferMessage = opt.tradeSummary.showOfferMessage;

    const message1 = `${customInitializer ? customInitializer : '/me'} Trade #${
        offer.id
    } with ${offer.partner.getSteamID64()} is accepted. ✅`;

    const message2 =
        t.summarizeToChat(offer, bot, 'summary-accepted', false, value, true, isOfferSent) +
        (isShowOfferMessage
            ? (cTOfferMessage && offer.message ? `\n\n${cTOfferMessage}` : '\n\n💬 Offer message:') +
              ` "${offer.message}"`
            : '');

    const message3 = itemList !== '-' ? `\n\nItem lists:\n${itemList}` : '';

    const message4 =
        `\n\n${cTKeyRate} ${keyPrices.buy.toString()}/${keyPrices.sell.toString()}` +
        ` (${keyPrices.src === 'manual' ? 'manual' : isCustomPricer ? 'custom-pricer' : 'PriceDB.IO'})` +
        `${
            autokeys.isEnabled
                ? ' | Autokeys: ' +
                  (autokeys.getActiveStatus
                      ? '✅' + (status.isBankingKeys ? ' (banking)' : status.isBuyingKeys ? ' (buying)' : ' (selling)')
                      : '🛑')
                : ''
        }` +
        `\n${cTPureStock} ${t.pure.stock(bot).join(', ').toString()}` +
        `\n${cTTotalItems} ${bot.inventoryManager.getInventory.getTotalItems}${
            slots !== undefined ? `/${slots}` : ''
        }` +
        `\n${cTTimeTaken} ${t.convertTime(
            timeTakenToComplete,
            timeTakenToProcessOrConstruct,
            timeTakenToCounterOffer,
            isOfferSent,
            tSum.showDetailedTimeTaken,
            tSum.showTimeTakenInMS
        )}` +
        `\n\nVersion ${process.env.BOT_VERSION}`;

    const message = message1 + message2 + message3 + message4;

    if (message.length > 5000) {
        // Maximum allowed characters now is 5000
        log.warn('Message more than 5000 character');

        log.debug('Sending message 1');
        bot.messageAdmins('trade', message1, []);
        await timersPromises.setTimeout(1500); // bruh
        log.debug('Sending message 2');
        bot.messageAdmins('trade', message2, []);
        await timersPromises.setTimeout(1500);
        log.debug('Sending message 3');
        bot.messageAdmins('trade', message3, []);
        await timersPromises.setTimeout(1000);
        log.debug('Sending message 4');
        return bot.messageAdmins('trade', message4, []);
    }

    bot.messageAdmins('trade', message, []);
}

/**
 * Calculate and store FIFO-based profit data for accepted offer
 */
async function calculateProfitData(offer: i.TradeOffer, bot: Bot): Promise<void> {
    try {
        const itemPrices = offer.data('prices') as i.Prices;
        if (!itemPrices) {
            log.warn(`No prices data found for offer ${offer.id}, skipping profit calculation`);
            return;
        }

        const dict = offer.data('dict') as i.ItemsDict;
        if (!dict) {
            log.warn(`No dict data found for offer ${offer.id}, skipping profit calculation`);
            return;
        }

        let rawProfitKeys = 0;
        let rawProfitMetal = 0;
        let overpayKeys = 0;
        let overpayMetal = 0;

        // Process items we're receiving (their side) - BUY
        if (dict.their) {
            // Calculate total pricelist value for ALL items being bought (ONCE per trade-side)
            const theirTotalKeys = Object.keys(dict.their).reduce((sum, s) => {
                const price = itemPrices[s];
                return sum + (price ? price.buy.keys * dict.their[s] : 0);
            }, 0);

            const theirTotalMetal = Object.keys(dict.their).reduce((sum, s) => {
                const price = itemPrices[s];
                return sum + (price ? price.buy.metal * dict.their[s] : 0);
            }, 0);

            // Get actual amount paid
            const value = offer.data('value') as i.ItemsValue;
            const actualPaidKeys = value ? value.our.keys : theirTotalKeys;
            const actualPaidMetal = value ? value.our.metal : theirTotalMetal;

            // Calculate overpay/underpay on buy side (negative when we underpaid)
            const buyOverpayKeys = actualPaidKeys - theirTotalKeys;
            const buyOverpayMetal = actualPaidMetal - theirTotalMetal;

            // Count total items being bought
            const totalItemsBought = Object.values(dict.their).reduce((sum, qty) => sum + qty, 0);

            // Distribute overpay across ALL items as diff (both keys and metal)
            const diffPerItemKeys = totalItemsBought === 0 ? 0 : buyOverpayKeys / totalItemsBought;
            const diffPerItemMetal = totalItemsBought === 0 ? 0 : buyOverpayMetal / totalItemsBought;

            // Add each item to FIFO with pricelist cost + distributed diff
            for (const sku in dict.their) {
                if (!Object.prototype.hasOwnProperty.call(dict.their, sku)) {
                    continue;
                }

                const quantity = dict.their[sku];
                const priceData = itemPrices[sku];

                if (!priceData) {
                    log.warn(`No price data for SKU ${sku} in offer ${offer.id}`);
                    continue;
                }

                const pricelistBuyKeys = priceData.buy.keys;
                const pricelistBuyMetal = priceData.buy.metal;

                // Add each item to FIFO with distributed diff in BOTH keys and metal
                for (let i = 0; i < quantity; i++) {
                    await bot.inventoryCostBasis.addItem(
                        sku,
                        pricelistBuyKeys,
                        pricelistBuyMetal,
                        diffPerItemKeys,
                        diffPerItemMetal,
                        offer.id
                    );
                }
            }
        }

        // Process items we're giving away (our side) - SELL
        const removedEntriesBySku: Record<string, FIFOEntry[]> = {}; // Track for diff recovery
        let hasEstimates = false; // Track if any estimates were used
        
        if (dict.our) {
            for (const sku in dict.our) {
                if (!Object.prototype.hasOwnProperty.call(dict.our, sku)) {
                    continue;
                }

                const quantity = dict.our[sku];
                const priceData = itemPrices[sku];

                if (!priceData) {
                    log.warn(`No price data for SKU ${sku} in offer ${offer.id}`);
                    continue;
                }

                // This is a SELL for us - remove from FIFO and calculate profit
                const pricelistSellKeys = priceData.sell.keys;
                const pricelistSellMetal = priceData.sell.metal;

                // Remove items from FIFO (oldest first) with fallback to pricelist
                const result = await bot.inventoryCostBasis.removeItem(sku, quantity, priceData.buy);
                removedEntriesBySku[sku] = result.entries; // Store for diff recovery
                if (result.hasEstimates) {
                    hasEstimates = true;
                }

                // Calculate raw profit from FIFO cost basis
                // Raw profit = pricelist sell - pricelist buy + diff (realizes buy-side overpay/underpay)
                for (const entry of result.entries) {
                    const itemRawProfitKeys = pricelistSellKeys - entry.costKeys + entry.diffKeys;
                    const itemRawProfitMetal = pricelistSellMetal - entry.costMetal + entry.diffMetal;

                    rawProfitKeys += itemRawProfitKeys;
                    rawProfitMetal += itemRawProfitMetal;
                }
            }

            // Calculate overpay for sell side ONCE per trade (not per SKU)
            // Overpay = (actual received) - (pricelist sell value) + realized buy-side diffs
            const value = offer.data('value') as i.ItemsValue;
            if (value) {
                // Get total pricelist sell value for our side
                const ourTotalKeys = Object.keys(dict.our).reduce((sum, s) => {
                    const price = itemPrices[s];
                    return sum + (price ? price.sell.keys * dict.our[s] : 0);
                }, 0);

                const ourTotalMetal = Object.keys(dict.our).reduce((sum, s) => {
                    const price = itemPrices[s];
                    return sum + (price ? price.sell.metal * dict.our[s] : 0);
                }, 0);

                const actualReceivedKeys = value.their.keys;
                const actualReceivedMetal = value.their.metal;

                const sellOverpayKeys = actualReceivedKeys - ourTotalKeys;
                const sellOverpayMetal = actualReceivedMetal - ourTotalMetal;

                overpayKeys += sellOverpayKeys;
                overpayMetal += sellOverpayMetal;
            }
        }

        // Store profit data in offer
        offer.data('tradeProfit', {
            rawProfit: {
                keys: rawProfitKeys,
                metal: rawProfitMetal
            },
            overpay: {
                keys: overpayKeys,
                metal: overpayMetal
            },
            hasEstimates,
            timestamp: Date.now()
        } as i.TradeProfitData);

        log.debug(
            `Profit calculated for offer ${offer.id}${hasEstimates ? ' (contains estimates)' : ''}: ` +
            `Raw (${rawProfitKeys}k ${rawProfitMetal.toFixed(2)}r) + ` +
            `Overpay (${overpayKeys}k ${overpayMetal.toFixed(2)}r) = ` +
            `Total (${rawProfitKeys + overpayKeys}k ${(rawProfitMetal + overpayMetal).toFixed(2)}r)`
        );
    } catch (err) {
        log.error(`Error calculating profit for offer ${offer.id}:`, err);
    }
}

interface Accepted {
    invalidItems: string[];
    disabledItems: string[];
    overstocked: string[];
    understocked: string[];
    highValue: string[];
    isMention: boolean;
}
