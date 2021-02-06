import SteamID from 'steamid';
import pluralize from 'pluralize';
import TradeOfferManager, { Action, OfferData, OurTheirItemsDict } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import { UnknownDictionaryKnownValues } from '../../../types/common';
import SKU from 'tf2-sku-2';
import SchemaManager from 'tf2-schema-2';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { generateLinks } from '../../../lib/tools/export';

// Manual review commands

export function tradesCommand(steamID: SteamID, bot: Bot): void {
    // Go through polldata and find active offers
    const pollData = bot.manager.pollData;
    const offers: UnknownDictionaryKnownValues[] = [];

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
            continue;
        }

        offers.push({ id: id, data: data });
    }

    if (offers.length === 0) {
        return bot.sendMessage(steamID, '❌ There are no active offers pending review.');
    }

    offers.sort((a, b) => a.id - b.id);

    bot.sendMessage(steamID, generateTradesReply(offers));
}

function generateTradesReply(offers: UnknownDictionaryKnownValues[]): string {
    let reply = `There is/are ${offers.length} active ${pluralize('offer', offers.length)} that you can review:`;
    for (let i = 0; i < offers.length; i++) {
        reply +=
            `\n- Offer #${offers[i].id as string} from ${(offers[i].data as OfferData).partner} (reason: ${(offers[i]
                .data as OfferData).action.meta.uniqueReasons.join(', ')})` +
            `\n⚠️ Send "!trade ${offers[i].id as string}" for more details.\n`;
    }

    return reply;
}

export function tradeCommand(steamID: SteamID, message: string, bot: Bot): void {
    const offerId = CommandParser.removeCommand(message).trim();

    if (offerId === '') {
        return bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!trade 3957959294"');
    }

    const state = bot.manager.pollData.received[offerId];

    if (state === undefined) {
        return bot.sendMessage(steamID, 'Offer does not exist. ❌');
    }

    if (state !== TradeOfferManager.ETradeOfferState['Active']) {
        // TODO: Add what the offer is now, accepted / declined and why
        return bot.sendMessage(steamID, 'Offer is not active. ❌');
    }

    const offerData = bot.manager.pollData.offerData[offerId];

    if (offerData?.action?.action !== 'skip') {
        return bot.sendMessage(steamID, "Offer can't be reviewed. ❌");
    }

    // Log offer details

    let reply =
        `⚠️ Offer #${offerId} from ${offerData.partner} is pending for review. ` +
        `\nReason: ${offerData.action.meta.uniqueReasons.join(', ')}). Summary:\n\n`;

    const keyPrice = bot.pricelist.getKeyPrice;
    const value = offerData.value;
    const items = offerData.dict || { our: null, their: null };
    const summarizeItems = (dict: OurTheirItemsDict, schema: SchemaManager.Schema) => {
        if (dict === null) {
            return 'unknown items';
        }

        const summary: string[] = [];

        for (const sku in dict) {
            if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
                continue;
            }

            summary.push(schema.getName(SKU.fromString(sku), false) + (dict[sku] > 1 ? ` x${dict[sku]}` : '')); // dict[sku] = amount
        }

        if (summary.length === 0) {
            return 'nothing';
        }

        return summary.join(', ');
    };

    if (!value) {
        reply +=
            'Asked: ' + summarizeItems(items.our, bot.schema) + '\nOffered: ' + summarizeItems(items.their, bot.schema);
    } else {
        const valueDiff =
            new Currencies(value.their).toValue(keyPrice.metal) - new Currencies(value.our).toValue(keyPrice.metal);
        const valueDiffRef = Currencies.toRefined(Currencies.toScrap(Math.abs(valueDiff * (1 / 9)))).toString();
        reply +=
            'Asked: ' +
            new Currencies(value.our).toString() +
            ' (' +
            summarizeItems(items.our, bot.schema) +
            ')\nOffered: ' +
            new Currencies(value.their).toString() +
            ' (' +
            summarizeItems(items.their, bot.schema) +
            (valueDiff > 0
                ? `)\n📈 Profit from overpay: ${valueDiffRef} ref`
                : valueDiff < 0
                ? `)\n📉 Loss from underpay: ${valueDiffRef} ref`
                : ')');
    }

    const links = generateLinks(offerData.partner.toString());
    reply +=
        `\n\nSteam: ${links.steam}\nBackpack.tf: ${links.bptf}\nSteamREP: ${links.steamrep}` +
        `\n\n⚠️ Send "!accept ${offerId}" to accept or "!decline ${offerId}" to decline this offer.`;

    bot.sendMessage(steamID, reply);
}

type ActionOnTrade = 'accept' | 'accepttrade' | 'decline' | 'declinetrade';

