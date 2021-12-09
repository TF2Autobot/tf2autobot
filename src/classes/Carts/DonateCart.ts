import pluralize from 'pluralize';
import SKU from '@tf2autobot/tf2-sku';
import Cart from './Cart';
import log from '../../lib/logger';

export default class DonateCart extends Cart {
    protected preSendOffer(): Promise<void> {
        return Promise.resolve();
    }

    constructOffer(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.isEmpty) {
                return reject('cart is empty');
            }

            const start = Date.now();
            const offer = this.bot.manager.createOffer(
                'https://steamcommunity.com/tradeoffer/new/?partner=432099474&token=Cc9yZSv0'
                // Backpack.tf donation bot - https://steamcommunity.com/id/teenytinybot
            );

            const alteredMessages: string[] = [];

            // Add our items
            const ourInventory = this.bot.inventoryManager.getInventory;

            for (const sku in this.our) {
                if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                    continue;
                }

                let amount = this.getOurCount(sku);
                const ourAssetids = ourInventory.findBySKU(sku, true);
                const ourAssetidsCount = ourAssetids.length;

                if (amount > ourAssetidsCount) {
                    amount = ourAssetidsCount;
                    // Remove the item from the cart
                    this.removeOurItem(sku);

                    if (ourAssetidsCount === 0) {
                        alteredMessages.push(
                            "I don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false))
                        );
                    } else {
                        alteredMessages.push(
                            'I only have ' +
                                pluralize(this.bot.schema.getName(SKU.fromString(sku), false), ourAssetidsCount, true)
                        );

                        // Add the max amount to the offer
                        this.addOurItem(sku, ourAssetidsCount);
                    }
                }

                let missing = amount;
                let isSkipped = false;

                for (let i = 0; i < ourAssetidsCount; i++) {
                    if (
                        this.bot.options.miscSettings.skipItemsInTrade.enable &&
                        this.bot.trades.isInTrade(ourAssetids[i])
                    ) {
                        isSkipped = true;
                        continue;
                    }
                    const isAdded = offer.addMyItem({
                        appid: 440,
                        contextid: '2',
                        assetid: ourAssetids[i]
                    });

                    if (isAdded) {
                        // The item was added to the offer
                        missing--;
                        if (missing === 0) {
                            // We added all the items
                            break;
                        }
                    }
                }

                if (missing !== 0) {
                    log.warn(
                        `Failed to create offer because missing our items${
                            isSkipped ? '. Reason: Item(s) are currently being used in another active trade' : ''
                        }`,
                        {
                            sku: sku,
                            required: amount,
                            missing: missing
                        }
                    );

                    return reject(
                        `Something went wrong while constructing the offer${
                            isSkipped ? '. Reason: Item(s) are currently being used in another active trade.' : ''
                        }`
                    );
                }
            }

            if (Object.keys(this.their).length === 0) {
                // Done constructing offer

                offer.data('dict', { our: this.our, their: this.their });
                offer.data('donation', true);

                this.offer = offer;

                const timeTaken = Date.now() - start;
                offer.data('constructOfferTime', timeTaken);
                log.debug(`Constructing offer took ${timeTaken} ms`);

                return resolve(alteredMessages.length === 0 ? undefined : alteredMessages.join(', '));
            }
        });
    }
}
