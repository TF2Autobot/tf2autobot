import TradeOfferManager, { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../Bot';
import log from '../../../../lib/logger';

export default function cancelled(offer: TradeOffer, oldState: number, bot: Bot): void {
    let reply: string;

    if (offer.data('canceledByUser') === true) {
        const custom = bot.options.commands.cancel.customReply.successCancel;
        reply = custom
            ? custom
            : '/pre ❌ Ohh nooooes! The offer is no longer available. Reason: Offer was canceled by admin.';
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

    log.info(`Offer #${offer.id} with ${offer.partner.getSteamID64()} was canceled. Sending message: ${reply}`);
    bot.sendMessage(offer.partner, reply);
}
