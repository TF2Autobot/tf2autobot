import Currencies from '@tf2autobot/tf2-currencies';
import IPricer, {
    GetItemPriceResponse,
    GetPricelistResponse,
    Item,
    PricerOptions,
    RequestCheckResponse
} from '../../../classes/IPricer';
import PriceDbApi, { PriceDbPrice } from './pricedb-api';
import PriceDbSocketManager from './pricedb-socket-manager';

export default class PriceDbPricer implements IPricer {
    private socketManager: PriceDbSocketManager;

    get isPricerConnecting(): boolean {
        return this.socketManager.isConnecting;
    }

    constructor(private api: PriceDbApi) {
        this.socketManager = new PriceDbSocketManager();
    }

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
        const result = await this.api.priceCheck(sku);
        return {
            sku: result.success ? sku : null
        };
    }

    bindHandlePriceEvent(onPriceChange: (item: GetItemPriceResponse) => void): void {
        this.socketManager.on('price', (data: PriceDbPrice) => {
            const priceUpdate: GetItemPriceResponse = {
                sku: data.sku,
                source: data.source,
                time: data.time,
                buy: new Currencies(data.buy),
                sell: new Currencies(data.sell)
            };
            onPriceChange(priceUpdate);
        });
    }

    connect(enabled: boolean): void {
        if (enabled) {
            this.socketManager.connect();
        }
    }

    shutdown(enabled: boolean): void {
        if (enabled) {
            this.socketManager.shutdown();
        }
    }

    init(enabled: boolean): void {
        if (enabled) {
            this.socketManager.init();
        }
    }
}
