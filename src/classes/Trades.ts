import TradeOfferManager, {
    TradeOffer,
    EconItem,
    CustomError,
    Meta,
    Action,
    ItemsValue,
    ItemsDict
} from '@tf2autobot/tradeoffer-manager';
import dayjs from 'dayjs';
import pluralize from 'pluralize';
import retry from 'retry';
import SteamID from 'steamid';
import Currencies from 'tf2-currencies-2';

import { UnknownDictionaryKnownValues, UnknownDictionary } from '../types/common';
import Bot from './Bot';
import Inventory, { Dict } from './Inventory';

import log from '../lib/logger';
import { exponentialBackoff } from '../lib/helpers';
import { sendAlert } from '../lib/DiscordWebhook/export';
import { isBptfBanned } from '../lib/bans';
import * as t from '../lib/tools/export';

type PureSKU = '5021;6' | '5002;6' | '5001;6' | '5000;6';

export default class Trades {
    private itemsInTrade: string[] = [];

    private receivedOffers: string[] = [];

    private processingOffer = false;

    private pollCount = 0;

    private escrowCheckFailedCount = 0;

    private restartOnEscrowCheckFailed: NodeJS.Timeout;

    private retryAcceptOffer: UnknownDictionary<boolean> = {};

    private resetRetryAcceptOfferTimeout: NodeJS.Timeout;

    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    onPollData(pollData: TradeOfferManager.PollData): void {
        this.bot.handler.onPollData(pollData);
    }

    setPollData(pollData: TradeOfferManager.PollData): void {
        const activeOrCreatedNeedsConfirmation: string[] = [];

        for (const id in pollData.sent) {
            if (!Object.prototype.hasOwnProperty.call(pollData.sent, id)) {
                continue;
            }

            const state = pollData.sent[id];
            if (
                state === TradeOfferManager.ETradeOfferState['Active'] ||
                state === TradeOfferManager.ETradeOfferState['CreatedNeedsConfirmation']
            ) {
                activeOrCreatedNeedsConfirmation.push(id);
            }
        }

        for (const id in pollData.received) {
            if (!Object.prototype.hasOwnProperty.call(pollData.received, id)) {
                continue;
            }

            const state = pollData.received[id];
            if (state === TradeOfferManager.ETradeOfferState['Active']) {
                activeOrCreatedNeedsConfirmation.push(id);
            }
        }

        // Go through all sent / received offers and mark the items as in trade
        const activeCount = activeOrCreatedNeedsConfirmation.length;

        for (let i = 0; i < activeCount; i++) {
            const id = activeOrCreatedNeedsConfirmation[i];

            const offerData: UnknownDictionaryKnownValues =
                pollData.offerData === undefined ? {} : pollData.offerData[id] || {};

            const items = (offerData.items || []) as TradeOfferManager.TradeOfferItem[];
            const itemsCount = items.length;

            for (let i = 0; i < itemsCount; i++) {
                this.setItemInTrade = items[i].assetid;
            }
        }

        this.bot.manager.pollData = pollData;
    }

    onNewOffer(offer: TradeOffer): void {
        if (offer.isGlitched()) {
            offer.log('debug', 'is glitched');
            return;
        }

        offer.log('info', 'received offer');
        this.enqueueOffer(offer);
    }

    onOfferList(filter: number, sent: TradeOffer[], received: TradeOffer[]): void {
        // Go through all offers and add offers that we have not checked

        this.pollCount++;

        received.concat(sent).forEach(offer => {
            if (offer.state !== TradeOfferManager.ETradeOfferState['Active']) {
                if (offer.data('_ourItems') !== undefined) {
                    // Make sure that offers that are not active does not have items saved
                    offer.data('_ourItems', undefined);
                }
            }
        });

        const activeReceived = received.filter(offer => offer.state === TradeOfferManager.ETradeOfferState['Active']);
        const activeReceivedCount = activeReceived.length;

        if (
            filter === TradeOfferManager.EOfferFilter['ActiveOnly'] &&
            (this.pollCount * this.bot.manager.pollInterval) / (2 * 5 * 60 * 1000) >= 1
        ) {
            this.pollCount = 0;

            const activeSent = sent.filter(offer => offer.state === TradeOfferManager.ETradeOfferState['Active']);
            const activeSentCount = activeSent.length;

            const receivedOnHold = received.filter(
                offer => offer.state === TradeOfferManager.ETradeOfferState['InEscrow']
            ).length;

            const sentOnHold = sent.filter(
                offer => offer.state === TradeOfferManager.ETradeOfferState['InEscrow']
            ).length;

            log.verbose(
                `${activeReceivedCount} incoming ${pluralize('offer', activeReceivedCount)}${
                    activeReceivedCount > 0 ? ` [${activeReceived.map(offer => offer.id).join(', ')}]` : ''
                } (${receivedOnHold} on hold), ${activeSentCount} outgoing ${pluralize(
                    'offer',
                    activeSentCount
                )} (${sentOnHold} on hold)`
            );
        }

        activeReceived.filter(offer => offer.data('handledByUs') !== true).forEach(offer => this.enqueueOffer(offer));
    }

    isInTrade(assetid: string): boolean {
        const haveInTrade = this.itemsInTrade.some(v => assetid === v);
        return haveInTrade;
    }

    getActiveOffer(steamID: SteamID): string | null {
        const pollData = this.bot.manager.pollData;
        if (!pollData.offerData) {
            return null;
        }

        const steamID64 = typeof steamID === 'string' ? steamID : steamID.getSteamID64();
        for (const id in pollData.sent) {
            if (!Object.prototype.hasOwnProperty.call(pollData.sent, id)) {
                continue;
            }

            if (pollData.sent[id] !== TradeOfferManager.ETradeOfferState['Active']) {
                continue;
            }

            const data = pollData.offerData[id] || null;
            if (data === null) {
                continue;
            }

            if (data.partner === steamID64) {
                return id;
            }
        }

        return null;
    }

