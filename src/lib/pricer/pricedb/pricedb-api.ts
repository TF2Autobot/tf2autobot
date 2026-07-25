import { apiRequest, FetchError } from '../../apiRequest';

export interface PriceDbPrice {
    name: string;
    sku: string;
    source: string;
    time: number;
    buy: {
        keys: number;
        metal: number;
    };
    sell: {
        keys: number;
        metal: number;
    };
}

export interface PriceDbGetAllPricesResponse {
    success: boolean;
    currency: string;
    items: PriceDbPrice[];
}

export interface PriceDbErrorResponse {
    message?: string;
}

export default class PriceDbApi {
    private readonly baseUrl: string;

    constructor(baseUrl = 'https://pricedb.io/api') {
        this.baseUrl = baseUrl;
    }

    async getItemPrice(sku: string): Promise<PriceDbPrice> {
        return await apiRequest<PriceDbPrice>({ url: `${this.baseUrl}/item/${encodeURIComponent(sku)}` });
    }

    async getBulkPrices(skus: string[]): Promise<PriceDbPrice[]> {
        return await apiRequest<PriceDbPrice[]>({ url: `${this.baseUrl}/items-bulk`, data: skus });
    }

    async getAllPrices(): Promise<PriceDbPrice[]> {
        return (await apiRequest<PriceDbGetAllPricesResponse>({ url: `${this.baseUrl}/autob/items` })).items;
    }

    async priceCheck(sku: string): Promise<{ success: boolean; message?: string }> {
        try {
            await apiRequest<void>({ url: `${this.baseUrl}/autob/items/${encodeURIComponent(sku)}`, method: 'POST' });
            return { success: true };
        } catch (err) {
            const error = err as FetchError;
            return {
                success: false,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                message:
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    (typeof error.data === 'string' ? error.data : error.data?.message || error.message) ??
                    'Price check request failed'
            };
        }
    }
}
