import { TradeOffer, Prices } from 'steam-tradeoffer-manager';
import SKU from 'tf2-sku-2';
import Currencies from 'tf2-currencies';
import Bot from '../../classes/Bot';

export default function listItems(
    items: {
        invalid: string[];
        overstock: string[];
        understock: string[];
        duped: string[];
        dupedFailed: string[];
        highValue: string[];
    },
    isSteamChat: boolean
): string {
    let list =
        items.invalid.length > 0
            ? isSteamChat
                ? '🟨_INVALID_ITEMS:\n- ' + items.invalid.join(',\n- ')
                : '🟨`_INVALID_ITEMS:`\n- ' + items.invalid.join(',@\n- ')
            : '';
    list +=
        items.overstock.length > 0
            ? (items.invalid.length > 0 ? '\n\n' : '') +
              (isSteamChat
                  ? '🟦_OVERSTOCKED:\n- ' + items.overstock.join(',\n- ')
                  : '🟦`_OVERSTOCKED:`\n- ' + items.overstock.join(',@\n- '))
            : '';
    list +=
        items.understock.length > 0
            ? (items.invalid.length > 0 || items.overstock.length > 0 ? '\n\n' : '') +
              (isSteamChat
                  ? '🟩_UNDERSTOCKED:\n- ' + items.understock.join(',\n- ')
                  : '🟩`_UNDERSTOCKED:`\n- ' + items.understock.join(',@\n- '))
            : '';
    list +=
        items.duped.length > 0
            ? (items.invalid.length > 0 || items.overstock.length > 0 || items.understock.length > 0 ? '\n\n' : '') +
              (isSteamChat
                  ? '🟫_DUPED_ITEMS:\n- ' + items.duped.join(',\n- ')
                  : '🟫`_DUPED_ITEMS:`\n- ' + items.duped.join(',@\n- '))
            : '';
    list +=
        items.dupedFailed.length > 0
            ? (items.invalid.length > 0 ||
              items.overstock.length > 0 ||
              items.understock.length > 0 ||
              items.duped.length > 0
                  ? '\n\n'
                  : '') +
              (isSteamChat
                  ? '🟪_DUPE_CHECK_FAILED:\n- ' + items.dupedFailed.join(',\n- ')
                  : '🟪`_DUPE_CHECK_FAILED:`\n- ' + items.dupedFailed.join(',@\n- '))
            : '';
    list +=
        items.highValue.length > 0
            ? (items.invalid.length > 0 ||
              items.overstock.length > 0 ||
              items.understock.length > 0 ||
              items.duped.length > 0 ||
              items.dupedFailed.length > 0
                  ? '\n\n'
                  : '') +
              (isSteamChat
                  ? '🔶_HIGH_VALUE_ITEMS:\n- ' + items.highValue.join('\n\n- ')
                  : '🔶`_HIGH_VALUE_ITEMS`\n- ' + items.highValue.join('@\n\n- '))
            : '';

    if (list.length === 0) {
        list = '-';
    }
    return list;
}

export function listPrices(offer: TradeOffer, bot: Bot, isSteamChat: boolean): string {
    const prices = offer.data('prices') as Prices;

    let text = '';
    const toJoin: string[] = [];
    for (const sku in prices) {
        if (!Object.prototype.hasOwnProperty.call(prices, sku)) {
            continue;
        }

        const name = bot.schema.getName(SKU.fromString(sku), false);
        const buyPrice = new Currencies(prices[sku].buy).toString();
        const sellPrice = new Currencies(prices[sku].sell).toString();

        toJoin.push(
            `${isSteamChat ? `${name} - ${buyPrice} / ${sellPrice}` : `_${name}_ - ${buyPrice} / ${sellPrice}`}`
        );
    }

    if (toJoin.length > 0) {
        text = `📜${isSteamChat ? '' : '`'}_ITEMS_PRICES${isSteamChat ? '\n' : '`\n'}` + toJoin.join(',\n- ');
    }

    return text;
}
