import pluralize from 'pluralize';
import SKU from 'tf2-sku-2';

import Cart from './Cart';

export default class DonateCart extends Cart {
    protected preSendOffer(): Promise<void> {
        return Promise.resolve();
    }

    constructOffer(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.isEmpty()) {
                return reject('cart is empty');
            }

            const offer = this.bot.manager.createOffer(
                'https://steamcommunity.com/tradeoffer/new/?partner=432099474&token=Cc9yZSv0' // Backpack.tf donation bot
            );

            const alteredMessages: string[] = [];

            // Add our items
            const ourInventory = this.bot.inventoryManager.getInventory();

            for (const sku in this.our) {
                if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                    continue;
                }

                let amount = this.getOurCount(sku);
                const ourAssetids = ourInventory.findBySKU(sku, true);

                if (amount > ourAssetids.length) {
                    amount = ourAssetids.length;
                    // Remove the item from the cart
                    this.removeOurItem(sku);

                    if (ourAssetids.length === 0) {
                        alteredMessages.push(
                            "I don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false))
                        );
                    } else {
                        alteredMessages.push(
                            'I only have ' +
                                pluralize(this.bot.schema.getName(SKU.fromString(sku), false), ourAssetids.length, true)
                        );

                        // Add the max amount to the offer
                        this.addOurItem(sku, ourAssetids.length);
                    }
                }

                for (let i = 0; i < amount; i++) {
                    offer.addMyItem({
                        appid: 440,
                        contextid: '2',
                        assetid: ourAssetids[i]
                    });
                }
            }

            if (Object.keys(this.their).length === 0) {
                // Done constructing offer

                offer.data('dict', { our: this.our, their: this.their });

                this.offer = offer;

                return resolve(alteredMessages.length === 0 ? undefined : alteredMessages.join(', '));
            }
        });
    }

    constructOfferWithWeapons(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.isEmpty()) {
                return reject('cart is empty');
            }

            const offer = this.bot.manager.createOffer(
                'https://steamcommunity.com/tradeoffer/new/?partner=432099474&token=Cc9yZSv0' // Backpack.tf donation bot
            );

            const alteredMessages: string[] = [];

            // Add our items
            const ourInventory = this.bot.inventoryManager.getInventory();

            for (const sku in this.our) {
                if (!Object.prototype.hasOwnProperty.call(this.our, sku)) {
                    continue;
                }

                let amount = this.getOurCount(sku);
                const ourAssetids = ourInventory.findBySKU(sku, true);

                if (amount > ourAssetids.length) {
                    amount = ourAssetids.length;
                    // Remove the item from the cart
                    this.removeOurItem(sku);

                    if (ourAssetids.length === 0) {
                        alteredMessages.push(
                            "I don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false))
                        );
                    } else {
                        alteredMessages.push(
                            'I only have ' +
                                pluralize(this.bot.schema.getName(SKU.fromString(sku), false), ourAssetids.length, true)
                        );

                        // Add the max amount to the offer
                        this.addOurItem(sku, ourAssetids.length);
                    }
                }

                for (let i = 0; i < amount; i++) {
                    offer.addMyItem({
                        appid: 440,
                        contextid: '2',
                        assetid: ourAssetids[i]
                    });
                }
            }

            if (Object.keys(this.their).length === 0) {
                // Done constructing offer

                offer.data('dict', { our: this.our, their: this.their });

                this.offer = offer;

                return resolve(alteredMessages.length === 0 ? undefined : alteredMessages.join(', '));
            }
        });
    }
}
