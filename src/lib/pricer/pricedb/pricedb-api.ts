import axios, { AxiosError } from 'axios';

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
        const response = await axios.get<PriceDbPrice>(url);
        return response.data;
    }

    async getBulkPrices(skus: string[]): Promise<PriceDbPrice[]> {
        const url = `${this.baseUrl}/items-bulk`;
        const response = await axios.post<PriceDbPrice[]>(url, { skus });
        return response.data;
    }

    async getAllPrices(): Promise<PriceDbPrice[]> {
        const url = `${this.baseUrl}/autob/items`;
        const response = await axios.get<PriceDbGetAllPricesResponse>(url);
        return response.data.items;
    }

    async priceCheck(sku: string): Promise<{ success: boolean; message?: string }> {
        const url = `${this.baseUrl}/autob/items/${encodeURIComponent(sku)}`;
        try {
            await axios.post<void>(url);
            return { success: true };
        } catch (error) {
            const axiosError = error as AxiosError<PriceDbErrorResponse>;
            const errorMessage = axiosError.response?.data?.message ?? 'Price check request failed';
            return {
                success: false,
                message: errorMessage
            };
        }
    }
}
