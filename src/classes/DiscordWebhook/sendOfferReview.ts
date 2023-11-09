import { TradeOffer } from '@tf2autobot/tradeoffer-manager';
import { quickLinks, sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../../lib/logger';
import { pure, summarizeToChat, listItems, replace, ValueDiff } from '../../lib/tools/export';

import Bot from '../Bot';
import { KeyPrices } from '../Pricelist';
import { sendToAdmin } from '../MyHandler/offer/review/send-review';

export default function sendOfferReview(
    offer: TradeOffer,
    reasons: string,
    time: string,
    keyPrices: KeyPrices,
    value: ValueDiff,
    links: Links,
    items: Review,
    bot: Bot
): void {
    const opt = bot.options.discordWebhook;

    let noMentionOnInvalidValue = false;
    if (!opt.offerReview.mentionInvalidValue) {
        noMentionOnInvalidValue =
            reasons.includes('🟥_INVALID_VALUE') &&
            !(
                reasons.includes('🟩_UNDERSTOCKED') ||
                reasons.includes('🟨_INVALID_ITEMS') ||
                reasons.includes('🟧_DISABLED_ITEMS') ||
                reasons.includes('🟦_OVERSTOCKED') ||
                reasons.includes('🟫_DUPED_ITEMS') ||
                reasons.includes('🟪_DUPE_CHECK_FAILED')
            );
    }
    const mentionOwner =
        noMentionOnInvalidValue && !reasons.includes('⬜_REVIEW_FORCED')
            ? `${offer.id}`
            : `${
                  opt.offerReview.isMention && opt.ownerID.length > 0
                      ? opt.ownerID.map(id => `<@!${id}>`).join(', ') + `, `
                      : ''
              }check this! - ${offer.id}`;

    const botInfo = bot.handler.getBotInfo;
    const pureStock = pure.stock(bot);
    const message = replace.specialChar(offer.message);

    const properName = bot.options.tradeSummary.showProperName;

    const itemsName = properName
        ? {
              invalid: items.invalid,
              disabled: items.disabled,
              overstock: items.overstock,
              understock: items.understock,
              duped: items.duped,
              dupedFailed: items.dupedFailed,
              highValue: items.highValue
          }
        : {
              invalid: items.invalid.map(name => replace.itemName(name)),
              disabled: items.disabled.map(name => replace.itemName(name)),
              overstock: items.overstock.map(name => replace.itemName(name)),
              understock: items.understock.map(name => replace.itemName(name)),
              duped: items.duped.map(name => replace.itemName(name)),
              dupedFailed: items.dupedFailed.map(name => replace.itemName(name)),
              highValue: items.highValue.map(name => replace.itemName(name))
          };

    const slots = bot.tf2.backpackSlots;
    const currentItems = bot.inventoryManager.getInventory.getTotalItems;
    const isCustomPricer = bot.pricelist.isUseCustomPricer;

    const summary = summarizeToChat(offer, bot, 'review-admin', true, value, false);
    const itemList = listItems(offer, bot, itemsName, false);

    const cT = bot.options.tradeSummary.customText;
    const cTKeyRate = cT.keyRate.discordWebhook ? cT.keyRate.discordWebhook : '🔑 Key rate:';
    const cTPureStock = cT.pureStock.discordWebhook ? cT.pureStock.discordWebhook : '💰 Pure stock:';
    const cTTotalItems = cT.totalItems.discordWebhook ? cT.totalItems.discordWebhook : '🎒 Total items:';

    let partnerAvatar: string;
    let partnerName: string;
    offer.getUserDetails((err, me, them) => {
        if (err) {
            log.warn('Error retrieving partner Avatar and Name: ', err);
            partnerAvatar =
                'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/72/72f78b4c8cc1f62323f8a33f6d53e27db57c2252_full.jpg'; //default "?" image
            partnerName = 'unknown';
        } else {
            partnerAvatar = them.avatarFull;
            partnerName = them.personaName;
        }

        const partnerNameNoFormat = replace.specialChar(partnerName);

        const isShowQuickLinks = opt.offerReview.misc.showQuickLinks;
        const isShowKeyRate = opt.offerReview.misc.showKeyRate;
        const isShowPureStock = opt.offerReview.misc.showPureStock;
        const isShowInventory = opt.offerReview.misc.showInventory;

        const webhookReview: Webhook = {
            username: opt.displayName || botInfo.name,
            avatar_url: opt.avatarURL || botInfo.avatarURL,
            content: mentionOwner,
            embeds: [
                {
                    author: {
                        name: 'Offer from: ' + partnerName,
                        url: links.steam,
                        icon_url: partnerAvatar
                    },
                    footer: {
                        text: `#${offer.id} • ${offer.partner.toString()} • ${time} • v${process.env.BOT_VERSION}`
                    },
                    thumbnail: {
                        url: ''
                    },
                    title: '',
                    description:
                        `⚠️ An offer sent by ${partnerNameNoFormat} is waiting for review.\nReasons: ${reasons}` +
                        (reasons.includes('⬜_BANNED_CHECK_FAILED')
                            ? '\n\n`Failed to get reputation status, please manually check if this person is banned before accepting the offer.`'
                            : reasons.includes('⬜_ESCROW_CHECK_FAILED')
                            ? '\n\n`Steam down, please manually check if this person have escrow.`'
                            : reasons.includes('⬜_HALTED')
                            ? '\n\n`Offer received during halt mode`'
                            : '') +
                        summary +
                        (message.length !== 0 ? `\n\n💬 Offer message: "${message}"` : '') +
                        (isShowQuickLinks ? `\n\n${quickLinks(partnerNameNoFormat, links)}\n` : '\n'),
                    fields: [
                        {
                            name: '__Item list__',
                            value: itemList.replace(/@/g, '')
                        },
                        {
                            name: `__Status__`,
                            value:
                                (isShowKeyRate
                                    ? `\n${cTKeyRate} ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref` +
                                      ` (${
                                          keyPrices.src === 'manual'
                                              ? 'manual'
                                              : isCustomPricer
                                              ? 'custom-pricer'
                                              : 'prices.tf'
                                      })`
                                    : '') +
                                (isShowInventory
                                    ? `\n${cTTotalItems} ${currentItems}${slots !== undefined ? `/${slots}` : ''}`
                                    : '') +
                                (isShowPureStock ? `\n${cTPureStock} ${pureStock.join(', ').toString()}` : '') +
                                `\n[View my backpack](https://backpack.tf/profiles/${botInfo.steamID.getSteamID64()})`
                        }
                    ],
                    color: opt.embedColor
                }
            ]
        };

        if (itemList === '-' || itemList === '') {
            // just remove the first element of the fields array (__Item list__)
            webhookReview.embeds[0].fields.shift();
        } else if (itemList.length >= 1024) {
            // first get __Status__ element
            const statusElement = webhookReview.embeds[0].fields.pop();

            // now remove __Item list__, so now it should be empty
            webhookReview.embeds[0].fields.length = 0;

            const separate = itemList.split('@');
            const separateCount = separate.length;

            let newSentences = '';
            let j = 1;
            separate.forEach((sentence, i) => {
                if ((newSentences.length >= 800 || i === separateCount - 1) && !(j > 4)) {
                    webhookReview.embeds[0].fields.push({
                        name: `__Item list ${j}__`,
                        value: newSentences.replace(/@/g, '')
                    });

                    if (i === separateCount - 1 || j > 4) {
                        webhookReview.embeds[0].fields.push(statusElement);
                    }

                    newSentences = '';
                    j++;
                    //
                } else newSentences += sentence;
            });
        }

        sendWebhook(opt.offerReview.url, webhookReview, 'offer-review').catch(err => {
            log.warn(`❌ Failed to send offer-review webhook (#${offer.id}) to Discord: `, err);

            const itemListx = listItems(offer, bot, itemsName, true);

            void sendToAdmin(bot, offer, reasons, value, keyPrices, itemListx, links);
        });
    });
}

interface Review {
    invalid: string[];
    disabled: string[];
    overstock: string[];
    understock: string[];
    duped: string[];
    dupedFailed: string[];
    highValue: string[];
}

interface Links {
    steam: string;
    bptf: string;
    steamrep: string;
}
