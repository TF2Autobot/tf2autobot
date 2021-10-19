import Currencies from 'tf2-currencies-2';

export interface PricerOptions {
    pricerUrl?: string;
    pricerApiToken?: string;
}

export type GetPricerFn = (options: PricerOptions) => Pricer;

/**
 * Basic pricer interface
 *
 * Those wishing to plug in something other than PricesTf should provide at least
 * the following interface plus a "pricer" module with the following method to get the constructor:
 * static getPricer(options: PricerOptions): Pricer
 */
export default interface Pricer {
    getOptions(): PricerOptions;

    requestCheck(sku: string): Promise<RequestCheckResponse>;

    getPrice(sku: string): Promise<GetItemPriceResponse>;

    getPricelist(): Promise<GetPricelistResponse>;
}

export type RequestCheckFn = (sku: string, source: string) => Promise<RequestCheckResponse>;
export type GetPriceFn = (sku: string, source: string) => Promise<GetItemPriceResponse>;
export type GetPrice = (sku: string, source: string) => Promise<GetItemPriceResponse>;
export type GetPricelist = (source: string) => Promise<GetPricelistResponse>;

export interface PricesResponse {
    success: boolean;
    message?: string;
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
    buy: Currencies | null;
    sell: Currencies | null;
}

export interface GetItemPriceResponse extends PricesResponse {
    sku?: string;
    name?: string;
    currency?: string;
    source?: string;
    time?: number;
    buy?: Currencies;
    sell?: Currencies;
    message?: string;
}

export interface RequestCheckResponse extends PricesResponse {
    sku: string;
    name: string;
}
