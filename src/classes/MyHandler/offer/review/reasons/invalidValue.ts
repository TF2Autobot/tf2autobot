import Bot from '../../../../Bot';

export default function invalidValue(
    bot: Bot,
    value: { diff: number; diffRef: number; diffKey: string }
): { note: string; missing: string } {
    const keyPrices = bot.pricelist.getKeyPrices;

    return {
        note: bot.options.manualReview.invalidValue.note
            ? `🟥_INVALID_VALUE - ${bot.options.manualReview.invalidValue.note}`
            : "🟥_INVALID_VALUE - You're taking too much in value.",
        missing:
            "\n[You're missing: " +
            (value.diffRef > keyPrices.sell.metal ? `${value.diffKey}]` : `${value.diffRef} ref]`)
    };
}
