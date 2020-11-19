import Currencies from 'tf2-currencies';

const scrapValue = parseInt(process.env.SCRAP_ADJUSTMENT_VALUE);
export const scrapAdjustment = {
    enabled: process.env.DISABLE_SCRAP_ADJUSTMENT !== 'true',
    value: !scrapValue || isNaN(scrapValue) ? 0 : scrapValue
};

export const userPure = {
    minKeys: parseInt(process.env.MINIMUM_KEYS),
    maxKeys: parseInt(process.env.MAXIMUM_KEYS),
    minRefs: Currencies.toScrap(parseInt(process.env.MINIMUM_REFINED_TO_START_SELL_KEYS)),
    maxRefs: Currencies.toScrap(parseInt(process.env.MAXIMUM_REFINED_TO_STOP_SELL_KEYS))
};
