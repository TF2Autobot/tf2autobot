import Currencies from 'tf2-currencies-2';
import Inventory from './Inventory';
import Pricelist from './Pricelist';
import SKU from 'tf2-sku-2';

export default class InventoryManager {
    constructor(private readonly pricelist: Pricelist, private inventory: Inventory = null) {
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
        const currencies = this.inventory.getCurrencies([]);

        return {
            keys: currencies['5021;6'].length * keyPrice.toValue(),
            metal: currencies['5002;6'].length * 9 + currencies['5001;6'].length * 3 + currencies['5000;6'].length
        };
    }

    // isOverstocked(sku: string, buying: boolean, diff: number): boolean {
    //     return this.amountCanTrade(sku, buying) + (buying ? -diff : diff) < 0;
    // }

    amountCanTrade(sku: string, buying: boolean, generics = false): number {
        if (this.inventory === undefined) {
            throw new Error('Inventory has not been set yet');
        }

        let genericCheck = generics;
        let genericIndex = -1; // index of a generic match
        // if we looking at amount we can trade and the sku is a generic unusual, always set generic to true
        const isGenericSku = /^[0-9]*;5$/.test(sku);
        if (isGenericSku) {
            genericCheck = true;
        }

        const gSku = SKU.fromString(sku);
        gSku.effect = null;
        if (generics) {
            // figure out if we even have a generic sku
            // Index of of item in Pricelist
            genericIndex = this.pricelist.getIndex(null, gSku);
        }
        const normalIndex = this.pricelist.getIndex(sku);

        // Pricelist entry
        const match =
            genericCheck && genericIndex !== -1 && normalIndex === -1
                ? this.pricelist.getPrice(SKU.fromObject(gSku), true, true)
                : this.pricelist.getPrice(sku, true);

        // Amount in inventory should only use generic amount if there is a generic sku
        const amount =
            genericCheck && match && genericIndex !== -1
                ? this.inventory.getAmountOfGenerics(SKU.fromObject(gSku), true)
                : this.inventory.getAmount(sku, true);

        if (match === null) {
            // No price for item
            return 0;
        }

        if (buying && match.max === -1) {
            // We are buying, and we don't have a limit
            return Infinity;
        }

        if (match.intent !== 2 && match.intent !== (buying ? 0 : 1)) {
            // We are not buying / selling the item
            return 0;
        }

        let canTrade = match[buying ? 'max' : 'min'] - amount;
        if (!buying) {
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

        const avaiableCurrencies = inventory.getCurrencies([]);

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
        const buyerCurrencies = inventory.getCurrencies(weapons);

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
