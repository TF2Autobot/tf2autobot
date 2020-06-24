import Bot from './Bot';

import { XMLHttpRequest } from 'xmlhttprequest-ts';
import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import log from '../lib/logger';
import Currencies from 'tf2-currencies';
import { parseJSON } from '../lib/helpers';
import MyHandler from './MyHandler';

export = class DiscordWebhook {
    private readonly bot: Bot;

    private enableMentionOwner = false;

    private skuToMention: string[] = [];

    private ownerID: string;

    private botName: string;

    private botAvatarURL: string;

    private botEmbedColor: string;

    constructor(bot: Bot) {
        this.bot = bot;

        if (process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER === 'true') {
            this.enableMentionOwner = true;
        }

        const ownerID = process.env.DISCORD_OWNER_ID;
        this.ownerID = ownerID;

        const botName = process.env.DISCORD_WEBHOOK_USERNAME;
        this.botName = botName;

        const botAvatarURL = process.env.DISCORD_WEBHOOK_AVATAR_URL;
        this.botAvatarURL = botAvatarURL;

        const botEmbedColor = process.env.DISCORD_WEBHOOK_EMBED_COLOR_IN_DECIMAL_INDEX;
        this.botEmbedColor = botEmbedColor;

        let skuFromEnv = parseJSON(process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER_ONLY_ITEMS_SKU);
        if (skuFromEnv !== null && Array.isArray(skuFromEnv)) {
            skuFromEnv.forEach(function(sku: string) {
                if (sku === '' || !sku) {
                    skuFromEnv = [';'];
                }
            });
            this.skuToMention = skuFromEnv;
        } else {
            log.warn('You did not set items SKU to mention as an array, resetting to mention all items');
            this.skuToMention = [';'];
        }
    }

    sendLowPureAlert(msg: string, time: string): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');

        /*eslint-disable */
        const discordQueue = {
            username: this.botName,
            avatar_url: this.botAvatarURL,
            content: `<@!${this.ownerID}> [Something Wrong alert]: "${msg}" - ${time}`
        };
        /*eslint-enable */
        request.send(JSON.stringify(discordQueue));
    }

    sendQueueAlert(position: number, time: string): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');

        /*eslint-disable */
        const discordQueue = {
            username: this.botName,
            avatar_url: this.botAvatarURL,
            content: `<@!${this.ownerID}> [Queue alert] Current position: ${position}, automatic restart initialized... - ${time}`
        };
        /*eslint-enable */
        request.send(JSON.stringify(discordQueue));
    }

    sendQueueAlertFailedPM2(time: string): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');

        /*eslint-disable */
        const discordQueue = {
            username: this.botName,
            avatar_url: this.botAvatarURL,
            content: `<@!${this.ownerID}> ❌ Automatic restart on queue problem failed because are not running the bot with PM2! See the documentation: https://github.com/idinium96/tf2autobot/wiki/e.-Running-with-PM2 - ${time}`
        };
        /*eslint-enable */
        request.send(JSON.stringify(discordQueue));
    }

    sendQueueAlertFailedError(err: any, time: string): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');

        /*eslint-disable */
        const discordQueue = {
            username: this.botName,
            avatar_url: this.botAvatarURL,
            content: `<@!${this.ownerID}> ❌ An error occurred while trying to restart: ${err.message} - ${time}`
        };
        /*eslint-enable */
        request.send(JSON.stringify(discordQueue));
    }

    sendPartnerMessage(
        steamID: string,
        msg: string,
        theirName: string,
        theirAvatar: string,
        steamProfile: string,
        backpackTF: string,
        steamREP: string,
        time: string
    ): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_URL);
        request.setRequestHeader('Content-type', 'application/json');

        /*eslint-disable */
        const discordPartnerMsg = JSON.stringify({
            username: this.botName,
            avatar_url: this.botAvatarURL,
            content: `<@!${this.ownerID}>, new message! - ${steamID}`,
            embeds: [
                {
                    author: {
                        name: theirName,
                        url: steamProfile,
                        icon_url: theirAvatar
                    },
                    footer: {
                        text: `Partner SteamID: ${steamID} • ${time}`
                    },
                    title: '',
                    description: `💬 ${msg}\n\n🔍 ${theirName}'s info:\n[Steam Profile](${steamProfile}) | [backpack.tf](${backpackTF}) | [steamREP](${steamREP})`,
                    color: this.botEmbedColor
                }
            ]
        });
        /*eslint-enable */

        request.send(discordPartnerMsg);
    }

    sendOfferReview(
        offer: TradeOffer,
        reason: string,
        pureStock: string[],
        time: string,
        tradeSummary: string,
        offerMessage: string,
        keyPrice: { buy: Currencies; sell: Currencies },
        value: { diff: number; diffRef: number; diffKey: string },
        links: { steamProfile: string; backpackTF: string; steamREP: string },
        invalidItemsName: string[],
        overstockedItemsName: string[],
        dupedItemsName: string[],
        dupedFailedItemsName: string[]
    ): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_REVIEW_OFFER_URL);
        request.setRequestHeader('Content-type', 'application/json');

        let noMentionOnInvalidValue = false;
        if (process.env.DISCORD_WEBHOOK_REVIEW_OFFER_DISABLE_MENTION_INVALID_VALUE !== 'false') {
            if (
                reason.includes('🟥INVALID_VALUE') &&
                !(
                    reason.includes('🟨INVALID_ITEMS') ||
                    reason.includes('🟦OVERSTOCKED') ||
                    reason.includes('🟫DUPED_ITEMS') ||
                    reason.includes('🟪DUPE_CHECK_FAILED')
                )
            ) {
                noMentionOnInvalidValue = true;
            } else {
                noMentionOnInvalidValue = false;
            }
        }
        const mentionOwner = noMentionOnInvalidValue ? `${offer.id}` : `<@!${this.ownerID}>, check this! - ${offer.id}`;
        const botName = this.botName;
        const botAvatarURL = this.botAvatarURL;
        const botEmbedColor = this.botEmbedColor;

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
                username: botName,
                avatar_url: botAvatarURL,
                content: mentionOwner,
                embeds: [
                    {
                        author: {
                            name: 'Offer from: ' + partnerName,
                            url: links.steamProfile,
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
                            `⚠️ An offer sent by ${partnerNameNoFormat} is waiting for review.\nReason: ${reason}\n\n__Offer Summary__:\n` +
                            tradeSummary.replace('Asked:', '**Asked:**').replace('Offered:', '**Offered:**') +
                            (value.diff > 0
                                ? `\n📈 ***Profit from overpay:*** ${value.diffRef} ref` +
                                  (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
                                : value.diff < 0
                                ? `\n📉 ***Loss from underpay:*** ${value.diffRef} ref` +
                                  (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
                                : '') +
                            (offerMessage.length !== 0 ? `\n\n💬 Offer message: _${offerMessage}_` : '') +
                            `${
                                invalidItemsName.length !== 0
                                    ? `\n\n🟨INVALID_ITEMS - ${invalidItemsName.join(', ')}`
                                    : ''
                            }${
                                invalidItemsName.length !== 0 && overstockedItemsName.length !== 0
                                    ? `\n🟦OVERSTOCKED - ${overstockedItemsName.join(', ')}`
                                    : overstockedItemsName.length !== 0
                                    ? `\n\n🟦OVERSTOCKED - ${overstockedItemsName.join(', ')}`
                                    : ''
                            }${
                                (invalidItemsName.length !== 0 || overstockedItemsName.length !== 0) &&
                                dupedItemsName.length !== 0
                                    ? `\n🟫DUPED_ITEMS - ${dupedItemsName.join(', ')}`
                                    : dupedItemsName.length !== 0
                                    ? `\n\n🟫DUPED_ITEMS - ${dupedItemsName.join(', ')}`
                                    : ''
                            }${
                                (invalidItemsName.length !== 0 ||
                                    overstockedItemsName.length !== 0 ||
                                    dupedItemsName.length !== 0) &&
                                dupedFailedItemsName.length !== 0
                                    ? `\n🟪DUPE_CHECK_FAILED - ${dupedFailedItemsName.join(', ')}`
                                    : dupedFailedItemsName.length !== 0
                                    ? `\n\n🟪DUPE_CHECK_FAILED - ${dupedFailedItemsName.join(', ')}`
                                    : ''
                            }` +
                            (isShowQuickLinks
                                ? `\n\n🔍 ${partnerNameNoFormat}'s info:\n[Steam Profile](${links.steamProfile}) | [backpack.tf](${links.backpackTF}) | [steamREP](${links.steamREP})\n`
                                : '\n') +
                            (isShowKeyRate
                                ? `\n🔑 Key rate: ${keyPrice.buy.metal.toString()}/${keyPrice.sell.metal.toString()} ref`
                                : '') +
                            (isShowPureStock ? `\n💰 Pure stock: ${pureStock.join(', ').toString()} ref` : ''),
                        color: botEmbedColor
                    }
                ]
            });
            /*eslint-enable */
            request.send(webhookReview);
        });
    }

    sendTradeSummary(
        offer: TradeOffer,
        isAutoKeysEnabled: boolean,
        autoKeysStatus: boolean,
        isBuyingKeys: boolean,
        isBankingKeys: boolean,
        tradeSummary: string,
        pureStock: string[],
        keyPrice: { buy: Currencies; sell: Currencies },
        value: { diff: number; diffRef: number; diffKey: string },
        items: { their: string[]; our: string[] },
        links: { steamProfile: string; backpackTF: string; steamREP: string },
        time: string
    ): void {
        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_URL);
        request.setRequestHeader('Content-type', 'application/json');

        const ourItems = items.our;
        const theirItems = items.their;

        const isMentionOurItems = this.skuToMention.some((fromEnv: string) => {
            return ourItems.some((ourItemSKU: string) => {
                return ourItemSKU.includes(fromEnv);
            });
        });

        const isMentionThierItems = this.skuToMention.some((fromEnv: string) => {
            return theirItems.some((theirItemSKU: string) => {
                return theirItemSKU.includes(fromEnv);
            });
        });

        const mentionOwner =
            this.enableMentionOwner === true && (isMentionOurItems || isMentionThierItems) ? `<@!${this.ownerID}>` : '';
        const botName = this.botName;
        const botAvatarURL = this.botAvatarURL;
        const botEmbedColor = this.botEmbedColor;

        const tradeNumbertoShowStarter = parseInt(process.env.TRADES_MADE_STARTER_VALUE);
        const trades = (this.bot.handler as MyHandler).polldata();
        const tradesMade =
            tradeNumbertoShowStarter !== 0 && !isNaN(tradeNumbertoShowStarter)
                ? tradeNumbertoShowStarter + trades.tradesTotal
                : trades.tradesTotal;

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
            const AdditionalNotes = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_ADDITIONAL_DESCRIPTION_NOTE;

            /*eslint-disable */
            const acceptedTradeSummary = JSON.stringify({
                username: botName,
                avatar_url: botAvatarURL,
                content: mentionOwner,
                embeds: [
                    {
                        author: {
                            name: `Trade from: ${personaName} #${tradesMade.toString()}`,
                            url: links.steamProfile,
                            icon_url: avatarFull
                        },
                        footer: {
                            text: `Offer #${offer.id} • SteamID: ${offer.partner.toString()} • ${time}`
                        },
                        thumbnail: {
                            url: ''
                        },
                        title: '',
                        description:
                            `A trade with ${partnerNameNoFormat} has been marked as accepted.\n__Summary__:\n` +
                            tradeSummary.replace('Asked:', '**Asked:**').replace('Offered:', '**Offered:**') +
                            (value.diff > 0
                                ? `\n📈 ***Profit from overpay:*** ${value.diffRef} ref` +
                                  (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
                                : value.diff < 0
                                ? `\n📉 ***Loss from underpay:*** ${value.diffRef} ref` +
                                  (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
                                : '') +
                            (isShowQuickLinks
                                ? `\n\n🔍 ${partnerNameNoFormat}'s info:\n[Steam Profile](${links.steamProfile}) | [backpack.tf](${links.backpackTF}) | [steamREP](${links.steamREP})\n`
                                : '\n') +
                            (isShowKeyRate
                                ? `\n🔑 Key rate: ${keyPrice.buy.metal.toString()}/${keyPrice.sell.metal.toString()} ref` +
                                  `${
                                      isAutoKeysEnabled
                                          ? ' | Autokeys: ' +
                                            (autoKeysStatus
                                                ? '✅' +
                                                  (isBankingKeys
                                                      ? ' (banking)'
                                                      : isBuyingKeys
                                                      ? ' (buying)'
                                                      : ' (selling)')
                                                : '🛑')
                                          : ''
                                  }`
                                : '') +
                            (isShowPureStock ? `\n💰 Pure stock: ${pureStock.join(', ').toString()} ref` : '') +
                            (AdditionalNotes ? '\n' + AdditionalNotes : ''),
                        color: botEmbedColor
                    }
                ]
            });
            /*eslint-enable */
            request.send(acceptedTradeSummary);
        });
    }

    private getPartnerDetails(offer: TradeOffer, callback: (err: any, details: any) => void): any {
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