export async function actionOnTradeCommand(
    steamID: SteamID,
    message: string,
    bot: Bot,
    command: ActionOnTrade
): Promise<void> {
    const offerIdAndMessage = CommandParser.removeCommand(message);
    const offerIdRegex = /\d+/.exec(offerIdAndMessage);

    const isAccepting = ['accept', 'accepttrade'].includes(command);

    if (isNaN(+offerIdRegex) || !offerIdRegex) {
        return bot.sendMessage(
            steamID,
            `⚠️ Missing offer id. Example: "!${isAccepting ? 'accept' : 'decline'} 3957959294"`
        );
    }

    const offerId = offerIdRegex[0];
    const state = bot.manager.pollData.received[offerId];
    if (state === undefined) {
        return bot.sendMessage(steamID, 'Offer does not exist. ❌');
    }

    if (state !== TradeOfferManager.ETradeOfferState['Active']) {
        // TODO: Add what the offer is now, accepted / declined and why
        return bot.sendMessage(steamID, 'Offer is not active. ❌');
    }

    const offerData = bot.manager.pollData.offerData[offerId];
    if (offerData?.action?.action !== 'skip') {
        return bot.sendMessage(steamID, "Offer can't be reviewed. ❌");
    }

    try {
        const offer = await bot.trades.getOffer(offerId);
        bot.sendMessage(steamID, `${isAccepting ? 'Accepting' : 'Declining'} offer...`);

        const partnerId = new SteamID(bot.manager.pollData.offerData[offerId].partner);
        const reply = offerIdAndMessage.substr(offerId.length);
        const adminDetails = bot.friends.getFriend(steamID);

        try {
            await bot.trades.applyActionToOffer(
                isAccepting ? 'accept' : 'decline',
                'MANUAL',
                isAccepting ? (offer.data('action') as Action).meta : {},
                offer
            );

            if (isAccepting) {
                const isManyItems = offer.itemsToGive.length + offer.itemsToReceive.length > 50;

                if (isManyItems) {
                    bot.sendMessage(
                        offer.partner,
                        bot.options.customMessage.accepted.manual.largeOffer
                            ? bot.options.customMessage.accepted.manual.largeOffer
                            : '.\nMy owner has manually accepted your offer. The trade may take a while to finalize due to it being a large offer.' +
                                  ' If the trade does not finalize after 5-10 minutes has passed, please send your offer again, or add me and use ' +
                                  'the !sell/!sellcart or !buy/!buycart command.'
                    );
                } else {
                    bot.sendMessage(
                        offer.partner,
                        bot.options.customMessage.accepted.manual.smallOffer
                            ? bot.options.customMessage.accepted.manual.smallOffer
                            : '.\nMy owner has manually accepted your offer. The trade should be finalized shortly.' +
                                  ' If the trade does not finalize after 1-2 minutes has passed, please send your offer again, or add me and use ' +
                                  'the !sell/!sellcart or !buy/!buycart command.'
                    );
                }
            }

            // Send message to recipient if includes some messages
            if (reply) {
                bot.sendMessage(
                    partnerId,
                    `/quote 💬 Message from ${adminDetails ? adminDetails.player_name : 'admin'}: ${reply}`
                );
            }
        } catch (err) {
            return bot.sendMessage(
                steamID,
                `❌ Ohh nooooes! Something went wrong while trying to ${
                    isAccepting ? 'accept' : 'decline'
                } the offer: ${JSON.stringify(err)}`
            );
        }
    } catch (err) {
        return bot.sendMessage(
            steamID,
            `❌ Ohh nooooes! Something went wrong while trying to ${
                isAccepting ? 'accept' : 'decline'
            } the offer: ${JSON.stringify(err)}`
        );
    }
}

export async function forceAccept(steamID: SteamID, message: string, bot: Bot): Promise<void> {
    const offerIdAndMessage = CommandParser.removeCommand(message);
    const offerIdRegex = /\d+/.exec(offerIdAndMessage);

    if (isNaN(+offerIdRegex) || !offerIdRegex) {
        return bot.sendMessage(steamID, `⚠️ Missing offer id. Example: "!faccept 3957959294"`);
    }

    const offerId = offerIdRegex[0];

    const state = bot.manager.pollData.received[offerId];
    if (state === undefined) {
        return bot.sendMessage(steamID, 'Offer does not exist. ❌');
    }

    if (state !== TradeOfferManager.ETradeOfferState['Active']) {
        return bot.sendMessage(steamID, 'Offer is not active. ❌');
    }

    try {
        const offer = await bot.trades.getOffer(offerId);
        bot.sendMessage(steamID, `Force accepting offer...`);

        const partnerId = new SteamID(bot.manager.pollData.offerData[offerId].partner);
        const reply = offerIdAndMessage.substr(offerId.length);
        const adminDetails = bot.friends.getFriend(steamID);

        try {
            await bot.trades.applyActionToOffer(
                'accept',
                'MANUAL-FORCE',
                (offer.data('action') as Action).meta || {},
                offer
            );

            // Send message to recipient if includes some messages
            if (reply) {
                bot.sendMessage(
                    partnerId,
                    `/quote 💬 Message from ${adminDetails ? adminDetails.player_name : 'admin'}: ${reply}`
                );
            }
        } catch (err) {
            return bot.sendMessage(
                steamID,
                `❌ Ohh nooooes! Something went wrong while trying to force accept the offer: ${JSON.stringify(err)}`
            );
        }
    } catch (err) {
        return bot.sendMessage(
            steamID,
            `❌ Ohh nooooes! Something went wrong while trying to force accept' the offer: ${JSON.stringify(err)}`
        );
    }
}
