import SteamID from 'steamid';
import pluralize from 'pluralize';
import TradeOfferManager, { Meta, OfferData, OurTheirItemsDict } from '@tf2autobot/tradeoffer-manager';
import Currencies from '@tf2autobot/tf2-currencies';
import { Message as DiscordMessage } from 'discord.js';
import { UnknownDictionaryKnownValues } from '../../../types/common';
import SKU from '@tf2autobot/tf2-sku';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { generateLinks, testPriceKey } from '../../../lib/tools/export';

// Manual review commands

type ActionOnTrade = 'accept' | 'accepttrade' | 'decline' | 'declinetrade';
type ForceAction = 'faccept' | 'fdecline';

export default class ReviewCommands {
    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    tradesCommand(steamID: SteamID): void {
        // Go through polldata and find active offers
        const pollData = this.bot.manager.pollData;

        const offersForReview: UnknownDictionaryKnownValues[] = [];
        const activeOffersNotForReview: UnknownDictionaryKnownValues[] = [];

        for (const id in pollData.received) {
            if (!Object.prototype.hasOwnProperty.call(pollData.received, id)) {
                continue;
            }

            if (pollData.received[id] !== TradeOfferManager.ETradeOfferState['Active']) {
                continue;
            }

            const data = pollData?.offerData[id] || null;

            if (data === null) {
                continue;
            } else if (data?.action?.action !== 'skip') {
                activeOffersNotForReview.push({ id: id, data: data });
                continue;
            }

            offersForReview.push({ id: id, data: data });
        }

        if (offersForReview.length === 0 && activeOffersNotForReview.length === 0) {
            return this.bot.sendMessage(steamID, '❌ There are no active offers/ pending review.');
        }

        this.bot.sendMessage(
            steamID,
            (offersForReview.length > 0 ? this.generateTradesReply(offersForReview.sort((a, b) => a.id - b.id)) : '') +
                (offersForReview.length > 0 ? '\n\n-----------------\n\n' : '') +
                (activeOffersNotForReview.length > 0
                    ? this.generateActiveOfferReply(activeOffersNotForReview.sort((a, b) => a.id - b.id))
                    : '')
        );
    }

    private generateTradesReply(offers: UnknownDictionaryKnownValues[]): string {
        const offersCount = offers.length;

        let reply = `There ${pluralize('is', offersCount)} ${offersCount} active ${pluralize(
            'offer',
            offersCount
        )} that you can review:\n`;

        for (let i = 0; i < offersCount; i++) {
            const offer = offers[i];

            reply +=
                `\n- Offer #${offer.id as string} from ${(offer.data as OfferData).partner} (reason: ${(
                    offer.data as OfferData
                ).meta.uniqueReasons.join(', ')})` + `\n⚠️ Send "!trade ${offer.id as string}" for more details.\n`;
        }

        return reply;
    }

    private generateActiveOfferReply(offers: UnknownDictionaryKnownValues[]): string {
        const offersCount = offers.length;

        let reply = `There ${pluralize('is', offersCount)} ${offersCount} ${pluralize(
            'offer',
            offersCount
        )} that currently still active:\n`;

        for (let i = 0; i < offersCount; i++) {
            const offer = offers[i];

            reply +=
                `\n- Offer #${offer.id as string} from ${(offer.data as OfferData).partner}` +
                `\n⚠️ Send "!trade ${offer.id as string}" for more details, "!faccept ${
                    offer.id as string
                }" to force accept the trade, or "!fdecline ${offer.id as string}" to force decline the trade.\n`;
        }

        return reply;
    }

    tradeCommand(steamID: SteamID, message: string): void {
        const offerId = CommandParser.removeCommand(message).trim();

        if (offerId === '') {
            return this.bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!trade 3957959294"');
        }

        const state = this.bot.manager.pollData.received[offerId];

        if (state === undefined) {
            return this.bot.sendMessage(steamID, 'Offer does not exist. ❌');
        }

        if (state !== TradeOfferManager.ETradeOfferState['Active']) {
            // TODO: Add what the offer is now, accepted / declined and why
            return this.bot.sendMessage(steamID, 'Offer is not active. ❌');
        }

        const offerData = this.bot.manager.pollData.offerData[offerId];

        // Log offer details

        let reply =
            offerData?.action?.action === 'skip'
                ? `⚠️ Offer #${offerId} from ${offerData.partner} is pending for review` +
                  `\nReason: ${offerData.meta.uniqueReasons.join(', ')}).\n\nSummary:\n\n`
                : `⚠️ Offer #${offerId} from ${offerData.partner} is still active.\n\nSummary:\n\n`;

        const keyPrice = this.bot.pricelist.getKeyPrice;
        const value = offerData.value;
        const items = offerData.dict || { our: null, their: null };
        const summarizeItems = (dict: OurTheirItemsDict) => {
            if (dict === null) {
                return 'unknown items';
            }

            const summary: string[] = [];

            for (const sku in dict) {
                if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
                    continue;
                }

                const name = testPriceKey(sku) ? this.bot.schema.getName(SKU.fromString(sku), false) : sku;

                summary.push(name + (dict[sku] > 1 ? ` x${dict[sku]}` : '')); // dict[sku] = amount
            }

            if (summary.length === 0) {
                return 'nothing';
            }

            return summary.join(', ');
        };

