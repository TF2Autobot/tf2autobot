import { TradeOffer } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import { Meta } from 'steam-tradeoffer-manager';

import Bot from '../../../Bot';
import * as re from './reasons/export-reasons';

import { valueDiff } from '../../../../lib/tools/export';

export default function processReview(
    offer: TradeOffer,
    meta: Meta,
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

    const names: {
        invalidItems: string[];
        overstocked: string[];
        understocked: string[];
        duped: string[];
        dupedFailed: string[];
    } = {
        invalidItems: [],
        overstocked: [],
        understocked: [],
        duped: [],
        dupedFailed: []
    };

    if (reasons.includes('🟨_INVALID_ITEMS')) {
        const invalid = re.invalidItems(meta, bot);

        reviewReasons.push(invalid.note);
        names.invalidItems = invalid.name;
    }

    if (reasons.includes('🟦_OVERSTOCKED')) {
        const overstock = re.overstocked(meta, bot);

        reviewReasons.push(overstock.note);
        names.overstocked = overstock.name;
    }

    if (reasons.includes('🟩_UNDERSTOCKED')) {
        const understock = re.understocked(meta, bot);

        reviewReasons.push(understock.note);
        names.understocked = understock.name;
    }

    if (reasons.includes('🟫_DUPED_ITEMS')) {
        const dupe = re.duped(meta, bot);

        reviewReasons.push(dupe.note);
        names.duped = dupe.name;
    }

    // for 🟪_DUPE_CHECK_FAILED
    if (reasons.includes('🟪_DUPE_CHECK_FAILED')) {
        const dupeFail = re.dupedCheckFailed(meta, bot);

        reviewReasons.push(dupeFail.note);
        names.dupedFailed = dupeFail.name;
    }

    let missingPureNote = '';
    if (reasons.includes('🟥_INVALID_VALUE') && !reasons.includes('🟨_INVALID_ITEMS')) {
        const invalidV = re.invalidValue(bot, value);

        reviewReasons.push(invalidV.note);
        missingPureNote = invalidV.missing;
    }

    const notes = reviewReasons;
    const itemNames = {
        invalidItems: names.invalidItems,
        overstocked: names.overstocked,
        understocked: names.understocked,
        duped: names.duped,
        dupedCheckFailed: names.dupedFailed
    };
    const missing = missingPureNote;

    return { notes, itemNames, missing, value, keyPrices };
}
