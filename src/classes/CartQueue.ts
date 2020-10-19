import SteamID from 'steamid';

import Bot from './Bot';
import Cart from './Cart';

import log from '../lib/logger';

export = CartQueue;

class CartQueue {
    private readonly bot: Bot;

    private carts: Cart[] = [];

    private busy = false;

    private queuePositionCheck;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    enqueue(cart: Cart): number {
        // TODO: Priority queueing

        log.debug('Enqueueing cart');

        if (this.getPosition(cart.partner) !== -1) {
            log.debug('Already in the queue');
            // Already in the queue
            return -1;
        }

        const position = this.carts.length;

        log.debug('Added cart to queue at position ' + position);

        this.carts.push(cart);

        setImmediate(() => {
            // Using set immediate so that the queue will first be handled when done with this event loop cycle
            this.handleQueue();
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
                this.resetQueue();
                this.bot.sendMessage(steamID, 'Sorry! Something went wrong. You can try again now...');
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

    resetQueue(): void {
        log.debug('Queue reset initialized.');
        this.carts.splice(0);
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

    private handleQueue(): void {
        log.debug('Handling queue...');

        if (this.busy || this.carts.length === 0) {
            log.debug('Already handling queue or queue is empty');
            return;
        }

        this.busy = true;

        const cart = this.carts[0];

        log.debug('Handling cart for ' + cart.partner.getSteamID64());

        log.debug('Constructing offer');

        if (process.env.DISABLE_CRAFTWEAPON_AS_CURRENCY !== 'true') {
            Promise.resolve(cart.constructOfferWithWeapons())
                .then(alteredMessage => {
                    log.debug('Constructed offer');
                    if (alteredMessage) {
                        cart.sendNotification(`⚠️ Your offer has been altered. Reason: ${alteredMessage}.`);
                    }

                    cart.sendNotification(`⌛ Please wait while I process your offer! ${cart.summarizeWithWeapons()}.`);

                    log.debug('Sending offer...');
                    return cart.sendOffer();
                })
                .then(status => {
                    log.debug('Sent offer');
                    if (status === 'pending') {
                        cart.sendNotification(
                            '⌛ Your offer has been made! Please wait while I accept the mobile confirmation.'
                        );

                        log.debug('Accepting mobile confirmation...');

                        // Wait for confirmation to be accepted
                        return this.bot.trades.acceptConfirmation(cart.getOffer()).reflect();
                    }
                })
                .catch(err => {
                    if (!(err instanceof Error)) {
                        cart.sendNotification(`❌ I failed to make the offer! Reason: ${err}.`);
                    } else {
                        log.warn('Failed to make offer');
                        log.error(require('util').inspect(err));

                        if (err.message.includes("cause: 'TargetCannotTrade'")) {
                            cart.sendNotification(
                                "❌ You're unable to trade. More information will be shown to you if you invite me to trade."
                            );
                        } else {
                            cart.sendNotification(
                                '❌ Something went wrong while trying to make the offer, try again later!'
                            );
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
                    this.handleQueue();
                });
        } else {
            Promise.resolve(cart.constructOffer())
                .then(alteredMessage => {
                    log.debug('Constructed offer');
                    if (alteredMessage) {
                        cart.sendNotification(`⚠️ Your offer has been altered. Reason: ${alteredMessage}.`);
                    }

                    cart.sendNotification(`⌛ Please wait while I process your offer! ${cart.summarize()}.`);

                    log.debug('Sending offer...');
                    return cart.sendOffer();
                })
                .then(status => {
                    log.debug('Sent offer');
                    if (status === 'pending') {
                        cart.sendNotification(
                            '⌛ Your offer has been made! Please wait while I accept the mobile confirmation.'
                        );

                        log.debug('Accepting mobile confirmation...');

                        // Wait for confirmation to be accepted
                        return this.bot.trades.acceptConfirmation(cart.getOffer()).reflect();
                    }
                })
                .catch(err => {
                    if (!(err instanceof Error)) {
                        cart.sendNotification(`❌ I failed to make the offer! Reason: ${err}.`);
                    } else {
                        log.warn('Failed to make offer');
                        log.error(require('util').inspect(err));

                        if (err.message.includes("cause: 'TargetCannotTrade'")) {
                            cart.sendNotification(
                                "❌ You're unable to trade. More information will be shown to you if you invite me to trade."
                            );
                        } else {
                            cart.sendNotification(
                                '❌ Something went wrong while trying to make the offer, try again later!'
                            );
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
                    this.handleQueue();
                });
        }
    }
}
