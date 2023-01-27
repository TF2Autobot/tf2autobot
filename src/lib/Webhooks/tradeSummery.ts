import { ItemsDict, TradeOffer } from '@tf2autobot/tradeoffer-manager';
import WebhookHandler, { WebhookType } from './Webhook';
import Bot from '../../classes/Bot';
import * as t from '../tools/export';
import { getPartnerDetails } from '../DiscordWebhook/utils';

export interface TradeSummery {
    tradeSummery: (
        offer: TradeOffer,
        accepted: Accepted,
        bot: Bot,
        timeTakenToComplete: number,
        timeTakenToProcessOrConstruct: number,
        timeTakenToCounterOffer: number | undefined,
        isOfferSent: boolean | undefined
    ) => void;
}

interface Accepted {
    invalidItems: string[];
    disabledItems: string[];
    overstocked: string[];
    understocked: string[];
    highValue: string[];
    isMention: boolean;
}

export async function tradeSummery(
    this: WebhookHandler,
    offer: TradeOffer,
    accepted: Accepted,
    bot: Bot,
    timeTakenToComplete: number,
    timeTakenToProcessOrConstruct: number,
    timeTakenToCounterOffer: number | undefined,
    isOfferSent: boolean | undefined
) {
    const value = t.valueDiff(offer);

    const dict = offer.data('dict') as ItemsDict;

    const details = await getPartnerDetails(offer, bot);

    const links = t.generateLinks(offer.partner.toString());

    const slots = bot.tf2.backpackSlots;
    const autokeys = bot.handler.autokeys;
    const status = autokeys.getOverallStatus;

    const message = t.replace.specialChar(offer.message);
    const isDonate = t.isDonate(offer);

    const data = {
        value,
        links,
        slots,
        status,
        message,
        isDonate,
        details,
        dict,
        timeTakenToComplete,
        timeTakenToProcessOrConstruct,
        timeTakenToCounterOffer,
        isOfferSent
    };

    void this.sendWebhook(WebhookType.tradeSummary, data);
}
