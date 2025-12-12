import Bot from '../../classes/Bot';
import dayjs from 'dayjs';
import Currencies from '@tf2autobot/tf2-currencies';
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

function computeOverpay(
    trade: OfferDataWithTime,
    fallbackKeyPrice: number,
    keySellPrice: number
): { keys: number; metal: number; usedEstimate: boolean } {
    const dict = trade.dict || { our: {}, their: {} };
    const prices = (trade as any).prices || {};
    const tradeValue = (trade as any).value as { our?: { total?: number }; their?: { total?: number }; rate?: number };

    const keyPrice = tradeValue?.rate ?? fallbackKeyPrice;
    const keyPriceScrap = Currencies.toScrap(keyPrice);

    // Always recalculate from dict + stored prices to avoid corruption issues
    // Note: sent offers may have corrupted total values in the value object
    let ourTotalScrap = 0;
    let theirTotalScrap = 0;
    let usedEstimate = false;

    for (const sku in dict.our) {
        const amount = dict.our[sku];
        if (sku === '5000;6') ourTotalScrap += amount; // scrap
        else if (sku === '5001;6') ourTotalScrap += amount * 3; // rec
        else if (sku === '5002;6') ourTotalScrap += amount * 9; // ref
        else if (sku === '5021;6') {
            // Keys sent by us are valued at sell price (matches processAccepted.ts)
            ourTotalScrap += amount * Currencies.toScrap(keySellPrice);
        } else {
            const price = prices[sku];
            if (price?.sell) {
                ourTotalScrap += Currencies.toScrap(price.sell.toValue(keyPrice)) * amount;
            } else {
                // Missing price data - cannot calculate accurately
                usedEstimate = true;
            }
        }
    }

    for (const sku in dict.their) {
        const amount = dict.their[sku];
        if (sku === '5000;6') theirTotalScrap += amount; // scrap
        else if (sku === '5001;6') theirTotalScrap += amount * 3; // rec
        else if (sku === '5002;6') theirTotalScrap += amount * 9; // ref
        else if (sku === '5021;6') {
            // Keys received are valued at buy price (matches processAccepted.ts)
            theirTotalScrap += amount * Currencies.toScrap(keyPrice);
        } else {
            const price = prices[sku];
            if (price?.buy) {
                theirTotalScrap += Currencies.toScrap(price.buy.toValue(keyPrice)) * amount;
            } else {
                // Missing price data - cannot calculate accurately
                usedEstimate = true;
            }
        }
    }

    const netOverpayScrap = (theirTotalScrap ?? 0) - (ourTotalScrap ?? 0);
    const overpayKeys = Math.trunc(netOverpayScrap / keyPriceScrap);
    const overpayMetal = Currencies.toRefined(netOverpayScrap - overpayKeys * keyPriceScrap);

    return { keys: overpayKeys, metal: overpayMetal, usedEstimate };
}

/**
 * Calculate profit from polldata using FIFO-based TradeProfitData
 * Returns profit in scrap for backward compatibility
 */
export default async function profit(bot: Bot, pollData: SteamTradeOfferManager.PollData, start = 0): Promise<Profit> {
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
        const keyPrices = bot.pricelist.getKeyPrices;

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
            const tradeProfit = trade.tradeProfit;

            if (!tradeProfit) {
                // Old trade without new FIFO profit tracking - skip it
                // We cannot accurately calculate FIFO-based raw profit from legacy trades
                // New system will accumulate accurate data going forward
                continue;
            }

            // Accumulate raw profit (keep keys and metal separate)
            totalRawKeys += tradeProfit.rawProfit.keys;
            totalRawMetal += tradeProfit.rawProfit.metal;

            // Track if this trade has estimates
            if (tradeProfit.hasEstimates) {
                hasEstimates = true;
            }

            // Recalculate overpay from recorded trade values (ignore stored overpay to avoid corruption)
            const overpay = computeOverpay(trade, keyPrices.buy.metal, keyPrices.sell.metal);
            if (overpay.usedEstimate) {
                hasEstimates = true;
            }

            totalOverpayKeys += overpay.keys;
            totalOverpay += overpay.metal;

            // Add to 24h totals if within timeframe
            const tradeTime = trade.handleTimestamp || tradeProfit.timestamp;
            if (tradeTime && tradeTime >= twentyFourHoursAgo) {
                timedRawKeys += tradeProfit.rawProfit.keys;
                timedRawMetal += tradeProfit.rawProfit.metal;

                timedOverpayKeys += overpay.keys;
                timedOverpay += overpay.metal;
            }
        }

        // Don't include previous values - only count new FIFO-tracked trades
        // Legacy trades cannot be accurately recalculated with FIFO methodology
        const fromPrevious = {
            madeKeys: 0,
            madeMetal: 0,
            overpay: 0
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
