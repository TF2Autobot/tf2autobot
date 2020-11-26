import { TradeOffer } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import pluralize from 'pluralize';

import { getPartnerDetails, quickLinks, sendWebhook } from './utils';

import { Webhook } from './interfaces';

import log from '../logger';
import { pure, stats, summarize, listItems, replace } from '../tools/export';

import Bot from '../../classes/Bot';
import MyHandler from '../../classes/MyHandler/MyHandler';

export default function sendTradeSummary(
    offer: TradeOffer,
    autokeys: { isEnabled: boolean; isActive: boolean; isBuying: boolean; isBanking: boolean },
    currentItems: number,
    backpackSlots: number,
    accepted: {
        invalidItems: string[];
        overstocked: string[];
        understocked: string[];
        highValue: string[];
        isMention: boolean;
    },
    keyPrices: { buy: Currencies; sell: Currencies; src: string },
    value: { diff: number; diffRef: number; diffKey: string },
    items: { their: string[]; our: string[] },
    links: { steam: string; bptf: string; steamrep: string },
    time: string,
    bot: Bot,
    processTime: number
): void {
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
    const enableMentionOnSpecificSKU = bot.options.discordWebhook.tradeSummary.mentionOwner.enable;
    const skuToMention = bot.options.discordWebhook.tradeSummary.mentionOwner.itemSkus;

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
            ? `<@!${bot.options.discordWebhook.ownerID}> - Accepted ${
                  IVAmount > 0 && isMentionHV
                      ? `INVALID_ITEMS and High value ${pluralize('item', IVAmount + HVAmount)}`
                      : IVAmount > 0 && !isMentionHV
                      ? `INVALID_ITEMS ${pluralize('item', IVAmount)}`
                      : IVAmount === 0 && isMentionHV
                      ? `High Value ${pluralize('item', HVAmount)}`
                      : ''
              } trade here!`
            : bot.options.discordWebhook.tradeSummary.mentionOwner.enable && (isMentionOurItems || isMentionThierItems)
            ? `<@!${bot.options.discordWebhook.ownerID}>`
            : '';

    const tradeLinks = bot.options.discordWebhook.tradeSummary.url;
    const botInfo = (bot.handler as MyHandler).getBotInfo();
    const pureStock = pure.stock(bot);
    const trades = stats(bot);

    const tradeNumbertoShowStarter = bot.options.statistics.starter;

    const tradesMade =
        tradeNumbertoShowStarter !== 0 && !isNaN(tradeNumbertoShowStarter)
            ? tradeNumbertoShowStarter + trades.tradesTotal
            : trades.tradesTotal;

    const summary = summarize(offer.summarizeWithLink(bot.schema), value, keyPrices, false);

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

        const isShowQuickLinks = bot.options.discordWebhook.tradeSummary.misc.showQuickLinks;
        const isShowKeyRate = bot.options.discordWebhook.tradeSummary.misc.showKeyRate;
        const isShowPureStock = bot.options.discordWebhook.tradeSummary.misc.showPureStock;
        const isShowInventory = bot.options.discordWebhook.tradeSummary.misc.showInventory;
        const AdditionalNotes = bot.options.discordWebhook.tradeSummary.misc.note;

        /*eslint-disable */
        const acceptedTradeSummary: Webhook = {
            username: bot.options.discordWebhook.displayName ? bot.options.discordWebhook.displayName : botInfo.name,
            avatar_url: bot.options.discordWebhook.avatarURL ? bot.options.discordWebhook.avatarURL : botInfo.avatarURL,
            content: mentionOwner,
            embeds: [
                {
                    color: bot.options.discordWebhook.embedColor,
                    author: {
                        name: `Trade from: ${personaName} #${tradesMade.toString()}`,
                        url: links.steam,
                        icon_url: avatarFull
                    },
                    description:
                        summary + (isShowQuickLinks ? `\n\n${quickLinks(partnerNameNoFormat, links)}\n` : '\n'),
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
                                    ? `\n🎒 Total items: ${currentItems +
                                          (backpackSlots !== 0 ? '/' + backpackSlots : '')}`
                                    : '') +
                                `\n⏱ Time taken: ${processTime} ms` +
                                (AdditionalNotes
                                    ? (isShowKeyRate || isShowPureStock || isShowInventory ? '\n' : '') +
                                      AdditionalNotes
                                    : `\n[View my backpack](https://backpack.tf/profiles/${botInfo.steamID})`)
                        }
                    ],
                    footer: {
                        text: `Offer #${offer.id} • SteamID: ${offer.partner.toString()} • ${time}`
                    }
                }
            ]
        };
        /*eslint-enable */

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

        tradeLinks.forEach((link, i) => {
            sendWebhook(link, acceptedTradeSummary, 'trade-summary', i)
                .then(() => {
                    log.debug(`✅ Sent summary (#${offer.id}) to Discord${tradeLinks.length > 1 ? `(${i + 1})` : ''}.`);
                })
                .catch(err => {
                    log.debug(
                        `❌ Failed to send trade-summary webhook (#${offer.id}) to Discord ${
                            tradeLinks.length > 1 ? ` (${i + 1})` : ''
                        }: `,
                        err
                    );
                });
        });
    });
}
