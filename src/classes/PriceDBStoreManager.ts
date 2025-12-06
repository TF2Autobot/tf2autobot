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
    refresh_count?: number;
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

export interface PriceDBGroupMember {
    id: number;
    store_group_id: number;
    steam_id: string;
    role: 'owner' | 'member';
    invite_status: 'pending' | 'accepted' | 'declined';
    invited_by: string;
    invited_at: string;
    responded_at?: string;
    display_name: string;
    avatar_url: string;
}

export interface PriceDBGroup {
    id: number;
    owner_steam_id: string;
    group_name: string;
    description: string;
    banner_url?: string;
    links: Record<string, string>;
    theme_settings: {
        preset: string;
    };
    is_active: boolean;
    view_count: number;
    is_featured: boolean;
    created_at: string;
    updated_at: string;
    custom_store_slug: string;
    owner_name: string;
    owner_avatar: string;
    members: PriceDBGroupMember[];
}

export interface PriceDBGroupResponse {
    success: boolean;
    message?: string;
    group?: PriceDBGroup;
}

export interface PriceDBInvite {
    id: number;
    group_id: number;
    group_name: string;
    inviter_display_name: string;
    created_at: string;
}

export interface PriceDBInvitesResponse {
    success: boolean;
    count: number;
    invites: PriceDBInvite[];
}

export interface PriceDBInviteCreateResponse {
    success: boolean;
    message: string;
    invite?: {
        id: number;
        group_id: number;
        invitee_steam_id: string;
        status: string;
        created_at: string;
    };
}

interface QueuedRequest {
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
}

export default class PriceDBStoreManager extends EventEmitter {
    private readonly apiKey: string;

    private readonly baseURL: string = 'https://store.pricedb.io/api/v2';

    private readonly axiosInstance: AxiosInstance;

    private steamID: string;

    private listings: Map<string, PriceDBListing> = new Map(); // assetId -> listing

    private lastInventoryRefresh: Date | null = null;

    private storeSlug: string | null = null; // cached store slug from group

    private requestQueue: QueuedRequest[] = [];

    private isProcessingQueue = false;