    getTradesWithPeople(steamIDs: SteamID[] | string[]): UnknownDictionary<number> {
        const tradesBySteamID = {};

        steamIDs.forEach((steamID: SteamID | string) => {
            tradesBySteamID[steamID.toString()] = 0;
        });

        for (const offerID in this.bot.manager.pollData.offerData) {
            if (!Object.prototype.hasOwnProperty.call(this.bot.manager.pollData.offerData, offerID)) {
                continue;
            }

            const offerData = this.bot.manager.pollData.offerData[offerID];
            if (!offerData.partner || tradesBySteamID[offerData.partner] === undefined) {
                continue;
            }

            tradesBySteamID[offerData.partner]++;
        }

        return tradesBySteamID;
    }

    getOffers(includeInactive = false): Promise<{
        sent: TradeOffer[];
        received: TradeOffer[];
    }> {
        return new Promise((resolve, reject) => {
            this.bot.manager.getOffers(
                includeInactive ? TradeOfferManager.EOfferFilter['All'] : TradeOfferManager.EOfferFilter['ActiveOnly'],
                (err, sent, received) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve({ sent, received });
                }
            );
        });
    }

    findMatchingOffer(
        offer: TradeOfferManager.TradeOffer,
        isSent: boolean
    ): Promise<TradeOfferManager.TradeOffer | null> {
        return this.getOffers().then(({ sent, received }) => {
            const match = (isSent ? sent : received).find(v => Trades.offerEquals(offer, v));

            return match === undefined ? null : match;
        });
    }

    private enqueueOffer(offer: TradeOffer): void {
        if (!this.receivedOffers.includes(offer.id)) {
            offer.itemsToGive.forEach(item => {
                this.setItemInTrade = item.assetid;
            });

            offer.data('partner', offer.partner.getSteamID64());

            this.receivedOffers.push(offer.id);

            log.debug('Added offer to queue');

            if (this.receivedOffers.length === 1) {
                this.processingOffer = true;

                log.debug('Only offer in queue, process it');

                this.handlerProcessOffer(offer);
            } else {
                log.debug('There are more offers in the queue');
                this.processNextOffer();
            }
        }
    }

    private dequeueOffer(offerId: string): void {
        const index = this.receivedOffers.indexOf(offerId);

        if (index !== -1) {
            this.receivedOffers.splice(index, 1);
        }
    }

    private handlerProcessOffer(offer: TradeOffer): void {
        log.debug('Giving offer to handler');

        const start = dayjs().valueOf();

        offer.data('handleTimestamp', start);

        void Promise.resolve(this.bot.handler.onNewTradeOffer(offer)).asCallback((err, response) => {
            if (err) {
                log.debug('Error occurred while handler was processing offer: ', err);
                throw err;
            }

            if (offer.data('dict') === undefined) {
                throw new Error('dict not saved on offer');
            }

            offer.data('handledByUs', true);
            const timeTaken = dayjs().valueOf() - start;

            offer.data('processOfferTime', timeTaken);
            log.debug(`Processing offer #${offer.id} took ${timeTaken} ms`);

            offer.log('debug', 'handler is done with offer', {
                response: response
            });

            if (!response) {
                return this.finishProcessingOffer(offer.id);
            }

            this.applyActionToOffer(response.action, response.reason, response.meta || {}, offer).finally(() => {
                this.finishProcessingOffer(offer.id);
            });
        });
    }

    applyActionToOffer(
        action: 'accept' | 'decline' | 'skip' | 'counter',
        reason: string,
        meta: Meta,
        offer: TradeOfferManager.TradeOffer
    ): Promise<void> {
        this.bot.handler.onOfferAction(offer, action, reason, meta);

        let actionFunc: () => Promise<any>;

        //Switch cases are superior (ﾉ´･ω･)ﾉ ﾐ ┸━┸. Change my mind.
        switch (action) {
            case 'accept':
                actionFunc = this.acceptOffer.bind(this, offer);
                break;
            case 'decline':
                actionFunc = this.declineOffer.bind(this, offer);
                break;
            case 'counter':
                actionFunc = this.counterOffer.bind(this, offer, meta);
                break;
        }

        offer.data('action', {
            action: action,
            reason: reason
        } as Action);

        if (action !== 'counter') {
            offer.data('meta', meta);

            if (meta.highValue) {
                offer.data('highValue', meta.highValue);
            }
        }

        if (action === 'skip') {
            offer.itemsToGive.forEach(item => {
                this.unsetItemInTrade = item.assetid;
            });
        }

        if (actionFunc === undefined) {
            return Promise.resolve();
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return actionFunc()
            .catch(err => {
                log.warn(`Failed to ${action} on the offer #${offer.id}: `, err);

                /* Ignore notifying admin if eresult is "AlreadyRedeemed" or "InvalidState", or if the message includes that */
                const isNotInvalidStates = (err as CustomError).eresult
                    ? ![11, 28].includes((err as CustomError).eresult)
                    : !(err as CustomError).message.includes('is not active, so it may not be accepted');

                if (isNotInvalidStates) {
                    const opt = this.bot.options;

                    if (opt.sendAlert.failedAccept) {
                        const keyPrices = this.bot.pricelist.getKeyPrices;
                        const value = t.valueDiff(offer, keyPrices, false, opt.miscSettings.showOnlyMetal.enable);

                        if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                            const summary = t.summarizeToChat(
                                offer,
                                this.bot,
                                'summary-accepting',
                                true,
                                value,
                                keyPrices,
                                false,
                                false
                            );
                            sendAlert(
                                `failed-${action}` as 'failed-accept' | 'failed-decline',
                                this.bot,
                                `Failed to ${action} on the offer #${offer.id}` +
                                    summary +
                                    `\n\nRetrying in 30 seconds, or you can try to force ${action} this trade, send "!f${action} ${offer.id}" now.`,
                                null,
                                err,
                                [offer.id]
                            );
                        } else {
                            const summary = t.summarizeToChat(
                                offer,
                                this.bot,
                                'summary-accepting',
                                false,
                                value,
                                keyPrices,
                                true,
                                false
                            );

                            this.bot.messageAdmins(
                                `Failed to ${action} on the offer #${offer.id}:` +
                                    summary +
                                    `\n\nRetrying in 30 seconds, you can try to force ${action} this trade, reply "!f${action} ${offer.id}" now.` +
                                    `\n\nError: ${
                                        (err as CustomError).eresult
                                            ? `${
                                                  TradeOfferManager.EResult[(err as CustomError).eresult] as string
                                              } - https://steamerrors.com/${(err as CustomError).eresult}`
                                            : (err as Error).message
                                    }`,
                                []
                            );
                        }
                    }
                }

                if (!['MANUAL-FORCE', 'AUTO-RETRY'].includes(reason) && ['accept', 'decline'].includes(action)) {
                    setTimeout(() => {
                        // Auto-retry after 30 seconds
                        void this.retryActionAfterFailure(offer.id, action as 'accept' | 'decline');
                    }, 30 * 1000);
                }
            })
            .finally(() => {
                offer.log('debug', 'done doing action on offer', {
                    action: action
                });
            });
    }

    private async retryActionAfterFailure(offerID: string, action: 'accept' | 'decline'): Promise<void> {
        const isRetryAccept = action === 'accept';

        const state = this.bot.manager.pollData.received[offerID];
        if (state === undefined) {
            log.warn(`❌ Failed to retry ${isRetryAccept ? 'declining' : 'accepting'} offer: Offer does not exist.`);
            return;
        }

        try {
            const offer = await this.getOffer(offerID);
            log.debug(`Auto retry ${isRetryAccept ? 'accepting' : 'declining'} offer...`);

            try {
                await this.applyActionToOffer(
                    isRetryAccept ? 'accept' : 'decline',
                    'AUTO-RETRY',
                    isRetryAccept ? (offer.data('meta') as Meta) : {},
                    offer
                );
            } catch (err) {
                // Ignore err
            }
        } catch (err) {
            // Ignore err
        }
    }

    private finishProcessingOffer(offerId): void {
        this.dequeueOffer(offerId);
        this.processingOffer = false;
        this.processNextOffer();
    }

    private processNextOffer(): void {
        log.debug('Processing next offer');
        if (this.processingOffer || this.receivedOffers.length === 0) {
            log.debug('Already processing offer or queue is empty');
            return;
        }

        this.processingOffer = true;

        const offerId = this.receivedOffers[0];

        log.verbose(`Handling offer #${offerId}...`);

        void this.getOffer(offerId).asCallback((err, offer) => {
            if (err) {
                log.warn(`Failed to get offer #${offerId}: `, err);
                // After many retries we could not get the offer data

                if (this.receivedOffers.length !== 1) {
                    // Remove the offer from the queue and add it to the back of the queue
                    this.receivedOffers.push(offerId);
                }
            }

            if (!offer) {
                log.debug('Failed to get offer');
                // Failed to get the offer
                this.finishProcessingOffer(offerId);
            } else {
                log.debug('Got offer, handling it');
                // Got the offer, give it to the handler
                this.handlerProcessOffer(offer);
            }
        });
    }

    getOffer(offerId: string, attempts = 0): Promise<TradeOffer> {
        return new Promise((resolve, reject) => {
            this.bot.manager.getOffer(offerId, (err, offer) => {
                attempts++;
                if (err) {
                    if (err.message === 'NoMatch' || err.message === 'No matching offer found') {
                        // The offer does not exist
                        return resolve(null);
                    }

                    if (attempts > 5) {
                        // Too many retries
                        return reject(err);
                    }

                    if (err.message !== 'Not Logged In') {
                        // We got an error getting the offer, retry after some time
                        return void Promise.delay(exponentialBackoff(attempts)).then(() => {
                            resolve(this.getOffer(offerId, attempts));
                        });
                    }

                    return void this.bot.getWebSession(true).asCallback(err => {
                        // If there is no error when waiting for web session, then attempt to fetch the offer right away
                        void Promise.delay(err !== null ? 0 : exponentialBackoff(attempts)).then(() => {
                            resolve(this.getOffer(offerId, attempts));
                        });
                    });
                }

                if (offer.state !== TradeOfferManager.ETradeOfferState['Active']) {
                    // Offer is not active
                    return resolve(null);
                }

                // Got offer
                return resolve(offer);
            });
        });
    }

    private acceptOffer(offer: TradeOffer): Promise<string> {
        return new Promise((resolve, reject) => {
            const start = dayjs().valueOf();
            offer.data('actionTimestamp', start);

            void this.acceptOfferRetry(offer).asCallback((err, status) => {
                const actionTime = dayjs().valueOf() - start;
                log.debug('actionTime', actionTime);

                if (err) {
                    return reject(err);
                }

                offer.log('trade', 'successfully accepted' + (status === 'pending' ? '; confirmation required' : ''));

                if (status === 'pending') {
                    // Maybe wait for confirmation to be accepted and then resolve?
                    this.acceptConfirmation(offer).catch(err => {
                        log.debug(`Error while trying to accept mobile confirmation on offer #${offer.id}: `, err);

                        const isNotIgnoredError =
                            !(err as CustomError).message?.includes('Could not act on confirmation') &&
                            !(err as CustomError).message?.includes('Could not find confirmation for object');

                        if (isNotIgnoredError) {
                            // Only notify if error is not "Could not act on confirmation" or not "Could not find confirmation for object"
                            const opt = this.bot.options;

                            if (opt.sendAlert.failedAccept) {
                                const keyPrices = this.bot.pricelist.getKeyPrices;
                                const value = t.valueDiff(
                                    offer,
                                    keyPrices,
                                    false,
                                    opt.miscSettings.showOnlyMetal.enable
                                );

                                if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url !== '') {
                                    const summary = t.summarizeToChat(
                                        offer,
                                        this.bot,
                                        'summary-accepting',
                                        true,
                                        value,
                                        keyPrices,
                                        false,
                                        false
                                    );
                                    sendAlert(
                                        `error-accept`,
                                        this.bot,
                                        `Error while trying to accept mobile confirmation on offer #${offer.id}` +
                                            summary +
                                            `\n\nThe offer might already get cancelled. You can check if this offer is still active by` +
                                            ` sending "!trade ${offer.id}"`,
                                        null,
                                        err,
                                        [offer.id]
                                    );
                                } else {
                                    const summary = t.summarizeToChat(
                                        offer,
                                        this.bot,
                                        'summary-accepting',
                                        false,
                                        value,
                                        keyPrices,
                                        true,
                                        false
                                    );

                                    this.bot.messageAdmins(
                                        `Error while trying to accept mobile confirmation on offer #${offer.id}:` +
                                            summary +
                                            `\n\nThe offer might already get cancelled. You can check if this offer is still active by` +
                                            ` sending "!trade ${offer.id}` +
                                            `\n\nError: ${
                                                (err as CustomError).eresult
                                                    ? `${
                                                          TradeOfferManager.EResult[
                                                              (err as CustomError).eresult
                                                          ] as string
                                                      } - https://steamerrors.com/${(err as CustomError).eresult}`
                                                    : (err as Error).message
                                            }`,
                                        []
                                    );
                                }
                            }

                            if (!this.retryAcceptOffer[offer.id]) {
                                // Only retry once
                                clearTimeout(this.resetRetryAcceptOfferTimeout);
                                this.retryAcceptOffer[offer.id] = true;

                                setTimeout(() => {
                                    // Auto-retry after 30 seconds
                                    void this.retryActionAfterFailure(offer.id, 'accept');
                                }, 30 * 1000);
                            }

                            this.resetRetryAcceptOfferTimeout = setTimeout(() => {
                                this.retryAcceptOffer = {};
                            }, 2 * 60 * 1000);
                        }
                    });
                }

                return resolve(status);
            });
        });
    }

    private counterOffer(offer: TradeOffer, meta: Meta): Promise<string> {
        return new Promise((resolve, reject) => {
            const start = dayjs().valueOf();

            const counter = offer.counter();
            const showOnlyMetal = this.bot.options.miscSettings.showOnlyMetal.enable;
            // To the person who thinks about changing it. I have a gun keep out ( う-´)づ︻╦̵̵̿╤── \(˚☐˚”)/
            // Extensive tutorial if you want to update this function https://www.youtube.com/watch?v=dQw4w9WgXcQ.
            counter.setMessage(
                "Oni-chan. I'm not a dummie (thicc) offer contains wrong value. You've probably made a few mistakes, here's the correct offer."
            );

            function getPriceOfSKU(sku: PureSKU) {
                const pures: PureSKU[] = ['5000;6', '5001;6', '5002;6'];
                const index = pures.indexOf(sku);
                return index !== -1 ? Math.pow(3, index) : keyPriceScrap;
            }

            function calculate(sku: PureSKU, side: Dict | number, increaseDifference: boolean, overpay?: boolean) {
                const value = getPriceOfSKU(sku);
                const floorCeil = Math[overpay ? 'ceil' : 'floor'];
                const length = typeof side === 'number' ? side : side[sku]?.length || 0;
                const amount =
                    Math.min(length, Math.max(floorCeil((difference * (increaseDifference ? -1 : 1)) / value), 0)) || 0;
                difference += amount * value * (increaseDifference ? 1 : -1);
                return amount;
            }
            // + for add - for remove
            function changeItems(side: 'My' | 'Their', Dict: Dict, amount: number, sku: PureSKU) {
                if (!amount) return;
                const intent = amount >= 0 ? 'add' : 'remove';
                const tradeAmount = Math.abs(amount);
                const arr = Dict[sku];
                const autobotSide = side == 'My' ? 'our' : 'their';
                const changedAmount = counter[(intent + side + 'Items') as 'addMyItems'](
                    arr.splice(0, tradeAmount).map(item => {
                        return {
                            appid: 440,
                            contextid: '2',
                            assetid: item.id
                        };
                    })
                );
                if (changedAmount !== tradeAmount) {
                    return reject(new Error(`Couldn't ${intent} ${autobotSide} ${tradeAmount} ${sku}'s to Trade`));
                }
                if (!showOnlyMetal && sku === '5021;6') {
                    tradeValues[autobotSide].keys += amount;
                } else {
                    tradeValues[autobotSide].scrap += amount * getPriceOfSKU(sku);
                }
                dataDict[autobotSide][sku] ??= 0;
                dataDict[autobotSide][sku] += amount;
            }
            const setOfferDataAndSend = () => {
                const handleTimestamp = offer.data('handleTimestamp') as number;
                counter.data('handleTimestamp', handleTimestamp);
                counter.data('notify', true);

                counter.data('value', {
                    our: {
                        total: tradeValues.our.keys * keyPriceScrap + tradeValues.our.scrap,
                        keys: tradeValues.our.keys,
                        metal: Currencies.toRefined(tradeValues.our.scrap)
                    },
                    their: {
                        total: tradeValues.their.keys * keyPriceScrap + tradeValues.their.scrap,
                        keys: tradeValues.their.keys,
                        metal: Currencies.toRefined(tradeValues.their.scrap)
                    },
                    rate: values.rate
                });
                //Backup it should never make it to here as an error
                if (
                    tradeValues.our.keys * keyPriceScrap + tradeValues.our.scrap !==
                    tradeValues.their.keys * keyPriceScrap + tradeValues.their.scrap
                ) {
                    throw new Error("Couldn't counter an offer value mismatch critical!");
                    //Maybe add some info that they can provide us so we can fix it if it happens again?
                }

                /*
                // For removing 0's from the Dict
                for (const side of ['our', 'their'] as ['our', 'their']) {
                    Object.keys(dataDict[side]).forEach(sku => {
                        if (dataDict[side][sku] === 0) delete dataDict[side][sku];
                    });
                }
                */
                counter.data('dict', dataDict);

                const processTime = offer.data('processOfferTime') as number;
                counter.data('processOfferTime', processTime);

                counter.data('action', {
                    action: 'counter',
                    reason: 'COUNTERED'
                } as Action);

                counter.data('meta', meta);

                if (meta.highValue) {
                    counter.data('highValue', meta.highValue);
                }

                const processCounterTime = dayjs().valueOf() - start;
                counter.data('processCounterTime', processCounterTime);

                void this.sendOffer(counter).then(status => {
                    if (status === 'pending') {
                        void this.acceptConfirmation(counter).reflect();
                    }

                    return resolve();
                });
            };

            const values = offer.data('value') as ItemsValue;
            const dataDict = offer.data('dict') as ItemsDict;

            const keyPriceScrap = Currencies.toScrap(values.rate);
            const tradeValues = {
                // Currencies.toScrap() could be used as well
                our: {
                    scrap: values.our.total - values.our.keys * keyPriceScrap,
                    keys: values.our.keys
                },
                their: {
                    scrap: values.their.total - values.their.keys * keyPriceScrap,
                    keys: values.their.keys
                }
            };
            const ourItems = Inventory.fromItems(
                this.bot.client.steamID || this.bot.community.steamID,
                offer.itemsToGive,
                this.bot.manager,
                this.bot.schema,
                this.bot.options,
                this.bot.effects,
                this.bot.paints,
                this.bot.strangeParts,
                'our'
            ).getItems;

            const theirItems = Inventory.fromItems(
                offer.partner,
                offer.itemsToReceive,
                this.bot.manager,
                this.bot.schema,
                this.bot.options,
                this.bot.effects,
                this.bot.paints,
                this.bot.strangeParts,
                'their'
            ).getItems;

            //Difference in metal if its higher than 0 that means we are overpaying
            let difference = values.our.total - values.their.total;

            // Don't remove the craft weapon from our side cause maybe they want our second banana (If you know what I mean OwO)
            // Rather add one and take a scrap from them ?

            //const needToGiveWeapon = difference - Math.trunc(difference) !== 0;
            /*
            if (this.bot.options.miscSettings.weaponsAsCurrency.enable && needToGiveWeapon) {
                const allWeapons = this.bot.handler.isWeaponsAsCurrency.withUncraft
                    ? this.bot.craftWeapons.concat(this.bot.uncraftWeapons)
                    : this.bot.craftWeapons;

                const skusFromPricelist = this.bot.pricelist.getPrices.map(entry => entry.sku);

                // return filtered weapons
                const filtered = allWeapons.filter(sku => !skusFromPricelist.includes(sku));

                const item = ourItems[filtered.find(sku => ourItems[sku])];
                if (item) {
                    const isAdded = offer.addMyItem({
                        appid: 440,
                        contextid: '2',
                        assetid: item[0].id
                    });
                    if (isAdded) {
                        // Round floating point errors that might occur
                        difference = Math.round(difference + 0.5);
                    }
                }
            }
            */

            const ItemsThatCanBeRemovedOur: Record<PureSKU, number> = {
                '5021;6': calculate('5021;6', ourItems, false, true),
                '5002;6': calculate('5002;6', ourItems, false),
                '5001;6': calculate('5001;6', ourItems, false),
                '5000;6': calculate('5000;6', ourItems, false)
            };

            if (difference === 0) {
                //We did it remove the said items by said amount and sent the counterOffer
                Object.keys(ItemsThatCanBeRemovedOur).forEach(key => {
                    const amount = -1 * ItemsThatCanBeRemovedOur[key as PureSKU] || 0;
                    changeItems('My', ourItems, amount, key as PureSKU);
                });

                return setOfferDataAndSend();
            }

            // add items from their side now
            // baseDifference is still kept because of
            // if baseDifference was a 20 refined
            // and It couldn't be removed from our side
            // we can make them give us a key and close the gap with refs from our side ?
            const theirInventory = new Inventory(
                offer.partner,
                this.bot.manager,
                this.bot.schema,
                this.bot.options,
                this.bot.effects,
                this.bot.paints,
                this.bot.strangeParts,
                'their'
            );

            void theirInventory.fetch().asCallback(err => {
                if (err) {
                    return reject(new Error('Failed to load inventories (Steam might be down)'));
                }

                const theirInvItems = theirInventory.getItems;
                //Filter their trade items
                Object.keys(theirItems).forEach(sku => {
                    theirInvItems[sku] = theirInvItems[sku].filter(
                        i => !theirItems[sku]?.find(i2 => i2.id === i.id) ?? true
                    );
                });

                //Add their items
                const ItemsThatCanBeAddedTheir: Record<PureSKU, number> = {
                    '5021;6': calculate('5021;6', theirInvItems, false),
                    '5002;6': calculate('5002;6', theirInvItems, false),
                    '5001;6': calculate('5001;6', theirInvItems, false),
                    '5000;6': calculate('5000;6', theirInvItems, false)
                };
                // if the difference is still bigger than 0 make them overpay.
                if (difference > 0) {
                    ItemsThatCanBeAddedTheir['5002;6'] += calculate(
                        '5002;6',
                        theirInvItems['5002;6']?.length - ItemsThatCanBeAddedTheir['5002;6'],
                        false,
                        true
                    );

                    ItemsThatCanBeAddedTheir['5001;6'] += calculate(
                        '5001;6',
                        theirInvItems['5001;6']?.length - ItemsThatCanBeAddedTheir['5001;6'],
                        false,
                        true
                    );

                    ItemsThatCanBeAddedTheir['5021;6'] += calculate(
                        '5021;6',
                        theirInvItems['5021;6']?.length - ItemsThatCanBeAddedTheir['5021;6'],
                        false,
                        true
                    );
                }

                // Smaller than 0 they are overpaying

                Object.keys(ItemsThatCanBeAddedTheir).forEach(sku => {
                    ItemsThatCanBeAddedTheir[sku] -= calculate(sku as PureSKU, ItemsThatCanBeAddedTheir[sku], true);
                });

                const ItemsThatCanBeRemovedTheir: Record<PureSKU, number> = {
                    '5021;6': calculate('5021;6', theirItems, true),
                    '5002;6': calculate('5002;6', theirItems, true),
                    '5001;6': calculate('5001;6', theirItems, true),
                    '5000;6': calculate('5000;6', theirItems, true)
                };

                if (difference === 0) {
                    //Add the items but we might need to sanitize
                    return sanitizer();
                }
                const ourInventory = new Inventory(
                    this.bot.client.steamID || this.bot.community.steamID,
                    this.bot.manager,
                    this.bot.schema,
                    this.bot.options,
                    this.bot.effects,
                    this.bot.paints,
                    this.bot.strangeParts,
                    'our'
                );

                void ourInventory.fetch().asCallback(err => {
                    if (err) {
                        return reject(new Error('Failed to load inventories (Steam might be down)'));
                    }

                    const ourInvItems = ourInventory.getItems;

                    //Filter our trade items
                    Object.keys(ourInvItems).forEach(sku => {
                        ourInvItems[sku] = ourInvItems[sku].filter(
                            i => !ourItems[sku]?.find(i2 => i2.id === i.id) ?? true
                        );
                    });

                    const ItemsThatCanBeAddedOur: Record<PureSKU, number> = {
                        '5021;6': calculate('5021;6', ourInvItems, true),
                        '5002;6': calculate('5002;6', ourInvItems, true),
                        '5001;6': calculate('5001;6', ourInvItems, true),
                        '5000;6': calculate('5000;6', ourInvItems, true)
                    };

                    if (difference === 0) {
                        //Add the items but we might need to sanitize
                        return sanitizer(ItemsThatCanBeAddedOur, ourInvItems);
                    }

                    reject(new Error(`Couldn't counter an offer value mismatch: ${difference}`));
                });

                function sanitizer(ItemsThatCanBeAddedOur?: Record<PureSKU, number>, myInvItems?: Dict) {
                    // Removes extra metal/key
                    // IE. if one side has two keys
                    // and the other 1
                    // should stop us from trading metal/key for a metal/key :)
                    for (const sku of ['5021;6', '5002;6', '5001;6', '5000;6'] as PureSKU[]) {
                        const maxRemOur = ourItems[sku]?.length || 0;
                        const ourRemoveAmount = ItemsThatCanBeRemovedOur[sku] || 0;
                        const ourGiveOrTake = Math.min(maxRemOur - ourRemoveAmount, ItemsThatCanBeAddedTheir[sku] || 0);

                        const maxRemTheir = theirItems[sku]?.length || 0;
                        const theirRemoveAmount = ItemsThatCanBeRemovedTheir?.[sku] || 0;
                        const theirGiveOrTake = Math.min(
                            maxRemTheir - theirRemoveAmount,
                            ItemsThatCanBeAddedOur?.[sku] || 0
                        );

                        const addAmount =
                            (ItemsThatCanBeAddedOur?.[sku] || 0) -
                            (ItemsThatCanBeAddedTheir[sku] || 0) +
                            ourGiveOrTake -
                            theirGiveOrTake;

                        if (addAmount > 0) {
                            if (!ItemsThatCanBeAddedOur) {
                                return reject(new Error("Can't add our Items before our inventory loads."));
                            }
                            // We Add
                            changeItems('My', myInvItems, addAmount, sku);
                        } else if (addAmount < 0) {
                            // They Add
                            changeItems('Their', theirInvItems, addAmount * -1, sku);
                        }

                        if (ourRemoveAmount > 0) {
                            // We Remove
                            changeItems('My', ourItems, (ourRemoveAmount + ourGiveOrTake) * -1, sku);
                        } else if (theirRemoveAmount > 0) {
                            // They Remove
                            changeItems('Their', theirItems, (theirRemoveAmount + theirGiveOrTake) * -1, sku);
                        }
                    }
                    return setOfferDataAndSend();
                }
            });
        });
    }

    acceptConfirmation(offer: TradeOffer): Promise<void> {
        return new Promise((resolve, reject) => {
            log.debug(`Accepting mobile confirmation...`, {
                offerId: offer.id
            });

            const start = dayjs().valueOf();
            log.debug('actedOnConfirmationTimestamp', start);

            this.bot.community.acceptConfirmationForObject(this.bot.options.steamIdentitySecret, offer.id, err => {
                const confirmationTime = dayjs().valueOf() - start;
                offer.data('confirmationTime', confirmationTime);

                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });
    }

    private acceptOfferRetry(offer: TradeOffer, attempts = 0): Promise<string> {
        return new Promise((resolve, reject) => {
            offer.accept((err: CustomError, status) => {
                attempts++;

                if (err) {
                    if (attempts > 5 || err.eresult !== undefined || err.cause !== undefined) {
                        return reject(err);
                    }

                    if (err.message !== 'Not Logged In') {
                        // We got an error getting the offer, retry after some time
                        return void Promise.delay(exponentialBackoff(attempts)).then(() => {
                            resolve(this.acceptOfferRetry(offer, attempts));
                        });
                    }

                    return void this.bot.getWebSession(true).asCallback(err => {
                        // If there is no error when waiting for web session, then attempt to fetch the offer right away
                        void Promise.delay(err !== null ? 0 : exponentialBackoff(attempts)).then(() => {
                            resolve(this.acceptOfferRetry(offer, attempts));
                        });
                    });
                }

                return resolve(status);
            });
        });
    }

    private declineOffer(offer: TradeOffer): Promise<void> {
        return new Promise((resolve, reject) => {
            const start = dayjs().valueOf();
            offer.data('actionTimestamp', start);

            offer.decline(err => {
                const actionTime = dayjs().valueOf() - start;
                offer.data('actionTime', actionTime);

                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });
    }

    sendOffer(offer: TradeOffer): Promise<string> {
        return new Promise((resolve, reject) => {
            offer.data('partner', offer.partner.getSteamID64());

            const ourItems: TradeOfferManager.TradeOfferItem[] = [];

            offer.itemsToGive.forEach(item => {
                this.setItemInTrade = item.assetid;
                ourItems.push(Trades.mapItem(item));
            });

            offer.data('_ourItems', ourItems);

            offer.data('handledByUs', true);

            const start = dayjs().valueOf();
            offer.data('actionTimestamp', start);

            log.debug('Sending offer...');

            void this.sendOfferRetry(offer, 0).asCallback((err, status) => {
                const actionTime = dayjs().valueOf() - start;
                offer.data('actionTime', actionTime);

                if (err) {
                    offer.itemsToGive.forEach(item => {
                        this.unsetItemInTrade = item.assetid;
                    });
                    return reject(err);
                }

                offer.log('trade', 'successfully created' + (status === 'pending' ? '; confirmation required' : ''));

                return resolve(status);
            });
        });
    }

    private sendOfferRetry(offer: TradeOffer, attempts = 0): Promise<string> {
        return new Promise((resolve, reject) => {
            offer.send((err: CustomError, status) => {
                attempts++;

                if (err) {
                    if (
                        attempts > 5 ||
                        err.message.includes('can only be sent to friends') ||
                        err.message.includes('is not available to trade') ||
                        err.message.includes('maximum number of items allowed in your Team Fortress 2 inventory')
                    ) {
                        return reject(err);
                    }

                    if (err.cause !== undefined) {
                        return reject(err);
                    }

                    if (err.eresult === TradeOfferManager.EResult['Revoked']) {
                        // One or more of the items does not exist in the inventories, refresh our inventory and return the error
                        return void this.bot.inventoryManager.getInventory.fetch().asCallback(() => {
                            reject(err);
                        });
                    } else if (err.eresult === TradeOfferManager.EResult['Timeout']) {
                        // The offer may or may not have been made, will wait some time and check if if we can find a matching offer
                        return void Promise.delay(exponentialBackoff(attempts, 4000)).then(() => {
                            // Done waiting, try and find matching offer
                            void this.findMatchingOffer(offer, true).asCallback((err, match) => {
                                if (err) {
                                    // Failed to get offers, return error
                                    return reject(err);
                                }

                                if (match === null) {
                                    // Did not find a matching offer, retry sending the offer
                                    return void this.sendOfferRetry(offer, attempts);
                                }

                                // Update the offer we attempted to send with the properties from the matching offer
                                offer.id = match.id;
                                offer.state = match.state;
                                offer.created = match.created;
                                offer.updated = match.updated;
                                offer.expires = match.expires;
                                offer.confirmationMethod = match.confirmationMethod;

                                for (const property in offer._tempData) {
                                    if (Object.prototype.hasOwnProperty.call(offer._tempData, property)) {
                                        offer.manager.pollData.offerData = offer.manager.pollData.offerData || {};
                                        offer.manager.pollData.offerData[offer.id] =
                                            offer.manager.pollData.offerData[offer.id] || {};
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                        offer.manager.pollData.offerData[offer.id][property] =
                                            offer._tempData[property];
                                    }
                                }

                                delete offer._tempData;

                                offer.manager.emit('pollData', offer.manager.pollData);

                                return resolve(
                                    offer.state === TradeOfferManager.ETradeOfferState['CreatedNeedsConfirmation']
                                        ? 'pending'
                                        : 'sent'
                                );
                            });
                        });
                    } else if (err.eresult !== undefined) {
                        return reject(err);
                    }

                    if (err.message !== 'Not Logged In') {
                        // We got an error getting the offer, retry after some time
                        return void Promise.delay(exponentialBackoff(attempts)).then(() => {
                            resolve(this.sendOfferRetry(offer, attempts));
                        });
                    }

                    return void this.bot.getWebSession(true).asCallback(err => {
                        // If there is no error when waiting for web session, then attempt to fetch the offer right away
                        void Promise.delay(err !== null ? 0 : exponentialBackoff(attempts)).then(() => {
                            resolve(this.sendOfferRetry(offer, attempts));
                        });
                    });
                }

                resolve(status);
            });
        });
    }

    checkEscrow(offer: TradeOffer): Promise<boolean> {
        log.debug('Checking escrow');
        clearTimeout(this.restartOnEscrowCheckFailed);

        return new Promise((resolve, reject) => {
            const operation = retry.operation({
                retries: 5,
                factor: 2,
                minTimeout: 1000,
                randomize: true
            });

            operation.attempt(() => {
                log.debug('Attempting to check escrow...');
                offer.getUserDetails((err, me, them) => {
                    log.debug('Escrow callback');
                    if (!err || err.message !== 'Not Logged In') {
                        // No error / not because session expired
                        if (operation.retry(err)) {
                            return;
                        }

                        if (err) {
                            this.escrowCheckFailedCount++;

                            clearTimeout(this.restartOnEscrowCheckFailed);
                            this.restartOnEscrowCheckFailed = setTimeout(() => {
                                // call function to automatically restart the bot after 2 seconds
                                void this.triggerRestartBot(offer.partner);
                            }, 2 * 1000);

                            return reject(operation.mainError());
                        }

                        log.debug('Done checking escrow');

                        this.escrowCheckFailedCount = 0;
                        return resolve(them.escrowDays !== 0);
                    }

                    // Reset attempts
                    operation.reset();

                    // Wait for bot to sign in to retry
                    void this.bot.getWebSession(true).asCallback(() => {
                        // Callback was called, ignore error from callback and retry
                        operation.retry(err);
                    });
                });
            });
        });
    }

    private retryToRestart(steamID: SteamID | string): void {
        this.restartOnEscrowCheckFailed = setTimeout(() => {
            void this.triggerRestartBot(steamID);
        }, 3 * 60 * 1000);
    }

    private async triggerRestartBot(steamID: SteamID | string): Promise<void> {
        log.debug(`Escrow check problem occured, current failed count: ${this.escrowCheckFailedCount}`);

        if (this.escrowCheckFailedCount >= 2) {
            // if escrow check failed more than or equal to 2 times, then perform automatic restart (PM2 only)

            const dwEnabled =
                this.bot.options.discordWebhook.sendAlert.enable &&
                this.bot.options.discordWebhook.sendAlert.url !== '';

            // determine whether it's good time to restart or not
            try {
                // test if backpack.tf is alive by performing bptf banned check request
                await isBptfBanned(steamID, this.bot.options.bptfAPIKey);
            } catch (err) {
                // do not restart, try again after 3 minutes
                clearTimeout(this.restartOnEscrowCheckFailed);
                this.retryToRestart(steamID);

                if (dwEnabled) {
                    return sendAlert(
                        'escrow-check-failed-not-restart-bptf-down',
                        this.bot,
                        null,
                        this.escrowCheckFailedCount
                    );
                } else {
                    return this.bot.messageAdmins(
                        `❌ Unable to perform automatic restart due to Escrow check problem, which has failed for ${pluralize(
                            'time',
                            this.escrowCheckFailedCount,
                            true
                        )} because backpack.tf is currently down.`,
                        []
                    );
                }
            }

            const now = dayjs().tz('UTC').format('dddd THH:mm');
            const array30Minutes = [];
            array30Minutes.length = 30;

            const isSteamNotGoodNow =
                now.includes('Tuesday') && array30Minutes.some((v, i) => now.includes(`T23:${i < 10 ? `0${i}` : i}`));

            if (isSteamNotGoodNow) {
                // do not restart during Steam weekly maintenance, try again after 3 minutes
                clearTimeout(this.restartOnEscrowCheckFailed);
                this.retryToRestart(steamID);

                if (dwEnabled) {
                    return sendAlert(
                        'escrow-check-failed-not-restart-steam-maintenance',
                        this.bot,
                        null,
                        this.escrowCheckFailedCount
                    );
                } else {
                    return this.bot.messageAdmins(
                        `❌ Unable to perform automatic restart due to Escrow check problem, which has failed for ${pluralize(
                            'time',
                            this.escrowCheckFailedCount,
                            true
                        )} because Steam is currently down.`,
                        []
                    );
                }
            } else {
                // Good to perform automatic restart
                if (dwEnabled) {
                    sendAlert('escrow-check-failed-perform-restart', this.bot, null, this.escrowCheckFailedCount);
                    void this.bot.botManager
                        .restartProcess()
                        .then(restarting => {
                            if (!restarting) {
                                return sendAlert('failedPM2', this.bot);
                            }
                            this.bot.sendMessage(steamID, '🙇‍♂️ Sorry! Something went wrong. I am restarting myself...');
                        })
                        .catch(err => {
                            log.warn('Error occurred while trying to restart: ', err);
                            sendAlert('failedRestartError', this.bot, null, null, err);
                        });
                } else {
                    this.bot.messageAdmins(
                        `⚠️ [Escrow check failed alert] Current failed count: ${
                            this.escrowCheckFailedCount
                        }\n\n${t.uptime()}`,
                        []
                    );
                    void this.bot.botManager
                        .restartProcess()
                        .then(restarting => {
                            if (!restarting) {
                                return this.bot.messageAdmins(
                                    `❌ Automatic restart on Escrow check problem failed because you're not running the bot with PM2!`,
                                    []
                                );
                            }
                            this.bot.messageAdmins(`🔄 Restarting...`, []);
                            this.bot.sendMessage(steamID, '🙇‍♂️ Sorry! Something went wrong. I am restarting myself...');
                        })
                        .catch(err => {
                            log.warn('Error occurred while trying to restart: ', err);
                            this.bot.messageAdmins(
                                `❌ An error occurred while trying to restart: ${(err as Error).message}`,
                                []
                            );
                        });
                }
            }
        }
    }

    onOfferChanged(offer: TradeOffer, oldState: number): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const action: undefined | { action: 'accept' | 'decline'; reason: string } = offer.data('action');

        offer.log(
            'verbose',
            `state changed: ${TradeOfferManager.ETradeOfferState[oldState] as string} -> ${
                TradeOfferManager.ETradeOfferState[offer.state] as string
            }${
                (action?.action === 'accept' && offer.state === TradeOfferManager.ETradeOfferState['Accepted']) ||
                (action?.action === 'decline' && offer.state === TradeOfferManager.ETradeOfferState['Declined'])
                    ? ' (reason: ' + action.reason + ')'
                    : ''
            }`
        );

        const finishTimestamp = dayjs().valueOf();

        const timeTakenToComplete = finishTimestamp - offer.data('handleTimestamp');

        if (
            offer.state === TradeOfferManager.ETradeOfferState['Active'] ||
            offer.state === TradeOfferManager.ETradeOfferState['CreatedNeedsConfirmation']
        ) {
            // Offer is active

            // Mark items as in trade
            offer.itemsToGive.forEach(item => {
                this.setItemInTrade = item.id;
            });

            if (offer.isOurOffer && offer.data('_ourItems') === undefined) {
                // Items are not saved for sent offer, save them
                offer.data(
                    '_ourItems',
                    offer.itemsToGive.map(item => Trades.mapItem(item))
                );
            }
        } else {
            // Offer is not active and the items are no longer in trade
            offer.itemsToGive.forEach(item => {
                this.unsetItemInTrade = item.assetid;
            });

            // Unset items
            offer.data('_ourItems', undefined);

            offer.data('finishTimestamp', finishTimestamp);

            log.debug(`Took ${isNaN(timeTakenToComplete) ? 'unknown' : timeTakenToComplete} ms to complete the offer`, {
                offerId: offer.id,
                state: offer.state,
                finishTime: timeTakenToComplete
            });
        }

        if (
            offer.state !== TradeOfferManager.ETradeOfferState['Accepted'] &&
            offer.state !== TradeOfferManager.ETradeOfferState['InEscrow']
        ) {
            // The offer was not accepted
            return this.bot.handler.onTradeOfferChanged(offer, oldState);
        }

        offer.data('isAccepted', true);

        offer.itemsToGive.forEach(item => this.bot.inventoryManager.getInventory.removeItem(item.assetid));

        // Exit all running apps ("TF2Autobot v#" or custom, and Team Fortress 2)
        // Will play again after craft/smelt/sort inventory job
        // https://github.com/TF2Autobot/tf2autobot/issues/527
        this.bot.client.gamesPlayed([]);

        void this.bot.inventoryManager.getInventory.fetch().asCallback(() => {
            this.bot.handler.onTradeOfferChanged(offer, oldState, timeTakenToComplete);
        });
    }

    private set setItemInTrade(assetid: string) {
        const index = this.itemsInTrade.indexOf(assetid);

        if (index === -1) {
            this.itemsInTrade.push(assetid);
        }

        const fixDuplicate = new Set(this.itemsInTrade);
        this.itemsInTrade = [...fixDuplicate];
    }

    private set unsetItemInTrade(assetid: string) {
        const index = this.itemsInTrade.indexOf(assetid);

        if (index !== -1) {
            this.itemsInTrade.splice(index, 1);
        }
    }

    static offerEquals(a: TradeOffer, b: TradeOffer): boolean {
        return (
            a.isOurOffer === b.isOurOffer &&
            a.partner.getSteamID64() === b.partner.getSteamID64() &&
            Trades.itemsEquals(a.itemsToGive, b.itemsToGive) &&
            Trades.itemsEquals(a.itemsToReceive, b.itemsToReceive)
        );
    }

    static itemsEquals(a: TradeOfferManager.EconItem[], b: TradeOfferManager.EconItem[]): boolean {
        if (a.length !== b.length) {
            return false;
        }

        const copy = b.slice(0);
        const aCount = a.length;

        for (let i = 0; i < aCount; i++) {
            // Find index of matching item
            const index = copy.findIndex(item => Trades.itemEquals(item, a[i]));
            if (index === -1) {
                // Item was not found, offers don't match
                return false;
            }

            // Remove match from list
            copy.splice(index, 1);
        }

        return copy.length === 0;
    }

    static itemEquals(a: TradeOfferManager.EconItem, b: TradeOfferManager.EconItem): boolean {
        return a.appid == b.appid && a.contextid == b.contextid && (a.assetid || a.id) == (b.assetid || b.id);
    }

    static mapItem(item: EconItem): TradeOfferManager.TradeOfferItem {
        return {
            appid: item.appid,
            contextid: item.contextid,
            assetid: item.assetid,
            amount: item.amount
        };
    }
}
