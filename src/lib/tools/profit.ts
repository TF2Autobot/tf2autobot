import Bot from '../../classes/Bot';
import dayjs from 'dayjs';
import { Currency } from '../../types/TeamFortress2';
import Currencies from 'tf2-currencies';

// reference: https://github.com/ZeusJunior/tf2-automatic-gui/blob/master/app/profit.js

export default function profit(bot: Bot): Promise<{ tradeProfit: number; overpriceProfit: number; since: number }> {
    return new Promise(resolve => {
        const polldata = bot.manager.pollData;
        const now = dayjs();

        if (polldata.offerData) {
            const trades = Object.keys(polldata.offerData).map(offerID => {
                return polldata.offerData[offerID];
            });

            const oldestId = polldata.offerData === undefined ? undefined : Object.keys(polldata.offerData)[0];
            const timeSince =
                +bot.options.statistics.profitDataSinceInUnix === 0
                    ? polldata.timestamps[oldestId]
                    : +bot.options.statistics.profitDataSinceInUnix;
            const since = !timeSince ? 0 : now.diff(dayjs.unix(timeSince), 'day');

            const keyPrice = bot.pricelist.getKeyPrice;
            const weapons = bot.handler.getWeapons;

            let overpriceProfit = 0;
            let tradeProfit = 0;

            const tracker = new itemTracker();

            for (let i = 0; i < trades.length; i++) {
                // const trade = trades[i];
                if (!(trades[i].handledByUs && trades[i].isAccepted)) {
                    continue; // trade was not accepted, go to next trade
                }

                let isGift = false;

                if (!Object.prototype.hasOwnProperty.call(trades[i], 'dict')) {
                    continue; // trade has no items involved (not possible, but who knows)
                }
                if (typeof Object.keys(trades[i].dict.our).length === 'undefined') {
                    isGift = true; // no items on our side, so it is probably gift
                } else if (Object.keys(trades[i].dict.our).length > 0) {
                    // trade is not a gift
                    if (!Object.prototype.hasOwnProperty.call(trades[i], 'value')) {
                        continue; // trade is missing value object
                    }
                    if (!(Object.keys(trades[i].prices).length > 0)) {
                        continue; // have no prices, broken data, skip
                    }
                } else {
                    isGift = true; // no items on our side, so it is probably gift
                }

                if (typeof trades[i].value === 'undefined') {
                    trades[i].value = {};
                }

                if (typeof trades[i].value.rate === 'undefined') {
                    if (!Object.prototype.hasOwnProperty.call(trades[i], 'value')) {
                        trades[i].value = {}; // in case it was gift
                    }
                    trades[i].value.rate = keyPrice.metal; // set key value to current value if it is not defined
                }

                for (const sku in trades[i].dict.their) {
                    // item bought
                    if (Object.prototype.hasOwnProperty.call(trades[i].dict.their, sku)) {
                        const itemCount =
                            typeof trades[i].dict.their[sku] === 'object'
                                ? (trades[i].dict.their[sku]['amount'] as number) // polldata v2.2.0 until v.2.3.5
                                : trades[i].dict.their[sku]; // polldata before v2.2.0 and/or v3.0.0 or later

                        // const isNotPureOrWeapons = !(
                        //     (bot.options.weaponsAsCurrency.enable && weapons.includes(sku)) ||
                        //     ['5021;6', '5000;6', '5001;6', '5002;6'].includes(sku)
                        // );

                        if (
                            !(
                                (bot.options.weaponsAsCurrency.enable && weapons.includes(sku)) ||
                                ['5021;6', '5000;6', '5001;6', '5002;6'].includes(sku)
                            )
                        ) {
                            // if it is not currency
                            if (isGift) {
                                if (!Object.prototype.hasOwnProperty.call(trades[i], 'prices')) {
                                    trades[i].prices = {};
                                }
                                trades[i].prices[sku] = {
                                    // set price to 0 because it's a gift
                                    buy: new Currencies({
                                        keys: 0,
                                        metal: 0
                                    })
                                };
                            } else if (!Object.prototype.hasOwnProperty.call(trades[i].prices, sku)) {
                                continue; // item is not in pricelist, so we will just skip it
                            }

                            // const prices = trades[i].prices[sku].buy;

                            tradeProfit += tracker.boughtItem(
                                itemCount,
                                sku,
                                trades[i].prices[sku].buy,
                                trades[i].value.rate
                            );
                        }
                    }
                }

                for (const sku in trades[i].dict.our) {
                    if (Object.prototype.hasOwnProperty.call(trades[i].dict.our, sku)) {
                        const itemCount =
                            typeof trades[i].dict.our[sku] === 'object'
                                ? (trades[i].dict.our[sku]['amount'] as number) // polldata v2.2.0 until v.2.3.5
                                : trades[i].dict.our[sku]; // polldata before v2.2.0 and/or v3.0.0 or later

                        // const isNotPureOrWeapons = !(
                        //     (bot.options.weaponsAsCurrency.enable && weapons.includes(sku)) ||
                        //     ['5021;6', '5000;6', '5001;6', '5002;6'].includes(sku)
                        // );

                        if (
                            !(
                                (bot.options.weaponsAsCurrency.enable && weapons.includes(sku)) ||
                                ['5021;6', '5000;6', '5001;6', '5002;6'].includes(sku)
                            )
                        ) {
                            if (!Object.prototype.hasOwnProperty.call(trades[i].prices, sku)) {
                                continue; // item is not in pricelist, so we will just skip it
                            }
                            // const prices = trades[i].prices[sku].sell;

                            tradeProfit += tracker.soldItem(
                                itemCount,
                                sku,
                                trades[i].prices[sku].sell,
                                trades[i].value.rate
                            );
                        }
                    }
                }

                if (!isGift) {
                    // calculate overprice profit
                    tradeProfit +=
                        tracker.convert(trades[i].value.their, trades[i].value.rate) -
                        tracker.convert(trades[i].value.our, trades[i].value.rate);
                    overpriceProfit +=
                        tracker.convert(trades[i].value.their, trades[i].value.rate) -
                        tracker.convert(trades[i].value.our, trades[i].value.rate);
                }
            }

            const fromPrevious = {
                made: Currencies.toScrap(bot.options.statistics.lastTotalProfitMadeInRef),
                overpay: Currencies.toScrap(bot.options.statistics.lastTotalProfitOverpayInRef)
            };

            tradeProfit = Math.round(tradeProfit + fromPrevious.made);
            overpriceProfit = Math.round(overpriceProfit + fromPrevious.overpay);

            resolve({ tradeProfit, overpriceProfit, since });
        } else {
            const fromPrevious = {
                made: Currencies.toScrap(bot.options.statistics.lastTotalProfitMadeInRef),
                overpay: Currencies.toScrap(bot.options.statistics.lastTotalProfitOverpayInRef),
                since: bot.options.statistics.profitDataSinceInUnix
            };

            const tradeProfit = Math.round(fromPrevious.made);
            const overpriceProfit = Math.round(fromPrevious.overpay);

            const timeSince = fromPrevious.since === 0 ? undefined : fromPrevious.since;
            const since = !timeSince ? 0 : now.diff(dayjs.unix(timeSince), 'day');

            resolve({ tradeProfit, overpriceProfit, since });
        }
    });
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
        return new Currencies(prices).toValue(keyPrice);
    }
}
