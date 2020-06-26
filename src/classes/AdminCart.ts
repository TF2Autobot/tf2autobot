import pluralize from 'pluralize';
import SKU from 'tf2-sku';

import Cart from './Cart';
import Inventory from './Inventory';

export = AdminCart;

class AdminCart extends Cart {
    protected preSendOffer(): Promise<void> {
        return Promise.resolve();
    }

    constructOffer(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.isEmpty()) {
                return reject('cart is empty');
            }

            const offer = this.bot.manager.createOffer(this.partner);

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

            // Load their inventory

            const theirInventory = new Inventory(this.partner, this.bot.manager, this.bot.schema);

            theirInventory.fetch().asCallback(err => {
                if (err) {
                    return reject('Failed to load inventories (Steam might be down)');
                }

                // Add their items

                for (const sku in this.their) {
                    if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                        continue;
                    }

                    let amount = this.getTheirCount(sku);
                    const theirAssetids = theirInventory.findBySKU(sku, true);

                    if (amount > theirAssetids.length) {
                        amount = theirAssetids.length;
                        // Remove the item from the cart
                        this.removeTheirItem(sku);

                        if (theirAssetids.length === 0) {
                            alteredMessages.push(
                                "you don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false))
                            );
                        } else {
                            alteredMessages.push(
                                'you only have ' +
                                    pluralize(
                                        this.bot.schema.getName(SKU.fromString(sku), false),
                                        theirAssetids.length,
                                        true
                                    )
                            );

                            // Add the max amount to the offer
                            this.addTheirItem(sku, theirAssetids.length);
                        }
                    }

                    for (let i = 0; i < amount; i++) {
                        offer.addTheirItem({
                            appid: 440,
                            contextid: '2',
                            assetid: theirAssetids[i]
                        });
                    }
                }

                offer.data('dict', { our: this.our, their: this.their });

                this.offer = offer;

                return resolve(alteredMessages.length === 0 ? undefined : alteredMessages.join(', '));
            });
        });
    }

    constructOfferWithWeapons(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.isEmpty()) {
                return reject('cart is empty');
            }

            const offer = this.bot.manager.createOffer(this.partner);

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

            // Load their inventory

            const theirInventory = new Inventory(this.partner, this.bot.manager, this.bot.schema);

            theirInventory.fetch().asCallback(err => {
                if (err) {
                    return reject('Failed to load inventories (Steam might be down)');
                }

                // Add their items

                for (const sku in this.their) {
                    if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                        continue;
                    }

                    let amount = this.getTheirCount(sku);
                    const theirAssetids = theirInventory.findBySKU(sku, true);

                    if (amount > theirAssetids.length) {
                        amount = theirAssetids.length;
                        // Remove the item from the cart
                        this.removeTheirItem(sku);

                        if (theirAssetids.length === 0) {
                            alteredMessages.push(
                                "you don't have any " + pluralize(this.bot.schema.getName(SKU.fromString(sku), false))
                            );
                        } else {
                            alteredMessages.push(
                                'you only have ' +
                                    pluralize(
                                        this.bot.schema.getName(SKU.fromString(sku), false),
                                        theirAssetids.length,
                                        true
                                    )
                            );

                            // Add the max amount to the offer
                            this.addTheirItem(sku, theirAssetids.length);
                        }
                    }

                    for (let i = 0; i < amount; i++) {
                        offer.addTheirItem({
                            appid: 440,
                            contextid: '2',
                            assetid: theirAssetids[i]
                        });
                    }
                }

                offer.data('dict', { our: this.our, their: this.their });

                this.offer = offer;

                return resolve(alteredMessages.length === 0 ? undefined : alteredMessages.join(', '));
            });
        });
    }
}
