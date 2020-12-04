import { TradeOffer } from 'steam-tradeoffer-manager';
import { UnknownDictionary } from '../../../types/common';

import { ItemsDict } from '../../../classes/MyHandler/interfaces';

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

        const isDefined = dict.our[sku]['amount'] !== undefined;

        diff[sku] = (diff[sku] || 0) - (isDefined ? dict.our[sku]['amount'] : 0);
    }

    for (const sku in dict.their) {
        if (!Object.prototype.hasOwnProperty.call(dict.their, sku)) {
            continue;
        }

        const isDefined = dict.their[sku]['amount'] !== undefined;

        diff[sku] = (diff[sku] || 0) + (isDefined ? dict.their[sku]['amount'] : 0);
    }

    return diff;
};
