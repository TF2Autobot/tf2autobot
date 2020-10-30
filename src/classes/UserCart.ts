import pluralize from 'pluralize';
import SKU from 'tf2-sku';
import Currencies from 'tf2-currencies';
import async from 'async';

import Cart from './Cart';
import Inventory from './Inventory';
import TF2Inventory from './TF2Inventory';
import MyHandler from './MyHandler';
import { EconItem } from 'steam-tradeoffer-manager';
import { CurrencyObject, CurrencyObjectWithWeapons, Currency } from '../types/TeamFortress2';
import { UnknownDictionary } from '../types/common';

import log from '../lib/logger';

export = UserCart;

class UserCart extends Cart {
    /**
     * If we should give keys and metal or only metal (should be able to change this on checkout)
     */
    private useKeys = true;

    protected async preSendOffer(): Promise<void> {
        const [banned, escrow] = await Promise.all([
            this.bot.checkBanned(this.partner),
            this.bot.checkEscrow(this.offer)
        ]);

        if (banned) {
            return Promise.reject('you are banned in one or more trading communities');
        }

        if (escrow) {
            return Promise.reject('trade would be held');
        }

        // TODO: Check for dupes

        const isDupedCheckEnabled = (this.bot.handler as MyHandler).hasDupeCheckEnabled();
        const keyPrice = this.bot.pricelist.getKeyPrice();

        let theirItemsValue: number;
        if (process.env.DISABLE_CRAFTWEAPON_AS_CURRENCY !== 'true') {
            theirItemsValue = this.getTheirCurrenciesWithWeapons().toValue(keyPrice.metal);
        } else {
            theirItemsValue = this.getTheirCurrencies().toValue(keyPrice.metal);
        }

        const minimumKeysDupeCheck = (this.bot.handler as MyHandler).getMinimumKeysDupeCheck() * keyPrice.toValue();

        if (isDupedCheckEnabled && theirItemsValue > minimumKeysDupeCheck) {
            const assetidsToCheck = this.offer.data('_dupeCheck');
            this.offer.data('_dupeCheck', undefined);

            const inventory = new TF2Inventory(this.partner, this.bot.manager);

            const requests = assetidsToCheck.map(assetid => {
                return (callback: (err: Error | null, result: boolean | null) => void): void => {
                    log.debug('Dupe checking ' + assetid + '...');
                    Promise.resolve(inventory.isDuped(assetid)).asCallback(function(err, result) {
                        log.debug('Dupe check for ' + assetid + ' done');
                        callback(err, result);
                    });
                };
            });

            try {
                const result: (boolean | null)[] = await Promise.fromCallback(function(callback) {
                    async.series(requests, callback);
                });

                log.debug('Got result from dupe checks on ' + assetidsToCheck.join(', '), { result: result });

                for (let i = 0; i < result.length; i++) {
                    if (result[i] === true) {
                        // Found duped item
                        return Promise.reject('offer contains duped items');
                    } else if (result[i] === null) {
                        // Could not determine if the item was duped, make the offer be pending for review
                        return Promise.reject('failed to check for duped items, try sending an offer instead');
                    }
                }
            } catch (err) {
                return Promise.reject('failed to check for duped items, try sending an offer instead');
            }
        }
    }

    canUseKeys(): boolean {
        if (this.getOurCount('5021;6') !== 0 || this.getTheirCount('5021;6') !== 0) {
            // The trade contains keys, don't use keys for currencies
            return false;
        }

        return this.useKeys;
    }

    /**
     * Figure our who the buyer is and get relative currencies
     */
    getCurrencies(): { isBuyer: boolean; currencies: Currencies } {
        const ourCurrencies = this.getOurCurrencies();
        const theirCurrencies = this.getTheirCurrencies();

        const keyPrice = this.bot.pricelist.getKeyPrice();

        const ourValue = ourCurrencies.toValue(keyPrice.metal);
        const theirValue = theirCurrencies.toValue(keyPrice.metal);

        const useKeys = this.canUseKeys();

        if (ourValue >= theirValue) {
            // Our value is greater, we are selling
            return {
                isBuyer: false,
                currencies: Currencies.toCurrencies(ourValue - theirValue, useKeys ? keyPrice.metal : undefined)
            };
        } else {
            // Our value is smaller, we are buying
            return {
                isBuyer: true,
                currencies: Currencies.toCurrencies(theirValue - ourValue, useKeys ? keyPrice.metal : undefined)
            };
        }
    }

    getOurCurrencies(): Currencies {
        const keyPrice = this.bot.pricelist.getKeyPrice();

        let value = 0;

        // Go through our items
        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            const match = this.bot.pricelist.getPrice(sku, true);

            if (match === null) {
                // Ignore items that are no longer in the pricelist
                continue;
            }

            value += match.sell.toValue(keyPrice.metal) * this.our[sku];
        }

