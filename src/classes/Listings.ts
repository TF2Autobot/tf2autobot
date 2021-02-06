import callbackQueue from 'callback-queue';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import request from 'request-retry-dayjs';
import async from 'async';
import dayjs from 'dayjs';
import Currencies from 'tf2-currencies';
import Bot from './Bot';
import { Entry } from './Pricelist';
import { BPTFGetUserInfo, UserSteamID } from './MyHandler/interfaces';
import log from '../lib/logger';
import { exponentialBackoff } from '../lib/helpers';
import { noiseMakers, spellsData, killstreakersData, sheensData } from '../lib/data';
import { updateOptionsCommand } from './Commands/functions/options';
import { DictItem } from './Inventory';
import { PaintedNames } from './Options';
import { Paints, StrangeParts } from 'tf2-schema-2';

export default class Listings {
    private readonly bot: Bot;

    private checkingAllListings = false;

    private removingAllListings = false;

    private cancelCheckingListings = false;

    private autoRelistEnabled = false;

    private autoRelistTimeout: NodeJS.Timeout;

    private get isAutoRelistEnabled(): boolean {
        return this.bot.options.miscSettings.autobump.enable;
    }

    private get isCreateListing(): boolean {
        return this.bot.options.miscSettings.createListings.enable;
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
        this.disableAutoRelist(false, 'permanent');
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
                    if (this.bot.botManager.isStopping) {
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

        void this.getAccountInfo.asCallback((err, info) => {
            if (err) {
                log.warn('Failed to get account info from backpack.tf: ', err);
                // temporarilyy disable autoRelist, so on the next check, when backpack.tf
                // back alive, might trigger to call this.enableAutoRelist()
                clearTimeout(this.autoRelistTimeout);
                this.disableAutoRelist(false, 'temporary');
                return;
            }

            if (this.autoRelistEnabled && info.premium === 1) {
                log.warn('Disabling autorelist! - Your account is premium, no need to forcefully bump listings');
            } else if (!this.autoRelistEnabled && info.premium !== 1) {
                log.warn(
                    'Enabling autorelist! - Consider paying for backpack.tf premium instead of forcefully bumping listings: https://backpack.tf/donate'
                );
                this.enableAutoRelist();
            } else if (this.isAutoRelistEnabled && info.premium === 1) {
                log.warn('Disabling autobump! - Your account is premium, no need to forcefully bump listings');
                updateOptionsCommand(null, '!config miscSettings.autobump.enable=false', this.bot);
            }
        });
    }

    private disableAutoRelist(setValue: boolean, type: 'temporary' | 'permanent') {
        clearTimeout(this.autoRelistTimeout);
        this.autoRelistEnabled = setValue;
        log.debug(type === 'temporary' ? 'Temporarily disabled autorelist' : 'Disabled autorelist');
    }

    private get getAccountInfo(): Promise<UserSteamID> {
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

            void request(options, (err, reponse, body) => {
                if (err) {
                    return reject(err);
                }

                return resolve((body as BPTFGetUserInfo).users[steamID64]);
            });
        });
    }

    checkBySKU(sku: string, data?: Entry | null, generics = false): void {
        if (!this.isCreateListing) {
            return;
        }

        const match = data && data.enabled === false ? null : this.bot.pricelist.getPrice(sku, true, generics);

        let hasBuyListing = SKU.fromString(sku).paintkit !== null;
        let hasSellListing = false;

        const amountCanBuy = this.bot.inventoryManager.amountCanTrade(sku, true, generics);
        const amountCanSell = this.bot.inventoryManager.amountCanTrade(sku, false, generics);
        const inventory = this.bot.inventoryManager.getInventory;

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
                if (listing.intent === 0 && /;[p][0-9]+/.test(sku)) {
                    // do nothing
                } else {
                    const newDetails = this.getDetails(
                        listing.intent,
                        listing.intent === 0 ? amountCanBuy : amountCanSell,
                        match,
                        inventory.getItems[sku]?.filter(item => item.id === listing.id.replace('440_', ''))[0]
                    );

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
            }
        });

        const matchNew = data && data.enabled === false ? null : this.bot.pricelist.getPrice(sku, true, generics);

        if (matchNew !== null && matchNew.enabled === true) {
            const assetids = inventory.findBySKU(sku, true);

            // TODO: Check if we are already making a listing for same type of item + intent

            if (!hasBuyListing && amountCanBuy > 0 && !/;[p][0-9]+/.test(sku)) {
                // We have no buy order and we can buy more items, create buy listing
                this.bot.listingManager.createListing({
                    time: matchNew.time || dayjs().unix(),
                    sku: sku,
                    intent: 0,
                    details: this.getDetails(0, amountCanBuy, matchNew),
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
                        amountCanSell,
                        matchNew,
                        inventory.getItems[sku]?.filter(item => item.id === assetids[assetids.length - 1])[0]
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

                const inventoryManager = this.bot.inventoryManager;
                const inventory = inventoryManager.getInventory;
                const currentPure = inventoryManager.getPureValue;

                const keyPrice = this.bot.pricelist.getKeyPrice;

                const pricelist = this.bot.pricelist.getPrices
                    .sort((a, b) => {
                        return (
                            currentPure.keys -
                            (b.buy.keys - a.buy.keys) * keyPrice.toValue() +
                            (currentPure.metal - Currencies.toScrap(b.buy.metal - a.buy.metal))
                        );
                    })
                    .sort((a, b) => {
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
                return doneRemovingAll();
            }

            callbackQueue.add('removeAllListings', () => {
                doneRemovingAll();
            });
        });
    }

    recursiveCheckPricelist(pricelist: Entry[], withDelay = false): Promise<void> {
        return new Promise(resolve => {
            let index = 0;

            const iteration = (): void => {
                if (pricelist.length <= index || this.cancelCheckingListings) {
                    this.cancelCheckingListings = false;
                    return resolve();
                }

                if (withDelay) {
                    setTimeout(() => {
                        this.checkBySKU(pricelist[index].sku, pricelist[index]);
                        index++;
                        iteration();
                    }, 200);
                } else {
                    setImmediate(() => {
                        this.checkBySKU(pricelist[index].sku, pricelist[index]);
                        index++;
                        iteration();
                    });
                }
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

    private getDetails(intent: 0 | 1, amountCanTrade: number, entry: Entry, item?: DictItem): string {
        const opt = this.bot.options;
        const buying = intent === 0;
        const key = buying ? 'buy' : 'sell';
        const keyPrice = this.bot.pricelist.getKeyPrice;

        let highValueString = '';

        if (intent === 1) {
            // if item undefined, then skip because it will make your bot crashed.
            if (item) {
                const toJoin: string[] = [];

                const optD = this.bot.options.details.highValue;
                const optR = this.bot.options.detailsExtra;
                const getPaints = this.bot.paints;
                const getStrangeParts = this.bot.strangeParts;

                const hv = item.hv;
                if (hv) {
                    Object.keys(hv).forEach(attachment => {
                        if (attachment === 's' && optD.showSpells) {
                            highValueString += '| 🎃 Spells: ';

                            hv.s.forEach(pSKU => {
                                const name = getKeyByValue(spellsData, pSKU);
                                toJoin.push(name.replace(name, optR.spells[name]));
                            });

                            highValueString += toJoin.join(' + ');
                            toJoin.length = 0;
                        } else {
                            if (
                                hv[attachment] &&
                                (attachment === 'sp'
                                    ? optD.showStrangeParts
                                    : attachment === 'ke'
                                    ? optD.showKillstreaker
                                    : attachment === 'ks'
                                    ? optD.showSheen
                                    : optD.showPainted && opt.normalize.painted.our)
                            ) {
                                if (attachment === 'sp') highValueString += '| 🎰 Parts: ';
                                else if (attachment === 'ke') highValueString += '| 🤩 Killstreaker: ';
                                else if (attachment === 'ks') highValueString += '| ✨ Sheen: ';
                                else if (attachment === 'p') highValueString += '| 🎨 Painted: ';

                                for (const pSKU in hv[attachment]) {
                                    if (!Object.prototype.hasOwnProperty.call(hv[attachment], pSKU)) {
                                        continue;
                                    }

                                    if (attachment === 'sp' && hv[attachment as Attachment][pSKU] === true) {
                                        const name = getAttachmentName(attachment, pSKU, getPaints, getStrangeParts);
                                        toJoin.push(
                                            `${name.replace(
                                                name,
                                                optR.strangeParts[name] ? optR.strangeParts[name] : name
                                            )}`
                                        );
                                    } else {
                                        if (attachment !== 'sp') {
                                            const name = getAttachmentName(
                                                attachment,
                                                pSKU,
                                                getPaints,
                                                getStrangeParts
                                            );
                                            toJoin.push(
                                                `${name.replace(
                                                    name,
                                                    attachment === 'ke'
                                                        ? optR.killstreakers[name]
                                                        : attachment === 'ks'
                                                        ? optR.sheens[name]
                                                        : optR.painted[name as PaintedNames].stringNote
                                                )}`
                                            );
                                        }
                                    }
                                }

                                if (toJoin.length > 0) {
                                    highValueString += toJoin.join(' + ');
                                } else {
                                    highValueString = highValueString.replace(
                                        attachment === 'sp'
                                            ? '| 🎰 Parts: '
                                            : attachment === 'ke'
                                            ? '| 🤩 Killstreaker: '
                                            : attachment === 'ks'
                                            ? '| ✨ Sheen: '
                                            : '| 🎨 Painted: ',
                                        ''
                                    );
                                }
                                toJoin.length = 0;
                            }
                        }
                    });

                    highValueString += highValueString.length > 0 ? ' |' : '';
                }
            }
        }

        const optDs = this.bot.options.details.uses;
        let details: string;

        const replaceDetails = (details: string, entry: Entry, key: 'buy' | 'sell') => {
            const inventory = this.bot.inventoryManager.getInventory;
            return details
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, entry.name)
                .replace(/%max_stock%/g, entry.max === -1 ? '∞' : entry.max.toString())
                .replace(/%current_stock%/g, inventory.getAmount(entry.sku, true).toString())
                .replace(/%amount_trade%/g, amountCanTrade.toString());
        };

        const isCustomBuyNote = entry.note?.buy && intent === 0;
        const isCustomSellNote = entry.note?.sell && intent === 1;
        const isDueling = entry.sku === '241;6' && opt.miscSettings.checkUses.duel;
        const isNoiseMaker = Object.keys(noiseMakers).includes(entry.sku) && opt.miscSettings.checkUses.noiseMaker;

        if (isCustomBuyNote || isCustomSellNote) {
            details = replaceDetails(intent === 0 ? entry.note.buy : entry.note.sell, entry, key);

            details = entry[key].toString().includes('key')
                ? details.replace(/%keyPrice%/g, 'Key rate: ' + keyPrice.toString() + '/key')
                : details.replace(/%keyPrice%/g, '');

            details = isDueling
                ? details.replace(/%uses%/g, optDs.duel ? optDs.duel : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)')
                : isNoiseMaker
                ? details.replace(/%uses%/g, optDs.noiseMaker ? optDs.noiseMaker : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)')
                : details.replace(/%uses%/g, '');
            //
        } else if (isDueling || isNoiseMaker) {
            details = replaceDetails(this.templates[key], entry, key).replace(
                /%uses%/g,
                isDueling
                    ? optDs.duel
                        ? optDs.duel
                        : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟱x 𝗨𝗦𝗘𝗦)'
                    : optDs.noiseMaker
                    ? optDs.noiseMaker
                    : '(𝗢𝗡𝗟𝗬 𝗪𝗜𝗧𝗛 𝟐𝟱x 𝗨𝗦𝗘𝗦)'
            );

            details = entry[key].toString().includes('key')
                ? details.replace(/%keyPrice%/g, 'Key rate: ' + keyPrice.toString() + '/key')
                : details.replace(/%keyPrice%/g, '');
            //
        } else if (entry.name === 'Mann Co. Supply Crate Key' || !entry[key].toString().includes('key')) {
            // this part checks if the item Mann Co. Supply Crate Key or the buying/selling price involve keys.
            details = replaceDetails(this.templates[key], entry, key)
                .replace(/%keyPrice%/g, '')
                .replace(/%uses%/g, '');
            if (entry.name === 'Mann Co. Supply Crate Key' && this.bot.handler.autokeys.isEnabled) {
                details = '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + details;
            }
            //
        } else {
            // else if nothing above, then just use template/in config and replace every parameters.
            details = replaceDetails(this.templates[key], entry, key)
                .replace(/%keyPrice%/g, 'Key rate: ' + keyPrice.toString() + '/key')
                .replace(/%uses%/g, '');
            //
        }

        return details + (highValueString.length > 0 ? ' ' + highValueString : '');
    }
}

type Attachment = 'sp' | 'ke' | 'ks' | 'p';

function getKeyByValue(object: { [key: string]: any }, value: any): string {
    return Object.keys(object).find(key => object[key] === value);
}

function getAttachmentName(attachment: string, pSKU: string, paints: Paints, parts: StrangeParts): string {
    if (attachment === 'sp') return getKeyByValue(parts, pSKU);
    else if (attachment === 'ke') return getKeyByValue(killstreakersData, pSKU);
    else if (attachment === 'ks') return getKeyByValue(sheensData, pSKU);
    else if (attachment === 'p') return getKeyByValue(paints, pSKU);
}
