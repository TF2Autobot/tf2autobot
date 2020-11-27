import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import Bot from '../../../Bot';

export default function cancelled(offer: TradeOffer, oldState: number, bot: Bot): void {
    let reason: string;

    if (offer.data('canceledByUser') === true) {
        reason = 'Offer was canceled by user';
    } else if (oldState === TradeOfferManager.ETradeOfferState['CreatedNeedsConfirmation']) {
        reason = 'Failed to accept mobile confirmation';
    } else {
        reason =
            "The offer has been active for a while. If the offer was just created, this is likely an issue on Steam's end. Please try again.";
    }

    bot.sendMessage(offer.partner, '/pre ❌ Ohh nooooes! The offer is no longer available. Reason: ' + reason + '.');
}
