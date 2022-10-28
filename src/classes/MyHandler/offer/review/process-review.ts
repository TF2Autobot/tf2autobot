import { TradeOffer, Meta } from '@tf2autobot/tradeoffer-manager';
import * as re from './reasons/export-reasons';
import Bot from '../../../Bot';
import { ValueDiff, valueDiff } from '../../../../lib/tools/export';

export default function processReview(offer: TradeOffer, meta: Meta, bot: Bot): Content {
    const value = valueDiff(offer);
    const reasons = meta.uniqueReasons;
    const reviewReasons: string[] = [];

    const names: {
        invalidItems: string[];
        disabledItems: string[];
        overstocked: string[];
        understocked: string[];
        duped: string[];
        dupedFailed: string[];
    } = {
        invalidItems: [],
        disabledItems: [],
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

    if (reasons.includes('🟧_DISABLED_ITEMS')) {
        const disabled = re.disabledItems(meta, bot);

        reviewReasons.push(disabled.note);
        names.disabledItems = disabled.name;
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

    return {
        notes: reviewReasons,
        itemNames: {
            invalidItems: names.invalidItems,
            disabledItems: names.disabledItems,
            overstocked: names.overstocked,
            understocked: names.understocked,
            duped: names.duped,
            dupedCheckFailed: names.dupedFailed
        },
        missing: missingPureNote,
        value: value
    };
}

interface Content {
    notes: string[];
    itemNames: {
        invalidItems: string[];
        disabledItems: string[];
        overstocked: string[];
        understocked: string[];
        duped: string[];
        dupedCheckFailed: string[];
    };
    missing: string;
    value: ValueDiff;
}
