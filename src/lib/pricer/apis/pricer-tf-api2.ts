import { OptionsWithUrl, ResponseAsJSON } from 'request';

import request from 'request-retry-dayjs';
import { PricerOptions } from '../../../classes/IPricer';
import logger from '../../logger';
import {
    Prices2AuthAccessResponse,
    Prices2GetPricesResponse,
    Prices2Item,
    Prices2RequestCheckResponse
} from './prices-tf-interfaces';

export default class PricesTfApi2 {
    public static readonly URL = 'https://api2.prices.tf';

    public constructor(public token?: string) {
        if (!token) {
            this.token = '';
        }
    }

    private async authedApiRequest<I, B>(
        httpMethod: string,
        path: string,
        input: I,
        headers?: Record<string, unknown>
    ): Promise<B> {
        try {
            return await PricesTfApi2.apiRequest(httpMethod, path, input, {
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
        return PricesTfApi2.apiRequest('POST', '/auth/access', {});
    }

    async setupToken(): Promise<void> {
        const r = await PricesTfApi2.requestAuthAccess();
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
            pricerUrl: 'https://api2.prices.tf',
            pricerApiToken: this.token
        };
    }
}
