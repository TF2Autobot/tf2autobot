import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import Currencies from '../lib/currencies';
import { Agent } from 'node:https';
import { Readable } from 'node:stream';
import { createHatVersionZ, unparseHatVersionZ } from '../vendor/the-future/createHat';

export interface NextCritSellAsset {
    assetId: string;
    currencies: Currencies;
}

export interface NextCritTradeProgress {
    steam64: string;
    stage: 0 | 1 | 2 | 3;
    message: string;
    complete: boolean;
    trade_offer_id: string | null;
}

export interface NextCritPrice {
    keys: number;
    half_scrap: number;
}

export interface NextCritSellListing {
    asset_id: string;
    price: NextCritPrice;
    hat?: string;
}

export type NextCritIgnoredField =
    | 'craftability'
    | 'marketability'
    | 'skin_wear'
    | 'tradability'
    | 'loaner'
    | 'unusual_effect'
    | 'killstreaker'
    | 'sheen'
    | 'paint'
    | 'strange_parts'
    | 'strange_filters'
    | 'spells'
    | 'festivized';

export interface NextCritBuyInput {
    hat: string;
    ignored_fields: NextCritIgnoredField[];
    price: NextCritPrice;
    amount: number;
}

export interface NextCritBuyListing extends NextCritBuyInput {
    id: number;
}

interface BuyListingsResponse {
    success: boolean;
    listings: NextCritBuyListing[];
}

interface ListingsResponse {
    success: boolean;
    listings: NextCritSellListing[];
}

interface InventoryResponse {
    inventory: Record<string, { hat: string }>;
}

export class NextCritRequestError extends Error {
    constructor(readonly status: number | undefined, code: string | undefined) {
        super(`NextCrit request failed (${status ?? code ?? 'network error'})`);
    }
}

/** Publishes sell assets and buy criteria through NextCrit's v2 listing API. */
export default class NextCritDriver {
    private readonly http: AxiosInstance;

    private token = '';

    private authentication: Promise<void> | undefined;

    private tokenExpiresAt = 0;

    private lastInventoryRefresh = 0;

    private queue: Promise<unknown> = Promise.resolve();

    private readonly published = new Map<string, NextCritPrice>();

    constructor(private readonly apiKey: string, baseUrl = 'https://crit.tf', allowSelfSigned = false) {
        if (!apiKey) throw new Error('NextCrit requires an API key');
        this.http = axios.create({
            baseURL: baseUrl,
            timeout: 30000,
            maxRedirects: 0,
            httpsAgent: new Agent({ rejectUnauthorized: !allowSelfSigned })
        });
    }

    openEventStream(signal: AbortSignal): Promise<Readable> {
        return this.request<Readable>({
            method: 'GET',
            url: '/api/events/v2',
            responseType: 'stream',
            headers: { Accept: 'text/event-stream' },
            signal
        });
    }

    async postTradeProgress(progress: NextCritTradeProgress): Promise<void> {
        const response = await this.request<{ accepted: boolean }>({
            method: 'POST',
            url: '/api/v2/trade-progress',
            data: progress
        });
        if (!response.accepted) throw new Error('NextCrit did not accept trade progress');
    }

    createOrUpdateListing(assetId: string, currencies: Currencies, steam64: string): Promise<void> {
        const price = NextCritDriver.toPrice(currencies);
        NextCritDriver.validateAssetId(assetId);
        return this.enqueue(async () => {
            const previous = this.published.get(assetId);
            if (previous?.keys === price.keys && previous.half_scrap === price.half_scrap) return;
            await this.ensureSellInventory(steam64, [assetId]);
            const config: AxiosRequestConfig = {
                method: 'POST',
                url: '/api/v2/sell-listings',
                data: [{ asset_id: assetId, price }]
            };
            let response: ListingsResponse;
            try {
                response = await this.request<ListingsResponse>(config);
            } catch (err) {
                if (!(err instanceof NextCritRequestError) || err.status !== 404) throw err;
                await this.ensureSellInventory(steam64, [assetId], true);
                response = await this.request<ListingsResponse>(config);
            }
            if (!response.success) throw new Error('NextCrit did not publish the sell listing');
            this.published.set(assetId, price);
        });
    }

