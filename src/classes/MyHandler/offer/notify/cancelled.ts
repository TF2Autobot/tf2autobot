import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import Bot from '../../../Bot';

export default function cancelled(offer: TradeOffer, oldState: number, bot: Bot): void {
    let reason: string;

    if (offer.data('canceledByUser') === true) {
        reason = 'by user';
    } else if (oldState === TradeOfferManager.ETradeOfferState['CreatedNeedsConfirmation']) {
        reason = 'Because I Failed to accept mobile confirmation';
    } else {
        reason = 'Due to your input or a steam bug. Please try again';
    }

    bot.sendMessage(offer.partner, '/pre ❌ Sorry your offer was cancelled ' + reason + '.');
}
