import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Bot from '../../../../Bot';

import { Meta, Overstocked } from 'steam-tradeoffer-manager';

export default function overstocked(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;

    const wrong = meta.reasons;
    const overstockedForTheir: string[] = [];
    const overstockedForOur: string[] = [];

    const overstock = wrong.filter(el => el.reason.includes('🟦_OVERSTOCKED')) as Overstocked[];

    overstock.forEach(el => {
        const name = bot.schema.getName(SKU.fromString(el.sku), false);
        if (opt.enable && opt.url !== '') {
            overstockedForOur.push(`_${name}_ (can only buy ${el.amountCanTrade})`);
        } else {
            overstockedForOur.push(`${name} (can only buy ${el.amountCanTrade})`);
        }
        overstockedForTheir.push(`${el.amountCanTrade} - ${name}`);
    });

    const note = bot.options.manualReview.overstocked.note
        ? `🟦_OVERSTOCKED - ${bot.options.manualReview.overstocked.note}`
              .replace(/%itemsName%/g, overstockedForTheir.join(', '))
              .replace(/%isOrAre%/g, pluralize('is', overstockedForTheir.length))
        : `🟦_OVERSTOCKED - I can only buy ${overstockedForTheir.join(', ')} right now.`;
    // Default note: I can only buy %itemsName% right now.

    const name = overstockedForOur;

    return { note, name };
}
