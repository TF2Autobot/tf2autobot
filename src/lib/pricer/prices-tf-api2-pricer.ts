import IPricer, {
    GetItemPriceResponse,
    GetPricelistResponse,
    Item,
    PricerOptions,
    RequestCheckResponse
} from '../../classes/IPricer';
import Currencies from 'tf2-currencies-2';
import logger from '../logger';
import PricesTfApi2SocketManager from './prices-tf-api2-socket-manager';
import { Prices2Item, Prices2ItemMessageEvent } from './apis/prices-tf-interfaces';
import PricesTfApi2 from './apis/pricer-tf-api2';

export default class PricesTfApi2Pricer implements IPricer {
    private socketManager: PricesTfApi2SocketManager;

    public constructor(private api: PricesTfApi2) {
        this.socketManager = new PricesTfApi2SocketManager(api);
    }

    getOptions(): PricerOptions {
        return this.api.getOptions();
    }

    async getPrice(sku: string): Promise<GetItemPriceResponse> {
        const response = await this.api.getPrice(sku);
        return this.parsePrices2Item(response);
    }

    async getPricelist(): Promise<GetPricelistResponse> {
        let prices: Prices2Item[] = [];
        let currentPage = 1;
        let totalPages = 0;

        let delay = 0;
        const minDelay = 200;

        do {
            await Promise.delay(delay);
            const start = new Date().getTime();
            logger.debug('Getting page ' + currentPage.toString() + ' of ' + totalPages.toString());
            const response = await this.api.getPricelistPage(currentPage);
            currentPage++;
            totalPages = response.meta.totalPages;
            prices = prices.concat(response.items);
            const time = new Date().getTime() - start;

            delay = Math.max(0, minDelay - time);
        } while (currentPage < totalPages);

        const parsed: Item[] = prices.map(v => this.parseItem(this.parsePrices2Item(v)));
        return { items: parsed };
    }

    async requestCheck(sku: string): Promise<RequestCheckResponse> {
        return await this.api.requestCheck(sku);
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

    parseRawPrices2Item(raw: string): Prices2ItemMessageEvent {
        return JSON.parse(raw) as Prices2ItemMessageEvent;
    }

    parsePrices2Item(item: Prices2Item): GetItemPriceResponse {
        return {
            sku: item.sku,
            buy: new Currencies({
                keys: item.buyKeys,
                metal: Currencies.toRefined(item.buyHalfScrap / 2)
            }),
            sell: new Currencies({
                keys: item.sellKeys,
                metal: Currencies.toRefined(item.sellHalfScrap / 2)
            }),
            source: 'bptf',
            time: Math.floor(new Date(item.updatedAt).getTime() / 1000)
        };
    }

    parseItem(r: GetItemPriceResponse): Item {
        return {
            buy: r.buy,
            sell: r.sell,
            sku: r.sku,
            source: r.source,
            time: r.time
        };
    }

    parseMessageEvent(e: MessageEvent<string>): Item {
        return this.parseItem(this.parsePrices2Item(this.parseRawPrices2Item(e.data).data));
    }

    bindHandlePriceEvent(onPriceChange: (data: GetItemPriceResponse) => void): void {
        this.socketManager.on('message', (data: MessageEvent) => {
            const item = this.parseMessageEvent(data);
            onPriceChange(item);
        });
    }
}
