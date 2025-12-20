import SteamID from 'steamid';
import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import Cart from './Cart';
import log from '../../lib/logger';
import Bot from '../Bot';

interface ApiCartItem {
    sku?: string;
    amount?: number;
    assetid?: string;
    assetId?: string;
    id?: string;
    appid?: number;
    appId?: number;
    contextid?: string;
    contextId?: string;
}

interface ApiGiveParams {
    keys?: number;
    metal?: number;
    items?: ApiCartItem[];
}

interface ApiReceiveParams {
    items?: ApiCartItem[];
}

/**
 * Cart for API-triggered trades that bypasses pricelist restrictions
 */
export default class ApiCart extends Cart {
    private customMessage: string | null = null;

    readonly tradeUrl: string;

    constructor(tradeUrl: string, bot: Bot) {
        // Extract partner ID from trade URL and convert to SteamID
        const partnerRegex = /[?&]partner=(\d+)/;
        const partnerMatch = partnerRegex.exec(tradeUrl);
        if (!partnerMatch) {
            throw new Error('Invalid trade URL: missing partner parameter');
        }

        // Extract token from trade URL
        const tokenRegex = /[?&]token=([^&]+)/;
        const tokenMatch = tokenRegex.exec(tradeUrl);
        if (!tokenMatch) {
            throw new Error('Invalid trade URL: missing token parameter');
        }

        // Convert account ID to SteamID using the proper format [U:1:accountId]
        const accountId = Number.parseInt(partnerMatch[1]);
        const partnerSteamID = new SteamID(`[U:1:${accountId}]`);
        const token = tokenMatch[1];

        // Use 5-arg constructor with SteamID and token
        super(partnerSteamID, token, bot, [], []);
        this.tradeUrl = tradeUrl;
    }

