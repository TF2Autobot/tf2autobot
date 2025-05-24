import Bot from '../../classes/Bot';
import dayjs from 'dayjs';
import { Currency } from '../../types/TeamFortress2';
import Currencies from '@tf2autobot/tf2-currencies';
import SteamTradeOfferManager, { OfferData } from '@tf2autobot/tradeoffer-manager';

// reference: https://github.com/ZeusJunior/tf2-automatic-gui/blob/master/app/profit.js

interface Profit {
    tradeProfit: number;
    overpriceProfit: number;
    since: number;
    profitTimed: number;
}

interface OfferDataWithTime extends OfferData {
    time: number;
}

export default async function profit(bot: Bot, pollData: SteamTradeOfferManager.PollData, start = 0): Promise<Profit> {
    return new Promise(resolve => {
        const now = dayjs();

        if (pollData.offerData) {
            const trades = Object.keys(pollData.offerData).map(offerID => {
                const ret = pollData.offerData[offerID] as OfferDataWithTime;
                ret.time = pollData.timestamps[offerID];
                return ret;
            });
            trades.sort((a, b) => {
                const aTime = a.handleTimestamp;
                const bTime = b.handleTimestamp;

                // check for undefined time, sort those at the beginning, they will be skipped
                if ((!aTime || isNaN(aTime)) && !(!bTime || isNaN(bTime))) return -1;
                if (!(!aTime || isNaN(aTime)) && (!bTime || isNaN(bTime))) return 1;
                if ((!aTime || isNaN(aTime)) && (!bTime || isNaN(bTime))) return 0;
                return aTime - bTime;
            });

            const timeSince =
                +bot.options.statistics.profitDataSinceInUnix === 0
                    ? pollData.timestamps[Object.keys(pollData.offerData)[0]]
                    : +bot.options.statistics.profitDataSinceInUnix;

            const keyPrice = bot.pricelist.getKeyPrice;
            const weapons = bot.handler.isWeaponsAsCurrency.enable
                ? bot.handler.isWeaponsAsCurrency.withUncraft
                    ? bot.craftWeapons.concat(bot.uncraftWeapons)
                    : bot.craftWeapons
                : [];

            let overpriceProfit = 0;
            let tradeProfit = 0;
            let profitTimed = 0;

            const tracker = new itemTracker();
            const tradesCount = trades.length;

            for (let i = 0; i < tradesCount; i++) {
                const trade = trades[i];

                if (!(trade.handledByUs && trade.isAccepted)) {
                    // trade was not accepted, go to next trade
                    continue;
                }

                if (trade.action?.reason === 'ADMIN' || bot.isAdmin(trade.partner)) {
                    // trades was from ADMIN, ignore
                    continue;
                }

                let isGift = false;

                if (!Object.prototype.hasOwnProperty.call(trade, 'dict')) {
                    // trade has no items involved (not possible, but who knows)
                    continue;
                }

                const ourDicts = Object.keys(trade.dict.our);
                const ourDictsCount = ourDicts.length;

                if (typeof ourDicts === 'undefined') {
                    isGift = true; // no items on our side, so it is probably gift
                } else if (ourDictsCount > 0) {
                    // trade is not a gift
                    if (!Object.prototype.hasOwnProperty.call(trade, 'value')) {
                        // trade is missing value object
                        continue;
                    }

                    if (!(Object.keys(trade.prices).length > 0)) {
                        // have no prices, broken data, skip
                        continue;
                    }
                } else {
                    isGift = true; // no items on our side, so it is probably gift
                }

                if (typeof trade.value === 'undefined') {
                    trade.value = {};
                }

                if (typeof trade.value.rate === 'undefined') {
                    if (!Object.prototype.hasOwnProperty.call(trade, 'value')) {
                        // in case it was gift
                        trade.value = {};
                    }

                    trade.value.rate = keyPrice.metal; // set key value to current value if it is not defined
                }

                for (const sku in trade.dict.their) {
                    // item bought
                    if (Object.prototype.hasOwnProperty.call(trade.dict.their, sku)) {
                        const itemCount =
                            typeof trade.dict.their[sku] === 'object'
                                ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                  // @ts-ignore: Object is possibly 'null'.
                                  (trade.dict.their[sku]['amount'] as number) // pollData v2.2.0 until v.2.3.5
                                : trade.dict.their[sku]; // pollData before v2.2.0 and/or v3.0.0 or later

                        if (
                            !(
                                (bot.options.miscSettings.weaponsAsCurrency.enable && weapons.includes(sku)) ||
                                ['5000;6', '5001;6', '5002;6'].includes(sku)
                            )
                        ) {
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

                            const tempProfit = tracker.boughtItem(
                                itemCount,
                                sku,
                                trade.prices[sku].buy,
                                trade.value.rate
                            );
                            if (trade.time >= start) {
                                // is within time of interest
                                profitTimed += tempProfit;
                            }
                            tradeProfit += tempProfit;
                        }
                    }
                }

                for (const sku in trade.dict.our) {
                    if (Object.prototype.hasOwnProperty.call(trade.dict.our, sku)) {
                        const itemCount =
                            typeof trade.dict.our[sku] === 'object'
                                ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                  // @ts-ignore: Object is possibly 'null'.
                                  (trade.dict.our[sku]['amount'] as number) // pollData v2.2.0 until v.2.3.5
                                : trade.dict.our[sku]; // pollData before v2.2.0 and/or v3.0.0 or later

                        if (
                            !(
                                (bot.options.miscSettings.weaponsAsCurrency.enable && weapons.includes(sku)) ||
                                ['5000;6', '5001;6', '5002;6'].includes(sku)
                            )
                        ) {
                            if (!Object.prototype.hasOwnProperty.call(trade.prices, sku)) {
                                continue; // item is not in pricelist, so we will just skip it
                            }

                            const tempProfit = tracker.soldItem(
                                itemCount,
                                sku,
                                trade.prices[sku].sell,
                                trade.value.rate
                            );
                            if (trade.time >= start) {
                                // is within time of interest
                                profitTimed += tempProfit;
                            }
                            tradeProfit += tempProfit;
                        }
                    }
                }

                if (!isGift) {
                    // calculate overprice profit
                    if (trade.time >= start) {
                        // is within time of interest
                        profitTimed +=
                            tracker.convert(trade.value.their, trade.value.rate) -
                            tracker.convert(trade.value.our, trade.value.rate);
                    }
                    tradeProfit +=
                        tracker.convert(trade.value.their, trade.value.rate) -
                        tracker.convert(trade.value.our, trade.value.rate);
                    overpriceProfit +=
                        tracker.convert(trade.value.their, trade.value.rate) -
                        tracker.convert(trade.value.our, trade.value.rate);
                }
            }

            const fromPrevious = {
                made: Currencies.toScrap(bot.options.statistics.lastTotalProfitMadeInRef),
                overpay: Currencies.toScrap(bot.options.statistics.lastTotalProfitOverpayInRef)
            };

            return resolve({
                tradeProfit: Math.round(tradeProfit + fromPrevious.made),
                overpriceProfit: Math.round(overpriceProfit + fromPrevious.overpay),
                since: !timeSince ? 0 : now.diff(dayjs.unix(timeSince), 'day'),
                profitTimed: Math.round(profitTimed)
            });
        } else {
            const fromPrevious = {
                made: Currencies.toScrap(bot.options.statistics.lastTotalProfitMadeInRef),
                overpay: Currencies.toScrap(bot.options.statistics.lastTotalProfitOverpayInRef),
                since: bot.options.statistics.profitDataSinceInUnix
            };

            const timeSince = fromPrevious.since === 0 ? undefined : fromPrevious.since;

            return resolve({
                tradeProfit: Math.round(fromPrevious.made),
                overpriceProfit: Math.round(fromPrevious.overpay),
                since: !timeSince ? 0 : now.diff(dayjs.unix(timeSince), 'day'),
                profitTimed: 0 /* carry from previous somehow */
            });
        }
    });
}

interface ItemsCountAndPrice {
    [sku: string]: { count: number; price: number };
}

/**
 * this class tracks items in our inventory and their price
 */
class itemTracker {
    private itemStock: ItemsCountAndPrice;

    private overItems: ItemsCountAndPrice;

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
