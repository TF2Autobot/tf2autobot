import axios, { AxiosRequestConfig, Method, AxiosError } from 'axios';
import filterAxiosError from '@tf2autobot/filter-axios-error';

export async function apiRequest<B>(
    httpMethod: string,
    url: string,
    params?: Record<string, any>,
    data?: Record<string, any>,
    headers?: Record<string, unknown>
): Promise<B> {
    if (!headers) {
        headers = {};
    }

    const options: AxiosRequestConfig = {
        method: httpMethod as Method,
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

    return new Promise((resolve, reject) => {
        void axios(options)
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
