import { TradeOffer } from 'steam-tradeoffer-manager';
import { Currency } from '../../../types/TeamFortress2';
import { UnknownDictionary } from '../../../types/common';
import SchemaManager from 'tf2-schema';

import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku';

export = function(schema: SchemaManager.Schema): string {
    // @ts-ignore
    const self = this as TradeOffer;
    // @ts-ignore

    const value: { our: Currency; their: Currency } = self.data('value');

    const items: {
        our: UnknownDictionary<number>;
        their: UnknownDictionary<number>;
    } = self.data('dict') || { our: null, their: null };

    if (!value) {
        return 'Asked: ' + summarizeItems(items.our, schema) + '\nOffered: ' + summarizeItems(items.their, schema);
    } else {
        return (
            'Asked: ' +
            new Currencies(value.our).toString() +
            ' (' +
            summarizeItems(items.our, schema) +
            ')\nOffered: ' +
            new Currencies(value.their).toString() +
            ' (' +
            summarizeItems(items.their, schema) +
            ')'
        );
    }
};

function summarizeItems(dict: UnknownDictionary<number>, schema: SchemaManager.Schema): string {
    if (dict === null) {
        return 'unknown items';
    }

    const summary: string[] = [];

    for (const sku in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
            continue;
        }

        const amount = dict[sku];
        const name = schema.getName(SKU.fromString(sku), false);

        summary.push(name + (amount > 1 ? ' x' + amount : ''));
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    return summary.join(', ');
}
