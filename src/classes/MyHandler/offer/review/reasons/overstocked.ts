import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import { Meta, Overstocked } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../../Bot';

export default function overstocked(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;
    const overstockedForTheir: string[] = [];
    const overstockedForOur: string[] = [];

    (meta.reasons.filter(el => el.reason.includes('🟦_OVERSTOCKED')) as Overstocked[]).forEach(el => {
        if (opt.enable && opt.url !== '') {
            overstockedForOur.push(
                `_${bot.schema.getName(SKU.fromString(el.sku), false)}_ (can only buy ${el.amountCanTrade}, offering ${
                    el.amountOffered
                })`
            );
        } else {
            overstockedForOur.push(
                `${bot.schema.getName(SKU.fromString(el.sku), false)} (can only buy ${el.amountCanTrade}, offering ${
                    el.amountOffered
                })`
            );
        }
        overstockedForTheir.push(`${el.amountCanTrade} - ${bot.schema.getName(SKU.fromString(el.sku), false)}`);
    });

    return {
        note: bot.options.manualReview.overstocked.note
            ? `🟦_OVERSTOCKED - ${bot.options.manualReview.overstocked.note}`
                  .replace(/%itemsName%/g, overstockedForTheir.join(', '))
                  .replace(/%isOrAre%/g, pluralize('is', overstockedForTheir.length))
            : `🟦_OVERSTOCKED - I can only buy ${overstockedForTheir.join(', ')} right now.`,
        // Default note: I can only buy %itemsName% right now.
        name: overstockedForOur
    };
}
