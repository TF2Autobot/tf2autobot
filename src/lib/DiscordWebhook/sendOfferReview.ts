import { TradeOffer } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';

import { quickLinks, sendWebhook } from './utils';
import { Webhook } from './interfaces';

import { pure, summarize, listItems, replace } from '../tools/export';
import log from '../logger';

import Bot from '../../classes/Bot';
import MyHandler from '../../classes/MyHandler/MyHandler';

export default function sendOfferReview(
    offer: TradeOffer,
    reasons: string,
    time: string,
    keyPrices: { buy: Currencies; sell: Currencies; src: string },
    value: { diff: number; diffRef: number; diffKey: string },
    links: { steam: string; bptf: string; steamrep: string },
    items: {
        invalid: string[];
        overstock: string[];
        understock: string[];
        duped: string[];
        dupedFailed: string[];
        highValue: string[];
    },
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
                reasons.includes('🟦_OVERSTOCKED') ||
                reasons.includes('🟫_DUPED_ITEMS') ||
                reasons.includes('🟪_DUPE_CHECK_FAILED')
            );
    }
    const mentionOwner = noMentionOnInvalidValue ? `${offer.id}` : `<@!${opt.ownerID}>, check this! - ${offer.id}`;

    const botInfo = (bot.handler as MyHandler).getBotInfo();
    const pureStock = pure.stock(bot);
    const message = replace.specialChar(offer.message);

    const itemsName = {
        invalid: items.invalid.map(name => replace.itemName(name)),
        overstock: items.overstock.map(name => replace.itemName(name)),
        understock: items.understock.map(name => replace.itemName(name)),
        duped: items.duped.map(name => replace.itemName(name)),
        dupedFailed: items.dupedFailed.map(name => replace.itemName(name)),
        highValue: items.highValue.map(name => replace.itemName(name))
    };

    const slots = bot.tf2.backpackSlots;
    const currentItems = bot.inventoryManager.getInventory().getTotalItems();

    const isShowChanges = bot.options.tradeSummary.showStockChanges;
    const summary = summarize(
        isShowChanges
            ? offer.summarizeWithLinkWithStockChanges(bot.schema, 'review')
            : offer.summarizeWithLink(bot.schema),
        value,
        keyPrices,
        false
    );
    const itemList = listItems(itemsName, false);

    let partnerAvatar: string;
    let partnerName: string;
    log.debug('getting partner Avatar and Name...');
    offer.getUserDetails((err, me, them) => {
        if (err) {
            log.debug('Error retrieving partner Avatar and Name: ', err);
            partnerAvatar =
                'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/72/72f78b4c8cc1f62323f8a33f6d53e27db57c2252_full.jpg'; //default "?" image
            partnerName = 'unknown';
        } else {
            log.debug('partner Avatar and Name retrieved. Applying...');
            partnerAvatar = them.avatarFull;
            partnerName = them.personaName;
        }

        const partnerNameNoFormat = replace.specialChar(partnerName);

        const isShowQuickLinks = opt.offerReview.misc.showQuickLinks;
        const isShowKeyRate = opt.offerReview.misc.showKeyRate;
        const isShowPureStock = opt.offerReview.misc.showPureStock;
        const isShowInventory = opt.offerReview.misc.showInventory;

        /*eslint-disable */
        const webhookReview: Webhook = {
            username: opt.displayName ? opt.displayName : botInfo.name,
            avatar_url: opt.avatarURL ? opt.avatarURL : botInfo.avatarURL,
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
                            ? '\n\n`Backpack.tf or steamrep.com down, please manually check if this person is banned before accepting the offer.`'
                            : reasons.includes('⬜_ESCROW_CHECK_FAILED')
                            ? '\n\n`Steam down, please manually check if this person have escrow.`'
                            : '') +
                        summary +
                        (offer.message.length !== 0 ? `\n\n💬 Offer message: "${message}"` : '') +
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
                                    ? `\n🔑 Key rate: ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref` +
                                      ` (${keyPrices.src === 'manual' ? 'manual' : 'prices.tf'})`
                                    : '') +
                                (isShowInventory
                                    ? `\n🎒 Total items: ${`${currentItems}${slots !== undefined ? `/${slots}` : ''}`}`
                                    : '') +
                                (isShowPureStock ? `\n💰 Pure stock: ${pureStock.join(', ').toString()}` : '') +
                                `\n[View my backpack](https://backpack.tf/profiles/${botInfo.steamID})`
                        }
                    ],
                    color: opt.embedColor
                }
            ]
        };

        /*eslint-enable */

        let removeStatus = false;

        if (!(isShowKeyRate || isShowPureStock)) {
            // If both here are false, then it will be true and the last element (__Status__) of the
            // fields array will be removed
            webhookReview.embeds[0].fields.pop();
            removeStatus = true;
        }

        if (itemList === '-') {
            // if __Item list__ field is empty, then remove it
            if (removeStatus) {
                // if __Status__ fields was removed, then delete the entire fields properties
                delete webhookReview.embeds[0].fields;
            } else {
                // else just remove the first element of the fields array (__Item list__)
                webhookReview.embeds[0].fields.shift();
            }
        } else if (itemList.length >= 1024) {
            // first get __Status__ element
            const statusElement = webhookReview.embeds[0].fields.pop();

            // now remove __Item list__, so now it should be empty
            webhookReview.embeds[0].fields.length = 0;

            const separate = itemList.split('@');

            let newSentences = '';
            let j = 1;
            separate.forEach((sentence, i) => {
                if ((newSentences.length >= 800 || i === separate.length - 1) && !(j > 4)) {
                    webhookReview.embeds[0].fields.push({
                        name: `__Item list ${j}__`,
                        value: newSentences.replace(/@/g, '')
                    });

                    if (i === separate.length - 1 || j > 4) {
                        webhookReview.embeds[0].fields.push(statusElement);
                    }

                    newSentences = '';
                    j++;
                } else {
                    newSentences += sentence;
                }
            });
        }

        sendWebhook(opt.offerReview.url, webhookReview, 'offer-review')
            .then(() => {
                log.debug(`✅ Sent offer-review webhook (#${offer.id}) to Discord.`);
            })
            .catch(err => {
                log.debug(`❌ Failed to send offer-review webhook (#${offer.id}) to Discord: `, err);
            });
    });
}
