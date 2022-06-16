import { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Currencies from '@tf2autobot/tf2-currencies';
import { KeyPrices } from '../../classes/Pricelist';

export default function valueDiff(offer: TradeOffer, keyPrices: KeyPrices, isTradingKeys: boolean): ValueDiff {
    let value = offer.data('value') as ItemValue;

    if (!value) {
        return { ourValue: 0, theirValue: 0, diff: 0, diffRef: 0, diffKey: '' };
    } else {
        value = {
            our: new Currencies({ keys: value.our.keys, metal: value.our.metal }),
            their: new Currencies({ keys: value.their.keys, metal: value.their.metal })
        };

        const ourValue = value.our.toValue(keyPrices.sell.metal);
        const theirValue = value.their.toValue(isTradingKeys ? keyPrices.buy.metal : keyPrices.sell.metal);
        const diff = theirValue - ourValue;
        const absoluteValue = Math.abs(diff);

        return {
            ourValue,
            theirValue,
            diff,
            diffRef: Currencies.toRefined(absoluteValue),
            diffKey: Currencies.toCurrencies(absoluteValue, keyPrices.sell.metal).toString()
        };
    }
}

interface ItemValue {
    our: Currencies;
    their: Currencies;
}

export interface ValueDiff {
    ourValue: number;
    theirValue: number;
    diff: number;
    diffRef: number;
    diffKey: string;
}
