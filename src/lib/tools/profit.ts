import Bot from '../../classes/Bot';
import { Currency } from '../../types/TeamFortress2';
import Currencies from 'tf2-currencies';

// reference: https://github.com/ZeusJunior/tf2-automatic-gui/blob/master/app/profit.js

export default function profit(bot: Bot): { tradeProfit: number; overpriceProfit: number; totalTrades: number } {
    const polldata = bot.manager.pollData;
    const trades = Object.keys(polldata.offerData).map(offerID => {
        return polldata.offerData[offerID];
    });
    const keyPrice = bot.pricelist.getKeyPrice();

    let overpriceProfit = 0;
    let tradeProfit = 0;

    const tracker = new itemTracker();

    trades.sort((a, b) => {
        const aTime = a.handleTimestamp;
        const bTime = b.handleTimestamp;

        // check for undefined time, sort those at the beggining, they will be skipped
        if ((!aTime || isNaN(aTime)) && !(!bTime || isNaN(bTime))) return -1;
        if (!(!aTime || isNaN(aTime)) && (!bTime || isNaN(bTime))) return 1;
        if ((!aTime || isNaN(aTime)) && (!bTime || isNaN(bTime))) return 0;
        return aTime - bTime;
    });

    let iter = 0; // to keep track of how many trades are accepted

    for (let i = 0; i < trades.length; i++) {
        const trade = trades[i];
        if (!(trade.handledByUs && trade.isAccepted)) {
            continue; // trade was not accepted, go to next trade
        }

        iter++;
        let isGift = false;
        if (!Object.prototype.hasOwnProperty.call(trade, 'dict')) {
            continue; // trade has no items involved (not possible, but who knows)
        }
        if (typeof Object.keys(trade.dict.our).length === 'undefined') {
            isGift = true; // no items on our side, so it is probably gift
        } else if (Object.keys(trade.dict.our).length > 0) {
            // trade is not a gift
            if (!Object.prototype.hasOwnProperty.call(trade, 'value')) {
                continue; // trade is missing value object
            }
            if (!(Object.keys(trade.prices).length > 0)) {
                continue; // have no prices, broken data, skip
            }
        } else {
            isGift = true; // no items on our side, so it is probably gift
        }

        if (typeof trade.value === 'undefined') {
            trade.value = {};
        }

        if (typeof trade.value.rate === 'undefined') {
            if (!Object.prototype.hasOwnProperty.call(trade, 'value')) {
                trade.value = {}; // in case it was gift
            }
            trade.value.rate = keyPrice.metal; // set key value to current value if it is not defined
        }

        for (const sku in trade.dict.their) {
            // item bought
            if (Object.prototype.hasOwnProperty.call(trade.dict.their, sku)) {
                const itemCount = trade.dict.their[sku].amount;

                if (!['5000;6', '5001;6', '5002;6', '5021;6'].includes(sku)) {
                    // if it is not currency
                    if (isGift) {
                        if (!Object.prototype.hasOwnProperty.call(trade, 'prices')) {
                            trade.prices = {};
                        }
                        trade.prices[sku] = {
                            // set price to 0 because it's a gift
                            buy: new Currencies({
                                keys: 0,
                                metal: 0
                            })
                        };
                    } else if (!Object.prototype.hasOwnProperty.call(trade.prices, sku)) {
                        continue; // item is not in pricelist, so we will just skip it
                    }

                    const prices = trade.prices[sku].buy;

                    tradeProfit += tracker.boughtItem(itemCount, sku, prices, trade.value.rate);
                }
            }
        }

        for (const sku in trade.dict.our) {
            if (Object.prototype.hasOwnProperty.call(trade.dict.our, sku)) {
                const itemCount = trade.dict.our[sku].amount;
                if (sku !== '5000;6' && sku !== '5002;6' && sku !== '5001;6' && sku !== '5021;6') {
                    if (!Object.prototype.hasOwnProperty.call(trade.prices, sku)) {
                        continue; // item is not in pricelist, so we will just skip it
                    }
                    const prices = trade.prices[sku].sell;

                    tradeProfit += tracker.soldItem(itemCount, sku, prices, trade.value.rate);
                }
            }
        }

        if (!isGift) {
            // calculate overprice profit
            tradeProfit +=
                tracker.convert(trade.value.their, trade.value.rate) -
                tracker.convert(trade.value.our, trade.value.rate);
            overpriceProfit +=
                tracker.convert(trade.value.their, trade.value.rate) -
                tracker.convert(trade.value.our, trade.value.rate);
        }
    }

    const totalTrades = iter;

    return { tradeProfit, overpriceProfit, totalTrades };
}

