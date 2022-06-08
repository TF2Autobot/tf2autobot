import { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../Bot.js';

export default function accepted(offer: TradeOffer, bot: Bot): void {
    const custom = bot.options.customMessage.success;

    bot.sendMessage(offer.partner, custom ? custom : '/pre ✅ Success! The offer went through successfully.');
}
