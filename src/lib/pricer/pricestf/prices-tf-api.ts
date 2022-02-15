import { OptionsWithUrl, ResponseAsJSON } from 'request';

import request from 'request-retry-dayjs';
import { PricerOptions } from '../../../classes/IPricer';
import log from '../../logger';

export interface PricesTfRequestCheckResponse {
    enqueued: boolean;
}

export interface PricesTfItem {
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

export interface PricesTfItemMessageEvent {
    type: string;
    data?: PricesTfItem;
}

export interface PricesTfResponseMeta {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
}

export interface PricesTfGetPricesResponse {
    items: PricesTfItem[];
    meta: PricesTfResponseMeta;
}

export interface PricesTfAuthAccessResponse {
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

    public static async apiRequest<I, B>(
        httpMethod: string,
        path: string,
        input: I,
        headers?: Record<string, unknown>,
        customURL?: string
    ): Promise<B> {
        const options: OptionsWithUrl & { headers: Record<string, unknown> } = {
            method: httpMethod,
            url: customURL ? `${customURL}${path}` : `${this.URL}${path}`,
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

    static async requestAuthAccess(): Promise<PricesTfAuthAccessResponse> {
        return PricesTfApi.apiRequest('POST', '/auth/access', {});
    }

    async setupToken(): Promise<void> {
        try {
            const r = await PricesTfApi.requestAuthAccess();
            log.debug('got new access token');
            this.token = r.accessToken;
        } catch (e) {
            log.error(e as Error);
        }
    }

    async requestCheck(sku: string): Promise<PricesTfRequestCheckResponse> {
        return this.authedApiRequest('POST', `/prices/${sku}/refresh`, {});
    }

    async getPrice(sku: string): Promise<PricesTfItem> {
        return this.authedApiRequest('GET', `/prices/${sku}`, {});
    }

    async getPricelistPage(page: number): Promise<PricesTfGetPricesResponse> {
        return this.authedApiRequest('GET', '/prices', { page, limit: 100 });
    }

    getOptions(): PricerOptions {
        return {
            pricerUrl: 'https://api2.prices.tf'
        };
    }
}
