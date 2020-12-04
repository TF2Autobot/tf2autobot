import { TradeOffer } from 'steam-tradeoffer-manager';

import { ItemsDict, ItemsDictContent } from '../../../classes/MyHandler/interfaces';

export = function (): string {
    const self = this as TradeOffer;

    const items: {
        our: { [sku: string]: ItemsDictContent };
        their: { [sku: string]: ItemsDictContent };
    } = (self.data('dict') as ItemsDict) || { our: null, their: null };

    return 'Asked: ' + summarizeSKU(items.our) + ')\nOffered: ' + summarizeSKU(items.their);
};

function summarizeSKU(dict: { [sku: string]: ItemsDictContent }): string {
    if (dict === null) {
        return 'unknown items';
    }

    const summary: string[] = [];

    for (const sku in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
            continue;
        }
        summary.push(sku);
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    return summary.join(', ');
}
