import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import { Meta, DupedItems } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../../Bot';

export default function duped(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;
    const dupedItemsNameOur: string[] = [];
    const dupedItemsNameTheir: string[] = [];

    (meta.reasons.filter(el => el.reason.includes('🟫_DUPED_ITEMS')) as DupedItems[]).forEach(el => {
        if (opt.enable && opt.url !== '') {
            // if Discord Webhook for review offer enabled, then make it link the item name to the backpack.tf item history page.
            dupedItemsNameOur.push(
                `_${bot.schema.getName(SKU.fromString(el.sku), false)}_ - [history page](https://backpack.tf/item/${
                    el.assetid
                })`
            );
        } else {
            // else Discord Webhook for review offer disabled, make the link to backpack.tf item history page separate with name.
            dupedItemsNameOur.push(
                `${bot.schema.getName(SKU.fromString(el.sku), false)} - history page: https://backpack.tf/item/${
                    el.assetid
                }`
            );
        }
        dupedItemsNameTheir.push(
            `${bot.schema.getName(SKU.fromString(el.sku), false)}, history page: https://backpack.tf/item/${el.assetid}`
        );
    });

    const dupedItemsNameTheirCount = dupedItemsNameTheir.length;

    return {
        note: bot.options.manualReview.duped.note
            ? `🟫_DUPED_ITEMS - ${bot.options.manualReview.duped.note}`
                  .replace(/%itemsName%/g, dupedItemsNameTheir.join(', '))
                  .replace(/%isOrAre%/g, pluralize('is', dupedItemsNameTheirCount))
            : `🟫_DUPED_ITEMS - ${dupedItemsNameTheir.join(', ')} ${pluralize(
                  'is',
                  dupedItemsNameTheirCount
              )} appeared to be duped.`,
        // Default note: %itemsName% is|are appeared to be duped.
        name: dupedItemsNameOur
    };
}
