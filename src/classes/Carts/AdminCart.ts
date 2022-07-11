import pluralize from 'pluralize';
import SKU from '@tf2autobot/tf2-sku';
import Cart from './Cart';
import Inventory from '../Inventory';
import log from '../../lib/logger';

export default class AdminCart extends Cart {
    protected preSendOffer(): Promise<void> {
        return Promise.resolve();
    }

    constructOffer(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.isEmpty) return reject('cart is empty');

            const start = Date.now();
            const offer = this.bot.manager.createOffer(this.partner);

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

                this.offer = offer;

                const timeTaken = Date.now() - start;
                offer.data('constructOfferTime', timeTaken);
                log.debug(`Constructing offer took ${timeTaken} ms`);

                return resolve(alteredMessages.length === 0 ? undefined : alteredMessages.join(', '));
            }

            // Load their inventory

            const theirInventory = new Inventory(this.partner, this.bot, 'admin');

            void theirInventory
                .fetch()
                .then(() => {
                    // Add their items

                    for (const sku in this.their) {
                        if (!Object.prototype.hasOwnProperty.call(this.their, sku)) {
                            continue;
                        }

                        let amount = this.getTheirCount(sku);
                        const theirAssetids = theirInventory.findBySKU(sku, true);
                        const theirAssetidsCount = theirAssetids.length;

                        if (amount > theirAssetidsCount) {
                            amount = theirAssetidsCount;
                            // Remove the item from the cart
                            this.removeTheirItem(sku);

                            if (theirAssetidsCount === 0) {
                                alteredMessages.push(
                                    "you don't have any " +
                                        pluralize(this.bot.schema.getName(SKU.fromString(sku), false))
                                );
                            } else {
                                alteredMessages.push(
                                    'you only have ' +
                                        pluralize(
                                            this.bot.schema.getName(SKU.fromString(sku), false),
                                            theirAssetidsCount,
                                            true
                                        )
                                );

                                // Add the max amount to the offer substract current added amount
                                this.addTheirItem(
                                    sku,
                                    this.their[sku] ? theirAssetidsCount - this.their[sku] : theirAssetidsCount
                                );
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

                    theirInventory.clearFetch();

                    const timeTaken = Date.now() - start;
                    offer.data('constructOfferTime', timeTaken);
                    log.debug(`Constructing offer took ${timeTaken} ms`);

                    return resolve(alteredMessages.length === 0 ? undefined : alteredMessages.join(', '));
                })
                .catch((err: Error) => {
                    log.error(`Failed to load admin inventories (${this.partner.getSteamID64()}): `, err);
                    return reject(
                        'Failed to load your inventory, Steam might be down. ' +
                            'Please try again later. If you have your profile/inventory set to private, please set it to public and try again.'
                    );
                });
        });
    }
}
