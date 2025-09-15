import Currencies from '@tf2autobot/tf2-currencies';
import IPricer, {
    GetItemPriceResponse,
    GetPricelistResponse,
    Item,
    PricerOptions,
    RequestCheckResponse
} from '../../../classes/IPricer';
import PriceDbApi, { PriceDbPrice } from './pricedb-api';

export default class PriceDbPricer implements IPricer {
    public isPricerConnecting = false;
    constructor(private api: PriceDbApi) {}

    getOptions(): PricerOptions {
        return {
            pricerUrl: 'https://pricedb.io/api'
        };
    }

    async getPrice(sku: string): Promise<GetItemPriceResponse> {
        const data: PriceDbPrice = await this.api.getItemPrice(sku);
        return {
            sku: data.sku,
            source: data.source,
            time: data.time,
            buy: new Currencies(data.buy),
            sell: new Currencies(data.sell)
        };
    }

    async getPricelist(): Promise<GetPricelistResponse> {
        const data: PriceDbPrice[] = await this.api.getAllPrices();
        return {
            items: data.map(item => ({
                sku: item.sku,
                source: item.source,
                time: item.time,
                buy: item.buy ? new Currencies(item.buy) : null,
                sell: item.sell ? new Currencies(item.sell) : null
            }))
        };
    }

    async getBulkPrices(skus: string[]): Promise<Item[]> {
        const data: PriceDbPrice[] = await this.api.getBulkPrices(skus);
        return data.map(item => ({
            sku: item.sku,
            source: item.source,
            time: item.time,
            buy: item.buy ? new Currencies(item.buy) : null,
            sell: item.sell ? new Currencies(item.sell) : null
        }));
    }

    async requestCheck(sku: string): Promise<RequestCheckResponse> {
        // pricedb.io does not support price check requests, so just return a stub
        return {
            sku
        };
    }

    bindHandlePriceEvent(): void {
        // No socket support for pricedb.io
    }

    connect(): void {
        // No connect logic needed
    }

    shutdown(): void {
        // No shutdown logic needed
    }

    init(): void {
        // No init logic needed
    }
}
