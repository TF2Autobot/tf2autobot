import { TradeOffer, ItemsDict, OurTheirItemsDict, ItemsValue } from '@tf2autobot/tradeoffer-manager';
import SKU from '@tf2autobot/tf2-sku';
import { ValueDiff, replace, testPriceKey } from '../tools/export';

export interface SummarizeToChatRequirement {
    offer: TradeOffer;
    schema: SchemaManager.Schema;
    options: Options;
    pricelist: Pricelist;
    inventoryManager: InventoryManager;
    type: SummarizeType;
    withLink: boolean;
    value: ValueDiff;
    isSteamChat: boolean;
    isOfferSent?: boolean | undefined;
    isAcceptedWithEscrow?: boolean | undefined;
}
interface GetSummaryRequirement {
    dict: OurTheirItemsDict;
    schema: SchemaManager.Schema;
    options: Options;
    pricelist: Pricelist;
    inventoryManager: InventoryManager;
    which: string;
    type: string;
    withLink: boolean;
    showStockChanges: boolean;
    isCompressSummary: boolean;
}

const pureEmoji = new Map<string, string>();
pureEmoji
    .set('5021;6', '<:tf2key:813050393793658930>')
    .set('5002;6', '<:tf2refined:813050808605212672>')
    .set('5001;6', '<:tf2reclaimed:813048057352421417>')
    .set('5000;6', '<:tf2scrap:813048057577996348>');

export function summarizeToChat({
    offer,
    schema,
    options,
    pricelist,
    inventoryManager,
    type,
    withLink,
    value,
    isSteamChat,
    isOfferSent = undefined,
    isAcceptedWithEscrow = undefined
}: SummarizeToChatRequirement): string {
    const generatedSummary = summarize(offer, schema, options, pricelist, inventoryManager, type, withLink);

    const cT = options.tradeSummary.customText;
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
            : '• Offered:'
        : cT.offered.discordWebhook
          ? cT.offered.discordWebhook
          : '**• Offered:**';

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

    const isCountered = offer.data('processCounterTime') !== undefined;
    const reply =
        `\n\n${cTSummary}${
            isOfferSent !== undefined
                ? ` (${isOfferSent ? 'chat' : `offer${isCountered ? ' - countered' : ''}`})${isAcceptedWithEscrow ? ' - Trade Hold' : ''}`
                : ''
        }\n` +
        `${cTAsked} ${generatedSummary.asked}` +
        `\n${cTOffered} ${generatedSummary.offered}` +
        '\n──────────────────────' +
        (['summary-accepted', 'review-admin'].includes(type) && !isOfferSent
            ? value.diff > 0
                ? `\n${cTProfit} ${value.diffRef} ref` + (value.diffRef >= value.rate ? ` (${value.diffKey})` : '')
                : value.diff < 0
                  ? `\n${cTLoss} ${value.diffRef} ref` + (value.diffRef >= value.rate ? ` (${value.diffKey})` : '')
                  : ''
            : '');

    return reply;
}

type SummarizeType =
    'summary-accepted' | 'declined' | 'review-partner' | 'review-admin' | 'summary-accepting' | 'summary-countering';

import Currencies from '@tf2autobot/tf2-currencies';
import SchemaManager from '@tf2autobot/tf2-schema';
import Options from '../../classes/Options';
import Pricelist from '../../classes/Pricelist';
import InventoryManager from '../../classes/InventoryManager';

export default function summarize(
    offer: TradeOffer,
    schema: SchemaManager.Schema,
    options: Options,
    pricelist: Pricelist,
    inventoryManager: InventoryManager,
    type: SummarizeType,
    withLink: boolean
): { asked: string; offered: string } {
    const value = offer.data('value') as ItemsValue;
    const items = (offer.data('dict') as ItemsDict) || { our: null, their: null };
    const showStockChanges = options.tradeSummary.showStockChanges;

    const ourCount = Object.keys(items.our).length;
    const theirCount = Object.keys(items.their).length;

    const isCompressSummary = (ourCount > 15 && theirCount > 15) || ourCount + theirCount > 28; // Estimate until limit reached
    const req = (which: 'our' | 'their') => {
        return {
            dict: items[which],
            schema,
            options,
            pricelist,
            inventoryManager,
            which,
            type,
            withLink,
            showStockChanges,
            isCompressSummary
        };
    };

    if (!value) {
        // If trade with ADMINS or Gift
        return {
            asked: getSummary(req('our')),
            offered: getSummary(req('their'))
        };
    } else {
        // If trade with trade partner
        const opening = showStockChanges ? '〚' : ' (';
        const closing = showStockChanges ? '〛' : ')';
        return {
            asked: `${new Currencies(value.our).toString()}` + `${opening}${getSummary(req('our'))}${closing}`,
            offered: `${new Currencies(value.their).toString()}` + `${opening}${getSummary(req('their'))}${closing}`
        };
    }
}

