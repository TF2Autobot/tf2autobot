import { TradeOffer, Prices } from '@tf2autobot/tradeoffer-manager';
import SKU from '@tf2autobot/tf2-sku';
import Currencies from '@tf2autobot/tf2-currencies';
import Bot from '../../classes/Bot';
import { replace, testPriceKey } from '../tools/export';

interface Items {
    invalid: string[];
    disabled: string[];
    overstock: string[];
    understock: string[];
    duped: string[];
    dupedFailed: string[];
    highValue: string[];
}

export default function listItems(offer: TradeOffer, bot: Bot, items: Items, isSteamChat: boolean): string {
    const itemsPrices = bot.options.tradeSummary.showItemPrices ? listPrices(offer, bot, isSteamChat) : '';
    let list = itemsPrices;

    const itemsPricesLength = itemsPrices.length;
    const invalidCount = items.invalid.length;
    const disabledCount = items.disabled.length;
    const overstockedCount = items.overstock.length;
    const understockedCount = items.understock.length;
    const dupedCount = items.duped.length;
    const dupedFailedCount = items.dupedFailed.length;
    const highValueCount = items.highValue.length;

    list +=
        invalidCount > 0
            ? (itemsPricesLength > 0 ? '\n\n' : '') +
              (isSteamChat
                  ? '🟨_INVALID_ITEMS:\n- ' + items.invalid.join(',\n- ')
                  : '🟨`_INVALID_ITEMS:`\n- ' + items.invalid.join(',@\n- '))
            : '';
    list +=
        disabledCount > 0
            ? (itemsPricesLength > 0 || invalidCount > 0 ? '\n\n' : '') +
              (isSteamChat
                  ? '🟧_DISABLED_ITEMS:\n- ' + items.disabled.join(',\n- ')
                  : '🟧`_DISABLED_ITEMS:`\n- ' + items.disabled.join(',@\n- '))
            : '';
    list +=
        overstockedCount > 0
            ? (itemsPricesLength > 0 || invalidCount > 0 || disabledCount > 0 ? '\n\n' : '') +
              (isSteamChat
                  ? '🟦_OVERSTOCKED:\n- ' + items.overstock.join(',\n- ')
                  : '🟦`_OVERSTOCKED:`\n- ' + items.overstock.join(',@\n- '))
            : '';
    list +=
        understockedCount > 0
            ? (itemsPricesLength > 0 || invalidCount > 0 || disabledCount > 0 || overstockedCount > 0 ? '\n\n' : '') +
              (isSteamChat
                  ? '🟩_UNDERSTOCKED:\n- ' + items.understock.join(',\n- ')
                  : '🟩`_UNDERSTOCKED:`\n- ' + items.understock.join(',@\n- '))
            : '';
    list +=
        dupedCount > 0
            ? (itemsPricesLength > 0 ||
              invalidCount > 0 ||
              disabledCount > 0 ||
              overstockedCount > 0 ||
              understockedCount > 0
                  ? '\n\n'
                  : '') +
              (isSteamChat
                  ? '🟫_DUPED_ITEMS:\n- ' + items.duped.join(',\n- ')
                  : '🟫`_DUPED_ITEMS:`\n- ' + items.duped.join(',@\n- '))
            : '';
    list +=
        dupedFailedCount > 0
            ? (itemsPricesLength > 0 ||
              invalidCount > 0 ||
              disabledCount > 0 ||
              overstockedCount > 0 ||
              understockedCount > 0 ||
              dupedCount > 0
                  ? '\n\n'
                  : '') +
              (isSteamChat
                  ? '🟪_DUPE_CHECK_FAILED:\n- ' + items.dupedFailed.join(',\n- ')
                  : '🟪`_DUPE_CHECK_FAILED:`\n- ' + items.dupedFailed.join(',@\n- '))
            : '';
    list +=
        highValueCount > 0
            ? (itemsPricesLength > 0 ||
              invalidCount > 0 ||
              disabledCount > 0 ||
              overstockedCount > 0 ||
              understockedCount > 0 ||
              dupedCount > 0 ||
              dupedFailedCount > 0
                  ? '\n\n'
                  : '') +
              (isSteamChat
                  ? '🔶_HIGH_VALUE_ITEMS:\n- ' + items.highValue.join('\n\n- ')
                  : '🔶`_HIGH_VALUE_ITEMS`\n- ' + items.highValue.join('@\n\n- '))
            : '';

    if (list.length === 0) {
        list = '-';
    }
    return replace.itemName(list);
}

function listPrices(offer: TradeOffer, bot: Bot, isSteamChat: boolean): string {
    const prices = offer.data('prices') as Prices;

    let text = '';
    const toJoin: string[] = [];
    const properName = bot.options.tradeSummary.showProperName;

    let buyPrice: string;
    let sellPrice: string;

    for (const priceKey in prices) {
        let autoprice = 'removed/not listed';

        if (!Object.prototype.hasOwnProperty.call(prices, priceKey)) {
            continue;
        }

        const entry = bot.pricelist.getPriceBySkuOrAsset(priceKey, false);
        if (entry !== null) {
            buyPrice = entry.buy.toString();
            sellPrice = entry.sell.toString();
            autoprice = entry.autoprice ? `autopriced${entry.isPartialPriced ? ' - ppu' : ''}` : 'manual';
        } else {
            buyPrice = new Currencies(prices[priceKey].buy).toString();
            sellPrice = new Currencies(prices[priceKey].sell).toString();
        }

        const name = testPriceKey(priceKey)
            ? bot.schema.getName(SKU.fromString(entry?.sku ?? priceKey), properName)
            : priceKey;

        toJoin.push(
            `${
                isSteamChat
                    ? `${name} - ${buyPrice} / ${sellPrice} (${autoprice})`
                    : `_${name}_ - ${buyPrice} / ${sellPrice} (${autoprice})`
            }`
        );
    }

    if (toJoin.length > 0) {
        text = isSteamChat
            ? '📜_ITEMS_PRICES\n- ' + toJoin.join(',\n- ')
            : '📜`_ITEMS_PRICES`\n- ' + toJoin.join(',@\n- ');
    }

    return text;
}
