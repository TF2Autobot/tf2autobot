import { PricerOptions } from '../../../classes/IPricer';
import { apiRequest, Method } from '../../apiRequest';

export interface PricesCurrency {
    keys: number;
    metal: number;
}

export interface CustomPricesResponse {
    success: boolean;
    message?: string;
}

export interface CustomPricesGetItemPriceResponse extends CustomPricesResponse {
    sku?: string;
    name?: string;
    currency?: string;
    source?: string;
    time?: number;
    buy?: PricesCurrency;
    sell?: PricesCurrency;
    message?: string;
}

export interface CustomPricesGetPricelistResponse extends CustomPricesResponse {
    currency?: string | null;
    items?: PricesItem[];
}

export interface PricesItem {
    sku: string;
    name: string;
    source: string;
    time: number;
    buy: PricesCurrency | null;
    sell: PricesCurrency | null;
}

export interface CustomPricesItemMessageEvent {
    type: string;
    data: PricesItem;
}

export interface CustomPricesGetItemPriceResponse extends CustomPricesResponse {
    sku?: string;
    name?: string;
    currency?: string;
    source?: string;
    time?: number;
    buy?: PricesCurrency;
    sell?: PricesCurrency;
    message?: string;
}

export interface PricesSale {
    id: string;
    steamid: string;
    automatic: boolean;
    attributes: any;
    intent: number;
    currencies: PricesCurrency;
    time: number;
}

export interface CustomPricerPricesRequestCheckResponse extends CustomPricesResponse {
    sku: string;
    name: string;
}

export default class CustomPricerApi {
    public constructor(
        public url?: string,
        public apiToken?: string
    ) {}

    private apiRequest<R extends CustomPricesResponse>(
        httpMethod: Method,
        path: string,
        params?: Record<string, any>,
        data?: Record<string, any>
    ): Promise<R> {
        return new Promise((resolve, reject) => {
            apiRequest({
                url: `${this.url ? this.url : 'https://pricedb.io/api'}${path}`,
                method: httpMethod,
                headers: {
                    'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
                },
                apiToken: this.apiToken,
                params,
                data,
                timeout: 30000
            })
                .then(response => resolve(response as R))
                .catch(err => reject(err));
        });
    }

    requestCheck(sku: string): Promise<CustomPricerPricesRequestCheckResponse> {
        // If no url, since we default to pricedb, then the `items` endpoint should become `item`
        // https://docs.pricedb.io/docs/pricedb#endpoint-get-api-items
        return this.apiRequest('POST', `/item${this.url ? '' : 's'}/${sku}`, { source: 'bptf' });
    }

    getPrice(sku: string): Promise<CustomPricesGetItemPriceResponse> {
        return this.apiRequest('GET', `/item${this.url ? '' : 's'}/${sku}`, { src: 'bptf' });
    }

    getPricelist(): Promise<CustomPricesGetPricelistResponse> {
        return this.apiRequest('GET', '/items', { src: 'bptf' });
    }

    getOptions(): PricerOptions {
        return {
            pricerUrl: this.url,
            pricerApiToken: this.apiToken
        };
    }
}