        if (!value) {
            reply += 'Asked: ' + summarizeItems(items.our) + '\nOffered: ' + summarizeItems(items.their);
        } else {
            const valueDiff =
                new Currencies(value.their).toValue(keyPrice.metal) - new Currencies(value.our).toValue(keyPrice.metal);
            const valueDiffRef = Currencies.toRefined(Currencies.toScrap(Math.abs(valueDiff * (1 / 9)))).toString();
            reply +=
                'Asked: ' +
                new Currencies(value.our).toString() +
                ' (' +
                summarizeItems(items.our) +
                ')\nOffered: ' +
                new Currencies(value.their).toString() +
                ' (' +
                summarizeItems(items.their) +
                (valueDiff > 0
                    ? `)\n📈 Profit from overpay: ${valueDiffRef} ref`
                    : valueDiff < 0
                    ? `)\n📉 Loss from underpay: ${valueDiffRef} ref`
                    : ')');
        }

        const links = generateLinks(offerData.partner.toString());
        reply +=
            `\n\nSteam: ${links.steam}\nBackpack.tf: ${links.bptf}\nSteamREP: ${links.steamrep}` +
            (offerData?.action?.action === 'skip'
                ? `\n\n⚠️ Send "!accept ${offerId}" to accept or "!decline ${offerId}" to decline this offer.`
                : `\n\n⚠️ Send "!faccept ${offerId}" to force accept, or "!fdecline ${offerId}" to decline the trade now!`);

