import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import { Meta, InvalidItems } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../../Bot';

export default function invalidItems(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;
    const invalidForTheir: string[] = []; // Display for trade partner
    const invalidForOur: string[] = []; // Display for owner

    (meta.reasons.filter(el => el.reason.includes('🟨_INVALID_ITEMS')) as InvalidItems[]).forEach(el => {
        if (opt.enable && opt.url !== '') {
            // show both item name and prices.tf price
            invalidForOur.push(`_${bot.schema.getName(SKU.fromString(el.sku), false)}_ - ${el.price}`);
        } else {
            // show both item name and prices.tf price
            invalidForOur.push(`${bot.schema.getName(SKU.fromString(el.sku), false)} - ${el.price}`);
        }

        // only show to trade partner the item name
        invalidForTheir.push(bot.schema.getName(SKU.fromString(el.sku), false));
    });

    const invalidForTheirCount = invalidForTheir.length;

    return {
        note: bot.options.manualReview.invalidItems.note
            ? `🟨_INVALID_ITEMS - ${bot.options.manualReview.invalidItems.note}`
                  .replace(/%itemsName%/g, invalidForTheir.join(', '))
                  .replace(/%isOrAre%/g, pluralize('is', invalidForTheirCount))
            : `🟨_INVALID_ITEMS - ${invalidForTheir.join(', ')} ${pluralize(
                  'is',
                  invalidForTheirCount
              )} not in my pricelist.`,
        // Default note: %itemsName% %isOrAre% not in my pricelist.
        name: invalidForOur
    };
}
