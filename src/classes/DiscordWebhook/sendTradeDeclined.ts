import { Action, TradeOffer } from '@tf2autobot/tradeoffer-manager';
import { getPartnerDetails, quickLinks, sendWebhook } from './utils';
import Bot from '../Bot';
import * as t from '../../lib/tools/export';
import log from '../../lib/logger';
import { Webhook } from './export';
import { sendToAdmin } from '../MyHandler/offer/processDeclined';

export default async function sendTradeDeclined(
    offer: TradeOffer,
    declined: Declined,
    bot: Bot,
    timeTakenToProcessOrConstruct: number,
    isOfferSent: boolean
): Promise<void> {
    const optBot = bot.options;
    const optDW = optBot.discordWebhook;

    const properName = bot.options.tradeSummary.showProperName;

    const isCountered: boolean = (offer.data('action') as Action)?.action === 'counter';
    const processCounterTime: number | undefined = offer.data('processCounterTime') as number;

    const itemsName = properName
        ? {
              invalid: declined.invalidItems,
              disabled: declined.disabledItems,
              overstock: declined.overstocked,
              understock: declined.understocked,
              duped: declined.dupedItems,
              dupedFailed: [],
              highValue: declined.highValue.concat(declined.highNotSellingItems)
          }
        : {
              invalid: declined.invalidItems.map(name => t.replace.itemName(name)), // 🟨_INVALID_ITEMS
              disabled: declined.disabledItems.map(name => t.replace.itemName(name)), // 🟧_DISABLED_ITEMS
              overstock: declined.overstocked.map(name => t.replace.itemName(name)), // 🟦_OVERSTOCKED
              understock: declined.understocked.map(name => t.replace.itemName(name)), // 🟩_UNDERSTOCKED
              duped: declined.dupedItems.map(name => t.replace.itemName(name)), // '🟫_DUPED_ITEMS'
              dupedFailed: [],
              highValue: declined.highValue.concat(declined.highNotSellingItems).map(name => t.replace.itemName(name))
          };

    const keyPrices = bot.pricelist.getKeyPrices;
    const value = t.valueDiff(offer);
    const summary = t.summarizeToChat(offer, bot, 'declined', true, value, false, isOfferSent);

    const details = await getPartnerDetails(offer, bot);

    const botInfo = bot.handler.getBotInfo;
    const links = t.generateLinks(offer.partner.toString());
    const misc = optDW.declinedTrade.misc;

    const itemList = t.listItems(offer, bot, itemsName, false);
    const slots = bot.tf2.backpackSlots;
    const autokeys = bot.handler.autokeys;
    const status = autokeys.getOverallStatus;

    const tDec = optBot.tradeSummary;
    const cT = tDec.customText;
    const cTTimeTaken = cT.timeTaken.discordWebhook ? cT.timeTaken.discordWebhook : '⏱ **Time taken:**';
    const cTKeyRate = cT.keyRate.discordWebhook ? cT.keyRate.discordWebhook : '🔑 Key rate:';
    const cTPureStock = cT.pureStock.discordWebhook ? cT.pureStock.discordWebhook : '💰 Pure stock:';
    const cTTotalItems = cT.totalItems.discordWebhook ? cT.totalItems.discordWebhook : '🎒 Total items:';

    const isCustomPricer = bot.pricelist.isUseCustomPricer;

    const partnerNameNoFormat = t.replace.specialChar(details.personaName);
    const message = t.replace.specialChar(offer.message);

    const declinedDescription = declined.reasonDescription;
    const declinedTradeSummary: Webhook = {
        username: optDW.displayName || botInfo.name,
        avatar_url: optDW.avatarURL || optDW.avatarURL,
        content: '',
        embeds: [
            {
                color: optDW.embedColor,
                author: {
                    name: `${details.personaName}`,
                    url: links.steam,
                    icon_url: details.avatarFull as string
                },
                description:
                    `⛔ An offer sent by ${declinedDescription ? partnerNameNoFormat : 'us'} was declined ${
                        isCountered ? ' (countered)' : ''
                    }${declinedDescription ? '\nReason: ' + declinedDescription : ''}` +
                    summary +
                    `\n${cTTimeTaken} ${t.convertTime(
                        null,
                        timeTakenToProcessOrConstruct,
                        processCounterTime,
                        isOfferSent,
                        tDec.showDetailedTimeTaken,
                        tDec.showTimeTakenInMS
                    )}` +
                    (message.length !== 0 ? `\n\n💬 Offer message: "${message}"` : '') +
                    (misc.showQuickLinks ? `\n\n${quickLinks(partnerNameNoFormat, links)}\n` : '\n'),
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

    if (itemList === '-' || itemList == '') {
        // just remove the first element of the fields array (__Item list__)
        declinedTradeSummary.embeds[0].fields.shift();
    } else if (itemList.length >= 1024) {
        // first get __Status__ element
        const statusElement = declinedTradeSummary.embeds[0].fields.pop();

        // now remove __Item list__, so now it should be empty
        declinedTradeSummary.embeds[0].fields.length = 0;

        const separate = itemList.split('@');
        const separateCount = separate.length;

        let newSentences = '';
        let j = 1;
        separate.forEach((sentence, i) => {
            if ((newSentences.length >= 800 || i === separateCount - 1) && !(j > 4)) {
                declinedTradeSummary.embeds[0].fields.push({
                    name: `__Item list ${j}__`,
                    value: newSentences.replace(/@/g, '')
                });

                if (i === separateCount - 1 || j > 4) {
                    declinedTradeSummary.embeds[0].fields.push(statusElement);
                }

                newSentences = '';
                j++;
            } else newSentences += sentence;
        });
    }

    const url = optDW.declinedTrade.url;

    url.forEach((link, i) => {
        sendWebhook(link, declinedTradeSummary, 'trade-declined', i).catch(err => {
            log.warn(
                `❌ Failed to send trade-declined webhook (#${offer.id}) to Discord ${
                    url.length > 1 ? `(${i + 1})` : ''
                }: `,
                err
            );

            const itemListx = t.listItems(offer, bot, itemsName, true);
            sendToAdmin(bot, offer, value, itemListx, keyPrices, isOfferSent, timeTakenToProcessOrConstruct);
        });
    });
}

interface Declined {
    //nonTf2Items: string[];
    highNotSellingItems: string[];
    overstocked: string[];
    understocked: string[];
    invalidItems: string[];
    disabledItems: string[];
    dupedItems: string[];
    reasonDescription: string;
    highValue: string[];
}
