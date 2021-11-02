import TradeOfferManager, { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../Bot';

export default async function cancelled(offer: TradeOffer, oldState: number, bot: Bot): Promise<void> {
    let reply: string;

    if (offer.data('canceledByUser') === true) {
        const custom = bot.options.commands.cancel.customReply.successCancel;
        reply = custom
            ? custom
            : '/pre ❌ Ohh nooooes! The offer is no longer available. Reason: Offer was canceled by user.';
    } else if (oldState === TradeOfferManager.ETradeOfferState['CreatedNeedsConfirmation']) {
        const custom = bot.options.customMessage.failedMobileConfirmation;
        reply = custom
            ? custom
            : '/pre ❌ Ohh nooooes! The offer is no longer available. Reason: Failed to accept mobile confirmation';
    } else {
        const custom = bot.options.customMessage.cancelledActiveForAwhile;
        reply = custom
            ? custom
            : '/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been active for a while. ' +
              "If the offer was just created, this is likely an issue on Steam's end. Please try again";
    }

    return bot.sendMessage(offer.partner, reply);
}
