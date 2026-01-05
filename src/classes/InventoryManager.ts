import Currencies from '@tf2autobot/tf2-currencies';
import Inventory from './Inventory';
import Pricelist from './Pricelist';

export default class InventoryManager {
    constructor(
        private readonly pricelist: Pricelist,
        private inventory: Inventory = null
    ) {
        if (inventory !== null) {
            this.inventory = inventory;
        }

        this.pricelist = pricelist;
    }

    set setInventory(inventory: Inventory) {
        this.inventory = inventory;
    }

    get getInventory(): Inventory {
        return this.inventory;
    }

    get getPureValue(): { keys: number; metal: number } {
        const keyPrice = this.pricelist.getKeyPrice;
        const currencies = this.inventory.getCurrencies([], true);

        return {
            keys: currencies['5021;6'].length * keyPrice.toValue(),
            metal: currencies['5002;6'].length * 9 + currencies['5001;6'].length * 3 + currencies['5000;6'].length
        };
    }

    // isOverstocked(sku: string, buying: boolean, diff: number): boolean {
    //     return this.amountCanTrade(sku, buying) + (buying ? -diff : diff) < 0;
    // }

    amountCanTrade({
        priceKey,
        tradeIntent,
        getGenericAmount = false
    }: {
        priceKey: string;
        tradeIntent: 'buying' | 'selling';
        getGenericAmount?: boolean;
    }): number {
        if (this.inventory === undefined) {
            throw new Error('Inventory has not been set yet');
        }

        // Pricelist entry
        let match = this.pricelist.getPriceBySkuOrAsset({ priceKey, onlyEnabled: true, getGenericPrice: false });
        const genericMatch =
            !match && getGenericAmount
                ? this.pricelist.getPrice({ priceKey, onlyEnabled: true, getGenericPrice: true })
                : null;
        match = genericMatch || match;
        // Amount in inventory should only use generic amount if there is a generic sku
        const amount = genericMatch
            ? this.inventory.getAmountOfGenerics({ genericSkuString: priceKey, tradableOnly: true })
            : this.inventory.getAmount({ priceKey, includeNonNormalized: true, tradableOnly: true });

        if (match === null) {
            // No price for item
            return 0;
        }

        if ('buying' === tradeIntent && match.max === -1) {
            // We are buying, and we don't have a limit
            return Infinity;
        }

        if (match.intent !== 2 && match.intent !== ('buying' === tradeIntent ? 0 : 1)) {
            // We are not buying / selling the item
            return 0;
        }

        let canTrade = match['buying' === tradeIntent ? 'max' : 'min'] - amount;
        if ('selling' === tradeIntent) {
            canTrade *= -1;
        }

        if (canTrade > 0) {
            // We can buy / sell the item
            return canTrade;
        }

        return 0;
    }

    isCanAffordToBuy(buyingPrice: Currencies, inventory: Inventory): boolean {
        const keyPrice = this.pricelist.getKeyPrice;

        const buyingKeysValue = buyingPrice.keys * keyPrice.toValue();
        const buyingMetalValue = Currencies.toScrap(buyingPrice.metal);

        const avaiableCurrencies = inventory.getCurrencies([], true);

        const availableKeysValue = avaiableCurrencies['5021;6'].length * keyPrice.toValue();
        const availableMetalsValue =
            avaiableCurrencies['5002;6'].length * 9 +
            avaiableCurrencies['5001;6'].length * 3 +
            avaiableCurrencies['5000;6'].length;

        return (
            (buyingPrice.keys > 0 ? availableKeysValue >= buyingKeysValue : true) &&
            availableMetalsValue >= buyingMetalValue
        );
    }

    amountCanAfford(useKeys: boolean, price: Currencies, inventory: Inventory, weapons: string[]): number {
        const keyPrice = this.pricelist.getKeyPrice;
        const value = price.toValue(keyPrice.metal);
        const buyerCurrencies = inventory.getCurrencies(weapons, true);

        let totalValue =
            buyerCurrencies['5002;6'].length * 9 +
            buyerCurrencies['5001;6'].length * 3 +
            buyerCurrencies['5000;6'].length;

        if (useKeys) {
            totalValue += buyerCurrencies['5021;6'].length * keyPrice.toValue();
        }
        return Math.floor(totalValue / value);
    }
}