    private readonly requestDelayMs: number = 100; // 100ms delay between requests = max 10 requests/second

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
     * Add a request to the queue and process it with rate limiting
     */
    private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ fn, resolve, reject });
            void this.processQueue();
        });
    }

    /**
     * Process the request queue with delays to avoid rate limiting
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            if (!request) break;

            try {
                const result = await request.fn();
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }

            // Wait before processing next request to avoid rate limit
            if (this.requestQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.requestDelayMs));
            }
        }

        this.isProcessingQueue = false;
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
            log.debug('Initialising PriceDB Store Manager...');
            await this.fetchMyListings();

            // Fetch group info to cache the store slug for friendly URLs
            try {
                const group = await this.getMyGroup();
                if (group && group.custom_store_slug) {
                    log.debug(`Cached store slug: ${group.custom_store_slug}`);
                }
            } catch (err) {
                // Not being in a group is not a critical error
                log.debug('No group found or failed to fetch group info (this is normal if not in a group)');
            }

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
     * Create a new listing on pricedb.io (queued with rate limiting)
     */
    async createListing(assetId: string, currencies: Currencies): Promise<PriceDBListing | null> {
        return this.queueRequest(async () => {
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
        });
    }

    /**
     * Update an existing listing on pricedb.io (queued with rate limiting)
     */
    async updateListing(assetId: string, currencies: Currencies): Promise<PriceDBListing | null> {
        return this.queueRequest(async () => {
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
        });
    }

    /**
     * Delete a listing from pricedb.io (queued with rate limiting)
     */
    async deleteListing(assetId: string): Promise<boolean> {
        return this.queueRequest(async () => {
            try {
                const existingListing = this.listings.get(assetId);
                if (!existingListing || !existingListing.id) {
                    log.warn(`Cannot delete listing for asset ${assetId}: listing not found`);
                    return false;
                }

                const response = await this.axiosInstance.delete<PriceDBListingResponse>(
                    `/listings/${existingListing.id}`
                );

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
        });
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
                    itemCount: response.data.item_count,
                    refreshCount: response.data.refresh_count
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

    /**
     * Get my store group information
     */
    async getMyGroup(): Promise<PriceDBGroup | null> {
        try {
            const response = await this.axiosInstance.get<PriceDBGroupResponse>('/groups/my');

            if (response.data.success && response.data.group) {
                // Cache the store slug for URL generation
                this.storeSlug = response.data.group.custom_store_slug;
                log.debug(
                    `Fetched group info - Group: ${response.data.group.group_name}, Slug: ${response.data.group.custom_store_slug}`
                );
                return response.data.group;
            }
            log.debug('No group found in /groups/my response');
            return null;
        } catch (err) {
            const axiosError = err as AxiosError;
            // 404 is expected when user is not in a group - This really needs changing server-side I will get to it eventually
            if (axiosError?.response?.status === 404) {
                log.debug('User is not in a group (404 response)');
                return null;
            }
            const error = filterAxiosError(axiosError);
            log.error('Failed to get group info from pricedb.io:', error);
            throw error;
        }
    }

    /**
     * Invite a user to the store group
     */
    async inviteToGroup(groupId: number, steamId: string): Promise<PriceDBInviteCreateResponse | null> {
        try {
            const response = await this.axiosInstance.post<PriceDBInviteCreateResponse>(`/groups/${groupId}/invite`, {
                steam_id: steamId
            });

            if (response.data.success) {
                log.info(`Invited ${steamId} to group ${groupId}`);
                return response.data;
            }
            return null;
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error(`Failed to invite ${steamId} to group ${groupId}:`, error);
            throw error;
        }
    }

    /**
     * Get pending group invites
     */
    async getPendingInvites(): Promise<PriceDBInvite[]> {
        try {
            const response = await this.axiosInstance.get<PriceDBInvitesResponse>('/groups/invites');

            if (response.data.success && response.data.invites) {
                log.debug(`Fetched ${response.data.count} pending invites`);
                return response.data.invites;
            }
            return [];
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error('Failed to get pending invites from pricedb.io:', error);
            throw error;
        }
    }

    /**
     * Accept a group invite
     */
    async acceptGroupInvite(groupId: number): Promise<boolean> {
        try {
            const response = await this.axiosInstance.post<PriceDBGroupResponse>(`/groups/${groupId}/accept`);

            if (response.data.success) {
                log.info(`Accepted invite to group ${groupId}`);
                return true;
            }
            return false;
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error(`Failed to accept invite to group ${groupId}:`, error);
            throw error;
        }
    }

    /**
     * Leave a group
     */
    async leaveGroup(groupId: number): Promise<boolean> {
        try {
            const response = await this.axiosInstance.post<PriceDBGroupResponse>(`/groups/${groupId}/leave`);

            if (response.data.success) {
                log.info(`Left group ${groupId}`);
                return true;
            }
            return false;
        } catch (err) {
            const error = filterAxiosError(err as AxiosError);
            log.error(`Failed to leave group ${groupId}:`, error);
            throw error;
        }
    }

    /**
     * Get the store slug for generating friendly URLs
     * If not cached, fetch from API
     */
    async getStoreSlug(): Promise<string | null> {
        if (this.storeSlug) {
            return this.storeSlug;
        }

        const group = await this.getMyGroup();
        return group ? group.custom_store_slug : null;
    }

    /**
     * Get the friendly store URL using slug
     */
    async getStoreURL(): Promise<string> {
        const slug = await this.getStoreSlug();
        if (slug) {
            return `https://store.pricedb.io/sf/${slug}`;
        }
        // Fallback to steamID-based URL
        return `https://store.pricedb.io/store?id=${this.steamID}`;
    }

    /**
     * Get the cached store URL synchronously (for use in templates)
     * Returns null if not yet cached
     */
    getCachedStoreURL(): string | null {
        if (this.storeSlug) {
            return `https://store.pricedb.io/sf/${this.storeSlug}`;
        }

        // If not cached, trigger an async fetch (don't wait for it)
        // This ensures the cache will be populated for next time
        if (!this.storeSlug) {
            void this.getMyGroup().catch(err => {
                log.debug('Failed to fetch group info for cache refresh:', err);
            });
        }

        return null;
    }
}
