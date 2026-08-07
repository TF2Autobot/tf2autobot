import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import { Meta, DupeCheckFailed } from '@tf2autobot/tradeoffer-manager';
import SchemaManager from '@tf2autobot/tf2-schema';
import Options from '../../../../Options';

export default function dupedCheckFailed(
    meta: Meta,
    schema: SchemaManager.Schema,
    options: Options
): { note: string; name: string[] } {
    const opt = options.discordWebhook.offerReview;
    const dupedFailedItemsNameOur: string[] = [];
    const dupedFailedItemsNameTheir: string[] = [];

    (meta.reasons.filter(el => el.reason.includes('🟪_DUPE_CHECK_FAILED')) as DupeCheckFailed[]).forEach(el => {
        if (el.withError === false) {
            // If 🟪_DUPE_CHECK_FAILED occurred without error, then this sku/assetid is string.

            const name = schema.getName(SKU.fromString(el.sku as string), false);

            if (opt.enable && opt.url !== '') {
                // if Discord Webhook for review offer enabled, then make it link the item name to the backpack.tf item history page.
                dupedFailedItemsNameOur.push(
                    `_${name}_ - [history page](https://backpack.tf/item/${el.assetid as string})`
                );
            } else {
                // else Discord Webhook for review offer disabled, make the link to backpack.tf item history page separate with name.
                dupedFailedItemsNameOur.push(`${name}, history page: https://backpack.tf/item/${el.assetid as string}`);
            }
            dupedFailedItemsNameTheir.push(`${name}, history page: https://backpack.tf/item/${el.assetid as string}`);
        } else {
            // Else if 🟪_DUPE_CHECK_FAILED occurred with error, then this sku/assetid is string[].
            for (let i = 0; i < el.sku.length; i++) {
                const name = schema.getName(SKU.fromString(el.sku[i]), false);

                if (opt.enable && opt.url !== '') {
                    // if Discord Webhook for review offer enabled, then make it link the item name to the backpack.tf item history page.
                    dupedFailedItemsNameOur.push(
                        `_${name}_ - [history page](https://backpack.tf/item/${el.assetid[i]})`
                    );
                } else {
                    // else Discord Webhook for review offer disabled, make the link to backpack.tf item history page separate with name.
                    dupedFailedItemsNameOur.push(`${name}, history page: https://backpack.tf/item/${el.assetid[i]}`);
                }
                dupedFailedItemsNameTheir.push(`${name}, history page: https://backpack.tf/item/${el.assetid[i]}`);
            }
        }
    });

    const note = options.manualReview.dupedCheckFailed.note;

    return {
        note: note
            ? `🟪_DUPE_CHECK_FAILED - ${note}`
                  .replace(/%itemsName%/g, dupedFailedItemsNameTheir.join(', '))
                  .replace(/%isOrAre%/g, pluralize('is', dupedFailedItemsNameTheir.length))
            : `🟪_DUPE_CHECK_FAILED - I failed to check for duped on ${dupedFailedItemsNameTheir.join(', ')}.`,
        // Default note: I failed to check for duped on %itemsName%.
        name: dupedFailedItemsNameOur
    };
}
