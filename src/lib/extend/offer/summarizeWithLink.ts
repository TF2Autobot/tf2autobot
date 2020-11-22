import { TradeOffer } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';

import { Currency } from '../../../types/TeamFortress2';
import { UnknownDictionary } from '../../../types/common';

import { replace } from '../../tools/export';

export = function(schema: SchemaManager.Schema): string {
    // @ts-ignore
    const self = this as TradeOffer;

    const value: { our: Currency; their: Currency } = self.data('value');

    const items: {
        our: UnknownDictionary<number>;
        their: UnknownDictionary<number>;
    } = self.data('dict') || { our: null, their: null };

    if (!value) {
        return (
            'Asked: ' +
            summarizeItemsWithLink(items.our, schema) +
            '\nOffered: ' +
            summarizeItemsWithLink(items.their, schema)
        );
    } else {
        return (
            'Asked: ' +
            new Currencies(value.our).toString() +
            ' (' +
            summarizeItemsWithLink(items.our, schema) +
            ')\nOffered: ' +
            new Currencies(value.their).toString() +
            ' (' +
            summarizeItemsWithLink(items.their, schema) +
            ')'
        );
    }
};

function summarizeItemsWithLink(dict: UnknownDictionary<number>, schema: SchemaManager.Schema): string {
    if (dict === null) {
        return 'unknown items';
    }

    const summary: string[] = [];

    for (const sku in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
            continue;
        }

        const amount = dict[sku];
        const name = replace.itemName(schema.getName(SKU.fromString(sku), false));

        summary.push('[' + name + '](https://www.prices.tf/items/' + sku + ')' + (amount > 1 ? ' x' + amount : ''));
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    let left = 0;

    if (summary.length > 15) {
        left = summary.length - 15;
        summary.splice(15);
    }

    return summary.join(', ') + (left !== 0 ? ' and ' + left + ' more items.' : '');
}