/**
 * this class tracks items in our inventory and their price
 */
class itemTracker {
    private itemStock: { [sku: string]: { count: number; price: number } };

    private overItems: { [sku: string]: { count: number; price: number } };

    constructor() {
        this.itemStock = {};
        this.overItems = {}; // items sold before being bought
    }

    boughtItem(itemCount: number, sku: string, prices: Currency, rate: number): number {
        let itemProfit = 0;
        if (Object.prototype.hasOwnProperty.call(this.overItems, sku)) {
            // if record for this item exists in overItems check it
            if (this.overItems[sku].count > 0) {
                if (this.overItems[sku].count >= itemCount) {
                    this.overItems[sku].count -= itemCount;
                    return (this.overItems[sku].price - this.convert(prices, rate)) * itemCount; // everything is already sold no need to add to stock
                } else {
                    const itemsOverOverItems = itemCount - this.overItems[sku].count;
                    this.overItems[sku].count = 0;
                    itemProfit +=
                        (this.overItems[sku].price - this.convert(prices, rate)) * (itemCount - itemsOverOverItems);
                    itemCount = itemsOverOverItems;
                }
            }
        }
        if (Object.prototype.hasOwnProperty.call(this.itemStock, sku)) {
            // check if record exists
            const priceAvg = this.itemStock[sku].price;
            const itemCountStock = this.itemStock[sku].count;
            this.itemStock[sku].price =
                (priceAvg * itemCountStock + itemCount * this.convert(prices, rate)) / (itemCountStock + itemCount); // calculate new item average price
            this.itemStock[sku].count += itemCount;
        } else {
            this.itemStock[sku] = {
                count: itemCount,
                price: this.convert(prices, rate)
            };
        }
        return itemProfit;
    }

    soldItem(itemCount: number, sku: string, prices: Currency, rate: number): number {
        let itemProfit = 0;
        if (Object.prototype.hasOwnProperty.call(this.itemStock, sku)) {
            // have we bought this item already
            if (this.itemStock[sku].count >= itemCount) {
                this.itemStock[sku].count -= itemCount;
                return (this.convert(prices, rate) - this.itemStock[sku].price) * itemCount;
            } else {
                itemProfit += (this.convert(prices, rate) - this.itemStock[sku].price) * this.itemStock[sku].count;
                itemCount -= this.itemStock[sku].count;
                this.itemStock[sku].count = 0;
            }
        }
        if (Object.prototype.hasOwnProperty.call(this.overItems, sku)) {
            // check if record exists
            const priceAvg = this.overItems[sku].price;
            const itemCountStock = this.overItems[sku].count;
            this.overItems[sku].price =
                (priceAvg * itemCountStock + itemCount * this.convert(prices, rate)) / (itemCountStock + itemCount); // calculate new item average price
            this.overItems[sku].count += itemCount;
        } else {
            this.overItems[sku] = {
                count: itemCount,
                price: this.convert(prices, rate)
            };
        }
        return itemProfit;
    }

    convert(prices: Currency, keyPrice: number) {
        const converted = new Currencies(prices).toValue(keyPrice);
        return converted;
    }
}