    protected preSendOffer(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Set a custom message for the trade offer
     */
    setCustomMessage(message: string): void {
        this.customMessage = message;
    }

    /**
     * Construct an offer from custom items and pure
     * This extends the base constructOffer method with custom parameters
     */
    constructOffer(give?: ApiGiveParams, receive?: ApiReceiveParams): Promise<string | null> {
        return new Promise((resolve, reject) => {
            // Check if we have anything to trade
            const hasGive = give && (give.keys || give.metal || give.items?.length);
            const hasReceive = receive?.items?.length;

            if (!hasGive && !hasReceive) {
                return reject(new Error('cart is empty'));
            }

            const start = Date.now();
            // Create offer using partner SteamID (token will be set by Cart.sendOffer())
            const offer = this.bot.manager.createOffer(this.partner);
            const alteredMessages: string[] = [];

            // Add our items (what we're giving)
            if (give) {
                const ourInventory = this.bot.inventoryManager.getInventory;

                // Add keys
                if (give.keys && give.keys > 0) {
                    const keySKU = '5021;6';
                    this.addOurItem(keySKU, give.keys);
                }

                // Add metal (in scrap - 9 scrap = 1 ref, 3 scrap = 1 rec)
                if (give.metal && give.metal > 0) {
                    const metal = give.metal;
                    const refined = Math.floor(metal / 9);
                    const remaining = metal % 9;
                    const reclaimed = Math.floor(remaining / 3);
                    const scrap = remaining % 3;

                    // Add refined
                    if (refined > 0) {
                        this.addOurItem('5002;6', refined);
                    }

                    // Add reclaimed
                    if (reclaimed > 0) {
                        this.addOurItem('5001;6', reclaimed);
                    }

                    // Add scrap
                    if (scrap > 0) {
                        this.addOurItem('5000;6', scrap);
                    }
                }

                // Add custom items by SKU
                if (give.items && Array.isArray(give.items)) {
                    for (const item of give.items) {
                        if (item.sku) {
                            this.addOurItem(item.sku, item.amount || 1);
                        }
                    }
                }

                // Actually add our items to the offer and validate inventory
                for (const sku in this.our) {
                    // eslint-disable-next-line no-prototype-builtins
                    if (!this.our.hasOwnProperty(sku)) {
                        continue;
                    }

                    let amount = this.getOurCount(sku);
                    const ourAssetids = ourInventory.findBySKU(sku, true);
                    const ourAssetidsCount = ourAssetids.length;

                    if (amount > ourAssetidsCount) {
                        amount = ourAssetidsCount;
                        this.removeOurItem(sku);

                        if (ourAssetidsCount === 0) {
                            alteredMessages.push(
                                "I don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false))
                            );
                        } else {
                            const itemName = this.bot.schema.getName(SKU.fromString(sku), false);
                            alteredMessages.push('I only have ' + pluralize(itemName, ourAssetidsCount, true));
                            // Add the max amount available
                            this.addOurItem(sku, ourAssetidsCount);
                        }
                    }

                    if (amount > 0) {
                        let addedCount = 0;
                        log.debug(`Attempting to add ${amount} items with SKU ${sku}`);
                        // Loop through all available assets until we've added the requested amount
                        for (let i = 0; i < ourAssetidsCount && addedCount < amount; i++) {
                            const assetid = ourAssetids[i];

                            // Skip items already in trade
                            if (
                                this.bot.options.miscSettings.skipItemsInTrade.enable &&
                                this.bot.trades.isInTrade(assetid)
                            ) {
                                log.debug(`Skipping asset ${assetid} - already in trade`);
                                continue;
                            }

                            log.debug(`Attempting to add asset ${assetid} to offer`);
                            const isAdded = offer.addMyItem({
                                assetid: assetid,
                                appid: 440,
                                contextid: '2',
                                amount: 1
                            });

                            log.debug(`addMyItem returned: ${String(isAdded)} for asset ${assetid}`);
                            if (isAdded) {
                                addedCount++;
                            }
                        }
                        log.debug(`Successfully added ${addedCount} of ${amount} items`);

                        // Check if we added fewer items than expected
                        if (addedCount < amount) {
                            const itemName = this.bot.schema.getName(SKU.fromString(sku), false);
                            if (addedCount === 0) {
                                alteredMessages.push(
                                    `Could not add any ${pluralize(itemName)} (items may be in another trade)`
                                );
                            } else {
                                alteredMessages.push(
                                    `Could only add ${addedCount} of ${amount} ${pluralize(
                                        itemName
                                    )} (some items may be in another trade)`
                                );
                            }
                        }
                    }
                }
            }

            // Add their items (what we're receiving) by asset ID
            if (receive?.items && Array.isArray(receive.items)) {
                for (const item of receive.items) {
                    const assetid = item.assetid || item.assetId || item.id;
                    const appid = item.appid || item.appId || 440;
                    const contextid = item.contextid || item.contextId || '2';

                    offer.addTheirItem({
                        assetid: String(assetid),
                        appid: Number(appid),
                        contextid: String(contextid),
                        amount: 1
                    });
                }

                // After adding items to offer, resolve SKUs from the actual items
                // This ensures we get proper item names in webhooks
                offer.itemsToReceive.forEach(offerItem => {
                    let sku: string;

                    // Try to find matching item in receive.items with SKU
                    const matchingReceiveItem = receive.items?.find(
                        (ri: ApiCartItem) => String(ri.assetid || ri.assetId || ri.id) === offerItem.assetid
                    );

                    if (matchingReceiveItem?.sku) {
                        // Use provided SKU
                        sku = matchingReceiveItem.sku;
                    } else if (offerItem.market_hash_name) {
                        // Try to resolve SKU from market_hash_name
                        try {
                            const itemObject = this.bot.schema.getItemObjectFromName(offerItem.market_hash_name);
                            if (itemObject) {
                                sku = SKU.fromObject(itemObject);
                            } else {
                                sku = `asset_${offerItem.assetid}`;
                            }
                        } catch (e) {
                            // If conversion fails, use placeholder
                            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
                            log.debug(`Failed to convert item ${offerItem.assetid} to SKU: ${errorMsg}`);
                            sku = `asset_${offerItem.assetid}`;
                        }
                    } else {
                        sku = `asset_${offerItem.assetid}`;
                    }

                    this.addTheirItem(sku, 1);
                });
            }

            if (offer.itemsToGive.length === 0 && offer.itemsToReceive.length === 0) {
                return reject(new Error('No items to trade'));
            }

            offer.data('dict', {
                our: this.our,
                their: this.their
            });

            offer.data('_dupeCheck', false);
            offer.data('isApiTrade', true);
            offer.data('constructOfferTime', Date.now() - start);

            this.offer = offer;

            log.debug(
                `Offer constructed - giving ${offer.itemsToGive.length} items, receiving ${offer.itemsToReceive.length} items`
            );
            log.debug(`Offer partner: ${offer.partner.getSteamID64()}`);
            log.debug(
                `Items to give:`,
                offer.itemsToGive.map(i => ({ assetid: i.assetid, appid: i.appid, contextid: i.contextid }))
            );
            log.debug(
                `Items to receive:`,
                offer.itemsToReceive.map(i => ({ assetid: i.assetid, appid: i.appid, contextid: i.contextid }))
            );

            if (alteredMessages.length === 0) {
                return resolve(null);
            } else {
                return resolve(alteredMessages.join(', '));
            }
        });
    }

    /**
     * Override sendOffer to use custom message if provided
     */
    sendOffer(): Promise<string | void> {
        if (this.customMessage && this.offer) {
            this.offer.setMessage(this.customMessage);
        }
        return super.sendOffer();
    }
}
