import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import { Meta, InvalidItems } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../../Bot';
import { testPriceKey } from '../../../../../lib/tools/export';

export default function invalidItems(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;
    const invalidForTheir: string[] = []; // Display for trade partner
    const invalidForOur: string[] = []; // Display for owner

    (meta.reasons.filter(el => el.reason.includes('🟨_INVALID_ITEMS')) as InvalidItems[]).forEach(el => {
        const name = testPriceKey(el.sku) ? bot.schema.getName(SKU.fromString(el.sku), false) : el.sku;

        if (opt.enable && opt.url !== '') {
            // show both item name and pricer price
            invalidForOur.push(`_${name}_ - ${el.price}`);
        } else {
            // show both item name and pricer price
            invalidForOur.push(`${name} - ${el.price}`);
        }

        // only show to trade partner the item name
        invalidForTheir.push(name);
    });

    const invalidForTheirCount = invalidForTheir.length;
    const note = bot.options.manualReview.invalidItems.note;

    return {
        note: note
            ? `🟨_INVALID_ITEMS - ${note}`
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
