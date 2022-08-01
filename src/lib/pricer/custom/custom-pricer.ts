import Currencies from '@tf2autobot/tf2-currencies';
import CustomPricerSocketManager from './custom-pricer-socket-manager';
import IPricer, {
    GetItemPriceResponse,
    GetPricelistResponse,
    Item,
    PricerOptions,
    RequestCheckResponse
} from '../../../classes/IPricer';
import CustomPricerApi, { CustomPricesGetItemPriceResponse, CustomPricesItemMessageEvent } from './custom-pricer-api';

export default class CustomPricer implements IPricer {
    private socketManager: CustomPricerSocketManager;

    public constructor(private api: CustomPricerApi) {
        this.socketManager = new CustomPricerSocketManager(api.url, api.apiToken ? api.apiToken : null);
    }

    parseRawGetItemPriceResponse(raw: string): CustomPricesItemMessageEvent {
        return JSON.parse(raw) as CustomPricesItemMessageEvent;
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

    public parsePricesGetItemPriceResponse(response: CustomPricesGetItemPriceResponse): GetItemPriceResponse {
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

    shutdown(enabled: boolean): void {
        if (enabled) {
            this.socketManager.shutDown();
        }
    }

    get isPricerConnecting(): boolean {
        return this.socketManager.isConnecting;
    }

    connect(enabled: boolean): void {
        if (enabled) {
            this.socketManager.connect();
        }
    }

    init(enabled: boolean): void {
        if (enabled) {
            this.socketManager.init();
        }
    }

    bindHandlePriceEvent(onPriceChange: (item: GetItemPriceResponse) => void): void {
        this.socketManager.on('price', (data: CustomPricesGetItemPriceResponse) => {
            const item = this.parsePricesGetItemPriceResponse(data);
            onPriceChange(item);
        });
    }
}
