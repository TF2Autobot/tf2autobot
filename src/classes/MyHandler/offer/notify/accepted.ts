import { TradeOffer } from 'steam-tradeoffer-manager';
import Bot from '../../../Bot';

export default function accepted(offer: TradeOffer, bot: Bot): void {
    bot.sendMessage(
        offer.partner,
        bot.options.customMessage.success ? bot.options.customMessage.success : '/pre ✅ The offer was accepted!.'
    );
}
