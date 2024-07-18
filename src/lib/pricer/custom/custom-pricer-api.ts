import axios, { AxiosError, AxiosRequestConfig, Method } from 'axios';
import filterAxiosError from '@tf2autobot/filter-axios-error';
import { PricerOptions } from '../../../classes/IPricer';

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
    public constructor(public url?: string, public apiToken?: string) {}

    private apiRequest<R extends CustomPricesResponse>(
        httpMethod: string,
        path: string,
        params?: Record<string, any>,
        data?: Record<string, any>
    ): Promise<R> {
        const options: AxiosRequestConfig = {
            method: httpMethod as Method,
            url: `${this.url ? this.url : 'https://api.prices.tf'}${path}`,
            headers: {
                // This one is okay to keep I guess
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
            },
            timeout: 30000
        };

        if (this.apiToken) {
            options.headers['Authorization'] = `Token ${this.apiToken}`;
        }

        if (params) {
            options.params = params;
        }

        if (data) {
            options.data = data;
        }

        return new Promise((resolve, reject) => {
            axios(options)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                .then(response => resolve(response.data))
                .catch((err: AxiosError) => reject(filterAxiosError(err)));
        });
    }

    requestCheck(sku: string): Promise<CustomPricerPricesRequestCheckResponse> {
        return this.apiRequest('POST', `/items/${sku}`, { source: 'bptf' });
    }

    getPrice(sku: string): Promise<CustomPricesGetItemPriceResponse> {
        return this.apiRequest('GET', `/items/${sku}`, { src: 'bptf' });
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
