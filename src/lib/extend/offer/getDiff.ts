import { TradeOffer, ItemsDict } from '@tf2autobot/tradeoffer-manager';
import { UnknownDictionary } from '../../../types/common';

export = function (): UnknownDictionary<number> | null {
    const self = this as TradeOffer;
    const dict = self.data('dict') as ItemsDict;

    if (dict === undefined) {
        return null;
    }

    const diff: UnknownDictionary<number> = {};

    for (const sku in dict.our) {
        if (!Object.prototype.hasOwnProperty.call(dict.our, sku)) {
            continue;
        }

        diff[sku] =
            (diff[sku] || 0) -
            (typeof dict.our[sku] === 'object' ? (dict.our[sku]['amount'] as number) : dict.our[sku]);
        // compatible with polldata from before v3.0.0^^^      before v2.2.0 and/or v3.0.0 or later^^
    }

    for (const sku in dict.their) {
        if (!Object.prototype.hasOwnProperty.call(dict.their, sku)) {
            continue;
        }

        diff[sku] =
            (diff[sku] || 0) +
            (typeof dict.their[sku] === 'object' ? (dict.their[sku]['amount'] as number) : dict.their[sku]);
        // compatible with polldata from before v3.0.0^^^      before v2.2.0 and/or v3.0.0 or later^^
    }

    return diff;
};
