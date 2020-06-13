import { UnknownDictionary } from '../types/common';
import { OptionsWithUrl, ResponseAsJSON } from 'request';

import request from '@nicklason/request-retry';

export function getSchema(): Promise<UnknownDictionary<any>> {
    return apiRequest('GET', '/schema', { appid: 440 });
}

export function getPricelist(source: string): Promise<UnknownDictionary<any>> {
    return apiRequest('GET', '/items', { src: source });
}

export function getPrice(sku: string, source: string): Promise<UnknownDictionary<any>> {
    return apiRequest('GET', `/items/${sku}`, { src: source });
}

export function requestCheck(sku: string, source: string): Promise<UnknownDictionary<any>> {
    return apiRequest('POST', `/items/${sku}`, { source: source });
}

function apiRequest(httpMethod: string, path: string, input: UnknownDictionary<any>): Promise<UnknownDictionary<any>> {
    const options: OptionsWithUrl & { headers: {} } = {
        method: httpMethod,
        url: `https://api.prices.tf${path}`,
        headers: {
            'User-Agent': 'tf2-automatic@' + process.env.BOT_VERSION
        },
        json: true,
        gzip: true,
        timeout: 30000
    };

    if (process.env.PRICESTF_API_KEY) {
        options.headers.Authorization = `Token ${process.env.PRICESTF_API_TOKEN}`;
    }

    options[httpMethod === 'GET' ? 'qs' : 'body'] = input;

    return new Promise(function(resolve, reject) {
        request(options, function(err: Error | null, response: ResponseAsJSON, body: UnknownDictionary<any>) {
            if (err) {
                return reject(err);
            }

            resolve(body);
        });
    });
}
