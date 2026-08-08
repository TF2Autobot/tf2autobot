import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import { Meta, Overstocked } from '@tf2autobot/tradeoffer-manager';
import SchemaManager from '@tf2autobot/tf2-schema';
import Options from '../../../../Options';

export default function overstocked(
    meta: Meta,
    schema: SchemaManager.Schema,
    options: Options
): { note: string; name: string[] } {
    const opt = options.discordWebhook.offerReview;
    const overstockedForTheir: string[] = [];
    const overstockedForOur: string[] = [];

    (meta.reasons.filter(el => el.reason.includes('🟦_OVERSTOCKED')) as Overstocked[]).forEach(el => {
        const name = schema.getName(SKU.fromString(el.sku), false);

        if (opt.enable && opt.url !== '') {
            overstockedForOur.push(`_${name}_ (can only buy ${el.amountCanTrade}, offering ${el.amountOffered})`);
        } else {
            overstockedForOur.push(`${name} (can only buy ${el.amountCanTrade}, offering ${el.amountOffered})`);
        }
        overstockedForTheir.push(`${el.amountCanTrade} - ${name}`);
    });

    const note = options.manualReview.overstocked.note;

    return {
        note: note
            ? `🟦_OVERSTOCKED - ${note}`
                  .replace(/%itemsName%/g, overstockedForTheir.join(', '))
                  .replace(/%isOrAre%/g, pluralize('is', overstockedForTheir.length))
            : `🟦_OVERSTOCKED - I can only buy ${overstockedForTheir.join(', ')} right now.`,
        // Default note: I can only buy %itemsName% right now.
        name: overstockedForOur
    };
}
