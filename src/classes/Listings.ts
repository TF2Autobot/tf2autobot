import callbackQueue from 'callback-queue';
import pluralize from 'pluralize';
import dayjs from 'dayjs';
import Currencies from '@tf2autobot/tf2-currencies';
import * as timersPromises from 'timers/promises';
import Bot from './Bot';
import { Entry, PricesObject } from './Pricelist';
import log from '../lib/logger';
import { exponentialBackoff } from '../lib/helpers';
import { noiseMakers, spellsData, killstreakersData, sheensData } from '../lib/data';
import { DictItem } from './Inventory';
import { PaintedNames } from './Options';
import { Paints, StrangeParts } from '@tf2autobot/tf2-schema';

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
                            sku: sku,
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

        const matchNew = data?.enabled === false ? null : this.bot.pricelist.getPrice(sku, true, generics);

        if (matchNew !== null && matchNew.enabled === true) {
            const assetids = inventory.findBySKU(sku, true);

            const canAffordToBuy = isFilterCantAfford
                ? invManager.isCanAffordToBuy(matchNew.buy, invManager.getInventory)
                : true;

            if (!hasBuyListing && amountCanBuy > 0 && canAffordToBuy) {
                if (showLogs) {
                    log.debug(`We have no buy order and we can buy more items, create buy listing.`);
                }

                doneSomething = true;

                this.bot.listingManager.createListing({
                    time: matchNew.time || dayjs().unix(),
                    sku: sku,
                    intent: 0,
                    // quantity: amountCanBuy,
                    details: this.getDetails(0, amountCanBuy, matchNew),
                    currencies: matchNew.buy
                });
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

                void this.recursiveCheckPricelist(skus, pricelist).finally(() => {
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
                    await timersPromises.setTimeout(time ? time : 200);
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

            void this.removeAllListings().finally(next);
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

                this.bot.listingManager.deleteAllListings(err => {
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
            const currentStock = inventory.getAmount(entry.sku, false, true).toString();
            const amountTrade = amountCanTrade.toString();

            return details
                .replace(/%price%/g, isShowBoldOnPrice ? boldDetails(price, style) : price)
                .replace(/%name%/g, entry.name)
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

        const string = details + (highValueString.length > 0 ? ' ' + highValueString : '');

        if (string.length > 200) {
            if (details.length < 200) {
                // if details only < 200 characters, we only use this.
                return details;
            }

            if (details.includes(entry.name)) {
                details = details.replace(entry.name, entry.sku);

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

function getKeyByValue(object: { [key: string]: any }, value: any): string {
    return Object.keys(object).find(key => object[key] === value);
}

function getAttachmentName(attachment: string, pSKU: string, paints: Paints, parts: StrangeParts): string {
    if (attachment === 's') return getKeyByValue(spellsData, pSKU);
    else if (attachment === 'sp') return getKeyByValue(parts, pSKU);
    else if (attachment === 'ke') return getKeyByValue(killstreakersData, pSKU);
    else if (attachment === 'ks') return getKeyByValue(sheensData, pSKU);
    else if (attachment === 'p') return getKeyByValue(paints, parseInt(pSKU.replace('p', '')));
}

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
