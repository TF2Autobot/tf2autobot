import callbackQueue from 'callback-queue';
import pluralize from 'pluralize';
import dayjs from 'dayjs';
import Currencies from '@tf2autobot/tf2-currencies';
import * as timersPromises from 'timers/promises';
import Bot from './Bot';
import Pricelist, { Entry, PricesObject } from './Pricelist';
import log from '../lib/logger';
import { exponentialBackoff } from '../lib/helpers';
import { noiseMakers } from '../lib/data';
import { DictItem } from './Inventory';
import { PaintedNames } from './Options';
import ListingManager from '@tf2autobot/bptf-listings';
import getAttachmentName from '../lib/tools/getAttachmentName';
import filterAxiosError from '@tf2autobot/filter-axios-error';

/**
 * used when remove all listings has failed once
 *
 * this gives the system more context to make a decision about how
 * to try to remove all listings
 */
interface RemoveAllListingsParams {
    /** how many remove all tries have occurred? */
    tries?: number;
    /** how many listings did we have last time we tried delete */
    lastListingsLength?: number;
}

export default class Listings {
    private checkingAllListings = false;

    private removingAllListings = false;

    private cancelCheckingListings = false;

    private get isCreateListing(): boolean {
        return this.bot.options.miscSettings.createListings.enable && !this.bot.isHalted;
    }

    private templates: { buy: string; sell: string };

    constructor(private readonly bot: Bot) {
        this.bot = bot;
        this.templates = {
            buy:
                this.bot.options.details.buy ||
                'I am buying your %name% for %price%, I have %current_stock% / %max_stock%.',
            sell: this.bot.options.details.sell || 'I am selling my %name% for %price%, I am selling %amount_trade%.'
        };
    }

