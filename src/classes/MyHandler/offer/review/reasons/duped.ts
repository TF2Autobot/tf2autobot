import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import { Meta, DupedItems } from '@tf2autobot/tradeoffer-manager';
import SchemaManager from '@tf2autobot/tf2-schema';
import Options from '../../../../Options';

export default function duped(
    meta: Meta,
    schema: SchemaManager.Schema,
    options: Options
): { note: string; name: string[] } {
    const opt = options.discordWebhook.offerReview;
    const dupedItemsNameOur: string[] = [];
    const dupedItemsNameTheir: string[] = [];

    (meta.reasons.filter(el => el.reason.includes('🟫_DUPED_ITEMS')) as DupedItems[]).forEach(el => {
        const name = schema.getName(SKU.fromString(el.sku), false);

        if (opt.enable && opt.url !== '') {
            // if Discord Webhook for review offer enabled, then make it link the item name to the backpack.tf item history page.
            dupedItemsNameOur.push(`_${name}_ - [history page](https://backpack.tf/item/${el.assetid})`);
        } else {
            // else Discord Webhook for review offer disabled, make the link to backpack.tf item history page separate with name.
            dupedItemsNameOur.push(`${name} - history page: https://backpack.tf/item/${el.assetid}`);
        }
        dupedItemsNameTheir.push(`${name}, history page: https://backpack.tf/item/${el.assetid}`);
    });

    const dupedItemsNameTheirCount = dupedItemsNameTheir.length;
    const note = options.manualReview.duped.note;

    return {
        note: note
            ? `🟫_DUPED_ITEMS - ${note}`
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
