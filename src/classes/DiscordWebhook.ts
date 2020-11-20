import Bot from './Bot';

import { XMLHttpRequest } from 'xmlhttprequest-ts';
import TradeOfferManager, { TradeOffer } from 'steam-tradeoffer-manager';
import log from '../lib/logger';
import Currencies from 'tf2-currencies';
import MyHandler from './MyHandler';
import pluralize from 'pluralize';

export = class DiscordWebhookClass {
    private readonly bot: Bot;

    private enableMentionOwner = false;

    private skuToMention: string[] = [];

    tradeSummaryLinks: string[];

    constructor(bot: Bot) {
        this.bot = bot;

        if (this.bot.options.discordWebhookTradeSummaryMentionOwner) {
            this.enableMentionOwner = true;
        }

        let links = this.bot.options.discordWebhookTradeSummaryURL;
        if (links !== null && Array.isArray(links)) {
            links.forEach((sku: string) => {
                if (sku === '' || !sku) {
                    links = [];
                }
            });
            this.tradeSummaryLinks = links;
        } else {
            log.warn('You did not set Discord Webhook URL as an array, resetting to an empty array.');
            this.tradeSummaryLinks = [];
        }

        let skuFromEnv = this.bot.options.discordWebhookTradeSummaryMentionOwnerOnlyItemsSKU;
        if (skuFromEnv !== null && Array.isArray(skuFromEnv)) {
            skuFromEnv.forEach((sku: string) => {
                if (sku === '' || !sku) {
                    skuFromEnv = ['Not set'];
                }
            });
            this.skuToMention = skuFromEnv;
        } else {
            log.warn('You did not set items SKU to mention as an array, mention on specific items disabled.');
            this.skuToMention = ['Not set'];
        }
    }

    sendAlert(
        type: string,
        msg: string | null,
        position: number | null,
        err: any | null,
        items: string[] | null
    ): void {
        const time = (this.bot.handler as MyHandler).timeWithEmoji();

        let title;
        let description;
        let color;

        if (type === 'lowPure') {
            title = 'Low Pure Alert';
            description = msg;
            color = '16776960'; // yellow
        } else if (type === 'queue') {
            title = 'Queue Alert';
            description = `[Queue alert] Current position: ${position}, automatic restart initialized...`;
            color = '16711680'; // red
        } else if (type === 'failedPM2') {
            title = 'Automatic restart failed - no PM2';
            description = `❌ Automatic restart on queue problem failed because are not running the bot with PM2! Get a VPS and run your bot with PM2: https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS`;
            color = '16711680'; // red
        } else if (type === 'failedError') {
            title = 'Automatic restart failed - Error';
            description = `❌ An error occurred while trying to restart: ${err.message}`;
            color = '16711680'; // red
        } else if (type === 'highValuedDisabled') {
            title = 'Temporarily disabled items with High value attachments';
            description = msg;
            color = '8323327'; // purple
        } else {
            title = 'High Valued Items';
            description = `Someone is trying to take your **${items.join(', ')}** that is not in your pricelist.`;
            color = '8323327'; // purple
        }

        const botInfo = (this.bot.handler as MyHandler).getBotInfo();

        /*eslint-disable */
        const webhook = JSON.stringify({
            username: this.bot.options.discordWebhookUserName ? this.bot.options.discordWebhookUserName : botInfo.name,
            avatar_url: this.bot.options.discordWebhookAvatarURL
                ? this.bot.options.discordWebhookAvatarURL
                : botInfo.avatarURL,
            content: type === 'highValue' || type === 'highValuedDisabled' ? `<@!${this.bot.options.discordOwnerID}>` : '',
            embeds: [
                {
                    title: title,
                    description: description,
                    color: color,
                    footer: {
                        text: time.time
                    }
                }
            ]
        });
        /*eslint-enable */

        const request = new XMLHttpRequest();
        request.open('POST', this.bot.options.discordWebhookSomethingWrongAlertURL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(webhook);
    }

    sendPartnerMessage(
        steamID: string,
        msg: string,
        their: { player_name: string; avatar_url_full: string },
        links: { steam: string; bptf: string; steamrep: string },
        time: string
    ): void {
        const botInfo = (this.bot.handler as MyHandler).getBotInfo();

        /*eslint-disable */
        const discordPartnerMsg = JSON.stringify({
            username: this.bot.options.discordWebhookUserName ? this.bot.options.discordWebhookUserName : botInfo.name,
            avatar_url: this.bot.options.discordWebhookAvatarURL
                ? this.bot.options.discordWebhookAvatarURL
                : botInfo.avatarURL,
            content: `<@!${this.bot.options.discordOwnerID}>, new message! - ${steamID}`,
            embeds: [
                {
                    author: {
                        name: their.player_name,
                        url: links.steam,
                        icon_url: their.avatar_url_full
                    },
                    footer: {
                        text: `Partner SteamID: ${steamID} • ${time}`
                    },
                    title: '',
                    description: `💬 ${msg}\n\n${quickLinks(their.player_name, links)}`,
                    color: this.bot.options.discordWebhookEmdedColorInDecimalIndex
                }
            ]
        });
        /*eslint-enable */

        const request = new XMLHttpRequest();
        request.open('POST', this.bot.options.discordWebhookMessageFromPartnerURL);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(discordPartnerMsg);
    }

    sendOfferReview(
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
        }
    ): void {
        let noMentionOnInvalidValue = false;
        if (this.bot.options.discordWebhookReviewOfferDisableMentionInvalidValue) {
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
            : `<@!${this.bot.options.discordOwnerID}>, check this! - ${offer.id}`;

        const botInfo = (this.bot.handler as MyHandler).getBotInfo();
        const pureStock = (this.bot.handler as MyHandler).pureStock();
        const message = replaceSpecialChar(offer.message);

        const itemsName = {
            invalid: items.invalid.map(name => replaceItemName(name)),
            overstock: items.overstock.map(name => replaceItemName(name)),
            understock: items.understock.map(name => replaceItemName(name)),
            duped: items.duped.map(name => replaceItemName(name)),
            dupedFailed: items.dupedFailed.map(name => replaceItemName(name)),
            highValue: items.highValue.map(name => replaceItemName(name))
        };

        const summary = summarize(offer.summarizeWithLink(this.bot.schema), value, keyPrices);
        const itemList = listItems(itemsName);

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

            const isShowQuickLinks = this.bot.options.discordWebhookReviewOfferShowQuickLinks;
            const isShowKeyRate = this.bot.options.discordWebhookReviewOfferShowKeyRate;
            const isShowPureStock = this.bot.options.discordWebhookReviewOfferShowPureStock;

            /*eslint-disable */
            const webhookReview = {
                username: this.bot.options.discordWebhookUserName ? this.bot.options.discordWebhookUserName : botInfo.name,
                avatar_url: this.bot.options.discordWebhookAvatarURL
                    ? this.bot.options.discordWebhookAvatarURL
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
                        color: this.bot.options.discordWebhookEmdedColorInDecimalIndex
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
            request.open('POST', this.bot.options.discordWebhookSomethingWrongAlertURL);
            request.setRequestHeader('Content-type', 'application/json');
            request.send(JSON.stringify(webhookReview));
        });
    }

    sendTradeSummary(
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
        time: string
    ): void {
        const ourItems = items.our;
        const theirItems = items.their;

        const itemsName = {
            invalid: accepted.invalidItems.map(name => replaceItemName(name)), // 🟨_INVALID_ITEMS
            overstock: accepted.overstocked.map(name => replaceItemName(name)), // 🟦_OVERSTOCKED
            understock: accepted.understocked.map(name => replaceItemName(name)), // 🟩_UNDERSTOCKED
            duped: [],
            dupedFailed: [],
            highValue: accepted.highValue.map(name => replaceItemName(name)) // 🔶_HIGH_VALUE_ITEMS
        };

        const itemList = listItems(itemsName);

        // Mention owner on the sku(s) specified in DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER_ONLY_ITEMS_SKU
        const isMentionOurItems = this.skuToMention.some(fromEnv => {
            return ourItems.some(ourItemSKU => {
                return ourItemSKU.includes(fromEnv);
            });
        });

        const isMentionThierItems = this.skuToMention.some(fromEnv => {
            return theirItems.some(theirItemSKU => {
                return theirItemSKU.includes(fromEnv);
            });
        });

        const IVAmount = itemsName.invalid.length;
        const HVAmount = itemsName.highValue.length;
        const isMentionHV = accepted.isMention;

        const mentionOwner =
            IVAmount > 0 || isMentionHV // Only mention on accepted 🟨_INVALID_ITEMS or 🔶_HIGH_VALUE_ITEMS
                ? `<@!${this.bot.options.discordOwnerID}> - Accepted ${
                      IVAmount > 0 && isMentionHV
                          ? `INVALID_ITEMS and High value ${pluralize('item', IVAmount + HVAmount)}`
                          : IVAmount > 0 && !isMentionHV
                          ? `INVALID_ITEMS ${pluralize('item', IVAmount)}`
                          : IVAmount === 0 && isMentionHV
                          ? `High Value ${pluralize('item', HVAmount)}`
                          : ''
                  } trade here!`
                : this.enableMentionOwner === true && (isMentionOurItems || isMentionThierItems)
                ? `<@!${this.bot.options.discordOwnerID}>`
                : '';

        const tradeLinks = this.tradeSummaryLinks;
        const botInfo = (this.bot.handler as MyHandler).getBotInfo();
        const pureStock = (this.bot.handler as MyHandler).pureStock();
        const trades = (this.bot.handler as MyHandler).polldata();

        const tradeNumbertoShowStarter = this.bot.options.tradesMadeStarterValue;

        const tradesMade =
            tradeNumbertoShowStarter !== 0 && !isNaN(tradeNumbertoShowStarter)
                ? tradeNumbertoShowStarter + trades.tradesTotal
                : trades.tradesTotal;

        const summary = summarize(offer.summarizeWithLink(this.bot.schema), value, keyPrices);

        let personaName: string;
        let avatarFull: string;
        log.debug('getting partner Avatar and Name...');
        this.getPartnerDetails(offer, (err, details) => {
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

            const isShowQuickLinks = this.bot.options.discordWebhookTradeSummaryShowQuickLinks;
            const isShowKeyRate = this.bot.options.discordWebhookTradeSummaryShowKeyRate;
            const isShowPureStock = this.bot.options.discordWebhookTradeSummaryShowPureStock;
            const isShowInventory = this.bot.options.discordWebhookTradeSummaryShowInventory;
            const AdditionalNotes = this.bot.options.discordWebhookTradeSummaryAdditionalDescriptionNote;

            /*eslint-disable */
            const acceptedTradeSummary = {
                username: this.bot.options.discordWebhookUserName ? this.bot.options.discordWebhookUserName : botInfo.name,
                avatar_url: this.bot.options.discordWebhookAvatarURL
                    ? this.bot.options.discordWebhookAvatarURL
                    : botInfo.avatarURL,
                content: mentionOwner,
                embeds: [
                    {
                        author: {
                            name: `Trade from: ${personaName} #${tradesMade.toString()}`,
                            url: links.steam,
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
                                    (AdditionalNotes
                                        ? (isShowKeyRate || isShowPureStock || isShowInventory ? '\n' : '') +
                                          AdditionalNotes
                                        : `\n[View my backpack](https://backpack.tf/profiles/${botInfo.steamID})`)
                            }
                        ],
                        color: this.bot.options.discordWebhookEmdedColorInDecimalIndex
                    }
                ]
            };
            /*eslint-enable */

            let removeStatus = false;

            if (!(isShowKeyRate || isShowPureStock || isShowInventory || AdditionalNotes)) {
                // If everything here is false, then it will be true and the last element (__Status__) of the
                // fields array will be removed
                acceptedTradeSummary.embeds[0].fields.pop();
                removeStatus = true;
            }

            if (itemList === '-') {
                // if __Item list__ field is empty OR contains more than 1024 characters, then remove it
                // to prevent the webhook from failing on POST request
                if (removeStatus) {
                    // if __Status__ fields was removed, then delete the entire fields properties
                    delete acceptedTradeSummary.embeds[0].fields;
                } else {
                    // else just remove the __Item list__
                    acceptedTradeSummary.embeds[0].fields.shift();
                }
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
                const request = new XMLHttpRequest();
                request.open('POST', link);
                request.setRequestHeader('Content-type', 'application/json');
                // remove mention owner on the second or more links, so the owner will not getting mentioned on the other servers.
                request.send(
                    i > 0
                        ? JSON.stringify(acceptedTradeSummary).replace(/<@!\d+>/g, '')
                        : JSON.stringify(acceptedTradeSummary)
                );
            });
        });
    }

    private getPartnerDetails(offer: TradeOffer, callback: (err: any, details: any) => void): any {
        // check state of the offer
        if (offer.state === TradeOfferManager.ETradeOfferState.active) {
            offer.getUserDetails((err, me, them) => {
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
    highValue: string[];
}): string {
    let list = items.invalid.length !== 0 ? '🟨`_INVALID_ITEMS:`\n- ' + items.invalid.join(',@\n- ') : '';

    list +=
        items.overstock.length !== 0
            ? (items.invalid.length !== 0 ? '\n\n' : '') + '🟦`_OVERSTOCKED:`\n- ' + items.overstock.join(',@\n- ')
            : '';

    list +=
        items.understock.length !== 0
            ? (items.invalid.length !== 0 || items.overstock.length !== 0 ? '\n\n' : '') +
              '🟩`_UNDERSTOCKED:`\n- ' +
              items.understock.join(',@\n- ')
            : '';

    list +=
        items.duped.length !== 0
            ? (items.invalid.length !== 0 || items.overstock.length !== 0 || items.understock.length !== 0
                  ? '\n\n'
                  : '') +
              '🟫`_DUPED_ITEMS:`\n- ' +
              items.duped.join(',@\n- ')
            : '';

    list +=
        items.dupedFailed.length !== 0
            ? (items.invalid.length !== 0 ||
              items.overstock.length !== 0 ||
              items.understock.length !== 0 ||
              items.duped.length !== 0
                  ? '\n\n'
                  : '') +
              '🟪`_DUPE_CHECK_FAILED:`\n- ' +
              items.dupedFailed.join(',@\n- ')
            : '';

    list +=
        items.highValue.length !== 0
            ? (items.invalid.length !== 0 ||
              items.overstock.length !== 0 ||
              items.understock.length !== 0 ||
              items.duped.length !== 0 ||
              items.dupedFailed.length !== 0
                  ? '\n\n'
                  : '') +
              '🔶`_HIGH_VALUE_ITEMS`\n- ' +
              items.highValue.join('@\n\n- ')
            : '';

    if (list.length === 0) {
        list = '-';
    }
    return list;
}

function quickLinks(name: string, links: { steam: string; bptf: string; steamrep: string }): string {
    return `🔍 ${name}'s info:\n[Steam Profile](${links.steam}) | [backpack.tf](${links.bptf}) | [steamREP](${links.steamrep})`;
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
        .replace(/\*/g, '^')
        .replace(/~/g, '-')
        .replace(/`/g, "'")
        .replace(/>/g, '<')
        .replace(/\|/g, 'l')
        .replace(/\\/g, '/')
        .replace(/\(/g, '/')
        .replace(/\)/g, '/')
        .replace(/\[/g, '/')
        .replace(/\]/g, '/');
}
