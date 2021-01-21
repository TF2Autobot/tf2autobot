import SteamID from 'steamid';
import * as inspect from 'util';
import Cart from './Cart';
import Bot from '../Bot';
import log from '../../lib/logger';
import { sendAlert } from '../../lib/DiscordWebhook/export';

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
            const position = this.carts.length;
            log.debug(`Current queue position: ${position}`);
            if (position >= 2) {
                if (
                    this.bot.options.discordWebhook.sendAlert.enable &&
                    this.bot.options.discordWebhook.sendAlert.url !== ''
                ) {
                    sendAlert('queue', this.bot, null, position);
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
                        });
                } else {
                    this.bot.messageAdmins(`⚠️ [Queue alert] Current position: ${position}`, []);
                    void this.bot.botManager
                        .restartProcess()
                        .then(restarting => {
                            if (!restarting) {
                                return this.bot.messageAdmins(
                                    '❌ Automatic restart on queue problem failed because are not running the bot with PM2!',
                                    []
                                );
                            }
                            this.bot.sendMessage(steamID, 'Queue problem detected, restarting...');
                        })
                        .catch(err => {
                            log.warn('Error occurred while trying to restart: ', err);
                            this.bot.messageAdmins(
                                `❌ An error occurred while trying to restart: ${JSON.stringify(err)}`,
                                []
                            );
                        });
                }
            }
        }, 3 * 60 * 1000);
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
                            : `⌛ Your donation has been made! Please wait while I accept the mobile confirmation.`
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
