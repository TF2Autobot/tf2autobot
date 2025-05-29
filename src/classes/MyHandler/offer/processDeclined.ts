import * as i from '@tf2autobot/tradeoffer-manager';
import SKU from '@tf2autobot/tf2-sku';
import Bot from '../../Bot';
import * as t from '../../../lib/tools/export';
import sendTradeDeclined from '../../DiscordWebhook/sendTradeDeclined';
import { KeyPrices } from '../../../classes/Pricelist';

export default function processDeclined(offer: i.TradeOffer, bot: Bot): void {
    const opt = bot.options;

    const declined: Declined = {
        //nonTf2Items: [],
        highNotSellingItems: [],
        overstocked: [],
        understocked: [],
        invalidItems: [],
        disabledItems: [],
        dupedItems: [],
        reasonDescription: '',
        highValue: []
    };

    const offerReceived = offer.data('action') as i.Action;
    const meta = offer.data('meta') as i.Meta;
    const highValue = offer.data('highValue') as i.HighValueOutput; // can be both offer received and offer sent

    const isWebhookEnabled = opt.discordWebhook.declinedTrade.enable && opt.discordWebhook.declinedTrade.url.length > 0;

    if (offerReceived) {
        switch (offerReceived.reason) {
            case 'MANUAL':
                declined.reasonDescription = offerReceived.reason + ': Manually declined by the owner.';
                break;
            case 'HALTED':
                declined.reasonDescription = offerReceived.reason + ': The bot is halted.';
                break;
            case 'ESCROW':
                declined.reasonDescription = offerReceived.reason + ': Partner has trade hold.';
                break;
            case 'BANNED': {
                let checkResult = '';
                if (meta?.banned) {
                    checkResult = 'Check results:\n';
                    Object.keys(meta.banned).forEach((website, index) => {
                        if (meta.banned[website] !== 'clean') {
                            if (index > 0) {
                                checkResult += '\n';
                            }
                            checkResult += `(${index + 1}) ${website}: ${meta.banned[website]}`;
                        }
                    });
                }
                declined.reasonDescription =
                    offerReceived.reason +
                    `: Partner is banned in one or more communities.${checkResult !== '' ? '\n' + checkResult : ''}`;
                break;
            }
            case '🟨_CONTAINS_NON_TF2':
                declined.reasonDescription = offerReceived.reason + ': Trade includes non-TF2 items.';
                //Maybe implement tags for them as well ?
                break;
            case 'GIFT_NO_NOTE':
                declined.reasonDescription = offerReceived.reason + ': We dont accept gift without gift messages.';
                break;
            case 'CRIME_ATTEMPT':
                declined.reasonDescription = offerReceived.reason + ': Tried to take our items for free.';
                break;
            case 'TAKING_ITEMS_WITH_INTENT_BUY':
                declined.reasonDescription = offerReceived.reason + ': Tried to take/buy our item(s) with intent buy.';
                break;
            case 'GIVING_ITEMS_WITH_INTENT_SELL':
                declined.reasonDescription = offerReceived.reason + ': Tried to give their item(s) with intent sell.';
                break;
            case 'OVERPAY':
                declined.reasonDescription = offerReceived.reason + ': We are not accepting overpay.';
                break;
            case 'DUELING_NOT_5_USES':
                declined.reasonDescription = offerReceived.reason + ': We only accept 5 use Dueling Mini-Games.';
                break;
            case 'NOISE_MAKER_NOT_25_USES':
                declined.reasonDescription = offerReceived.reason + ': We only accept 25 use Noise Makers.';
                break;
            case 'HIGH_VALUE_ITEMS_NOT_SELLING':
                declined.reasonDescription =
                    offerReceived.reason + ': Tried to take our high value items that we are not selling.';
                //check our items to add tag
                if (meta?.highValueName) declined.highNotSellingItems.push(...meta.highValueName);
                break;
            case 'ONLY_METAL':
                declined.reasonDescription = offerReceived.reason + ': Offer contains only metal.';
                break;
            case 'NOT_TRADING_KEYS':
                declined.reasonDescription = offerReceived.reason + ': We are not trading keys.';
                break;
            case 'NOT_SELLING_KEYS':
                declined.reasonDescription = offerReceived.reason + ': We are not selling keys.';
                break;
            case 'NOT_BUYING_KEYS':
                declined.reasonDescription = offerReceived.reason + ': We are not buying keys.';
                break;
            case '🟦_OVERSTOCKED':
                declined.reasonDescription =
                    offerReceived.reason + ": Offer contains items that'll make us overstocked.";
                break;
            case '🟩_UNDERSTOCKED':
                declined.reasonDescription =
                    offerReceived.reason + ": Offer contains items that'll make us understocked.";
                break;
            case '🟧_DISABLED_ITEMS':
                declined.reasonDescription = offerReceived.reason + ': Offer contains disabled items.';
                break;
            case '🟨_INVALID_ITEMS':
                declined.reasonDescription = offerReceived.reason + ': Offer contains invalid items.';
                break;
            case '🟫_DUPED_ITEMS':
                declined.reasonDescription = offerReceived.reason + ': Offer contains duped items.';
                break;
            case '🟪_DUPE_CHECK_FAILED':
                declined.reasonDescription =
                    offerReceived.reason +
                    `: Offer contains item(s) that is worth more than ${opt.offerReceived.duped.minKeys} keys, and I was unable ` +
                    `to determine if this item is duped or not. Please make sure your inventory is public, and your backpack.tf inventory ` +
                    `is refreshed with no fallback mode and try again later.`;
                break;
            case '🟥_INVALID_VALUE':
                declined.reasonDescription = offerReceived.reason + ': We are paying more than them.';
                break;
            case 'COUNTER_INVALID_VALUE_FAILED':
                declined.reasonDescription =
                    offerReceived.reason +
                    ': We are paying more than them and we failed to counter the offer, or Steam might be down, or private inventory (failed to load their inventory).';
                break;
            case 'ONLY_INVALID_VALUE':
            case 'ONLY_INVALID_ITEMS':
            case 'ONLY_DISABLED_ITEMS':
            case 'ONLY_OVERSTOCKED':
            case 'ONLY_UNDERSTOCKED':
            case 'ONLY_DUPED_ITEM':
            case 'ONLY_DUPE_CHECK_FAILED':
                //It was probably faster to make them by hand but :/
                declined.reasonDescription =
                    offerReceived.reason +
                    ': We are auto declining ' +
                    offerReceived.reason
                        .split('_')
                        .slice(1)
                        .join(' ')
                        .toLowerCase()
                        .replace(/(\b(?! ).)/g, char => char.toUpperCase());
                break;
        }
        const checkedReasons = {};
        meta?.uniqueReasons?.forEach(reason => {
            if (checkedReasons[reason]) return;
            checkedReasons[reason] = '.';
            switch (reason) {
                case '🟨_INVALID_ITEMS':
                    meta.reasons
                        .filter(el => el.reason === '🟨_INVALID_ITEMS')
                        .forEach(el => {
                            const name = t.testPriceKey(el.sku)
                                ? bot.schema.getName(SKU.fromString(el.sku), false)
                                : el.sku;

                            declined.invalidItems.push(`${isWebhookEnabled ? `_${name}_` : name} - ${el.price}`);
                        });
                    break;
                case '🟧_DISABLED_ITEMS':
                    meta.reasons
                        .filter(el => el.reason == '🟧_DISABLED_ITEMS')
                        .forEach(el => {
                            declined.disabledItems.push(
                                isWebhookEnabled
                                    ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                                    : bot.schema.getName(SKU.fromString(el.sku), false)
                            );
                        });
                    break;
                case '🟦_OVERSTOCKED':
                    (meta.reasons.filter(el => el.reason.includes('🟦_OVERSTOCKED')) as i.Overstocked[]).forEach(el => {
                        declined.overstocked.push(
                            `${
                                isWebhookEnabled
                                    ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                                    : bot.schema.getName(SKU.fromString(el.sku), false)
                            } (amount can buy was ${el.amountCanTrade}, offered ${el.amountOffered})`
                        );
                    });
                    break;
                case '🟩_UNDERSTOCKED':
                    (meta.reasons.filter(el => el.reason.includes('🟩_UNDERSTOCKED')) as i.Understocked[]).forEach(
                        el => {
                            declined.understocked.push(
                                `${
                                    isWebhookEnabled
                                        ? `_${bot.schema.getName(SKU.fromString(el.sku), false)}_`
                                        : bot.schema.getName(SKU.fromString(el.sku), false)
                                } (amount can sell was ${el.amountCanTrade}, taken ${el.amountTaking})`
                            );
                        }
                    );
                    break;
                case '🟫_DUPED_ITEMS':
                    (meta.reasons.filter(el => el.reason.includes('🟫_DUPED_ITEMS')) as i.DupedItems[]).forEach(el => {
                        declined.dupedItems.push(
                            isWebhookEnabled
                                ? `_${bot.schema.getName(SKU.fromString(el.sku))}_`
                                : bot.schema.getName(SKU.fromString(el.sku))
                        );
                    });
                    break;
            }
        });

        if (highValue && highValue['has'] === undefined) {
            if (Object.keys(highValue.items.their).length > 0) {
                // doing this to check if their side have any high value items, if so, push each name into accepted.highValue const.
                const itemsName = t.getHighValueItems(highValue.items.their, bot);

                for (const name in itemsName) {
                    if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                        continue;
                    }

                    declined.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
                }
            }

            if (Object.keys(highValue.items.our).length > 0) {
                // doing this to check if our side have any high value items, if so, push each name into accepted.highValue const.
                const itemsName = t.getHighValueItems(highValue.items.our, bot);

                for (const name in itemsName) {
                    if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                        continue;
                    }

                    declined.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
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

                declined.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
            }
        }

        if (highValue.items && Object.keys(highValue.items.our).length > 0) {
            const itemsName = t.getHighValueItems(highValue.items.our, bot);

            for (const name in itemsName) {
                if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                    continue;
                }

                declined.highValue.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
            }
        }
    }

    const isOfferSent = offer.data('action') === undefined;
    const timeTakenToProcessOrConstruct = (offer.data('constructOfferTime') ||
        offer.data('processOfferTime')) as number;

    if (isWebhookEnabled) {
        void sendTradeDeclined(offer, declined, bot, timeTakenToProcessOrConstruct, isOfferSent);
    } else {
        const itemsName = {
            invalid: declined.invalidItems, // 🟨_INVALID_ITEMS
            disabled: declined.disabledItems, // 🟧_DISABLED_ITEMS
            overstock: declined.overstocked, // 🟦_OVERSTOCKED
            understock: declined.understocked, // 🟩_UNDERSTOCKED
            duped: declined.dupedItems, // '🟫_DUPED_ITEMS'
            dupedFailed: [],
            highValue: declined.highValue.concat(declined.highNotSellingItems)
        };
        const keyPrices = bot.pricelist.getKeyPrices;
        const value = t.valueDiff(offer);
        const itemList = t.listItems(offer, bot, itemsName, true);

        sendToAdmin(bot, offer, value, itemList, keyPrices, isOfferSent, timeTakenToProcessOrConstruct);
    }
    //else it's sent by us and they declined it so we don't care ?
}

