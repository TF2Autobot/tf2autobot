import callbackQueue from 'callback-queue';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import request from 'request-retry-dayjs';
import async from 'async';
import dayjs from 'dayjs';

import Bot from '../Bot';
import { Entry } from '../Pricelist';
import { BPTFGetUserInfo, UserSteamID } from '../MyHandler/interfaces';
import * as rep from './export';

import log from '../../lib/logger';
import { exponentialBackoff } from '../../lib/helpers';
import {
    noiseMakerSKUs,
    strangePartsData,
    spellsData,
    killstreakersData,
    sheensData,
    paintedData
} from '../../lib/data';
import { updateOptionsCommand } from '../Commands/functions/options';
import { DictItem } from '../Inventory';

export default class Listings {
    private readonly bot: Bot;

    private checkingAllListings = false;

    private removingAllListings = false;

    private cancelCheckingListings = false;

    private autoRelistEnabled = false;

    private autoRelistTimeout;

    private get isAutoRelistEnabled(): boolean {
        return this.bot.options.autobump.enable;
    }

    private get isCreateListing(): boolean {
        return this.bot.options.createListings.enable;
    }

    private templates: { buy: string; sell: string };

    private readonly checkFn;

    constructor(bot: Bot) {
        this.bot = bot;
        this.templates = {
            buy:
                this.bot.options.details.buy ||
                'I am buying your %name% for %price%, I have %current_stock% / %max_stock%.',
            sell: this.bot.options.details.sell || 'I am selling my %name% for %price%, I am selling %amount_trade%.'
        };

        this.checkFn = this.checkAccountInfo.bind(this);
    }

    setupAutorelist(): void {
        if (!this.isAutoRelistEnabled || !this.isCreateListing) {
            // Autobump is not enabled
            return;
        }

        // Autobump is enabled, add heartbeat listener

        this.bot.listingManager.removeListener('heartbeat', this.checkFn);
        this.bot.listingManager.on('heartbeat', this.checkFn);

        // Get account info
        this.checkAccountInfo();
    }

    disableAutorelistOption(): void {
        this.bot.listingManager.removeListener('heartbeat', this.checkFn);
        this.disableAutoRelist();
    }

