/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { TradeOffer } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';

import { Currency } from '../../../types/TeamFortress2';
import { UnknownDictionary } from '../../../types/common';

import { replace } from '../../tools/export';

export = function (schema: SchemaManager.Schema, type: string): string {
    const self = this as TradeOffer;

    const value: { our: Currency; their: Currency } = self.data('value');

    const items: {
        our: UnknownDictionary<any>;
        their: UnknownDictionary<any>;
    } = self.data('dict') || { our: null, their: null };

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
    dict: UnknownDictionary<any>,
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

        const isDefined = (dict[sku]['amount'] as number) !== undefined;

        const amount = isDefined ? (dict[sku]['amount'] as number) : (dict[sku] as number);

        const name = replace.itemName(schema.getName(SKU.fromString(sku), false));

        let oldStock = 0;
        let currentStock = 0;
        let maxStock = 0;

        if (type === 'summary') {
            currentStock =
                which === 'our'
                    ? (isDefined ? (dict[sku]['stock'] as number) : (dict[sku] as number)) - amount
                    : (isDefined ? (dict[sku]['stock'] as number) : (dict[sku] as number)) + amount;
        } else {
            currentStock = isDefined ? (dict[sku]['stock'] as number) : (dict[sku] as number);
        }

        oldStock = dict[sku]['stock'] as number;
        maxStock = isDefined ? (dict[sku]['maxStock'] as number) : 0;
        summary.push(
            `[${name}](https://www.prices.tf/items/'${sku})${amount > 1 ? ` x${amount}` : ''} (${
                type === 'summary' ? `${oldStock} → ` : ''
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