    syncSellListings(assets: NextCritSellAsset[], steam64: string): Promise<void> {
        const desired = new Map<string, NextCritSellListing>();
        for (const { assetId, currencies } of assets) {
            NextCritDriver.validateAssetId(assetId);
            if (desired.has(assetId)) throw new Error('Duplicate NextCrit asset ID');
            desired.set(assetId, { asset_id: assetId, price: NextCritDriver.toPrice(currencies) });
        }
        return this.enqueue(async () => {
            const response = await this.request<ListingsResponse>({ method: 'GET', url: '/api/v2/sell-listings/my' });
            if (!response.success || !Array.isArray(response.listings)) {
                throw new Error('NextCrit did not return sell listings');
            }
            const existing = new Map(response.listings.map(listing => [listing.asset_id, listing]));
            const obsolete = response.listings.filter(listing => !desired.has(listing.asset_id));
            if (obsolete.length > 0) {
                const removed = await this.request<{ success: boolean }>({
                    method: 'DELETE',
                    url: '/api/v2/sell-listings',
                    params: { asset_ids: obsolete.map(listing => listing.asset_id).join(',') }
                });
                if (!removed.success) throw new Error('NextCrit did not delete obsolete sell listings');
                for (const listing of obsolete) this.published.delete(listing.asset_id);
            }
            const changed = [...desired.values()].filter(listing => {
                const previous = existing.get(listing.asset_id);
                return (
                    previous?.price.keys !== listing.price.keys ||
                    previous.price.half_scrap !== listing.price.half_scrap
                );
            });
            if (changed.length === 0) return;
            const assetIds = changed.map(listing => listing.asset_id);
            await this.ensureSellInventory(steam64, assetIds);
            const config: AxiosRequestConfig = { method: 'POST', url: '/api/v2/sell-listings', data: changed };
            let result: ListingsResponse;
            try {
                result = await this.request<ListingsResponse>(config);
            } catch (err) {
                if (!(err instanceof NextCritRequestError) || err.status !== 404) throw err;
                await this.ensureSellInventory(steam64, assetIds, true);
                result = await this.request<ListingsResponse>(config);
            }
            if (!result.success) throw new Error('NextCrit did not publish sell listings');
            for (const listing of changed) this.published.set(listing.asset_id, listing.price);
        });
    }

    syncBuyListings(listings: NextCritBuyInput[]): Promise<void> {
        const desired = new Map<string, NextCritBuyInput>();
        for (const listing of listings) {
            if (!Number.isInteger(listing.amount) || listing.amount < 1) {
                throw new Error('Invalid NextCrit buy-listing amount');
            }
            // Snapshot caller-owned values before entering the shared write queue.
            const copy = { ...listing, price: { ...listing.price }, ignored_fields: [...listing.ignored_fields] };
            const key = NextCritDriver.buyKey(copy);
            if (desired.has(key)) throw new Error('Duplicate NextCrit buy criteria');
            desired.set(key, copy);
        }
        return this.enqueue(async () => {
            const listings = await this.getBuyListings();
            const existing = new Map(listings.map(listing => [NextCritDriver.buyKey(listing), listing]));
            const obsolete = listings.filter(listing => !desired.has(NextCritDriver.buyKey(listing)));
            if (obsolete.length > 0) {
                const removed = await this.request<{ success: boolean }>({
                    method: 'DELETE',
                    url: '/api/v2/buy-listings',
                    params: { listing_ids: obsolete.map(listing => listing.id).join(',') }
                });
                if (!removed.success) throw new Error('NextCrit did not delete obsolete buy listings');
            }
            const changed = [...desired.entries()]
                .filter(([key, listing]) => {
                    const previous = existing.get(key);
                    return (
                        previous?.amount !== listing.amount ||
                        previous.price.keys !== listing.price.keys ||
                        previous.price.half_scrap !== listing.price.half_scrap
                    );
                })
                .map(([, listing]) => listing);
            if (changed.length === 0) return;
            const result = await this.request<BuyListingsResponse>({
                method: 'POST',
                url: '/api/v2/buy-listings',
                data: changed
            });
            if (!result.success) throw new Error('NextCrit did not publish buy listings');
        });
    }

