import SteamID from 'steamid';
import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import Cart from './Cart';

/**
 * Cart for API-triggered trades that bypasses pricelist restrictions
 */
export default class ApiCart extends Cart {
    private customMessage: string | null = null;

    constructor(partner: SteamID, bot, token?: string) {
        super(partner, token || '', bot, [], []);
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
    constructOffer(give?: any, receive?: any): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!give && !receive) {
                return reject(new Error('cart is empty'));
            }

            const start = Date.now();
            const offer = this.bot.manager.createOffer(this.partner, this.token);

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
                        this.addOurItem(item.sku, item.amount || 1);
                    }
                }

                // Actually add our items to the offer and validate inventory
                for (const sku in this.our) {
                    if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
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
                        const assetidsToTrade = ourAssetids.slice(0, amount);
                        for (const assetid of assetidsToTrade) {
                            offer.addMyItem({
                                assetid: assetid,
                                appid: 440,
                                contextid: '2',
                                amount: 1
                            });
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
