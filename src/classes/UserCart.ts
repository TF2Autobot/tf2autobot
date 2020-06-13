import pluralize from 'pluralize';
import SKU from 'tf2-sku';
import Currencies from 'tf2-currencies';
import async from 'async';

import Cart from './Cart';
import Inventory from './Inventory';
import TF2Inventory from './TF2Inventory';
import MyHandler from './MyHandler';
import { CurrencyObject, Currency } from '../types/TeamFortress2';
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
        const theirItemsValue = this.getTheirCurrencies().toValue(keyPrice.metal);
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

        const pickedCurrencies: CurrencyObject = { '5021;6': 0, '5002;6': 0, '5001;6': 0, '5000;6': 0 };

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

        try {
            await theirInventory.fetch();
        } catch (err) {
            return Promise.reject('Failed to load inventories (Steam might be down)');
        }

        // Add their items

        for (const sku in this.their) {
            if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                continue;
            }

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
        const pureStock = this.pureStock();

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

    private pureStock(): string[] {
        const pureStock: string[] = [];
        const pureScrap = this.bot.inventoryManager.getInventory().getAmount('5000;6') * (1 / 9);
        const pureRec = this.bot.inventoryManager.getInventory().getAmount('5001;6') * (1 / 3);
        const pureRef = this.bot.inventoryManager.getInventory().getAmount('5002;6');
        const pureScrapTotal = Currencies.toScrap(pureRef + pureRec + pureScrap);
        const pure = [
            {
                name: 'Key',
                amount: this.bot.inventoryManager.getInventory().getAmount('5021;6')
            },
            {
                name: 'Ref',
                amount: Currencies.toRefined(pureScrapTotal)
            }
        ];
        for (let i = 0; i < pure.length; i++) {
            pureStock.push(`${pure[i].name}: ${pure[i].amount}`);
        }
        return pureStock;
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
}