export function sendToAdmin(
    bot: Bot,
    offer: i.TradeOffer,
    value: t.ValueDiff,
    itemList: string,
    keyPrices: KeyPrices,
    isOfferSent: boolean,
    timeTakenToProcessOrConstruct: number
): void {
    const slots = bot.tf2.backpackSlots;
    const autokeys = bot.handler.autokeys;
    const status = autokeys.getOverallStatus;
    const offerMessage = offer.message;

    const tSum = bot.options.tradeSummary;
    const cT = tSum.customText;
    const cTKeyRate = cT.keyRate.steamChat ? cT.keyRate.steamChat : '🔑 Key rate:';
    const cTPureStock = cT.pureStock.steamChat ? cT.pureStock.steamChat : '💰 Pure stock:';
    const cTTotalItems = cT.totalItems.steamChat ? cT.totalItems.steamChat : '🎒 Total items:';
    const cTTimeTaken = cT.timeTaken.steamChat ? cT.timeTaken.steamChat : '⏱ Time taken:';

    const customInitializer = bot.options.steamChat.customInitializer.declinedTradeSummary;
    const isCustomPricer = bot.pricelist.isUseCustomPricer;

    bot.messageAdmins(
        'trade',
        `${customInitializer ? customInitializer : '/me'} Trade #${
            offer.id
        } with ${offer.partner.getSteamID64()} was declined. ❌` +
            t.summarizeToChat(offer, bot, 'declined', false, value, true, isOfferSent) +
            (offerMessage.length !== 0 ? `\n\n💬 Offer message: "${offerMessage}"` : '') +
            (itemList !== '-' ? `\n\nItem lists:\n${itemList}` : '') +
            `\n\n${cTKeyRate} ${keyPrices.buy.toString()}/${keyPrices.sell.toString()}` +
            ` (${keyPrices.src === 'manual' ? 'manual' : isCustomPricer ? 'custom-pricer' : 'prices.tf'})` +
            `${
                autokeys.isEnabled
                    ? ' | Autokeys: ' +
                      (autokeys.getActiveStatus
                          ? '✅' +
                            (status.isBankingKeys ? ' (banking)' : status.isBuyingKeys ? ' (buying)' : ' (selling)')
                          : '🛑')
                    : ''
            }` +
            `\n${cTPureStock} ${t.pure.stock(bot).join(', ').toString()}` +
            `\n${cTTotalItems} ${bot.inventoryManager.getInventory.getTotalItems}${
                slots !== undefined ? `/${slots}` : ''
            }` +
            `\n${cTTimeTaken} ${t.convertTime(
                null,
                timeTakenToProcessOrConstruct,
                undefined,
                isOfferSent,
                tSum.showDetailedTimeTaken,
                tSum.showTimeTakenInMS
            )}` +
            `\n\nVersion ${process.env.BOT_VERSION}`,
        []
    );
}

interface Declined {
    //nonTf2Items: string[];
    highNotSellingItems: string[];
    overstocked: string[];
    understocked: string[];
    invalidItems: string[];
    disabledItems: string[];
    dupedItems: string[];
    reasonDescription: string;
    highValue: string[];
}
