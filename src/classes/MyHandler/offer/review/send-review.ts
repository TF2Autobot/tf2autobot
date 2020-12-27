import { TradeOffer, Meta } from 'steam-tradeoffer-manager';

import Bot from '../../../Bot';

import processReview from './process-review';

import { sendOfferReview } from '../../../../lib/DiscordWebhook/export';
import { pure, listItems, summarize, timeNow, generateLinks, check, listPrices } from '../../../../lib/tools/export';

export default function sendReview(offer: TradeOffer, bot: Bot, meta: Meta, isTradingKeys: boolean): void {
    const opt = bot.options;

    const time = timeNow(opt.timezone, opt.customTimeFormat, opt.timeAdditionalNotes);
    const pureStock = pure.stock(bot);

    const keyPrices = bot.pricelist.getKeyPrices();
    const links = generateLinks(offer.partner.toString());

    const content = processReview(offer, meta, bot, isTradingKeys);

    const hasCustomNote = !!(
        opt.manualReview.invalidItems.note ||
        opt.manualReview.overstocked.note ||
        opt.manualReview.understocked.note ||
        opt.manualReview.duped.note ||
        opt.manualReview.dupedCheckFailed.note
    );

    const reasons = meta.uniqueReasons;

    const isShowChanges = bot.options.tradeSummary.showStockChanges;

    const isWebhookEnabled = opt.discordWebhook.offerReview.enable && opt.discordWebhook.offerReview.url !== '';

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
                (opt.manualReview.showOfferSummary
                    ? '\n\nOffer Summary:\n' +
                      (isShowChanges
                          ? offer.summarizeWithStockChanges(bot.schema, 'review-partner')
                          : offer.summarize(bot.schema)
                      )
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
                          .replace(/%keyRate%/g, `${keyPrices.sell.metal.toString()} ref`)
                          .replace(/%pureStock%/g, pureStock.join(', ').toString())
                    : '') +
                (opt.manualReview.showOwnerCurrentTime
                    ? `\n\nIt is currently the following time in my owner's timezone: ${time.emoji} ${
                          time.time + (time.note !== '' ? `. ${time.note}.` : '.')
                      }`
                    : '')
        );
    }

    const highValueItems: string[] = [];
    if (meta && meta.highValue && meta.highValue.items) {
        if (Object.keys(meta.highValue.items.their).length > 0) {
            const itemsName = check.getHighValueItems(meta.highValue.items.their, bot);

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
        overstock: content.itemNames.overstocked,
        understock: content.itemNames.understocked,
        duped: content.itemNames.duped,
        dupedFailed: content.itemNames.dupedCheckFailed,
        highValue: highValueItems
    };

    const list = listItems(items, true);

    if (isWebhookEnabled) {
        const itemPrices = listPrices(offer, bot, false);
        sendOfferReview(offer, reasons.join(', '), time.time, keyPrices, content.value, links, items, itemPrices, bot);
    } else {
        const currentItems = bot.inventoryManager.getInventory().getTotalItems();
        const slots = bot.tf2.backpackSlots;
        const offerMessage = offer.message;
        const itemPrices = listPrices(offer, bot, true);
        bot.messageAdmins(
            `⚠️ Offer #${offer.id} from ${offer.partner.toString()} is pending review.` +
                `\nReasons: ${reasons.join(', ')}` +
                (reasons.includes('⬜_BANNED_CHECK_FAILED')
                    ? '\n\nBackpack.tf or steamrep.com are down, please manually check if this person is banned before accepting the offer.'
                    : reasons.includes('⬜_ESCROW_CHECK_FAILED')
                    ? '\n\nSteam is down, please manually check if this person has escrow (trade holds) enabled.'
                    : '') +
                summarize(
                    isShowChanges
                        ? offer.summarizeWithStockChanges(bot.schema, 'review-partner')
                        : offer.summarize(bot.schema),
                    content.value,
                    keyPrices,
                    true
                ) +
                (offerMessage.length !== 0 ? `\n\n💬 Offer message: "${offerMessage}"` : '') +
                (list !== '-' ? `\n\nItem lists:\n${list}` : '') +
                (opt.manualReview.showItemPrices ? `\n\n${itemPrices}` : '') +
                `\n\nSteam: ${links.steam}\nBackpack.tf: ${links.bptf}\nSteamREP: ${links.steamrep}` +
                `\n\n🔑 Key rate: ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref` +
                ` (${keyPrices.src === 'manual' ? 'manual' : 'prices.tf'})` +
                `\n🎒 Total items: ${`${currentItems}${slots !== undefined ? `/${slots}` : ''}`}` +
                `\n💰 Pure stock: ${pureStock.join(', ').toString()}` +
                `\n\n⚠️ Send "!accept ${offer.id}" to accept or "!decline ${offer.id}" to decline this offer.` +
                `\n\nVersion ${process.env.BOT_VERSION}`,
            []
        );
    }
}
