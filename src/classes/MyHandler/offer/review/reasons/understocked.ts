import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import { Meta, Understocked } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../../Bot';

export default function understocked(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;
    const understockedForTheir: string[] = [];
    const understockedForOur: string[] = [];

    (meta.reasons.filter(el => el.reason.includes('🟩_UNDERSTOCKED')) as Understocked[]).forEach(el => {
        const name = bot.schema.getName(SKU.fromString(el.sku), false);

        if (opt.enable && opt.url !== '') {
            understockedForOur.push(`_${name}_ (can only sell ${el.amountCanTrade}, taking ${el.amountTaking})`);
        } else {
            understockedForOur.push(`${name} (can only sell ${el.amountCanTrade}, taking ${el.amountTaking})`);
        }
        understockedForTheir.push(`${el.amountCanTrade} - ${name}`);
    });

    const note = bot.options.manualReview.understocked.note;

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
