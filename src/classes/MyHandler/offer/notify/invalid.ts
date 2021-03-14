import { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../Bot';

export default function invalid(offer: TradeOffer, bot: Bot): void {
    offer.data('isInvalid', true);
    const custom = bot.options.customMessage.tradedAway;

    bot.sendMessage(
        offer.partner,
        custom
            ? custom
            : '/pre ❌ Ohh nooooes! Your offer is no longer available. Reason: Items not available (traded away in a different trade).'
    );
}
