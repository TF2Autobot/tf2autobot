import { OptionsWithUrl, ResponseAsJSON } from 'request';

import request from 'request-retry-dayjs';
import { PricerOptions } from '../../../classes/IPricer';
import {
    PricesGetItemPriceResponse,
    PricesGetPricelistResponse,
    PricesRequestCheckResponse,
    PricesResponse
} from './prices-tf-interfaces';

export default class PricesTfApi {
    public constructor(public url?: string, public apiToken?: string) {}

    private apiRequest<I, R extends PricesResponse>(httpMethod: string, path: string, input: I): Promise<R> {
        const options: OptionsWithUrl & { headers: Record<string, unknown> } = {
            method: httpMethod,
            url: `${this.url ? this.url : 'https://api.prices.tf'}${path}`,
            headers: {
                // This one is okay to keep I guess
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
            },
            json: true,
            gzip: true,
            timeout: 30000
        };

        if (this.apiToken) {
            options.headers.Authorization = `Token ${this.apiToken}`;
        }

        options[httpMethod === 'GET' ? 'qs' : 'body'] = input;

        return new Promise((resolve, reject) => {
            void request(options, (err, response: ResponseAsJSON, body: R) => {
                if (err) {
                    reject(err);
                }

                resolve(body);
            });
        });
    }

    requestCheck(sku: string): Promise<PricesRequestCheckResponse> {
        return this.apiRequest('POST', `/items/${sku}`, { source: 'bptf' });
    }

    getPrice(sku: string): Promise<PricesGetItemPriceResponse> {
        return this.apiRequest('GET', `/items/${sku}`, { src: 'bptf' });
    }

    getPricelist(): Promise<PricesGetPricelistResponse> {
        return this.apiRequest('GET', '/items', { src: 'bptf' });
    }

    getOptions(): PricerOptions {
        return {
            pricerUrl: this.url,
            pricerApiToken: this.apiToken
        };
    }
}
