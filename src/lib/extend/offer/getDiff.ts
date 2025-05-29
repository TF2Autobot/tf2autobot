import { TradeOffer, ItemsDict } from '@tf2autobot/tradeoffer-manager';
import { UnknownDictionary } from '../../../types/common';

export = function (): UnknownDictionary<number> | null {
    const self = this as TradeOffer;
    const dict = self.data('dict') as ItemsDict;

    if (dict === undefined) {
        return null;
    }

    const diff: UnknownDictionary<number> = {};

    for (const priceKey in dict.our) {
        if (!Object.prototype.hasOwnProperty.call(dict.our, priceKey)) {
            continue;
        }

        diff[priceKey] =
            (diff[priceKey] || 0) -
            (typeof dict.our[priceKey] === 'object'
                ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore: Object is possibly 'null'.
                  (dict.our[priceKey]['amount'] as number) // compatible with polldata from before v3.0.0
                : dict.our[priceKey]); // before v2.2.0 and/or v3.0.0 or later
    }

    for (const priceKey in dict.their) {
        if (!Object.prototype.hasOwnProperty.call(dict.their, priceKey)) {
            continue;
        }

        diff[priceKey] =
            (diff[priceKey] || 0) +
            (typeof dict.their[priceKey] === 'object'
                ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore: Object is possibly 'null'.
                  (dict.their[priceKey]['amount'] as number) // compatible with polldata from before v3.0.0
                : dict.their[priceKey]); // before v2.2.0 and/or v3.0.0 or later
    }

    return diff;
};
