import { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import Bot from '../../../Bot';

export default function accepted(offer: TradeOffer, bot: Bot): Promise<void> {
    const custom = bot.options.customMessage.success;

    return bot.sendMessage(offer.partner, custom ? custom : '/pre ✅ Success! The offer went through successfully.');
}
