/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Bot from '../../../../Bot';

import { UnknownDictionary } from '../../../../../types/common';

export default function understocked(meta: UnknownDictionary<any>, bot: Bot): { note: string; name: string[] } {
    const wrong = meta.reasons;
    const understockedForTheir: string[] = [];
    const understockedForOur: string[] = [];

    const understocked = wrong.filter(el => el.reason.includes('🟩_UNDERSTOCKED'));

    understocked.forEach(el => {
        const name = bot.schema.getName(SKU.fromString(el.sku), false);
        understockedForTheir.push(`${el.amountCanTrade as number} - ${name}`);
        understockedForOur.push(`${name} (can only sell ${el.amountCanTrade as number})`);
    });

    const note = bot.options.manualReview.understocked.note
        ? `🟩_UNDERSTOCKED - ${bot.options.manualReview.understocked.note}`
              .replace(/%name%/g, understockedForTheir.join(', ')) // %name% here will include amountCanTrade value
              .replace(/%isName%/, pluralize('is', understockedForTheir.length))
        : `🟩_UNDERSTOCKED - I can only sell ${understockedForTheir.join(', ')} right now.`;
    // Default note: I can only sell %amountCanTrade% - %name% right now.

    const name = understockedForOur;

    return { note, name };
}
