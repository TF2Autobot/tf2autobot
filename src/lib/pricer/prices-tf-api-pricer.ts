import IPricer, {
    GetItemPriceResponse,
    GetPricelistResponse,
    Item,
    PricerOptions,
    RequestCheckResponse
} from '../../classes/IPricer';
import Currencies from 'tf2-currencies-2';
import PricesTfSocketManager from './prices-tf-socket-manager';
import PricesTfApi from './apis/prices-tf-api';

export default class PricesTfApiPricer implements IPricer {
    private socketManager: PricesTfSocketManager;

    public constructor(private api: PricesTfApi) {
        this.socketManager = new PricesTfSocketManager(api.url, api.apiToken ? api.apiToken : null);
    }

    parseMessageEvent(event: MessageEvent<GetItemPriceResponse>): Item {
        const r = event.data;
        return {
            buy: r.buy,
            sell: r.sell,
            sku: r.sku,
            source: r.source,
            time: r.time
        };
    }

    async requestCheck(sku: string): Promise<RequestCheckResponse> {
        return this.api.requestCheck(sku);
    }

    async getPrice(sku: string): Promise<GetItemPriceResponse> {
        const response = await this.api.getPrice(sku);
        return {
            sku: response.sku,
            currency: response.currency,
            source: response.source,
            time: response.time,
            buy: new Currencies(response.buy),
            sell: new Currencies(response.sell),
            message: response.message
        };
    }

    async getPricelist(): Promise<GetPricelistResponse> {
        const response = await this.api.getPricelist();
        return {
            currency: response.currency,
            items: response.items.map(i => ({
                sku: i.sku,
                name: i.name,
                source: i.source,
                time: i.time,
                buy: new Currencies(i.buy),
                sell: new Currencies(i.sell)
            }))
        };
    }

    getOptions(): PricerOptions {
        return this.api.getOptions();
    }

    on(handler: (event: MessageEvent) => void): void {
        this.socketManager.on('message', handler);
    }

    shutdown(): void {
        this.socketManager.shutDown();
    }

    connect(): void {
        this.socketManager.connect();
    }

    init(): void {
        return this.socketManager.init();
    }
}
