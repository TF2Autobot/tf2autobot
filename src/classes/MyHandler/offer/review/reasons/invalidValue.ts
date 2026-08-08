import Options from '../../../../Options';
import { KeyPrices } from '../../../../Pricelist';

export default function invalidValue(
    keyPrices: KeyPrices,
    options: Options,
    value: { diff: number; diffRef: number; diffKey: string }
): { note: string; missing: string } {
    const note = options.manualReview.invalidValue.note;
    return {
        note: note ? `🟥_INVALID_VALUE - ${note}` : "🟥_INVALID_VALUE - You're taking too much in value.",
        missing:
            "\n[You're missing: " +
            (value.diffRef > keyPrices.sell.metal ? `${value.diffKey}]` : `${value.diffRef} ref]`)
    };
}
