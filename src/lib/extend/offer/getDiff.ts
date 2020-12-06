import { TradeOffer, ItemsDict } from 'steam-tradeoffer-manager';
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

        diff[sku] = (diff[sku] || 0) - dict.our[sku].amount;
    }

    for (const sku in dict.their) {
        if (!Object.prototype.hasOwnProperty.call(dict.their, sku)) {
            continue;
        }

        diff[sku] = (diff[sku] || 0) + dict.their[sku].amount;
    }

    return diff;
};
