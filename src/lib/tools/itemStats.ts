import Bot from '../../classes/Bot';
import { OfferData } from '@tf2autobot/tradeoffer-manager';

// trigger update file name
// reference: https://github.com/ZeusJunior/tf2-automatic-gui/blob/master/app/profit.js

export default function itemStats(bot: Bot, SKU: string): Promise<{ bought: ItemStats; sold: ItemStats }> {
    return new Promise((resolve, reject) => {
        const pollData = bot.manager.pollData;

        const isCheckForPainted = /;[p][0-9]+/.test(SKU); // true if use input with painted partial sku

        if (pollData.offerData) {
            const trades = Object.keys(pollData.offerData).map(offerID => {
                const ret = pollData.offerData[offerID] as OfferDataWithTime;
                ret.time = pollData.timestamps[offerID];
                return ret;
            });
            const keyPrice = bot.pricelist.getKeyPrice;
            const weapons = bot.handler.isWeaponsAsCurrency.enable
                ? bot.handler.isWeaponsAsCurrency.withUncraft
                    ? bot.craftWeapons.concat(bot.uncraftWeapons)
                    : bot.craftWeapons
                : [];

            const sold: ItemStats = {};
            const bought: ItemStats = {};

            for (let i = 0; i < trades.length; i++) {
                const trade = trades[i];
                if (!(trade.handledByUs && trade.isAccepted)) {
                    // trade was not accepted, go to next trade
                    continue;
                }

                if (!Object.prototype.hasOwnProperty.call(trade, 'dict')) {
                    // trade has no items involved (not possible, but who knows)
                    continue;
                }

                if (typeof Object.keys(trade.dict.our).length === 'undefined') {
                    continue; // no items on our side, so it is probably gift - we are not counting gifts
                } else if (Object.keys(trade.dict.our).length > 0) {
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
                    continue; // no items on our side, so it is probably gift
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
                    if (
                        Object.prototype.hasOwnProperty.call(trade.dict.their, sku) &&
                        (!isCheckForPainted ? sku.replace(/;[p][0-9]+/, '') : sku) === SKU
                    ) {
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
                            if (!Object.prototype.hasOwnProperty.call(trade.prices, sku)) {
                                continue; // item is not in pricelist, so we will just skip it
                            }
                            while (Object.prototype.hasOwnProperty.call(bought, trade.time)) {
                                trade.time++; // Prevent two trades with the same timestamp (should not happen so much)
                            }
                            bought[String(trade.time)] = {
                                count: itemCount,
                                keys: trade.prices[sku].buy.keys,
                                metal: trade.prices[sku].buy.metal
                            };
                        }
                    }
                }

                for (const sku in trade.dict.our) {
                    if (
                        Object.prototype.hasOwnProperty.call(trade.dict.our, sku) &&
                        (!isCheckForPainted ? sku.replace(/;[p][0-9]+/, '') : sku) === SKU
                    ) {
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
                            while (Object.prototype.hasOwnProperty.call(sold, trade.time)) {
                                trade.time++; // Prevent two trades with the same timestamp (should not happen so much)
                            }
                            sold[String(trade.time)] = {
                                count: itemCount,
                                keys: trade.prices[sku].sell.keys,
                                metal: trade.prices[sku].sell.metal
                            };
                        }
                    }
                }
            }
            if (Object.keys(bought).length <= 0 && Object.keys(sold).length <= 0) {
                return reject('No record found.');
            }

            return resolve({
                bought,
                sold
            });
        }
    });
}

interface OfferDataWithTime extends OfferData {
    time: number;
}
interface ItemStats {
    [time: string]: ItemStatsValue;
}

interface ItemStatsValue {
    count: number;
    keys: number;
    metal: number;
}
