import { KeyPrices } from '../../classes/Pricelist';
import { TradeOffer, ItemsDict, OurTheirItemsDict, ItemsValue } from 'steam-tradeoffer-manager';
import Bot from '../../classes/Bot';

interface ValueDiff {
    diff: number;
    diffRef: number;
    diffKey: string;
}

export function summarizeToChat(
    offer: TradeOffer,
    bot: Bot,
    type: SummarizeType,
    withLink: boolean,
    value: ValueDiff,
    keyPrice: KeyPrices,
    isSteamChat: boolean,
    isOfferSent: boolean | undefined = undefined
): string {
    const generatedSummary = summarize(offer, bot, type, withLink);

    const cT = bot.options.tradeSummary.customText;
    const cTSummary = isSteamChat
        ? cT.summary.steamChat
            ? cT.summary.steamChat
            : 'Summary'
        : cT.summary.discordWebhook
        ? cT.summary.discordWebhook
        : '__**Summary**__';

    const cTAsked = isSteamChat
        ? cT.asked.steamChat
            ? cT.asked.steamChat
            : '• Asked:'
        : cT.asked.discordWebhook
        ? cT.asked.discordWebhook
        : '**• Asked:**';

    const cTOffered = isSteamChat
        ? cT.offered.steamChat
            ? cT.offered.steamChat
            : '• Asked:'
        : cT.offered.discordWebhook
        ? cT.offered.discordWebhook
        : '**• Asked:**';

    const cTProfit = isSteamChat
        ? cT.profitFromOverpay.steamChat
            ? cT.profitFromOverpay.steamChat
            : '📈 Profit from overpay:'
        : cT.profitFromOverpay.discordWebhook
        ? cT.profitFromOverpay.discordWebhook
        : '📈 ***Profit from overpay:***';

    const cTLoss = isSteamChat
        ? cT.lossFromUnderpay.steamChat
            ? cT.lossFromUnderpay.steamChat
            : '📉 Loss from underpay:'
        : cT.lossFromUnderpay.discordWebhook
        ? cT.lossFromUnderpay.discordWebhook
        : '📉 ***Loss from underpay:***';

    return (
        `\n\n${cTSummary}${isOfferSent !== undefined ? ` (${isOfferSent ? 'chat' : 'offer'})` : ''}\n` +
        `${cTAsked} ${generatedSummary.asked}` +
        `\n${cTOffered} ${generatedSummary.offered}` +
        '\n──────────────────────' +
        (['summary-accepted', 'review-admin'].includes(type)
            ? value.diff > 0
                ? `\n${cTProfit} ${value.diffRef} ref` +
                  (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
                : value.diff < 0
                ? `\n${cTLoss} ${value.diffRef} ref` +
                  (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
                : ''
            : '')
    );
}

type SummarizeType = 'summary-accepted' | 'declined' | 'review-partner' | 'review-admin' | 'summary-accepting';

import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';
import { replace } from '../tools/export';

export default function summarize(
    offer: TradeOffer,
    bot: Bot,
    type: SummarizeType,
    withLink: boolean
): { asked: string; offered: string } {
    const value = offer.data('value') as ItemsValue;
    const items = (offer.data('dict') as ItemsDict) || { our: null, their: null };
    const showStockChanges = bot.options.tradeSummary.showStockChanges;

    if (!value) {
        // If trade with ADMINS or Gift
        return {
            asked: getSummary(items.our, bot, 'our', type, withLink, showStockChanges),
            offered: getSummary(items.their, bot, 'their', type, withLink, showStockChanges)
        };
    } else {
        // If trade with trade partner
        const opening = showStockChanges ? '〚' : ' (';
        const closing = showStockChanges ? '〛' : ')';
        return {
            asked:
                `${new Currencies(value.our).toString()}` +
                `${opening}${getSummary(items.our, bot, 'our', type, withLink, showStockChanges)}${closing}`,
            offered:
                `${new Currencies(value.their).toString()}` +
                `${opening}${getSummary(items.their, bot, 'their', type, withLink, showStockChanges)}${closing}`
        };
    }
}

function getSummary(
    dict: OurTheirItemsDict,
    bot: Bot,
    which: string,
    type: string,
    withLink: boolean,
    showStockChanges: boolean
): string {
    if (dict === null) {
        return 'unknown items';
    }

    const summary: string[] = [];

    for (const sku in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
            continue;
        }

        // compatible with pollData from before v3.0.0 / before v2.2.0 and/or v3.0.0 or later ↓
        const amount = typeof dict[sku] === 'object' ? (dict[sku]['amount'] as number) : dict[sku];
        const generateName = bot.schema.getName(SKU.fromString(sku.replace(/;p\d+/, '')), false);
        const name = replace.itemName(generateName ? generateName : 'unknown');

        if (showStockChanges) {
            let oldStock = 0;
            const currentStock = bot.inventoryManager.getInventory.getAmount(sku, true);
            const maxStock = bot.pricelist.getPrice(sku, false);

            if (type === 'summary-accepted') {
                oldStock = which === 'our' ? currentStock + amount : currentStock - amount;
            } else {
                oldStock = currentStock;
            }

            if (withLink) {
                summary.push(
                    `[${
                        bot.options.tradeSummary.showPureInEmoji
                            ? sku === '5021;6'
                                ? '<:tf2key:742725387968184371>'
                                : sku === '5002;6'
                                ? '<:tf2refined:735533220942053396>'
                                : sku === '5001;6'
                                ? '<:tf2reclaimed:809644301633323048>'
                                : sku === '5000;6'
                                ? '<:tf2scrap:809644301067091968>'
                                : name
                            : name
                    }](https://www.prices.tf/items/${sku})${amount > 1 ? ` x${amount}` : ''} (${
                        type === 'summary-accepted' && oldStock !== null ? `${oldStock} → ` : ''
                    }${currentStock}${maxStock ? `/${maxStock.max}` : ''})`
                );
            } else {
                summary.push(
                    `${name}${amount > 1 ? ` x${amount}` : ''}${
                        type === 'review-partner' || type === 'declined'
                            ? ''
                            : ` (${
                                  type === 'summary-accepted' && oldStock !== null ? `${oldStock} → ` : ''
                              }${currentStock}${maxStock ? `/${maxStock.max}` : ''})`
                    }`
                );
            }
        } else {
            if (withLink) {
                summary.push(
                    `[${
                        bot.options.tradeSummary.showPureInEmoji
                            ? sku === '5021;6'
                                ? '<:tf2key:742725387968184371>'
                                : sku === '5002;6'
                                ? '<:tf2refined:735533220942053396>'
                                : sku === '5001;6'
                                ? '<:tf2reclaimed:809644301633323048>'
                                : sku === '5000;6'
                                ? '<:tf2scrap:809644301067091968>'
                                : name
                            : name
                    }](https://www.prices.tf/items/${sku})${amount > 1 ? ` x${amount}` : ''}`
                );
            } else {
                summary.push(name + (amount > 1 ? ` x${amount}` : ''));
            }
        }
    }

    const summaryCount = summary.length;

    if (summaryCount === 0) {
        return 'nothing';
    }

    if (withLink) {
        let left = 0;
        if (summaryCount > 15) {
            left = summaryCount - 15;
            summary.splice(15);
        }

        return summary.join(', ') + (left !== 0 ? ` and ${left}` + ' more items.' : '');
    } else {
        return summary.join(', ');
    }
}