    private enableAutoRelist(): void {
        if (this.autoRelistEnabled || !this.isCreateListing) {
            return;
        }

        log.debug('Enabled autorelist');

        this.autoRelistEnabled = true;

        clearTimeout(this.autoRelistTimeout);

        const doneWait = (): void => {
            async.eachSeries(
                [
                    (callback): void => {
                        void this.redoListings().asCallback(callback);
                    },
                    (callback): void => {
                        void this.waitForListings().asCallback(callback);
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

        void this.getAccountInfo().asCallback((err, info) => {
            if (err) {
                log.warn('Failed to get account info from backpack.tf: ', err);
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
            } else if (this.isAutoRelistEnabled && info.premium === 1) {
                log.warn('Disabling autobump! - Your account is premium, no need to forcefully bump listings');
                updateOptionsCommand(null, '!config autobump=false', this.bot);
            }
        });
    }

    private disableAutoRelist(): void {
        clearTimeout(this.autoRelistTimeout);
        this.autoRelistEnabled = false;

        log.debug('Disabled autorelist');
    }

    private getAccountInfo(): Promise<UserSteamID> {
        return new Promise((resolve, reject) => {
            const steamID64 = this.bot.manager.steamID.getSteamID64();

            const options = {
                url: 'https://backpack.tf/api/users/info/v1',
                method: 'GET',
                qs: {
                    key: this.bot.options.bptfAPIKey,
                    steamids: steamID64
                },
                gzip: true,
                json: true
            };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            void request(options, (err, reponse, body) => {
                if (err) {
                    return reject(err);
                }

                const thisBody = body as BPTFGetUserInfo;
                return resolve(thisBody.users[steamID64]);
            });
        });
    }

    checkBySKU(sku: string, data?: Entry | null, generics = false): void {
        if (!this.isCreateListing) {
            return;
        }

        const item = SKU.fromString(sku);

        const match = data && data.enabled === false ? null : this.bot.pricelist.getPrice(sku, true, generics);

        let hasBuyListing = item.paintkit !== null;
        let hasSellListing = false;

        const amountCanBuy = this.bot.inventoryManager.amountCanTrade(sku, true, generics);
        const amountCanSell = this.bot.inventoryManager.amountCanTrade(sku, false, generics);

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
                const inventory = this.bot.inventoryManager.getInventory();
                const items = inventory.getItems;
                let filtered: DictItem = undefined;

                if (listing.intent === 1) {
                    filtered = items[sku]?.filter(item => item.id === listing.id.replace('440_', ''))[0];
                }

                const newDetails = this.getDetails(listing.intent, match, filtered);

                if (listing.details !== newDetails || listing.promoted !== match.promoted) {
                    // Listing details or promoted don't match, update listing with new details and price
                    const currencies = match[listing.intent === 0 ? 'buy' : 'sell'];

                    listing.update({
                        time: match.time || dayjs().unix(),
                        currencies: currencies,
                        promoted: listing.intent === 0 ? 0 : match.promoted,
                        details: newDetails
                    });
                }
            }
        });

        const matchNew = data && data.enabled === false ? null : this.bot.pricelist.getPrice(sku, true, generics);

        if (matchNew !== null && matchNew.enabled === true) {
            const inventory = this.bot.inventoryManager.getInventory();
            const assetids = inventory.findBySKU(sku, true);
            const items = inventory.getItems;

            const filtered = items[sku]
                ? items[sku].filter(item => item.id === assetids[assetids.length - 1])[0]
                : undefined;

            // TODO: Check if we are already making a listing for same type of item + intent

            if (!hasBuyListing && amountCanBuy > 0) {
                // We have no buy order and we can buy more items, create buy listing
                this.bot.listingManager.createListing({
                    time: matchNew.time || dayjs().unix(),
                    sku: sku,
                    intent: 0,
                    details: this.getDetails(0, matchNew),
                    currencies: matchNew.buy
                });
            }

            if (!hasSellListing && amountCanSell > 0) {
                // We have no sell order and we can sell items, create sell listing
                this.bot.listingManager.createListing({
                    time: matchNew.time || dayjs().unix(),
                    id: assetids[assetids.length - 1],
                    intent: 1,
                    promoted: matchNew.promoted,
                    details: this.getDetails(1, matchNew, filtered),
                    currencies: matchNew.sell
                });
            }
        }
    }

    checkAll(): Promise<void> {
        return new Promise(resolve => {
            if (!this.isCreateListing) {
                return resolve();
            }

            log.debug('Checking all');

            const doneRemovingAll = (): void => {
                const next = callbackQueue.add('checkAllListings', () => {
                    resolve();
                });

                if (next === false) {
                    return;
                }

                this.checkingAllListings = true;

                const inventory = this.bot.inventoryManager.getInventory();

                const pricelist = this.bot.pricelist.getPrices.sort((a, b) => {
                    return inventory.findBySKU(b.sku).length - inventory.findBySKU(a.sku).length;
                });

                log.debug('Checking listings for ' + pluralize('item', pricelist.length, true) + '...');

                void this.recursiveCheckPricelist(pricelist).asCallback(() => {
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

    checkAllWithDelay(): Promise<void> {
        return new Promise(resolve => {
            if (!this.isCreateListing) {
                return resolve();
            }

            log.debug('Checking all');

            const doneRemovingAll = (): void => {
                const next = callbackQueue.add('checkAllListings', () => {
                    resolve();
                });

                if (next === false) {
                    return;
                }

                this.checkingAllListings = true;

                const inventory = this.bot.inventoryManager.getInventory();

                const pricelist = this.bot.pricelist.getPrices.sort((a, b) => {
                    return inventory.findBySKU(b.sku).length - inventory.findBySKU(a.sku).length;
                });

                log.debug('Checking listings for ' + pluralize('item', pricelist.length, true) + '...');

                void this.recursiveCheckPricelistWithDelay(pricelist).asCallback(() => {
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

    recursiveCheckPricelistWithDelay(pricelist: Entry[]): Promise<void> {
        return new Promise(resolve => {
            let index = 0;

            const iteration = (): void => {
                if (pricelist.length <= index || this.cancelCheckingListings) {
                    this.cancelCheckingListings = false;
                    return resolve();
                }

                setTimeout(() => {
                    this.checkBySKU(pricelist[index].sku, pricelist[index]);

                    index++;

                    iteration();
                }, 200);
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
            const next = callbackQueue.add('removeAllListings', err => {
                if (err) {
                    return reject(err);
                }

                return resolve(null);
            });

            if (next === false) {
                // Function was already called
                return;
            }

            void this.removeAllListings().asCallback(next);
        });
    }

    private removeAllListings(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.removingAllListings = true;

            // Clear create queue
            this.bot.listingManager.actions.create = [];

            // Wait for backpack.tf to finish creating / removing listings
            void this.waitForListings().then(() => {
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

    redoListingsWithDelay(): Promise<void> {
        return this.removeAll().then(() => {
            return this.checkAllWithDelay();
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
                            `Count changed: ${this.bot.listingManager.listings.length} listed, ${prevCount} previously`
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

    private getDetails(intent: 0 | 1, entry: Entry, item?: DictItem): string {
        const opt = this.bot.options;
        const buying = intent === 0;
        const key = buying ? 'buy' : 'sell';
        const keyPrice = this.bot.pricelist.getKeyPrice.toString();

        const maxStock = entry.max;
        const currentStock = this.bot.inventoryManager.getInventory().getAmount(entry.sku);

        let details: string;

        let highValueString = '';

        if (intent === 1) {
            const highValue = {
                spells: '',
                parts: '',
                killstreaker: '',
                sheen: '',
                painted: ''
            };

            let hasSpells = false;
            let hasStrangeParts = false;
            let hasKillstreaker = false;
            let hasSheen = false;
            let hasPaint = false;

            const spellNames: string[] = [];
            const partsNames: string[] = [];
            const killstreakerName: string[] = [];
            const sheenName: string[] = [];
            const paintName: string[] = [];

            const optD = this.bot.options.details.highValue;
            const optR = this.bot.options.detailsExtra;

            // if item undefined, then skip because it will make your bot crashed.
            if (item) {
                const hv = item.hv;

                if (hv) {
                    if (hv.s !== undefined && optD.showSpells) {
                        // Show all
                        hasSpells = true;
                        hv.s.forEach(spell => {
                            spellNames.push(rep.replaceSpells(getKeyByValue(spellsData, spell), optR.spells));
                        });
                    } else if (hv.sp !== undefined && optD.showStrangeParts) {
                        for (const pSku in hv.sp) {
                            if (hv.sp[pSku] === true) {
                                hasStrangeParts = true;
                                partsNames.push(
                                    rep.replaceStrangeParts(getKeyByValue(strangePartsData, +pSku), optR.strangeParts)
                                );
                            }
                        }
                    } else if (hv.ke !== undefined && optD.showKillstreaker) {
                        for (const pSku in hv.ke) {
                            if (hv.ke[pSku] === true) {
                                hasKillstreaker = true;
                                killstreakerName.push(
                                    rep.replaceKillstreaker(getKeyByValue(killstreakersData, pSku), optR.killstreakers)
                                );
                            }
                        }
                    } else if (hv.ks !== undefined && optD.showSheen) {
                        for (const pSku in hv.ks) {
                            if (hv.ks[pSku] === true) {
                                hasSheen = true;
                                sheenName.push(rep.replaceSheens(getKeyByValue(sheensData, pSku), optR.sheens));
                            }
                        }
                    } else if (hv.p !== undefined && optD.showPainted) {
                        for (const pSku in hv.p) {
                            if (hv.p[pSku] === true) {
                                hasPaint = true;
                                paintName.push(rep.replacePainted(getKeyByValue(paintedData, pSku), optR.painted));
                            }
                        }
                    }

                    if (hasSpells || hasKillstreaker || hasSheen || hasStrangeParts || hasPaint) {
                        highValueString = ' | ';

                        if (hasSpells) highValue.spells = `🎃 Spelled: ${spellNames.join(' + ')}`;
                        if (hasStrangeParts) highValue.parts = `🎰 Parts: ${partsNames.join(' + ')}`;
                        if (hasKillstreaker)
                            highValue.killstreaker = `🤩 Killstreaker: ${killstreakerName.join(' + ')}`;
                        if (hasSheen) highValue.sheen = `✨ Sheen: ${sheenName.join(' + ')}`;
                        if (hasPaint) highValue.painted = `🎨 Painted: ${paintName.join(' + ')}`;

                        for (let i = 0; i < Object.keys(highValue).length; i++) {
                            if (Object.values(highValue)[i] !== '') {
                                highValueString += Object.values(highValue)[i] + ' | ';
                            }
                        }
                    }
                }
            }
        }

        const optDs = this.bot.options.details.uses;

        if (entry.note && entry.note.buy && intent === 0) {
            // If note.buy value is defined and not null and intent is buying, then use whatever in the
            // note.buy for buy order listing note.
            details = entry.note.buy
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, entry.name)
                .replace(/%max_stock%/g, maxStock === -1 ? '∞' : maxStock.toString())
                .replace(/%current_stock%/g, currentStock.toString())
                .replace(/%amount_trade%/g, this.bot.inventoryManager.amountCanTrade(entry.sku, buying).toString());

            // if %keyPrice% is defined in note.buy value and the item price involved keys,
            // then replace it with current key rate.
            // else just empty string.
            details = entry[key].toString().includes('key')
                ? details.replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key')
                : details.replace(/%keyPrice%/g, '');

            // if %uses% is defined in note.buy value and the item is Dueling Mini-Game and only accept
            // 5x uses, then replace %uses% with (𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)
            // else just empty string.
            details =
                entry.sku === '241;6' && opt.checkUses.duel
                    ? details.replace(/%uses%/g, optDs.duel ? optDs.duel : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)')
                    : noiseMakerSKUs.includes(entry.sku) && opt.checkUses.noiseMaker
                    ? details.replace(/%uses%/g, optDs.noiseMaker ? optDs.noiseMaker : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)')
                    : details.replace(/%uses%/g, '');
        } else if (entry.note && entry.note.sell && intent === 1) {
            // else if note.sell value is defined and not null and intent is selling, then use whatever in the
            // note.sell for sell order listing note.
            details = entry.note.sell
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, entry.name)
                .replace(/%max_stock%/g, maxStock === -1 ? '∞' : maxStock.toString())
                .replace(/%current_stock%/g, currentStock.toString())
                .replace(/%amount_trade%/g, this.bot.inventoryManager.amountCanTrade(entry.sku, buying).toString());

            details = entry[key].toString().includes('key')
                ? details.replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key')
                : details.replace(/%keyPrice%/g, '');
            details =
                entry.sku === '241;6' && opt.checkUses.duel
                    ? details.replace(/%uses%/g, optDs.duel ? optDs.duel : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)')
                    : noiseMakerSKUs.includes(entry.sku) && opt.checkUses.noiseMaker
                    ? details.replace(/%uses%/g, optDs.noiseMaker ? optDs.noiseMaker : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)')
                    : details.replace(/%uses%/g, '');
        } else if (entry.sku === '241;6' && opt.checkUses.duel) {
            // else if note.buy or note.sell are both null, use template/in config file.
            // this part checks if the item is Dueling Mini-Game.
            details = this.templates[key]
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, entry.name)
                .replace(/%max_stock%/g, maxStock === -1 ? '∞' : maxStock.toString())
                .replace(/%current_stock%/g, currentStock.toString())
                .replace(/%amount_trade%/g, this.bot.inventoryManager.amountCanTrade(entry.sku, buying).toString())
                .replace(/%uses%/g, optDs.duel ? optDs.duel : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)');

            details = entry[key].toString().includes('key')
                ? details.replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key')
                : details.replace(/%keyPrice%/g, '');
        } else if (noiseMakerSKUs.includes(entry.sku) && opt.checkUses.noiseMaker) {
            // this part checks if the item is Noise Maker.
            details = this.templates[key]
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, entry.name)
                .replace(/%max_stock%/g, maxStock === -1 ? '∞' : maxStock.toString())
                .replace(/%current_stock%/g, currentStock.toString())
                .replace(/%amount_trade%/g, this.bot.inventoryManager.amountCanTrade(entry.sku, buying).toString())
                .replace(/%uses%/g, optDs.noiseMaker ? optDs.noiseMaker : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)');

            details = entry[key].toString().includes('key')
                ? details.replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key')
                : details.replace(/%keyPrice%/g, '');
        } else if (entry.name === 'Mann Co. Supply Crate Key' || !entry[key].toString().includes('key')) {
            // this part checks if the item Mann Co. Supply Crate Key or the buying/selling price involve keys.
            details = this.templates[key]
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, entry.name)
                .replace(/%max_stock%/g, maxStock === -1 ? '∞' : maxStock.toString())
                .replace(/%current_stock%/g, currentStock.toString())
                .replace(/%amount_trade%/g, this.bot.inventoryManager.amountCanTrade(entry.sku, buying).toString())
                .replace(/%keyPrice%/g, '')
                .replace(/%uses%/g, '');
        } else {
            // else if nothing above, then just use template/in config and replace every parameters.
            details = this.templates[key]
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, entry.name)
                .replace(/%max_stock%/g, maxStock === -1 ? '∞' : maxStock.toString())
                .replace(/%current_stock%/g, currentStock.toString())
                .replace(/%amount_trade%/g, this.bot.inventoryManager.amountCanTrade(entry.sku, buying).toString())
                .replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key')
                .replace(/%uses%/g, '');
        }

        return details + highValueString;
    }
}

function getKeyByValue(object: { [key: string]: any }, value: any) {
    return Object.keys(object).find(key => object[key] === value);
}