        return Currencies.toCurrencies(value, this.canUseKeys() ? keyPrice.metal : undefined);
    }

    getTheirCurrencies(): Currencies {
        const keyPrice = this.bot.pricelist.getKeyPrice();

        let value = 0;

        // Go through our items
        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            const match = this.bot.pricelist.getPrice(sku, true);

            if (match === null) {
                // Ignore items that are no longer in the pricelist
                continue;
            }

            value += match.buy.toValue(keyPrice.metal) * this.their[sku];
        }

        return Currencies.toCurrencies(value, this.canUseKeys() ? keyPrice.metal : undefined);
    }

    private getRequired(
        buyerCurrencies: CurrencyObject,
        price: Currencies,
        useKeys: boolean
    ): { currencies: CurrencyObject; change: number } {
        log.debug('Getting required currencies');

        const keyPrice = this.bot.pricelist.getKeyPrice();

        const value = price.toValue(useKeys ? keyPrice.metal : undefined);

        const currencyValues = {
            '5021;6': useKeys ? keyPrice.toValue() : -1,
            '5002;6': 9,
            '5001;6': 3,
            '5000;6': 1
        };

        log.debug('Currency values', currencyValues);

        const skus = Object.keys(currencyValues);

        let remaining = value;

        let hasReversed = false;
        let reverse = false;
        let index = 0;

        const pickedCurrencies: CurrencyObject = {
            '5021;6': 0,
            '5002;6': 0,
            '5001;6': 0,
            '5000;6': 0
        };

        /* eslint-disable-next-line no-constant-condition */
        while (true) {
            const key = skus[index];
            // Start at highest currency and check if we should pick that

            // Amount to pick of the currency
            let amount = remaining / currencyValues[key];
            if (amount > buyerCurrencies[key]) {
                // We need more than we have, choose what we have
                amount = buyerCurrencies[key];
            }

            if (index === skus.length - 1) {
                // If we are at the end of the list and have a postive remaining amount,
                // then we need to loop the other way and pick the value that will make the remaining 0 or negative

                if (hasReversed) {
                    // We hit the end the second time, break out of the loop
                    break;
                }

                reverse = true;
            }

            const currAmount = pickedCurrencies[key] || 0;

            if (reverse && amount > 0) {
                // We are reversing the array and found an item that we need
                if (currAmount + Math.ceil(amount) > buyerCurrencies[key]) {
                    // Amount is more than the limit, set amount to the limit
                    amount = buyerCurrencies[key] - currAmount;
                } else {
                    amount = Math.ceil(amount);
                }
            }

            if (amount >= 1) {
                // If the amount is greater than or equal to 1, then I need to pick it
                pickedCurrencies[key] = currAmount + Math.floor(amount);
                // Remove value from remaining
                remaining -= Math.floor(amount) * currencyValues[key];
            }

            log.debug('Iteration', {
                index: index,
                key: key,
                amount: amount,
                remaining: remaining,
                reverse: reverse,
                hasReversed: hasReversed,
                picked: pickedCurrencies
            });

            if (remaining === 0) {
                // Picked the exact amount, stop
                break;
            }

            if (remaining < 0) {
                // We owe them money, break out of the loop
                break;
            }

            if (index === 0 && reverse) {
                // We were reversing and then reached start of the list, say that we have reversed and go back the other way
                hasReversed = true;
                reverse = false;
            }

            index += reverse ? -1 : 1;
        }

        log.debug('Done picking currencies', { remaining: remaining, picked: pickedCurrencies });

        if (remaining < 0) {
            log.debug('Picked too much value, removing...');

            // Removes unnessesary items
            for (let i = 0; i < skus.length; i++) {
                const sku = skus[i];

                if (pickedCurrencies[sku] === undefined) {
                    continue;
                }

                let amount = Math.floor(Math.abs(remaining) / currencyValues[sku]);
                if (pickedCurrencies[sku] < amount) {
                    amount = pickedCurrencies[sku];
                }

                if (amount >= 1) {
                    remaining += amount * currencyValues[sku];
                    pickedCurrencies[sku] -= amount;
                }

                log.debug('Iteration', { sku: sku, amount: amount, remaining: remaining, picked: pickedCurrencies });
            }
        }

        log.debug('Done constructing offer', { picked: pickedCurrencies, change: remaining });

        return {
            currencies: pickedCurrencies,
            change: remaining
        };
    }

    summarizeOur(): string[] {
        const summary = super.summarizeOur();

        const { isBuyer } = this.getCurrencies();

        const ourDict = this.offer.data('dict').our;
        const scrap = ourDict['5000;6'] || 0;
        const reclaimed = ourDict['5001;6'] || 0;
        const refined = ourDict['5002;6'] || 0;

        if (isBuyer) {
            const keys = this.canUseKeys() ? ourDict['5021;6'] || 0 : 0;

            const currencies = new Currencies({
                keys: keys,
                metal: Currencies.toRefined(scrap + reclaimed * 3 + refined * 9)
            });

            summary.push(currencies.toString());
        } else if (scrap + reclaimed + refined !== 0) {
            const currencies = new Currencies({
                keys: 0,
                metal: Currencies.toRefined(scrap + reclaimed * 3 + refined * 9)
            });

            summary.push(currencies.toString());
        }

        return summary;
    }

    summarizeTheir(): string[] {
        const summary = super.summarizeTheir();

        const { isBuyer } = this.getCurrencies();

        const theirDict = this.offer.data('dict').their;
        const scrap = theirDict['5000;6'] || 0;
        const reclaimed = theirDict['5001;6'] || 0;
        const refined = theirDict['5002;6'] || 0;

        if (!isBuyer) {
            const keys = this.canUseKeys() ? theirDict['5021;6'] || 0 : 0;

            const currencies = new Currencies({
                keys: keys,
                metal: Currencies.toRefined(scrap + reclaimed * 3 + refined * 9)
            });

            summary.push(currencies.toString());
        } else if (scrap + reclaimed + refined !== 0) {
            const currencies = new Currencies({
                keys: 0,
                metal: Currencies.toRefined(scrap + reclaimed * 3 + refined * 9)
            });

            summary.push(currencies.toString());
        }

        return summary;
    }

    async constructOffer(): Promise<string> {
        if (this.isEmpty()) {
            return Promise.reject('cart is empty');
        }

        const offer = this.bot.manager.createOffer(this.partner);

        const alteredMessages: string[] = [];

        // Add our items
        const ourInventory = this.bot.inventoryManager.getInventory();

        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            let alteredMessage: string;

            let amount = this.getOurCount(sku);
            const ourAssetids = ourInventory.findBySKU(sku, true);

            if (amount > ourAssetids.length) {
                amount = ourAssetids.length;

                // Remove the item from the cart
                this.removeOurItem(sku, Infinity);

                if (ourAssetids.length === 0) {
                    alteredMessage =
                        "I don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false));
                } else {
                    alteredMessage =
                        'I only have ' +
                        pluralize(this.bot.schema.getName(SKU.fromString(sku), false), ourAssetids.length, true);

                    // Add the max amount to the cart
                    this.addOurItem(sku, amount);
                }
            }

            const amountCanTrade = this.bot.inventoryManager.amountCanTrade(sku, false);

            if (amount > amountCanTrade) {
                this.removeOurItem(sku, Infinity);
                if (amountCanTrade === 0) {
                    alteredMessage = "I can't sell more " + this.bot.schema.getName(SKU.fromString(sku), false);
                } else {
                    amount = amountCanTrade;
                    alteredMessage =
                        'I can only sell ' +
                        amountCanTrade +
                        ' more ' +
                        this.bot.schema.getName(SKU.fromString(sku), false);

                    this.addOurItem(sku, amount);
                }
            }

            if (alteredMessage) {
                alteredMessages.push(alteredMessage);
            }
        }

        // Load their inventory

        const theirInventory = new Inventory(this.partner, this.bot.manager, this.bot.schema);
        let fetched: EconItem[];

        try {
            await theirInventory.fetch();
            fetched = await theirInventory.fetchWithReturn();
        } catch (err) {
            return Promise.reject('Failed to load inventories (Steam might be down)');
        }

        // Add their items

        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            if (
                process.env.DISABLE_CHECK_USES_DUELING_MINI_GAME === 'false' ||
                process.env.DISABLE_CHECK_USES_NOISE_MAKER === 'false'
            ) {
                let hasNot5Uses = false;
                let hasNot25Uses = false;
                const noiseMakerSKU = (this.bot.handler as MyHandler).noiseMakerSKUs();

                if (sku === '241;6' || noiseMakerSKU.includes(sku)) {
                    fetched.forEach(item => {
                        const isDuelingMiniGame = item.market_hash_name === 'Dueling Mini-Game';
                        const isNoiseMaker = (this.bot.handler as MyHandler).noiseMakerNames().some(name => {
                            return item.market_hash_name.includes(name);
                        });

                        if (isDuelingMiniGame && process.env.DISABLE_CHECK_USES_DUELING_MINI_GAME === 'false') {
                            for (let i = 0; i < item.descriptions.length; i++) {
                                const descriptionValue = item.descriptions[i].value;
                                const descriptionColor = item.descriptions[i].color;

                                if (
                                    !descriptionValue.includes('This is a limited use item. Uses: 5') &&
                                    descriptionColor === '00a000'
                                ) {
                                    hasNot5Uses = true;
                                    offer.log('info', 'contains Dueling Mini-Game that is not 5 uses, declining...');
                                    break;
                                }
                            }
                        } else if (isNoiseMaker && process.env.DISABLE_CHECK_USES_NOISE_MAKER === 'false') {
                            for (let i = 0; i < item.descriptions.length; i++) {
                                const descriptionValue = item.descriptions[i].value;
                                const descriptionColor = item.descriptions[i].color;

                                if (
                                    !descriptionValue.includes('This is a limited use item. Uses: 25') &&
                                    descriptionColor === '00a000'
                                ) {
                                    hasNot25Uses = true;
                                    offer.log('info', `${item.market_hash_name} (${item.assetid}) is not 25 uses.`);
                                    break;
                                }
                            }
                        }
                    });
                }

                if (hasNot5Uses) {
                    return Promise.reject(
                        'One of your Dueling Mini-Game is not 5 Uses. Please make sure you only have 5 Uses in your inventory or send me an offer with the one that has 5 Uses instead'
                    );
                }

                if (hasNot25Uses) {
                    return Promise.reject(
                        'One of your Noise Maker in your inventory is not 25 Uses. Please make sure you only have 25 Uses in your inventory or send me an offer with the one that has 25 Uses instead'
                    );
                }
            }

            const highValuedTheir: {
                skus: string[];
                nameWithSpellsOrParts: string[];
            } = {
                skus: [],
                nameWithSpellsOrParts: []
            };

            const isEnabledDiscordWebhook =
                process.env.DISABLE_DISCORD_WEBHOOK_TRADE_SUMMARY === 'false' &&
                process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_URL;

            fetched.forEach(item => {
                let hasSpelled = false;
                const spellNames: string[] = [];

                let hasStrangeParts = false;
                const strangeParts: string[] = [];

                const itemSKU = item.getSKU(this.bot.schema);

                if (sku === itemSKU) {
                    for (let i = 0; i < item.descriptions.length; i++) {
                        const spell = item.descriptions[i].value;
                        const parts = item.descriptions[i].value
                            .replace('(', '')
                            .replace(/: \d+\)/g, '')
                            .trim();
                        const color = item.descriptions[i].color;

                        if (
                            spell.startsWith('Halloween:') &&
                            spell.endsWith('(spell only active during event)') &&
                            color === '7ea9d1'
                        ) {
                            hasSpelled = true;
                            const spellName = spell.substring(10, spell.length - 32).trim();
                            spellNames.push(spellName);
                        } else if (
                            (parts === 'Kills' || parts === 'Assists'
                                ? item.type.includes('Strange') && item.type.includes('Points Scored')
                                : (this.bot.handler as MyHandler).strangeParts().includes(parts)) &&
                            color === '756b5e'
                        ) {
                            hasStrangeParts = true;
                            const strangePartName = parts;
                            strangeParts.push(strangePartName);
                        }
                    }
                    if (hasSpelled || hasStrangeParts) {
                        const itemSKU = item.getSKU(this.bot.schema);
                        highValuedTheir.skus.push(item.getSKU(this.bot.schema));

                        const itemObj = SKU.fromString(itemSKU);

                        // If item is an Unusual, then get itemName from schema.
                        const itemName =
                            itemObj.quality === 5 ? this.bot.schema.getName(itemObj, false) : item.market_hash_name;

                        let spellOrParts = '';

                        if (hasSpelled) {
                            spellOrParts += '\n🎃 Spells: ' + spellNames.join(' + ');
                        }

                        if (hasStrangeParts) {
                            spellOrParts += '\n🎰 Parts: ' + strangeParts.join(' + ');
                        }

                        log.debug('info', `${itemName} (${item.assetid})${spellOrParts}`);

                        if (isEnabledDiscordWebhook) {
                            highValuedTheir.nameWithSpellsOrParts.push(
                                `[${itemName}](https://backpack.tf/item/${item.assetid})${spellOrParts}`
                            );
                        } else {
                            highValuedTheir.nameWithSpellsOrParts.push(`${itemName} (${item.assetid})${spellOrParts}`);
                        }
                    }
                }
            });

            offer.data('highValue', highValuedTheir);

            let alteredMessage: string;

            let amount = this.getTheirCount(sku);
            const theirAssetids = theirInventory.findBySKU(sku, true);

            if (amount > theirAssetids.length) {
                // Remove the item from the cart
                this.removeTheirItem(sku, Infinity);

                if (theirAssetids.length === 0) {
                    alteredMessage =
                        "you don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false));
                } else {
                    amount = theirAssetids.length;
                    alteredMessage =
                        'you only have ' +
                        pluralize(this.bot.schema.getName(SKU.fromString(sku), false), theirAssetids.length, true);

                    // Add the max amount to the cart
                    this.addTheirItem(sku, amount);
                }
            }

            const amountCanTrade = this.bot.inventoryManager.amountCanTrade(sku, true);

            if (amount > amountCanTrade) {
                this.removeTheirItem(sku, Infinity);
                if (amountCanTrade === 0) {
                    alteredMessage =
                        "I can't buy more " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false));
                } else {
                    amount = amountCanTrade;
                    alteredMessage =
                        'I can only buy ' +
                        amountCanTrade +
                        ' more ' +
                        pluralize(this.bot.schema.getName(SKU.fromString(sku), false), amountCanTrade);

                    this.addTheirItem(sku, amount);
                }
            }

            if (alteredMessage) {
                alteredMessages.push(alteredMessage);
            }
        }

        if (this.isEmpty()) {
            return Promise.reject(alteredMessages.join(', '));
        }

        const itemsDict: {
            our: UnknownDictionary<number>;
            their: UnknownDictionary<number>;
        } = {
            our: Object.assign({}, this.our),
            their: Object.assign({}, this.their)
        };

        // Done checking if buyer and seller has the items and if the bot wants to buy / sell more

        // Add values to the offer

        // Figure out who the buyer is and what they are offering
        const { isBuyer, currencies } = this.getCurrencies();

        // We now know who the buyer is, now get their inventory
        const buyerInventory = isBuyer ? this.bot.inventoryManager.getInventory() : theirInventory;
        const pureStock = (this.bot.handler as MyHandler).pureStock();

        if (this.bot.inventoryManager.amountCanAfford(this.canUseKeys(), currencies, buyerInventory) < 1) {
            // Buyer can't afford the items
            return Promise.reject(
                (isBuyer ? 'I' : 'You') +
                    " don't have enough pure for this trade." +
                    (isBuyer ? '\n💰 Current pure stock: ' + pureStock.join(', ').toString() : '')
            );
        }

        const keyPrice = this.bot.pricelist.getKeyPrice();

        const ourItemsValue = this.getOurCurrencies().toValue(keyPrice.metal);
        const theirItemsValue = this.getTheirCurrencies().toValue(keyPrice.metal);

        // Create exchange object with our and their items values
        const exchange = {
            our: { value: ourItemsValue, keys: 0, scrap: ourItemsValue },
            their: { value: theirItemsValue, keys: 0, scrap: theirItemsValue }
        };

        // Figure out what pure to pick from the buyer, and if change is needed

        const buyerCurrenciesWithAssetids = buyerInventory.getCurrencies();

        const buyerCurrenciesCount = {
            '5021;6': buyerCurrenciesWithAssetids['5021;6'].length,
            '5002;6': buyerCurrenciesWithAssetids['5002;6'].length,
            '5001;6': buyerCurrenciesWithAssetids['5001;6'].length,
            '5000;6': buyerCurrenciesWithAssetids['5000;6'].length
        };

        const required = this.getRequired(buyerCurrenciesCount, currencies, this.canUseKeys());

        // Add the value that the buyer pays to the exchange
        exchange[isBuyer ? 'our' : 'their'].value += currencies.toValue(keyPrice.metal);
        exchange[isBuyer ? 'our' : 'their'].keys += required.currencies['5021;6'];
        exchange[isBuyer ? 'our' : 'their'].scrap +=
            required.currencies['5002;6'] * 9 + required.currencies['5001;6'] * 3 + required.currencies['5000;6'];

        // Add items to offer

        // Add our items
        for (const sku in this.our) {
            const amount = this.our[sku];
            const assetids = ourInventory.findBySKU(sku, true);

            let missing = amount;

            for (let i = 0; i < assetids.length; i++) {
                const isAdded = offer.addMyItem({
                    appid: 440,
                    contextid: '2',
                    assetid: assetids[i]
                });

                if (isAdded) {
                    // The item was added to the offer
                    missing--;
                    if (missing === 0) {
                        // We added all the items
                        break;
                    }
                }
            }

            if (missing !== 0) {
                log.warn('Failed to create offer because missing our items', {
                    sku: sku,
                    required: amount,
                    missing: missing
                });

                return Promise.reject('Something went wrong while constructing the offer');
            }
        }

        const assetidsToCheck: string[] = [];

        // Add their items
        for (const sku in this.their) {
            const amount = this.their[sku];
            const assetids = theirInventory.findBySKU(sku, true);

            const match = this.bot.pricelist.getPrice(sku, true);

            const item = SKU.fromString(sku);

            const addToDupeCheckList =
                item.effect !== null &&
                match.buy.toValue(keyPrice.metal) >
                    (this.bot.handler as MyHandler).getMinimumKeysDupeCheck() * keyPrice.toValue();

            let missing = amount;

            for (let i = 0; i < assetids.length; i++) {
                const isAdded = offer.addTheirItem({
                    appid: 440,
                    contextid: '2',
                    assetid: assetids[i]
                });

                if (isAdded) {
                    missing--;

                    if (addToDupeCheckList) {
                        assetidsToCheck.push(assetids[i]);
                    }

                    if (missing === 0) {
                        break;
                    }
                }
            }

            if (missing !== 0) {
                log.warn('Failed to create offer because missing their items', {
                    sku: sku,
                    required: amount,
                    missing: missing
                });

                return Promise.reject('Something went wrong while constructing the offer');
            }
        }

        const sellerInventory = isBuyer ? theirInventory : ourInventory;

        if (required.change !== 0) {
            let change = Math.abs(required.change);

            exchange[isBuyer ? 'their' : 'our'].value += change;
            exchange[isBuyer ? 'their' : 'our'].scrap += change;

            const currencies = sellerInventory.getCurrencies();
            // We won't use keys when giving change
            delete currencies['5021;6'];

            for (const sku in currencies) {
                if (!Object.prototype.hasOwnProperty.call(currencies, sku)) {
                    continue;
                }

                let value = 0;

                if (sku === '5002;6') {
                    value = 9;
                } else if (sku === '5001;6') {
                    value = 3;
                } else if (sku === '5000;6') {
                    value = 1;
                }

                if (change / value >= 1) {
                    const whose = isBuyer ? 'their' : 'our';

                    for (let i = 0; i < currencies[sku].length; i++) {
                        const isAdded = offer[isBuyer ? 'addTheirItem' : 'addMyItem']({
                            assetid: currencies[sku][i],
                            appid: 440,
                            contextid: '2',
                            amount: 1
                        });

                        if (isAdded) {
                            itemsDict[whose][sku] = (itemsDict[whose][sku] || 0) + 1;
                            change -= value;
                            if (change < value) {
                                break;
                            }
                        }
                    }
                }
            }

            if (change !== 0) {
                return Promise.reject(`I am missing ${Currencies.toRefined(change)} ref as change`);
            }
        }

        for (const sku in required.currencies) {
            if (!Object.prototype.hasOwnProperty.call(required.currencies, sku)) {
                continue;
            }

            if (required.currencies[sku] === 0) {
                continue;
            }

            itemsDict[isBuyer ? 'our' : 'their'][sku] = required.currencies[sku];

            for (let i = 0; i < buyerCurrenciesWithAssetids[sku].length; i++) {
                const isAdded = offer[isBuyer ? 'addMyItem' : 'addTheirItem']({
                    assetid: buyerCurrenciesWithAssetids[sku][i],
                    appid: 440,
                    contextid: '2',
                    amount: 1
                });

                if (isAdded) {
                    required.currencies[sku]--;
                    if (required.currencies[sku] === 0) {
                        break;
                    }
                }
            }

            if (required.currencies[sku] !== 0) {
                log.warn('Failed to create offer because missing buyer pure', {
                    requiredCurrencies: required.currencies,
                    sku: sku
                });

                return Promise.reject('Something went wrong while constructing the offer');
            }
        }

        const itemPrices: UnknownDictionary<{ buy: Currency; sell: Currency }> = {};

        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            const entry = this.bot.pricelist.getPrice(sku, true);

            itemPrices[sku] = {
                buy: entry.buy.toJSON(),
                sell: entry.sell.toJSON()
            };
        }

        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            if (itemPrices[sku] !== undefined) {
                continue;
            }

            const entry = this.bot.pricelist.getPrice(sku, true);

            itemPrices[sku] = {
                buy: entry.buy.toJSON(),
                sell: entry.sell.toJSON()
            };
        }

        // Doing this so that the prices will always be displayed as only metal
        if (process.env.ENABLE_SHOW_ONLY_METAL === 'true') {
            exchange.our.scrap += exchange.our.keys * keyPrice.toValue();
            exchange.our.keys = 0;
            exchange.their.scrap += exchange.their.keys * keyPrice.toValue();
            exchange.their.keys = 0;
        }

        offer.data('dict', itemsDict);
        offer.data('value', {
            our: {
                total: exchange.our.value,
                keys: exchange.our.keys,
                metal: Currencies.toRefined(exchange.our.scrap)
            },
            their: {
                total: exchange.their.value,
                keys: exchange.their.keys,
                metal: Currencies.toRefined(exchange.their.scrap)
            },
            rate: keyPrice.metal
        });
        offer.data('prices', itemPrices);

        offer.data('_dupeCheck', assetidsToCheck);

        this.offer = offer;

        return alteredMessages.length === 0 ? undefined : alteredMessages.join(', ');
    }

    // We Override the toString function so that the currencies are added
    toString(): string {
        if (this.isEmpty()) {
            return 'Your cart is empty.';
        }

        const { isBuyer, currencies } = this.getCurrencies();

        let str = '🛒== YOUR CART ==🛒';

        str += '\n\nMy side (items you will receive):';
        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            const name = this.bot.schema.getName(SKU.fromString(sku), false);
            str += `\n- ${this.our[sku]}x ${name}`;
        }

        if (isBuyer) {
            // We don't offer any currencies, add their currencies to cart string because we are buying their value
            str += '\n' + (Object.keys(this.our).length === 0 ? '' : 'and ') + currencies.toString();
        }

        str += '\n\nYour side (items you will lose):';
        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            const name = this.bot.schema.getName(SKU.fromString(sku), false);
            str += `\n- ${this.their[sku]}x ${name}`;
        }

        if (!isBuyer) {
            // They don't offer any currencies, add our currencies to cart string because they are buying our value
            str += '\n' + (Object.keys(this.their).length === 0 ? '' : 'and ') + currencies.toString();
        }
        str += '\n\nType !checkout to checkout and proceed trade, or !clearcart to cancel.';

        return str;
    }

    // Separated section to use weapons as currency

    canUseKeysWithWeapons(): boolean {
        if (this.getOurCount('5021;6') !== 0 || this.getTheirCount('5021;6') !== 0) {
            // The trade contains keys, don't use keys for currencies
            return false;
        }

        return this.useKeys;
    }

    /**
     * Figure our who the buyer is and get relative currencies
     */
    getCurrenciesWithWeapons(): { isBuyer: boolean; currencies: Currencies } {
        const ourCurrencies = this.getOurCurrenciesWithWeapons();
        const theirCurrencies = this.getTheirCurrenciesWithWeapons();

        const keyPrice = this.bot.pricelist.getKeyPrice();

        const ourValue = ourCurrencies.toValue(keyPrice.metal);
        const theirValue = theirCurrencies.toValue(keyPrice.metal);

        const useKeys = this.canUseKeysWithWeapons();

        if (ourValue >= theirValue) {
            // Our value is greater, we are selling
            return {
                isBuyer: false,
                currencies: Currencies.toCurrencies(ourValue - theirValue, useKeys ? keyPrice.metal : undefined)
            };
        } else {
            // Our value is smaller, we are buying
            return {
                isBuyer: true,
                currencies: Currencies.toCurrencies(theirValue - ourValue, useKeys ? keyPrice.metal : undefined)
            };
        }
    }

    getOurCurrenciesWithWeapons(): Currencies {
        const keyPrice = this.bot.pricelist.getKeyPrice();

        let value = 0;

        // Go through our items
        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            const match = this.bot.pricelist.getPrice(sku, true);

            if (match === null) {
                // Ignore items that are no longer in the pricelist
                continue;
            }

            value += match.sell.toValue(keyPrice.metal) * this.our[sku];
        }

        return Currencies.toCurrencies(value, this.canUseKeysWithWeapons() ? keyPrice.metal : undefined);
    }

    getTheirCurrenciesWithWeapons(): Currencies {
        const keyPrice = this.bot.pricelist.getKeyPrice();

        let value = 0;

        // Go through our items
        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            const match = this.bot.pricelist.getPrice(sku, true);

            if (match === null) {
                // Ignore items that are no longer in the pricelist
                continue;
            }

            value += match.buy.toValue(keyPrice.metal) * this.their[sku];
        }

        return Currencies.toCurrencies(value, this.canUseKeysWithWeapons() ? keyPrice.metal : undefined);
    }

    private getRequiredWithWeapons(
        buyerCurrencies: CurrencyObjectWithWeapons,
        price: Currencies,
        useKeys: boolean
    ): { currencies: CurrencyObjectWithWeapons; change: number } {
        log.debug('Getting required currencies');

        const keyPrice = this.bot.pricelist.getKeyPrice();

        const value = price.toValue(useKeys ? keyPrice.metal : undefined);

        const currencyValues = {
            '5021;6': useKeys ? keyPrice.toValue() : -1,
            '5002;6': 9,
            '5001;6': 3,
            '5000;6': 1,
            '45;6': 0.5,
            '220;6': 0.5,
            '448;6': 0.5,
            '772;6': 0.5,
            '1103;6': 0.5,
            '46;6': 0.5,
            '163;6': 0.5,
            '222;6': 0.5,
            '449;6': 0.5,
            '773;6': 0.5,
            '812;6': 0.5,
            '44;6': 0.5,
            '221;6': 0.5,
            '317;6': 0.5,
            '325;6': 0.5,
            '349;6': 0.5,
            '355;6': 0.5,
            '450;6': 0.5,
            '648;6': 0.5,
            '127;6': 0.5,
            '228;6': 0.5,
            '237;6': 0.5,
            '414;6': 0.5,
            '441;6': 0.5,
            '513;6': 0.5,
            '730;6': 0.5,
            '1104;6': 0.5,
            '129;6': 0.5,
            '133;6': 0.5,
            '226;6': 0.5,
            '354;6': 0.5,
            '415;6': 0.5,
            '442;6': 0.5,
            '1101;6': 0.5,
            '1153;6': 0.5,
            '444;6': 0.5,
            '128;6': 0.5,
            '154;6': 0.5,
            '357;6': 0.5,
            '416;6': 0.5,
            '447;6': 0.5,
            '775;6': 0.5,
            '40;6': 0.5,
            '215;6': 0.5,
            '594;6': 0.5,
            '741;6': 0.5,
            '1178;6': 0.5,
            '39;6': 0.5,
            '351;6': 0.5,
            '595;6': 0.5,
            '740;6': 0.5,
            '1179;6': 0.5,
            '1180;6': 0.5,
            '38;6': 0.5,
            '153;6': 0.5,
            '214;6': 0.5,
            '326;6': 0.5,
            '348;6': 0.5,
            '457;6': 0.5,
            '593;6': 0.5,
            '739;6': 0.5,
            '813;6': 0.5,
            '1181;6': 0.5,
            '308;6': 0.5,
            '405;6': 0.5,
            '608;6': 0.5,
            '996;6': 0.5,
            '1151;6': 0.5,
            '130;6': 0.5,
            '131;6': 0.5,
            '265;6': 0.5,
            '406;6': 0.5,
            '1099;6': 0.5,
            '1150;6': 0.5,
            '132;6': 0.5,
            '172;6': 0.5,
            '307;6': 0.5,
            '327;6': 0.5,
            '404;6': 0.5,
            '482;6': 0.5,
            '609;6': 0.5,
            '41;6': 0.5,
            '312;6': 0.5,
            '424;6': 0.5,
            '811;6': 0.5,
            '42;6': 0.5,
            '159;6': 0.5,
            '311;6': 0.5,
            '425;6': 0.5,
            '1190;6': 0.5,
            '43;6': 0.5,
            '239;6': 0.5,
            '310;6': 0.5,
            '331;6': 0.5,
            '426;6': 0.5,
            '656;6': 0.5,
            '141;6': 0.5,
            '527;6': 0.5,
            '588;6': 0.5,
            '997;6': 0.5,
            '140;6': 0.5,
            '528;6': 0.5,
            '142;6': 0.5,
            '155;6': 0.5,
            '329;6': 0.5,
            '589;6': 0.5,
            '36;6': 0.5,
            '305;6': 0.5,
            '412;6': 0.5,
            '35;6': 0.5,
            '411;6': 0.5,
            '998;6': 0.5,
            '37;6': 0.5,
            '173;6': 0.5,
            '304;6': 0.5,
            '413;6': 0.5,
            '56;6': 0.5,
            '230;6': 0.5,
            '402;6': 0.5,
            '526;6': 0.5,
            '752;6': 0.5,
            '1092;6': 0.5,
            '1098;6': 0.5,
            '57;6': 0.5,
            '58;6': 0.5,
            '231;6': 0.5,
            '642;6': 0.5,
            '751;6': 0.5,
            '171;6': 0.5,
            '232;6': 0.5,
            '401;6': 0.5,
            '61;6': 0.5,
            '224;6': 0.5,
            '460;6': 0.5,
            '525;6': 0.5,
            '810;6': 0.5,
            '225;6': 0.5,
            '356;6': 0.5,
            '461;6': 0.5,
            '649;6': 0.5,
            '60;6': 0.5,
            '59;6': 0.5,
            '939;6': 0.5,
            '61;6;uncraftable': 0.5,
            '1101;6;uncraftable': 0.5,
            '226;6;uncraftable': 0.5,
            '46;6;uncraftable': 0.5,
            '129;6;uncraftable': 0.5,
            '311;6;uncraftable': 0.5,
            '131;6;uncraftable': 0.5,
            '751;6;uncraftable': 0.5,
            '354;6;uncraftable': 0.5,
            '642;6;uncraftable': 0.5,
            '163;6;uncraftable': 0.5,
            '159;6;uncraftable': 0.5,
            '231;6;uncraftable': 0.5,
            '351;6;uncraftable': 0.5,
            '525;6;uncraftable': 0.5,
            '460;6;uncraftable': 0.5,
            '425;6;uncraftable': 0.5,
            '39;6;uncraftable': 0.5,
            '812;6;uncraftable': 0.5,
            '133;6;uncraftable': 0.5,
            '58;6;uncraftable': 0.5,
            '35;6;uncraftable': 0.5,
            '224;6;uncraftable': 0.5,
            '222;6;uncraftable': 0.5,
            '595;6;uncraftable': 0.5,
            '444;6;uncraftable': 0.5,
            '773;6;uncraftable': 0.5,
            '411;6;uncraftable': 0.5,
            '1150;6;uncraftable': 0.5,
            '57;6;uncraftable': 0.5,
            '415;6;uncraftable': 0.5,
            '442;6;uncraftable': 0.5,
            '42;6;uncraftable': 0.5,
            '740;6;uncraftable': 0.5,
            '130;6;uncraftable': 0.5,
            '528;6;uncraftable': 0.5,
            '406;6;uncraftable': 0.5,
            '265;6;uncraftable': 0.5,
            '1099;6;uncraftable': 0.5,
            '998;6;uncraftable': 0.5,
            '449;6;uncraftable': 0.5,
            '140;6;uncraftable': 0.5,
            '1104;6;uncraftable': 0.5,
            '405;6;uncraftable': 0.5,
            '772;6;uncraftable': 0.5,
            '1103;6;uncraftable': 0.5,
            '40;6;uncraftable': 0.5,
            '402;6;uncraftable': 0.5,
            '730;6;uncraftable': 0.5,
            '228;6;uncraftable': 0.5,
            '36;6;uncraftable': 0.5,
            '608;6;uncraftable': 0.5,
            '312;6;uncraftable': 0.5,
            '1098;6;uncraftable': 0.5,
            '441;6;uncraftable': 0.5,
            '305;6;uncraftable': 0.5,
            '215;6;uncraftable': 0.5,
            '127;6;uncraftable': 0.5,
            '45;6;uncraftable': 0.5,
            '1092;6;uncraftable': 0.5,
            '141;6;uncraftable': 0.5,
            '752;6;uncraftable': 0.5,
            '56;6;uncraftable': 0.5,
            '811;6;uncraftable': 0.5,
            '1151;6;uncraftable': 0.5,
            '414;6;uncraftable': 0.5,
            '308;6;uncraftable': 0.5,
            '996;6;uncraftable': 0.5,
            '526;6;uncraftable': 0.5,
            '41;6;uncraftable': 0.5,
            '513;6;uncraftable': 0.5,
            '412;6;uncraftable': 0.5,
            '1153;6;uncraftable': 0.5,
            '594;6;uncraftable': 0.5,
            '588;6;uncraftable': 0.5,
            '741;6;uncraftable': 0.5,
            '997;6;uncraftable': 0.5,
            '237;6;uncraftable': 0.5,
            '220;6;uncraftable': 0.5,
            '448;6;uncraftable': 0.5,
            '230;6;uncraftable': 0.5,
            '424;6;uncraftable': 0.5,
            '527;6;uncraftable': 0.5,
            '60;6;uncraftable': 0.5,
            '59;6;uncraftable': 0.5,
            '304;6;uncraftable': 0.5,
            '450;6;uncraftable': 0.5,
            '38;6;uncraftable': 0.5,
            '326;6;uncraftable': 0.5,
            '939;6;uncraftable': 0.5,
            '461;6;uncraftable': 0.5,
            '325;6;uncraftable': 0.5,
            '232;6;uncraftable': 0.5,
            '317;6;uncraftable': 0.5,
            '327;6;uncraftable': 0.5,
            '356;6;uncraftable': 0.5,
            '447;6;uncraftable': 0.5,
            '128;6;uncraftable': 0.5,
            '775;6;uncraftable': 0.5,
            '589;6;uncraftable': 0.5,
            '426;6;uncraftable': 0.5,
            '132;6;uncraftable': 0.5,
            '355;6;uncraftable': 0.5,
            '331;6;uncraftable': 0.5,
            '239;6;uncraftable': 0.5,
            '142;6;uncraftable': 0.5,
            '357;6;uncraftable': 0.5,
            '656;6;uncraftable': 0.5,
            '221;6;uncraftable': 0.5,
            '153;6;uncraftable': 0.5,
            '329;6;uncraftable': 0.5,
            '43;6;uncraftable': 0.5,
            '739;6;uncraftable': 0.5,
            '416;6;uncraftable': 0.5,
            '813;6;uncraftable': 0.5,
            '482;6;uncraftable': 0.5,
            '154;6;uncraftable': 0.5,
            '404;6;uncraftable': 0.5,
            '457;6;uncraftable': 0.5,
            '214;6;uncraftable': 0.5,
            '44;6;uncraftable': 0.5,
            '172;6;uncraftable': 0.5,
            '609;6;uncraftable': 0.5,
            '401;6;uncraftable': 0.5,
            '348;6;uncraftable': 0.5,
            '413;6;uncraftable': 0.5,
            '155;6;uncraftable': 0.5,
            '649;6;uncraftable': 0.5,
            '349;6;uncraftable': 0.5,
            '593;6;uncraftable': 0.5,
            '171;6;uncraftable': 0.5,
            '37;6;uncraftable': 0.5,
            '307;6;uncraftable': 0.5,
            '173;6;uncraftable': 0.5,
            '310;6;uncraftable': 0.5,
            '648;6;uncraftable': 0.5,
            '225;6;uncraftable': 0.5,
            '810;6;uncraftable': 0.5
        };

        // log.debug('Currency values', currencyValues);

        const skus = Object.keys(currencyValues);

        let remaining = value;

        let hasReversed = false;
        let reverse = false;
        let index = 0;

        const pickedCurrencies: CurrencyObjectWithWeapons = {
            '5021;6': 0,
            '5002;6': 0,
            '5001;6': 0,
            '5000;6': 0,
            '45;6': 0, // Scout - Primary - Force-A-Nature
            '220;6': 0, // Shortstop
            '448;6': 0, // Soda Popper
            '772;6': 0, // Baby Face's Blaster
            '1103;6': 0, // Back Scatter
            '46;6': 0, // Scout - Secondary - Bonk! Atomic Punch
            '163;6': 0, // Crit-a-Cola
            '222;6': 0, // Mad Milk
            '449;6': 0, // Winger
            '773;6': 0, // Pretty Boy's Pocket Pistol
            '812;6': 0, // Flying Guillotine
            '44;6': 0, // Scout - Melee - Sandman
            '221;6': 0, // Holy Mackerel
            '317;6': 0, // Candy Cane
            '325;6': 0, // Boston Basher
            '349;6': 0, // Sun-on-a-Stick
            '355;6': 0, // Fan O'War
            '450;6': 0, // Atomizer
            '648;6': 0, // Wrap Assassin
            '127;6': 0, // Soldier - Primary - Direct Hit
            '228;6': 0, // Black Box
            '237;6': 0, // Rocket Jumper
            '414;6': 0, // Liberty Launcher
            '441;6': 0, // Cow Mangler 5000
            '513;6': 0, // Original
            '730;6': 0, // Beggar's Bazooka
            '1104;6': 0, // Air Strike
            '129;6': 0, // Soldier - Secondary - Buff Banner
            '133;6': 0, // Gunboats
            '226;6': 0, // Battalion's Backup
            '354;6': 0, // Concheror
            '415;6': 0, // (Reserve Shooter - Shared - Soldier/Pyro)
            '442;6': 0, // Righteous Bison
            '1101;6': 0, // (B.A.S.E Jumper - Shared - Soldier/Demoman)
            '1153;6': 0, // (Panic Attack - Shared - Soldier/Pyro/Heavy/Engineer)
            '444;6': 0, // Mantreads
            '128;6': 0, // Soldier - Melee -  Equalizer
            '154;6': 0, // (Pain Train - Shared - Soldier/Demoman)
            '357;6': 0, // (Half-Zatoichi - Shared - Soldier/Demoman)
            '416;6': 0, // Market Gardener
            '447;6': 0, // Disciplinary Action
            '775;6': 0, // Escape Plan
            '40;6': 0, // Pyro - Primary - Backburner
            '215;6': 0, // Degreaser
            '594;6': 0, // Phlogistinator
            '741;6': 0, // Rainblower
            '1178;6': 0, // Dragon's Fury
            '39;6': 0, // Pyro - Secondary - Flare Gun
            '351;6': 0, // Detonator
            '595;6': 0, // Manmelter
            '740;6': 0, // Scorch Shot
            '1179;6': 0, // Thermal Thruster
            '1180;6': 0, // Gas Passer
            '38;6': 0, // Pyro - Melee - Axtinguisher
            '153;6': 0, // Homewrecker
            '214;6': 0, // Powerjack
            '326;6': 0, // Back Scratcher
            '348;6': 0, // Sharpened Volcano Fragment
            '457;6': 0, // Postal Pummeler
            '593;6': 0, // Third Degree
            '739;6': 0, // Lollichop
            '813;6': 0, // Neon Annihilator
            '1181;6': 0, // Hot Hand
            '308;6': 0, // Demoman - Primary - Loch-n-Load
            '405;6': 0, // Ali Baba's Wee Booties
            '608;6': 0, // Bootlegger
            '996;6': 0, // Loose Cannon
            '1151;6': 0, // Iron Bomber
            '130;6': 0, // Demoman - Secondary - Scottish Resistance
            '131;6': 0, // Chargin' Targe
            '265;6': 0, // Sticky Jumper
            '406;6': 0, // Splendid Screen
            '1099;6': 0, // Tide Turner
            '1150;6': 0, // Quickiebomb Launcher
            '132;6': 0, // Demoman - Melee - Eyelander
            '172;6': 0, // Scotsman's Skullcutter
            '307;6': 0, // Ullapool Caber
            '327;6': 0, // Claidheamh Mòr
            '404;6': 0, // Persian Persuader
            '482;6': 0, // Nessie's Nine Iron
            '609;6': 0, // Scottish Handshake
            '41;6': 0, // Heavy - Primary - Natascha
            '312;6': 0, // Brass Beast
            '424;6': 0, // Tomislav
            '811;6': 0, // Huo-Long Heater
            '42;6': 0, // Heavy - Secondary - Sandvich
            '159;6': 0, // Dalokohs Bar
            '311;6': 0, // Buffalo Steak Sandvich
            '425;6': 0, // Family Business
            '1190;6': 0, // Second Banana
            '43;6': 0, // Heavy - Melee - Killing Gloves of Boxing
            '239;6': 0, // Gloves of Running Urgently
            '310;6': 0, // Warrior's Spirit
            '331;6': 0, // Fists of Steel
            '426;6': 0, // Eviction Notice
            '656;6': 0, // Holiday Punch
            '141;6': 0, // Engineer - Primary - Frontier Justice
            '527;6': 0, // Widowmaker
            '588;6': 0, // Pomson 6000
            '997;6': 0, // Rescue Ranger
            '140;6': 0, // Engineer - Secondary - Wrangler
            '528;6': 0, // Short Circuit
            '142;6': 0, // Engineer - Melee - Gunslinger
            '155;6': 0, // Southern Hospitality
            '329;6': 0, // Jag
            '589;6': 0, // Eureka Effect
            '36;6': 0, // **Medic - Primary - Blutsauger
            '305;6': 0, // Crusader's Crossbow
            '412;6': 0, // Overdose
            '35;6': 0, // Medic - Secondary - Kritzkrieg
            '411;6': 0, // Quick-Fix
            '998;6': 0, // Vaccinator
            '37;6': 0, // Medic - Melee - Ubersaw
            '173;6': 0, // Vita-Saw
            '304;6': 0, // Amputator
            '413;6': 0, // Solemn Vow
            '56;6': 0, // Sniper - Primary - Huntsman
            '230;6': 0, // Sydney Sleeper
            '402;6': 0, // Bazaar Bargain
            '526;6': 0, // Machina
            '752;6': 0, // Hitman's Heatmaker
            '1092;6': 0, // Fortified Compound
            '1098;6': 0, // Classic
            '57;6': 0, // Sniper - Secondary - Razorback
            '58;6': 0, // Jarate
            '231;6': 0, // Darwin's Danger Shield
            '642;6': 0, // Cozy Camper
            '751;6': 0, // Cleaner's Carbine
            '171;6': 0, // Sniper - Melee - Tribalman's Shiv
            '232;6': 0, // Bushwacka
            '401;6': 0, // Shahanshah
            '61;6': 0, // Spy - Primary - Ambassador
            '224;6': 0, // L'Etranger
            '460;6': 0, // Enforcer
            '525;6': 0, // Diamondback
            '810;6': 0, // Spy - Secondary - Red-Tape Recorder
            '225;6': 0, // Spy - Melee - Your Eternal Reward
            '356;6': 0, // Conniver's Kunai
            '461;6': 0, // Big Earner
            '649;6': 0, // Spy-cicle
            '60;6': 0, // Spy - PDA2 - Cloak and Dagger
            '59;6': 0, // Dead Ringer
            '939;6': 0, // Bat Outta Hell
            '61;6;uncraftable': 0,
            '1101;6;uncraftable': 0,
            '226;6;uncraftable': 0,
            '46;6;uncraftable': 0,
            '129;6;uncraftable': 0,
            '311;6;uncraftable': 0,
            '131;6;uncraftable': 0,
            '751;6;uncraftable': 0,
            '354;6;uncraftable': 0,
            '642;6;uncraftable': 0,
            '163;6;uncraftable': 0,
            '159;6;uncraftable': 0,
            '231;6;uncraftable': 0,
            '351;6;uncraftable': 0,
            '525;6;uncraftable': 0,
            '460;6;uncraftable': 0,
            '425;6;uncraftable': 0,
            '39;6;uncraftable': 0,
            '812;6;uncraftable': 0,
            '133;6;uncraftable': 0,
            '58;6;uncraftable': 0,
            '35;6;uncraftable': 0,
            '224;6;uncraftable': 0,
            '222;6;uncraftable': 0,
            '595;6;uncraftable': 0,
            '444;6;uncraftable': 0,
            '773;6;uncraftable': 0,
            '411;6;uncraftable': 0,
            '1150;6;uncraftable': 0,
            '57;6;uncraftable': 0,
            '415;6;uncraftable': 0,
            '442;6;uncraftable': 0,
            '42;6;uncraftable': 0,
            '740;6;uncraftable': 0,
            '130;6;uncraftable': 0,
            '528;6;uncraftable': 0,
            '406;6;uncraftable': 0,
            '265;6;uncraftable': 0,
            '1099;6;uncraftable': 0,
            '998;6;uncraftable': 0,
            '449;6;uncraftable': 0,
            '140;6;uncraftable': 0,
            '1104;6;uncraftable': 0,
            '405;6;uncraftable': 0,
            '772;6;uncraftable': 0,
            '1103;6;uncraftable': 0,
            '40;6;uncraftable': 0,
            '402;6;uncraftable': 0,
            '730;6;uncraftable': 0,
            '228;6;uncraftable': 0,
            '36;6;uncraftable': 0,
            '608;6;uncraftable': 0,
            '312;6;uncraftable': 0,
            '1098;6;uncraftable': 0,
            '441;6;uncraftable': 0,
            '305;6;uncraftable': 0,
            '215;6;uncraftable': 0,
            '127;6;uncraftable': 0,
            '45;6;uncraftable': 0,
            '1092;6;uncraftable': 0,
            '141;6;uncraftable': 0,
            '752;6;uncraftable': 0,
            '56;6;uncraftable': 0,
            '811;6;uncraftable': 0,
            '1151;6;uncraftable': 0,
            '414;6;uncraftable': 0,
            '308;6;uncraftable': 0,
            '996;6;uncraftable': 0,
            '526;6;uncraftable': 0,
            '41;6;uncraftable': 0,
            '513;6;uncraftable': 0,
            '412;6;uncraftable': 0,
            '1153;6;uncraftable': 0,
            '594;6;uncraftable': 0,
            '588;6;uncraftable': 0,
            '741;6;uncraftable': 0,
            '997;6;uncraftable': 0,
            '237;6;uncraftable': 0,
            '220;6;uncraftable': 0,
            '448;6;uncraftable': 0,
            '230;6;uncraftable': 0,
            '424;6;uncraftable': 0,
            '527;6;uncraftable': 0,
            '60;6;uncraftable': 0,
            '59;6;uncraftable': 0,
            '304;6;uncraftable': 0,
            '450;6;uncraftable': 0,
            '38;6;uncraftable': 0,
            '326;6;uncraftable': 0,
            '939;6;uncraftable': 0,
            '461;6;uncraftable': 0,
            '325;6;uncraftable': 0,
            '232;6;uncraftable': 0,
            '317;6;uncraftable': 0,
            '327;6;uncraftable': 0,
            '356;6;uncraftable': 0,
            '447;6;uncraftable': 0,
            '128;6;uncraftable': 0,
            '775;6;uncraftable': 0,
            '589;6;uncraftable': 0,
            '426;6;uncraftable': 0,
            '132;6;uncraftable': 0,
            '355;6;uncraftable': 0,
            '331;6;uncraftable': 0,
            '239;6;uncraftable': 0,
            '142;6;uncraftable': 0,
            '357;6;uncraftable': 0,
            '656;6;uncraftable': 0,
            '221;6;uncraftable': 0,
            '153;6;uncraftable': 0,
            '329;6;uncraftable': 0,
            '43;6;uncraftable': 0,
            '739;6;uncraftable': 0,
            '416;6;uncraftable': 0,
            '813;6;uncraftable': 0,
            '482;6;uncraftable': 0,
            '154;6;uncraftable': 0,
            '404;6;uncraftable': 0,
            '457;6;uncraftable': 0,
            '214;6;uncraftable': 0,
            '44;6;uncraftable': 0,
            '172;6;uncraftable': 0,
            '609;6;uncraftable': 0,
            '401;6;uncraftable': 0,
            '348;6;uncraftable': 0,
            '413;6;uncraftable': 0,
            '155;6;uncraftable': 0,
            '649;6;uncraftable': 0,
            '349;6;uncraftable': 0,
            '593;6;uncraftable': 0,
            '171;6;uncraftable': 0,
            '37;6;uncraftable': 0,
            '307;6;uncraftable': 0,
            '173;6;uncraftable': 0,
            '310;6;uncraftable': 0,
            '648;6;uncraftable': 0,
            '225;6;uncraftable': 0,
            '810;6;uncraftable': 0
        };

        /* eslint-disable-next-line no-constant-condition */
        while (true) {
            const key = skus[index];
            // Start at highest currency and check if we should pick that

            // Amount to pick of the currency
            let amount = remaining / currencyValues[key];
            if (amount > buyerCurrencies[key]) {
                // We need more than we have, choose what we have
                amount = buyerCurrencies[key];
            }

            if (index === skus.length - 1) {
                // If we are at the end of the list and have a postive remaining amount,
                // then we need to loop the other way and pick the value that will make the remaining 0 or negative

                if (hasReversed) {
                    // We hit the end the second time, break out of the loop
                    break;
                }

                reverse = true;
            }

            const currAmount = pickedCurrencies[key] || 0;

            if (reverse && amount > 0) {
                // We are reversing the array and found an item that we need
                if (currAmount + Math.ceil(amount) > buyerCurrencies[key]) {
                    // Amount is more than the limit, set amount to the limit
                    amount = buyerCurrencies[key] - currAmount;
                } else {
                    amount = Math.ceil(amount);
                }
            }

            if (amount >= 1) {
                // If the amount is greater than or equal to 1, then I need to pick it
                pickedCurrencies[key] = currAmount + Math.floor(amount);
                // Remove value from remaining
                remaining -= Math.floor(amount) * currencyValues[key];
            }

            // log.debug('Iteration', {
            //     index: index,
            //     key: key,
            //     amount: amount,
            //     remaining: remaining,
            //     reverse: reverse,
            //     hasReversed: hasReversed,
            //     picked: pickedCurrencies
            // });

            if (remaining === 0) {
                // Picked the exact amount, stop
                break;
            }

            if (remaining < 0) {
                // We owe them money, break out of the loop
                break;
            }

            if (index === 0 && reverse) {
                // We were reversing and then reached start of the list, say that we have reversed and go back the other way
                hasReversed = true;
                reverse = false;
            }

            index += reverse ? -1 : 1;
        }

        // log.debug('Done picking currencies', { remaining: remaining, picked: pickedCurrencies });

        if (remaining < 0) {
            log.debug('Picked too much value, removing...');

            // Removes unnessesary items
            for (let i = 0; i < skus.length; i++) {
                const sku = skus[i];

                if (pickedCurrencies[sku] === undefined) {
                    continue;
                }

                let amount = Math.floor(Math.abs(remaining) / currencyValues[sku]);
                if (pickedCurrencies[sku] < amount) {
                    amount = pickedCurrencies[sku];
                }

                if (amount >= 1) {
                    remaining += amount * currencyValues[sku];
                    pickedCurrencies[sku] -= amount;
                }

                // log.debug('Iteration', { sku: sku, amount: amount, remaining: remaining, picked: pickedCurrencies });
            }
        }

        log.debug('Done constructing offer', { picked: pickedCurrencies, change: remaining });

        return {
            currencies: pickedCurrencies,
            change: remaining
        };
    }

    summarizeOurWithWeapons(): string[] {
        const summary = super.summarizeOurWithWeapons();

        const { isBuyer } = this.getCurrenciesWithWeapons();
        const weapons = (this.bot.handler as MyHandler).weapons();
        const craft = weapons.craftAll;
        const uncraft = weapons.uncraftAll;

        let addWeapons = 0;

        const ourDict = this.offer.data('dict').our;
        const scrap = ourDict['5000;6'] || 0;
        const reclaimed = ourDict['5001;6'] || 0;
        const refined = ourDict['5002;6'] || 0;
        craft.forEach(sku => {
            addWeapons += ourDict[sku] || 0;
        });
        uncraft.forEach(sku => {
            addWeapons += ourDict[sku] || 0;
        });

        if (isBuyer) {
            const keys = this.canUseKeysWithWeapons() ? ourDict['5021;6'] || 0 : 0;

            const currencies = new Currencies({
                keys: keys,
                metal: Currencies.toRefined(scrap + reclaimed * 3 + refined * 9 + addWeapons * 0.5)
            });

            summary.push(currencies.toString());
        } else if (scrap + reclaimed + refined !== 0) {
            const currencies = new Currencies({
                keys: 0,
                metal: Currencies.toRefined(scrap + reclaimed * 3 + refined * 9 + addWeapons * 0.5)
            });

            summary.push(currencies.toString());
        }

        return summary;
    }

    summarizeTheirWithWeapons(): string[] {
        const summary = super.summarizeTheirWithWeapons();

        const { isBuyer } = this.getCurrenciesWithWeapons();
        const weapons = (this.bot.handler as MyHandler).weapons();
        const craft = weapons.craftAll;
        const uncraft = weapons.uncraftAll;

        let addWeapons = 0;

        const theirDict = this.offer.data('dict').their;
        const scrap = theirDict['5000;6'] || 0;
        const reclaimed = theirDict['5001;6'] || 0;
        const refined = theirDict['5002;6'] || 0;
        craft.forEach(sku => {
            addWeapons += theirDict[sku] || 0;
        });
        uncraft.forEach(sku => {
            addWeapons += theirDict[sku] || 0;
        });

        if (!isBuyer) {
            const keys = this.canUseKeysWithWeapons() ? theirDict['5021;6'] || 0 : 0;

            const currencies = new Currencies({
                keys: keys,
                metal: Currencies.toRefined(scrap + reclaimed * 3 + refined * 9 + addWeapons * 0.5)
            });

            summary.push(currencies.toString());
        } else if (scrap + reclaimed + refined !== 0) {
            const currencies = new Currencies({
                keys: 0,
                metal: Currencies.toRefined(scrap + reclaimed * 3 + refined * 9 + addWeapons * 0.5)
            });

            summary.push(currencies.toString());
        }

        return summary;
    }

    async constructOfferWithWeapons(): Promise<string> {
        if (this.isEmpty()) {
            return Promise.reject('cart is empty');
        }

        const offer = this.bot.manager.createOffer(this.partner);

        const alteredMessages: string[] = [];

        // Add our items
        const ourInventory = this.bot.inventoryManager.getInventory();

        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            let alteredMessage: string;

            let amount = this.getOurCount(sku);
            const ourAssetids = ourInventory.findBySKU(sku, true);

            if (amount > ourAssetids.length) {
                amount = ourAssetids.length;

                // Remove the item from the cart
                this.removeOurItem(sku, Infinity);

                if (ourAssetids.length === 0) {
                    alteredMessage =
                        "I don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false));
                } else {
                    alteredMessage =
                        'I only have ' +
                        pluralize(this.bot.schema.getName(SKU.fromString(sku), false), ourAssetids.length, true);

                    // Add the max amount to the cart
                    this.addOurItem(sku, amount);
                }
            }

            const amountCanTrade = this.bot.inventoryManager.amountCanTrade(sku, false);

            if (amount > amountCanTrade) {
                this.removeOurItem(sku, Infinity);
                if (amountCanTrade === 0) {
                    alteredMessage = "I can't sell more " + this.bot.schema.getName(SKU.fromString(sku), false);
                } else {
                    amount = amountCanTrade;
                    alteredMessage =
                        'I can only sell ' +
                        amountCanTrade +
                        ' more ' +
                        this.bot.schema.getName(SKU.fromString(sku), false);

                    this.addOurItem(sku, amount);
                }
            }

            if (alteredMessage) {
                alteredMessages.push(alteredMessage);
            }
        }

        // Load their inventory

        const theirInventory = new Inventory(this.partner, this.bot.manager, this.bot.schema);
        let fetched: EconItem[];

        try {
            await theirInventory.fetch();
            fetched = await theirInventory.fetchWithReturn();
        } catch (err) {
            return Promise.reject('Failed to load inventories (Steam might be down)');
        }

        // Add their items

        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            if (
                process.env.DISABLE_CHECK_USES_DUELING_MINI_GAME === 'false' ||
                process.env.DISABLE_CHECK_USES_NOISE_MAKER === 'false'
            ) {
                let hasNot5Uses = false;
                let hasNot25Uses = false;
                const noiseMakerSKU = (this.bot.handler as MyHandler).noiseMakerSKUs();

                if (sku === '241;6' || noiseMakerSKU.includes(sku)) {
                    fetched.forEach(item => {
                        const isDuelingMiniGame = item.market_hash_name === 'Dueling Mini-Game';
                        const isNoiseMaker = (this.bot.handler as MyHandler).noiseMakerNames().some(name => {
                            return item.market_hash_name.includes(name);
                        });

                        if (isDuelingMiniGame && process.env.DISABLE_CHECK_USES_DUELING_MINI_GAME === 'false') {
                            for (let i = 0; i < item.descriptions.length; i++) {
                                const descriptionValue = item.descriptions[i].value;
                                const descriptionColor = item.descriptions[i].color;

                                if (
                                    !descriptionValue.includes('This is a limited use item. Uses: 5') &&
                                    descriptionColor === '00a000'
                                ) {
                                    hasNot5Uses = true;
                                    offer.log('info', 'contains Dueling Mini-Game that is not 5 uses, declining...');
                                    break;
                                }
                            }
                        } else if (isNoiseMaker && process.env.DISABLE_CHECK_USES_NOISE_MAKER === 'false') {
                            for (let i = 0; i < item.descriptions.length; i++) {
                                const descriptionValue = item.descriptions[i].value;
                                const descriptionColor = item.descriptions[i].color;

                                if (
                                    !descriptionValue.includes('This is a limited use item. Uses: 25') &&
                                    descriptionColor === '00a000'
                                ) {
                                    hasNot25Uses = true;
                                    offer.log('info', `${item.market_hash_name} (${item.assetid}) is not 25 uses.`);
                                    break;
                                }
                            }
                        }
                    });
                }

                if (hasNot5Uses) {
                    return Promise.reject(
                        'One of your Dueling Mini-Game is not 5 Uses. Please make sure you only have 5 Uses in your inventory or send me an offer with the one that has 5 Uses instead'
                    );
                }

                if (hasNot25Uses) {
                    return Promise.reject(
                        'One of your Noise Maker in your inventory is not 25 Uses. Please make sure you only have 25 Uses in your inventory or send me an offer with the one that has 25 Uses instead'
                    );
                }
            }

            const highValuedTheir: {
                skus: string[];
                nameWithSpellsOrParts: string[];
            } = {
                skus: [],
                nameWithSpellsOrParts: []
            };

            const isEnabledDiscordWebhook =
                process.env.DISABLE_DISCORD_WEBHOOK_TRADE_SUMMARY === 'false' &&
                process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_URL;

            fetched.forEach(item => {
                let hasSpelled = false;
                const spellNames: string[] = [];

                let hasStrangeParts = false;
                const strangeParts: string[] = [];

                const itemSKU = item.getSKU(this.bot.schema);

                if (sku === itemSKU) {
                    for (let i = 0; i < item.descriptions.length; i++) {
                        const spell = item.descriptions[i].value;
                        const parts = item.descriptions[i].value
                            .replace('(', '')
                            .replace(/: \d+\)/g, '')
                            .trim();
                        const color = item.descriptions[i].color;

                        if (
                            spell.startsWith('Halloween:') &&
                            spell.endsWith('(spell only active during event)') &&
                            color === '7ea9d1'
                        ) {
                            hasSpelled = true;
                            const spellName = spell.substring(10, spell.length - 32).trim();
                            spellNames.push(spellName);
                        } else if (
                            (parts === 'Kills' || parts === 'Assists'
                                ? item.type.includes('Strange') && item.type.includes('Points Scored')
                                : (this.bot.handler as MyHandler).strangeParts().includes(parts)) &&
                            color === '756b5e'
                        ) {
                            hasStrangeParts = true;
                            const strangePartName = parts;
                            strangeParts.push(strangePartName);
                        }
                    }
                    if (hasSpelled || hasStrangeParts) {
                        const itemSKU = item.getSKU(this.bot.schema);
                        highValuedTheir.skus.push(item.getSKU(this.bot.schema));

                        const itemObj = SKU.fromString(itemSKU);

                        // If item is an Unusual, then get itemName from schema.
                        const itemName =
                            itemObj.quality === 5 ? this.bot.schema.getName(itemObj, false) : item.market_hash_name;

                        let spellOrParts = '';

                        if (hasSpelled) {
                            spellOrParts += '\n🎃 Spells: ' + spellNames.join(' + ');
                        }

                        if (hasStrangeParts) {
                            spellOrParts += '\n🎰 Parts: ' + strangeParts.join(' + ');
                        }

                        log.debug('info', `${itemName} (${item.assetid})${spellOrParts}`);

                        if (isEnabledDiscordWebhook) {
                            highValuedTheir.nameWithSpellsOrParts.push(
                                `[${itemName}](https://backpack.tf/item/${item.assetid})${spellOrParts}`
                            );
                        } else {
                            highValuedTheir.nameWithSpellsOrParts.push(`${itemName} (${item.assetid})${spellOrParts}`);
                        }
                    }
                }
            });

            offer.data('highValue', highValuedTheir);

            let alteredMessage: string;

            let amount = this.getTheirCount(sku);
            const theirAssetids = theirInventory.findBySKU(sku, true);

            if (amount > theirAssetids.length) {
                // Remove the item from the cart
                this.removeTheirItem(sku, Infinity);

                if (theirAssetids.length === 0) {
                    alteredMessage =
                        "you don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false));
                } else {
                    amount = theirAssetids.length;
                    alteredMessage =
                        'you only have ' +
                        pluralize(this.bot.schema.getName(SKU.fromString(sku), false), theirAssetids.length, true);

                    // Add the max amount to the cart
                    this.addTheirItem(sku, amount);
                }
            }

            const amountCanTrade = this.bot.inventoryManager.amountCanTrade(sku, true);

            if (amount > amountCanTrade) {
                this.removeTheirItem(sku, Infinity);
                if (amountCanTrade === 0) {
                    alteredMessage =
                        "I can't buy more " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false));
                } else {
                    amount = amountCanTrade;
                    alteredMessage =
                        'I can only buy ' +
                        amountCanTrade +
                        ' more ' +
                        pluralize(this.bot.schema.getName(SKU.fromString(sku), false), amountCanTrade);

                    this.addTheirItem(sku, amount);
                }
            }

            if (alteredMessage) {
                alteredMessages.push(alteredMessage);
            }
        }

        if (this.isEmpty()) {
            return Promise.reject(alteredMessages.join(', '));
        }

        const itemsDict: {
            our: UnknownDictionary<number>;
            their: UnknownDictionary<number>;
        } = {
            our: Object.assign({}, this.our),
            their: Object.assign({}, this.their)
        };

        // Done checking if buyer and seller has the items and if the bot wants to buy / sell more

        // Add values to the offer

        // Figure out who the buyer is and what they are offering
        const { isBuyer, currencies } = this.getCurrenciesWithWeapons();

        // We now know who the buyer is, now get their inventory
        const buyerInventory = isBuyer ? this.bot.inventoryManager.getInventory() : theirInventory;
        const pureStock = (this.bot.handler as MyHandler).pureStock();

        if (this.bot.inventoryManager.amountCanAfford(this.canUseKeysWithWeapons(), currencies, buyerInventory) < 1) {
            // Buyer can't afford the items
            return Promise.reject(
                (isBuyer ? 'I' : 'You') +
                    " don't have enough pure for this trade" +
                    (isBuyer ? '\n💰 Current pure stock: ' + pureStock.join(', ').toString() : '')
            );
        }

        const keyPrice = this.bot.pricelist.getKeyPrice();

        const ourItemsValue = this.getOurCurrenciesWithWeapons().toValue(keyPrice.metal);
        const theirItemsValue = this.getTheirCurrenciesWithWeapons().toValue(keyPrice.metal);

        // Create exchange object with our and their items values
        const exchange = {
            our: { value: ourItemsValue, keys: 0, scrap: ourItemsValue },
            their: { value: theirItemsValue, keys: 0, scrap: theirItemsValue }
        };

        // Figure out what pure to pick from the buyer, and if change is needed

        const buyerCurrenciesWithAssetids = buyerInventory.getCurrencies();

        const buyerCurrenciesCount = {
            '5021;6': buyerCurrenciesWithAssetids['5021;6'].length,
            '5002;6': buyerCurrenciesWithAssetids['5002;6'].length,
            '5001;6': buyerCurrenciesWithAssetids['5001;6'].length,
            '5000;6': buyerCurrenciesWithAssetids['5000;6'].length,
            '45;6': buyerCurrenciesWithAssetids['45;6'].length,
            '220;6': buyerCurrenciesWithAssetids['220;6'].length,
            '448;6': buyerCurrenciesWithAssetids['448;6'].length,
            '772;6': buyerCurrenciesWithAssetids['772;6'].length,
            '1103;6': buyerCurrenciesWithAssetids['1103;6'].length,
            '46;6': buyerCurrenciesWithAssetids['46;6'].length,
            '163;6': buyerCurrenciesWithAssetids['163;6'].length,
            '222;6': buyerCurrenciesWithAssetids['222;6'].length,
            '449;6': buyerCurrenciesWithAssetids['449;6'].length,
            '773;6': buyerCurrenciesWithAssetids['773;6'].length,
            '812;6': buyerCurrenciesWithAssetids['812;6'].length,
            '44;6': buyerCurrenciesWithAssetids['44;6'].length,
            '221;6': buyerCurrenciesWithAssetids['221;6'].length,
            '317;6': buyerCurrenciesWithAssetids['317;6'].length,
            '325;6': buyerCurrenciesWithAssetids['325;6'].length,
            '349;6': buyerCurrenciesWithAssetids['349;6'].length,
            '355;6': buyerCurrenciesWithAssetids['355;6'].length,
            '450;6': buyerCurrenciesWithAssetids['450;6'].length,
            '648;6': buyerCurrenciesWithAssetids['648;6'].length,
            '127;6': buyerCurrenciesWithAssetids['127;6'].length,
            '228;6': buyerCurrenciesWithAssetids['228;6'].length,
            '237;6': buyerCurrenciesWithAssetids['237;6'].length,
            '414;6': buyerCurrenciesWithAssetids['414;6'].length,
            '441;6': buyerCurrenciesWithAssetids['441;6'].length,
            '513;6': buyerCurrenciesWithAssetids['513;6'].length,
            '730;6': buyerCurrenciesWithAssetids['730;6'].length,
            '1104;6': buyerCurrenciesWithAssetids['1104;6'].length,
            '129;6': buyerCurrenciesWithAssetids['129;6'].length,
            '133;6': buyerCurrenciesWithAssetids['133;6'].length,
            '226;6': buyerCurrenciesWithAssetids['226;6'].length,
            '354;6': buyerCurrenciesWithAssetids['354;6'].length,
            '415;6': buyerCurrenciesWithAssetids['415;6'].length,
            '442;6': buyerCurrenciesWithAssetids['442;6'].length,
            '1101;6': buyerCurrenciesWithAssetids['1101;6'].length,
            '1153;6': buyerCurrenciesWithAssetids['1153;6'].length,
            '444;6': buyerCurrenciesWithAssetids['444;6'].length,
            '128;6': buyerCurrenciesWithAssetids['128;6'].length,
            '154;6': buyerCurrenciesWithAssetids['154;6'].length,
            '357;6': buyerCurrenciesWithAssetids['357;6'].length,
            '416;6': buyerCurrenciesWithAssetids['416;6'].length,
            '447;6': buyerCurrenciesWithAssetids['447;6'].length,
            '775;6': buyerCurrenciesWithAssetids['775;6'].length,
            '40;6': buyerCurrenciesWithAssetids['40;6'].length,
            '215;6': buyerCurrenciesWithAssetids['215;6'].length,
            '594;6': buyerCurrenciesWithAssetids['594;6'].length,
            '741;6': buyerCurrenciesWithAssetids['741;6'].length,
            '1178;6': buyerCurrenciesWithAssetids['1178;6'].length,
            '39;6': buyerCurrenciesWithAssetids['39;6'].length,
            '351;6': buyerCurrenciesWithAssetids['351;6'].length,
            '595;6': buyerCurrenciesWithAssetids['595;6'].length,
            '740;6': buyerCurrenciesWithAssetids['740;6'].length,
            '1179;6': buyerCurrenciesWithAssetids['1179;6'].length,
            '1180;6': buyerCurrenciesWithAssetids['1180;6'].length,
            '38;6': buyerCurrenciesWithAssetids['38;6'].length,
            '153;6': buyerCurrenciesWithAssetids['153;6'].length,
            '214;6': buyerCurrenciesWithAssetids['214;6'].length,
            '326;6': buyerCurrenciesWithAssetids['326;6'].length,
            '348;6': buyerCurrenciesWithAssetids['348;6'].length,
            '457;6': buyerCurrenciesWithAssetids['457;6'].length,
            '593;6': buyerCurrenciesWithAssetids['593;6'].length,
            '739;6': buyerCurrenciesWithAssetids['739;6'].length,
            '813;6': buyerCurrenciesWithAssetids['813;6'].length,
            '1181;6': buyerCurrenciesWithAssetids['1181;6'].length,
            '308;6': buyerCurrenciesWithAssetids['308;6'].length,
            '405;6': buyerCurrenciesWithAssetids['405;6'].length,
            '608;6': buyerCurrenciesWithAssetids['608;6'].length,
            '996;6': buyerCurrenciesWithAssetids['996;6'].length,
            '1151;6': buyerCurrenciesWithAssetids['1151;6'].length,
            '130;6': buyerCurrenciesWithAssetids['130;6'].length,
            '131;6': buyerCurrenciesWithAssetids['131;6'].length,
            '265;6': buyerCurrenciesWithAssetids['265;6'].length,
            '406;6': buyerCurrenciesWithAssetids['406;6'].length,
            '1099;6': buyerCurrenciesWithAssetids['1099;6'].length,
            '1150;6': buyerCurrenciesWithAssetids['1150;6'].length,
            '132;6': buyerCurrenciesWithAssetids['132;6'].length,
            '172;6': buyerCurrenciesWithAssetids['172;6'].length,
            '307;6': buyerCurrenciesWithAssetids['307;6'].length,
            '327;6': buyerCurrenciesWithAssetids['327;6'].length,
            '404;6': buyerCurrenciesWithAssetids['404;6'].length,
            '482;6': buyerCurrenciesWithAssetids['482;6'].length,
            '609;6': buyerCurrenciesWithAssetids['609;6'].length,
            '41;6': buyerCurrenciesWithAssetids['41;6'].length,
            '312;6': buyerCurrenciesWithAssetids['312;6'].length,
            '424;6': buyerCurrenciesWithAssetids['424;6'].length,
            '811;6': buyerCurrenciesWithAssetids['811;6'].length,
            '42;6': buyerCurrenciesWithAssetids['42;6'].length,
            '159;6': buyerCurrenciesWithAssetids['159;6'].length,
            '311;6': buyerCurrenciesWithAssetids['311;6'].length,
            '425;6': buyerCurrenciesWithAssetids['425;6'].length,
            '1190;6': buyerCurrenciesWithAssetids['1190;6'].length,
            '43;6': buyerCurrenciesWithAssetids['43;6'].length,
            '239;6': buyerCurrenciesWithAssetids['239;6'].length,
            '310;6': buyerCurrenciesWithAssetids['310;6'].length,
            '331;6': buyerCurrenciesWithAssetids['331;6'].length,
            '426;6': buyerCurrenciesWithAssetids['426;6'].length,
            '656;6': buyerCurrenciesWithAssetids['656;6'].length,
            '141;6': buyerCurrenciesWithAssetids['141;6'].length,
            '527;6': buyerCurrenciesWithAssetids['527;6'].length,
            '588;6': buyerCurrenciesWithAssetids['588;6'].length,
            '997;6': buyerCurrenciesWithAssetids['997;6'].length,
            '140;6': buyerCurrenciesWithAssetids['140;6'].length,
            '528;6': buyerCurrenciesWithAssetids['528;6'].length,
            '142;6': buyerCurrenciesWithAssetids['142;6'].length,
            '155;6': buyerCurrenciesWithAssetids['155;6'].length,
            '329;6': buyerCurrenciesWithAssetids['329;6'].length,
            '589;6': buyerCurrenciesWithAssetids['589;6'].length,
            '36;6': buyerCurrenciesWithAssetids['36;6'].length,
            '305;6': buyerCurrenciesWithAssetids['305;6'].length,
            '412;6': buyerCurrenciesWithAssetids['412;6'].length,
            '35;6': buyerCurrenciesWithAssetids['35;6'].length,
            '411;6': buyerCurrenciesWithAssetids['411;6'].length,
            '998;6': buyerCurrenciesWithAssetids['998;6'].length,
            '37;6': buyerCurrenciesWithAssetids['37;6'].length,
            '173;6': buyerCurrenciesWithAssetids['173;6'].length,
            '304;6': buyerCurrenciesWithAssetids['304;6'].length,
            '413;6': buyerCurrenciesWithAssetids['413;6'].length,
            '56;6': buyerCurrenciesWithAssetids['56;6'].length,
            '230;6': buyerCurrenciesWithAssetids['230;6'].length,
            '402;6': buyerCurrenciesWithAssetids['402;6'].length,
            '526;6': buyerCurrenciesWithAssetids['526;6'].length,
            '752;6': buyerCurrenciesWithAssetids['752;6'].length,
            '1092;6': buyerCurrenciesWithAssetids['1092;6'].length,
            '1098;6': buyerCurrenciesWithAssetids['1098;6'].length,
            '57;6': buyerCurrenciesWithAssetids['57;6'].length,
            '58;6': buyerCurrenciesWithAssetids['58;6'].length,
            '231;6': buyerCurrenciesWithAssetids['231;6'].length,
            '642;6': buyerCurrenciesWithAssetids['642;6'].length,
            '751;6': buyerCurrenciesWithAssetids['751;6'].length,
            '171;6': buyerCurrenciesWithAssetids['171;6'].length,
            '232;6': buyerCurrenciesWithAssetids['232;6'].length,
            '401;6': buyerCurrenciesWithAssetids['401;6'].length,
            '61;6': buyerCurrenciesWithAssetids['61;6'].length,
            '224;6': buyerCurrenciesWithAssetids['224;6'].length,
            '460;6': buyerCurrenciesWithAssetids['460;6'].length,
            '525;6': buyerCurrenciesWithAssetids['525;6'].length,
            '810;6': buyerCurrenciesWithAssetids['810;6'].length,
            '225;6': buyerCurrenciesWithAssetids['225;6'].length,
            '356;6': buyerCurrenciesWithAssetids['356;6'].length,
            '461;6': buyerCurrenciesWithAssetids['461;6'].length,
            '649;6': buyerCurrenciesWithAssetids['649;6'].length,
            '60;6': buyerCurrenciesWithAssetids['60;6'].length,
            '59;6': buyerCurrenciesWithAssetids['59;6'].length,
            '939;6': buyerCurrenciesWithAssetids['939;6'].length,
            '61;6;uncraftable': buyerCurrenciesWithAssetids['61;6;uncraftable'].length,
            '1101;6;uncraftable': buyerCurrenciesWithAssetids['1101;6;uncraftable'].length,
            '226;6;uncraftable': buyerCurrenciesWithAssetids['226;6;uncraftable'].length,
            '46;6;uncraftable': buyerCurrenciesWithAssetids['46;6;uncraftable'].length,
            '129;6;uncraftable': buyerCurrenciesWithAssetids['129;6;uncraftable'].length,
            '311;6;uncraftable': buyerCurrenciesWithAssetids['311;6;uncraftable'].length,
            '131;6;uncraftable': buyerCurrenciesWithAssetids['131;6;uncraftable'].length,
            '751;6;uncraftable': buyerCurrenciesWithAssetids['751;6;uncraftable'].length,
            '354;6;uncraftable': buyerCurrenciesWithAssetids['354;6;uncraftable'].length,
            '642;6;uncraftable': buyerCurrenciesWithAssetids['642;6;uncraftable'].length,
            '163;6;uncraftable': buyerCurrenciesWithAssetids['163;6;uncraftable'].length,
            '159;6;uncraftable': buyerCurrenciesWithAssetids['159;6;uncraftable'].length,
            '231;6;uncraftable': buyerCurrenciesWithAssetids['231;6;uncraftable'].length,
            '351;6;uncraftable': buyerCurrenciesWithAssetids['351;6;uncraftable'].length,
            '525;6;uncraftable': buyerCurrenciesWithAssetids['525;6;uncraftable'].length,
            '460;6;uncraftable': buyerCurrenciesWithAssetids['460;6;uncraftable'].length,
            '425;6;uncraftable': buyerCurrenciesWithAssetids['425;6;uncraftable'].length,
            '39;6;uncraftable': buyerCurrenciesWithAssetids['39;6;uncraftable'].length,
            '812;6;uncraftable': buyerCurrenciesWithAssetids['812;6;uncraftable'].length,
            '133;6;uncraftable': buyerCurrenciesWithAssetids['133;6;uncraftable'].length,
            '58;6;uncraftable': buyerCurrenciesWithAssetids['58;6;uncraftable'].length,
            '35;6;uncraftable': buyerCurrenciesWithAssetids['35;6;uncraftable'].length,
            '224;6;uncraftable': buyerCurrenciesWithAssetids['224;6;uncraftable'].length,
            '222;6;uncraftable': buyerCurrenciesWithAssetids['222;6;uncraftable'].length,
            '595;6;uncraftable': buyerCurrenciesWithAssetids['595;6;uncraftable'].length,
            '444;6;uncraftable': buyerCurrenciesWithAssetids['444;6;uncraftable'].length,
            '773;6;uncraftable': buyerCurrenciesWithAssetids['773;6;uncraftable'].length,
            '411;6;uncraftable': buyerCurrenciesWithAssetids['411;6;uncraftable'].length,
            '1150;6;uncraftable': buyerCurrenciesWithAssetids['1150;6;uncraftable'].length,
            '57;6;uncraftable': buyerCurrenciesWithAssetids['57;6;uncraftable'].length,
            '415;6;uncraftable': buyerCurrenciesWithAssetids['415;6;uncraftable'].length,
            '442;6;uncraftable': buyerCurrenciesWithAssetids['442;6;uncraftable'].length,
            '42;6;uncraftable': buyerCurrenciesWithAssetids['42;6;uncraftable'].length,
            '740;6;uncraftable': buyerCurrenciesWithAssetids['740;6;uncraftable'].length,
            '130;6;uncraftable': buyerCurrenciesWithAssetids['130;6;uncraftable'].length,
            '528;6;uncraftable': buyerCurrenciesWithAssetids['528;6;uncraftable'].length,
            '406;6;uncraftable': buyerCurrenciesWithAssetids['406;6;uncraftable'].length,
            '265;6;uncraftable': buyerCurrenciesWithAssetids['265;6;uncraftable'].length,
            '1099;6;uncraftable': buyerCurrenciesWithAssetids['1099;6;uncraftable'].length,
            '998;6;uncraftable': buyerCurrenciesWithAssetids['998;6;uncraftable'].length,
            '449;6;uncraftable': buyerCurrenciesWithAssetids['449;6;uncraftable'].length,
            '140;6;uncraftable': buyerCurrenciesWithAssetids['140;6;uncraftable'].length,
            '1104;6;uncraftable': buyerCurrenciesWithAssetids['1104;6;uncraftable'].length,
            '405;6;uncraftable': buyerCurrenciesWithAssetids['405;6;uncraftable'].length,
            '772;6;uncraftable': buyerCurrenciesWithAssetids['772;6;uncraftable'].length,
            '1103;6;uncraftable': buyerCurrenciesWithAssetids['1103;6;uncraftable'].length,
            '40;6;uncraftable': buyerCurrenciesWithAssetids['40;6;uncraftable'].length,
            '402;6;uncraftable': buyerCurrenciesWithAssetids['402;6;uncraftable'].length,
            '730;6;uncraftable': buyerCurrenciesWithAssetids['730;6;uncraftable'].length,
            '228;6;uncraftable': buyerCurrenciesWithAssetids['228;6;uncraftable'].length,
            '36;6;uncraftable': buyerCurrenciesWithAssetids['36;6;uncraftable'].length,
            '608;6;uncraftable': buyerCurrenciesWithAssetids['608;6;uncraftable'].length,
            '312;6;uncraftable': buyerCurrenciesWithAssetids['312;6;uncraftable'].length,
            '1098;6;uncraftable': buyerCurrenciesWithAssetids['1098;6;uncraftable'].length,
            '441;6;uncraftable': buyerCurrenciesWithAssetids['441;6;uncraftable'].length,
            '305;6;uncraftable': buyerCurrenciesWithAssetids['305;6;uncraftable'].length,
            '215;6;uncraftable': buyerCurrenciesWithAssetids['215;6;uncraftable'].length,
            '127;6;uncraftable': buyerCurrenciesWithAssetids['127;6;uncraftable'].length,
            '45;6;uncraftable': buyerCurrenciesWithAssetids['45;6;uncraftable'].length,
            '1092;6;uncraftable': buyerCurrenciesWithAssetids['1092;6;uncraftable'].length,
            '141;6;uncraftable': buyerCurrenciesWithAssetids['141;6;uncraftable'].length,
            '752;6;uncraftable': buyerCurrenciesWithAssetids['752;6;uncraftable'].length,
            '56;6;uncraftable': buyerCurrenciesWithAssetids['56;6;uncraftable'].length,
            '811;6;uncraftable': buyerCurrenciesWithAssetids['811;6;uncraftable'].length,
            '1151;6;uncraftable': buyerCurrenciesWithAssetids['1151;6;uncraftable'].length,
            '414;6;uncraftable': buyerCurrenciesWithAssetids['414;6;uncraftable'].length,
            '308;6;uncraftable': buyerCurrenciesWithAssetids['308;6;uncraftable'].length,
            '996;6;uncraftable': buyerCurrenciesWithAssetids['996;6;uncraftable'].length,
            '526;6;uncraftable': buyerCurrenciesWithAssetids['526;6;uncraftable'].length,
            '41;6;uncraftable': buyerCurrenciesWithAssetids['41;6;uncraftable'].length,
            '513;6;uncraftable': buyerCurrenciesWithAssetids['513;6;uncraftable'].length,
            '412;6;uncraftable': buyerCurrenciesWithAssetids['412;6;uncraftable'].length,
            '1153;6;uncraftable': buyerCurrenciesWithAssetids['1153;6;uncraftable'].length,
            '594;6;uncraftable': buyerCurrenciesWithAssetids['594;6;uncraftable'].length,
            '588;6;uncraftable': buyerCurrenciesWithAssetids['588;6;uncraftable'].length,
            '741;6;uncraftable': buyerCurrenciesWithAssetids['741;6;uncraftable'].length,
            '997;6;uncraftable': buyerCurrenciesWithAssetids['997;6;uncraftable'].length,
            '237;6;uncraftable': buyerCurrenciesWithAssetids['237;6;uncraftable'].length,
            '220;6;uncraftable': buyerCurrenciesWithAssetids['220;6;uncraftable'].length,
            '448;6;uncraftable': buyerCurrenciesWithAssetids['448;6;uncraftable'].length,
            '230;6;uncraftable': buyerCurrenciesWithAssetids['230;6;uncraftable'].length,
            '424;6;uncraftable': buyerCurrenciesWithAssetids['424;6;uncraftable'].length,
            '527;6;uncraftable': buyerCurrenciesWithAssetids['527;6;uncraftable'].length,
            '60;6;uncraftable': buyerCurrenciesWithAssetids['60;6;uncraftable'].length,
            '59;6;uncraftable': buyerCurrenciesWithAssetids['59;6;uncraftable'].length,
            '304;6;uncraftable': buyerCurrenciesWithAssetids['304;6;uncraftable'].length,
            '450;6;uncraftable': buyerCurrenciesWithAssetids['450;6;uncraftable'].length,
            '38;6;uncraftable': buyerCurrenciesWithAssetids['38;6;uncraftable'].length,
            '326;6;uncraftable': buyerCurrenciesWithAssetids['326;6;uncraftable'].length,
            '939;6;uncraftable': buyerCurrenciesWithAssetids['939;6;uncraftable'].length,
            '461;6;uncraftable': buyerCurrenciesWithAssetids['461;6;uncraftable'].length,
            '325;6;uncraftable': buyerCurrenciesWithAssetids['325;6;uncraftable'].length,
            '232;6;uncraftable': buyerCurrenciesWithAssetids['232;6;uncraftable'].length,
            '317;6;uncraftable': buyerCurrenciesWithAssetids['317;6;uncraftable'].length,
            '327;6;uncraftable': buyerCurrenciesWithAssetids['327;6;uncraftable'].length,
            '356;6;uncraftable': buyerCurrenciesWithAssetids['356;6;uncraftable'].length,
            '447;6;uncraftable': buyerCurrenciesWithAssetids['447;6;uncraftable'].length,
            '128;6;uncraftable': buyerCurrenciesWithAssetids['128;6;uncraftable'].length,
            '775;6;uncraftable': buyerCurrenciesWithAssetids['775;6;uncraftable'].length,
            '589;6;uncraftable': buyerCurrenciesWithAssetids['589;6;uncraftable'].length,
            '426;6;uncraftable': buyerCurrenciesWithAssetids['426;6;uncraftable'].length,
            '132;6;uncraftable': buyerCurrenciesWithAssetids['132;6;uncraftable'].length,
            '355;6;uncraftable': buyerCurrenciesWithAssetids['355;6;uncraftable'].length,
            '331;6;uncraftable': buyerCurrenciesWithAssetids['331;6;uncraftable'].length,
            '239;6;uncraftable': buyerCurrenciesWithAssetids['239;6;uncraftable'].length,
            '142;6;uncraftable': buyerCurrenciesWithAssetids['142;6;uncraftable'].length,
            '357;6;uncraftable': buyerCurrenciesWithAssetids['357;6;uncraftable'].length,
            '656;6;uncraftable': buyerCurrenciesWithAssetids['656;6;uncraftable'].length,
            '221;6;uncraftable': buyerCurrenciesWithAssetids['221;6;uncraftable'].length,
            '153;6;uncraftable': buyerCurrenciesWithAssetids['153;6;uncraftable'].length,
            '329;6;uncraftable': buyerCurrenciesWithAssetids['329;6;uncraftable'].length,
            '43;6;uncraftable': buyerCurrenciesWithAssetids['43;6;uncraftable'].length,
            '739;6;uncraftable': buyerCurrenciesWithAssetids['739;6;uncraftable'].length,
            '416;6;uncraftable': buyerCurrenciesWithAssetids['416;6;uncraftable'].length,
            '813;6;uncraftable': buyerCurrenciesWithAssetids['813;6;uncraftable'].length,
            '482;6;uncraftable': buyerCurrenciesWithAssetids['482;6;uncraftable'].length,
            '154;6;uncraftable': buyerCurrenciesWithAssetids['154;6;uncraftable'].length,
            '404;6;uncraftable': buyerCurrenciesWithAssetids['404;6;uncraftable'].length,
            '457;6;uncraftable': buyerCurrenciesWithAssetids['457;6;uncraftable'].length,
            '214;6;uncraftable': buyerCurrenciesWithAssetids['214;6;uncraftable'].length,
            '44;6;uncraftable': buyerCurrenciesWithAssetids['44;6;uncraftable'].length,
            '172;6;uncraftable': buyerCurrenciesWithAssetids['172;6;uncraftable'].length,
            '609;6;uncraftable': buyerCurrenciesWithAssetids['609;6;uncraftable'].length,
            '401;6;uncraftable': buyerCurrenciesWithAssetids['401;6;uncraftable'].length,
            '348;6;uncraftable': buyerCurrenciesWithAssetids['348;6;uncraftable'].length,
            '413;6;uncraftable': buyerCurrenciesWithAssetids['413;6;uncraftable'].length,
            '155;6;uncraftable': buyerCurrenciesWithAssetids['155;6;uncraftable'].length,
            '649;6;uncraftable': buyerCurrenciesWithAssetids['649;6;uncraftable'].length,
            '349;6;uncraftable': buyerCurrenciesWithAssetids['349;6;uncraftable'].length,
            '593;6;uncraftable': buyerCurrenciesWithAssetids['593;6;uncraftable'].length,
            '171;6;uncraftable': buyerCurrenciesWithAssetids['171;6;uncraftable'].length,
            '37;6;uncraftable': buyerCurrenciesWithAssetids['37;6;uncraftable'].length,
            '307;6;uncraftable': buyerCurrenciesWithAssetids['307;6;uncraftable'].length,
            '173;6;uncraftable': buyerCurrenciesWithAssetids['173;6;uncraftable'].length,
            '310;6;uncraftable': buyerCurrenciesWithAssetids['310;6;uncraftable'].length,
            '648;6;uncraftable': buyerCurrenciesWithAssetids['648;6;uncraftable'].length,
            '225;6;uncraftable': buyerCurrenciesWithAssetids['225;6;uncraftable'].length,
            '810;6;uncraftable': buyerCurrenciesWithAssetids['810;6;uncraftable'].length
        };

        const required = this.getRequiredWithWeapons(buyerCurrenciesCount, currencies, this.canUseKeysWithWeapons());
        const weapons = (this.bot.handler as MyHandler).weapons();
        const craft = weapons.craftAll;
        const uncraft = weapons.uncraftAll;

        let addWeapons = 0;
        craft.forEach(sku => {
            addWeapons += required.currencies[sku] * 0.5;
        });
        uncraft.forEach(sku => {
            addWeapons += required.currencies[sku] * 0.5;
        });

        // Add the value that the buyer pays to the exchange
        exchange[isBuyer ? 'our' : 'their'].value += currencies.toValue(keyPrice.metal);
        exchange[isBuyer ? 'our' : 'their'].keys += required.currencies['5021;6'];
        exchange[isBuyer ? 'our' : 'their'].scrap +=
            required.currencies['5002;6'] * 9 +
            required.currencies['5001;6'] * 3 +
            required.currencies['5000;6'] +
            addWeapons;

        // Add items to offer

        // Add our items
        for (const sku in this.our) {
            const amount = this.our[sku];
            const assetids = ourInventory.findBySKU(sku, true);

            let missing = amount;

            for (let i = 0; i < assetids.length; i++) {
                const isAdded = offer.addMyItem({
                    appid: 440,
                    contextid: '2',
                    assetid: assetids[i]
                });

                if (isAdded) {
                    // The item was added to the offer
                    missing--;
                    if (missing === 0) {
                        // We added all the items
                        break;
                    }
                }
            }

            if (missing !== 0) {
                log.warn('Failed to create offer because missing our items', {
                    sku: sku,
                    required: amount,
                    missing: missing
                });

                return Promise.reject('Something went wrong while constructing the offer');
            }
        }

        const assetidsToCheck: string[] = [];

        // Add their items
        for (const sku in this.their) {
            const amount = this.their[sku];
            const assetids = theirInventory.findBySKU(sku, true);

            const match = this.bot.pricelist.getPrice(sku, true);

            const item = SKU.fromString(sku);

            const addToDupeCheckList =
                item.effect !== null &&
                match.buy.toValue(keyPrice.metal) >
                    (this.bot.handler as MyHandler).getMinimumKeysDupeCheck() * keyPrice.toValue();

            let missing = amount;

            for (let i = 0; i < assetids.length; i++) {
                const isAdded = offer.addTheirItem({
                    appid: 440,
                    contextid: '2',
                    assetid: assetids[i]
                });

                if (isAdded) {
                    missing--;

                    if (addToDupeCheckList) {
                        assetidsToCheck.push(assetids[i]);
                    }

                    if (missing === 0) {
                        break;
                    }
                }
            }

            if (missing !== 0) {
                log.warn('Failed to create offer because missing their items', {
                    sku: sku,
                    required: amount,
                    missing: missing
                });

                return Promise.reject('Something went wrong while constructing the offer');
            }
        }

        const sellerInventory = isBuyer ? theirInventory : ourInventory;

        if (required.change !== 0) {
            let change = Math.abs(required.change);

            exchange[isBuyer ? 'their' : 'our'].value += change;
            exchange[isBuyer ? 'their' : 'our'].scrap += change;

            const currencies = sellerInventory.getCurrencies();
            const weapons = (this.bot.handler as MyHandler).weapons();
            const craft = weapons.craftAll;
            const uncraft = weapons.uncraftAll;
            // We won't use keys when giving change
            delete currencies['5021;6'];

            for (const sku in currencies) {
                if (!Object.prototype.hasOwnProperty.call(currencies, sku)) {
                    continue;
                }

                let value = 0;

                if (sku === '5002;6') {
                    value = 9;
                } else if (sku === '5001;6') {
                    value = 3;
                } else if (sku === '5000;6') {
                    value = 1;
                } else if (
                    (craft.includes(sku) || uncraft.includes(sku)) &&
                    this.bot.pricelist.getPrice(sku, true) === null
                ) {
                    value = 0.5;
                }

                if (change / value >= 1) {
                    const whose = isBuyer ? 'their' : 'our';

                    for (let i = 0; i < currencies[sku].length; i++) {
                        const isAdded = offer[isBuyer ? 'addTheirItem' : 'addMyItem']({
                            assetid: currencies[sku][i],
                            appid: 440,
                            contextid: '2',
                            amount: 1
                        });

                        if (isAdded) {
                            itemsDict[whose][sku] = (itemsDict[whose][sku] || 0) + 1;
                            change -= value;
                            if (change < value) {
                                break;
                            }
                        }
                    }
                }
            }

            if (change !== 0) {
                return Promise.reject(`I am missing ${Currencies.toRefined(change)} ref as change`);
            }
        }

        for (const sku in required.currencies) {
            if (!Object.prototype.hasOwnProperty.call(required.currencies, sku)) {
                continue;
            }

            if (required.currencies[sku] === 0) {
                continue;
            }

            itemsDict[isBuyer ? 'our' : 'their'][sku] = required.currencies[sku];

            for (let i = 0; i < buyerCurrenciesWithAssetids[sku].length; i++) {
                const isAdded = offer[isBuyer ? 'addMyItem' : 'addTheirItem']({
                    assetid: buyerCurrenciesWithAssetids[sku][i],
                    appid: 440,
                    contextid: '2',
                    amount: 1
                });

                if (isAdded) {
                    required.currencies[sku]--;
                    if (required.currencies[sku] === 0) {
                        break;
                    }
                }
            }

            if (required.currencies[sku] !== 0) {
                log.warn('Failed to create offer because missing buyer pure', {
                    requiredCurrencies: required.currencies,
                    sku: sku
                });

                return Promise.reject('Something went wrong while constructing the offer');
            }
        }

        const itemPrices: UnknownDictionary<{ buy: Currency; sell: Currency }> = {};

        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            const entry = this.bot.pricelist.getPrice(sku, true);

            itemPrices[sku] = {
                buy: entry.buy.toJSON(),
                sell: entry.sell.toJSON()
            };
        }

        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            if (itemPrices[sku] !== undefined) {
                continue;
            }

            const entry = this.bot.pricelist.getPrice(sku, true);

            itemPrices[sku] = {
                buy: entry.buy.toJSON(),
                sell: entry.sell.toJSON()
            };
        }

        // Doing this so that the prices will always be displayed as only metal
        if (process.env.ENABLE_SHOW_ONLY_METAL === 'true') {
            exchange.our.scrap += exchange.our.keys * keyPrice.toValue();
            exchange.our.keys = 0;
            exchange.their.scrap += exchange.their.keys * keyPrice.toValue();
            exchange.their.keys = 0;
        }

        offer.data('dict', itemsDict);
        offer.data('value', {
            our: {
                total: exchange.our.value,
                keys: exchange.our.keys,
                metal: Currencies.toRefined(exchange.our.scrap)
            },
            their: {
                total: exchange.their.value,
                keys: exchange.their.keys,
                metal: Currencies.toRefined(exchange.their.scrap)
            },
            rate: keyPrice.metal
        });
        offer.data('prices', itemPrices);

        offer.data('_dupeCheck', assetidsToCheck);

        this.offer = offer;

        return alteredMessages.length === 0 ? undefined : alteredMessages.join(', ');
    }

    // We Override the toString function so that the currencies are added
    toStringWithWeapons(): string {
        if (this.isEmpty()) {
            return 'Your cart is empty.';
        }

        const { isBuyer, currencies } = this.getCurrenciesWithWeapons();

        let str = '🛒== YOUR CART ==🛒';

        str += '\n\nMy side (items you will receive):';
        for (const sku in this.our) {
            if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                continue;
            }

            const name = this.bot.schema.getName(SKU.fromString(sku), false);
            str += `\n- ${this.our[sku]}x ${name}`;
        }

        if (isBuyer) {
            // We don't offer any currencies, add their currencies to cart string because we are buying their value
            str += '\n' + (Object.keys(this.our).length === 0 ? '' : 'and ') + currencies.toString();
        }

        str += '\n\nYour side (items you will lose):';
        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

            const name = this.bot.schema.getName(SKU.fromString(sku), false);
            str += `\n- ${this.their[sku]}x ${name}`;
        }

        if (!isBuyer) {
            // They don't offer any currencies, add our currencies to cart string because they are buying our value
            str += '\n' + (Object.keys(this.their).length === 0 ? '' : 'and ') + currencies.toString();
        }
        str += '\n\nType !checkout to checkout and proceed trade, or !clearcart to cancel.';

        return str;
    }
}
