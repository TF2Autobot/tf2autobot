import { Action, Meta, TradeOffer } from '@tf2autobot/tradeoffer-manager';
import { valueDiff, summarizeToChat } from '../../../../lib/tools/export';
import Bot from '../../../Bot';

export default function declined(offer: TradeOffer, bot: Bot): void {
    const opt = bot.options;

    const offerReason = offer.data('action') as Action;
    const meta = offer.data('meta') as Meta;
    const keyPrices = bot.pricelist.getKeyPrices;
    const value = valueDiff(offer);
    const manualReviewDisabled = !opt.manualReview.enable;
    const prefix = bot.getPrefix();

    const declined = '/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined';

    let reasonForInvalidValue = false;
    let reply: string;
    if (!offerReason) {
        const custom = opt.customMessage.decline.general;
        reply = custom ? custom : declined + '.';
    } else if (offerReason.reason === '🟨_CONTAINS_NON_TF2') {
        //
        const custom = opt.customMessage.decline.hasNonTF2Items;
        reply = custom ? custom : declined + ` because the offer you've sent contains Non-TF2 items.`;
        //
    } else if (offerReason.reason === 'GIFT_FAILED_CHECK_BANNED') {
        //
        const custom = opt.customMessage.decline.giftFailedCheckBanned;
        reply = custom
            ? custom
            : declined + ` because the offer you've sent is a gift, but I've failed to check your reputation status.`;
        //
    } else if (offerReason.reason === 'GIFT_NO_NOTE') {
        //
        const custom = opt.customMessage.decline.giftNoNote;
        reply = custom
            ? custom
            : declined +
              ` because the offer you've sent is an empty offer on my side without any offer message. ` +
              `If you wish to give it as a gift, please include "gift" in the offer message. Thank you.`;
        //
    } else if (offerReason.reason === 'CRIME_ATTEMPT') {
        //
        const custom = opt.customMessage.decline.crimeAttempt;
        reply = custom ? custom : declined + " because you're attempting to take items for free.";
        //
    } else if (offerReason.reason === 'TAKING_ITEMS_WITH_INTENT_BUY') {
        //
        const custom = opt.customMessage.decline.takingItemsWithIntentBuy;
        reply = custom ? custom : declined + " because you're attempting to take items that I only want to buy.";
        //
    } else if (offerReason.reason === 'GIVING_ITEMS_WITH_INTENT_SELL') {
        //
        const custom = opt.customMessage.decline.givingItemsWithIntentSell;
        reply = custom ? custom : declined + " because you're attempting to give items that I only want to sell.";
        //
    } else if (offerReason.reason === 'ONLY_METAL') {
        //
        const custom = opt.customMessage.decline.onlyMetal;
        reply = custom ? custom : declined + ' because you might forgot to add items into the trade.';
        //
    } else if (offerReason.reason === 'DUELING_NOT_5_USES') {
        //
        const custom = opt.customMessage.decline.duelingNot5Uses;
        reply = custom
            ? custom
            : declined + ' because your offer contains Dueling Mini-Game(s) that does not have 5 uses.';
        //
    } else if (offerReason.reason === 'NOISE_MAKER_NOT_25_USES') {
        //
        const custom = opt.customMessage.decline.noiseMakerNot25Uses;
        reply = custom ? custom : declined + ' because your offer contains Noise Maker(s) that does not have 25 uses.';
        //
    } else if (offerReason.reason === 'HIGH_VALUE_ITEMS_NOT_SELLING') {
        //
        const custom = opt.customMessage.decline.highValueItemsNotSelling;
        const highValueName = meta.highValueName.join(', ');
        reply = custom
            ? custom.replace(/%highValueName%/g, highValueName)
            : declined + ` because you're attempting to purchase ${highValueName}, but I am not selling it right now.`;
        //
    } else if (offerReason.reason === 'NOT_TRADING_KEYS') {
        //
        const custom = opt.customMessage.decline.notTradingKeys;
        reply = custom
            ? custom
            : declined +
              ` because I am no longer trading keys. You can confirm this by typing "${prefix}price Mann Co. Supply Crate Key" or "${prefix}autokeys".`;
        //
    } else if (offerReason.reason === 'NOT_SELLING_KEYS') {
        //
        const custom = opt.customMessage.decline.notSellingKeys;
        reply = custom
            ? custom
            : declined +
              ` because I am no longer selling keys. You can confirm this by typing "${prefix}price Mann Co. Supply Crate Key" or "${prefix}autokeys".`;
        //
    } else if (offerReason.reason === 'NOT_BUYING_KEYS') {
        //
        const custom = opt.customMessage.decline.notBuyingKeys;
        reply = custom
            ? custom
            : declined +
              ` because I am no longer buying keys. You can confirm this by typing "${prefix}price Mann Co. Supply Crate Key" or "${prefix}autokeys".`;
        //
    } else if (offerReason.reason === 'BANNED') {
        //
        let checkResult = '';
        if (meta?.banned) {
            checkResult = 'Check results:\n';
            Object.keys(meta.banned).forEach((website, index) => {
                if (meta.banned[website] !== 'clean') {
                    if (index > 0) {
                        checkResult += '\n';
                    }
                    checkResult += `(${index + 1}) ${website}: ${meta.banned[website]}`;
                }
            });
        }
        const custom = opt.customMessage.decline.banned;
        reply = custom
            ? custom + `${checkResult !== '' ? '\n\n' + checkResult : ''}`
            : declined +
              ` because you're currently banned in one or more trading communities.\n\n${
                  checkResult !== '' ? '\n\n' + checkResult : ''
              }`;
        //
    } else if (offerReason.reason === 'ESCROW') {
        //
        const custom = opt.customMessage.decline.escrow;
        reply = custom
            ? custom
            : declined +
              ' because I do not accept escrow (trade holds). To prevent this from happening in the future, ' +
              'please enable Steam Guard Mobile Authenticator.' +
              '\nRead:\n' +
              '• Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=8625-WRAH-9030' +
              '\n• How to set up Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=4440-RTUI-9218';
        //
    } else if (offerReason.reason === 'MANUAL') {
        //
        const custom = opt.customMessage.decline.manual;
        reply = custom ? custom : declined + ' by the owner.';
        //
    } else if (offerReason.reason === 'COUNTER_INVALID_VALUE_FAILED') {
        //
        const custom = opt.customMessage.decline.failedToCounter;
        reasonForInvalidValue = true;
        reply = custom
            ? custom
            : declined +
              '. Counteroffer is not possible because either one of us does not have enough pure,' +
              ' or Steam might be down, or your inventory is private (failed to load your inventory).';
    } else if (
        offerReason.reason === 'ONLY_INVALID_VALUE' ||
        (offerReason.reason === '🟥_INVALID_VALUE' && manualReviewDisabled)
    ) {
        //
        const custom = opt.offerReceived.invalidValue.autoDecline.declineReply;
        reasonForInvalidValue = true;
        reply = custom
            ? custom
            : declined +
              " because you've sent a trade with an invalid value (your side and my side do not hold equal value).";
        //
    } else if (
        offerReason.reason === 'ONLY_INVALID_ITEMS' ||
        (offerReason.reason === '🟨_INVALID_ITEMS' && manualReviewDisabled)
    ) {
        //
        const custom = opt.offerReceived.invalidItems.autoDecline.declineReply;
        reasonForInvalidValue = value.diff < 0;
        reply = custom
            ? custom
            : declined + " because you've sent a trade with an invalid items (not exist in my pricelist).";
        //
    } else if (
        offerReason.reason === 'ONLY_DISABLED_ITEMS' ||
        (offerReason.reason === '🟧_DISABLED_ITEMS' && manualReviewDisabled)
    ) {
        //
        const custom = opt.offerReceived.disabledItems.autoDecline.declineReply;
        reasonForInvalidValue = value.diff < 0;
        reply = custom ? custom : declined + " because the item(s) you're trying to take/give is currently disabled";
        //
    } else if (
        offerReason.reason === 'ONLY_OVERSTOCKED' ||
        (offerReason.reason === '🟦_OVERSTOCKED' && manualReviewDisabled)
    ) {
        //
        const custom = opt.offerReceived.overstocked.autoDecline.declineReply;
        reasonForInvalidValue = value.diff < 0;
        reply = custom ? custom : declined + " because you're attempting to sell item(s) that I can't buy more of.";
        //
    } else if (
        offerReason.reason === 'ONLY_UNDERSTOCKED' ||
        (offerReason.reason === '🟩_UNDERSTOCKED' && manualReviewDisabled)
    ) {
        //
        const custom = opt.offerReceived.understocked.autoDecline.declineReply;
        reasonForInvalidValue = value.diff < 0;
        reply = custom
            ? custom
            : declined + " because you're attempting to purchase item(s) that I can't sell more of.";
        //
    } else if (offerReason.reason === '🟫_DUPED_ITEMS') {
        //
        const custom = opt.offerReceived.duped.autoDecline.declineReply;
        reply = custom ? custom : declined + " because I don't accept duped items.";
        //
    } else if (offerReason.reason === 'HALTED') {
        const custom = opt.customMessage.decline.halted;
        reply = custom ? custom : declined + ' because I am not operational right now. Please come back later.';
    } else if (offerReason.reason === 'CONTAINS_KEYS_ON_BOTH_SIDES') {
        const custom = opt.customMessage.decline.containsKeysOnBothSides;
        reply = custom
            ? custom
            : declined + ' because the offer sent contains Mann Co. Supply Crate Key on both sides.';
    } else if (offerReason.reason === 'CONTAINS_ITEMS_ON_BOTH_SIDES') {
        const custom = opt.customMessage.decline.containsItemsOnBothSides;
        reply = custom ? custom : declined + ' because the offer sent contains items on both sides.';
    } else {
        //
        const custom = opt.customMessage.decline.general;
        reply = custom ? custom : declined + '.';
        //
    }

    const invalidValueSummary =
        summarizeToChat(offer, bot, 'declined', false, value, true) +
        "\n[You're missing: " +
        (value.diffRef > keyPrices.sell.metal ? `${value.diffKey}]` : `${value.diffRef} ref]`);

    bot.sendMessage(offer.partner, reply + (reasonForInvalidValue ? invalidValueSummary : ''));
}