    async getBuyListings(): Promise<NextCritBuyListing[]> {
        const response = await this.request<BuyListingsResponse>({ method: 'GET', url: '/api/v2/buy-listings/my' });
        if (!response.success || !Array.isArray(response.listings))
            throw new Error('NextCrit did not return buy listings');
        return response.listings;
    }

    static buyKey(listing: NextCritBuyInput): string {
        const props = unparseHatVersionZ(listing.hat.slice(2));
        if (!listing.hat.startsWith('Z^')) throw new Error('Invalid NextCrit buy HAT');
        const ignored = new Set(listing.ignored_fields);
        props.marketHashName = props.marketHashName
            .split(' ')
            .filter(word => word !== 'Non-Craftable' && (!ignored.has('festivized') || word !== 'Festivized'))
            .join(' ');
        if (ignored.has('skin_wear')) {
            props.marketHashName = props.marketHashName.replace(
                / \((?:Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle Scarred)\)$/,
                ''
            );
        }
        if (ignored.has('craftability')) props.craftable = false;
        if (ignored.has('marketability')) props.marketable = false;
        if (ignored.has('tradability')) props.tradable = false;
        if (ignored.has('festivized')) props.festivized = false;
        if (ignored.has('loaner')) props.loaner = false;
        if (ignored.has('unusual_effect')) props.unusualEffects = [];
        if (ignored.has('killstreaker')) props.killstreakers = [];
        if (ignored.has('sheen')) props.sheens = [];
        if (ignored.has('paint')) props.paints = [];
        if (ignored.has('strange_parts')) props.strangeParts = [];
        if (ignored.has('strange_filters')) props.strangeFilters = [];
        if (ignored.has('spells')) props.spells = [];
        return JSON.stringify([createHatVersionZ(props), [...ignored].sort()]);
    }

    getListings(): Promise<NextCritSellListing[]> {
        return this.enqueue(async () => {
            const response = await this.request<ListingsResponse>({ method: 'GET', url: '/api/v2/sell-listings/my' });
            if (!response.success) throw new Error('NextCrit did not return sell listings');
            return response.listings;
        });
    }

    deleteListing(assetId: string): Promise<void> {
        NextCritDriver.validateAssetId(assetId);
        return this.enqueue(async () => {
            const response = await this.request<{ success: boolean }>({
                method: 'DELETE',
                url: '/api/v2/sell-listings',
                params: { asset_ids: assetId }
            });
            if (!response.success) throw new Error('NextCrit did not delete the sell listing');
            this.published.delete(assetId);
        });
    }

    deleteAllListings(): Promise<void> {
        return this.enqueue(async () => {
            const failures: unknown[] = [];
            for (const intent of ['sell', 'buy']) {
                try {
                    const response = await this.request<{ success: boolean }>({
                        method: 'DELETE',
                        url: `/api/v2/${intent}-listings/my`
                    });
                    if (!response.success) throw new Error(`NextCrit did not delete ${intent} listings`);
                    if (intent === 'sell') this.published.clear();
                } catch (err) {
                    failures.push(err);
                }
            }
            if (failures.length > 0) throw failures[0];
        });
    }

    refreshInventory(steam64: string): Promise<void> {
        return this.enqueue(() => this.refreshInventoryNow(steam64));
    }

    static toPrice(currencies: Currencies): NextCritPrice {
        // Refined prices use TF2's truncated decimal notation, e.g. 0.11 ref = one scrap.
        const halfScrap = Currencies.toHalfScrap(currencies.metal);
        if (
            !Number.isInteger(currencies.keys) ||
            currencies.keys < 0 ||
            !Number.isFinite(currencies.metal) ||
            currencies.metal < 0 ||
            halfScrap < 0
        ) {
            throw new Error('Invalid NextCrit sell-listing price');
        }
        return { keys: currencies.keys, half_scrap: halfScrap };
    }