    checkByPriceKey({
        priceKey,
        data,
        checkGenerics = false,
        showLogs = false
    }: {
        priceKey: string;
        data?: Entry;
        checkGenerics?: boolean;
        showLogs?: boolean;
    }): void {
        let sku: string | undefined = undefined;
        const isAssetId = Pricelist.isAssetId(priceKey);
        if (isAssetId) {
            const entry = this.bot.pricelist.getPrice({ priceKey, onlyEnabled: false, getGenericPrice: checkGenerics });
            if (entry) {
                sku = entry.sku;
            } else if (data) {
                sku = data.sku;
            }
        } else {
            sku = priceKey;
        }
        if (!this.isCreateListing) {
            return;
        }

        if (showLogs) {
            log.debug(`Checking ${priceKey}...`);
        }

        let doneSomething = false;

        const match =
            data?.enabled === false
                ? null
                : this.bot.pricelist.getPrice({ priceKey, onlyEnabled: true, getGenericPrice: checkGenerics });

        let hasBuyListing = false;
        let hasSellListing = false;

        const invManager = this.bot.inventoryManager;
        const inventory = invManager.getInventory;

        const amountCanBuy = invManager.amountCanTrade({
            priceKey,
            tradeIntent: 'buying',
            getGenericAmount: checkGenerics
        });
        const amountCanSell = invManager.amountCanTrade({
            priceKey,
            tradeIntent: 'selling',
            getGenericAmount: checkGenerics
        });

        const isFilterCantAfford = this.bot.options.pricelist.filterCantAfford.enable; // false by default

        let listings: ListingManager.Listing[];
        if (isAssetId) {
            const listing = this.bot.listingManager.findListing(priceKey);
            if (listing) {
                listings = [listing];
            } else {
                listings = [];
            }
        } else {
            listings = this.bot.listingManager.findListings(sku);
        }
        listings.forEach(listing => {
            // Skip the listing if it belongs to an asset AND we are checking a SKU
            if (
                !isAssetId &&
                this.bot.pricelist.getPrice({
                    priceKey: listing.id.slice('440_'.length),
                    onlyEnabled: true,
                    getGenericPrice: checkGenerics
                })
            ) {
                return;
            }

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

            if (!match || (match.intent !== 2 && match.intent !== listing.intent)) {
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
                const newDetails = this.getDetails(
                    listing.intent,
                    listing.intent === 0 ? amountCanBuy : amountCanSell,
                    match,
                    inventory.getItems[sku]?.filter(item => item.id === listing.id.replace('440_', ''))[0]
                );

                const keyPrice = this.bot.pricelist.getKeyPrice;

                // if listing note don't have any parameters (%price%, %amount_trade%, etc), then we check if there's any changes with currencies
                const isCurrenciesChanged =
                    listing.currencies?.toValue(keyPrice.metal) !==
                    match[listing.intent === 0 ? 'buy' : 'sell']?.toValue(keyPrice.metal);

                const isListingDetailsChanged =
                    listing.details?.replace('[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬]', '') !== newDetails.replace('[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬]', '');

                if (isCurrenciesChanged || isListingDetailsChanged) {
                    if (showLogs) {
                        log.debug(`Listing details don't match, update listing`, {
                            priceKey,
                            intent: listing.intent
                        });
                    }

                    doneSomething = true;

                    const currencies = match[listing.intent === 0 ? 'buy' : 'sell'];

                    const toUpdate = {
                        currencies: currencies,
                        //promoted: listing.intent === 0 ? 0 : match.promoted,
                        details: newDetails
                    };

                    // if (listing.intent === 0) {
                    //     toUpdate['quantity'] = amountCanBuy;
                    // }

                    listing.update(toUpdate);
                    //TODO: make promote, demote
                }
            }
        });

        const matchNew =
            data?.enabled === false
                ? null
                : this.bot.pricelist.getPrice({
                      priceKey: priceKey,
                      onlyEnabled: true,
                      getGenericPrice: checkGenerics
                  });

        if (matchNew && matchNew.enabled === true) {
            let assetids: string[] = [];
            if (isAssetId && null !== inventory.findByAssetid(priceKey)) {
                assetids = [priceKey];
            } else {
                assetids = inventory
                    .findBySKU(priceKey, true)
                    .filter(
                        assetId => this.bot.pricelist.hasPrice({ priceKey: assetId, onlyEnabled: false }) === false
                    );
            }

            const canAffordToBuy = isFilterCantAfford
                ? invManager.isCanAffordToBuy(matchNew.buy, invManager.getInventory)
                : true;

            if (!hasBuyListing && amountCanBuy > 0 && canAffordToBuy) {
                if (showLogs) {
                    log.debug(`We have no buy order and we can buy more items, create buy listing.`);
                }

                doneSomething = true;

                const listing = {
                    time: matchNew.time || dayjs().unix(),
                    intent: 0 as 0 | 1,
                    details: this.getDetails(0, amountCanBuy, matchNew),
                    currencies: matchNew.buy
                };
                if (isAssetId) {
                    listing['id'] = priceKey;
                } else {
                    listing['sku'] = sku;
                }
                this.bot.listingManager.createListing(listing);
            }

            const assetid = assetids[assetids.length - 1];

            if (!hasSellListing && amountCanSell > 0 && assetid) {
                // assetid can be undefined, if any of the following is set to true
                // - options.normalize.festivized.amountIncludeNonFestivized
                // - options.normalize.strangeAsSecondQuality.amountIncludeNonStrange
                // - options.normalize.painted.amountIncludeNonPainted
                // https://github.com/TF2Autobot/tf2autobot/wiki/Configure-your-options.json-file#-items-normalization-settings-

                if (showLogs) {
                    log.debug(`We have no sell order and we can sell items, create sell listing.`);
                }

                doneSomething = true;

                this.bot.listingManager.createListing({
                    time: matchNew.time || dayjs().unix(),
                    id: assetid,
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
                let priceKeys = Object.keys(pricelist);
                if (this.bot.options.pricelist.filterCantAfford.enable) {
                    priceKeys = priceKeys.filter(priceKey => {
                        const amountCanBuy = inventoryManager.amountCanTrade({
                            priceKey: priceKey,
                            tradeIntent: 'buying'
                        });

                        if (
                            (amountCanBuy > 0 &&
                                inventoryManager.isCanAffordToBuy(pricelist[priceKey].buy, inventory)) ||
                            Pricelist.isAssetId(priceKey)
                                ? null === inventory.findByAssetid(priceKey)
                                    ? 0
                                    : 1
                                : inventory.getAmount({
                                      priceKey: priceKey,
                                      includeNonNormalized: false,
                                      tradableOnly: true
                                  }) > 0
                        ) {
                            // if can amountCanBuy is more than 0 and isCanAffordToBuy is true OR amount of item is more than 0
                            // return this entry
                            return true;
                        }

                        // Else ignore
                        return false;
                    });
                }
                priceKeys = priceKeys
                    .sort((a, b) => {
                        return (
                            currentPure.keys -
                            (pricelist[b].buy.keys - pricelist[a].buy.keys) * keyPrice.toValue() +
                            (currentPure.metal - Currencies.toScrap(pricelist[b].buy.metal - pricelist[a].buy.metal))
                        );
                    })
                    .sort((a, b) => {
                        return (
                            (Pricelist.isAssetId(b) ? [inventory.findByAssetid(b)] : inventory.findBySKU(b)).length -
                            (Pricelist.isAssetId(a) ? [inventory.findByAssetid(a)] : inventory.findBySKU(a)).length
                        );
                    });

                log.debug('Checking listings for ' + pluralize('item', priceKeys.length, true) + '...');

                void this.recursiveCheckPricelist(priceKeys, pricelist).asCallback(() => {
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
        priceKeys: string[],
        pricelist: PricesObject,
        withDelay = false,
        time?: number,
        showLogs = false
    ): Promise<void> {
        return new Promise(resolve => {
            let index = 0;

            const iteration = async (): Promise<void> => {
                if (priceKeys.length <= index || this.cancelCheckingListings) {
                    this.cancelCheckingListings = false;
                    return resolve();
                }

                if (withDelay) {
                    this.checkByPriceKey({
                        priceKey: priceKeys[index],
                        data: pricelist[priceKeys[index]],
                        checkGenerics: false,
                        showLogs: showLogs
                    });
                    index++;
                    await timersPromises.setTimeout(time ? time : 200);
                    void iteration();
                } else {
                    setImmediate(() => {
                        this.checkByPriceKey({ priceKey: priceKeys[index], data: pricelist[priceKeys[index]] });
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

    private removeAllListings(retry?: RemoveAllListingsParams): Promise<void> {
        const tries = retry?.tries || 0;
        const lastLength = retry?.lastListingsLength;
        return new Promise((resolve, reject) => {
            this.removingAllListings = true;

            // Clear create queue
            this.bot.listingManager.actions.create = [];

            // Wait for backpack.tf to finish creating / removing listings
            this.waitForListings()
                .then(() => {
                    if (this.bot.listingManager.listings.length === 0) {
                        log.debug('We have no listings');
                        this.removingAllListings = false;
                        return resolve();
                    }

                    if (!retry) {
                        log.debug('Removing all listings...');

                        this.bot.listingManager.deleteAllListings(err => {
                            if (err) {
                                return reject(err);
                            }

                            // The request might fail, if it does, try again
                            return resolve(
                                this.removeAllListings({
                                    tries: tries + 1,
                                    lastListingsLength: this.bot.listingManager.listings.length
                                })
                            );
                        });
                    } else if (retry && lastLength != null && lastLength === this.bot.listingManager.listings.length) {
                        log.debug('Retrying remove all listings with individual removeListings calls');
                        // if this isn't our first try, and seems our delete didn't work, try a different way
                        const listings = this.bot.listingManager.listings.slice();
                        const successListener = () => {
                            log.debug('Remove all listings individual success...');
                            // remove our one time delete handler since we had success
                            this.bot.listingManager.removeListener('deleteListingsError', successListener);
                            return resolve(
                                this.removeAllListings({
                                    tries: tries + 1,
                                    lastListingsLength: this.bot.listingManager.listings.length
                                })
                            );
                        };
                        const errorListener = err => {
                            log.error('Remove all listings individual failed', err);
                            // it was an error, so we don't listen for success anymore
                            this.bot.listingManager.removeListener('deleteListingsSuccessful', successListener);
                            reject(err);
                        };
                        this.bot.listingManager.once('deleteListingsSuccessful', successListener);
                        this.bot.listingManager.once('deleteListingsError', errorListener);
                        this.bot.listingManager.removeListings(...listings);
                    }
                })
                .catch(err => {
                    // if an error occurred, we bypass checking listings and just call delete all listings

                    log.error(
                        'Error getting listings info, force delete all listings. Error details: ',
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                        filterAxiosError(err)
                    );
                    this.bot.listingManager.deleteAllListings(err => {
                        if (err) {
                            // But if failed to delete all listings, blame bptf 😴
                            return reject(err);
                        }

                        return resolve();
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
                this.bot.listingManager.getListings(true, err => {
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

                const optD = opt.details.highValue;
                const cT = optD.customText;
                const cTSpt = optD.customText.separator;
                const cTEnd = optD.customText.ender;

                const optR = opt.detailsExtra;
                const getPaints = this.bot.schema.paints;
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
                                            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                                            optR.strangeParts[name] ? optR.strangeParts[name] : name
                                        )}`
                                    );
                                } else {
                                    if (attachment !== 'sp') {
                                        const name = getAttachmentName(attachment, pSKU, getPaints, getStrangeParts);
                                        toJoin.push(
                                            `${name.replace(
                                                name,
                                                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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

        const optDs = opt.details.uses;
        let details: string;
        const inventory = this.bot.inventoryManager.getInventory;
        const showBoldText = opt.details.showBoldText;
        const isShowBoldOnPrice = showBoldText.onPrice;
        const isShowBoldOnAmount = showBoldText.onAmount;
        const isShowBoldOnCurrentStock = showBoldText.onCurrentStock;
        const isShowBoldOnMaxStock = showBoldText.onMaxStock;
        const style = showBoldText.style;

        const replaceDetails = (details: string, entry: Entry, key: 'buy' | 'sell') => {
            const price = entry[key].toString();
            const maxStock = entry.max === -1 ? '∞' : entry.max.toString();
            const currentStock = inventory
                .getAmount({
                    priceKey: entry.id ?? entry.sku,
                    includeNonNormalized: false,
                    tradableOnly: true
                })
                .toString();
            const amountTrade = amountCanTrade.toString();

            return details
                .replace(/%price%/g, isShowBoldOnPrice ? boldDetails(price, style) : price)
                .replace(/%name%/g, entry.id ?? entry.name)
                .replace(/%easy_copy_paste%/g, this.bot.helper.getEasyCopyPasteStr(entry.id ?? entry.name, key))
                .replace(/%max_stock%/g, isShowBoldOnMaxStock ? boldDetails(maxStock, style) : maxStock)
                .replace(/%current_stock%/g, isShowBoldOnCurrentStock ? boldDetails(currentStock, style) : currentStock)
                .replace(/%amount_trade%/g, isShowBoldOnAmount ? boldDetails(amountTrade, style) : amountTrade);
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
        } else if (entry.sku === '5021;6' || !entry[key].toString().includes('key')) {
            // this part checks if the item Mann Co. Supply Crate Key or the buying/selling price involve keys.
            details = replaceDetails(this.templates[key], entry, key)
                .replace(/%keyPrice%/g, '')
                .replace(/%uses%/g, '');
            if (entry.sku === '5021;6' && this.bot.handler.autokeys.isEnabled && opt.details.showAutokeys) {
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

        const string = details + (highValueString.length > 0 ? ' ' + highValueString : '');

        if (string.length > 200) {
            if (details.length < 200) {
                // if details only < 200 characters, we only use this.
                return details;
            }

            if (!entry.id && details.includes(entry.name)) {
                const regex = new RegExp(entry.name, 'g');
                details = details.replace(regex, entry.sku);

                if (details.length < 200) {
                    // if details < 200 after replacing name with sku, use this.
                    return details;
                }
            }

            // else if still more than 200 characters, we cut to at least 200 characters.
            return details.substring(0, 200);
        }

        return string;
    }
}

type Attachment = 's' | 'sp' | 'ke' | 'ks' | 'p';

function boldDetails(str: string, style: number): string {
    // https://lingojam.com/BoldTextGenerator

    if ([1, 2].includes(style)) {
        // Bold numbers (serif)
        str = str
            .replace(/0/g, '𝟎') // can't use replaceAll yet 😪
            .replace(/1/g, '𝟏')
            .replace(/2/g, '𝟐')
            .replace(/3/g, '𝟑')
            .replace(/4/g, '𝟒')
            .replace(/5/g, '𝟓')
            .replace(/6/g, '𝟔')
            .replace(/7/g, '𝟕')
            .replace(/8/g, '𝟖')
            .replace(/9/g, '𝟗')
            .replace('.', '.')
            .replace(',', ',');

        if (style === 1) {
            // Style 1 - Bold (serif)
            return str.replace('ref', '𝐫𝐞𝐟').replace('keys', '𝐤𝐞𝐲𝐬').replace('key', '𝐤𝐞𝐲');
        }

        // Style 2 - Italic Bold (serif)
        return str.replace('ref', '𝒓𝒆𝒇').replace('keys', '𝒌𝒆𝒚𝒔').replace('key', '𝒌𝒆𝒚');
    }

    // Bold numbers (sans):
    str = str
        .replace(/0/g, '𝟬')
        .replace(/1/g, '𝟭')
        .replace(/2/g, '𝟮')
        .replace(/3/g, '𝟯')
        .replace(/4/g, '𝟰')
        .replace(/5/g, '𝟱')
        .replace(/6/g, '𝟲')
        .replace(/7/g, '𝟳')
        .replace(/8/g, '𝟴')
        .replace(/9/g, '𝟵')
        .replace('.', '.')
        .replace(',', ',');

    if (style === 3) {
        // Style 3 - Bold (sans)
        return str.replace('ref', '𝗿𝗲𝗳').replace('keys', '𝗸𝗲𝘆𝘀').replace('key', '𝗸𝗲𝘆');
    }

    // Style 4 - Italic Bold (sans)
    return str.replace('ref', '𝙧𝙚𝙛').replace('keys', '𝙠𝙚𝙮𝙨').replace('key', '𝙠𝙚𝙮');
}
