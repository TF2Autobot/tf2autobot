import Bot from './Bot';

import { XMLHttpRequest } from 'xmlhttprequest-ts';
import moment from 'moment-timezone';
import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import log from '../lib/logger';

export = class DiscordWebhook {
    private readonly bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    sendLowPureAlert(msg: string): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');
        const ownerID = process.env.DISCORD_OWNER_ID;
        const time = moment()
            .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC') //timezone format: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
            .format('MMMM Do YYYY, HH:mm:ss ZZ');
        /*eslint-disable */
        const discordQueue = {
            username: process.env.DISCORD_WEBHOOK_USERNAME,
            avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL,
            content: `<@!${ownerID}> [Something Wrong alert]: "${msg}" - ${time}`
        };
        /*eslint-enable */
        request.send(JSON.stringify(discordQueue));
    }

    sendQueueAlert(position: number): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');
        const ownerID = process.env.DISCORD_OWNER_ID;
        const time = moment()
            .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC') //timezone format: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
            .format('MMMM Do YYYY, HH:mm:ss ZZ');
        /*eslint-disable */
        const discordQueue = {
            username: process.env.DISCORD_WEBHOOK_USERNAME,
            avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL,
            content: `<@!${ownerID}> [Queue alert] Current position: ${position} - ${time}`
        };
        /*eslint-enable */
        request.send(JSON.stringify(discordQueue));
    }

    sendPartnerMessage(steamID: string, msg: string, theirName: string, theirAvatar: string): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_URL);
        request.setRequestHeader('Content-type', 'application/json');

        const time = moment()
            .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC') //timezone format: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
            .format('MMMM Do YYYY, HH:mm:ss ZZ');

        const partnerSteamID = steamID;
        const steamProfile = `https://steamcommunity.com/profiles/${partnerSteamID}`;
        const backpackTF = `https://backpack.tf/profiles/${partnerSteamID}`;
        const steamREP = `https://steamrep.com/profiles/${partnerSteamID}`;

        /*eslint-disable */
        const discordPartnerMsg = JSON.stringify({
            username: process.env.DISCORD_WEBHOOK_USERNAME,
            avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL,
            content: `<@!${process.env.DISCORD_OWNER_ID}>, new message! - ${partnerSteamID}`,
            embeds: [
                {
                    author: {
                        name: theirName,
                        url: `https://steamcommunity.com/profiles/${partnerSteamID}`,
                        icon_url: theirAvatar
                    },
                    footer: {
                        text: `Partner SteamID: ${partnerSteamID} • ${time}`
                    },
                    title: '',
                    description: `💬 ${msg}\n\n🔍 ${theirName}'s info:\n[Steam Profile](${steamProfile}) | [backpack.tf](${backpackTF}) | [steamREP](${steamREP})`,
                    color: process.env.DISCORD_WEBHOOK_EMBED_COLOR_IN_DECIMAL_INDEX
                }
            ]
        });
        /*eslint-enable */

        request.send(discordPartnerMsg);
    }

    sendOfferReview(
        offer: TradeOfferManager.TradeOffer,
        reason: string,
        pureStock: string[],
        valueDiff: number,
        valueDiffRef: number,
        valueDiffKey: string,
        time: string
    ): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_REVIEW_OFFER_URL);
        request.setRequestHeader('Content-type', 'application/json');

        const partnerSteamID = offer.partner.toString();
        const tradeSummary = offer.summarizeWithLink(this.bot.schema);

        const offerMessage = offer.message;
        const keyPrice = this.bot.pricelist.getKeyPrices();

        const steamProfile = `https://steamcommunity.com/profiles/${partnerSteamID}`;
        const backpackTF = `https://backpack.tf/profiles/${partnerSteamID}`;
        const steamREP = `https://steamrep.com/profiles/${partnerSteamID}`;

        let partnerAvatar: string;
        let partnerName: string;
        log.debug('getting partner Avatar and Name...');
        offer.getUserDetails(function(err, me, them) {
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

            const partnerNameNoFormat =
                partnerName.includes('_') || partnerName.includes('*') || partnerName.includes('~~')
                    ? partnerName
                          .replace(/_/g, '‗')
                          .replace(/\*/g, '★')
                          .replace(/~/g, '⁓')
                    : partnerName;

            const isShowQuickLinks = process.env.DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_QUICK_LINKS !== 'false';
            const isShowKeyRate = process.env.DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_KEY_RATE !== 'false';
            const isShowPureStock = process.env.DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_PURE_STOCK !== 'false';

            /*eslint-disable */
            const webhookReview = JSON.stringify({
                username: process.env.DISCORD_WEBHOOK_USERNAME,
                avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL,
                content: `<@!${process.env.DISCORD_OWNER_ID}>, check this! - ${offer.id}`,
                embeds: [
                    {
                        author: {
                            name: 'Offer from: ' + partnerName,
                            url: `https://steamcommunity.com/profiles/${partnerSteamID}`,
                            icon_url: partnerAvatar
                        },
                        footer: {
                            text: `Offer #${offer.id} • SteamID: ${partnerSteamID} • ${time}`
                        },
                        thumbnail: {
                            url: ''
                        },
                        title: '',
                        description:
                            `⚠️ An offer sent by ${partnerNameNoFormat} is waiting for review.\nReason: ${reason}\n\n__Offer Summary__:\n` +
                            tradeSummary.replace('Asked:', '**Asked:**').replace('Offered:', '**Offered:**') +
                            (valueDiff > 0
                                ? `\n📈 ***Profit from overpay:*** ${valueDiffRef} ref` +
                                  (valueDiffRef >= keyPrice.sell.metal ? ` (${valueDiffKey})` : '')
                                : valueDiff < 0
                                ? `\n📉 ***Loss from underpay:*** ${valueDiffRef} ref` +
                                  (valueDiffRef >= keyPrice.sell.metal ? ` (${valueDiffKey})` : '')
                                : '') +
                            (offerMessage.length !== 0 ? `\n\n💬 Offer message: _${offerMessage}_` : '') +
                            (isShowQuickLinks
                                ? `\n\n🔍 ${partnerNameNoFormat}'s info:\n[Steam Profile](${steamProfile}) | [backpack.tf](${backpackTF}) | [steamREP](${steamREP})\n`
                                : '\n') +
                            (isShowKeyRate
                                ? `\n🔑 Key rate: ${keyPrice.buy.metal.toString()}/${keyPrice.sell.metal.toString()} ref`
                                : '') +
                            (isShowPureStock ? `\n💰 Pure stock: ${pureStock.join(', ').toString()} ref` : ''),
                        color: process.env.DISCORD_WEBHOOK_EMBED_COLOR_IN_DECIMAL_INDEX
                    }
                ]
            });
            /*eslint-enable */
            request.send(webhookReview);
        });
    }

    sendTradeSummary(
        offer: TradeOfferManager.TradeOffer,
        isAutoKeysEnabled: boolean,
        isKeysBankingEnabled: boolean,
        autoKeysStatus: boolean,
        isBuyingKeys: boolean,
        isBankingKeys: boolean,
        pureStock: string[],
        valueDiff: number,
        valueDiffRef: number,
        valueDiffKey: string
    ): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_URL);
        request.setRequestHeader('Content-type', 'application/json');

        const partnerSteamID = offer.partner.toString();
        const tradeSummary = offer.summarizeWithLink(this.bot.schema);

        const skuSummary = offer.summarizeSKU();
        let skuFromEnv = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER_ONLY_ITEMS_SKU;
        if (skuFromEnv === '') {
            skuFromEnv = ';';
        }
        const mentionOwner =
            process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER === 'true' && skuSummary.includes(skuFromEnv)
                ? `<@!${process.env.DISCORD_OWNER_ID}>`
                : '';

        const time = moment()
            .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC') //timezone format: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
            .format('MMMM Do YYYY, HH:mm:ss ZZ');

        const keyPrice = this.bot.pricelist.getKeyPrices();

        const steamProfile = `https://steamcommunity.com/profiles/${partnerSteamID}`;
        const backpackTF = `https://backpack.tf/profiles/${partnerSteamID}`;
        const steamREP = `https://steamrep.com/profiles/${partnerSteamID}`;

        let tradesTotal = 0;
        const offerData = this.bot.manager.pollData.offerData;
        for (const offerID in offerData) {
            if (!Object.prototype.hasOwnProperty.call(offerData, offerID)) {
                continue;
            }

            if (offerData[offerID].handledByUs === true && offerData[offerID].isAccepted === true) {
                // Sucessful trades handled by the bot
                tradesTotal++;
            }
        }
        const tradesMade = process.env.TRADES_MADE_STARTER_VALUE
            ? +process.env.TRADES_MADE_STARTER_VALUE + tradesTotal
            : 0 + tradesTotal;

        let personaName: string;
        let avatarFull: string;
        log.debug('getting partner Avatar and Name...');
        this.getPartnerDetails(offer, function(err, details) {
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

            const partnerNameNoFormat =
                personaName.includes('_') || personaName.includes('*') || personaName.includes('~~')
                    ? personaName
                          .replace(/_/g, '‗')
                          .replace(/\*/g, '★')
                          .replace(/~/g, '⁓')
                    : personaName;

            const isShowQuickLinks = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_QUICK_LINKS !== 'false';
            const isShowKeyRate = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_KEY_RATE !== 'false';
            const isShowPureStock = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_PURE_STOCK !== 'false';
            const isShowAdditionalNotes =
                process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_ADDITIONAL_DESCRIPTION_NOTE !== 'false';

            /*eslint-disable */
            const acceptedTradeSummary = JSON.stringify({
                username: process.env.DISCORD_WEBHOOK_USERNAME,
                avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL,
                content: mentionOwner,
                embeds: [
                    {
                        author: {
                            name: `Trade from: ${personaName} #${tradesMade.toString()}`,
                            url: `https://steamcommunity.com/profiles/${partnerSteamID}`,
                            icon_url: avatarFull
                        },
                        footer: {
                            text: `Offer #${offer.id} • SteamID: ${partnerSteamID} • ${time}`
                        },
                        thumbnail: {
                            url: ''
                        },
                        title: '',
                        description:
                            `A trade with ${partnerNameNoFormat} has been marked as accepted.\n__Summary__:\n` +
                            tradeSummary.replace('Asked:', '**Asked:**').replace('Offered:', '**Offered:**') +
                            (valueDiff > 0
                                ? `\n📈 ***Profit from overpay:*** ${valueDiffRef} ref` +
                                  (valueDiffRef >= keyPrice.sell.metal ? ` (${valueDiffKey})` : '')
                                : valueDiff < 0
                                ? `\n📉 ***Loss from underpay:*** ${valueDiffRef} ref` +
                                  (valueDiffRef >= keyPrice.sell.metal ? ` (${valueDiffKey})` : '')
                                : '') +
                            (isShowQuickLinks
                                ? `\n\n🔍 ${partnerNameNoFormat}'s info:\n[Steam Profile](${steamProfile}) | [backpack.tf](${backpackTF}) | [steamREP](${steamREP})\n`
                                : '\n') +
                            (isShowKeyRate
                                ? `\n🔑 Key rate: ${keyPrice.buy.metal.toString()}/${keyPrice.sell.metal.toString()} ref` +
                                  `${
                                      isAutoKeysEnabled
                                          ? ' | Autokeys: ' +
                                            (autoKeysStatus
                                                ? '✅' +
                                                  (isKeysBankingEnabled
                                                      ? isBankingKeys
                                                          ? ' (banking)'
                                                          : isBuyingKeys
                                                          ? ' (buying)'
                                                          : ' (selling)'
                                                      : 'Not active')
                                                : '🛑')
                                          : ''
                                  }`
                                : '') +
                            (isShowPureStock ? `\n💰 Pure stock: ${pureStock.join(', ').toString()} ref` : '') +
                            (isShowAdditionalNotes
                                ? '\n' + process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_ADDITIONAL_DESCRIPTION_NOTE
                                : ''),
                        color: process.env.DISCORD_WEBHOOK_EMBED_COLOR_IN_DECIMAL_INDEX
                    }
                ]
            });
            /*eslint-enable */
            request.send(acceptedTradeSummary);
        });
    }

    private getPartnerDetails(offer: TradeOfferManager.TradeOffer, callback: (err: any, details: any) => void): any {
        // check state of the offer
        if (offer.state === TradeOfferManager.ETradeOfferState.active) {
            offer.getUserDetails(function(err, me, them) {
                if (err) {
                    callback(err, {});
                } else {
                    callback(null, them);
                }
            });
        } else {
            this.bot.community.getSteamUser(offer.partner, (err, user) => {
                if (err) {
                    callback(err, {});
                } else {
                    callback(null, {
                        personaName: user.name,
                        avatarFull: user.getAvatarURL('full')
                    });
                }
            });
        }
    }
};
