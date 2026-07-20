export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface FetchError extends Error {
    config: RequestInit;
    response: Response;
    status: number;
    data: any;
}

export interface FetchRes {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    config: RequestInit;
}

export async function apiRequest<B>({
    url,
    method = 'GET',
    params,
    data,
    headers = {},
    timeout = 30000,
    apiToken
}: {
    url: string;
    method?: Method;
    params?: Record<string, any>;
    data?: Record<string, any> | any[] | string;
    headers?: Record<string, unknown>;
    timeout?: number;
    apiToken?: string;
}): Promise<B> {
    const urlObj = new URL(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const reqHeaders = new Headers(headers as Record<string, string>);
    reqHeaders.set('User-Agent', 'TF2Autobot@' + process.env.BOT_VERSION);
    if (apiToken) {
        reqHeaders.set('Authorization', `Token ${apiToken}`);
    }

    const options: RequestInit = {
        method,
        headers: reqHeaders,
        signal: controller.signal
    };

    if (params) {
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null) {
                urlObj.searchParams.append(key, String(params[key]));
            }
        }
    }

    if (data !== undefined) {
        if (!reqHeaders.has('Content-Type')) {
            reqHeaders.set('Content-Type', 'application/json');
        }
        options.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    try {
        const response = await fetch(urlObj.toString(), options);
        let responseData: any;
        const textData = await response.text();

        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            responseData = JSON.parse(textData);
        } catch {
            responseData = textData;
        }

        if (!response.ok) {
            const error = new Error(`Request failed with status code ${response.status}`) as FetchError;
            error.config = options;
            error.response = response;
            error.status = response.status;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            error.data = responseData;
            throw error;
        }

        return responseData as B;
    } finally {
        clearTimeout(timeoutId);
    }
}
