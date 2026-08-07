import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import { Meta, Understocked } from '@tf2autobot/tradeoffer-manager';
import SchemaManager from '@tf2autobot/tf2-schema';
import Options from '../../../../Options';

export default function understocked(
    meta: Meta,
    schema: SchemaManager.Schema,
    options: Options
): { note: string; name: string[] } {
    const opt = options.discordWebhook.offerReview;
    const understockedForTheir: string[] = [];
    const understockedForOur: string[] = [];

    (meta.reasons.filter(el => el.reason.includes('🟩_UNDERSTOCKED')) as Understocked[]).forEach(el => {
        const name = schema.getName(SKU.fromString(el.sku), false);

        if (opt.enable && opt.url !== '') {
            understockedForOur.push(`_${name}_ (can only sell ${el.amountCanTrade}, taking ${el.amountTaking})`);
        } else {
            understockedForOur.push(`${name} (can only sell ${el.amountCanTrade}, taking ${el.amountTaking})`);
        }
        understockedForTheir.push(`${el.amountCanTrade} - ${name}`);
    });

    const note = options.manualReview.understocked.note;

    return {
        note: note
            ? `🟩_UNDERSTOCKED - ${note}`
                  .replace(/%itemsName%/g, understockedForTheir.join(', '))
                  .replace(/%isOrAre%/, pluralize('is', understockedForTheir.length))
            : `🟩_UNDERSTOCKED - I can only sell ${understockedForTheir.join(', ')} right now.`,
        // Default note: I can only sell %amountCanTrade% - %itemsName% right now.
        name: understockedForOur
    };
}
