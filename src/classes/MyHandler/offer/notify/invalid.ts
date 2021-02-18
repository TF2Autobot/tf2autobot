import { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../Bot';

export default function invalid(offer: TradeOffer, bot: Bot): void {
    offer.data('isInvalid', true);
    bot.sendMessage(
        offer.partner,
        bot.options.customMessage.tradedAway
            ? bot.options.customMessage.tradedAway
            : '/pre ❌ Ohh nooooes! Your offer is no longer available. Reason: Items not available (traded away in a different trade).'
    );
}
