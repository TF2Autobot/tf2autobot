import TradeOfferManager, {
    TradeOffer,
    EconItem,
    CustomError,
    Meta,
    Action,
    ItemsValue,
    ItemsDict,
    Prices
} from '@tf2autobot/tradeoffer-manager';
import dayjs from 'dayjs';
import pluralize from 'pluralize';
import retry from 'retry';
import SteamID from 'steamid';
import Currencies from '@tf2autobot/tf2-currencies';
import timersPromises from 'timers/promises';

import { UnknownDictionaryKnownValues, UnknownDictionary } from '../types/common';
import Bot from './Bot';
import Inventory, { Dict } from './Inventory';

import log from '../lib/logger';
import { exponentialBackoff } from '../lib/helpers';
import { sendAlert } from './DiscordWebhook/export';
import { isBptfBanned } from '../lib/bans';
import * as t from '../lib/tools/export';

type PureSKU = '5021;6' | '5002;6' | '5001;6' | '5000;6';
type AddOrRemoveMyOrTheirItems = 'addMyItems' | 'removeMyItems' | 'addTheirItems' | 'removeTheirItems';
type FailedActions = 'failed-accept' | 'failed-decline' | 'failed-counter';

export default class Trades {
    private itemsInTrade: string[] = [];

    private receivedOffers: string[] = [];

    private processingOffer = false;

    private pollCount = 0;

    private escrowCheckFailedCount = 0;

    private restartOnEscrowCheckFailed: NodeJS.Timeout;

    private retryAcceptOffer: UnknownDictionary<boolean> = {};

    private resetRetryAcceptOfferTimeout: NodeJS.Timeout;

    private retryFetchInventoryTimeout: NodeJS.Timeout;

    private calledRetryFetchFreq = 0;

    private offerChangedAcc: { offer: TradeOffer; oldState: number; timeTakenToComplete: number }[] = [];

    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    onPollData(pollData: TradeOfferManager.PollData): void {
        this.bot.handler.onPollData(pollData);
    }

