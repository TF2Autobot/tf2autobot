import axios, { AxiosRequestConfig, Method, AxiosError } from 'axios';
import filterAxiosError, { ErrorFiltered } from '@tf2autobot/filter-axios-error';
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

    private async authedApiRequest<B>(
        httpMethod: string,
        path: string,
        params?: Record<string, any>,
        data?: Record<string, any>,
        headers?: Record<string, unknown>
    ): Promise<B> {
        try {
            if (this.token === '') {
                await this.setupToken();
            }

            return await PricesTfApi.apiRequest(httpMethod, path, params, data, {
                Authorization: 'Bearer ' + this.token,
                ...headers
            });
        } catch (e) {
            const err = e as ErrorFiltered;
            if (err?.status === 401) {
                log.debug('Requesting new token from prices.tf due to 401');
                await this.setupToken();
                return this.authedApiRequest(httpMethod, path, params, data, headers);
            }
            throw err;
        }
    }

    public static async apiRequest<B>(
        httpMethod: string,
        path: string,
        params?: Record<string, any>,
        data?: Record<string, any>,
        headers?: Record<string, unknown>,
        customURL?: string
    ): Promise<B> {
        if (!headers) {
            headers = {};
        }

        const options: AxiosRequestConfig = {
            method: httpMethod as Method,
            url: path,
            baseURL: customURL ? customURL : this.URL,
            headers: {
                'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION,
                ...headers
            },
            timeout: 30000
        };

        if (params) {
            options.params = params;
        }

        if (data) {
            options.data = data;
        }

        return new Promise((resolve, reject) => {
            axios(options)
                .then(response => {
                    const body = response.data as B;
                    resolve(body);
                })
                .catch((err: AxiosError) => {
                    if (err) {
                        reject(filterAxiosError(err));
                    }
                });
        });
    }

    static async requestAuthAccess(): Promise<PricesTfAuthAccessResponse> {
        return PricesTfApi.apiRequest('POST', '/auth/access');
    }

    async setupToken(): Promise<void> {
        try {
            const r = await PricesTfApi.requestAuthAccess();
            this.token = r.accessToken;
        } catch (e) {
            log.error(e as Error);
        }
    }

    async requestCheck(sku: string): Promise<PricesTfRequestCheckResponse> {
        return this.authedApiRequest('POST', `/prices/${sku}/refresh`);
    }

    async getPrice(sku: string): Promise<PricesTfItem> {
        return this.authedApiRequest('GET', `/prices/${sku}`);
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