        this.bot.sendMessage(steamID, reply);
    }

    async actionOnTradeCommand(steamID: SteamID, message: string, command: ActionOnTrade): Promise<void> {
        const offerIdAndMessage = CommandParser.removeCommand(message);
        const offerIdRegex = /\d+/.exec(offerIdAndMessage);

        const isAccepting = ['accept', 'accepttrade'].includes(command);

        if (isNaN(+offerIdRegex) || !offerIdRegex) {
            return this.bot.sendMessage(
                steamID,
                `⚠️ Missing offer id. Example: "!${isAccepting ? 'accept' : 'decline'} 3957959294"`
            );
        }

        const offerId = offerIdRegex[0];
        const state = this.bot.manager.pollData.received[offerId];
        if (state === undefined) {
            return this.bot.sendMessage(steamID, 'Offer does not exist. ❌');
        }

        if (state !== TradeOfferManager.ETradeOfferState['Active']) {
            // TODO: Add what the offer is now, accepted / declined and why
            return this.bot.sendMessage(steamID, 'Offer is not active. ❌');
        }

        const offerData = this.bot.manager.pollData.offerData[offerId];
        if (offerData?.action?.action !== 'skip') {
            return this.bot.sendMessage(steamID, "Offer can't be reviewed. ❌");
        }

        try {
            const offer = await this.bot.trades.getOffer(offerId);
            this.bot.sendMessage(steamID, `${isAccepting ? 'Accepting' : 'Declining'} offer...`);

            const partnerId = new SteamID(this.bot.manager.pollData.offerData[offerId].partner);
            const reply = offerIdAndMessage.substring(offerId.length).trim();
            const adminDetails = this.bot.friends.getFriend(steamID);

            try {
                await this.bot.trades.applyActionToOffer(
                    isAccepting ? 'accept' : 'decline',
                    'MANUAL',
                    isAccepting ? (offer.data('meta') as Meta) : {},
                    offer
                );

                if (isAccepting && this.bot.options.offerReceived.sendPreAcceptMessage.enable) {
                    const isManyItems = offer.itemsToGive.length + offer.itemsToReceive.length > 50;

                    if (isManyItems) {
                        this.bot.sendMessage(
                            offer.partner,
                            this.bot.options.customMessage.accepted.manual.largeOffer
                                ? this.bot.options.customMessage.accepted.manual.largeOffer
                                : '.\nMy owner has manually accepted your offer. The trade may take a while to finalize due to it being a large offer.' +
                                      ' If the trade does not finalize after 5-10 minutes has passed, please send your offer again, or add me and use ' +
                                      'the !sell/!sellcart or !buy/!buycart command.'
                        );
                    } else {
                        this.bot.sendMessage(
                            offer.partner,
                            this.bot.options.customMessage.accepted.manual.smallOffer
                                ? this.bot.options.customMessage.accepted.manual.smallOffer
                                : '.\nMy owner has manually accepted your offer. The trade should be finalized shortly.' +
                                      ' If the trade does not finalize after 1-2 minutes has passed, please send your offer again, or add me and use ' +
                                      'the !sell/!sellcart or !buy/!buycart command.'
                        );
                    }
                }

                // Send message to recipient if includes some messages
                if (reply) {
                    const isShowOwner = this.bot.options.commands.message.showOwnerName;

                    this.bot.sendMessage(
                        partnerId,
                        `/quote 💬 Message from ${
                            isShowOwner && adminDetails ? adminDetails.player_name : 'the owner'
                        }: ${reply}`
                    );
                }
            } catch (err) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Ohh nooooes! Something went wrong while trying to ${
                        isAccepting ? 'accept' : 'decline'
                    } the offer: ${(err as Error).message}`
                );
            }
        } catch (err) {
            return this.bot.sendMessage(
                steamID,
                `❌ Ohh nooooes! Something went wrong while trying to ${
                    isAccepting ? 'accept' : 'decline'
                } the offer: ${(err as Error).message}`
            );
        }
    }

    async forceAction(steamID: SteamID, message: string, command: ForceAction): Promise<void> {
        const offerIdAndMessage = CommandParser.removeCommand(message);
        const offerIdRegex = /\d+/.exec(offerIdAndMessage);

        const isForceAccepting = command === 'faccept';

        if (isNaN(+offerIdRegex) || !offerIdRegex) {
            return this.bot.sendMessage(
                steamID,
                `⚠️ Missing offer id. Example: "!${isForceAccepting ? 'faccept' : 'fdecline'} 3957959294"`
            );
        }

        const offerId = offerIdRegex[0];

        const state = this.bot.manager.pollData.received[offerId];
        if (state === undefined) {
            return this.bot.sendMessage(steamID, 'Offer does not exist. ❌');
        }

        try {
            const offer = await this.bot.trades.getOffer(offerId);
            this.bot.sendMessage(steamID, `Force ${isForceAccepting ? 'accepting' : 'declining'} offer...`);

            const partnerId = new SteamID(this.bot.manager.pollData.offerData[offerId].partner);
            const reply = offerIdAndMessage.substring(offerId.length).trim();
            const adminDetails = this.bot.friends.getFriend(steamID);

            try {
                await this.bot.trades.applyActionToOffer(
                    isForceAccepting ? 'accept' : 'decline',
                    'MANUAL-FORCE',
                    isForceAccepting ? (offer.data('meta') as Meta) : {},
                    offer
                );

                // Send message to recipient if includes some messages
                if (reply) {
                    const isShowOwner = this.bot.options.commands.message.showOwnerName;

                    this.bot.sendMessage(
                        partnerId,
                        `/quote 💬 Message from ${
                            isShowOwner && adminDetails ? adminDetails.player_name : 'the owner'
                        }: ${reply}`
                    );
                }
            } catch (err) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Ohh nooooes! Something went wrong while trying to force ${
                        isForceAccepting ? 'accept' : 'decline'
                    } the offer: ${(err as Error).message}`
                );
            }
        } catch (err) {
            return this.bot.sendMessage(
                steamID,
                `❌ Ohh nooooes! Something went wrong while trying to force ${
                    isForceAccepting ? 'accept' : 'decline'
                } the offer: ${(err as Error).message}`
            );
        }
    }

    offerInfo(steamID: SteamID, message: string): void {
        const offerIdAndMessage = CommandParser.removeCommand(message);
        const offerIdRegex = /\d+/.exec(offerIdAndMessage);

        if (isNaN(+offerIdRegex) || !offerIdRegex) {
            return this.bot.sendMessage(steamID, `⚠️ Missing offer id. Example: "!offerinfo 3957959294"`);
        }

        const offerId = offerIdRegex[0];

        const timestamp = this.bot.manager.pollData.timestamps[offerId];
        if (timestamp === undefined) {
            return this.bot.sendMessage(steamID, 'Offer does not exist. ❌');
        }

        try {
            const offer = this.bot.manager.pollData.offerData[offerId];
            const show = {};
            show[offerId] = offer;

            let body = JSON.stringify(show, null, 2);

            if (
                (steamID.redirectAnswerTo instanceof DiscordMessage && body.length > 2000) ||
                (steamID.type !== 0 && body.length > 500)
            ) {
                body = JSON.stringify(show);
            }

            this.bot.sendMessage(steamID, '/code ' + body);
        } catch (err) {
            return this.bot.sendMessage(steamID, `❌ Error getting offer #${offerId} info: ${(err as Error).message}`);
        }
    }
}
