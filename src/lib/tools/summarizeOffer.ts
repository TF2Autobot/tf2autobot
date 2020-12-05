import Currencies from 'tf2-currencies';

export default function summarize(
    trade: string,
    value: { diff: number; diffRef: number; diffKey: string },
    keyPrice: { buy: Currencies; sell: Currencies },
    isSteamChat: boolean
): string {
    const summary =
        `\n\n${isSteamChat ? 'Summary' : '__**Summary**__'}\n` +
        trade
            .replace('💭 Asked:', isSteamChat ? '• Asked:' : '💭 **Asked:**')
            .replace('✅ Offered:', isSteamChat ? '• Offered:' : '✅ **Offered:**') +
        (value.diff > 0
            ? `\n📈 ${isSteamChat ? 'Profit from overpay:' : '***Profit from overpay:***'} ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : value.diff < 0
            ? `\n📉 ${isSteamChat ? 'Loss from underpay:' : '***Loss from underpay:***'} ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : '');
    return summary;
}
