import callbackQueue from 'callback-queue';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import request from 'request-retry-dayjs';
import async from 'async';
import dayjs from 'dayjs';

import Bot from './Bot';
import { Spells, StrangeParts, Sheens, Killstreakers, Painted } from './Options';
import { Entry } from './Pricelist';
import { BPTFGetUserInfo, UserSteamID } from './MyHandler/interfaces';

import log from '../lib/logger';
import { exponentialBackoff } from '../lib/helpers';
import { noiseMakers, strangePartsData, spellsData, killstreakersData, sheensData, paintedData } from '../lib/data';

import { updateOptionsCommand } from './Commands/functions/options';
import { DictItem } from './Inventory';

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

        const inventory = this.bot.inventoryManager.getInventory();

        this.bot.listingManager.findListings(sku).forEach(listing => {
            if (listing.intent === 1 && hasSellListing) {
                // Already have a sell listing, remove the listing
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
                let filtered: DictItem = undefined;

                if (listing.intent === 1) {
                    filtered = inventory.getItems[sku]?.filter(item => item.id === listing.id.replace('440_', ''))[0];
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
            const assetids = inventory.findBySKU(sku, true);

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
                    details: this.getDetails(
                        1,
                        matchNew,
                        inventory.getItems[sku]
                            ? inventory.getItems[sku].filter(item => item.id === assetids[assetids.length - 1])[0]
                            : undefined
                    ),
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
                            spellNames.push(replaceSpells(getKeyByValue(spellsData, spell), optR.spells));
                        });
                    } else if (hv.sp !== undefined && optD.showStrangeParts) {
                        for (const pSku in hv.sp) {
                            if (!Object.prototype.hasOwnProperty.call(hv.sp, pSku)) {
                                continue;
                            }

                            if (hv.sp[pSku] === true) {
                                hasStrangeParts = true;
                                partsNames.push(
                                    replaceStrangeParts(getKeyByValue(strangePartsData, +pSku), optR.strangeParts)
                                );
                            }
                        }
                    } else if (hv.ke !== undefined && optD.showKillstreaker) {
                        for (const pSku in hv.ke) {
                            if (!Object.prototype.hasOwnProperty.call(hv.ke, pSku)) {
                                continue;
                            }

                            if (hv.ke[pSku] === true) {
                                hasKillstreaker = true;
                                killstreakerName.push(
                                    replaceKillstreaker(getKeyByValue(killstreakersData, pSku), optR.killstreakers)
                                );
                            }
                        }
                    } else if (hv.ks !== undefined && optD.showSheen) {
                        for (const pSku in hv.ks) {
                            if (!Object.prototype.hasOwnProperty.call(hv.ks, pSku)) {
                                continue;
                            }

                            if (hv.ks[pSku] === true) {
                                hasSheen = true;
                                sheenName.push(replaceSheens(getKeyByValue(sheensData, pSku), optR.sheens));
                            }
                        }
                    } else if (hv.p !== undefined && optD.showPainted) {
                        for (const pSku in hv.p) {
                            if (!Object.prototype.hasOwnProperty.call(hv.p, pSku)) {
                                continue;
                            }

                            if (hv.p[pSku] === true) {
                                hasPaint = true;
                                paintName.push(replacePainted(getKeyByValue(paintedData, pSku), optR.painted));
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
            details = replaceDetails(
                entry.note.buy,
                entry,
                key,
                this.bot.inventoryManager.getInventory().getAmount(entry.sku),
                this.bot.inventoryManager.amountCanTrade(entry.sku, buying)
            );

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
                    : Object.keys(noiseMakers).includes(entry.sku) && opt.checkUses.noiseMaker
                    ? details.replace(/%uses%/g, optDs.noiseMaker ? optDs.noiseMaker : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)')
                    : details.replace(/%uses%/g, '');
            //
        } else if (entry.note && entry.note.sell && intent === 1) {
            // else if note.sell value is defined and not null and intent is selling, then use whatever in the
            // note.sell for sell order listing note.
            details = replaceDetails(
                entry.note.sell,
                entry,
                key,
                this.bot.inventoryManager.getInventory().getAmount(entry.sku),
                this.bot.inventoryManager.amountCanTrade(entry.sku, buying)
            );

            details = entry[key].toString().includes('key')
                ? details.replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key')
                : details.replace(/%keyPrice%/g, '');

            details =
                entry.sku === '241;6' && opt.checkUses.duel
                    ? details.replace(/%uses%/g, optDs.duel ? optDs.duel : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)')
                    : Object.keys(noiseMakers).includes(entry.sku) && opt.checkUses.noiseMaker
                    ? details.replace(/%uses%/g, optDs.noiseMaker ? optDs.noiseMaker : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)')
                    : details.replace(/%uses%/g, '');
            //
        } else if (entry.sku === '241;6' && opt.checkUses.duel) {
            // else if note.buy or note.sell are both null, use template/in config file.
            // this part checks if the item is Dueling Mini-Game.
            details = replaceDetails(
                this.templates[key],
                entry,
                key,
                this.bot.inventoryManager.getInventory().getAmount(entry.sku),
                this.bot.inventoryManager.amountCanTrade(entry.sku, buying)
            ).replace(/%uses%/g, optDs.duel ? optDs.duel : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)');

            details = entry[key].toString().includes('key')
                ? details.replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key')
                : details.replace(/%keyPrice%/g, '');
            //
        } else if (Object.keys(noiseMakers).includes(entry.sku) && opt.checkUses.noiseMaker) {
            // this part checks if the item is Noise Maker.
            details = replaceDetails(
                this.templates[key],
                entry,
                key,
                this.bot.inventoryManager.getInventory().getAmount(entry.sku),
                this.bot.inventoryManager.amountCanTrade(entry.sku, buying)
            ).replace(/%uses%/g, optDs.noiseMaker ? optDs.noiseMaker : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)');

            details = entry[key].toString().includes('key')
                ? details.replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key')
                : details.replace(/%keyPrice%/g, '');
            //
        } else if (entry.name === 'Mann Co. Supply Crate Key' || !entry[key].toString().includes('key')) {
            // this part checks if the item Mann Co. Supply Crate Key or the buying/selling price involve keys.
            details = replaceDetails(
                this.templates[key],
                entry,
                key,
                this.bot.inventoryManager.getInventory().getAmount(entry.sku),
                this.bot.inventoryManager.amountCanTrade(entry.sku, buying)
            )
                .replace(/%keyPrice%/g, '')
                .replace(/%uses%/g, '');
            //
        } else {
            // else if nothing above, then just use template/in config and replace every parameters.
            details = replaceDetails(
                this.templates[key],
                entry,
                key,
                this.bot.inventoryManager.getInventory().getAmount(entry.sku),
                this.bot.inventoryManager.amountCanTrade(entry.sku, buying)
            )
                .replace(/%keyPrice%/g, 'Key rate: ' + keyPrice + '/key')
                .replace(/%uses%/g, '');
            //
        }

        return details + highValueString;
    }
}

function getKeyByValue(object: { [key: string]: any }, value: any) {
    return Object.keys(object).find(key => object[key] === value);
}

function replaceDetails(
    details: string,
    entry: Entry,
    key: 'buy' | 'sell',
    currentStock: number,
    amountCanTrade: number
): string {
    return details
        .replace(/%price%/g, entry[key].toString())
        .replace(/%name%/g, entry.name)
        .replace(/%max_stock%/g, entry.max === -1 ? '∞' : entry.max.toString())
        .replace(/%current_stock%/g, currentStock.toString())
        .replace(/%amount_trade%/g, amountCanTrade.toString());
}

function replaceSpells(name: string, opt: Spells): string {
    return name
        .replace(/Putrescent Pigmentation/, opt.PP ? opt.PP : 'PP 🍃')
        .replace(/Die Job/, opt.DJ ? opt.DJ : 'DJ 🍐')
        .replace(/Chromatic Corruption/, opt.CC ? opt.CC : 'CC 🪀')
        .replace(/Spectral Spectrum/, opt.Spec ? opt.Spec : 'Spec 🔵🔴')
        .replace(/Sinister Staining/, opt.Sin ? opt.Sin : 'Sin 🍈')
        .replace(/Voices From Below/, opt.VFB ? opt.VFB : 'VFB 🗣️')
        .replace(/Team Spirit Footprints/, opt['TS-FP'] ? opt['TS-FP'] : 'TS-FP 🔵🔴')
        .replace(/Gangreen Footprints/, opt['GG-FP'] ? opt['GG-FP'] : 'GG-FP 🟡')
        .replace(/Corpse Gray Footprints/, opt['CG-FP'] ? opt['CG-FP'] : 'CG-FP 👽')
        .replace(/Violent Violet Footprints/, opt['VV-FP'] ? opt['VV-FP'] : 'VV-FP ♨️')
        .replace(/Rotten Orange Footprints/, opt['RO-FP'] ? opt['RO-FP'] : 'RO-FP 🍊')
        .replace(/Bruised Purple Footprints/, opt['BP-FP'] ? opt['BP-FP'] : 'BP-FP 🍷')
        .replace(/Headless Horseshoes/, opt['HH'] ? opt['HH'] : 'HH 🍇')
        .replace(/Exorcism/, opt.Ex ? opt.Ex : '👻')
        .replace(/Pumpkin Bomb/, opt.PB ? opt.PB : '🎃💣')
        .replace(/Halloween Fire/, opt.HF ? opt.HF : '🔥🟢');
}

function replaceSheens(name: string, opt: Sheens): string {
    return name
        .replace(/Team Shine/, opt['Team Shine'] ? opt['Team Shine'] : '🔵🔴')
        .replace(/Hot Rod/, opt['Hot Rod'] ? opt['Hot Rod'] : '🎗️')
        .replace(/Manndarin/, opt.Manndarin ? opt.Manndarin : '🟠')
        .replace(/Deadly Daffodil/, opt['Deadly Daffodil'] ? opt['Deadly Daffodil'] : '🟡')
        .replace(/Mean Green/, opt['Mean Green'] ? opt['Mean Green'] : '🟢')
        .replace(/Agonizing Emerald/, opt['Agonizing Emerald'] ? opt['Agonizing Emerald'] : '🟩')
        .replace(/Villainous Violet/, opt['Villainous Violet'] ? opt['Villainous Violet'] : '🟣');
}

function replaceKillstreaker(name: string, opt: Killstreakers): string {
    return name
        .replace(/Cerebral Discharge/, opt['Cerebral Discharge'] ? opt['Cerebral Discharge'] : '⚡')
        .replace(/Fire Horns/, opt['Fire Horns'] ? opt['Fire Horns'] : '🔥🐮')
        .replace(/Flames/, opt.Flames ? opt.Flames : '🔥')
        .replace(/Hypno-Beam/, opt['Hypno-Beam'] ? opt['Hypno-Beam'] : '😵💫')
        .replace(/Incinerator/, opt.Incinerator ? opt.Incinerator : '🚬')
        .replace(/Singularity/, opt.Singularity ? opt.Singularity : '🔆')
        .replace(/Tornado/, opt.Tornado ? opt.Tornado : '🌪️');
}

function replacePainted(name: string, opt: Painted): string {
    return name
        .replace(/A Color Similar to Slate/, opt.Slate ? opt.Slate : '🧪')
        .replace(/A Deep Commitment to Purple/, opt['Deep Purple'] ? opt['Deep Purple'] : '🪀')
        .replace(/A Distinctive Lack of Hue/, opt.Black ? opt.Black : '🎩')
        .replace(/A Mann's Mint/, opt.Mint ? opt.Mint : '👽')
        .replace(/After Eight/, opt['After Eight'] ? opt['After Eight'] : '🏴')
        .replace(/Aged Moustache Grey/, opt.Grey ? opt.Grey : '👤')
        .replace(/An Extraordinary Abundance of Tinge/, opt.White ? opt.White : '🏐')
        .replace(/Australium Gold/, opt.Gold ? opt.Gold : '🏆')
        .replace(/Color No. 216-190-216/, opt['216-190-216'] ? opt['216-190-216'] : '🧠')
        .replace(/Dark Salmon Injustice/, opt['Dark Salmon'] ? opt['Dark Salmon'] : '🐚')
        .replace(/Drably Olive/, opt['Drably Olive'] ? opt['Drably Olive'] : '🥝')
        .replace(/Indubitably Green/, opt['Indubitably Green'] ? opt['Indubitably Green'] : '🥦')
        .replace(/Mann Co. Orange/, opt['Orange'] ? opt['Orange'] : '🏀')
        .replace(/Muskelmannbraun/, opt.Muskelmannbraun ? opt.Muskelmannbraun : '👜')
        .replace(/Noble Hatter's Violet/, opt.Violet ? opt.Violet : '🍇')
        .replace(/Peculiarly Drab Tincture/, opt['Drab Tincture'] ? opt['Drab Tincture'] : '🪑')
        .replace(/Pink as Hell/, opt['Pink as Hell'] ? opt['Pink as Hell'] : '🎀')
        .replace(/Radigan Conagher Brown/, opt.Brown ? opt.Brown : '🚪')
        .replace(/The Bitter Taste of Defeat and Lime/, opt.Lime ? opt.Lime : '💚')
        .replace(/The Color of a Gentlemann's Business Pants/, opt['Business Pants'] ? opt['Business Pants'] : '🧽')
        .replace(/Ye Olde Rustic Colour/, opt['Ye Olde'] ? opt['Ye Olde'] : '🥔')
        .replace(/Zepheniah's Greed/, opt["Zepheniah's Greed"] ? opt["Zepheniah's Greed"] : '🌳')
        .replace(/An Air of Debonair/, opt['An Air of Debonair'] ? opt['An Air of Debonair'] : '👜🔷')
        .replace(/Balaclavas Are Forever/, opt['Balaclavas Are Forever'] ? opt['Balaclavas Are Forever'] : '👜🔷')
        .replace(/Operator's Overalls/, opt["Operator's Overalls"] ? opt["Operator's Overalls"] : '👜🔷')
        .replace(/Cream Spirit/, opt['Cream Spirit'] ? opt['Cream Spirit'] : '🍘🥮')
        .replace(/Team Spirit/, opt['Team Spirit'] ? opt['Team Spirit'] : '🔵🔴')
        .replace(/The Value of Teamwork/, opt['Value of Teamwork'] ? opt['Value of Teamwork'] : '👨🏽‍🤝‍👨🏻')
        .replace(/Waterlogged Lab Coat/, opt['Waterlogged Lab Coat'] ? opt['Waterlogged Lab Coat'] : '👨🏽‍🤝‍👨🏽');
}

function replaceStrangeParts(name: string, opt: StrangeParts): string {
    return name
        .replace(/Robots Destroyed/, opt['Robots Destroyed'] ? opt['Robots Destroyed'] : 'Robots Destroyed')
        .replace(/Kills/, opt.Kills ? opt.Kills : 'Kills')
        .replace(
            /Airborne Enemy Kills/,
            opt['Airborne Enemy Kills'] ? opt['Airborne Enemy Kills'] : 'Airborne Enemy Kills'
        )
        .replace(/Damage Dealt/, opt['Damage Dealt'] ? opt['Damage Dealt'] : 'Damage Dealt')
        .replace(/Dominations/, opt.Dominations ? opt.Dominations : 'Dominations')
        .replace(/Snipers Killed/, opt['Snipers Killed'] ? opt['Snipers Killed'] : 'Snipers Killed')
        .replace(/Buildings Destroyed/, opt['Buildings Destroyed'] ? opt['Buildings Destroyed'] : 'Buildings Destroyed')
        .replace(
            /Projectiles Reflected/,
            opt['Projectiles Reflected'] ? opt['Projectiles Reflected'] : 'Projectiles Reflected'
        )
        .replace(/Headshot Kills/, opt['Headshot Kills'] ? opt['Headshot Kills'] : 'Headshot Kills')
        .replace(/Medics Killed/, opt['Medics Killed'] ? opt['Medics Killed'] : 'Medics Killed')
        .replace(/Fires Survived/, opt['Fires Survived'] ? opt['Fires Survived'] : 'Fires Survived')
        .replace(
            /Teammates Extinguished/,
            opt['Teammates Extinguished'] ? opt['Teammates Extinguished'] : 'Teammates Extinguished'
        )
        .replace(
            /Freezecam Taunt Appearances/,
            opt['Freezecam Taunt Appearances'] ? opt['Freezecam Taunt Appearances'] : 'Freezecam Taunt Appearances'
        )
        .replace(/Spies Killed/, opt['Spies Killed'] ? opt['Spies Killed'] : 'Spies Killed')
        .replace(/Allied Healing Done/, opt['Allied Healing Done'] ? opt['Allied Healing Done'] : 'Allied Healing Done')
        .replace(/Sappers Removed/, opt['Sappers Removed'] ? opt['Sappers Removed'] : 'Sappers Removed')
        .replace(/Players Hit/, opt['Players Hit'] ? opt['Players Hit'] : 'Players Hit')
        .replace(/Gib Kills/, opt['Gib Kills'] ? opt['Gib Kills'] : 'Gib Kills')
        .replace(/Scouts Killed/, opt['Scouts Killed'] ? opt['Scouts Killed'] : 'Scouts Killed')
        .replace(/Taunt Kills/, opt['Taunt Kills'] ? opt['Taunt Kills'] : 'Taunt Kills')
        .replace(/Point Blank Kills/, opt['Point Blank Kills'] ? opt['Point Blank Kills'] : 'Point Blank Kills')
        .replace(/Soldiers Killed/, opt['Soldiers Killed'] ? opt['Soldiers Killed'] : 'Soldiers Killed')
        .replace(/Long-Distance Kills/, opt['Long-Distance Kills'] ? opt['Long-Distance Kills'] : 'Long-Distance Kills')
        .replace(
            /Giant Robots Destroyed/,
            opt['Giant Robots Destroyed'] ? opt['Giant Robots Destroyed'] : 'Giant Robots Destroyed'
        )
        .replace(/Critical Kills/, opt['Critical Kills'] ? opt['Critical Kills'] : 'Critical Kills')
        .replace(/Demomen Killed/, opt['Demomen Killed'] ? opt['Demomen Killed'] : 'Demomen Killed')
        .replace(
            /Unusual-Wearing Player Kills/,
            opt['Unusual-Wearing Player Kills'] ? opt['Unusual-Wearing Player Kills'] : 'Unusual-Wearing Player Kills'
        )
        .replace(/Assists/, opt.Assists ? opt.Assists : 'Assists')
        .replace(
            /Medics Killed That Have Full ÜberCharge/,
            opt['Medics Killed That Have Full ÜberCharge']
                ? opt['Medics Killed That Have Full ÜberCharge']
                : 'Medics Killed That Have Full ÜberCharge'
        )
        .replace(
            /Cloaked Spies Killed/,
            opt['Cloaked Spies Killed'] ? opt['Cloaked Spies Killed'] : 'Cloaked Spies Killed'
        )
        .replace(/Engineers Killed/, opt['Engineers Killed'] ? opt['Engineers Killed'] : 'Engineers Killed')
        .replace(
            /Kills While Explosive-Jumping/,
            opt['Kills While Explosive-Jumping']
                ? opt['Kills While Explosive-Jumping']
                : 'Kills While Explosive-Jumping'
        )
        .replace(
            /Kills While Low Health/,
            opt['Kills While Low Health'] ? opt['Kills While Low Health'] : 'Kills While Low Health'
        )
        .replace(
            /Burning Player Kills/,
            opt['Burning Player Kills'] ? opt['Burning Player Kills'] : 'Burning Player Kills'
        )
        .replace(
            /Kills While Invuln ÜberCharged/,
            opt['Kills While Invuln ÜberCharged']
                ? opt['Kills While Invuln ÜberCharged']
                : 'Kills While Invuln ÜberCharged'
        )
        .replace(/Posthumous Kills/, opt['Posthumous Kills'] ? opt['Posthumous Kills'] : 'Posthumous Kills')
        .replace(
            /Not Crit nor MiniCrit Kills/,
            opt['Not Crit nor MiniCrit Kills'] ? opt['Not Crit nor MiniCrit Kills'] : 'Not Crit nor MiniCrit Kills'
        )
        .replace(/Full Health Kills/, opt['Full Health Kills'] ? opt['Full Health Kills'] : 'Full Health Kills')
        .replace(/Killstreaks Ended/, opt['Killstreaks Ended'] ? opt['Killstreaks Ended'] : 'Killstreaks Ended')
        .replace(/Defenders Killed/, opt['Defenders Killed'] ? opt['Defenders Killed'] : 'Defenders Killed')
        .replace(/Revenges/, opt.Revenges ? opt.Revenges : 'Revenges')
        .replace(
            /Robot Scouts Destroyed/,
            opt['Robot Scouts Destroyed'] ? opt['Robot Scouts Destroyed'] : 'Robot Scouts Destroyed'
        )
        .replace(/Heavies Killed/, opt['Heavies Killed'] ? opt['Heavies Killed'] : 'Heavies Killed')
        .replace(/Tanks Destroyed/, opt['Tanks Destroyed'] ? opt['Tanks Destroyed'] : 'Tanks Destroyed')
        .replace(
            /Kills During Halloween/,
            opt['Kills During Halloween'] ? opt['Kills During Halloween'] : 'Kills During Halloween'
        )
        .replace(/Pyros Killed/, opt['Pyros Killed'] ? opt['Pyros Killed'] : 'Pyros Killed')
        .replace(
            /Submerged Enemy Kills/,
            opt['Submerged Enemy Kills'] ? opt['Submerged Enemy Kills'] : 'Submerged Enemy Kills'
        )
        .replace(
            /Kills During Victory Time/,
            opt['Kills During Victory Time'] ? opt['Kills During Victory Time'] : 'Kills During Victory Time'
        )
        .replace(
            /Taunting Player Kills/,
            opt['Taunting Player Kills'] ? opt['Taunting Player Kills'] : 'Taunting Player Kills'
        )
        .replace(
            /Robot Spies Destroyed/,
            opt['Robot Spies Destroyed'] ? opt['Robot Spies Destroyed'] : 'Robot Spies Destroyed'
        )
        .replace(
            /Kills Under A Full Moon/,
            opt['Kills Under A Full Moon'] ? opt['Kills Under A Full Moon'] : 'Kills Under A Full Moon'
        )
        .replace(
            /Robots Killed During Halloween/,
            opt['Robots Killed During Halloween']
                ? opt['Robots Killed During Halloween']
                : 'Robots Killed During Halloween'
        );
}
