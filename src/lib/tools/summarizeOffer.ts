import { KeyPrices } from '../../classes/Pricelist';

export function summarizeToChat(
    trade: string,
    value: ValueDiff,
    keyPrice: KeyPrices,
    isSteamChat: boolean,
    isOfferSent: boolean | undefined = undefined
): string {
    const summary =
        `\n\n${isSteamChat ? 'Summary' : '__**Summary**__'}${
            isOfferSent !== undefined ? ` (${isOfferSent ? 'chat' : 'offer'})` : ''
        }\n` +
        trade
            .replace('Asked:', isSteamChat ? '• Asked:' : '**• Asked:**')
            .replace('Offered:', isSteamChat ? '• Offered:' : '**• Offered:**') +
        '\n──────────────────────' +
        (value.diff > 0
            ? `\n📈 ${isSteamChat ? 'Profit from overpay:' : '***Profit from overpay:***'} ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : value.diff < 0
            ? `\n📉 ${isSteamChat ? 'Loss from underpay:' : '***Loss from underpay:***'} ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : '');
    return summary;
}

import { TradeOffer, ItemsDict, OurTheirItemsDict, ItemsValue } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';
import Bot from '../../classes/Bot';

import { replace } from '../tools/export';

export default function summarize(offer: TradeOffer, bot: Bot, type: string, withLink: boolean): string {
    const value = offer.data('value') as ItemsValue;
    const items = (offer.data('dict') as ItemsDict) || { our: null, their: null };

    if (!value) {
        // If trade with ADMINS or Gift
        if (bot.options.tradeSummary.showStockChanges) {
            if (withLink) {
                return (
                    'Asked: ' +
                    summarizeWithLinkWithStockChanges(items.our, bot, 'our', type) +
                    '\nOffered: ' +
                    summarizeWithLinkWithStockChanges(items.their, bot, 'their', type)
                );
            } else {
                return (
                    'Asked: ' +
                    summarizeWithoutLinkWithStockChanges(items.our, bot, 'our', type) +
                    '\nOffered: ' +
                    summarizeWithoutLinkWithStockChanges(items.their, bot, 'their', type)
                );
            }
        } else {
            if (withLink) {
                return (
                    'Asked: ' +
                    summarizeWithLinkWithoutStockChanges(items.our, bot) +
                    '\nOffered: ' +
                    summarizeWithLinkWithoutStockChanges(items.their, bot)
                );
            } else {
                return (
                    'Asked: ' +
                    summarizeWithoutLinkWithoutStockChanges(items.our, bot) +
                    '\nOffered: ' +
                    summarizeWithoutLinkWithoutStockChanges(items.their, bot)
                );
            }
        }
    } else {
        // If trade with trade partner
        if (bot.options.tradeSummary.showStockChanges) {
            if (withLink) {
                return (
                    'Asked: ' +
                    new Currencies(value.our).toString() +
                    '〚' +
                    summarizeWithLinkWithStockChanges(items.our, bot, 'our', type) +
                    '〛\nOffered: ' +
                    new Currencies(value.their).toString() +
                    '〚' +
                    summarizeWithLinkWithStockChanges(items.their, bot, 'their', type) +
                    '〛'
                );
            } else {
                return (
                    'Asked: ' +
                    new Currencies(value.our).toString() +
                    '〚' +
                    summarizeWithoutLinkWithStockChanges(items.our, bot, 'our', type) +
                    '〛\nOffered: ' +
                    new Currencies(value.their).toString() +
                    '〚' +
                    summarizeWithoutLinkWithStockChanges(items.their, bot, 'their', type) +
                    '〛'
                );
            }
        } else {
            if (withLink) {
                return (
                    'Asked: ' +
                    new Currencies(value.our).toString() +
                    ' (' +
                    summarizeWithLinkWithoutStockChanges(items.our, bot) +
                    ')\nOffered: ' +
                    new Currencies(value.their).toString() +
                    ' (' +
                    summarizeWithLinkWithoutStockChanges(items.their, bot) +
                    ')'
                );
            } else {
                return (
                    'Asked: ' +
                    new Currencies(value.our).toString() +
                    ' (' +
                    summarizeWithoutLinkWithoutStockChanges(items.our, bot) +
                    ')\nOffered: ' +
                    new Currencies(value.their).toString() +
                    ' (' +
                    summarizeWithoutLinkWithoutStockChanges(items.their, bot) +
                    ')'
                );
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

        // compatible with polldata from before v3.0.0                                    ↓ before v2.2.0 and/or v3.0.0 or later
        const amount = typeof dict[sku] === 'object' ? (dict[sku]['amount'] as number) : dict[sku];
        const generateName = bot.schema.getName(SKU.fromString(sku), false);
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

        // compatible with polldata from before v3.0.0                                    ↓ before v2.2.0 and/or v3.0.0 or later
        const amount = typeof dict[sku] === 'object' ? (dict[sku]['amount'] as number) : dict[sku];
        const generateName = bot.schema.getName(SKU.fromString(sku), false);
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

        // compatible with polldata from before v3.0.0                                    ↓ before v2.2.0 and/or v3.0.0 or later
        const amount = typeof dict[sku] === 'object' ? (dict[sku]['amount'] as number) : dict[sku];
        const generateName = bot.schema.getName(SKU.fromString(sku), false);
        const name = replace.itemName(generateName ? generateName : 'unknown');

        let oldStock = 0;
        const currentStock = bot.inventoryManager.getInventory().getAmount(sku, true);
        const maxStock = bot.pricelist.getPrice(sku, false);

        if (type === 'summary') {
            oldStock = which === 'our' ? currentStock + amount : currentStock - amount;
        } else {
            oldStock = currentStock;
        }

        summary.push(
            `${name}${amount > 1 ? ` x${amount}` : ''}${
                type === 'review-partner' || type === 'declined'
                    ? ''
                    : ` (${type === 'summary' && oldStock !== null ? `${oldStock} → ` : ''}${currentStock}${
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

        // compatible with polldata from before v3.0.0                                    ↓ before v2.2.0 and/or v3.0.0 or later
        const amount = typeof dict[sku] === 'object' ? (dict[sku]['amount'] as number) : dict[sku];
        const generateName = bot.schema.getName(SKU.fromString(sku), false);
        const name = replace.itemName(generateName ? generateName : 'unknown');

        let oldStock = 0;
        const currentStock = bot.inventoryManager.getInventory().getAmount(sku, true);
        const maxStock = bot.pricelist.getPrice(sku, false);

        if (type === 'summary') {
            oldStock = which === 'our' ? currentStock + amount : currentStock - amount;
        } else {
            oldStock = currentStock;
        }

        summary.push(
            `[${name}](https://www.prices.tf/items/${sku})${amount > 1 ? ` x${amount}` : ''} (${
                type === 'summary' && oldStock !== null ? `${oldStock} → ` : ''
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

interface ValueDiff {
    diff: number;
    diffRef: number;
    diffKey: string;
}
