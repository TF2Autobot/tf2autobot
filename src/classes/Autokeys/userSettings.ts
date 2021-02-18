import Currencies from 'tf2-currencies-2';

interface ScrapAdjustment {
    enabled: boolean;
    value: number;
}

interface UserPure {
    minKeys: number;
    maxKeys: number;
    minRefs: number;
    maxRefs: number;
}

export function genScrapAdjustment(scrapAdjustmentValue?: number, enabled?: boolean): ScrapAdjustment {
    return {
        enabled: enabled,
        value: isNaN(scrapAdjustmentValue) ? 0 : scrapAdjustmentValue
    };
}

export function genUserPure(
    minimumKeys: number,
    maximumKeys: number,
    minimumRefinedToStartSellKeys: number,
    maximumRefinedToStopSellKeys: number
): UserPure {
    return {
        minKeys: minimumKeys,
        maxKeys: maximumKeys,
        minRefs: Currencies.toScrap(minimumRefinedToStartSellKeys),
        maxRefs: Currencies.toScrap(maximumRefinedToStopSellKeys)
    };
}
