import axios, { AxiosInstance, AxiosError } from 'axios';
import Currencies from '@tf2autobot/tf2-currencies';
import { EventEmitter } from 'events';
import log from '../lib/logger';
import filterAxiosError from '@tf2autobot/filter-axios-error';

export interface PriceDBListing {
    id?: number;
    steam_id?: string;
    item_name?: string;
    asset_id: string;
    price_keys: number;
    price_metal: number;
    created_at?: string;
}

export interface PriceDBListingResponse {
    success: boolean;
    message?: string;
    listing?: PriceDBListing;
    count?: number;
    listings?: PriceDBListing[];
}

export interface PriceDBInventoryResponse {
    success: boolean;
    message?: string;
    count?: number;
    item_count?: number;
    from_cache?: boolean;
    cached_at?: string;
    items?: any[];
}

export interface PriceDBUserResponse {
    success: boolean;
    user?: {
        steam_id: string;
        display_name: string;
        avatar_url: string;
        trade_url: string;
        approved: boolean;
        created_at: string;
        rate_limit: number;
    };
}

export default class PriceDBStoreManager extends EventEmitter {
    private readonly apiKey: string;

    private readonly baseURL: string = 'https://store.pricedb.io/api/v2';

    private readonly axiosInstance: AxiosInstance;

    private steamID: string;

    private listings: Map<string, PriceDBListing> = new Map(); // assetId -> listing

    private lastInventoryRefresh: Date | null = null;

