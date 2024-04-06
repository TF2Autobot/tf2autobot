/* eslint-disable @typescript-eslint/no-unused-vars */

import SteamID from 'steamid';
import TradeOfferManager, { PollData, Meta, CustomError } from '@tf2autobot/tradeoffer-manager';
import Bot from './Bot';
import { Entry, PricesDataObject, PricesObject } from './Pricelist';
import { Blocked } from './MyHandler/interfaces';

export interface OnRun {
    loginAttempts?: number[];
    pricelist?: PricesDataObject;
    loginKey?: string;
    pollData?: PollData;
    blockedList?: Blocked;
}

export default abstract class Handler {
    protected constructor(readonly bot: Bot) {
        this.bot = bot;
    }

    get steamID(): SteamID {
        return this.bot.client.steamID;
    }

    /**
     * Called when the bot is first started
     */
    abstract onRun(): Promise<OnRun>;

    /**
     * Called when the bot has started
     */
    abstract onReady(): void;

    /**
     * Called when the bot is stopping
     */
    abstract onShutdown(): Promise<void>;

    /**
     * Called when the bot has signed in to Steam
     */
    abstract onLoggedOn(): void;

    /**
     * Called when a new login key has been issued
     * @param loginKey - The new login key
     */
    abstract onRefreshToken(token: string): void;

    /**
     * Called when a new trade offer is being processed
     * @param offer - The new trade offer
     */
    abstract onNewTradeOffer(offer: TradeOfferManager.TradeOffer): Promise<null | {
        action: 'accept' | 'decline' | 'skip' | 'counter';
        reason: string;
        meta?: Meta;
    }>;

    /**
     * Called when an action is applied to an offer
     * @param offer - The trade offer
     * @param action - The action
     * @param reason - The reason for the action
     */
    abstract onOfferAction(
        offer: TradeOfferManager.TradeOffer,
        action: 'accept' | 'decline' | 'skip' | 'counter',
        reason: string,
        meta: Meta
    ): void;

    /**
     * Called when a new login attempt has been made
     * @param loginAttempts - A list of login attempts
     */
    abstract onLoginAttempts(loginAttempts: number[]): void;

    /**
     * Called when polldata changes
     * @param pollData - The polldata
     */
    abstract onPollData(pollData: TradeOfferManager.PollData): void;

    /**
     * Called when the pricelist updates
     * @param pricelist - The pricelist
     */
    abstract onPricelist(pricelist: PricesObject): Promise<void>;

    /**
     * Called when the price of an item changes
     * @param sku - The SKU of the item
     * @param price - The new price object for the item
     */
    abstract onPriceChange(sku: string, price: Entry | null): void;

    /**
     * Called when login attempt has been throttled
     * @param wait - Milliseconds that the bot will wait
     */
    onLoginThrottle(wait: number): void {
        // empty function
    }

    /**
     * Called when a friend message has been sent to the bot
     * @param steamID - SteamID object of the sender
     * @param message - The message from the sender
     */
    async onMessage(steamID: SteamID, message: string): Promise<void> {
        // empty function
    }

    /**
     * Called when the relation to an account changes
     * @param steamID - SteamID object of the account
     * @param relationship - The new relation with the account
     */
    onFriendRelationship(steamID: SteamID, relationship: number): void {
        // empty function
    }

    /**
     * Called when the relation to a group changes
     * @param steamID - SteamID object of the group
     * @param relationship - The new relation with the group
     */
    onGroupRelationship(steamID: SteamID, relationship: number): void {
        // empty function
    }

    /**
     * Called when the state of a trade offer changes
     * @param offer - The offer that changed
     * @param oldState - The old state of the offer
     */
    onTradeOfferChanged(offer: TradeOfferManager.TradeOffer, oldState: number, timeTakenToComplete?: number): void {
        // empty function
    }

    /**
     * Called when a crafting recipe has been completed
     */
    onCraftingCompleted(): void {
        // empty function
    }

    /**
     * Called when an item has been used
     */
    onUseCompleted(): void {
        // empty function
    }

    /**
     * Called when an item has been deleted
     */
    onDeleteCompleted(): void {
        // empty function
    }

    /**
     * Called when the TF2 GC job queue has finished
     */
    onTF2QueueCompleted(): void {
        // empty function
    }

    /**
     * Called when bptf auth details has been retrieved
     * @param auth - An object containing the backpack.tf auth details
     */
    onBptfAuth(auth: { apiKey: string; accessToken: string }): void {
        // empty function
    }

    /**
     * Called when a bptf user-agent renewed
     */
    onUserAgent(pulse: { status: string; current_time?: number; expire_at?: number; client?: string }): void {
        // empty function
    }

    /**
     * Called on successful creating listings
     * @param response - created, archived, errrors
     */
    onCreateListingsSuccessful(response: { created: number; archived: number; errors: any[] }): void {
        // empty function
    }

    /**
     * Called on successful updating listings
     * @param response - updated, errrors
     */
    onUpdateListingsSuccessful(response: { updated: number; errors: any[] }): void {
        // empty function
    }

    /**
     * Called on successful deleting listings
     * @param response - any
     */
    onDeleteListingsSuccessful(response: Record<string, unknown>): void {
        // empty function
    }

    /**
     * Called on successful deleting listings
     * @param response - any
     */
    onDeleteArchivedListingSuccessful(response: boolean): void {
        // empty function
    }

    /**
     * Called on error when creating listings
     * @param err - Error message
     */
    onCreateListingsError(err: Error): void {
        // empty function
    }

    /**
     * Called on error when updating listings
     * @param err - Error message
     */
    onUpdateListingsError(err: Error): void {
        // empty function
    }

    /**
     * Called on error when deleting listings
     * @param err - Error message
     */
    onDeleteListingsError(err: Error): void {
        // empty function
    }

    /**
     * Called on error when deleting listings
     * @param err - Error message
     */
    onDeleteArchivedListingError(err: Error): void {
        // empty function
    }

    /**
     * Called when Team Fortress 2 emit a System Message event
     * @param message - System message
     */
    onSystemMessage(message: string): void {
        // empty function
    }

    /**
     * Called when Team Fortress 2 emit a Display Notification event (currently only used when someone
     * accepted the "Something Special For Someone Special")
     * @param title - (Not currently used, based on node-tf2)
     * @param body -
     */
    onDisplayNotification(title: string, body: string): void {
        // empty function
    }

    /**
     * Called when Team Fortress 2 emit a Item Broadcast event (currently only used when someone received
     * or destroyed Golden Frying Pan)
     * @param message -
     * @param username -
     * @param wasDestruction -
     * @param defindex -
     */
    onItemBroadcast(message: string, username: string, wasDestruction: boolean, defindex: number): void {
        // empty function
    }
}
