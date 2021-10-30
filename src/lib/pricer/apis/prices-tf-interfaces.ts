export interface PricesCurrency {
    keys: number;
    metal: number;
}

export interface PricesResponse {
    success: boolean;
    message?: string;
}

export interface PricesGetItemPriceResponse extends PricesResponse {
    sku?: string;
    name?: string;
    currency?: string;
    source?: string;
    time?: number;
    buy?: PricesCurrency;
    sell?: PricesCurrency;
    message?: string;
}

export interface PricesGetPricelistResponse extends PricesResponse {
    currency?: string | null;
    items?: PricesItem[];
}

export interface PricesItem {
    sku: string;
    name: string;
    source: string;
    time: number;
    buy: PricesCurrency | null;
    sell: PricesCurrency | null;
}

export interface PricesLinks {
    ptf: string;
    mptf: string;
    scm: string;
    bptf: string;
}

export interface PricesGetItemPriceResponse extends PricesResponse {
    sku?: string;
    name?: string;
    currency?: string;
    source?: string;
    time?: number;
    buy?: PricesCurrency;
    sell?: PricesCurrency;
    message?: string;
}

export interface PricesSale {
    id: string;
    steamid: string;
    automatic: boolean;
    attributes: any;
    intent: number;
    currencies: PricesCurrency;
    time: number;
}

export interface PricesRequestCheckResponse extends PricesResponse {
    sku: string;
    name: string;
}

export interface Prices2RequestCheckResponse {
    sku: string;
    name: string;
}

export interface Prices2Item {
    sku: string;
    buyHalfScrap: number;
    buyKeys: number;
    buyKeyHalfScrap: number | null;
    sellHalfScrap: number;
    sellKeys: number;
    sellKeyHalfScrap: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface Prices2ResponseMeta {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
}

export interface Prices2GetPricesResponse {
    items: Prices2Item[];
    meta: Prices2ResponseMeta;
}

export interface Prices2AuthAccessResponse {
    accessToken: string;
}
