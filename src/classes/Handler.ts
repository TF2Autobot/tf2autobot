/* eslint-disable @typescript-eslint/no-unused-vars */

import Bot from './Bot';
import { Entry, EntryData } from './Pricelist';

import SteamID from 'steamid';
import TradeOfferManager, { PollData } from 'steam-tradeoffer-manager';

import { UnknownDictionary } from '../types/common';

abstract class Handler {
    readonly bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    get steamID(): SteamID {
        return this.bot.client.steamID;
    }

    /**
     * Called when the bot is first started
     */
    abstract onRun(): Promise<{
        loginAttempts?: number[];
        pricelist?: EntryData[];
        loginKey?: string;
        pollData?: PollData;
    }>;

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
    abstract onLoginKey(loginKey: string): void;

    /**
     * Called when a new trade offer is being processed
     * @param offer - The new trade offer
     */
    abstract onNewTradeOffer(
        offer: TradeOfferManager.TradeOffer
    ): Promise<null | {
        action: 'accept' | 'decline' | 'skip';
        reason: string;
        meta?: UnknownDictionary<any>;
    }>;

    /**
     * Called when an action is applied to an offer
     * @param offer - The trade offer
     * @param action - The action
     * @param reason - The reason for the action
     */
    abstract onOfferAction(
        offer: TradeOfferManager.TradeOffer,
        action: 'accept' | 'decline' | 'skip',
        reason: string,
        meta: UnknownDictionary<any>
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
    abstract onPricelist(pricelist: Entry[]): void;

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
     * Called when a login attempt has failed
     * @param err - Error object
     */
    onLoginError(err: Error): void {
        // empty function
    }

    /**
     * Called when a friend message has been sent to the bot
     * @param steamID - SteamID object of the sender
     * @param message - The message from the sender
     */
    onMessage(steamID: SteamID, message: string): void {
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
    onTradeOfferChanged(offer: TradeOfferManager.TradeOffer, oldState: number): void {
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
     * Called when a heartbeat has been sent to bptf
     * @param bumped - How many listings were bumped as the result of the heartbeat
     */
    onHeartbeat(bumped: number): void {
        // empty function
    }
}

export = Handler;
