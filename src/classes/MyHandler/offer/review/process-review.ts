import { TradeOffer } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import { UnknownDictionary } from '../../../../types/common';

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
    meta: UnknownDictionary<any>,
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

    const reasons = meta.uniqueReasons;

    const reviewReasons: string[] = [];

    let invalidForOur: string[] = []; // Display for owner
    if (reasons.includes('🟨_INVALID_ITEMS')) {
        const invalid = invalidItems(meta, bot);

        reviewReasons.push(invalid.note);
        invalidForOur = invalid.name;
    }

    let overstockedForOur: string[] = [];
    if (reasons.includes('🟦_OVERSTOCKED')) {
        const overstock = overstocked(meta, bot);

        reviewReasons.push(overstock.note);
        overstockedForOur = overstock.name;
    }

    let understockedForOur: string[] = [];
    if (reasons.includes('🟩_UNDERSTOCKED')) {
        const understock = understocked(meta, bot);

        reviewReasons.push(understock.note);
        understockedForOur = understock.name;
    }

    let dupedItemsName: string[] = [];
    if (reasons.includes('🟫_DUPED_ITEMS')) {
        const dupe = duped(meta, bot);

        reviewReasons.push(dupe.note);
        dupedItemsName = dupe.name;
    }

    // for 🟪_DUPE_CHECK_FAILED
    let dupedFailedItemsName: string[] = [];
    if (reasons.includes('🟪_DUPE_CHECK_FAILED')) {
        const dupeFail = dupedCheckFailed(meta, bot);

        reviewReasons.push(dupeFail.note);
        dupedFailedItemsName = dupeFail.name;
    }

    let missingPureNote = '';
    if (reasons.includes('🟥_INVALID_VALUE') && !reasons.includes('🟨_INVALID_ITEMS')) {
        const invalidV = invalidValue(bot, value);

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
