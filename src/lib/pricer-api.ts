import { OptionsWithUrl, ResponseAsJSON } from 'request';

import request from 'request-retry-dayjs';
import Pricer, {
    GetItemPriceResponse,
    GetItemSnapshotsResponse,
    GetPricelistResponse,
    GetSchemaResponse,
    PricerOptions,
    PricesResponse,
    RequestCheckResponse
} from '../classes/Pricer';

export default class PricerApi implements Pricer {
    public constructor(public url?: string, public apiToken?: string) {}

    private apiRequest<I, R extends PricesResponse>(httpMethod: string, path: string, input: I): Promise<R> {
        const options: OptionsWithUrl & { headers: Record<string, unknown> } = {
            method: httpMethod,
            url: `${this.url ? this.url : 'https://api.prices.tf'}${path}`,
            headers: {
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

    requestCheck(sku: string, source: string): Promise<RequestCheckResponse> {
        return this.apiRequest('POST', `/items/${sku}`, { source: source });
    }

    getSnapshots(sku: string, source: string): Promise<GetItemSnapshotsResponse> {
        return this.apiRequest('GET', `/items/${sku}/sales`, { src: source });
    }

    getPrice(sku: string, source: string): Promise<GetItemPriceResponse> {
        return this.apiRequest('GET', `/items/${sku}`, { src: source });
    }

    getPricelist(source: string): Promise<GetPricelistResponse> {
        return this.apiRequest('GET', '/items', { src: source });
    }

    getSchema(): Promise<GetSchemaResponse> {
        return this.apiRequest('GET', '/schema', { appid: 440 });
    }

    getOptions(): PricerOptions {
        return {
            pricerUrl: this.url,
            pricerApiToken: this.apiToken
        };
    }
}
