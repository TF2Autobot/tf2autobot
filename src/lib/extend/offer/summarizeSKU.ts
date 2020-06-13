import { TradeOffer } from 'steam-tradeoffer-manager';
import { UnknownDictionary } from '../../../types/common';

export = function(): string {
    // @ts-ignore
    const self = this as TradeOffer;

    const items: {
        our: UnknownDictionary<number>;
        their: UnknownDictionary<number>;
    } = self.data('dict') || { our: null, their: null };

    return 'Asked: ' + summarizeSKU(items.our) + ')\nOffered: ' + summarizeSKU(items.their);
};

function summarizeSKU(dict: UnknownDictionary<number>): string {
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
