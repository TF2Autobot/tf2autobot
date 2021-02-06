import { TradeOffer, ItemsDict } from 'steam-tradeoffer-manager';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies';
import { getPartnerDetails, quickLinks, sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../logger';
import * as t from '../tools/export';
import Bot from '../../classes/Bot';

export default async function sendTradeSummary(
    offer: TradeOffer,
    accepted: Accepted,
    bot: Bot,
    processTime: number,
    isTradingKeys: boolean,
    isOfferSent: boolean | undefined
): Promise<void> {
    const optBot = bot.options;
    const optDW = optBot.discordWebhook;

    const itemsName = {
        invalid: accepted.invalidItems.map(name => t.replace.itemName(name)), // 🟨_INVALID_ITEMS
        disabled: accepted.disabledItems.map(name => t.replace.itemName(name)), // 🟧_DISABLED_ITEMS
        overstock: accepted.overstocked.map(name => t.replace.itemName(name)), // 🟦_OVERSTOCKED
        understock: accepted.understocked.map(name => t.replace.itemName(name)), // 🟩_UNDERSTOCKED
        duped: [],
        dupedFailed: [],
        highValue: accepted.highValue.map(name => t.replace.itemName(name)) // 🔶_HIGH_VALUE_ITEMS
    };

    const keyPrices = bot.pricelist.getKeyPrices;
    const value = t.valueDiff(offer, keyPrices, isTradingKeys, optBot.miscSettings.showOnlyMetal.enable);
    const summary = t.summarizeToChat(offer, bot, 'summary-accepted', true, value, keyPrices, false, isOfferSent);

    // Mention owner on the sku(s) specified in discordWebhook.tradeSummary.mentionOwner.itemSkus
    const enableMentionOnSpecificSKU = optDW.tradeSummary.mentionOwner.enable;
    const skuToMention = optDW.tradeSummary.mentionOwner.itemSkus;

    const dict = offer.data('dict') as ItemsDict;

    const isMentionOurItems = enableMentionOnSpecificSKU
        ? skuToMention.some(fromEnv => {
              return Object.keys(dict.our).some(ourItemSKU => {
                  return ourItemSKU.includes(fromEnv);
              });
          })
        : false;

    const isMentionTheirItems = enableMentionOnSpecificSKU
        ? skuToMention.some(fromEnv => {
              return Object.keys(dict.their).some(theirItemSKU => {
                  return theirItemSKU.includes(fromEnv);
              });
          })
        : false;

    const valueToMention = optDW.tradeSummary.mentionOwner.tradeValueInRef;
    const isMentionOnGreaterValue = valueToMention > 0 ? value.ourValue >= Currencies.toScrap(valueToMention) : false;

    const IVAmount = itemsName.invalid.length;
    const HVAmount = itemsName.highValue.length;
    const isMentionHV = accepted.isMention;

    const mentionOwner =
        IVAmount > 0 || isMentionHV // Only mention on accepted 🟨_INVALID_ITEMS or 🔶_HIGH_VALUE_ITEMS
            ? `<@!${optDW.ownerID}> - Accepted ${
                  IVAmount > 0 && isMentionHV
                      ? `INVALID_ITEMS and High value ${pluralize('item', IVAmount + HVAmount)}`
                      : IVAmount > 0 && !isMentionHV
                      ? `INVALID_ITEMS ${pluralize('item', IVAmount)}`
                      : IVAmount === 0 && isMentionHV
                      ? `High Value ${pluralize('item', HVAmount)}`
                      : ''
              } trade here!`
            : optDW.tradeSummary.mentionOwner.enable &&
              (isMentionOurItems || isMentionTheirItems || isMentionOnGreaterValue)
            ? `<@!${optDW.ownerID}>`
            : '';

    log.debug('getting partner Avatar and Name...');
    const details = await getPartnerDetails(offer, bot);

    const botInfo = bot.handler.getBotInfo;
    const links = t.generateLinks(offer.partner.toString());
    const misc = optDW.tradeSummary.misc;

    const itemList = t.listItems(offer, bot, itemsName, false);
    const slots = bot.tf2.backpackSlots;
    const autokeys = bot.handler.autokeys;
    const status = autokeys.getOverallStatus;

    const acceptedTradeSummary: Webhook = {
        username: optDW.displayName ? optDW.displayName : botInfo.name,
        avatar_url: optDW.avatarURL ? optDW.avatarURL : botInfo.avatarURL,
        content: mentionOwner,
        embeds: [
            {
                color: optDW.embedColor,
                author: {
                    name: `${details.personaName}`,
                    url: links.steam,
                    icon_url: details.avatarFull as string
                },
                description:
                    summary +
                    `\n⏱ **Time taken:** ${t.convertTime(processTime, optBot.tradeSummary.showTimeTakenInMS)}\n\n` +
                    (misc.showQuickLinks ? `${quickLinks(t.replace.specialChar(details.personaName), links)}\n` : '\n'),
                fields: [
                    {
                        name: '__Item list__',
                        value: itemList.replace(/@/g, '')
                    },
                    {
                        name: `__Status__`,
                        value:
                            (misc.showKeyRate
                                ? `\n🔑 Key rate: ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref` +
                                  ` (${keyPrices.src === 'manual' ? 'manual' : 'prices.tf'})` +
                                  `${
                                      autokeys.isEnabled
                                          ? ' | Autokeys: ' +
                                            (autokeys.getActiveStatus
                                                ? '✅' +
                                                  (status.isBankingKeys
                                                      ? ' (banking)'
                                                      : status.isBuyingKeys
                                                      ? ' (buying)'
                                                      : ' (selling)')
                                                : '🛑')
                                          : ''
                                  }`
                                : '') +
                            (misc.showPureStock ? `\n💰 Pure stock: ${t.pure.stock(bot).join(', ').toString()}` : '') +
                            (misc.showInventory
                                ? `\n🎒 Total items: ${bot.inventoryManager.getInventory.getTotalItems}${
                                      slots !== undefined ? `/${slots}` : ''
                                  }`
                                : '') +
                            (misc.note
                                ? (misc.showKeyRate || misc.showPureStock || misc.showInventory ? '\n' : '') + misc.note
                                : `\n[View my backpack](https://backpack.tf/profiles/${botInfo.steamID.getSteamID64()})`)
                    }
                ],
                footer: {
                    text: `#${offer.id} • ${offer.partner.toString()} • ${t.timeNow(bot.options).time} • v${
                        process.env.BOT_VERSION
                    }`
                }
            }
        ]
    };

    if (itemList === '-' || itemList === '') {
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
                //
            } else newSentences += sentence;
        });
    }

    const url = optDW.tradeSummary.url;

    url.forEach((link, i) => {
        sendWebhook(link, acceptedTradeSummary, 'trade-summary', i)
            .then(() => log.debug(`✅ Sent summary (#${offer.id}) to Discord ${url.length > 1 ? `(${i + 1})` : ''}`))
            .catch(err =>
                log.debug(
                    `❌ Failed to send trade-summary webhook (#${offer.id}) to Discord ${
                        url.length > 1 ? `(${i + 1})` : ''
                    }: `,
                    err
                )
            );
    });
}

interface Accepted {
    invalidItems: string[];
    disabledItems: string[];
    overstocked: string[];
    understocked: string[];
    highValue: string[];
    isMention: boolean;
}

export interface ItemSKUList {
    their: string[];
    our: string[];
}
