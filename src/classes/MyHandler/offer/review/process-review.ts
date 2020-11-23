import { TradeOffer } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';

import Bot from '../../../Bot';
import {
    invalidItems,
    overstocked,
    understocked,
    duped,
    dupedCheckFailed,
    invalidValue
} from './reasons/export-reasons';

import { valueDiff } from '../../../../lib/tools/export';

export default function processReview(
    offer: TradeOffer,
    reasons: any,
    wrong: any,
    bot: Bot,
    isTradingKeys: boolean
): {
    notes: string[];
    itemNames: {
        invalidItems: string[];
        overstocked: string[];
        understocked: string[];
        duped: string[];
        dupedCheckFailed: string[];
    };
    missing: string;
    value: { diff: number; diffRef: number; diffKey: string };
    keyPrices: { buy: Currencies; sell: Currencies };
} {
    const keyPrices = bot.pricelist.getKeyPrices();
    const value = valueDiff(offer, keyPrices, isTradingKeys, bot.options.showOnlyMetal);

    const reviewReasons: string[] = [];

    const invalidForOur: string[] = []; // Display for owner
    if (reasons.includes('🟨_INVALID_ITEMS')) {
        const invalid = invalidItems(wrong, bot);

        reviewReasons.push(invalid.note);
        invalidForOur.concat(invalid.name);
    }

    const overstockedForOur: string[] = [];
    if (reasons.includes('🟦_OVERSTOCKED')) {
        const overstock = overstocked(wrong, bot);

        reviewReasons.push(overstock.note);
        overstockedForOur.concat(overstock.name);
    }

    const understockedForOur: string[] = [];
    if (reasons.includes('🟩_UNDERSTOCKED')) {
        const understock = understocked(wrong, bot);

        reviewReasons.push(understock.note);
        understockedForOur.concat(understock.name);
    }

    const dupedItemsName: string[] = [];
    if (reasons.includes('🟫_DUPED_ITEMS')) {
        const dupe = duped(wrong, bot);

        reviewReasons.push(dupe.note);
        dupedItemsName.concat(dupe.name);
    }

    // for 🟪_DUPE_CHECK_FAILED
    const dupedFailedItemsName: string[] = [];
    if (reasons.includes('🟪_DUPE_CHECK_FAILED')) {
        const dupeFail = dupedCheckFailed(wrong, bot);

        reviewReasons.push(dupeFail.note);
        dupedFailedItemsName.concat(dupeFail.name);
    }

    let missingPureNote = '';
    if (reasons.includes('🟥_INVALID_VALUE') && !reasons.includes('🟨_INVALID_ITEMS')) {
        const invalidV = invalidValue(offer, bot, isTradingKeys, value);

        reviewReasons.push(invalidV.note);
        missingPureNote = invalidV.missing;
    }

    const notes = reviewReasons;
    const itemNames = {
        invalidItems: invalidForOur,
        overstocked: overstockedForOur,
        understocked: understockedForOur,
        duped: dupedItemsName,
        dupedCheckFailed: dupedFailedItemsName
    };
    const missing = missingPureNote;

    return { notes, itemNames, missing, value, keyPrices };
}
