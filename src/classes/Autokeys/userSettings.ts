import Currencies from 'tf2-currencies';

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

export function genScrapAdjustment(scrapAdjustmentValue?: number, disableScrapAdjustment?: boolean): ScrapAdjustment {
    return {
        enabled: !disableScrapAdjustment,
        value: !scrapAdjustmentValue ? 0 : scrapAdjustmentValue
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
