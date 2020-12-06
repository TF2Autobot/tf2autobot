import { TradeOffer, ItemsDict, ItemsDictContent, ItemsValue } from 'steam-tradeoffer-manager';
import SchemaManager from 'tf2-schema-2';
import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';
import { Currency } from '../../../types/TeamFortress2';

export = function (schema: SchemaManager.Schema, type: string): string {
    const self = this as TradeOffer;
    const value: { our: Currency; their: Currency } = self.data('value') as ItemsValue;

    const items: {
        our: { [sku: string]: ItemsDictContent };
        their: { [sku: string]: ItemsDictContent };
    } = (self.data('dict') as ItemsDict) || { our: null, their: null };

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
            '〚' +
            summarizeItems(items.our, schema, 'our', type) +
            '〛\nOffered: ' +
            new Currencies(value.their).toString() +
            '〚' +
            summarizeItems(items.their, schema, 'their', type) +
            '〛'
        );
    }
};

function summarizeItems(
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

        const amount = dict[sku].amount;

        const name = schema.getName(SKU.fromString(sku), false);

        let oldStock = 0;
        let currentStock = 0;
        let maxStock = 0;

        if (type === 'summary') {
            currentStock = which === 'our' ? dict[sku].stock - amount : dict[sku].stock + amount;
        } else {
            currentStock = dict[sku].stock;
        }

        oldStock = dict[sku].stock;
        maxStock = dict[sku].maxStock;
        summary.push(
            `${name}${amount > 1 ? ` x${amount}` : ''}${
                type === 'review-partner' || type === 'declined'
                    ? ''
                    : ` (${type === 'summary' && oldStock !== null ? `${oldStock} → ` : ''}${currentStock}${
                          maxStock !== 0 ? `/${maxStock}` : ''
                      })`
            }`
        );
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    return summary.join(', ');
}
