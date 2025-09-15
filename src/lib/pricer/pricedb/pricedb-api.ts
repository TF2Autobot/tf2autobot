import axios from 'axios';

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

export default class PriceDbApi {
    private readonly baseUrl: string;
    constructor(baseUrl = 'https://pricedb.io/api') {
        this.baseUrl = baseUrl;
    }

    async getItemPrice(sku: string): Promise<PriceDbPrice> {
        const url = `${this.baseUrl}/item/${encodeURIComponent(sku)}`;
        const { data } = await axios.get(url);
        return data;
    }

    async getBulkPrices(skus: string[]): Promise<PriceDbPrice[]> {
        const url = `${this.baseUrl}/items-bulk`;
        const { data } = await axios.post(url, { skus });
        return data;
    }

    async getAllPrices(): Promise<PriceDbPrice[]> {
        const url = `${this.baseUrl}/latest-prices`;
        const { data } = await axios.get(url);
        return data;
    }
}
