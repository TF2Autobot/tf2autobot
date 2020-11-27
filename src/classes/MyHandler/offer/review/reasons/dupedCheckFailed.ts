/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Bot from '../../../../Bot';

import { UnknownDictionary } from '../../../../../types/common';

export default function dupedCheckFailed(meta: UnknownDictionary<any>, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options;
    const wrong = meta.reasons;
    const dupedFailedItemsName: string[] = [];
    const dupedFailed = wrong.filter(el => el.reason.includes('🟪_DUPE_CHECK_FAILED'));

    dupedFailed.forEach(el => {
        if (el.withError === false) {
            // If 🟪_DUPE_CHECK_FAILED occurred without error, then this sku/assetid is string.
            const name = bot.schema.getName(SKU.fromString(el.sku), false);

            if (opt.discordWebhook.offerReview.enable && opt.discordWebhook.offerReview.url !== '') {
                // if Discord Webhook for review offer enabled, then make it link the item name to the backpack.tf item history page.
                dupedFailedItemsName.push(`${name} - [history page](https://backpack.tf/item/${el.assetid as string})`);
            } else {
                // else Discord Webhook for review offer disabled, make the link to backpack.tf item history page separate with name.
                dupedFailedItemsName.push(`${name}, history page: https://backpack.tf/item/${el.assetid as string}`);
            }
        } else {
            // Else if 🟪_DUPE_CHECK_FAILED occurred with error, then this sku/assetid is string[].
            for (let i = 0; i < el.sku.length; i++) {
                const name = bot.schema.getName(SKU.fromString(el.sku[i]), false);

                if (opt.discordWebhook.offerReview.enable && opt.discordWebhook.offerReview.url !== '') {
                    // if Discord Webhook for review offer enabled, then make it link the item name to the backpack.tf item history page.
                    dupedFailedItemsName.push(
                        `${name} - [history page](https://backpack.tf/item/${el.assetid as string})`
                    );
                } else {
                    // else Discord Webhook for review offer disabled, make the link to backpack.tf item history page separate with name.
                    dupedFailedItemsName.push(
                        `${name}, history page: https://backpack.tf/item/${el.assetid as string}`
                    );
                }
            }
        }
    });

    const note = opt.manualReview.dupedCheckFailed.note
        ? `🟪_DUPE_CHECK_FAILED - ${opt.manualReview.dupedCheckFailed.note}`
              .replace(/%name%/g, dupedFailedItemsName.join(', '))
              .replace(/%isName%/, pluralize('is', dupedFailedItemsName.length))
        : `🟪_DUPE_CHECK_FAILED - I failed to check for duped on ${dupedFailedItemsName.join(', ')}.`;
    // Default note: I failed to check for duped on %name%.

    const name = dupedFailedItemsName;

    return { note, name };
}
