import { TradeOffer, ItemsDict } from '@tf2autobot/tradeoffer-manager';
import pluralize from 'pluralize';
import Currencies from '@tf2autobot/tf2-currencies';
import { getPartnerDetails, quickLinks, sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../../lib/logger';
import * as t from '../../lib/tools/export';
import Bot from '../Bot';
import { sendToAdmin } from '../MyHandler/offer/accepted/processAccepted';

export default async function sendTradeSummary(
    offer: TradeOffer,
    accepted: Accepted,
    bot: Bot,
    timeTakenToComplete: number,
    timeTakenToProcessOrConstruct: number,
    timeTakenToCounterOffer: number | undefined,
    isOfferSent: boolean | undefined
): Promise<void> {
    const optBot = bot.options;
    const optDW = optBot.discordWebhook;

    const properName = bot.options.tradeSummary.showProperName;

    const itemsName = properName
        ? {
              invalid: accepted.invalidItems,
              disabled: accepted.disabledItems,
              overstock: accepted.overstocked,
              understock: accepted.understocked,
              duped: [],
              dupedFailed: [],
              highValue: accepted.highValue
          }
        : {
              invalid: accepted.invalidItems.map(name => t.replace.itemName(name)), // 🟨_INVALID_ITEMS
              disabled: accepted.disabledItems.map(name => t.replace.itemName(name)), // 🟧_DISABLED_ITEMS
              overstock: accepted.overstocked.map(name => t.replace.itemName(name)), // 🟦_OVERSTOCKED
              understock: accepted.understocked.map(name => t.replace.itemName(name)), // 🟩_UNDERSTOCKED
              duped: [],
              dupedFailed: [],
              highValue: accepted.highValue.map(name => t.replace.itemName(name)) // 🔶_HIGH_VALUE_ITEMS
          };

    const keyPrices = bot.pricelist.getKeyPrices;
    const value = t.valueDiff(offer);
    const summary = t.summarizeToChat(offer, bot, 'summary-accepted', true, value, false, isOfferSent);

    // Mention owner on the sku(s) specified in discordWebhook.tradeSummary.mentionOwner.itemSkus
    const enableMentionOnSpecificSKU = optDW.tradeSummary.mentionOwner.enable;
    const skuToMention = optDW.tradeSummary.mentionOwner.itemSkus;

    const dict = offer.data('dict') as ItemsDict;

    let isMentionOurItems = false;
    let isMentionTheirItems = false;

    if (skuToMention.length > 0 && enableMentionOnSpecificSKU) {
        const ourItems = Object.keys(dict.our);
        isMentionOurItems = skuToMention.some(sku => {
            return ourItems.some(ourItemSKU => {
                return ourItemSKU.includes(sku);
            });
        });

        const theirItems = Object.keys(dict.their);
        isMentionTheirItems = skuToMention.some(sku => {
            return theirItems.some(theirItemSKU => {
                return theirItemSKU.includes(sku);
            });
        });
    }

    const valueToMention = optDW.tradeSummary.mentionOwner.tradeValueInRef;
    const isMentionOnGreaterValue = valueToMention > 0 ? value.ourValue >= Currencies.toScrap(valueToMention) : false;

    const IVAmount = itemsName.invalid.length;
    const HVAmount = itemsName.highValue.length;
    const isMentionHV = accepted.isMention;

    const mentionOwner =
        (IVAmount > 0 || isMentionHV) && optDW.ownerID.length > 0 // Only mention on accepted 🟨_INVALID_ITEMS or 🔶_HIGH_VALUE_ITEMS
            ? optDW.ownerID.map(id => `<@!${id}>`).join(', ') +
              ` - Accepted ${
                  IVAmount > 0 && isMentionHV
                      ? `INVALID_ITEMS and High value ${pluralize('item', IVAmount + HVAmount)}`
                      : IVAmount > 0 && !isMentionHV
                      ? `INVALID_ITEMS ${pluralize('item', IVAmount)}`
                      : IVAmount === 0 && isMentionHV
                      ? `High Value ${pluralize('item', HVAmount)}`
                      : ''
              } trade here!`
            : optDW.tradeSummary.mentionOwner.enable &&
              optDW.ownerID.length > 0 &&
              (isMentionOurItems || isMentionTheirItems || isMentionOnGreaterValue)
            ? optDW.ownerID.map(id => `<@!${id}>`).join(', ')
            : '';

    const details = await getPartnerDetails(offer, bot);

    const botInfo = bot.handler.getBotInfo;
    const links = t.generateLinks(offer.partner.toString());
    const misc = optDW.tradeSummary.misc;

    const itemList = t.listItems(offer, bot, itemsName, false);
    const slots = bot.tf2.backpackSlots;
    const autokeys = bot.handler.autokeys;
    const status = autokeys.getOverallStatus;
    const isShowOfferMessage = optBot.tradeSummary.showOfferMessage;

    const tSum = optBot.tradeSummary;
    const cT = tSum.customText;
    const cTTimeTaken = cT.timeTaken.discordWebhook ? cT.timeTaken.discordWebhook : '⏱ **Time taken:**';
    const cTKeyRate = cT.keyRate.discordWebhook ? cT.keyRate.discordWebhook : '🔑 Key rate:';
    const cTPureStock = cT.pureStock.discordWebhook ? cT.pureStock.discordWebhook : '💰 Pure stock:';
    const cTTotalItems = cT.totalItems.discordWebhook ? cT.totalItems.discordWebhook : '🎒 Total items:';
    const cTOfferMessage = cT.offerMessage.discordWebhook ? cT.offerMessage.discordWebhook : '💬 **Offer message:**';

    const message = t.replace.specialChar(offer.message);

    const isCustomPricer = bot.pricelist.isUseCustomPricer;

    const acceptedTradeSummary: Webhook = {
        username: optDW.displayName || botInfo.name,
        avatar_url: optDW.avatarURL || botInfo.avatarURL,
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
                    `\n${cTTimeTaken} ${t.convertTime(
                        timeTakenToComplete,
                        timeTakenToProcessOrConstruct,
                        timeTakenToCounterOffer,
                        isOfferSent,
                        tSum.showDetailedTimeTaken,
                        tSum.showTimeTakenInMS
                    )}\n\n` +
                    (isShowOfferMessage && message.length !== 0
                        ? (cTOfferMessage ? cTOfferMessage : '💬 Offer message:') + ` "${message}"\n\n`
                        : '') +
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
                                ? `\n${cTKeyRate} ${keyPrices.buy.metal.toString()}/${keyPrices.sell.metal.toString()} ref` +
                                  ` (${
                                      keyPrices.src === 'manual'
                                          ? 'manual'
                                          : isCustomPricer
                                          ? 'custom-pricer'
                                          : 'prices.tf'
                                  })` +
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
                            (misc.showPureStock ? `\n${cTPureStock} ${t.pure.stock(bot).join(', ').toString()}` : '') +
                            (misc.showInventory
                                ? `\n${cTTotalItems} ${bot.inventoryManager.getInventory.getTotalItems}${
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
        const separateCount = separate.length;

        let newSentences = '';
        let j = 1;
        separate.forEach((sentence, i) => {
            if ((newSentences.length >= 800 || i === separateCount - 1) && !(j > 4)) {
                acceptedTradeSummary.embeds[0].fields.push({
                    name: `__Item list ${j}__`,
                    value: newSentences.replace(/@/g, '')
                });

                if (i === separateCount - 1 || j > 4) {
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
        sendWebhook(link, acceptedTradeSummary, 'trade-summary', i).catch(err => {
            log.warn(
                `❌ Failed to send trade-summary webhook (#${offer.id}) to Discord ${
                    url.length > 1 ? `(${i + 1})` : ''
                }: `,
                err
            );

            const itemListx = t.listItems(offer, bot, itemsName, true);

            void sendToAdmin(
                bot,
                offer,
                value,
                itemListx,
                keyPrices,
                isOfferSent,
                timeTakenToComplete,
                timeTakenToProcessOrConstruct,
                timeTakenToCounterOffer
            );
        });
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