function getSummary({
    dict,
    schema,
    options,
    pricelist,
    inventoryManager,
    which,
    type,
    withLink,
    showStockChanges,
    isCompressSummary
}: GetSummaryRequirement): string {
    if (dict === null) {
        return 'unknown items';
    }

    const summary: string[] = [];
    const properName = options.tradeSummary.showProperName;

    for (const priceKey in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, priceKey)) {
            continue;
        }

        const entry = pricelist.getPriceBySkuOrAsset({ priceKey, onlyEnabled: false });
        const isTF2Items = testPriceKey(priceKey);

        // compatible with pollData from before v3.0.0 / before v2.2.0 and/or v3.0.0 or later ↓
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Object is possibly 'null'.
        const amount = typeof dict[priceKey] === 'object' ? (dict[priceKey]['amount'] as number) : dict[priceKey];
        const sku =
            type === 'summary-accepted' ? (entry?.sku ?? priceKey).replace(/;p\d+/, '') : (entry?.sku ?? priceKey);

        const generateName = isTF2Items
            ? `${schema.getName(SKU.fromString(sku), properName)}${entry?.id ? ` - ${entry.id}` : ''}`
            : priceKey; // Non-TF2 items
        const name = properName ? generateName : replace.itemName(generateName ? generateName : 'unknown');

        if (showStockChanges) {
            let oldStock: number | null;
            const currentStock = inventoryManager.getInventory.getAmount({
                priceKey,
                includeNonNormalized: true,
                tradableOnly: true
            });

            const summaryAccepted = ['summary-accepted'].includes(type);
            const summaryInProcess = ['review-admin', 'summary-accepting', 'summary-countering'].includes(type);

            if (summaryAccepted || summaryInProcess) {
                oldStock =
                    which === 'our'
                        ? summaryInProcess
                            ? currentStock
                            : currentStock + amount
                        : summaryInProcess
                          ? currentStock
                          : currentStock - amount;
            } else {
                oldStock = currentStock;
            }

            if (withLink && isTF2Items) {
                summary.push(
                    `[${
                        options.tradeSummary.showPureInEmoji ? (pureEmoji.has(sku) ? pureEmoji.get(sku) : name) : name
                    }](https://autobot.tf/items/${sku})${amount > 1 ? ` x${amount}` : ''} (${
                        (summaryAccepted || summaryInProcess) && oldStock !== null ? `${oldStock} → ` : ''
                    }${
                        which === 'our'
                            ? summaryInProcess
                                ? currentStock - amount
                                : currentStock
                            : summaryInProcess
                              ? currentStock + amount
                              : currentStock
                    }${entry ? `/${entry.max}` : ''})`
                );
            } else {
                summary.push(
                    `${name}${amount > 1 ? ` x${amount}` : ''}${
                        ['review-partner', 'declined'].includes(type)
                            ? ''
                            : ` (${(summaryAccepted || summaryInProcess) && oldStock !== null ? `${oldStock} → ` : ''}${
                                  which === 'our'
                                      ? summaryInProcess
                                          ? currentStock - amount
                                          : currentStock
                                      : summaryInProcess
                                        ? currentStock + amount
                                        : currentStock
                              }${entry ? `/${entry.max}` : ''})`
                    }`
                );
            }
        } else {
            if (withLink && isTF2Items) {
                summary.push(
                    `[${
                        options.tradeSummary.showPureInEmoji ? (pureEmoji.has(sku) ? pureEmoji.get(sku) : name) : name
                    }](https://autobot.tf/items/${sku})${amount > 1 ? ` x${amount}` : ''}`
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

        if (isCompressSummary) {
            if (summaryCount > 15) {
                left = summaryCount - 15;
                summary.splice(15);
            }
        }

        return summary.join(', ') + (left > 0 ? ` and ${left} more items.` : '');
    } else {
        return summary.join(', ');
    }
}
