export const enableMentionOwner = process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER === 'true';

import { parseJSON } from '../../lib/helpers';
import log from '../../lib/logger';

let url: string[];
let links = parseJSON(process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_URL);
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

export const tradeSummaryLinks = url;

let skus: string[];
let skuFromEnv = parseJSON(process.env.DISCORD_WEBHOOK_TRADE_SUMMARY_MENTION_OWNER_ONLY_ITEMS_SKU);
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

export const skusToMention = skus;
