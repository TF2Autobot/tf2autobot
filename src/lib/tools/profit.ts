import Bot from '../../classes/Bot';
import dayjs from 'dayjs';
import SteamTradeOfferManager, { OfferData, TradeProfitData } from '@tf2autobot/tradeoffer-manager';

// New FIFO-based profit calculation system

interface Profit {
    rawProfit: {
        keys: number;
        metal: number;
    };
    rawProfitTimed: {
        keys: number;
        metal: number;
    };
    overpriceProfit: number; // Overpay profit in ref
    overpriceProfitTimed: number; // 24h overpay profit in ref
    since: number; // Days since first trade
    hasEstimates?: boolean; // True if FIFO fallback or legacy calculation was used
}

interface OfferDataWithTime extends OfferData {
    time: number;
}

/**
 * Calculate profit from polldata using FIFO-based TradeProfitData
 * Returns profit in scrap for backward compatibility
 */
export default async function profit(
    bot: Bot,
    pollData: SteamTradeOfferManager.PollData,
    start = 0
): Promise<Profit> {
    return new Promise(resolve => {
        const now = dayjs();
        const twentyFourHoursAgo = now.subtract(24, 'hour').valueOf();

        // Initialize profit trackers (keys and metal separate)
        let totalRawKeys = 0;
        let totalRawMetal = 0;
        let totalOverpayKeys = 0;
        let totalOverpay = 0;
        let timedRawKeys = 0;
        let timedRawMetal = 0;
        let timedOverpayKeys = 0;
        let timedOverpay = 0;
        let hasEstimates = false; // Track if any estimates were used

        if (!pollData.offerData) {
            // No trade data - use previous values if available
            const fromPrevious = {
                made: bot.options.statistics.lastTotalProfitMadeInRef,
                overpay: bot.options.statistics.lastTotalProfitOverpayInRef,
                since: bot.options.statistics.profitDataSinceInUnix
            };

            const timeSince = fromPrevious.since === 0 ? undefined : fromPrevious.since;

            return resolve({
                rawProfit: { keys: 0, metal: fromPrevious.made },
                rawProfitTimed: { keys: 0, metal: 0 },
                overpriceProfit: fromPrevious.overpay,
                overpriceProfitTimed: 0,
                since: !timeSince ? 0 : now.diff(dayjs.unix(timeSince), 'day')
            });
        }

        // Convert pollData to array of trades
        const trades = Object.keys(pollData.offerData).map(offerID => {
            const ret = pollData.offerData[offerID] as OfferDataWithTime;
            ret.time = pollData.timestamps[offerID];
            return ret;
        });

        // Sort by time
        trades.sort((a, b) => {
            const aTime = a.handleTimestamp;
            const bTime = b.handleTimestamp;

            if ((!aTime || isNaN(aTime)) && !(!bTime || isNaN(bTime))) return -1;
            if (!(!aTime || isNaN(aTime)) && (!bTime || isNaN(bTime))) return 1;
            if ((!aTime || isNaN(aTime)) && (!bTime || isNaN(bTime))) return 0;
            return aTime - bTime;
        });

        // Get first trade timestamp
        const timeSince =
            +bot.options.statistics.profitDataSinceInUnix === 0
                ? pollData.timestamps[Object.keys(pollData.offerData)[0]]
                : +bot.options.statistics.profitDataSinceInUnix;

        const keyPrice = bot.pricelist.getKeyPrice.metal;

        // Process each trade
        for (const trade of trades) {
            // Skip trades that weren't accepted or handled by us
            if (!(trade.handledByUs && trade.isAccepted)) {
                continue;
            }

            // Skip admin/donation/premium trades
            if (trade.action?.reason === 'ADMIN' || bot.isAdmin(trade.partner)) {
                continue;
            }

            if (trade.donation || trade.buyBptfPremium) {
                continue;
            }

            // Get profit data from new system
            const tradeProfit = trade.tradeProfit as TradeProfitData | undefined;

            if (!tradeProfit) {
                // Old trade without new profit tracking
                // Fall back to old calculation if possible
                if (trade.dict && trade.prices) {
                    // Calculate legacy profit from dict and prices
                    let legacyKeys = 0;
                    let legacyMetal = 0;
                    
                    // Calculate from our side (what we gave)
                    if (trade.dict.our) {
                        for (const sku in trade.dict.our) {
                            const qty = trade.dict.our[sku];
                            const price = trade.prices[sku];
                            if (price && price.sell) {
                                legacyKeys -= price.sell.keys * qty;
                                legacyMetal -= price.sell.metal * qty;
                            }
                        }
                    }
                    
                    // Calculate from their side (what we received)
                    if (trade.dict.their) {
                        for (const sku in trade.dict.their) {
                            const qty = trade.dict.their[sku];
                            const price = trade.prices[sku];
                            if (price && price.buy) {
                                legacyKeys += price.buy.keys * qty;
                                legacyMetal += price.buy.metal * qty;
                            }
                        }
                    }
                    
                    totalRawKeys += legacyKeys;
                    totalRawMetal += legacyMetal;
                    hasEstimates = true; // Mark as estimate since we're using fallback
                }
                continue;
            }

            // Accumulate raw profit (keep keys and metal separate)
            totalRawKeys += tradeProfit.rawProfit.keys;
            totalRawMetal += tradeProfit.rawProfit.metal;
            
            // Track if this trade has estimates
            if (tradeProfit.hasEstimates) {
                hasEstimates = true;
            }
            
            // Handle both old (number) and new (object) overpay formats
            if (typeof tradeProfit.overpay === 'number') {
                // Old format: single metal value
                totalOverpay += tradeProfit.overpay;
            } else {
                // New format: {keys, metal}
                totalOverpayKeys += tradeProfit.overpay.keys;
                totalOverpay += tradeProfit.overpay.metal;
            }

            // Add to 24h totals if within timeframe
            const tradeTime = trade.handleTimestamp || tradeProfit.timestamp;
            if (tradeTime && tradeTime >= twentyFourHoursAgo) {
                timedRawKeys += tradeProfit.rawProfit.keys;
                timedRawMetal += tradeProfit.rawProfit.metal;
                
                if (typeof tradeProfit.overpay === 'number') {
                    timedOverpay += tradeProfit.overpay;
                } else {
                    timedOverpayKeys += tradeProfit.overpay.keys;
                    timedOverpay += tradeProfit.overpay.metal;
                }
            }
        }

        // Add previous values if any (separate keys and metal for proper normalization)
        // TODO: Need to add lastTotalProfitMadeInKeys to Options.statistics interface
        const fromPrevious = {
            madeKeys: 0, // bot.options.statistics.lastTotalProfitMadeInKeys || 0,
            madeMetal: bot.options.statistics.lastTotalProfitMadeInRef || 0,
            overpay: bot.options.statistics.lastTotalProfitOverpayInRef || 0
        };

        // Convert overpay keys to ref and combine (for backward compatibility with Status display)
        const totalOverpayInRef = totalOverpayKeys * keyPrice + totalOverpay;
        const timedOverpayInRef = timedOverpayKeys * keyPrice + timedOverpay;

        resolve({
            rawProfit: {
                keys: totalRawKeys + fromPrevious.madeKeys, // Include keys from previous runs
                metal: totalRawMetal + fromPrevious.madeMetal
            },
            rawProfitTimed: {
                keys: timedRawKeys,
                metal: timedRawMetal
            },
            overpriceProfit: totalOverpayInRef + fromPrevious.overpay,
            overpriceProfitTimed: timedOverpayInRef,
            since: !timeSince ? 0 : now.diff(dayjs.unix(timeSince), 'day'),
            hasEstimates // Include flag indicating if any estimates were used
        });
    });
}
