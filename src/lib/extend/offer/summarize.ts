// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { TradeOffer } from 'steam-tradeoffer-manager';
import { Currency } from '../../../types/TeamFortress2';
import SchemaManager from 'tf2-schema-2';

import { ItemsDict, ItemsDictContent } from '../../../classes/MyHandler/interfaces';

import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';

export = function (schema: SchemaManager.Schema): string {
    const self = this as TradeOffer;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value: { our: Currency; their: Currency } = self.data('value');

    const items: {
        our: { [sku: string]: ItemsDictContent };
        their: { [sku: string]: ItemsDictContent };
    } = (self.data('dict') as ItemsDict) || { our: null, their: null };

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

function summarizeItems(dict: { [sku: string]: ItemsDictContent }, schema: SchemaManager.Schema): string {
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

        summary.push(name + (amount > 1 ? ` x${amount}` : ''));
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    return summary.join(', ');
}
