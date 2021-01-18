import { OptionsWithUrl, ResponseAsJSON } from 'request';

import request from 'request-retry-dayjs';

export interface PricesResponse {
    success: boolean;
    message?: string;
}

export interface GetSchemaResponse extends PricesResponse {
    version: string;
    time: number;
    raw: any;
}

export interface GetOverviewResponse extends PricesResponse {
    items: ItemOverview[];
}

export interface ItemOverview {
    name: string;
    sku: string;
}

export interface GetPricelistResponse extends PricesResponse {
    currency?: any;
    items?: Item[];
}

export interface Item {
    sku: string;
    name: string;
    source: string;
    time: number;
    buy: KeysMetal | null;
    sell: KeysMetal | null;
}

export interface KeysMetal {
    keys: number;
    metal: number;
}

export interface GetItemLinks extends PricesResponse {
    sku: string;
    name: string;
    links: Links;
}

export interface Links {
    ptf: string;
    mptf: string;
    scm: string;
    bptf: string;
}

export interface GetItemPriceResponse extends PricesResponse {
    sku?: string;
    name?: string;
    currency?: string;
    source?: string;
    time?: number;
    buy?: KeysMetal;
    sell?: KeysMetal;
    message?: string;
}

export interface GetItemHistoryResponse extends PricesResponse {
    sku: string;
    name: string;
    source: string;
    currency: any;
    history: History[];
}

export interface History {
    time: number;
    buy: KeysMetal;
    sell: KeysMetal;
}

export interface GetItemSalesResponse extends PricesResponse {
    sku: string;
    name: string;
    sales: Sale[];
}

export interface Sale {
    id: string;
    steamid: string;
    automatic: boolean;
    attributes: any;
    intent: number;
    currencies: KeysMetal;
    time: number;
}

export interface RequestCheckResponse extends PricesResponse {
    sku: string;
    name: string;
}

export function getSchema(): Promise<GetSchemaResponse> {
    return apiRequest('GET', '/schema', { appid: 440 });
}

export function getPricelist(source: string): Promise<GetPricelistResponse> {
    return apiRequest('GET', '/items', { src: source });
}

export function getPrice(sku: string, source: string): Promise<GetItemPriceResponse> {
    return apiRequest('GET', `/items/${sku}`, { src: source });
}

export function getPriceHistory(sku: string, source: string): Promise<GetItemHistoryResponse> {
    return apiRequest('GET', `/items/${sku}/history`, { src: source });
}

export function getSales(sku: string, source: string): Promise<GetItemSalesResponse> {
    return apiRequest('GET', `/items/${sku}/sales`, { src: source });
}

export function requestCheck(sku: string, source: string): Promise<RequestCheckResponse> {
    return apiRequest('POST', `/items/${sku}`, { source: source });
}

export function getLinks(sku: string): Promise<GetItemLinks> {
    return apiRequest('GET', `/items/${sku}/links`, {});
}

export function apiRequest<I, R extends PricesResponse>(httpMethod: string, path: string, input: I): Promise<R> {
    const options: OptionsWithUrl & { headers: Record<string, unknown> } = {
        method: httpMethod,
        url: `https://api.prices.tf${path}`,
        headers: {
            'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
        },
        json: true,
        gzip: true,
        timeout: 30000
    };

    if (process.env.PRICESTF_API_KEY) options.headers.Authorization = `Token ${process.env.PRICESTF_API_TOKEN}`;

    options[httpMethod === 'GET' ? 'qs' : 'body'] = input;

    return new Promise((resolve, reject) => {
        void request(options, (err, response: ResponseAsJSON, body: R) => {
            if (err) reject(err);

            resolve(body);
        });
    });
}
