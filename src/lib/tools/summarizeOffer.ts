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
    type: string,
    withLink: boolean,
    value: ValueDiff,
    keyPrice: KeyPrices,
    isSteamChat: boolean,
    isOfferSent: boolean | undefined = undefined
): string {
    const generatedSummary = summarize(offer, bot, type, withLink);

    return (
        `\n\n${isSteamChat ? 'Summary' : '__**Summary**__'}${
            isOfferSent !== undefined ? ` (${isOfferSent ? 'chat' : 'offer'})` : ''
        }\n` +
        `${isSteamChat ? '• Asked:' : '**• Asked:**'} ${generatedSummary.asked}` +
        `\n${isSteamChat ? '• Offered:' : '**• Offered:**'} ${generatedSummary.offered}` +
        '\n──────────────────────' +
        (value.diff > 0
            ? `\n📈 ${isSteamChat ? 'Profit from overpay:' : '***Profit from overpay:***'} ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : value.diff < 0
            ? `\n📉 ${isSteamChat ? 'Loss from underpay:' : '***Loss from underpay:***'} ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : '')
    );
}

import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';

import { replace } from '../tools/export';

export default function summarize(
    offer: TradeOffer,
    bot: Bot,
    type: string,
    withLink: boolean
): { asked: string; offered: string } {
    const value = offer.data('value') as ItemsValue;
    const items = (offer.data('dict') as ItemsDict) || { our: null, their: null };

    if (!value) {
        // If trade with ADMINS or Gift
        if (bot.options.tradeSummary.showStockChanges) {
            if (withLink) {
                return {
                    asked: summarizeWithLinkWithStockChanges(items.our, bot, 'our', type),
                    offered: summarizeWithLinkWithStockChanges(items.their, bot, 'their', type)
                };
            } else {
                return {
                    asked: summarizeWithoutLinkWithStockChanges(items.our, bot, 'our', type),
                    offered: summarizeWithoutLinkWithStockChanges(items.their, bot, 'their', type)
                };
            }
        } else {
            if (withLink) {
                return {
                    asked: summarizeWithLinkWithoutStockChanges(items.our, bot),
                    offered: summarizeWithLinkWithoutStockChanges(items.their, bot)
                };
            } else {
                return {
                    asked: summarizeWithoutLinkWithoutStockChanges(items.our, bot),
                    offered: summarizeWithoutLinkWithoutStockChanges(items.their, bot)
                };
            }
        }
    } else {
        // If trade with trade partner
        if (bot.options.tradeSummary.showStockChanges) {
            if (withLink) {
                return {
                    asked:
                        `${new Currencies(value.our).toString()}` +
                        `〚${summarizeWithLinkWithStockChanges(items.our, bot, 'our', type)}〛`,
                    offered:
                        `${new Currencies(value.their).toString()}` +
                        `〚${summarizeWithLinkWithStockChanges(items.their, bot, 'their', type)}〛`
                };
            } else {
                return {
                    asked:
                        `${new Currencies(value.our).toString()}` +
                        `〚${summarizeWithoutLinkWithStockChanges(items.our, bot, 'our', type)}〛`,
                    offered:
                        `${new Currencies(value.their).toString()}` +
                        `〚${summarizeWithoutLinkWithStockChanges(items.their, bot, 'their', type)}〛`
                };
            }
        } else {
            if (withLink) {
                return {
                    asked:
                        `${new Currencies(value.our).toString()}` +
                        ` (${summarizeWithLinkWithoutStockChanges(items.our, bot)})`,
                    offered:
                        `${new Currencies(value.their).toString()}` +
                        ` (${summarizeWithLinkWithoutStockChanges(items.their, bot)})`
                };
            } else {
                return {
                    asked:
                        `${new Currencies(value.our).toString()}` +
                        ` (${summarizeWithoutLinkWithoutStockChanges(items.our, bot)})`,
                    offered:
                        `${new Currencies(value.their).toString()}` +
                        ` (${summarizeWithoutLinkWithoutStockChanges(items.their, bot)})`
                };
            }
        }
    }
}

function summarizeWithoutLinkWithoutStockChanges(dict: OurTheirItemsDict, bot: Bot): string {
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

        summary.push(name + (amount > 1 ? ` x${amount}` : ''));
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    return summary.join(', ');
}

function summarizeWithLinkWithoutStockChanges(dict: OurTheirItemsDict, bot: Bot): string {
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

        summary.push('[' + name + '](https://www.prices.tf/items/' + sku + ')' + (amount > 1 ? ` x${amount}` : ''));
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    let left = 0;

    if (summary.length > 15) {
        left = summary.length - 15;
        summary.splice(15);
    }

    return summary.join(', ') + (left !== 0 ? ` and ${left}` + ' more items.' : '');
}

function summarizeWithoutLinkWithStockChanges(dict: OurTheirItemsDict, bot: Bot, which: string, type: string): string {
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

        let oldStock = 0;
        const currentStock = bot.inventoryManager.getInventory.getAmount(sku, true, false);
        const maxStock = bot.pricelist.getPrice(sku, false);

        if (type === 'summary-accepted') {
            oldStock = which === 'our' ? currentStock + amount : currentStock - amount;
        } else {
            oldStock = currentStock;
        }

        summary.push(
            `${name}${amount > 1 ? ` x${amount}` : ''}${
                type === 'review-partner' || type === 'declined'
                    ? ''
                    : ` (${type === 'summary-accepted' && oldStock !== null ? `${oldStock} → ` : ''}${currentStock}${
                          maxStock ? `/${maxStock.max}` : ''
                      })`
            }`
        );
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    return summary.join(', ');
}

function summarizeWithLinkWithStockChanges(dict: OurTheirItemsDict, bot: Bot, which: string, type: string): string {
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

        let oldStock = 0;
        const currentStock = bot.inventoryManager.getInventory.getAmount(sku, true, false);
        const maxStock = bot.pricelist.getPrice(sku, false);

        if (type === 'summary-accepted') {
            oldStock = which === 'our' ? currentStock + amount : currentStock - amount;
        } else {
            oldStock = currentStock;
        }

        summary.push(
            `[${name}](https://www.prices.tf/items/${sku})${amount > 1 ? ` x${amount}` : ''} (${
                type === 'summary-accepted' && oldStock !== null ? `${oldStock} → ` : ''
            }${currentStock}${maxStock ? `/${maxStock.max}` : ''})`
        );
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    let left = 0;

    if (summary.length > 15) {
        left = summary.length - 15;
        summary.splice(15);
    }

    return summary.join(', ') + (left !== 0 ? ` and ${left}` + ' more items.' : '');
}
