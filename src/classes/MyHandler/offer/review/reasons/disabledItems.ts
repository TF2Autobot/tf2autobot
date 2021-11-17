import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import { Meta, DisabledItems } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../../Bot';

export default function disabledItems(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;
    const disabledForTheir: string[] = []; // Display for trade partner
    const disabledForOur: string[] = []; // Display for owner

    (meta.reasons.filter(el => el.reason.includes('🟧_DISABLED_ITEMS')) as DisabledItems[]).forEach(el => {
        const name = bot.schema.getName(SKU.fromString(el.sku));

        if (opt.enable && opt.url !== '') {
            disabledForOur.push(`_${name}_`);
        } else {
            disabledForOur.push(`${name}`);
        }

        // only show to trade partner the item name
        disabledForTheir.push(name);
    });

    const disabledForTheirCount = disabledForTheir.length;
    const note = bot.options.manualReview.disabledItems.note;

    return {
        note: note
            ? `🟧_DISABLED_ITEMS - ${note}`
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
