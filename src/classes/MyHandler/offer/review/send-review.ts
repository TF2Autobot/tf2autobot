import { TradeOffer } from 'steam-tradeoffer-manager';
import { UnknownDictionary } from '../../../../types/common';

import Bot from '../../../Bot';

import processReview from './process-review';

import { sendOfferReview } from '../../../../lib/DiscordWebhook/export';
import { pure, valueDiff, listItems, summarize, timeNow, generateLinks } from '../../../../lib/tools/export';

export default function sendReview(
    offer: TradeOffer,
    bot: Bot,
    meta: UnknownDictionary<any>,
    isTradingKeys: boolean,
    highValueItems: string[]
): void {
    const time = timeNow(bot.options.timezone, bot.options.customTimeFormat, bot.options.timeAdditionalNotes);
    const pureStock = pure.stock(bot);

    const keyPrices = bot.pricelist.getKeyPrices();
    const value = valueDiff(offer, keyPrices, isTradingKeys, bot.options.showOnlyMetal);
    const links = generateLinks(offer.partner.toString());

    const content = processReview(offer, meta, bot, isTradingKeys);

    const hasCustomNote = !!(
        bot.options.manualReview.invalidItems.note ||
        bot.options.manualReview.overstocked.note ||
        bot.options.manualReview.understocked.note ||
        bot.options.manualReview.duped.note ||
        bot.options.manualReview.dupedCheckFailed.note
    );

    const reasons = meta.uniqueReasons;

    // Notify partner and admin that the offer is waiting for manual review
    if (reasons.includes('⬜_BANNED_CHECK_FAILED') || reasons.includes('⬜_ESCROW_CHECK_FAILED')) {
        bot.sendMessage(
            offer.partner,
            (reasons.includes('⬜_BANNED_CHECK_FAILED') ? 'Backpack.tf or steamrep.com' : 'Steam') +
                ' is down and I failed to check your ' +
                (reasons.includes('⬜_BANNED_CHECK_FAILED') ? 'backpack.tf/steamrep' : 'Escrow (Trade holds)') +
                ' status, please wait for my owner to manually accept/decline your offer.'
        );
    } else {
        bot.sendMessage(
            offer.partner,
            `⚠️ Your offer is pending review.\nReasons: ${reasons.join(', ')}` +
                (bot.options.manualReview.showOfferSummary
                    ? '\n\nOffer Summary:\n' +
                      offer
                          .summarize(bot.schema)
                          .replace('Asked', '  My side')
                          .replace('Offered', 'Your side') +
                      (reasons.includes('🟥_INVALID_VALUE') && !reasons.includes('🟨_INVALID_ITEMS')
                          ? content.missing
                          : '') +
                      (bot.options.manualReview.showReviewOfferNote
                          ? `\n\nNote:\n${content.notes.join('\n') +
                                (hasCustomNote ? '' : '\n\nPlease wait for a response from the owner.')}`
                          : '')
                    : '') +
                (bot.options.manualReview.additionalNotes
                    ? '\n\n' +
                      bot.options.manualReview.additionalNotes
                          .replace(/%keyRate%/g, `${keyPrices.sell.metal.toString()} ref`)
                          .replace(/%pureStock%/g, pureStock.join(', ').toString())
                    : '') +
                (bot.options.manualReview.showOwnerCurrentTime
                    ? `\n\nIt is currently the following time in my owner's timezone: ${time.emoji} ${time.time +
                          (time.note !== '' ? `. ${time.note}.` : '.')}`
                    : '')
        );
    }

    const items = {
        invalid: content.itemNames.invalidItems,
        overstock: content.itemNames.overstocked,
        understock: content.itemNames.understocked,
        duped: content.itemNames.duped,
        dupedFailed: content.itemNames.dupedCheckFailed,
        highValue: highValueItems
    };

    const list = listItems(items, true);

    if (bot.options.discordWebhook.offerReview.enable && bot.options.discordWebhook.offerReview.url) {
        sendOfferReview(offer, reasons.join(', '), time.time, keyPrices, value, links, items, bot);
    } else {
        const offerMessage = offer.message;
        bot.messageAdmins(
            `⚠️ Offer #${offer.id} from ${offer.partner} is pending review.` +
                `\nReasons: ${reasons.join(', ')}` +
                (reasons.includes('⬜_BANNED_CHECK_FAILED')
                    ? '\n\nBackpack.tf or steamrep.com are down, please manually check if this person is banned before accepting the offer.'
                    : reasons.includes('⬜_ESCROW_CHECK_FAILED')
                    ? '\n\nSteam is down, please manually check if this person has escrow (trade holds) enabled.'
                    : '') +
                summarize(offer.summarize(bot.schema), value, keyPrices, true) +
                (offerMessage.length !== 0 ? `\n\n💬 Offer message: "${offerMessage}"` : '') +
                (list !== '-' ? `\n\nItem lists:\n${list}` : '') +
                `\n\nSteam: ${links.steam}\nBackpack.tf: ${links.bptf}\nSteamREP: ${links.steamrep}` +
                `\n\n🔑 Key rate: ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref` +
                ` (${keyPrices.src === 'manual' ? 'manual' : 'prices.tf'})` +
                `\n💰 Pure stock: ${pureStock.join(', ').toString()}` +
                `\n\n⚠️ Send "!accept ${offer.id}" to accept or "!decline ${offer.id}" to decline this offer.`,
            []
        );
    }
}
