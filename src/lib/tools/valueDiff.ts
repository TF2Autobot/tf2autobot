import { ItemsValue, TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Currencies from '@tf2autobot/tf2-currencies';
import { Currency } from '../../types/TeamFortress2';
import { KeyPrices } from '../../classes/Pricelist';

export default function valueDiff(
    offer: TradeOffer,
    keyPrices: KeyPrices,
    isTradingKeys: boolean,
    enableShowOnlyMetal: boolean
): ValueDiff {
    const value = offer.data('value') as ItemsValue;

    if (!value) {
        return { ourValue: 0, theirValue: 0, diff: 0, diffRef: 0, diffKey: '' };
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
            newValue.our.metal = Currencies.toRefined(
                Currencies.toScrap(newValue.our.metal) + newValue.our.keys * keyPrices.sell.toValue()
            );
            newValue.our.keys = 0;

            // If trading keys, then their side need to use buying key price.
            newValue.their.metal = Currencies.toRefined(
                Currencies.toScrap(newValue.their.metal) +
                    newValue.their.keys * (isTradingKeys ? keyPrices.buy.toValue() : keyPrices.sell.toValue())
            );
            newValue.their.keys = 0;
        }

        const diff = Currencies.toScrap(newValue.their.metal) - Currencies.toScrap(newValue.our.metal);

        return {
            ourValue: Currencies.toScrap(newValue.our.metal),
            theirValue: Currencies.toScrap(newValue.their.metal),
            diff: diff,
            diffRef: Currencies.toRefined(Math.abs(diff)),
            diffKey: Currencies.toCurrencies(
                Math.abs(diff),
                Math.abs(diff) >= keyPrices.sell.metal ? keyPrices.sell.metal : undefined
            ).toString()
        };
    }
}

export interface ValueDiff {
    ourValue: number;
    theirValue: number;
    diff: number;
    diffRef: number;
    diffKey: string;
}
