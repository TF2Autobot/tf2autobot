import SteamID from 'steamid';
import pluralize from 'pluralize';
import TradeOfferManager, { Meta, OfferData } from 'steam-tradeoffer-manager';
import Currencies from 'tf2-currencies';
import { UnknownDictionaryKnownValues } from '../../../types/common';

import { summarizeItems } from './utils';

import Bot from '../../Bot';
import CommandParser from '../../CommandParser';

import { check, generateLinks } from '../../../lib/tools/export';
import { noiseMakerSKUs } from '../../../lib/data';
import log from '../../../lib/logger';

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
        bot.sendMessage(steamID, '❌ There are no active offers pending review.');
        return;
    }

    offers.sort((a, b) => a.id - b.id);

    let reply = `There is/are ${offers.length} active ${pluralize('offer', offers.length)} that you can review:`;

    for (let i = 0; i < offers.length; i++) {
        const offer = offers[i];

        reply +=
            `\n- Offer #${offer.id as string} from ${
                (offer.data as OfferData).partner
            } (reason: ${(offer.data as OfferData).action.meta.uniqueReasons.join(', ')})` +
            `\n⚠️ Send "!trade ${offer.id as string}" for more details.\n`;
    }

    bot.sendMessage(steamID, reply);
}

export function tradeCommand(steamID: SteamID, message: string, bot: Bot): void {
    const offerId = CommandParser.removeCommand(message).trim();

    if (offerId === '') {
        bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!trade 3957959294"');
        return;
    }

    const state = bot.manager.pollData.received[offerId];

    if (state === undefined) {
        bot.sendMessage(steamID, 'Offer does not exist. ❌');
        return;
    }

    if (state !== TradeOfferManager.ETradeOfferState['Active']) {
        // TODO: Add what the offer is now, accepted / declined and why
        bot.sendMessage(steamID, 'Offer is not active. ❌');
        return;
    }

    const offerData = bot.manager.pollData.offerData[offerId];

    if (offerData?.action?.action !== 'skip') {
        bot.sendMessage(steamID, "Offer can't be reviewed. ❌");
        return;
    }

    // Log offer details

    // TODO: Create static class for trade offer related functions?

    let reply =
        `⚠️ Offer #${offerId} from ${offerData.partner} is pending for review. ` +
        `\nReason: ${offerData.action.meta.uniqueReasons.join(', ')}). Summary:\n\n`;

    const keyPrice = bot.pricelist.getKeyPrices();
    const value = offerData.value;

    const items = offerData.dict || { our: null, their: null };

    if (!value) {
        reply +=
            'Asked: ' + summarizeItems(items.our, bot.schema) + '\nOffered: ' + summarizeItems(items.their, bot.schema);
    } else {
        const valueDiff =
            new Currencies(value.their).toValue(keyPrice.sell.metal) -
            new Currencies(value.our).toValue(keyPrice.sell.metal);
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

export function accepttradeCommand(steamID: SteamID, message: string, bot: Bot): void {
    const offerIdAndMessage = CommandParser.removeCommand(message);
    const offerIdRegex = new RegExp(/\d+/).exec(offerIdAndMessage);

    if (isNaN(+offerIdRegex) || !offerIdRegex) {
        bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!accept 3957959294"');
        return;
    }

    const offerId = offerIdRegex[0];

    const state = bot.manager.pollData.received[offerId];

    if (state === undefined) {
        bot.sendMessage(steamID, 'Offer does not exist. ❌');
        return;
    }

    if (state !== TradeOfferManager.ETradeOfferState['Active']) {
        // TODO: Add what the offer is now, accepted / declined and why
        bot.sendMessage(steamID, 'Offer is not active. ❌');
        return;
    }

    const offerData = bot.manager.pollData.offerData[offerId];

    if (offerData?.action.action !== 'skip') {
        bot.sendMessage(steamID, "Offer can't be reviewed. ❌");
        return;
    }

    void bot.trades.getOffer(offerId).asCallback((err, offer) => {
        if (err) {
            bot.sendMessage(
                steamID,
                `❌ Ohh nooooes! Something went wrong while trying to accept the offer: ${(err as Error).message}`
            );
            return;
        }

        bot.sendMessage(steamID, 'Accepting offer...');

        const partnerId = new SteamID(bot.manager.pollData.offerData[offerId].partner);
        const reply = offerIdAndMessage.substr(offerId.length);
        const adminDetails = bot.friends.getFriend(steamID);

        let declineTrade = false;
        let hasNot5Uses = false;
        let hasNot25Uses = false;

        const opt = bot.options;

        const offerSKUs = offer.itemsToReceive.map(item =>
            item.getSKU(bot.schema, opt.normalize.festivized, opt.normalize.strangeUnusual)
        );

        const checkExist = bot.pricelist;

        if (opt.checkUses.duel && offerSKUs.includes('241;6')) {
            // Re-check Dueling Mini-Game for 5x Uses only when enabled and exist in pricelist
            log.debug('Running re-check on Dueling Mini-Game...');
            hasNot5Uses = check.isNot5xUses(offer.itemsToReceive, bot);

            if (hasNot5Uses && checkExist.getPrice('241;6', true) !== null) {
                // Only decline if exist in pricelist
                offer.log('info', 'contains Dueling Mini-Game that does not have 5 uses (re-checked).');
                declineTrade = true;
            }
        }

        if (opt.checkUses.noiseMaker && offerSKUs.some(sku => noiseMakerSKUs.includes(sku))) {
            // Re-check Noise Maker for 25x Uses only when enabled and exist in pricelist
            log.debug('Running re-check on Noise maker...');

            const [isNot25Uses, skus] = check.isNot25xUses(offer.itemsToReceive, bot);
            hasNot25Uses = isNot25Uses;

            const isHasNoiseMaker = skus.some(sku => {
                return checkExist.getPrice(sku, true) !== null;
            });

            if (hasNot25Uses && isHasNoiseMaker) {
                offer.log('info', 'contains Noise Maker that does not have 25 uses (re-checked).');
                declineTrade = true;
            }
        }

        const reviewMeta = offer.data('reviewMeta') as Meta;

        if (declineTrade === false) {
            void bot.trades.applyActionToOffer('accept', 'MANUAL', reviewMeta, offer).asCallback(err => {
                if (err) {
                    bot.sendMessage(
                        steamID,
                        `❌ Ohh nooooes! Something went wrong while trying to accept the offer: ${
                            (err as Error).message
                        }`
                    );
                    return;
                }

                const isManyItems = offer.itemsToGive.length + offer.itemsToReceive.length > 50;

                if (isManyItems) {
                    bot.sendMessage(
                        offer.partner,
                        'My owner has manually accepted your offer. The trade may take a while to finalize due to it being a large offer.' +
                            ' If the trade does not finalize after 5-10 minutes has passed, please send your offer again, or add me and use the !sell/!sellcart or !buy/!buycart command.'
                    );
                } else {
                    bot.sendMessage(
                        offer.partner,
                        'My owner has manually accepted your offer. The trade should be finalized shortly.' +
                            ' If the trade does not finalize after 1-2 minutes has passed, please send your offer again, or add me and use the !sell/!sellcart or !buy/!buycart command.'
                    );
                }
                // Send message to recipient if includes some messages
                if (reply) {
                    bot.sendMessage(
                        partnerId,
                        `/quote 💬 Message from ${adminDetails ? adminDetails.player_name : 'admin'}: ${reply}`
                    );
                }
            });
        } else {
            void bot.trades.applyActionToOffer('decline', 'MANUAL', {}, offer).asCallback(err => {
                if (err) {
                    bot.sendMessage(
                        steamID,
                        `❌ Ohh nooooes! Something went wrong while trying to decline the offer: ${
                            (err as Error).message
                        }`
                    );
                    return;
                }

                bot.sendMessage(
                    steamID,
                    `❌ Offer #${offer.id} has been automatically declined: contains ${
                        hasNot5Uses && hasNot25Uses
                            ? 'Dueling Mini-Game and/or Noise Maker'
                            : hasNot5Uses
                            ? 'Dueling Mini-Game'
                            : 'Noise Maker'
                    } that is not full after re-check...`
                );

                bot.sendMessage(
                    offer.partner,
                    `Looks like you've used your ${
                        hasNot5Uses && hasNot25Uses
                            ? 'Dueling Mini-Game and/or Noise Maker'
                            : hasNot5Uses
                            ? 'Dueling Mini-Game'
                            : 'Noise Maker'
                    }, thus your offer has been declined.`
                );
            });
        }
    });
}

export function declinetradeCommand(steamID: SteamID, message: string, bot: Bot): void {
    const offerIdAndMessage = CommandParser.removeCommand(message);
    const offerIdRegex = new RegExp(/\d+/).exec(offerIdAndMessage);

    if (isNaN(+offerIdRegex) || !offerIdRegex) {
        bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!decline 3957959294"');
        return;
    }

    const offerId = offerIdRegex[0];

    const state = bot.manager.pollData.received[offerId];

    if (state === undefined) {
        bot.sendMessage(steamID, 'Offer does not exist. ❌');
        return;
    }

    if (state !== TradeOfferManager.ETradeOfferState['Active']) {
        // TODO: Add what the offer is now, accepted / declined and why
        bot.sendMessage(steamID, 'Offer is not active. ❌');
        return;
    }

    const offerData = bot.manager.pollData.offerData[offerId];

    if (offerData?.action.action !== 'skip') {
        bot.sendMessage(steamID, "Offer can't be reviewed. ❌");
        return;
    }

    void bot.trades.getOffer(offerId).asCallback((err, offer) => {
        if (err) {
            bot.sendMessage(
                steamID,
                `❌ Ohh nooooes! Something went wrong while trying to decline the offer: ${(err as Error).message}`
            );
            return;
        }

        bot.sendMessage(steamID, 'Declining offer...');

        const partnerId = new SteamID(bot.manager.pollData.offerData[offerId].partner);
        const reply = offerIdAndMessage.substr(offerId.length);
        const adminDetails = bot.friends.getFriend(steamID);

        void bot.trades.applyActionToOffer('decline', 'MANUAL', {}, offer).asCallback(err => {
            if (err) {
                bot.sendMessage(
                    steamID,
                    `❌ Ohh nooooes! Something went wrong while trying to decline the offer: ${(err as Error).message}`
                );
                return;
            }
            // Send message to recipient if includes some messages
            if (reply) {
                bot.sendMessage(
                    partnerId,
                    `/quote 💬 Message from ${adminDetails ? adminDetails.player_name : 'admin'}: ${reply}`
                );
            }
        });
    });
}
