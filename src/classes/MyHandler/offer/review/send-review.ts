import { TradeOffer, Meta } from '@tf2autobot/tradeoffer-manager';
import processReview from './process-review';
import Bot from '../../../Bot';
import { sendOfferReview } from '../../../../lib/DiscordWebhook/export';
import * as t from '../../../../lib/tools/export';

export default function sendReview(offer: TradeOffer, bot: Bot, meta: Meta, isTradingKeys: boolean): void {
    const opt = bot.options;
    const time = t.timeNow(bot.options);
    const keyPrices = bot.pricelist.getKeyPrices;
    const links = t.generateLinks(offer.partner.toString());
    const content = processReview(offer, meta, bot, isTradingKeys);

    const hasCustomNote = !(
        opt.manualReview.invalidItems.note !== '' ||
        opt.manualReview.disabledItems.note !== '' ||
        opt.manualReview.overstocked.note !== '' ||
        opt.manualReview.understocked.note !== '' ||
        opt.manualReview.duped.note !== '' ||
        opt.manualReview.dupedCheckFailed.note !== ''
    );

    const reasons = meta.uniqueReasons;
    const isWebhookEnabled = opt.discordWebhook.offerReview.enable && opt.discordWebhook.offerReview.url !== '';

    // Notify partner and admin that the offer is waiting for manual review
    if (reasons.includes('⬜_BANNED_CHECK_FAILED') || reasons.includes('⬜_ESCROW_CHECK_FAILED')) {
        let reply: string;

        if (reasons.includes('⬜_BANNED_CHECK_FAILED')) {
            const custom = opt.manualReview.bannedCheckFailed.note;
            reply = custom
                ? custom
                : 'Backpack.tf or steamrep.com is down and I failed to check your backpack.tf/steamrep' +
                  ' status, please wait for my owner to manually accept/decline your offer.';
        } else {
            const custom = opt.manualReview.escrowCheckFailed.note;
            reply = custom
                ? custom
                : 'Steam is down and I failed to check your Escrow (Trade holds)' +
                  ' status, please wait for my owner to manually accept/decline your offer.';
        }
        bot.sendMessage(offer.partner, reply);
    } else {
        bot.sendMessage(
            offer.partner,
            `⚠️ Your offer is pending review.\nReasons: ${reasons.join(', ')}` +
                (opt.manualReview.showOfferSummary
                    ? t
                          .summarizeToChat(offer, bot, 'review-partner', false, content.value, keyPrices, true)
                          .replace('Asked', '  My side')
                          .replace('Offered', 'Your side') +
                      (reasons.includes('🟥_INVALID_VALUE') && !reasons.includes('🟨_INVALID_ITEMS')
                          ? content.missing
                          : '') +
                      (opt.manualReview.showReviewOfferNote
                          ? `\n\nNote:\n${
                                content.notes.join('\n') +
                                (hasCustomNote ? '' : '\n\nPlease wait for a response from the owner.')
                            }`
                          : '')
                    : '') +
                (opt.manualReview.additionalNotes
                    ? '\n\n' +
                      opt.manualReview.additionalNotes
                          .replace(/%keyRate%/g, `${keyPrices.buy.toString()}/${keyPrices.sell.toString()}`)
                          .replace(/%pureStock%/g, t.pure.stock(bot).join(', ').toString())
                    : '') +
                (opt.manualReview.showOwnerCurrentTime
                    ? `\n\nIt is currently the following time in my owner's timezone: ${time.emoji} ${
                          time.time + (time.note !== '' ? `. ${time.note}.` : '.')
                      }`
                    : '')
        );
    }

    const highValueItems: string[] = [];
    if (meta?.highValue?.items) {
        if (Object.keys(meta.highValue.items.their).length > 0) {
            const itemsName = t.getHighValueItems(meta.highValue.items.their, bot, bot.paints, bot.strangeParts);

            for (const name in itemsName) {
                if (!Object.prototype.hasOwnProperty.call(itemsName, name)) {
                    continue;
                }

                highValueItems.push(`${isWebhookEnabled ? `_${name}_` : name}` + itemsName[name]);
            }
        }
    }

    const items = {
        invalid: content.itemNames.invalidItems,
        disabled: content.itemNames.disabledItems,
        overstock: content.itemNames.overstocked,
        understock: content.itemNames.understocked,
        duped: content.itemNames.duped,
        dupedFailed: content.itemNames.dupedCheckFailed,
        highValue: highValueItems
    };

    if (isWebhookEnabled) {
        sendOfferReview(offer, reasons.join(', '), time.time, keyPrices, content.value, links, items, bot);
        //
    } else {
        const currentItems = bot.inventoryManager.getInventory.getTotalItems;
        const slots = bot.tf2.backpackSlots;
        const offerMessage = offer.message;
        const list = t.listItems(offer, bot, items, true);
        const isCustomPricer = bot.pricelist.isUseCustomPricer;

        const cT = bot.options.tradeSummary.customText;
        const cTKeyRate = cT.keyRate.steamChat ? cT.keyRate.steamChat : '🔑 Key rate:';
        const cTPureStock = cT.pureStock.steamChat ? cT.pureStock.steamChat : '💰 Pure stock:';
        const cTTotalItems = cT.totalItems.steamChat ? cT.totalItems.steamChat : '🎒 Total items:';

        const customInitializer = bot.options.steamChat.customInitializer.review;

        bot.messageAdmins(
            `${customInitializer ? customInitializer + ' ' : ''}⚠️ Offer #${
                offer.id
            } from ${offer.partner.toString()} is pending review.` +
                `\nReasons: ${reasons.join(', ')}` +
                (reasons.includes('⬜_BANNED_CHECK_FAILED')
                    ? '\n\nBackpack.tf or steamrep.com are down, please manually check if this person is banned before accepting the offer.'
                    : reasons.includes('⬜_ESCROW_CHECK_FAILED')
                    ? '\n\nSteam is down, please manually check if this person has escrow (trade holds) enabled.'
                    : '') +
                t.summarizeToChat(offer, bot, 'review-admin', false, content.value, keyPrices, true) +
                (offerMessage.length !== 0 ? `\n\n💬 Offer message: "${offerMessage}"` : '') +
                (list !== '-' ? `\n\nItem lists:\n${list}` : '') +
                `\n\nSteam: ${links.steam}\nBackpack.tf: ${links.bptf}\nSteamREP: ${links.steamrep}` +
                `\n\n${cTKeyRate} ${keyPrices.buy.toString()}/${keyPrices.sell.toString()}` +
                ` (${keyPrices.src === 'manual' ? 'manual' : isCustomPricer ? 'custom-pricer' : 'prices.tf'})` +
                `\n${cTTotalItems} ${currentItems}${slots !== undefined ? `/${slots}` : ''}` +
                `\n${cTPureStock} ${t.pure.stock(bot).join(', ').toString()}` +
                `\n\n⚠️ Send "!accept ${offer.id}" to accept or "!decline ${offer.id}" to decline this offer.` +
                `\n\nVersion ${process.env.BOT_VERSION}`,
            []
        );
    }
}
