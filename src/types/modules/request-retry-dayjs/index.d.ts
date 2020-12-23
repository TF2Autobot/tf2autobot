// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/requestretry/index.d.ts

declare module 'request-retry-dayjs' {
    import http = require('http');
    import request from 'request';

    type RetryStrategy = (err: Error, response: http.IncomingMessage, body: any) => boolean;
    type DelayStrategy = (err: Error, response: http.IncomingMessage, body: any) => number;
    interface RequestPromise extends request.Request {
        then: Promise<any>['then'];
        catch: Promise<any>['catch'];
        promise(): Promise<any>;
    }
    interface RetryRequestAPI extends request.RequestAPI<RequestPromise, RequestRetryOptions, request.RequiredUriUrl> {
        RetryStrategies: {
            HttpError: RetryStrategy;
            HTTPOrNetworkError: RetryStrategy;
            NetworkError: RetryStrategy;
        };
    }

    interface RequestRetryOptions extends request.CoreOptions {
        maxAttempts?: number;
        promiseFactory?(resolver: any): any;
        retryDelay?: number;
        retryStrategy?: RetryStrategy;
        delayStrategy?: DelayStrategy;
        fullResponse?: boolean;
    }

    const requestretrydayjs: RetryRequestAPI;
    export = requestretrydayjs;
}
