/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Bot from '../../../../Bot';

import { UnknownDictionary } from '../../../../../types/common';

export default function overstocked(meta: UnknownDictionary<any>, bot: Bot): { note: string; name: string[] } {
    const wrong = meta.reasons;
    const overstockedForTheir: string[] = [];
    const overstockedForOur: string[] = [];

    const overstock = wrong.filter(el => el.reason.includes('🟦_OVERSTOCKED'));

    overstock.forEach(el => {
        const name = bot.schema.getName(SKU.fromString(el.sku), false);
        overstockedForTheir.push(`${el.amountCanTrade as number} - ${name}`);
        overstockedForOur.push(`${name} (can only buy ${el.amountCanTrade as number})`);
    });

    const note = bot.options.manualReview.overstocked.note
        ? `🟦_OVERSTOCKED - ${bot.options.manualReview.overstocked.note}`
              .replace(/%name%/g, overstockedForTheir.join(', ')) // %name% here will include amountCanTrade value
              .replace(/%isName%/, pluralize('is', overstockedForTheir.length))
        : `🟦_OVERSTOCKED - I can only buy ${overstockedForTheir.join(', ')} right now.`;
    // Default note: I can only buy %amountCanTrade% - %name% right now.

    const name = overstockedForOur;

    return { note, name };
}