    private async ensureSellInventory(steam64: string, assetIds: string[], forceRefresh = false): Promise<void> {
        if (!/^7656119\d{10}$/.test(steam64)) throw new Error('Invalid NextCrit Steam ID');
        const containsAssets = (response: InventoryResponse): boolean => {
            if (!response?.inventory || typeof response.inventory !== 'object' || Array.isArray(response.inventory)) {
                throw new Error('NextCrit did not return an inventory');
            }
            return assetIds.every(assetId => Object.prototype.hasOwnProperty.call(response.inventory, assetId));
        };
        if (!forceRefresh) {
            try {
                const cached = await this.request<InventoryResponse>({
                    method: 'GET',
                    url: `/api/v2/inventories/${steam64}/1h`
                });
                if (containsAssets(cached)) return;
            } catch (err) {
                if (!(err instanceof NextCritRequestError) || err.status !== 404) throw err;
            }
        }
        // Missing assets must bypass both the server cache and the routine refresh cooldown.
        const refreshed = await this.request<InventoryResponse>({
            method: 'GET',
            url: `/api/v2/inventories/${steam64}/0/refresh`
        });
        this.lastInventoryRefresh = Date.now();
        if (!containsAssets(refreshed))
            throw new Error('NextCrit inventory is still missing sell-listing assets after refresh');
    }

    private async refreshInventoryNow(steam64: string): Promise<void> {
        if (!/^7656119\d{10}$/.test(steam64)) throw new Error('Invalid NextCrit Steam ID');
        if (Date.now() - this.lastInventoryRefresh < 60000) return;
        await this.request({ method: 'GET', url: `/api/v2/inventories/${steam64}/0/refresh` });
        this.lastInventoryRefresh = Date.now();
    }

    private static validateAssetId(assetId: string): void {
        if (!/^[1-9]\d*$/.test(assetId)) {
            throw new Error('Invalid NextCrit asset ID');
        }
    }

    // Keep writes ordered so an earlier publish cannot finish after a deletion.
    private enqueue<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.queue.then(operation);
        this.queue = result.catch(() => undefined);
        return result;
    }

    private authenticate(): Promise<void> {
        if (this.authentication === undefined) {
            this.authentication = this.authenticateNow().finally(() => {
                this.authentication = undefined;
            });
        }
        return this.authentication;
    }

    private async authenticateNow(): Promise<void> {
        const response = await this.http.post<{ token: string }>('/api/v2/auth', undefined, {
            headers: { 'X-API-KEY': this.apiKey }
        });
        if (typeof response.data.token !== 'string' || !response.data.token) {
            throw new Error('NextCrit returned an invalid authentication token');
        }
        this.token = response.data.token;
        // NextCrit tokens last 15 minutes; renew with a minute to spare.
        this.tokenExpiresAt = Date.now() + 14 * 60 * 1000;
    }

    private authorizedConfig(config: AxiosRequestConfig): AxiosRequestConfig {
        return {
            ...config,
            headers: { ...config.headers, Authorization: `Bearer ${this.token}` },
            // The SSE endpoint authenticates its listener token through the query string.
            ...(config.url === '/api/events/v2' ? { params: { token: this.token } } : {})
        };
    }

    private async request<T>(config: AxiosRequestConfig): Promise<T> {
        try {
            if (Date.now() >= this.tokenExpiresAt) await this.authenticate();
            try {
                return (await this.http.request<T>(this.authorizedConfig(config))).data;
            } catch (err) {
                if (axios.isAxiosError(err) && config.responseType === 'stream') {
                    const response: unknown = err.response?.data;
                    if (response instanceof Readable) response.destroy();
                }
                if (!axios.isAxiosError(err) || err.response?.status !== 401) throw err;
                this.tokenExpiresAt = 0;
                await this.authenticate();
                return (await this.http.request<T>(this.authorizedConfig(config))).data;
            }
        } catch (err) {
            // Axios errors include request headers. Never pass API keys or tokens to the logger.
            if (axios.isAxiosError(err)) {
                const response: unknown = err.response?.data;
                if (config.responseType === 'stream' && response instanceof Readable) response.destroy();
                throw new NextCritRequestError(err.response?.status, err.code);
            }
            throw err;
        }
    }
}
