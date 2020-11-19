import Bot from '../../classes/Bot';

import { XMLHttpRequest } from 'xmlhttprequest-ts';
import { TradeOffer } from 'steam-tradeoffer-manager';
import log from '../logger';
import Currencies from 'tf2-currencies';
import MyHandler from '../../classes/MyHandler';

import { pure, summarize, listItems, replaceItemName, replaceSpecialChar } from '../tools/export';

import { quickLinks } from './utils';

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
    let noMentionOnInvalidValue = false;
    if (process.env.DISCORD_WEBHOOK_REVIEW_OFFER_DISABLE_MENTION_INVALID_VALUE !== 'false') {
        if (
            reasons.includes('🟥_INVALID_VALUE') &&
            !(
                reasons.includes('🟩_UNDERSTOCKED') ||
                reasons.includes('🟨_INVALID_ITEMS') ||
                reasons.includes('🟦_OVERSTOCKED') ||
                reasons.includes('🟫_DUPED_ITEMS') ||
                reasons.includes('🟪_DUPE_CHECK_FAILED')
            )
        ) {
            noMentionOnInvalidValue = true;
        } else {
            noMentionOnInvalidValue = false;
        }
    }
    const mentionOwner = noMentionOnInvalidValue
        ? `${offer.id}`
        : `<@!${process.env.DISCORD_OWNER_ID}>, check this! - ${offer.id}`;

    const botInfo = (bot.handler as MyHandler).getBotInfo();
    const pureStock = pure(bot);
    const message = replaceSpecialChar(offer.message);

    const itemsName = {
        invalid: items.invalid.map(name => replaceItemName(name)),
        overstock: items.overstock.map(name => replaceItemName(name)),
        understock: items.understock.map(name => replaceItemName(name)),
        duped: items.duped.map(name => replaceItemName(name)),
        dupedFailed: items.dupedFailed.map(name => replaceItemName(name)),
        highValue: items.highValue.map(name => replaceItemName(name))
    };

    const summary = summarize(offer.summarizeWithLink(bot.schema), value, keyPrices, false);
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

        const partnerNameNoFormat = replaceSpecialChar(partnerName);

        const isShowQuickLinks = process.env.DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_QUICK_LINKS !== 'false';
        const isShowKeyRate = process.env.DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_KEY_RATE !== 'false';
        const isShowPureStock = process.env.DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_PURE_STOCK !== 'false';

        /*eslint-disable */
        const webhookReview = {
            username: process.env.DISCORD_WEBHOOK_USERNAME ? process.env.DISCORD_WEBHOOK_USERNAME : botInfo.name,
            avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL
                ? process.env.DISCORD_WEBHOOK_AVATAR_URL
                : botInfo.avatarURL,
            content: mentionOwner,
            embeds: [
                {
                    author: {
                        name: 'Offer from: ' + partnerName,
                        url: links.steam,
                        icon_url: partnerAvatar
                    },
                    footer: {
                        text: `Offer #${offer.id} • SteamID: ${offer.partner.toString()} • ${time}`
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
                            name: '__Status__',
                            value:
                                (isShowKeyRate
                                    ? `\n🔑 Key rate: ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref` +
                                      ` (${keyPrices.src === 'manual' ? 'manual' : 'prices.tf'})`
                                    : '') +
                                (isShowPureStock ? `\n💰 Pure stock: ${pureStock.join(', ').toString()}` : '')
                        }
                    ],
                    color: process.env.DISCORD_WEBHOOK_EMBED_COLOR_IN_DECIMAL_INDEX
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
            // if __Item list__ field is empty OR contains more than 1024 characters, then remove it
            // to prevent the webhook from failing on POST request
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

        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_REVIEW_OFFER_URL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(JSON.stringify(webhookReview));
    });
}
