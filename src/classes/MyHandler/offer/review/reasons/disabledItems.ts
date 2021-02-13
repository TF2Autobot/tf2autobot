import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import { Meta, DisabledItems } from 'steam-tradeoffer-manager';
import Bot from '../../../../Bot';

export default function disabledItems(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;
    const disabledForTheir: string[] = []; // Display for trade partner
    const disabledForOur: string[] = []; // Display for owner

    (meta.reasons.filter(el => el.reason.includes('🟧_DISABLED_ITEMS')) as DisabledItems[]).forEach(el => {
        if (opt.enable && opt.url !== '') {
            // show both item name and prices.tf price
            disabledForOur.push(`_${bot.schema.getName(SKU.fromString(el.sku), false)}_`);
        } else {
            // show both item name and prices.tf price
            disabledForOur.push(`${bot.schema.getName(SKU.fromString(el.sku), false)}`);
        }

        // only show to trade partner the item name
        disabledForTheir.push(bot.schema.getName(SKU.fromString(el.sku), false));
    });

    const disabledForTheirCount = disabledForTheir.length;

    return {
        note: bot.options.manualReview.disabledItems.note
            ? `🟧_DISABLED_ITEMS - ${bot.options.manualReview.disabledItems.note}`
                  .replace(/%itemsName%/g, disabledForTheir.join(', '))
                  .replace(/%isOrAre%/g, pluralize('is', disabledForTheirCount))
            : `🟧_DISABLED_ITEMS - ${disabledForTheir.join(', ')} ${pluralize(
                  'is',
                  disabledForTheirCount
              )} currently disabled.`,
        // Default note: %itemsName% %isOrAre% currently disabled.
        name: disabledForOur
    };
}
