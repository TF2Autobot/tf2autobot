/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { TradeOffer } from 'steam-tradeoffer-manager';
import { UnknownDictionary } from '../../../../types/common';
import { valueDiff } from '../../../../lib/tools/export';

import Bot from '../../../Bot';

export default function declined(offer: TradeOffer, bot: Bot, isTradingKeys: boolean): void {
    const opt = bot.options;

    const offerReason: { reason: string; meta: UnknownDictionary<any> } = offer.data('action');
    const keyPrices = bot.pricelist.getKeyPrices();
    const value = valueDiff(offer, keyPrices, isTradingKeys, opt.showOnlyMetal);
    const manualReviewDisabled = !opt.manualReview.enable;

    let reasonForInvalidValue = false;
    let reason: string;
    if (!offerReason) {
        reason = '';
    } else if (offerReason.reason === 'GIFT_NO_NOTE') {
        reason = `the offer you've sent is an empty offer on my side without any offer message. If you wish to give it as a gift, please include "gift" in the offer message. Thank you.`;
    } else if (offerReason.reason === 'CRIME_ATTEMPT') {
        reason = "you're taking free items. No.";
    } else if (offerReason.reason === 'DUELING_NOT_5_USES') {
        reason = 'your offer contains a Dueling Mini-Game that does not have 5 uses.';
    } else if (offerReason.reason === 'NOISE_MAKER_NOT_25_USES') {
        reason = 'your offer contains a Noise Maker that does not have 25 uses.';
    } else if (offerReason.reason === 'HIGH_VALUE_ITEMS_NOT_SELLING') {
        reason = `you're attempting to purchase ${offerReason.meta.highValueName.join(
            ', '
        )}, but I am not selling it right now.`;
    } else if (offerReason.reason === 'NOT_TRADING_KEYS') {
        reason =
            'I am no longer trading keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys".';
    } else if (offerReason.reason === 'NOT_SELLING_KEYS') {
        reason =
            'I am no longer selling keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys".';
    } else if (offerReason.reason === 'NOT_BUYING_KEYS') {
        reason =
            'I am no longer buying keys. You can confirm this by typing "!price Mann Co. Supply Crate Key" or "!autokeys".';
    } else if (offerReason.reason === 'BANNED') {
        reason = "you're currently banned on backpack.tf or labeled as a scammer on steamrep.com or another community.";
    } else if (offerReason.reason === 'ESCROW') {
        reason =
            'I do not accept escrow (trade holds). To prevent this from happening in the future, please enable Steam Guard Mobile Authenticator.' +
            '\nRead:\n' +
            '• Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=8625-WRAH-9030' +
            '\n• How to set up Steam Guard Mobile Authenticator - https://support.steampowered.com/kb_article.php?ref=4440-RTUI-9218';
    } else if (
        offerReason.reason === 'ONLY_INVALID_VALUE' ||
        (offerReason.reason === '🟥_INVALID_VALUE' && manualReviewDisabled)
    ) {
        reasonForInvalidValue = true;
        reason = "you've sent a trade with an invalid value (your side and my side do not hold equal value).";
    } else if (
        offerReason.reason === 'ONLY_OVERSTOCKED' ||
        (offerReason.reason === '🟦_OVERSTOCKED' && manualReviewDisabled)
    ) {
        reasonForInvalidValue = value.diffRef !== 0;
        reason = "you're attempting to sell item(s) that I can't buy more of.";
    } else if (
        offerReason.reason === 'ONLY_UNDERSTOCKED' ||
        (offerReason.reason === '🟩_UNDERSTOCKED' && manualReviewDisabled)
    ) {
        reasonForInvalidValue = value.diffRef !== 0;
        reason = "you're attempting to purchase item(s) that I can't sell more of.";
    } else if (offerReason.reason === '🟫_DUPED_ITEMS') {
        reason = "I don't accept duped items.";
    } else {
        reason = '';
    }

    const isShowChanges = bot.options.tradeSummary.showStockChanges;
    const invalidValueSummary =
        '\n\nSummary:\n' +
        (isShowChanges ? offer.summarizeWithStockChanges(bot.schema, 'declined') : offer.summarize(bot.schema))
            .replace('Asked', '  My side')
            .replace('Offered', 'Your side') +
        "\n[You're missing: " +
        (value.diffRef > keyPrices.sell.metal ? `${value.diffKey}]` : `${value.diffRef} ref]`) +
        `${
            opt.manualReview.invalidValue.autoDecline.note
                ? '\n\nNote from owner: ' + opt.manualReview.invalidValue.autoDecline.note
                : ''
        }`;

    bot.sendMessage(
        offer.partner,
        opt.customMessage.decline
            ? opt.customMessage.decline
                  .replace(/%reason%/g, reason)
                  .replace(/%invalid_value_summary%/g, invalidValueSummary)
            : `/pre ❌ Ohh nooooes! The offer is no longer available. Reason: The offer has been declined${
                  reason ? ` because ${reason}` : '.'
              }` + (reasonForInvalidValue ? invalidValueSummary : '')
    );
}
