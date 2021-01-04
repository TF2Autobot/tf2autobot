import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Bot from '../../../../Bot';

import { Meta, InvalidItems } from 'steam-tradeoffer-manager';

export default function invalidItems(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;
    const wrong = meta.reasons;
    const invalidForTheir: string[] = []; // Display for trade partner
    const invalidForOur: string[] = []; // Display for owner

    const invalid = wrong.filter(el => el.reason.includes('🟨_INVALID_ITEMS')) as InvalidItems[];

    invalid.forEach(el => {
        const name = bot.schema.getName(SKU.fromString(el.sku), false);
        if (opt.enable && opt.url !== '') {
            invalidForOur.push(`_${name}_ - ${el.price}`); // show both item name and prices.tf price
        } else {
            invalidForOur.push(`${name} - ${el.price}`); // show both item name and prices.tf price
        }
        invalidForTheir.push(name); // only show to trade partner the item name
    });

    const note = bot.options.manualReview.invalidItems.note
        ? `🟨_INVALID_ITEMS - ${bot.options.manualReview.invalidItems.note}`
              .replace(/%itemsName%/g, invalidForTheir.join(', '))
              .replace(/%isOrAre%/g, pluralize('is', invalidForTheir.length))
        : `🟨_INVALID_ITEMS - ${invalidForTheir.join(', ')} ${pluralize(
              'is',
              invalidForTheir.length
          )} not in my pricelist.`;
    // Default note: %itemsName% %isOrAre% not in my pricelist.

    const name = invalidForOur;

    return { note, name };
}
