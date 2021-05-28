import callbackQueue from 'callback-queue';
import pluralize from 'pluralize';
import request from 'request-retry-dayjs';
import async from 'async';
import dayjs from 'dayjs';
import Currencies from 'tf2-currencies-2';
import sleepasync from 'sleep-async';
import Bot from './Bot';
import { Entry, PricesObject } from './Pricelist';
import { BPTFGetUserInfo, UserSteamID } from './MyHandler/interfaces';
import log from '../lib/logger';
import { exponentialBackoff } from '../lib/helpers';
import { noiseMakers, spellsData, killstreakersData, sheensData } from '../lib/data';
import { DictItem } from './Inventory';
import { PaintedNames } from './Options';
import { Paints, StrangeParts } from 'tf2-schema-2';

export default class Listings {
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

    constructor(private readonly bot: Bot) {
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

        // Autobump is enabled, add pulse listener

        this.bot.listingManager.removeListener('pulse', this.checkFn);
        this.bot.listingManager.on('pulse', this.checkFn);

        // Get account info
        this.checkAccountInfo();
    }

    disableAutorelistOption(): void {
        this.bot.listingManager.removeListener('pulse', this.checkFn);
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
                this.bot.handler.commands.useUpdateOptionsCommand(null, '!config miscSettings.autobump.enable=false');
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

    checkBySKU(sku: string, data?: Entry | null, generics = false, showLogs = false): void {
        if (!this.isCreateListing) {
            return;
        }

        if (showLogs) {
            log.debug(`Checking ${sku}...`);
        }

        let doneSomething = false;

        const match = data?.enabled === false ? null : this.bot.pricelist.getPrice(sku, true, generics);

        let hasBuyListing = false;
        let hasSellListing = false;

        const invManager = this.bot.inventoryManager;
        const inventory = invManager.getInventory;

        const amountCanBuy = invManager.amountCanTrade(sku, true, generics);
        const amountCanSell = invManager.amountCanTrade(sku, false, generics);

        const isFilterCantAfford = this.bot.options.pricelist.filterCantAfford.enable; // false by default

        this.bot.listingManager.findListings(sku).forEach(listing => {
            if (listing.intent === 1 && hasSellListing) {
                if (showLogs) {
                    log.debug('Already have a sell listing, remove the listing.');
                }
                doneSomething = true;
                listing.remove();
                return;
            }

            if (listing.intent === 0) {
                hasBuyListing = true;
            } else if (listing.intent === 1) {
                hasSellListing = true;
            }

            if (match === null || (match.intent !== 2 && match.intent !== listing.intent)) {
                if (showLogs) {
                    log.debug('We are not trading the item, remove the listing.');
                }
                doneSomething = true;
                listing.remove();
            } else if ((listing.intent === 0 && amountCanBuy <= 0) || (listing.intent === 1 && amountCanSell <= 0)) {
                if (showLogs) {
                    log.debug(`We are not ${listing.intent === 0 ? 'buying' : 'selling'} more, remove the listing.`);
                }
                doneSomething = true;
                listing.remove();
            } else if (
                match !== null &&
                listing.intent === 0 &&
                !invManager.isCanAffordToBuy(match.buy, invManager.getInventory) &&
                isFilterCantAfford
            ) {
                if (showLogs) {
                    log.debug(`we can't afford to buy, remove the listing.`);
                }
                doneSomething = true;
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

                    if (listing.details?.replace('[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬]', '') !== newDetails.replace('[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬]', '')) {
                        if (showLogs) {
                            log.debug(`Listing details don't match, updated listing`, {
                                sku: sku,
                                intent: listing.intent
                            });
                        }

                        doneSomething = true;

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

        const matchNew = data?.enabled === false ? null : this.bot.pricelist.getPrice(sku, true, generics);

        if (matchNew !== null && matchNew.enabled === true) {
            const assetids = inventory.findBySKU(sku, true);

            const canAffordToBuy = isFilterCantAfford
                ? invManager.isCanAffordToBuy(matchNew.buy, invManager.getInventory)
                : true;

            if (!hasBuyListing && amountCanBuy > 0 && canAffordToBuy && !/;[p][0-9]+/.test(sku)) {
                if (showLogs) {
                    log.debug(`We have no buy order and we can buy more items, create buy listing.`);
                }

                doneSomething = true;

                this.bot.listingManager.createListing({
                    time: matchNew.time || dayjs().unix(),
                    sku: sku,
                    intent: 0,
                    details: this.getDetails(0, amountCanBuy, matchNew),
                    currencies: matchNew.buy
                });
            }

            if (!hasSellListing && amountCanSell > 0) {
                if (showLogs) {
                    log.debug(`We have no sell order and we can sell items, create sell listing.`);
                }

                doneSomething = true;

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

        if (showLogs && !doneSomething) {
            log.debug('Done check, nothing changed');
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

                const pricelist = this.bot.pricelist.getPrices;
                let skus = Object.keys(pricelist);
                if (this.bot.options.pricelist.filterCantAfford.enable) {
                    skus = skus.filter(sku => {
                        const amountCanBuy = inventoryManager.amountCanTrade(sku, true);

                        if (
                            (amountCanBuy > 0 && inventoryManager.isCanAffordToBuy(pricelist[sku].buy, inventory)) ||
                            inventory.getAmount(sku, false, true) > 0
                        ) {
                            // if can amountCanBuy is more than 0 and isCanAffordToBuy is true OR amount of item is more than 0
                            // return this entry
                            return true;
                        }

                        // Else ignore
                        return false;
                    });
                }
                skus = skus
                    .sort((a, b) => {
                        return (
                            currentPure.keys -
                            (pricelist[b].buy.keys - pricelist[a].buy.keys) * keyPrice.toValue() +
                            (currentPure.metal - Currencies.toScrap(pricelist[b].buy.metal - pricelist[a].buy.metal))
                        );
                    })
                    .sort((a, b) => {
                        return inventory.findBySKU(b).length - inventory.findBySKU(a).length;
                    });

                log.debug('Checking listings for ' + pluralize('item', skus.length, true) + '...');

                void this.recursiveCheckPricelist(skus, pricelist).asCallback(() => {
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

    recursiveCheckPricelist(
        skus: string[],
        pricelist: PricesObject,
        withDelay = false,
        time?: number,
        showLogs = false
    ): Promise<void> {
        return new Promise(resolve => {
            let index = 0;

            const iteration = async (): Promise<void> => {
                if (skus.length <= index || this.cancelCheckingListings) {
                    this.cancelCheckingListings = false;
                    return resolve();
                }

                if (withDelay) {
                    this.checkBySKU(skus[index], pricelist[skus[index]], false, showLogs);
                    index++;
                    await sleepasync().Promise.sleep(time ? time : 200);
                    void iteration();
                } else {
                    setImmediate(() => {
                        this.checkBySKU(skus[index], pricelist[skus[index]]);
                        index++;
                        void iteration();
                    });
                }
            };

            void iteration();
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
                const cT = optD.customText;
                const cTSpt = optD.customText.separator;
                const cTEnd = optD.customText.ender;

                const optR = this.bot.options.detailsExtra;
                const getPaints = this.bot.paints;
                const getStrangeParts = this.bot.strangeParts;

                const hv = item.hv;
                if (hv) {
                    Object.keys(hv).forEach(attachment => {
                        if (
                            hv[attachment] &&
                            (attachment === 's'
                                ? optD.showSpells
                                : attachment === 'sp'
                                ? optD.showStrangeParts
                                : attachment === 'ke'
                                ? optD.showKillstreaker
                                : attachment === 'ks'
                                ? optD.showSheen
                                : optD.showPainted && opt.normalize.painted.our)
                        ) {
                            if (attachment === 's') highValueString += `${cTSpt}${cT.spells} `;
                            else if (attachment === 'sp') highValueString += `${cTSpt}${cT.strangeParts} `;
                            else if (attachment === 'ke') highValueString += `${cTSpt}${cT.killstreaker} `;
                            else if (attachment === 'ks') highValueString += `${cTSpt}${cT.sheen} `;
                            else if (attachment === 'p') highValueString += `${cTSpt}${cT.painted} `;

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
                                        const name = getAttachmentName(attachment, pSKU, getPaints, getStrangeParts);
                                        toJoin.push(
                                            `${name.replace(
                                                name,
                                                attachment === 's'
                                                    ? optR.spells[name]
                                                    : attachment === 'ke'
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
                                    attachment === 's'
                                        ? `${cTSpt}${cT.spells} `
                                        : attachment === 'sp'
                                        ? `${cTSpt}${cT.strangeParts} `
                                        : attachment === 'ke'
                                        ? `${cTSpt}${cT.killstreaker} `
                                        : attachment === 'ks'
                                        ? `${cTSpt}${cT.sheen} `
                                        : `${cTSpt}${cT.painted} `,
                                    ''
                                );
                            }
                            toJoin.length = 0;
                        }
                    });

                    highValueString += highValueString.length > 0 ? cTEnd : '';
                }
            }
        }

        const optDs = this.bot.options.details.uses;
        let details: string;

        const replaceDetails = (details: string, entry: Entry, key: 'buy' | 'sell') => {
            const inventory = this.bot.inventoryManager.getInventory;
            const itemName = entry.name;
            // if the item name takes more than 40 characters, we will use sku
            const useSkuOrName = itemName.length > 40 ? entry.sku : itemName;
            return details
                .replace(/%price%/g, entry[key].toString())
                .replace(/%name%/g, useSkuOrName)
                .replace(/%max_stock%/g, entry.max === -1 ? '∞' : entry.max.toString())
                .replace(/%current_stock%/g, inventory.getAmount(entry.sku, false, true).toString())
                .replace(/%amount_trade%/g, amountCanTrade.toString());
        };

        const isCustomBuyNote = entry.note?.buy && intent === 0;
        const isCustomSellNote = entry.note?.sell && intent === 1;
        const isDueling = entry.sku === '241;6' && opt.miscSettings.checkUses.duel;
        const isNoiseMaker = noiseMakers.has(entry.sku) && opt.miscSettings.checkUses.noiseMaker;

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

type Attachment = 's' | 'sp' | 'ke' | 'ks' | 'p';

function getKeyByValue(object: { [key: string]: any }, value: any): string {
    return Object.keys(object).find(key => object[key] === value);
}

function getAttachmentName(attachment: string, pSKU: string, paints: Paints, parts: StrangeParts): string {
    if (attachment === 's') return getKeyByValue(spellsData, pSKU);
    else if (attachment === 'sp') return getKeyByValue(parts, pSKU);
    else if (attachment === 'ke') return getKeyByValue(killstreakersData, pSKU);
    else if (attachment === 'ks') return getKeyByValue(sheensData, pSKU);
    else if (attachment === 'p') return getKeyByValue(paints, pSKU);
}
