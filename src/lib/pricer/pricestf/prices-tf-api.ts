import { OptionsWithUrl, ResponseAsJSON } from 'request';

import request from 'request-retry-dayjs';
import { PricerOptions } from '../../../classes/IPricer';

export interface Prices2RequestCheckResponse {
    sku: string;
    name: string;
}

export interface Prices2Item {
    sku: string;
    buyHalfScrap: number;
    buyKeys: number;
    buyKeyHalfScrap: number | null;
    sellHalfScrap: number;
    sellKeys: number;
    sellKeyHalfScrap: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface Prices2ItemMessageEvent {
    type: string;
    data?: Prices2Item;
}

export interface Prices2ResponseMeta {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
}

export interface Prices2GetPricesResponse {
    items: Prices2Item[];
    meta: Prices2ResponseMeta;
}

export interface Prices2AuthAccessResponse {
    accessToken: string;
}

export default class PricesTfApi {
    public static readonly URL = 'https://api2.prices.tf';

    public token = '';

    private async authedApiRequest<I, B>(
        httpMethod: string,
        path: string,
        input: I,
        headers?: Record<string, unknown>
    ): Promise<B> {
        try {
            return await PricesTfApi.apiRequest(httpMethod, path, input, {
                Authorization: 'Bearer ' + this.token,
                ...headers
            });
        } catch (e) {
            if (e && 401 === e['statusCode']) {
                await this.setupToken();
                return this.authedApiRequest(httpMethod, path, input, headers);
            }
            throw e;
        }
    }

    private static async apiRequest<I, B>(
        httpMethod: string,
        path: string,
        input: I,
        headers?: Record<string, unknown>
    ): Promise<B> {
        const options: OptionsWithUrl & { headers: Record<string, unknown> } = {
            method: httpMethod,
            url: `${this.URL}${path}`,
            headers: {
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                ...headers
            },
            json: true,
            timeout: 30000
        };

        options[httpMethod === 'GET' ? 'qs' : 'body'] = input;

        return new Promise((resolve, reject) => {
            void request(options, (err: Error, response: ResponseAsJSON, body: B) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(body);
                }
            });
        });
    }

    static async requestAuthAccess(): Promise<Prices2AuthAccessResponse> {
        return PricesTfApi.apiRequest('POST', '/auth/access', {});
    }

    async setupToken(): Promise<void> {
        const r = await PricesTfApi.requestAuthAccess();
        this.token = r.accessToken;
        return;
    }

    async requestCheck(sku: string): Promise<Prices2RequestCheckResponse> {
        return this.authedApiRequest('POST', `/prices/${sku}/refresh`, {});
    }

    async getPrice(sku: string): Promise<Prices2Item> {
        return this.authedApiRequest('GET', `/prices/${sku}`, {});
    }

    async getPricelistPage(page: number): Promise<Prices2GetPricesResponse> {
        return this.authedApiRequest('GET', '/prices', { page, limit: 100 });
    }

    getOptions(): PricerOptions {
        return {
            pricerUrl: 'https://api2.prices.tf'
        };
    }
}