    setPollData(pollData: TradeOfferManager.PollData): void {
        const active = this.getActiveOffers(pollData);
        const activeOrCreatedNeedsConfirmation = active.sent.concat(active.received);

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

    getActiveOffers(pollData: TradeOfferManager.PollData) {
        const sent: string[] = [];
        const received: string[] = [];

        for (const id in pollData.sent) {
            if (!Object.prototype.hasOwnProperty.call(pollData.sent, id)) {
                continue;
            }

            const state = pollData.sent[id];
            if (
                state === TradeOfferManager.ETradeOfferState['Active'] ||
                state === TradeOfferManager.ETradeOfferState['CreatedNeedsConfirmation']
            ) {
                sent.push(id);
            }
        }

        for (const id in pollData.received) {
            if (!Object.prototype.hasOwnProperty.call(pollData.received, id)) {
                continue;
            }

            const state = pollData.received[id];
            if (state === TradeOfferManager.ETradeOfferState['Active']) {
                received.push(id);
            }
        }

        return { sent, received };
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
                (includeInactive
                    ? TradeOfferManager.EOfferFilter['All']
                    : TradeOfferManager.EOfferFilter['ActiveOnly']) as number,
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

        void Promise.resolve(this.bot.handler.onNewTradeOffer(offer))
            .then(response => {
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
            })
            .catch((err: Error) => {
                log.error('Error occurred while handler was processing offer: ', err);
                // No throw here, because handlerProcessOffer will not handle catch.
                this.processingOffer = false;
                this.processNextOffer();
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
                this.onFailedAction(offer, action, reason, err);

                if (action === 'counter') {
                    action = 'decline';
                    reason = 'COUNTER_INVALID_VALUE_FAILED';

                    offer.data('action', {
                        action: action,
                        reason: reason
                    } as Action);

                    actionFunc = this.declineOffer.bind(this, offer);

                    return actionFunc().catch(err => {
                        this.onFailedAction(offer, action, reason, err);
                    });
                }
            })
            .finally(() => {
                offer.log('debug', 'done doing action on offer', {
                    action: action
                });
            });
    }

    private onFailedAction(
        offer: TradeOffer,
        action: 'accept' | 'decline' | 'skip' | 'counter',
        reason: string,
        err: any
    ): void {
        log.warn(`Failed to ${action} on the offer #${offer.id}: `, err);

        /* Ignore notifying admin if eresult is "AlreadyRedeemed" or "InvalidState", or if the message includes that */
        const isNotInvalidStates = (err as CustomError).eresult
            ? ![11, 28].includes((err as CustomError).eresult)
            : !(err as CustomError).message.includes('is not active, so it may not be accepted');

        if (isNotInvalidStates) {
            const opt = this.bot.options;

            if (opt.sendAlert.enable && opt.sendAlert.failedAccept) {
                const value = t.valueDiff(offer);

                if (opt.discordWebhook.sendAlert.enable && opt.discordWebhook.sendAlert.url.main !== '') {
                    const summary = t.summarizeToChat(offer, this.bot, 'summary-accepting', true, value, false, false);
                    sendAlert(
                        `failed-${action}` as FailedActions,
                        this.bot,
                        `Failed to ${action} on the offer #${offer.id}` +
                            summary +
                            (action === 'counter'
                                ? '\n\nThe offer has been automatically declined.'
                                : `\n\nRetrying in 30 seconds, or you can try to force ${action} this trade, send "${this.bot.getPrefix()}f${action} ${
                                      offer.id
                                  }" now.`),
                        null,
                        err,
                        [offer.id]
                    );
                } else {
                    const summary = t.summarizeToChat(offer, this.bot, 'summary-accepting', false, value, true, false);

                    this.bot.messageAdmins(
                        `Failed to ${action} on the offer #${offer.id}:` +
                            summary +
                            (action === 'counter'
                                ? '\n\nThe offer has been automatically declined.'
                                : `\n\nRetrying in 30 seconds, you can try to force ${action} this trade, reply "${this.bot.getPrefix()}f${action} ${
                                      offer.id
                                  }" now.`) +
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

    private finishProcessingOffer(offerId: string): void {
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

        this.getOffer(offerId)
            .then(offer => {
                if (!offer) {
                    log.debug('Failed to get offer');
                    // Failed to get the offer
                    this.finishProcessingOffer(offerId);
                } else {
                    log.debug('Got offer, handling it');
                    // Got the offer, give it to the handler
                    this.handlerProcessOffer(offer);
                }
            })
            .catch((err: Error) => {
                log.warn(`Failed to get offer #${offerId}: `, err);
                // After many retries we could not get the offer data

                if (this.receivedOffers.length !== 1) {
                    // Remove the offer from the queue and add it to the back of the queue
                    this.receivedOffers.push(offerId);
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
                        return void timersPromises.setTimeout(exponentialBackoff(attempts)).then(() => {
                            resolve(this.getOffer(offerId, attempts));
                        });
                    }

                    return void this.bot
                        .getWebSession(true)
                        .catch((err: Error) => err)
                        .then(err => {
                            // If there is no error when waiting for web session, then attempt to fetch the offer right away
                            void timersPromises.setTimeout(err !== null ? 0 : exponentialBackoff(attempts)).then(() => {
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

            void this.acceptOfferRetry(offer)
                .then(status => {
                    offer.log(
                        'trade',
                        'successfully accepted' + (status === 'pending' ? '; confirmation required' : '')
                    );

                    if (status === 'pending') {
                        // Maybe wait for confirmation to be accepted and then resolve?
                        this.acceptConfirmation(offer).catch(err => {
                            log.warn(`Error while trying to accept mobile confirmation on offer #${offer.id}: `, err);

                            const isNotIgnoredError =
                                !(err as CustomError).message?.includes('Could not act on confirmation') &&
                                !(err as CustomError).message?.includes('Could not find confirmation for object');

                            if (isNotIgnoredError) {
                                // Only notify if error is not "Could not act on confirmation" or not "Could not find confirmation for object"
                                const opt = this.bot.options;

                                if (opt.sendAlert.enable && opt.sendAlert.failedAccept) {
                                    const value = t.valueDiff(offer);

                                    if (
                                        opt.discordWebhook.sendAlert.enable &&
                                        opt.discordWebhook.sendAlert.url.main !== ''
                                    ) {
                                        const summary = t.summarizeToChat(
                                            offer,
                                            this.bot,
                                            'summary-accepting',
                                            true,
                                            value,
                                            false,
                                            false
                                        );
                                        sendAlert(
                                            `error-accept`,
                                            this.bot,
                                            `Error while trying to accept mobile confirmation on offer #${offer.id}` +
                                                summary +
                                                `\n\nThe offer might already get cancelled. You can check if this offer is still active by` +
                                                ` sending "${this.bot.getPrefix()}trade ${offer.id}"`,
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
                                            true,
                                            false
                                        );

                                        this.bot.messageAdmins(
                                            `Error while trying to accept mobile confirmation on offer #${offer.id}:` +
                                                summary +
                                                `\n\nThe offer might already get cancelled. You can check if this offer is still active by` +
                                                ` sending "${this.bot.getPrefix()}trade ${offer.id}` +
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
                })
                .catch((err: Error) => {
                    const actionTime = dayjs().valueOf() - start;
                    log.debug('actionTime', actionTime);
                    return reject(err);
                });
        });
    }

    private counterOffer(offer: TradeOffer, meta: Meta): Promise<void> {
        return new Promise((resolve, reject) => {
            const start = dayjs().valueOf();

            const opt = this.bot.options;

            const ourItems = Inventory.fromItems(
                this.bot.client.steamID || this.bot.community.steamID,
                offer.itemsToGive,
                this.bot,
                'our',
                this.bot.boundInventoryGetter
            ).getItems;

            const theirItems = Inventory.fromItems(
                offer.partner,
                offer.itemsToReceive,
                this.bot,
                'their',
                this.bot.boundInventoryGetter
            ).getItems;

            const ourInventoryItems = this.bot.inventoryManager.getInventory.getItems;

            const theirInventory = new Inventory(offer.partner, this.bot, 'their', this.bot.boundInventoryGetter);

            log.debug('Fetching their inventory...');
            void theirInventory
                .fetch()
                .then(() => {
                    const theirInventoryItems = theirInventory.getItems;

                    log.debug('Set counteroffer...');
                    const counter = offer.counter();

                    const showOnlyMetal = opt.miscSettings.showOnlyMetal.enable;
                    // To the person who thinks about changing it. I have a gun keep out ( う-´)づ︻╦̵̵̿╤── \(˚☐˚”)/
                    // Extensive tutorial if you want to update this function https://www.youtube.com/watch?v=dQw4w9WgXcQ.

                    log.debug('Set counteroffer message...');
                    const customMessage = opt.customMessage.counterOffer;
                    counter.setMessage(
                        customMessage
                            ? customMessage
                            : "Your offer contains wrong value. You've probably made a few mistakes, here's the correct offer."
                    );

                    function getPureValue(sku: PureSKU) {
                        if (sku === '5021;6') return keyPriceScrap;
                        const pures: PureSKU[] = ['5000;6', '5001;6', '5002;6'];
                        const index = pures.indexOf(sku);
                        return index === -1 ? 0 : Math.pow(3, index);
                    }

                    let lockKeys = false;
                    function calculate(
                        sku: PureSKU,
                        side: Dict | number,
                        increaseDifference: boolean,
                        overpay?: boolean
                    ) {
                        const value = getPureValue(sku);
                        if (!value) return 0;
                        if (possibleKeyTrade && sku == '5021;6') {
                            const ret =
                                increaseDifference === keyDifference > 0 && !lockKeys ? Math.abs(keyDifference) : 0;
                            lockKeys = !!ret;
                            return ret;
                        }
                        const floorCeil = Math[overpay ? 'ceil' : 'floor'];
                        const length = typeof side === 'number' ? side : side[sku]?.length || 0;
                        const amount =
                            Math.min(
                                length,
                                Math.max(floorCeil((NonPureWorth * (increaseDifference ? -1 : 1)) / value), 0)
                            ) || 0;

                        NonPureWorth += amount * value * (increaseDifference ? 1 : -1);
                        return amount;
                    }

                    // + for add - for remove
                    function changeItems(side: 'My' | 'Their', dict: Dict, amount: number, sku: PureSKU) {
                        if (!amount) return;
                        const intent = amount >= 0 ? 'add' : 'remove';
                        const tradeAmount = Math.abs(amount);
                        const arr = dict[sku];
                        const whichSide = side == 'My' ? 'our' : 'their';
                        const changedAmount = counter[(intent + side + 'Items') as AddOrRemoveMyOrTheirItems](
                            arr.splice(0, tradeAmount).map(item => {
                                return {
                                    appid: 440,
                                    contextid: '2',
                                    assetid: item.id
                                };
                            })
                        );

                        if (changedAmount !== tradeAmount) {
                            return reject(
                                new Error(`Couldn't ${intent} ${whichSide} ${tradeAmount} ${sku}'s to Trade`)
                            );
                        }

                        if (!showOnlyMetal && !possibleKeyTrade && sku === '5021;6') {
                            tradeValues[whichSide].keys += amount;
                        } else {
                            tradeValues[whichSide].scrap +=
                                amount *
                                (possibleKeyTrade && sku == '5021;6' && side == 'Their'
                                    ? Currencies.toScrap(prices['5021;6'].buy.metal)
                                    : getPureValue(sku));
                        }

                        dataDict[whichSide][sku] ??= 0;
                        dataDict[whichSide][sku] += amount;

                        // For removing 0's from the dict
                        if (dataDict[whichSide][sku] === 0) {
                            delete dataDict[whichSide][sku];
                        }
                    }

                    const setOfferDataAndSend = () => {
                        // Backup it should never make it to here as an error
                        log.debug('Checking final mismatch...');
                        if (
                            tradeValues.our.keys * keyPriceScrap + tradeValues.our.scrap !==
                            tradeValues.their.keys * keyPriceScrap + tradeValues.their.scrap
                        ) {
                            return reject(
                                new Error(
                                    `Couldn't counter an offer - value mismatch:\n${JSON.stringify({
                                        value: NonPureWorth,
                                        needToTakeWeapon,
                                        ourTradesValue: tradeValues.our,
                                        ourItems: dataDict.our,
                                        theirTradesValue: tradeValues.their,
                                        theirItems: dataDict.their
                                    })}`
                                )
                            );
                            // Maybe add some info that they can provide us so we can fix it if it happens again?
                        }

                        // Set polldata datas
                        log.debug('Setting counter polldata...');
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

                        counter.data('dict', dataDict);

                        counter.data('prices', prices);

                        counter.data('action', {
                            action: 'counter',
                            reason: 'COUNTERED'
                        } as Action);

                        counter.data('meta', meta);

                        if (meta.highValue) {
                            counter.data('highValue', meta.highValue);
                        }

                        const processTime = offer.data('processOfferTime') as number;
                        counter.data('processOfferTime', processTime);
                        const processCounterTime = dayjs().valueOf() - start;
                        counter.data('processCounterTime', processCounterTime);

                        // Send countered offer
                        log.debug('Sending countered offer...');
                        void this.sendOffer(counter)
                            .then(status => {
                                log.debug('Countered offer sent.');
                                if (status === 'pending') {
                                    log.debug('Accepting mobile confirmation...');
                                    void this.acceptConfirmation(counter);
                                }

                                log.debug(`Done counteroffer for offer #${offer.id}`);
                                return resolve();
                            })
                            .catch(err => {
                                const errStringify = JSON.stringify(err);
                                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                                reject(new Error(`Something wrong while sending countered offer: ${errMessage}`));
                            });
                    };

                    const values = offer.data('value') as ItemsValue;
                    const dataDict = offer.data('dict') as ItemsDict;
                    const prices = offer.data('prices') as Prices;

                    const keyPriceScrap = Currencies.toScrap(values.rate);
                    const tradeValues = {
                        our: {
                            scrap: values.our.total - values.our.keys * keyPriceScrap,
                            keys: values.our.keys
                        },
                        their: {
                            scrap: values.their.total - values.their.keys * keyPriceScrap,
                            keys: values.their.keys
                        }
                    };

                    const isWACEnabled = opt.miscSettings.weaponsAsCurrency.enable;
                    const isUncraftEnabled = opt.miscSettings.weaponsAsCurrency.withUncraft;
                    const weapons = isUncraftEnabled
                        ? this.bot.craftWeapons.concat(this.bot.uncraftWeapons)
                        : this.bot.craftWeapons;

                    // Bigger than 0 ? they have to pay : we have to pay
                    const puresWithKeys = ['5000;6', '5001;6', '5002;6', '5021;6'];
                    let hasMissingPrices = false;

                    let possibleKeyTrade = true;
                    let keyDifference = 0;

                    let NonPureWorth = (['our', 'their'] as ['our', 'their'])
                        .map((side, index) => {
                            const buySell = index ? 'buy' : 'sell';
                            return (
                                Object.keys(dataDict[side])
                                    .map(assetKey => {
                                        if (prices[assetKey] === undefined && !puresWithKeys.includes(assetKey)) {
                                            hasMissingPrices = true;
                                            return 0;
                                        }

                                        if (assetKey == '5021;6')
                                            keyDifference += dataDict[side][assetKey] * (side == 'our' ? 1 : -1);
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                                        if (!dataDict[side][assetKey] || getPureValue(assetKey as any) !== 0) return 0;

                                        possibleKeyTrade = false; //Offer contains something other than pures

                                        if (isWACEnabled && weapons.includes(assetKey))
                                            return 0.5 * dataDict[side][assetKey];

                                        return (
                                            dataDict[side][assetKey] *
                                            (prices[assetKey][buySell].keys * keyPriceScrap +
                                                Currencies.toScrap(prices[assetKey][buySell].metal))
                                        );
                                    })
                                    .reduce((a, b) => a + b, 0) * (side == 'their' ? -1 : 1)
                            );
                        })
                        .reduce((a, b) => b + a, 0);

                    if (hasMissingPrices) {
                        return reject(
                            new Error(
                                `Failed to counter offer #${
                                    offer.id
                                } - offer data was not properly saved: ${JSON.stringify({ values, dataDict, prices })}`
                            )
                        );
                    }
                    if (possibleKeyTrade) {
                        NonPureWorth +=
                            keyDifference *
                            Currencies.toScrap(prices['5021;6'][keyDifference > 0 ? 'sell' : 'buy'].metal);
                    }
                    // Determine if we need to take a weapon from them
                    const needToTakeWeapon = NonPureWorth - Math.trunc(NonPureWorth) !== 0;

                    if (needToTakeWeapon) {
                        log.debug('needToTakeWeapon:', needToTakeWeapon);
                        const weaponSkus = this.bot.handler.isWeaponsAsCurrency.withUncraft
                            ? this.bot.craftWeapons.concat(this.bot.uncraftWeapons)
                            : this.bot.craftWeapons;

                        const skusFromPricelist = Object.keys(this.bot.pricelist.getPrices);

                        // return filtered weapons
                        let filteredWeaponSkus = weaponSkus.filter(weaponSku => !skusFromPricelist.includes(weaponSku));

                        if (filteredWeaponSkus.length === 0) {
                            // but if nothing left, then just use all
                            filteredWeaponSkus = weaponSkus;
                        }

                        const chosenWeaponSku = filteredWeaponSkus
                            .filter(weaponSku => theirItems[weaponSku] === undefined) // filter weapons that are not in their offer
                            .find(weaponSku => theirInventoryItems[weaponSku]); // find one that is in their inventory

                        log.debug('weaponOfChoice:', chosenWeaponSku);

                        const weapon = theirInventoryItems[chosenWeaponSku];
                        log.debug('item:', weapon);
                        if (weapon) {
                            const isAdded = counter.addTheirItem({
                                appid: 440,
                                contextid: '2',
                                assetid: weapon[0].id
                            });
                            if (isAdded) {
                                NonPureWorth -= 0.5;
                                tradeValues['their'].scrap += 0.5;
                                dataDict['their'][chosenWeaponSku] ??= 0;
                                dataDict['their'][chosenWeaponSku] += 1;

                                const isInPricelist = this.bot.pricelist.getPrice({
                                    priceKey: chosenWeaponSku,
                                    onlyEnabled: false
                                });

                                if (isInPricelist !== null) {
                                    prices[chosenWeaponSku] = {
                                        buy: isInPricelist.buy,
                                        sell: isInPricelist.sell
                                    };
                                }
                            }
                        }
                    }

                    const ourBestWay: Record<PureSKU, number> = {
                        '5021;6': calculate('5021;6', ourInventoryItems, true),
                        '5002;6': calculate('5002;6', ourInventoryItems, true),
                        '5001;6': calculate('5001;6', ourInventoryItems, true),
                        '5000;6': calculate('5000;6', ourInventoryItems, true)
                    };
                    if (NonPureWorth < 0) {
                        log.debug('NonPureWorth < 0 - ourBestWay before', {
                            ourBestWay
                        });

                        ourBestWay['5002;6'] += calculate(
                            '5002;6',
                            (ourInventoryItems['5002;6']?.length || 0) - ourBestWay['5002;6'],
                            true,
                            true
                        );
                        ourBestWay['5001;6'] += calculate(
                            '5001;6',
                            (ourInventoryItems['5001;6']?.length || 0) - ourBestWay['5001;6'],
                            true,
                            true
                        );
                        ourBestWay['5021;6'] += calculate(
                            '5021;6',
                            (ourInventoryItems['5021;6']?.length || 0) - ourBestWay['5021;6'],
                            true,
                            true
                        );

                        ourBestWay['5002;6'] -= calculate('5002;6', ourBestWay['5002;6'], false);
                        ourBestWay['5001;6'] -= calculate('5001;6', ourBestWay['5001;6'], false);
                        ourBestWay['5000;6'] -= calculate('5000;6', ourBestWay['5000;6'], false);

                        log.debug('NonPureWorth < 0 - ourBestWay after', {
                            ourBestWay
                        });
                    }

                    const theirBestWay: Record<PureSKU, number> = {
                        '5021;6': calculate('5021;6', theirInventoryItems, false),
                        '5002;6': calculate('5002;6', theirInventoryItems, false),
                        '5001;6': calculate('5001;6', theirInventoryItems, false),
                        '5000;6': calculate('5000;6', theirInventoryItems, false)
                    };
                    if (NonPureWorth > 0) {
                        log.debug('NonPureWorth > 0 - theirBestWay before', {
                            theirBestWay
                        });
                        theirBestWay['5002;6'] += calculate(
                            '5002;6',
                            (theirInventoryItems['5002;6']?.length || 0) - theirBestWay['5002;6'],
                            false,
                            true
                        );
                        theirBestWay['5001;6'] += calculate(
                            '5001;6',
                            (theirInventoryItems['5001;6']?.length || 0) - theirBestWay['5001;6'],
                            false,
                            true
                        );
                        theirBestWay['5021;6'] += calculate(
                            '5021;6',
                            (theirInventoryItems['5021;6']?.length || 0) - theirBestWay['5021;6'],
                            false,
                            true
                        );

                        theirBestWay['5002;6'] -= calculate('5002;6', theirBestWay['5002;6'], true);
                        theirBestWay['5001;6'] -= calculate('5001;6', theirBestWay['5001;6'], true);
                        theirBestWay['5000;6'] -= calculate('5000;6', theirBestWay['5000;6'], true);

                        log.debug('NonPureWorth > 0 - theirBestWay after', {
                            theirBestWay
                        });

                        log.debug('Add some of our items if they are still overpaying - before', {
                            ourBestWay
                        });
                        // Add some of our items if they are still overpaying
                        ourBestWay['5002;6'] += calculate(
                            '5002;6',
                            (ourInventoryItems['5002;6']?.length || 0) - ourBestWay['5002;6'],
                            true
                        );
                        ourBestWay['5001;6'] += calculate(
                            '5001;6',
                            (ourInventoryItems['5001;6']?.length || 0) - ourBestWay['5001;6'],
                            true
                        );
                        ourBestWay['5000;6'] += calculate(
                            '5000;6',
                            (ourInventoryItems['5000;6']?.length || 0) - ourBestWay['5000;6'],
                            true
                        );

                        log.debug('Add some of our items if they are still overpaying - after', {
                            ourBestWay
                        });
                    }

                    if (NonPureWorth !== 0) {
                        return reject(new Error(`Couldn't counter an offer value mismatch: ${NonPureWorth}`));
                    }

                    // Filter out trade items from inventories
                    // Now try to match this on the trade offer
                    Object.keys(theirItems).forEach(sku => {
                        theirInventoryItems[sku] = theirInventoryItems[sku]?.filter(
                            i => !theirItems[sku]?.find(i2 => i2.id === i.id)
                        );
                    });

                    Object.keys(ourItems).forEach(sku => {
                        ourInventoryItems[sku] = ourInventoryItems[sku]?.filter(
                            i => !ourItems[sku]?.find(i2 => i2.id === i.id)
                        );
                    });

                    [theirBestWay, ourBestWay].forEach((side, index) => {
                        const [sideText, inventory, tradeInventory] =
                            index === 0
                                ? ['Their', theirInventoryItems, theirItems]
                                : ['My', ourInventoryItems, ourItems];

                        (Object.keys(side) as PureSKU[]).forEach(sku => {
                            const amount = side[sku] - (tradeInventory[sku]?.length || 0);
                            changeItems(
                                sideText as 'Their' | 'My',
                                amount > 0 ? inventory : tradeInventory,
                                amount,
                                sku
                            );
                        });
                    });

                    log.debug('Set counteroffer and sending...');
                    setOfferDataAndSend();
                })
                .catch((err: Error) => {
                    log.error(`Failed to load inventories (${offer.partner.getSteamID64()}): `, err);
                    return reject(
                        new Error(
                            `Failed to load your inventories (Steam might down). Please try again later.` +
                                ` If your profile/inventory is set to private, please set it to public and try again.`
                        )
                    );
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
                        return void timersPromises.setTimeout(exponentialBackoff(attempts)).then(() => {
                            resolve(this.acceptOfferRetry(offer, attempts));
                        });
                    }

                    return void this.bot
                        .getWebSession(true)
                        .catch((err: Error) => err)
                        .then(err => {
                            // If there is no error when waiting for web session, then attempt to fetch the offer right away
                            void timersPromises.setTimeout(err !== null ? 0 : exponentialBackoff(attempts)).then(() => {
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

            void this.sendOfferRetry(offer, 0)
                .then(status => {
                    const actionTime = dayjs().valueOf() - start;
                    offer.data('actionTime', actionTime);

                    offer.log(
                        'trade',
                        'successfully created' + (status === 'pending' ? '; confirmation required' : '')
                    );

                    return resolve(status);
                })
                .catch((err: Error) => {
                    const actionTime = dayjs().valueOf() - start;
                    offer.data('actionTime', actionTime);

                    offer.itemsToGive.forEach(item => {
                        this.unsetItemInTrade = item.assetid;
                    });
                    return reject(err);
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
                        return void this.bot.inventoryManager.getInventory.fetch().finally(() => {
                            reject(err);
                        });
                    } else if (err.eresult === TradeOfferManager.EResult['Timeout']) {
                        // The offer may or may not have been made, will wait some time and check if if we can find a matching offer
                        return void timersPromises.setTimeout(exponentialBackoff(attempts, 4000)).then(() => {
                            // Done waiting, try and find matching offer
                            void this.findMatchingOffer(offer, true)
                                .then(match => {
                                    if (match === null) {
                                        // Did not find a matching offer, retry sending the offer
                                        return resolve(this.sendOfferRetry(offer, attempts));
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
                                })
                                .catch((err: Error) => reject(err));
                        });
                    } else if (err.eresult !== undefined) {
                        return reject(err);
                    }

                    if (err.message !== 'Not Logged In') {
                        // We got an error getting the offer, retry after some time
                        return void timersPromises.setTimeout(exponentialBackoff(attempts)).then(() => {
                            resolve(this.sendOfferRetry(offer, attempts));
                        });
                    }

                    return void this.bot
                        .getWebSession(true)
                        .catch((err: Error) => err)
                        .then(err => {
                            // If there is no error when waiting for web session, then attempt to fetch the offer right away
                            void timersPromises.setTimeout(err !== null ? 0 : exponentialBackoff(attempts)).then(() => {
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
                                void this.triggerRestartBot(offer.partner.getSteamID64());
                            }, 2 * 1000);

                            log.error('Escrow check failed: ', err);

                            return reject(operation.mainError());
                        }

                        log.debug('Done checking escrow');

                        this.escrowCheckFailedCount = 0;
                        return resolve(them.escrowDays !== 0);
                    }

                    // Reset attempts
                    operation.reset();

                    // Wait for bot to sign in to retry
                    void this.bot.getWebSession(true).finally(() => {
                        // Callback was called, ignore error from callback and retry
                        operation.retry(err);
                    });
                });
            });
        });
    }

    private retryToRestart(steamID: string): void {
        this.restartOnEscrowCheckFailed = setTimeout(() => {
            void this.triggerRestartBot(steamID);
        }, 3 * 60 * 1000);
    }

    private async triggerRestartBot(steamID: string): Promise<void> {
        log.debug(`Escrow check problem occured, current failed count: ${this.escrowCheckFailedCount}`);

        if (this.escrowCheckFailedCount >= 2) {
            // if escrow check failed more than or equal to 2 times, then perform automatic restart (PM2 only)

            const dwEnabled =
                this.bot.options.discordWebhook.sendAlert.enable &&
                this.bot.options.discordWebhook.sendAlert.url.main !== '';

            // determine whether it's good time to restart or not
            try {
                // test if backpack.tf is alive by performing bptf banned check request
                await isBptfBanned({ steamID, bptfApiKey: this.bot.options.bptfApiKey, userID: this.bot.userID });
            } catch (err) {
                // do not restart, try again after 3 minutes
                clearTimeout(this.restartOnEscrowCheckFailed);
                this.retryToRestart(steamID);

                log.warn('Failed to perform restart - bptf down: ', err);

                if (dwEnabled) {
                    return sendAlert(
                        'escrow-check-failed-not-restart-bptf-down',
                        this.bot,
                        err as string,
                        this.escrowCheckFailedCount
                    );
                } else {
                    const errStringify = JSON.stringify(err);
                    const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                    return this.bot.messageAdmins(
                        `❌ Unable to perform automatic restart due to Escrow check problem, which has failed for ${pluralize(
                            'time',
                            this.escrowCheckFailedCount,
                            true
                        )} because backpack.tf is currently down: ${errMessage}`,
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

                log.warn('Failed to perform restart - Steam is not good now: ');

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
            // do nothing here
        } else {
            offer.data('isAccepted', true);

            offer.itemsToGive.forEach(item => this.bot.inventoryManager.getInventory.removeItem(item.assetid));
        }

        if (
            offer.state === TradeOfferManager.ETradeOfferState['Active'] ||
            offer.state === TradeOfferManager.ETradeOfferState['CreatedNeedsConfirmation'] ||
            offer.state === TradeOfferManager.ETradeOfferState['Countered'] ||
            (oldState === TradeOfferManager.ETradeOfferState['Countered'] &&
                offer.state === TradeOfferManager.ETradeOfferState['Declined']) ||
            (oldState === TradeOfferManager.ETradeOfferState['Active'] &&
                offer.state === TradeOfferManager.ETradeOfferState['Declined'])
        ) {
            // Offer is active, or countered, or declined countered, no need to fetch inventory
            // Just handle changes
            this.bot.handler.onTradeOfferChanged(offer, oldState, timeTakenToComplete);
        } else {
            // Exit all running apps ("TF2Autobot" or custom, and Team Fortress 2)
            // Will play again after craft/smelt/sort inventory job
            // https://github.com/TF2Autobot/tf2autobot/issues/527
            this.bot.client.gamesPlayed([]);

            this.offerChangedAcc.push({ offer, oldState, timeTakenToComplete });
            log.debug('Accumulated offerChanged: ', this.offerChangedAcc.length);

            if (this.offerChangedAcc.length <= 1) {
                // Only call `fetch` if accumulated offerChanged is less than or equal to 1
                // Prevent never ending "The request is a duplicate and the action has already occurred in the past, ignored this time"

                // Accepted, Invalid trade (possible) => new item assetid
                log.debug('Fetching our inventory...');
                return void this.bot.inventoryManager.getInventory
                    .fetch()
                    .then(() => {
                        this.onSuccessfulFetch();
                    })
                    .catch(err => {
                        log.warn('Error fetching inventory: ', err);
                        log.debug('Retrying to fetch inventory in 30 seconds...');
                        this.calledRetryFetchFreq++;

                        if (this.calledRetryFetchFreq === 1) {
                            // Only call this once (before reset)
                            this.retryFetchInventory();
                        }
                    });
            }

            log.debug('Not fetching inventory this time...');
        }
    }

    private onSuccessfulFetch(): void {
        if (this.offerChangedAcc.length > 0) {
            this.offerChangedAcc.forEach(el => {
                this.bot.handler.onTradeOfferChanged(el.offer, el.oldState, el.timeTakenToComplete);
            });

            // Reset to empty array
            this.offerChangedAcc.length = 0;
        }
    }

    private retryFetchInventory(): void {
        clearTimeout(this.retryFetchInventoryTimeout);
        this.retryFetchInventoryTimeout = setTimeout(() => {
            this.bot.inventoryManager.getInventory
                .fetch()
                .then(() => {
                    this.onSuccessfulFetch();

                    // Reset to 0
                    this.calledRetryFetchFreq = 0;
                })
                .catch(err => {
                    log.warn('Error fetching inventory: ', err);

                    if (this.calledRetryFetchFreq > 3) {
                        // If more than 3 times failed, then just proceed with an outdated inventory
                        this.onSuccessfulFetch();

                        // Reset to 0
                        this.calledRetryFetchFreq = 0;

                        return;
                    }

                    log.debug('Retrying to fetch inventory in 30 seconds...');
                    this.calledRetryFetchFreq++;
                    this.retryFetchInventory();
                });
        }, 30 * 1000);
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
