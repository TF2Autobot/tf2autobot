import { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../Bot';

export default function accepted(offer: TradeOffer, bot: Bot): void {
    bot.sendMessage(
        offer.partner,
        bot.options.customMessage.success
            ? bot.options.customMessage.success
            : '/pre ✅ Success! The offer went through successfully.'
    );
}
