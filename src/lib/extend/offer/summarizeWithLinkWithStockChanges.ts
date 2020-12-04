import { TradeOffer } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';

import { Currency } from '../../../types/TeamFortress2';

import { ItemsDict, ItemsDictContent } from '../../../classes/MyHandler/interfaces';

import { replace } from '../../tools/export';

export = function (schema: SchemaManager.Schema, type: string): string {
    const self = this as TradeOffer;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value: { our: Currency; their: Currency } = self.data('value');

    const items: {
        our: { [sku: string]: ItemsDictContent };
        their: { [sku: string]: ItemsDictContent };
    } = (self.data('dict') as ItemsDict) || { our: null, their: null };

    if (!value) {
        return (
            'Asked: ' +
            summarizeItemsWithLink(items.our, schema, 'our', type) +
            '\nOffered: ' +
            summarizeItemsWithLink(items.their, schema, 'their', type)
        );
    } else {
        return (
            'Asked: ' +
            new Currencies(value.our).toString() +
            '〚' +
            summarizeItemsWithLink(items.our, schema, 'our', type) +
            '〛\nOffered: ' +
            new Currencies(value.their).toString() +
            '〚' +
            summarizeItemsWithLink(items.their, schema, 'their', type) +
            '〛'
        );
    }
};

function summarizeItemsWithLink(
    dict: { [sku: string]: ItemsDictContent },
    schema: SchemaManager.Schema,
    which: string,
    type: string
): string {
    if (dict === null) {
        return 'unknown items';
    }

    const summary: string[] = [];

    for (const sku in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
            continue;
        }

        const amount = dict[sku]['amount'];

        const generateName = schema.getName(SKU.fromString(sku), false);
        const name = replace.itemName(generateName ? generateName : 'unknown');

        let oldStock = 0;
        let currentStock = 0;
        let maxStock = 0;

        if (type === 'summary') {
            currentStock = which === 'our' ? dict[sku]['stock'] - amount : dict[sku]['stock'] + amount;
        } else {
            currentStock = dict[sku]['stock'];
        }

        oldStock = dict[sku]['stock'];
        maxStock = dict[sku]['maxStock'];
        summary.push(
            `[${name}](https://www.prices.tf/items/${sku})${amount > 1 ? ` x${amount}` : ''} (${
                type === 'summary' && oldStock !== null ? `${oldStock} → ` : ''
            }${currentStock}${maxStock !== 0 ? `/${maxStock}` : ''})`
        );
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    let left = 0;

    if (summary.length > 15) {
        left = summary.length - 15;
        summary.splice(15);
    }

    return summary.join(', ') + (left !== 0 ? ` and ${left}` + ' more items.' : '');
}
