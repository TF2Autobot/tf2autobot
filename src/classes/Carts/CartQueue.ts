import SteamID from 'steamid';
import * as inspect from 'util';
import dayjs from 'dayjs';
import pluralize from 'pluralize';
import Cart from './Cart';
import Bot from '../Bot';
import log from '../../lib/logger';
import { sendAlert } from '../../lib/DiscordWebhook/export';
import { uptime } from '../../lib/tools/export';
import { isBptfBanned } from '../../lib/bans';

export default class CartQueue {
    private readonly bot: Bot;

    private carts: Cart[] = [];

    private busy = false;

    private queuePositionCheck: NodeJS.Timeout;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    enqueue(cart: Cart, isDonating: boolean, isBuyingPremium: boolean): number {
        // TODO: Priority queueing

        log.debug('Enqueueing cart');

        if (this.getPosition(cart.partner) !== -1) {
            log.debug('Already in the queue');
            // Already in the queue
            return -1;
        }

        const position = this.carts.length;

        log.debug(`Added cart to queue at position ${position}`);

        this.carts.push(cart);

        setImmediate(() => {
            // Using set immediate so that the queue will first be handled when done with this event loop cycle
            this.handleQueue(isDonating, isBuyingPremium);
        });

        clearTimeout(this.queuePositionCheck);
        this.queueCheck(cart.partner);

        return position;
    }

    private queueCheck(steamID: SteamID | string): void {
        log.debug(`Checking queue position in 3 minutes...`);
        this.queuePositionCheck = setTimeout(() => {
            void this.queueCheckRestartBot(steamID);
        }, 3 * 60 * 1000);
    }

