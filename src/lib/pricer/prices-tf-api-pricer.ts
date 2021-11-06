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
import { PricesGetItemPriceResponse, PricesItemMessageEvent } from './apis/prices-tf-interfaces';

export default class PricesTfApiPricer implements IPricer {
    private socketManager: PricesTfSocketManager;

    public constructor(private api: PricesTfApi) {
        this.socketManager = new PricesTfSocketManager(api.url, api.apiToken ? api.apiToken : null);
    }

    parseRawGetItemPriceResponse(raw: string): PricesItemMessageEvent {
        return JSON.parse(raw) as PricesItemMessageEvent;
    }

    parseMessageEvent(event: MessageEvent<string>): Item {
        const r = this.parseRawGetItemPriceResponse(event.data).data;
        return {
            buy: r.buy ? new Currencies(r.buy) : null,
            sell: r.sell ? new Currencies(r.sell) : null,
            sku: r.sku,
            source: r.source,
            time: r.time
        };
    }

    async requestCheck(sku: string): Promise<RequestCheckResponse> {
        return this.api.requestCheck(sku);
    }

    public parsePricesGetItemPriceResponse(response: PricesGetItemPriceResponse): GetItemPriceResponse {
        return {
            sku: response.sku,
            currency: response.currency,
            source: response.source,
            time: response.time,
            buy: response.buy ? new Currencies(response.buy) : null,
            sell: response.sell ? new Currencies(response.sell) : null,
            message: response.message
        };
    }

    async getPrice(sku: string): Promise<GetItemPriceResponse> {
        const response = await this.api.getPrice(sku);
        return this.parsePricesGetItemPriceResponse(response);
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
                buy: i.buy ? new Currencies(i.buy) : null,
                sell: i.sell ? new Currencies(i.sell) : null
            }))
        };
    }

    getOptions(): PricerOptions {
        return this.api.getOptions();
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

    bindHandlePriceEvent(onPriceChange: (data: GetItemPriceResponse) => void): void {
        this.socketManager.on('price', (data: PricesGetItemPriceResponse) => {
            const item = this.parsePricesGetItemPriceResponse(data);
            onPriceChange(item);
        });
    }
}
