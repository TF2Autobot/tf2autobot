import Bot from './Bot';

import { XMLHttpRequest } from 'xmlhttprequest-ts';
import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import log from '../lib/logger';
import Currencies from 'tf2-currencies';
import { parseJSON } from '../lib/helpers';
import MyHandler from './MyHandler';

export = class DiscordWebhookClass {
    private readonly bot: Bot;

    private enableMentionOwner = false;

    private skuToMention: string[] = [];

    private ownerID: string;

    private botName: string;

    private botAvatarURL: string;

    private botEmbedColor: string;

    tradeSummaryLinks: string[];

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

        let links = parseJSON(process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_URL);
        if (links !== null && Array.isArray(links)) {
            links.forEach(function(sku: string) {
                if (sku === '' || !sku) {
                    links = [''];
                }
            });
            this.tradeSummaryLinks = links;
        } else {
            log.warn('You did not set Discord Webhook URL as an array, resetting to blank');
            this.tradeSummaryLinks = [''];
        }

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
        /*eslint-disable */
        const pureAlert = JSON.stringify({
            username: this.botName,
            avatar_url: this.botAvatarURL,
            content: `<@!${this.ownerID}> [Something Wrong alert]: "${msg}" - ${time}`
        });
        /*eslint-enable */

        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(pureAlert);
    }

    sendQueueAlert(position: number, time: string): void {
        /*eslint-disable */
        const discordQueue = JSON.stringify({
            username: this.botName,
            avatar_url: this.botAvatarURL,
            content: `<@!${this.ownerID}> [Queue alert] Current position: ${position}, automatic restart initialized... - ${time}`
        });
        /*eslint-enable */

        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(discordQueue);
    }

    sendQueueAlertFailedPM2(time: string): void {
        /*eslint-disable */
        const queueAlertFailed = JSON.stringify({
            username: this.botName,
            avatar_url: this.botAvatarURL,
            content: `<@!${this.ownerID}> ❌ Automatic restart on queue problem failed because are not running the bot with PM2! See the documentation: https://github.com/idinium96/tf2autobot/wiki/e.-Running-with-PM2 - ${time}`
        });
        /*eslint-enable */

        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(queueAlertFailed);
    }

    sendQueueAlertFailedError(err: any, time: string): void {
        /*eslint-disable */
        const queueAlertError = JSON.stringify({
            username: this.botName,
            avatar_url: this.botAvatarURL,
            content: `<@!${this.ownerID}> ❌ An error occurred while trying to restart: ${err.message} - ${time}`
        });
        /*eslint-enable */

        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(queueAlertError);
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
                    description: `💬 ${msg}\n\n${quickLinks(theirName, { steamProfile, backpackTF, steamREP })}`,
                    color: this.botEmbedColor
                }
            ]
        });
        /*eslint-enable */

        const request = new XMLHttpRequest();
        request.open('POST', process.env.DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_URL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(discordPartnerMsg);
    }

    sendOfferReview(
        offer: TradeOffer,
        reasons: string,
        time: string,
        keyPrice: { buy: Currencies; sell: Currencies },
        value: { diff: number; diffRef: number; diffKey: string },
        links: { steamProfile: string; backpackTF: string; steamREP: string },
        items: {
            invalid: string[];
            overstock: string[];
            understock: string[];
            duped: string[];
            dupedFailed: string[];
        }
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
        const mentionOwner = noMentionOnInvalidValue ? `${offer.id}` : `<@!${this.ownerID}>, check this! - ${offer.id}`;
        const botName = this.botName;
        const botAvatarURL = this.botAvatarURL;
        const botEmbedColor = this.botEmbedColor;

        const pureStock = (this.bot.handler as MyHandler).pureStock();

        const message = replaceSpecialChar(offer.message);

        const itemsName = {
            invalid: items.invalid.map(name => replaceItemName(name)),
            overstock: items.overstock.map(name => replaceItemName(name)),
            understock: items.understock.map(name => replaceItemName(name)),
            duped: items.duped.map(name => replaceItemName(name)),
            dupedFailed: items.dupedFailed.map(name => replaceItemName(name))
        };

        const isShowQuickLinks = process.env.DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_QUICK_LINKS !== 'false';
        const isShowKeyRate = process.env.DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_KEY_RATE !== 'false';
        const isShowPureStock = process.env.DISCORD_WEBHOOK_REVIEW_OFFER_SHOW_PURE_STOCK !== 'false';

        const summary = summarize(offer.summarizeWithLink(this.bot.schema), value, keyPrice);

        const itemList = listItems(itemsName);

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

            const partnerNameNoFormat = replaceSpecialChar(partnerName);

            /*eslint-disable */
            const webhookReview = {
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
                            `⚠️ An offer sent by ${partnerNameNoFormat} is waiting for review.\nReasons: ${reasons}` +
                            (reasons.includes('⬜_BANNED_CHECK_FAILED')
                                ? '\n\n`Backpack.tf down, please manually check if this person is banned before accepting the offer.`'
                                : reasons.includes('⬜_ESCROW_CHECK_FAILED')
                                ? '\n\n`Steam down, please manually check if this person have escrow.`'
                                : '') +
                            summary +
                            (offer.message.length !== 0 ? `\n\n💬 Offer message: _${message}_` : '') +
                            (isShowQuickLinks ? `\n\n${quickLinks(partnerNameNoFormat, links)}\n` : '\n'),
                        fields: [
                            {
                                name: '__**Item list**__',
                                value: itemList
                            },
                            {
                                name: '__**Status**__',
                                value:
                                    (isShowKeyRate
                                        ? `\n🔑 Key rate: ${keyPrice.buy.metal.toString()}/${keyPrice.sell.metal.toString()} ref`
                                        : '') +
                                    (isShowPureStock ? `\n💰 Pure stock: ${pureStock.join(', ').toString()}` : '')
                            }
                        ],
                        color: botEmbedColor
                    }
                ]
            };

            /*eslint-enable */

            if (itemList === '-') {
                // if Item list field is empty, remove it (for 🟥_INVALID_VALUE/⬜_ESCROW_CHECK_FAILED/⬜_BANNED_CHECK_FAILED)
                webhookReview.embeds[0].fields.shift();
            }

            const request = new XMLHttpRequest();
            request.open('POST', process.env.DISCORD_WEBHOOK_REVIEW_OFFER_URL);
            request.setRequestHeader('Content-type', 'application/json');
            request.send(JSON.stringify(webhookReview));
        });
    }

    sendTradeSummary(
        offer: TradeOffer,
        autokeys: { isEnabled: boolean; isActive: boolean; isBuying: boolean; isBanking: boolean },
        currentItems: number,
        backpackSlots: number,
        invalidItemsCombine: string[],
        keyPrice: { buy: Currencies; sell: Currencies },
        value: { diff: number; diffRef: number; diffKey: string },
        items: { their: string[]; our: string[] },
        links: { steamProfile: string; backpackTF: string; steamREP: string },
        time: string
    ): void {
        const ourItems = items.our;
        const theirItems = items.their;

        // Give INVALID_ITEMS imported from MyHandler
        const invalidItems: string[] = [];
        invalidItemsCombine.forEach(name => {
            invalidItems.push(replaceItemName(name));
        });

        // Mention owner on the sku(s) specified in DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER_ONLY_ITEMS_SKU
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
            this.enableMentionOwner === true && (isMentionOurItems || isMentionThierItems)
                ? `<@!${this.ownerID}>`
                : invalidItems.length !== 0
                ? `<@!${this.ownerID}> - Accepted INVALID_ITEMS trade here!`
                : '';

        const botName = this.botName;
        const botAvatarURL = this.botAvatarURL;
        const botEmbedColor = this.botEmbedColor;

        const tradeNumbertoShowStarter = parseInt(process.env.TRADES_MADE_STARTER_VALUE);
        const trades = (this.bot.handler as MyHandler).polldata();
        const tradesMade =
            tradeNumbertoShowStarter !== 0 && !isNaN(tradeNumbertoShowStarter)
                ? tradeNumbertoShowStarter + trades.tradesTotal
                : trades.tradesTotal;

        const summary = summarize(offer.summarizeWithLink(this.bot.schema), value, keyPrice);

        const pureStock = (this.bot.handler as MyHandler).pureStock();

        const tradeLinks = this.tradeSummaryLinks;

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

            const partnerNameNoFormat = replaceSpecialChar(personaName);

            const isShowQuickLinks = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_QUICK_LINKS !== 'false';
            const isShowKeyRate = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_KEY_RATE !== 'false';
            const isShowPureStock = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_PURE_STOCK !== 'false';
            const isShowInventory = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_SHOW_INVENTORY !== 'false';
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
                            summary +
                            (invalidItems.length !== 0 ? '\n\n🟨`_INVALID_ITEMS:`\n' + invalidItems.join(',\n') : '') +
                            (isShowQuickLinks ? `\n\n${quickLinks(partnerNameNoFormat, links)}\n` : '\n'),
                        fields: [
                            {
                                name: '__Status__',
                                value:
                                    (isShowKeyRate
                                        ? `\n🔑 Key rate: ${keyPrice.buy.metal.toString()}/${keyPrice.sell.metal.toString()} ref` +
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
                                    (AdditionalNotes ? '\n' + AdditionalNotes : '')
                            }
                        ],
                        color: botEmbedColor
                    }
                ]
            });
            /*eslint-enable */

            tradeLinks.forEach((link, i) => {
                const request = new XMLHttpRequest();
                request.open('POST', link);
                request.setRequestHeader('Content-type', 'application/json');
                // remove mention owner on the second or more links, so the owner will not getting mentioned on the other servers.
                request.send(i > 0 ? acceptedTradeSummary.replace(/<@!\d+>/g, '') : acceptedTradeSummary);
            });
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

