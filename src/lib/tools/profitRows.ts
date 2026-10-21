import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface TradeLike {
    handledByUs?: boolean;
    isAccepted?: boolean;
    action?: { reason?: string };
    partner?: string;
    donation?: boolean;
    buyBptfPremium?: boolean;
    tradeProfit?: {
        rawProfit: { keys: number; metal: number };
        hasEstimates?: boolean;
        timestamp: number;
    } | null;
    handleTimestamp?: number;
}

/**
 * A trade counts toward profit stats only when it was an accepted trade we
 * handled, it has FIFO profit data, and it is not an admin/donation/premium
 * trade.
 */
export function isCountableProfitTrade(
    trade: TradeLike,
    isAdmin: (id: string) => boolean
): trade is TradeLike & { tradeProfit: NonNullable<TradeLike['tradeProfit']> } {
    if (!trade.handledByUs || !trade.isAccepted) return false;
    if (!trade.tradeProfit) return false;
    if (trade.action?.reason === 'ADMIN' || (trade.partner && isAdmin(trade.partner))) return false;
    if (trade.donation || trade.buyBptfPremium) return false;
    return true;
}

export interface DailyProfit {
    startMs: number;
    keys: number;
    metal: number;
    convertedScrap: number;
}

/**
 * Bucket per-trade FIFO profit into daily totals (in the bot's timezone) for
 * the last `days` days ending today. `trades` are polldata offerData entries.
 */
export function dailyProfitSeries(
    trades: TradeLike[],
    isAdmin: (id: string) => boolean,
    keySellMetal: number,
    tz: string,
    nowMs: number,
    days = 14
): DailyProfit[] {
    const zone = tz || 'UTC';
    const todayStart = dayjs(nowMs).tz(zone).startOf('day');
    const buckets = new Map<number, { keys: number; metal: number }>();
    for (let i = 0; i < days; i++) {
        buckets.set(
            todayStart
                .subtract(days - 1 - i, 'day')
                .startOf('day')
                .valueOf(),
            { keys: 0, metal: 0 }
        );
    }

    const dayStarts = [...buckets.keys()].reverse();
    const tomorrowStart = todayStart.add(1, 'day').startOf('day').valueOf();

    for (const trade of trades) {
        if (!isCountableProfitTrade(trade, isAdmin)) continue;
        const tradeTime = trade.handleTimestamp || trade.tradeProfit.timestamp;
        if (!tradeTime || tradeTime >= tomorrowStart) continue;
        const start = dayStarts.find(startMs => tradeTime >= startMs);
        const bucket = buckets.get(start);
        if (!bucket) continue;
        bucket.keys += trade.tradeProfit.rawProfit.keys;
        bucket.metal += trade.tradeProfit.rawProfit.metal;
    }

    return [...buckets.entries()].map(([startMs, { keys, metal }]) => ({
        startMs,
        keys,
        metal,
        convertedScrap: Math.round(keys * keySellMetal * 9 + metal * 9)
    }));
}