    constructor(apiKey: string, steamID?: string) {
        super();
        this.apiKey = apiKey;
        this.steamID = steamID;

        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            headers: {
                'X-API-Key': this.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    /**
     * Set the Steam ID for the store manager
     */
    setSteamID(steamID: string): void {
        this.steamID = steamID;
    }

    /**
     * Initialize the store manager by fetching existing listings
     */
    async init(): Promise<void> {
        try {
            log.debug('Initializing PriceDB Store Manager...');
            await this.fetchMyListings();
            log.info('PriceDB Store Manager initialized successfully');
            this.emit('ready');
        } catch (err) {
            log.error('Failed to initialize PriceDB Store Manager:', err);
            this.emit('error', err);
            throw err;
        }
    }

    /**
     * Fetch all listings for the authenticated user
     */
    async fetchMyListings(): Promise<PriceDBListing[]> {
        try {
            const response = await this.axiosInstance.get<PriceDBListingResponse>('/listings/my');

            if (response.data.success && response.data.listings) {
                this.listings.clear();
                response.data.listings.forEach(listing => {
                    this.listings.set(listing.asset_id, listing);
                });
                log.debug(`Fetched ${response.data.listings.length} listings from pricedb.io`);
                return response.data.listings;
            }
            return [];
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error('Failed to fetch listings from pricedb.io:', error);
            throw error;
        }
    }

    /**
     * Create a new listing on pricedb.io
     */
    async createListing(assetId: string, currencies: Currencies): Promise<PriceDBListing | null> {
        try {
            const listing: Omit<PriceDBListing, 'id' | 'steam_id' | 'item_name' | 'created_at'> = {
                asset_id: assetId,
                price_keys: currencies.keys,
                price_metal: currencies.metal
            };

            const response = await this.axiosInstance.post<PriceDBListingResponse>('/listings', listing);

            if (response.data.success && response.data.listing) {
                this.listings.set(assetId, response.data.listing);
                log.debug(`Created listing on pricedb.io for asset ${assetId}`);
                this.emit('listingCreated', response.data.listing);
                return response.data.listing;
            }
            return null;
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error(`Failed to create listing on pricedb.io for asset ${assetId}:`, error);
            this.emit('listingCreateError', { assetId, error });
            throw error;
        }
    }

    /**
     * Update an existing listing on pricedb.io
     */
    async updateListing(assetId: string, currencies: Currencies): Promise<PriceDBListing | null> {
        try {
            const existingListing = this.listings.get(assetId);
            if (!existingListing || !existingListing.id) {
                log.warn(`Cannot update listing for asset ${assetId}: listing not found`);
                return null;
            }

            const update = {
                price_keys: currencies.keys,
                price_metal: currencies.metal
            };

            const response = await this.axiosInstance.put<PriceDBListingResponse>(
                `/listings/${existingListing.id}`,
                update
            );

            if (response.data.success && response.data.listing) {
                const updatedListing = { ...existingListing, ...response.data.listing };
                this.listings.set(assetId, updatedListing);
                log.debug(`Updated listing on pricedb.io for asset ${assetId}`);
                this.emit('listingUpdated', updatedListing);
                return updatedListing;
            }
            return null;
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error(`Failed to update listing on pricedb.io for asset ${assetId}:`, error);
            this.emit('listingUpdateError', { assetId, error });
            throw error;
        }
    }

    /**
     * Delete a listing from pricedb.io
     */
    async deleteListing(assetId: string): Promise<boolean> {
        try {
            const existingListing = this.listings.get(assetId);
            if (!existingListing || !existingListing.id) {
                log.warn(`Cannot delete listing for asset ${assetId}: listing not found`);
                return false;
            }

            const response = await this.axiosInstance.delete<PriceDBListingResponse>(`/listings/${existingListing.id}`);

            if (response.data.success) {
                this.listings.delete(assetId);
                log.debug(`Deleted listing on pricedb.io for asset ${assetId}`);
                this.emit('listingDeleted', assetId);
                return true;
            }
            return false;
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error(`Failed to delete listing on pricedb.io for asset ${assetId}:`, error);
            this.emit('listingDeleteError', { assetId, error });
            throw error;
        }
    }

    /**
     * Refresh the cached inventory on pricedb.io (limited to 25 per day)
     */
    async refreshInventory(): Promise<boolean> {
        try {
            // Check rate limit: 1 refresh per 15 minutes
            if (this.lastInventoryRefresh) {
                const now = new Date();
                const timeSinceLastRefresh = now.getTime() - this.lastInventoryRefresh.getTime();
                const fifteenMinutesMs = 15 * 60 * 1000;

                if (timeSinceLastRefresh < fifteenMinutesMs) {
                    const timeRemaining = Math.ceil((fifteenMinutesMs - timeSinceLastRefresh) / 60000);
                    log.debug(
                        `Inventory refresh rate limit: ${timeRemaining} minutes remaining until next allowed refresh`
                    );
                    return false;
                }
            }

            const response = await this.axiosInstance.post<PriceDBInventoryResponse>('/inventory/refresh');

            if (response.data.success) {
                this.lastInventoryRefresh = new Date();
                log.info(`Inventory refreshed on pricedb.io. Items: ${response.data.item_count}`);
                this.emit('inventoryRefreshed', {
                    itemCount: response.data.item_count
                });
                return true;
            }
            return false;
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error('Failed to refresh inventory on pricedb.io:', error);
            this.emit('inventoryRefreshError', error);
            throw error;
        }
    }

    /**
     * Get cached inventory from pricedb.io
     */
    async getInventory(): Promise<any[]> {
        try {
            const response = await this.axiosInstance.get<PriceDBInventoryResponse>('/inventory');

            if (response.data.success && response.data.items) {
                log.debug(
                    `Fetched ${response.data.count} items from pricedb.io inventory (cached: ${response.data.from_cache})`
                );
                return response.data.items;
            }
            return [];
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error('Failed to get inventory from pricedb.io:', error);
            throw error;
        }
    }

    /**
     * Get user information from pricedb.io
     */
    async getUserInfo(): Promise<PriceDBUserResponse['user'] | null> {
        try {
            const response = await this.axiosInstance.get<PriceDBUserResponse>('/user');

            if (response.data.success && response.data.user) {
                return response.data.user;
            }
            return null;
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error('Failed to get user info from pricedb.io:', error);
            throw error;
        }
    }

    /**
     * Update trade URL on pricedb.io
     */
    async updateTradeURL(tradeURL: string): Promise<boolean> {
        try {
            const response = await this.axiosInstance.put<PriceDBListingResponse>('/user/trade-url', {
                trade_url: tradeURL
            });

            if (response.data.success) {
                log.info('Trade URL updated on pricedb.io');
                return true;
            }
            return false;
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error('Failed to update trade URL on pricedb.io:', error);
            throw error;
        }
    }

    /**
     * Find a listing by asset ID
     */
    findListing(assetId: string): PriceDBListing | undefined {
        return this.listings.get(assetId);
    }

    /**
     * Get all listings
     */
    getAllListings(): PriceDBListing[] {
        return Array.from(this.listings.values());
    }

    /**
     * Get the count of inventory refreshes today
     */
    getLastInventoryRefresh(): Date | null {
        return this.lastInventoryRefresh;
    }
}
