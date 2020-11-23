import { TradeOffer } from 'steam-tradeoffer-manager';

export default function itemList(offer: TradeOffer): { their: string[]; our: string[] } {
    const items: { our: {}; their: {} } = offer.data('dict');
    const their: string[] = [];
    for (const theirItemsSku in items.their) {
        if (!Object.prototype.hasOwnProperty.call(items.their, theirItemsSku)) {
            continue;
        }
        their.push(theirItemsSku);
    }

    const our: string[] = [];
    for (const ourItemsSku in items.our) {
        if (!Object.prototype.hasOwnProperty.call(items.our, ourItemsSku)) {
            continue;
        }
        our.push(ourItemsSku);
    }
    return { their, our };
}
