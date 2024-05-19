import axios, { AxiosRequestConfig, Method, AxiosError } from 'axios';
import filterAxiosError from '@tf2autobot/filter-axios-error';

export async function apiRequest<B>({
    method,
    url,
    params,
    data,
    headers,
    apiToken
}: {
    method: Method;
    url: string;
    params?: Record<string, any>;
    data?: Record<string, any>;
    headers?: Record<string, unknown>;
    signal?: AbortSignal;
    apiToken?: string;
}): Promise<B> {
    if (!headers) {
        headers = {};
    }

    const options: AxiosRequestConfig = {
        method,
        url,
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

    if (apiToken) {
        options.headers['Authorization'] = `Token ${apiToken}`;
    }

    return new Promise((resolve, reject) => {
        axios(options)
            .then(response => resolve(response.data as B))
            .catch((err: AxiosError) => reject(filterAxiosError(err)));
    });
}
