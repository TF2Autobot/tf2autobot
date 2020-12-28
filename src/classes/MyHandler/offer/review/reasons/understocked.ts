import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Bot from '../../../../Bot';

import { Meta, Understocked } from 'steam-tradeoffer-manager';

export default function understocked(meta: Meta, bot: Bot): { note: string; name: string[] } {
    const opt = bot.options.discordWebhook.offerReview;
    const wrong = meta.reasons;
    const understockedForTheir: string[] = [];
    const understockedForOur: string[] = [];

    const understocked = wrong.filter(el => el.reason.includes('🟩_UNDERSTOCKED')) as Understocked[];

    understocked.forEach(el => {
        const name = bot.schema.getName(SKU.fromString(el.sku), false);
        if (opt.enable && opt.url !== '') {
            understockedForOur.push(`_${name}_ (can only sell ${el.amountCanTrade})`);
        } else {
            understockedForOur.push(`${name} (can only sell ${el.amountCanTrade})`);
        }
        understockedForTheir.push(`${el.amountCanTrade} - ${name}`);
    });

    const note = bot.options.manualReview.understocked.note
        ? `🟩_UNDERSTOCKED - ${bot.options.manualReview.understocked.note}`
              .replace(/%itemsName%/g, understockedForTheir.join(', ')) // %name% here will include amountCanTrade value
              .replace(/%isOrAre%/, pluralize('is', understockedForTheir.length))
        : `🟩_UNDERSTOCKED - I can only sell ${understockedForTheir.join(', ')} right now.`;
    // Default note: I can only sell %amountCanTrade% - %itemsName% right now.

    const name = understockedForOur;

    return { note, name };
}
