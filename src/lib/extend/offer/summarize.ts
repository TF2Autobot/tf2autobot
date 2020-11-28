/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { TradeOffer } from 'steam-tradeoffer-manager';
import SchemaManager from 'tf2-schema-2';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';

import { Currency } from '../../../types/TeamFortress2';
import { UnknownDictionary } from '../../../types/common';

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
            summarizeItems(items.our, schema, 'our', type) +
            '\nOffered: ' +
            summarizeItems(items.their, schema, 'their', type)
        );
    } else {
        return (
            'Asked: ' +
            new Currencies(value.our).toString() +
            ' [' +
            summarizeItems(items.our, schema, 'our', type) +
            ']\nOffered: ' +
            new Currencies(value.their).toString() +
            ' [' +
            summarizeItems(items.their, schema, 'their', type) +
            ']'
        );
    }
};

function summarizeItems(
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

        const name = schema.getName(SKU.fromString(sku), false);

        let stock = 0;
        let maxStock = 0;

        if (type === 'summary') {
            stock =
                which === 'our'
                    ? (isDefined ? (dict[sku]['stock'] as number) : (dict[sku] as number)) - amount
                    : (isDefined ? (dict[sku]['stock'] as number) : (dict[sku] as number)) + amount;
        } else {
            stock = isDefined ? (dict[sku]['stock'] as number) : (dict[sku] as number);
        }

        maxStock = isDefined ? (dict[sku]['maxStock'] as number) : 0;
        summary.push(
            `${name}${amount > 1 ? ` x${amount}` : ''}${
                type === 'review-partner' || type === 'declined'
                    ? ''
                    : ` (${stock}${maxStock !== 0 ? `/${maxStock}` : ''})`
            }`
        );
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    return summary.join(', ');
}
