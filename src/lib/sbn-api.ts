import { UnknownDictionary } from '../types/common';
import { OptionsWithUrl, ResponseAsJSON } from 'request';

import request from '@nicklason/request-retry';

export function getPriceSBN(sku: string): Promise<UnknownDictionary<any>> {
    return apiRequest('GET', `/prices/${sku}`);
}

function apiRequest(httpMethod: string, path: string, input?: UnknownDictionary<any>): Promise<UnknownDictionary<any>> {
    const options: OptionsWithUrl & { headers: {} } = {
        method: httpMethod,
        url: `https://api.sbn.tf${path}`,
        headers: {
            'User-Agent': 'TF2Autobot@' + process.env.BOT_VERSION
        },
        json: true,
        gzip: true,
        timeout: 30000
    };

    options[httpMethod === 'GET' ? 'qs' : 'body'] = input;

    return new Promise((resolve, reject) => {
        request(options, (err: Error | null, response: ResponseAsJSON, body: UnknownDictionary<any>) => {
            if (err) {
                return reject(err);
            }

            resolve(body);
        });
    });
}
