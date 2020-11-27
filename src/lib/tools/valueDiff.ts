import { TradeOffer } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import { Currency } from '../../types/TeamFortress2';

export default function valueDiff(
    offer: TradeOffer,
    keyPrices: { buy: Currencies; sell: Currencies },
    isTradingKeys: boolean,
    enableShowOnlyMetal: boolean
): { diff: number; diffRef: number; diffKey: string } {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value: { our: Currency; their: Currency } = offer.data('value');

    let diff: number;
    let diffRef: number;
    let diffKey: string;
    if (!value) {
        diff = 0;
        diffRef = 0;
        diffKey = '';
    } else {
        const newValue: { our: Currency; their: Currency } = {
            our: {
                keys: value.our.keys,
                metal: value.our.metal
            },
            their: {
                keys: value.their.keys,
                metal: value.their.metal
            }
        };

        if (!enableShowOnlyMetal) {
            // if ENABLE_SHOW_ONLY_METAL is set to false, then this need to be converted first.
            if (isTradingKeys) {
                // If trading keys, then their side need to use buying key price.
                newValue.our.metal = Currencies.toRefined(
                    Currencies.toScrap(newValue.our.metal) + newValue.our.keys * keyPrices.sell.toValue()
                );
                newValue.our.keys = 0;
                newValue.their.metal = Currencies.toRefined(
                    Currencies.toScrap(newValue.their.metal) + newValue.their.keys * keyPrices.buy.toValue()
                );
                newValue.their.keys = 0;
            } else {
                // Else both use selling key price.
                newValue.our.metal = Currencies.toRefined(
                    Currencies.toScrap(newValue.our.metal) + newValue.our.keys * keyPrices.sell.toValue()
                );
                newValue.our.keys = 0;
                newValue.their.metal = Currencies.toRefined(
                    Currencies.toScrap(newValue.their.metal) + newValue.their.keys * keyPrices.sell.toValue()
                );
                newValue.their.keys = 0;
            }
        }

        diff = Currencies.toScrap(newValue.their.metal) - Currencies.toScrap(newValue.our.metal);
        diffRef = Currencies.toRefined(Math.abs(diff));
        diffKey = Currencies.toCurrencies(
            Math.abs(diff),
            Math.abs(diff) >= keyPrices.sell.metal ? keyPrices.sell.metal : undefined
        ).toString();
    }
    return { diff, diffRef, diffKey };
}
