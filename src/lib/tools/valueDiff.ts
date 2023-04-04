import { ItemsValue, TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Currencies from '@tf2autobot/tf2-currencies';

export default function valueDiff(offer: TradeOffer): ValueDiff {
    const value = offer.data('value') as ItemsValue;

    if (!value) {
        return { ourValue: 0, theirValue: 0, diff: 0, diffRef: 0, diffKey: '', rate: 0 };
    }

    const diff = value.their.total - value.our.total;
    const absoluteValue = Math.abs(diff);

    return {
        ourValue: value.our.total,
        theirValue: value.their.total,
        diff,
        diffRef: Currencies.toRefined(absoluteValue),
        diffKey: Currencies.toCurrencies(absoluteValue, value.rate).toString(),
        rate: value.rate
    };
}

export interface ValueDiff {
    ourValue: number;
    theirValue: number;
    diff: number;
    diffRef: number;
    diffKey: string;
    rate: number;
}
