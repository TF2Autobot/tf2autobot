/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { TradeOffer } from 'steam-tradeoffer-manager';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies';

import { getPartnerDetails, quickLinks, sendWebhook } from './utils';

import { Webhook } from './interfaces';

import log from '../logger';
import { pure, stats, summarize, listItems, replace } from '../tools/export';

import Bot from '../../classes/Bot';
import MyHandler from '../../classes/MyHandler/MyHandler';

export default function sendTradeSummary(
    offer: TradeOffer,
    autokeys: Autokeys,
    currentItems: number,
    accepted: Accepted,
    keyPrices: KeyPrices,
    value: ValueDiff,
    items: ItemSKUList,
    links: Links,
    time: string,
    bot: Bot,
    timeTaken: string,
    isOfferSent: boolean | undefined
): void {
    const opt = bot.options.discordWebhook;

    const ourItems = items.our;
    const theirItems = items.their;

    const itemsName = {
        invalid: accepted.invalidItems.map(name => replace.itemName(name)), // 🟨_INVALID_ITEMS
        overstock: accepted.overstocked.map(name => replace.itemName(name)), // 🟦_OVERSTOCKED
        understock: accepted.understocked.map(name => replace.itemName(name)), // 🟩_UNDERSTOCKED
        duped: [],
        dupedFailed: [],
        highValue: accepted.highValue.map(name => replace.itemName(name)) // 🔶_HIGH_VALUE_ITEMS
    };

    const itemList = listItems(itemsName, false);

    // Mention owner on the sku(s) specified in discordWebhook.tradeSummary.mentionOwner.itemSkus
    const enableMentionOnSpecificSKU = opt.tradeSummary.mentionOwner.enable;
    const skuToMention = opt.tradeSummary.mentionOwner.itemSkus;

    const isMentionOurItems = enableMentionOnSpecificSKU
        ? skuToMention.some(fromEnv => {
              return ourItems.some(ourItemSKU => {
                  return ourItemSKU.includes(fromEnv);
              });
          })
        : false;

    const isMentionThierItems = enableMentionOnSpecificSKU
        ? skuToMention.some(fromEnv => {
              return theirItems.some(theirItemSKU => {
                  return theirItemSKU.includes(fromEnv);
              });
          })
        : false;

    const IVAmount = itemsName.invalid.length;
    const HVAmount = itemsName.highValue.length;
    const isMentionHV = accepted.isMention;

    const mentionOwner =
        IVAmount > 0 || isMentionHV // Only mention on accepted 🟨_INVALID_ITEMS or 🔶_HIGH_VALUE_ITEMS
            ? `<@!${opt.ownerID}> - Accepted ${
                  IVAmount > 0 && isMentionHV
                      ? `INVALID_ITEMS and High value ${pluralize('item', IVAmount + HVAmount)}`
                      : IVAmount > 0 && !isMentionHV
                      ? `INVALID_ITEMS ${pluralize('item', IVAmount)}`
                      : IVAmount === 0 && isMentionHV
                      ? `High Value ${pluralize('item', HVAmount)}`
                      : ''
              } trade here!`
            : opt.tradeSummary.mentionOwner.enable && (isMentionOurItems || isMentionThierItems)
            ? `<@!${opt.ownerID}>`
            : '';

    const url = opt.tradeSummary.url;

    const botInfo = (bot.handler as MyHandler).getBotInfo();
    const pureStock = pure.stock(bot);
    const trades = stats(bot);

    const tradeNumbertoShowStarter = bot.options.statistics.starter;

    const tradesMade =
        tradeNumbertoShowStarter !== 0 && !isNaN(tradeNumbertoShowStarter)
            ? tradeNumbertoShowStarter + trades.tradesTotal
            : trades.tradesTotal;

    const isShowChanges = bot.options.tradeSummary.showStockChanges;
    const summary = summarize(
        isShowChanges
            ? offer.summarizeWithLinkWithStockChanges(bot.schema, 'summary')
            : offer.summarizeWithLink(bot.schema),
        value,
        keyPrices,
        false,
        isOfferSent
    );

    let personaName: string;
    let avatarFull: string;
    log.debug('getting partner Avatar and Name...');
    getPartnerDetails(offer, bot, (err, details) => {
        if (err) {
            log.debug('Error retrieving partner Avatar and Name: ', err);
            personaName = 'unknown';
            avatarFull =
                'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/72/72f78b4c8cc1f62323f8a33f6d53e27db57c2252_full.jpg'; //default "?" image
        } else {
            log.debug('partner Avatar and Name retrieved. Applying...');
            personaName = details.personaName;
            avatarFull = details.avatarFull;
        }

        const partnerNameNoFormat = replace.specialChar(personaName);

        const misc = opt.tradeSummary.misc;

        const isShowQuickLinks = misc.showQuickLinks;
        const isShowKeyRate = misc.showKeyRate;
        const isShowPureStock = misc.showPureStock;
        const isShowInventory = misc.showInventory;
        const AdditionalNotes = misc.note;

        const slots = bot.tf2.backpackSlots;

        const acceptedTradeSummary: Webhook = {
            username: opt.displayName ? opt.displayName : botInfo.name,
            avatar_url: opt.avatarURL ? opt.avatarURL : botInfo.avatarURL,
            content: mentionOwner,
            embeds: [
                {
                    color: opt.embedColor,
                    author: {
                        name: `Trade from: ${personaName} #${tradesMade.toString()}`,
                        url: links.steam,
                        icon_url: avatarFull
                    },
                    description:
                        summary +
                        `\n⏱ **Time taken:** ${timeTaken}\n\n` +
                        (isShowQuickLinks ? `${quickLinks(partnerNameNoFormat, links)}\n` : '\n'),
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
                                      ` (${keyPrices.src === 'manual' ? 'manual' : 'prices.tf'})` +
                                      `${
                                          autokeys.isEnabled
                                              ? ' | Autokeys: ' +
                                                (autokeys.isActive
                                                    ? '✅' +
                                                      (autokeys.isBanking
                                                          ? ' (banking)'
                                                          : autokeys.isBuying
                                                          ? ' (buying)'
                                                          : ' (selling)')
                                                    : '🛑')
                                              : ''
                                      }`
                                    : '') +
                                (isShowPureStock ? `\n💰 Pure stock: ${pureStock.join(', ').toString()}` : '') +
                                (isShowInventory
                                    ? `\n🎒 Total items: ${`${currentItems}${slots !== undefined ? `/${slots}` : ''}`}`
                                    : '') +
                                (AdditionalNotes
                                    ? (isShowKeyRate || isShowPureStock || isShowInventory ? '\n' : '') +
                                      AdditionalNotes
                                    : `\n[View my backpack](https://backpack.tf/profiles/${botInfo.steamID})`)
                        }
                    ],
                    footer: {
                        text: `#${offer.id} • ${offer.partner.toString()} • ${time} • v${process.env.BOT_VERSION}`
                    }
                }
            ]
        };

        if (itemList === '-') {
            acceptedTradeSummary.embeds[0].fields.shift();
        } else if (itemList.length >= 1024) {
            // first get __Status__ element
            const statusElement = acceptedTradeSummary.embeds[0].fields.pop();

            // now remove __Item list__, so now it should be empty
            acceptedTradeSummary.embeds[0].fields.length = 0;

            const separate = itemList.split('@');

            let newSentences = '';
            let j = 1;
            separate.forEach((sentence, i) => {
                if ((newSentences.length >= 800 || i === separate.length - 1) && !(j > 4)) {
                    acceptedTradeSummary.embeds[0].fields.push({
                        name: `__Item list ${j}__`,
                        value: newSentences.replace(/@/g, '')
                    });

                    if (i === separate.length - 1 || j > 4) {
                        acceptedTradeSummary.embeds[0].fields.push(statusElement);
                    }

                    newSentences = '';
                    j++;
                } else {
                    newSentences += sentence;
                }
            });
        }

        url.forEach((link, i) => {
            sendWebhook(link, acceptedTradeSummary, 'trade-summary', i)
                .then(() => {
                    log.debug(`✅ Sent summary (#${offer.id}) to Discord${url.length > 1 ? `(${i + 1})` : ''}.`);
                })
                .catch(err => {
                    log.debug(
                        `❌ Failed to send trade-summary webhook (#${offer.id}) to Discord ${
                            url.length > 1 ? ` (${i + 1})` : ''
                        }: `,
                        err
                    );
                });
        });
    });
}

interface Links {
    steam: string;
    bptf: string;
    steamrep: string;
}

interface ValueDiff {
    diff: number;
    diffRef: number;
    diffKey: string;
}

interface KeyPrices {
    buy: Currencies;
    sell: Currencies;
    src: string;
    time: number;
}

interface Accepted {
    invalidItems: string[];
    overstocked: string[];
    understocked: string[];
    highValue: string[];
    isMention: boolean;
}

interface Autokeys {
    isEnabled: boolean;
    isActive: boolean;
    isBuying: boolean;
    isBanking: boolean;
}

export interface ItemSKUList {
    their: string[];
    our: string[];
}
