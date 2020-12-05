import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Bot from '../../../../Bot';

import { Meta, InvalidItems } from '../../../MyHandler';

export default function invalidItems(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const wrong = meta.reasons;
    const invalidForTheir: string[] = []; // Display for trade partner
    const invalidForOur: string[] = []; // Display for owner

    const invalid = wrong.filter(el => el.reason.includes('🟨_INVALID_ITEMS')) as InvalidItems[];

    invalid.forEach(el => {
        const name = bot.schema.getName(SKU.fromString(el.sku), false);
        invalidForTheir.push(name); // only show to trade partner the item name
        invalidForOur.push(`${name} - ${el.price}`); // show both item name and prices.tf price
    });

    const note = bot.options.manualReview.invalidItems.note
        ? `🟨_INVALID_ITEMS - ${bot.options.manualReview.invalidItems.note}`
              .replace(/%name%/g, invalidForTheir.join(', '))
              .replace(/%isName%/, pluralize('is', invalidForTheir.length))
        : `🟨_INVALID_ITEMS - ${invalidForTheir.join(', ')} ${pluralize(
              'is',
              invalidForTheir.length
          )} not in my pricelist.`;
    // Default note: %name% is|are not in my pricelist.

    const name = invalidForOur;

    return { note, name };
}