function summarize(
    trade: string,
    value: { diff: number; diffRef: number; diffKey: string },
    keyPrice: { buy: Currencies; sell: Currencies }
): string {
    const summary =
        `\n\n__**Summary**__\n` +
        trade.replace('Asked:', '**Asked:**').replace('Offered:', '**Offered:**') +
        (value.diff > 0
            ? `\n📈 ***Profit from overpay:*** ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : value.diff < 0
            ? `\n📉 ***Loss from underpay:*** ${value.diffRef} ref` +
              (value.diffRef >= keyPrice.sell.metal ? ` (${value.diffKey})` : '')
            : '');
    return summary;
}

function listItems(items: {
    invalid: string[];
    overstock: string[];
    understock: string[];
    duped: string[];
    dupedFailed: string[];
}): string {
    let list = items.invalid.length !== 0 ? '🟨`_INVALID_ITEMS:`\n- ' + items.invalid.join(',\n- ') : '';
    list +=
        items.overstock.length !== 0
            ? (items.invalid.length !== 0 ? '\n' : '') + '🟦`_OVERSTOCKED:`\n- ' + items.overstock.join(',\n- ')
            : '';
    list +=
        items.understock.length !== 0
            ? (items.invalid.length !== 0 || items.overstock.length !== 0 ? '\n' : '') +
              '🟩`_UNDERSTOCKED:`\n- ' +
              items.understock.join(',\n- ')
            : '';
    list +=
        items.duped.length !== 0
            ? (items.invalid.length !== 0 || items.overstock.length !== 0 || items.understock.length !== 0
                  ? '\n'
                  : '') +
              '🟫`_DUPED_ITEMS:`\n- ' +
              items.duped.join(',\n- ')
            : '';
    list +=
        items.dupedFailed.length !== 0
            ? (items.invalid.length !== 0 ||
              items.overstock.length !== 0 ||
              items.understock.length !== 0 ||
              items.duped.length !== 0
                  ? '\n'
                  : '') +
              '🟪`_DUPE_CHECK_FAILED:`\n- ' +
              items.dupedFailed.join(',\n- ')
            : '';

    if (list.length === 0) {
        list = '-';
    }
    return list;
}

function quickLinks(name: string, links: { steamProfile: string; backpackTF: string; steamREP: string }): string {
    return `🔍 ${name}'s info:\n[Steam Profile](${links.steamProfile}) | [backpack.tf](${links.backpackTF}) | [steamREP](${links.steamREP})`;
}

function replaceItemName(name: string): string {
    if (!name) {
        // if undefined, just return untouched.
        return name;
    } else {
        return name
            .replace(/Non-Craftable/g, 'NC')
            .replace(/Professional Killstreak/g, 'Pro KS')
            .replace(/Specialized Killstreak/g, 'Spec KS')
            .replace(/Killstreak/g, 'KS');
    }
}

function replaceSpecialChar(toChange: string): string {
    return toChange
        .replace(/_/g, '‗')
        .replace(/\*/g, '★')
        .replace(/~/g, '💫')
        .replace(/`/g, '💫')
        .replace(/>/g, '💫')
        .replace(/\|/g, '💫')
        .replace(/\\/g, '💫')
        .replace(/\(/g, '💫')
        .replace(/\)/g, '💫')
        .replace(/\[/g, '💫')
        .replace(/\]/g, '💫');
}
