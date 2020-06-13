import callbackQueue from 'callback-queue';
import SKU from 'tf2-sku';
import pluralize from 'pluralize';
import request from '@nicklason/request-retry';
import async from 'async';

import Bot = require('./Bot');

import log from '../lib/logger';
import { exponentialBackoff } from '../lib/helpers';
import { Entry } from './Pricelist';
import moment from 'moment';

export = class Listings {
    private readonly bot: Bot;

    private checkingAllListings = false;

    private removingAllListings = false;

    private cancelCheckingListings = false;

    private autoRelistEnabled = false;

    private autoRelistTimeout;

    private templates: { buy: string; sell: string } = {
        buy:
            process.env.BPTF_DETAILS_BUY ||
            'I am buying your %name% for %price%, I have %current_stock% / %max_stock%.',
        sell: process.env.BPTF_DETAILS_SELL || 'I am selling my %name% for %price%, I am selling %amount_trade%.'
    };

    constructor(bot: Bot) {
        this.bot = bot;
    }

    setupAutorelist(): void {
        if (process.env.AUTOBUMP !== 'true' || process.env.DISABLE_LISTINGS === 'true') {
            // Autobump is not enabled
            return;
        }

        // Autobump is enabled, add heartbeat listener

        this.bot.listingManager.removeListener('heartbeat', this.checkAccountInfo.bind(this));
        this.bot.listingManager.on('heartbeat', this.checkAccountInfo.bind(this));

        // Get account info
        this.checkAccountInfo();
    }

    private enableAutoRelist(): void {
        if (this.autoRelistEnabled || process.env.DISABLE_LISTINGS === 'true') {
            return;
        }

        log.debug('Enabled autorelist');

        this.autoRelistEnabled = true;

        clearTimeout(this.autoRelistTimeout);

        const doneWait = (): void => {
            async.eachSeries(
                [
                    (callback): void => {
                        this.redoListings().asCallback(callback);
                    },
                    (callback): void => {
                        this.waitForListings().asCallback(callback);
                    }
                ],
                (item, callback) => {
                    if (this.bot.botManager.isStopping()) {
                        return;
                    }

                    item(callback);
                },
                () => {
                    log.debug('Done relisting');
                    if (this.autoRelistEnabled) {
                        log.debug('Waiting 30 minutes before relisting again');
                        this.autoRelistTimeout = setTimeout(doneWait, 30 * 60 * 1000);
                    }
                }
            );
        };

        this.autoRelistTimeout = setTimeout(doneWait, 30 * 60 * 1000);
    }

    private checkAccountInfo(): void {
        log.debug('Checking account info');

        this.getAccountInfo().asCallback((err, info) => {
            if (err) {
                log.warn('Failed to  get account info from backpack.tf: ', err);
                return;
            }

            if (this.autoRelistEnabled && info.premium === 1) {
                log.warn('Disabling autorelist! - Your account is premium, no need to forcefully bump listings');
                this.disableAutoRelist();
            } else if (!this.autoRelistEnabled && info.premium !== 1) {
                log.warn(
                    'Enabling autorelist! - Consider paying for backpack.tf premium instead of forcefully bumping listings: https://backpack.tf/donate'
                );
                this.enableAutoRelist();
            }
        });
    }

    private disableAutoRelist(): void {
        clearTimeout(this.autoRelistTimeout);
        this.autoRelistEnabled = false;

        log.debug('Disabled autorelist');
    }

    private getAccountInfo(): Promise<any> {
        return new Promise((resolve, reject) => {
            const steamID64 = this.bot.manager.steamID.getSteamID64();

            const options = {
                url: 'https://backpack.tf/api/users/info/v1',
                method: 'GET',
                qs: {
                    key: process.env.BPTF_API_KEY,
                    steamids: steamID64
                },
                gzip: true,
                json: true
            };

            request(options, function(err, reponse, body) {
                if (err) {
                    return reject(err);
                }

                return resolve(body.users[steamID64]);
            });
        });
    }

    checkBySKU(sku: string, data?: Entry | null): void {
        if (process.env.DISABLE_LISTINGS === 'true') {
            return;
        }

        const item = SKU.fromString(sku);

        const match = data && data.enabled === false ? null : this.bot.pricelist.getPrice(sku, true);

        let hasBuyListing = item.paintkit !== null;
        let hasSellListing = false;

        const amountCanBuy = this.bot.inventoryManager.amountCanTrade(sku, true);
        const amountCanSell = this.bot.inventoryManager.amountCanTrade(sku, false);

        this.bot.listingManager.findListings(sku).forEach(listing => {
            if (listing.intent === 1 && hasSellListing) {
                // Alrready have a sell listing, remove the listing
                listing.remove();
                return;
            }

            if (listing.intent === 0) {
                hasBuyListing = true;
            } else if (listing.intent === 1) {
                hasSellListing = true;
            }

            if (match === null || (match.intent !== 2 && match.intent !== listing.intent)) {
                // We are not trading the item, remove the listing
                listing.remove();
            } else if ((listing.intent === 0 && amountCanBuy <= 0) || (listing.intent === 1 && amountCanSell <= 0)) {
                // We are not buying / selling more, remove the listing
                listing.remove();
            } else {
                const newDetails = this.getDetails(listing.intent, match);

                if (listing.details !== newDetails) {
                    // Listing details don't match, update listing with new details and price
                    const currencies = match[listing.intent === 0 ? 'buy' : 'sell'];

                    listing.update({
                        time: match.time || moment().unix(),
                        details: newDetails,
                        currencies: currencies
                    });
                }
            }
        });

        if (match !== null && match.enabled === true) {
            const assetids = this.bot.inventoryManager.getInventory().findBySKU(sku, true);

            // TODO: Check if we are already making a listing for same type of item + intent

            if (!hasBuyListing && amountCanBuy > 0) {
                // We have no buy order and we can buy more items, create buy listing
                this.bot.listingManager.createListing({
                    time: match.time || moment().unix(),
                    sku: sku,
                    intent: 0,
                    details: this.getDetails(0, match),
                    currencies: match.buy
                });
            }

            if (!hasSellListing && amountCanSell > 0) {
                // We have no sell order and we can sell items, create sell listing
                this.bot.listingManager.createListing({
                    time: match.time || moment().unix(),
                    id: assetids[assetids.length - 1],
                    intent: 1,
                    details: this.getDetails(1, match),
                    currencies: match.sell
                });
            }
        }
    }

    checkAll(): Promise<void> {
        return new Promise(resolve => {
            if (process.env.DISABLE_LISTINGS === 'true') {
                return resolve();
            }

            log.debug('Checking all');

            const doneRemovingAll = (): void => {
                const next = callbackQueue.add('checkAllListings', function() {
                    resolve();
                });

                if (next === false) {
                    return;
                }

                this.checkingAllListings = true;

                const inventory = this.bot.inventoryManager.getInventory();

                const pricelist = this.bot.pricelist.getPrices().sort((a, b) => {
                    return inventory.findBySKU(b.sku).length - inventory.findBySKU(a.sku).length;
                });

                log.debug('Checking listings for ' + pluralize('item', pricelist.length, true) + '...');

                this.recursiveCheckPricelist(pricelist).asCallback(() => {
                    log.debug('Done checking all');
                    // Done checking all listings
                    this.checkingAllListings = false;
                    next();
                });
            };

            if (!this.removingAllListings) {
                doneRemovingAll();
                return;
            }

            callbackQueue.add('removeAllListings', () => {
                doneRemovingAll();
            });
        });
    }

    private recursiveCheckPricelist(pricelist: Entry[]): Promise<void> {
        return new Promise(resolve => {
            let index = 0;

            const iteration = (): void => {
                if (pricelist.length <= index || this.cancelCheckingListings) {
                    this.cancelCheckingListings = false;
                    return resolve();
                }

                setImmediate(() => {
                    this.checkBySKU(pricelist[index].sku, pricelist[index]);

                    index++;

                    iteration();
                });
            };

            iteration();
        });
    }

    removeAll(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.checkingAllListings) {
                this.cancelCheckingListings = true;
            }

            log.debug('Removing all listings');

            // Ensures that we don't to remove listings multiple times
            const next = callbackQueue.add('removeAllListings', function(err) {
                if (err) {
                    return reject(err);
                }

                return resolve(null);
            });

            if (next === false) {
                // Function was already called
                return;
            }

            this.removeAllListings().asCallback(next);
        });
    }

    private removeAllListings(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.removingAllListings = true;

            // Clear create queue
            this.bot.listingManager.actions.create = [];

            // Wait for backpack.tf to finish creating / removing listings
            this.waitForListings().then(() => {
                if (this.bot.listingManager.listings.length === 0) {
                    log.debug('We have no listings');
                    this.removingAllListings = false;
                    return resolve();
                }

                log.debug('Removing all listings...');

                // Remove all current listings
                this.bot.listingManager.listings.forEach(listing => listing.remove());

                // Clear timeout
                clearTimeout(this.bot.listingManager._timeout);

                // Remove listings
                this.bot.listingManager._processActions(err => {
                    if (err) {
                        return reject(err);
                    }

                    // The request might fail, if it does we will try again
                    return resolve(this.removeAllListings());
                });
            });
        });
    }

    redoListings(): Promise<void> {
        return this.removeAll().then(() => {
            return this.checkAll();
        });
    }

    waitForListings(): Promise<void> {
        return new Promise((resolve, reject) => {
            let checks = 0;

            const check = (): void => {
                checks++;
                log.debug('Checking listings...');

                const prevCount = this.bot.listingManager.listings.length;

                this.bot.listingManager.getListings(err => {
                    if (err) {
                        return reject(err);
                    }

                    if (this.bot.listingManager.listings.length !== prevCount) {
                        log.debug(
                            'Count changed: ' +
                                this.bot.listingManager.listings.length +
                                ' listed, ' +
                                prevCount +
                                ' previously'
                        );

                        setTimeout(() => {
                            check();
                        }, exponentialBackoff(checks));
                    } else {
                        log.debug("Count didn't change");
                        return resolve();
                    }
                });
            };

            check();
        });
    }

    private getDetails(intent: 0 | 1, entry: Entry): string {
        const buying = intent === 0;
        const key = buying ? 'buy' : 'sell';
        const keyPrice = this.bot.pricelist.getKeyPrice().toString();

        let details: string;

        if (entry.name === 'Mann Co. Supply Crate Key' || !entry[key].toString().includes('key')) {
            details = this.templates[key]
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, entry.name)
                .replace(/%max_stock%/g, entry.max.toString())
                .replace(
                    /%current_stock%/g,
                    this.bot.inventoryManager
                        .getInventory()
                        .getAmount(entry.sku)
                        .toString()
                )
                .replace(/%amount_trade%/g, this.bot.inventoryManager.amountCanTrade(entry.sku, buying).toString())
                .replace(/%keyPrice%/g, '');
        } else {
            details = this.templates[key]
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, entry.name)
                .replace(/%max_stock%/g, entry.max.toString())
                .replace(
                    /%current_stock%/g,
                    this.bot.inventoryManager
                        .getInventory()
                        .getAmount(entry.sku)
                        .toString()
                )
                .replace(/%amount_trade%/g, this.bot.inventoryManager.amountCanTrade(entry.sku, buying).toString())
                .replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key');
        }

        return details;
    }
};