    private async queueCheckRestartBot(steamID: SteamID | string): Promise<void> {
        const position = this.carts.length;
        log.debug(`Current queue position: ${position}`);

        if (position >= 2) {
            const dwEnabled =
                this.bot.options.discordWebhook.sendAlert.enable &&
                this.bot.options.discordWebhook.sendAlert.url !== '';

            // determine whether it's good time to restart or not
            try {
                // test if backpack.tf is alive by performing bptf banned check request
                await isBptfBanned(steamID, this.bot.options.bptfAPIKey);
            } catch (err) {
                // do not restart, try again after 3 minutes
                clearTimeout(this.queuePositionCheck);
                this.queueCheck(steamID);

                if (dwEnabled) {
                    return sendAlert('queue-problem-not-restart-bptf-down', this.bot, null, position);
                } else {
                    return this.bot.messageAdmins(
                        `❌ Unable to perform automatic restart due to Escrow check problem, which has failed for ${pluralize(
                            'time',
                            position,
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
                clearTimeout(this.queuePositionCheck);
                this.queueCheck(steamID);

                if (dwEnabled) {
                    return sendAlert('queue-problem-not-restart-steam-maintenance', this.bot, null, position);
                } else {
                    return this.bot.messageAdmins(
                        `❌ Unable to perform automatic restart due to Escrow check problem, which has failed for ${pluralize(
                            'time',
                            position,
                            true
                        )} because Steam is currently down.`,
                        []
                    );
                }
            } else {
                // Good to perform automatic restart
                if (dwEnabled) {
                    sendAlert('queue-problem-perform-restart', this.bot, null, position);
                    void this.bot.botManager
                        .restartProcess()
                        .then(restarting => {
                            if (!restarting) {
                                return sendAlert('failedPM2', this.bot);
                            }
                            this.bot.sendMessage(steamID, 'Sorry! Something went wrong. I am restarting myself...');
                        })
                        .catch(err => {
                            log.warn('Error occurred while trying to restart: ', err);
                            sendAlert('failedRestartError', this.bot, null, null, err);
                            // try again after 3 minutes
                            clearTimeout(this.queuePositionCheck);
                            this.queueCheck(steamID);
                        });
                } else {
                    this.bot.messageAdmins(
                        `⚠️ [Queue alert] Current position: ${position}\n\nBot has been up for ${uptime()}`,
                        []
                    );
                    void this.bot.botManager
                        .restartProcess()
                        .then(restarting => {
                            if (!restarting) {
                                return this.bot.messageAdmins(
                                    '❌ Automatic restart on queue problem failed because are not running the bot with PM2!',
                                    []
                                );
                            }
                            this.bot.messageAdmins(`🔄 Restarting...`, []);
                            this.bot.sendMessage(steamID, 'Queue problem detected, restarting...');
                        })
                        .catch(err => {
                            log.warn('Error occurred while trying to restart: ', err);
                            this.bot.messageAdmins(
                                `❌ An error occurred while trying to restart: ${(err as Error).message}`,
                                []
                            );
                            // try again after 3 minutes
                            clearTimeout(this.queuePositionCheck);
                            this.queueCheck(steamID);
                        });
                }
            }
        }
    }

    dequeue(steamID: SteamID | string): boolean {
        log.debug('Dequeueing cart');
        const position = this.getPosition(steamID);

        if (position === -1) {
            log.debug('Cart is not in the queue');
            return false;
        }

        this.carts.splice(position, 1);
        log.debug('Removed cart from the queue');

        return true;
    }

    getPosition(steamID: SteamID | string): number {
        const steamID64 = steamID.toString();
        return this.carts.findIndex(cart => cart.partner.toString() === steamID64);
    }

    getCart(steamID: SteamID | string): Cart | null {
        const index = this.getPosition(steamID);
        if (index === -1) {
            return null;
        }

        return this.carts[index];
    }

    private handleQueue(isDonating: boolean, isBuyingPremium: boolean): void {
        log.debug('Handling queue...');

        if (this.busy || this.carts.length === 0) {
            log.debug('Already handling queue or queue is empty');
            return;
        }

        this.busy = true;

        const cart = this.carts[0];

        log.debug('Handling cart for ' + cart.partner.getSteamID64());

        log.debug('Constructing offer');

        const custom = this.bot.options.commands.addToQueue;
        Promise.resolve(cart.constructOffer())
            .then(alteredMessage => {
                log.debug('Constructed offer');
                if (alteredMessage) {
                    cart.sendNotification = custom.alteredOffer
                        ? custom.alteredOffer.replace(/%altered%/g, alteredMessage)
                        : `⚠️ Your offer has been altered. Reason: ${alteredMessage}.`;
                }

                const summarize = cart.summarize(isDonating, isBuyingPremium);

                const sendNotification = isDonating
                    ? custom.processingOffer.donation
                        ? custom.processingOffer.donation.replace(/%summarize%/g, summarize)
                        : `⌛ Please wait while I process your donation! ${summarize}.`
                    : isBuyingPremium
                    ? custom.processingOffer.isBuyingPremium
                        ? custom.processingOffer.isBuyingPremium.replace(/%summarize%/g, summarize)
                        : `⌛ Please wait while I process your premium purchase! ${summarize}.`
                    : custom.processingOffer.offer
                    ? custom.processingOffer.offer.replace(/%summarize%/g, summarize)
                    : `⌛ Please wait while I process your offer! ${summarize}.`;

                cart.sendNotification = sendNotification;

                log.debug('Sending offer...');
                return cart.sendOffer();
            })
            .then(status => {
                log.debug('Sent offer');
                if (status === 'pending') {
                    const sendNotification = isDonating
                        ? custom.hasBeenMadeAcceptingMobileConfirmation.donation
                            ? custom.hasBeenMadeAcceptingMobileConfirmation.donation
                            : `⌛ Your donation has been made! Please wait while I accept the mobile confirmation.`
                        : isBuyingPremium
                        ? custom.hasBeenMadeAcceptingMobileConfirmation.isBuyingPremium
                            ? custom.hasBeenMadeAcceptingMobileConfirmation.isBuyingPremium
                            : `⌛ Your premium purchase has been made! Please wait while I accept the mobile confirmation.`
                        : custom.hasBeenMadeAcceptingMobileConfirmation.offer
                        ? custom.hasBeenMadeAcceptingMobileConfirmation.offer
                        : `⌛ Your offer has been made! Please wait while I accept the mobile confirmation.`;

                    cart.sendNotification = sendNotification;

                    log.debug('Accepting mobile confirmation...');

                    // Wait for confirmation to be accepted
                    return this.bot.trades.acceptConfirmation(cart.getOffer).reflect();
                }
            })
            .catch(err => {
                if (!(err instanceof Error)) {
                    cart.sendNotification = `❌ I failed to make the offer! Reason: ${err as string}.`;
                } else {
                    log.warn('Failed to make offer');
                    log.error(inspect.inspect(err));

                    if (err.message.includes("cause: 'TargetCannotTrade'")) {
                        cart.sendNotification =
                            "❌ You're unable to trade. More information will be shown to you if you invite me to trade.";
                    } else {
                        cart.sendNotification =
                            '❌ Something went wrong while trying to make the offer, try again later!';
                    }
                }
            })
            .finally(() => {
                log.debug(`Done handling cart ${cart.partner.getSteamID64()}`);

                // Remove cart from the queue
                this.carts.shift();

                // Now ready to handle a different cart
                this.busy = false;

                // Handle the queue
                this.handleQueue(false, false);
            });
    }
}
