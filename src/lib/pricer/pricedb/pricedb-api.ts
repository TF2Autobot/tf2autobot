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
        const url = `${this.baseUrl}/item/${encodeURIComponent(sku)}`;
        const response = await apiRequest<PriceDbPrice>({ url });
        return response;
    }

    async getBulkPrices(skus: string[]): Promise<PriceDbPrice[]> {
        const url = `${this.baseUrl}/items-bulk`;
        const response = await apiRequest<PriceDbPrice[]>({ url, data: skus });
        return response;
    }

    async getAllPrices(): Promise<PriceDbPrice[]> {
        const url = `${this.baseUrl}/autob/items`;
        const response = await apiRequest<PriceDbGetAllPricesResponse>({ url });
        return response.items;
    }

    async priceCheck(sku: string): Promise<{ success: boolean; message?: string }> {
        const url = `${this.baseUrl}/autob/items/${encodeURIComponent(sku)}`;
        try {
            await apiRequest<void>({ url, method: 'POST' });
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
