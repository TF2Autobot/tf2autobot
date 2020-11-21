import log from '../logger';

export function genTradeSummaryLinks(discordWebhookTradeSummaryURL: string | Array<string>): Array<string> {
    let url: string[];
    let links = discordWebhookTradeSummaryURL;
    if (links !== null && Array.isArray(links)) {
        links.forEach((sku: string) => {
            if (sku === '' || !sku) {
                links = [];
            }
        });
        url = links;
    } else {
        log.warn('You did not set Discord Webhook URL as an array, resetting to an empty array.');
        url = [];
    }
    return url;
}

export function genSkusToMention(
    discordWebhookTradeSummaryMentionOwnerOnlyItemsSKU: string | Array<string>
): Array<string> {
    let skus: string[];
    let skuFromEnv = discordWebhookTradeSummaryMentionOwnerOnlyItemsSKU;
    if (skuFromEnv !== null && Array.isArray(skuFromEnv)) {
        skuFromEnv.forEach((sku: string) => {
            if (sku === '' || !sku) {
                skuFromEnv = ['Not set'];
            }
        });
        skus = skuFromEnv;
    } else {
        log.warn('You did not set items SKU to mention as an array, mention on specific items disabled.');
        skus = ['Not set'];
    }
    return skus;
}
