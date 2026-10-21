import SteamID from 'steamid';
import SteamUser from 'steam-user';
import { EResult, EPersonaState } from 'steam-user';
import TradeOfferManager, { CustomError, EconItem } from '@tf2autobot/tradeoffer-manager';
import SteamCommunity from '@tf2autobot/steamcommunity';
import SteamTotp from 'steam-totp';
import ListingManager, { Listing } from '@tf2autobot/bptf-listings';
import PriceDBStoreManager from './PriceDBStoreManager';
import ManncoStoreManager, { ManncoPricelistItem, ManncoRateLimitError } from './ManncoStoreManager';
import sendManncoTransaction from './DiscordWebhook/sendManncoTransaction';
import JournalTfManager from './JournalTfManager';
import SchemaManager, { Effect, StrangeParts } from '@tf2autobot/tf2-schema';
import BptfLogin from '@tf2autobot/bptf-login';
import TF2 from '@tf2autobot/tf2';
import dayjs, { Dayjs } from 'dayjs';
import async from 'async';
import semver from 'semver';
import { AxiosError } from 'axios';
import pluralize from 'pluralize';
import * as timersPromises from 'timers/promises';
import fs from 'fs';
import path from 'path';
import * as files from '../lib/files';
import { isUsableRefreshToken } from '../lib/refreshToken';
import { getSteamMaintenanceDelay } from '../lib/steamMaintenance';
import handleCallback from '../lib/tools/handleCallback';

import DiscordBot from './DiscordBot';
import { Message as DiscordMessage } from 'discord.js';

import InventoryManager from './InventoryManager';
import Pricelist, { Entry, EntryData, PricesDataObject } from './Pricelist';
import Friends from './Friends';
import Trades from './Trades';
import Listings from './Listings';
import TF2GC from './TF2GC';
import Inventory from './Inventory';
import InventoryGetter from './InventoryGetter';
import BotManager from './BotManager';
import MyHandler from './MyHandler/MyHandler';
import Groups from './Groups';
import InventoryCostBasis from './InventoryCostBasis';

import log from '../lib/logger';
import Bans, { IsBanned } from '../lib/bans';
import { sendStats } from './DiscordWebhook/export';

import Options from './Options';
import IPricer from './IPricer';
import { EventEmitter } from 'events';
import { Blocked } from './MyHandler/interfaces';
import ipcHandler from './IPC';
import filterAxiosError from '@tf2autobot/filter-axios-error';
import { axiosAbortSignal } from '../lib/helpers';
import { apiRequest } from '../lib/apiRequest';
import EasyCopyPaste from 'easycopypaste';

type Callback = (err?: Error | null) => void;
type HttpError = Error & { code?: string | number };

type EasyCopyPasteInstance = {
    useBoldChars: boolean;
    useWordSwap: boolean;
    toEcpStr: (name: string, key: string) => string;
    reverseEcpStr: (str: string) => any;
};

const EasyCopyPasteCtor = EasyCopyPaste as unknown as new () => EasyCopyPasteInstance;

// Temporary kill switch for the PriceDB Store / crit.tf integration.
const PRICEDB_STORE_ENABLED = false;

type PriceDBListingEvent = { id: string };
type PriceDBInventoryRefreshedEvent = { itemCount: number; refreshCount: number };

const TRADE_OFFER_URL_RETRY_BASE_DELAY = 5 * 1000;
const TRADE_OFFER_URL_RETRY_MAX_DELAY = 5 * 60 * 1000;

export interface SteamTokens {
    refreshToken: string;
    accessToken: string;
}

interface StartData {
    loginAttempts?: number[];
    pricelist?: PricesDataObject;
    pollData?: TradeOfferManager.PollData;
    blockedList?: Blocked;
}

export default class Bot {
    // Modules and classes
    readonly ipc?: ipcHandler;

    schema: SchemaManager.Schema;

    readonly bptf: BptfLogin;

    readonly tf2: TF2;

    readonly client: SteamUser;

    readonly manager: TradeOfferManager;

    readonly community: SteamCommunity;

    tradeOfferUrl: string;

    listingManager: ListingManager;

    pricedbStoreManager: PriceDBStoreManager;

    manncoStoreManager: ManncoStoreManager;

    journalTfManager?: JournalTfManager;

    readonly friends: Friends;

    readonly groups: Groups;

    readonly trades: Trades;

    readonly listings: Listings;

    readonly tf2gc: TF2GC;

    readonly handler: MyHandler;

    readonly inventoryGetter: InventoryGetter;

    readonly boundInventoryGetter: (
        steamID: SteamID | string,
        appid: number,
        contextid: string,
        tradeableOnly: boolean,
        callback: (err?: Error, inventory?: EconItem[], currencies?: EconItem[]) => void
    ) => void;

    readonly inventoryCostBasis: InventoryCostBasis;

    discordBot: DiscordBot = null;

    inventoryManager: InventoryManager;

    pricelist: Pricelist;

    schemaManager: SchemaManager;

    public effects: Effect[];

    public strangeParts: StrangeParts;

    public craftWeapons: string[];

    public uncraftWeapons: string[];

    public craftWeaponsByClass: {
        scout: string[];
        soldier: string[];
        pyro: string[];
        demoman: string[];
        heavy: string[];
        engineer: string[];
        medic: string[];
        sniper: string[];
        spy: string[];
    };

    public updateSchemaPropertiesInterval: NodeJS.Timeout;

    // Settings
    private readonly maxLoginAttemptsWithinPeriod: number = 3;

    private readonly loginPeriodTime: number = 60 * 1000;

    // Values
    lastNotifiedVersion: string | undefined;

    private sessionReplaceCount = 0;

    private consecutiveSteamGuardCodesWrong = 0;

    private timeOffset: number = null;

    private loginAttempts: Dayjs[] = [];

    private admins: SteamID[] = [];

    public blockedList: Blocked = {};

    private repCache: { [steamid: string]: IsBanned } = {};

    public resetRepCache: NodeJS.Timeout;

    private itemStatsWhitelist: SteamID[] = [];

    private ready = false;

    /** the user id of bp.tf */
    public userID?: string;

    private halted = false;

    private reconnectAttempts = 0;

    private isReconnecting = false;

    private reconnectTimeout: NodeJS.Timeout = null;

    private steamGamePresenceTimeout: NodeJS.Timeout = null;

    private lastSteamGamePresence: string = null;

    private lastSteamGamePresenceUpdate = 0;

    private steamGamePresenceInterval: NodeJS.Timeout = null;

    private manncoStoreRetryTimeout: NodeJS.Timeout = null;

    private manncoStoreListingsInterval: NodeJS.Timeout = null;

    private manncoStoreOperationsInterval: NodeJS.Timeout = null;

    private isLoginAttemptActive = false;

    private recoveryRestartRequested = false;

    private tradeOfferUrlRetryTimeout: NodeJS.Timeout = null;

    public autoRefreshListingsInterval: NodeJS.Timeout;

    /**
     * Resets the reconnection state and clears any pending reconnection timeout
     */
    public resetReconnectionState(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
    }

    private onKeyPriceChange(priceKey: string): void {
        if (priceKey === '5021;6') {
            this.updateSteamGamePresence();
        }
    }

    private setSteamGamePresence(games: number | [string, number], value: string, force = false): void {
        if (value === this.lastSteamGamePresence && !force) {
            return;
        }

        const delay = Math.max(0, 60 * 1000 - (Date.now() - this.lastSteamGamePresenceUpdate));
        if (!force && delay > 0) {
            clearTimeout(this.steamGamePresenceTimeout);
            this.steamGamePresenceTimeout = setTimeout(() => {
                this.steamGamePresenceTimeout = null;
                this.updateSteamGamePresence();
            }, delay);
            return;
        }

        this.client.gamesPlayed(games);
        this.lastSteamGamePresence = value;
        this.lastSteamGamePresenceUpdate = Date.now();
    }

    private alreadyExecutedRefreshlist = false;

    public updateSteamGamePresence(force = false): void {
        const presence = this.options.miscSettings.game.presence;
        if (presence?.mode === 'tf2Only') {
            this.setSteamGamePresence(440, 'tf2Only', force);
            return;
        }

        if (presence?.mode === 'liveKeyStatus') {
            const keyPrices = this.pricelist?.getKeyPrices;
            const inventory = this.inventoryManager?.getInventory;
            if (!keyPrices || !inventory) {
                log.warn('Unable to update live key status: key price or inventory is unavailable.');
                return;
            }

            const stock = inventory.getAmount({ priceKey: '5021;6', includeNonNormalized: false });
            const title =
                `🔑 Buy ${keyPrices.buy.toString()} / Sell ${keyPrices.sell.toString()} | Keys: ${stock}`.slice(0, 60);
            this.setSteamGamePresence([title, 440], title, force);
            return;
        }

        const customName = presence?.customName || 'TF2Autobot';
        this.setSteamGamePresence([customName, 440], customName, force);
    }

    public startSteamGamePresenceUpdater(): void {
        if (this.options.miscSettings.game.presence?.mode !== 'liveKeyStatus') {
            clearInterval(this.steamGamePresenceInterval);
            this.steamGamePresenceInterval = null;
        }

        this.updateSteamGamePresence(true);

        if (this.options.miscSettings.game.presence?.mode !== 'liveKeyStatus' || this.steamGamePresenceInterval) {
            return;
        }

        this.steamGamePresenceInterval = setInterval(() => {
            this.updateSteamGamePresence();
        }, 5 * 60 * 1000);
    }

    set isRecentlyExecuteRefreshlistCommand(setExecuted: boolean) {
        this.alreadyExecutedRefreshlist = setExecuted;
    }

    private executedDelayTime = 30 * 60 * 1000;

    set setRefreshlistExecutedDelay(delay: number) {
        this.executedDelayTime = delay;
    }

    public sendStatsInterval: NodeJS.Timeout;

    public periodicCheckAdmin: NodeJS.Timeout;

    readonly ecp: EasyCopyPasteInstance;

    constructor(public readonly botManager: BotManager, public options: Options, readonly priceSource: IPricer) {
        this.botManager = botManager;

        this.client = new SteamUser({ autoRelogin: false });
        this.community = new SteamCommunity();
        this.manager = new TradeOfferManager({
            steam: this.client,
            community: this.community,
            useAccessToken: !this.options.steamApiKey, // https://github.com/DoctorMcKay/node-steam-tradeoffer-manager/wiki/Access-Tokens
            language: 'en',
            pollInterval: -1,
            minimumPollInterval: 5 * 1000, // set minimum between doPoll() calls
            cancelTime: 15 * 60 * 1000,
            pendingCancelTime: 1.5 * 60 * 1000,
            globalAssetCache: false
        });

        // ECP --START--
        this.ecp = new EasyCopyPasteCtor();
        const ecpSettings = options.miscSettings.ecp;

        if (ecpSettings) {
            this.ecp.useBoldChars = ecpSettings.useBoldChars ?? false;
            this.ecp.useWordSwap = ecpSettings.useWordSwap ?? true;
        }
        // ECP --END--

        this.bptf = new BptfLogin();
        this.tf2 = new TF2(this.client);
        this.friends = new Friends(this);
        this.groups = new Groups(this);
        this.trades = new Trades(this);
        this.listings = new Listings(this);
        this.tf2gc = new TF2GC(this);

        this.handler = new MyHandler(this, this.priceSource);
        this.inventoryCostBasis = new InventoryCostBasis(this);
        if (this.options.journalTfEnable && this.options.journalTfApiKey) {
            this.journalTfManager = new JournalTfManager(
                this.options.journalTfApiKey,
                this.handler.getPaths.files.journalTfSync
            );
        }
        if (this.options.IPC) this.ipc = new ipcHandler(this);

        this.admins = [];

        this.options.admins.forEach(adminData => {
            const admin = new SteamID(adminData.steam);
            admin.discordID = adminData.discord;

            if (!admin.isValid()) {
                throw new Error('Invalid admin steamID');
            }

            this.admins.push(admin);
        });

        this.itemStatsWhitelist =
            this.options.itemStatsWhitelist.length > 0
                ? ['76561198013127982', '76561198083901668']
                      .concat(this.options.itemStatsWhitelist)
                      .map(steamID => new SteamID(steamID))
                : ['76561198013127982', '76561198083901668'].map(steamID => new SteamID(steamID)); // IdiNium, Bliss

        this.itemStatsWhitelist.forEach(steamID => {
            if (!steamID.isValid()) {
                throw new Error('Invalid Item stats whitelist steamID');
            }
        });

        this.inventoryGetter = new InventoryGetter(this);
        this.boundInventoryGetter = this.inventoryGetter.getUserInventoryContents.bind(this.inventoryGetter);
    }

    isAdmin(steamID: SteamID | string): boolean {
        const steamID64 = steamID.toString();
        return this.admins.some(adminSteamID => adminSteamID.toString() === steamID64);
    }

    get getAdmins(): SteamID[] {
        return this.admins;
    }

    /**
     * Get the crit.tf store URL with cached slug if available, otherwise steamID-based URL
     */
    getPricedbStoreUrl(): string {
        if (!this.client.steamID) {
            log.warn('Cannot get PriceDB store URL: not logged in to Steam');
            return 'https://crit.tf';
        }

        const steamID = this.client.steamID.getSteamID64();
        const fallbackUrl = `https://crit.tf/store?id=${steamID}`;

        if (this.pricedbStoreManager) {
            const cachedUrl = this.pricedbStoreManager.getCachedStoreURL();
            if (cachedUrl) {
                return cachedUrl;
            }
        }

        return fallbackUrl;
    }

    isWhitelisted(steamID: SteamID | string): boolean {
        const steamID64 = steamID.toString();
        return this.itemStatsWhitelist.some(whitelistSteamID => whitelistSteamID.toString() === steamID64);
    }

    get getWhitelist(): SteamID[] {
        return this.itemStatsWhitelist;
    }

    async checkBanned(steamID: SteamID | string): Promise<IsBanned> {
        const steamID64 = typeof steamID === 'string' ? steamID : steamID.getSteamID64();
        if (this.repCache[steamID64] !== undefined) {
            // Temporary internal caching
            log.debug('Got rep from cached data.');
            return this.repCache[steamID64];
        }

        const v = new Bans({ bot: this, userID: this.userID, steamID: steamID64 });
        const isBanned = await v.isBanned();

        this.repCache[steamID64] = isBanned;
        return isBanned;
    }

    private initResetCacheInterval(): void {
        clearInterval(this.resetRepCache);
        this.resetRepCache = setInterval(() => {
            // Reset repCache every 12 hours (well, will always reset on restart)
            this.repCache = {};
        }, 12 * 60 * 60 * 1000);
    }

    private async checkAdminBanned(): Promise<boolean> {
        // guilty until proven otherwise
        let banned = true;
        const check = async (steamid: string) => {
            const v = new Bans({ bot: this, userID: this.userID, steamID: steamid, showLog: 'banned' });
            const result = await v.isBanned();
            banned = result.isBanned;
        };

        const steamids = this.admins.map(steamID => steamID.getSteamID64());
        if (this.client.steamID) {
            steamids.push(this.client.steamID.getSteamID64());
        }
        for (const steamid of steamids) {
            // same as Array.some, but I want to use await
            try {
                await check(steamid);
            } catch (err) {
                const error = err as AxiosError;
                if (error?.response?.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    await check(steamid);
                } else {
                    throw err;
                }
            }
        }

        return banned;
    }

    private periodicCheck(): void {
        this.periodicCheckAdmin = setInterval(() => {
            void this.checkAdminBanned()
                .then(banned => {
                    if (banned) {
                        return this.botManager.stop(new Error('Not allowed'));
                    }
                })
                .catch(() => {
                    // ignore error
                });
        }, 12 * 60 * 60 * 1000);
    }

    private getLocalizationFile(attempt: 'first' | 'retry' = 'first'): Promise<void> {
        return new Promise((resolve, reject) => {
            apiRequest<string>({
                method: 'GET',
                url: `https://raw.githubusercontent.com/SteamDatabase/GameTracking-TF2/master/tf/resource/tf_${this.options.tf2Language}.txt`,
                signal: axiosAbortSignal(60000)
            })
                .then(content => {
                    this.tf2.setLang(content);
                    resolve();
                })
                .catch(err => {
                    if (err instanceof AbortSignal && attempt !== 'retry') {
                        void this.getLocalizationFile('retry').then(resolve).catch(reject);
                        return;
                    }
                    // Just log, do nothing.
                    log.warn('Error getting TF2 Localization file.');
                    reject(err as Error);
                });
        });
    }

    get alertTypes(): string[] {
        return this.options.alerts;
    }

    checkEscrow(offer: TradeOfferManager.TradeOffer): Promise<boolean> {
        if (this.options.bypass.escrow.allow) {
            return Promise.resolve(false);
        }

        return this.trades.checkEscrow(offer);
    }

    messageAdmins(message: string, exclude: string[] | SteamID[]): void;

    messageAdmins(type: string, message: string, exclude: string[] | SteamID[]): void;

    messageAdmins(...args: [string, string[] | SteamID[]] | [string, string, string[] | SteamID[]]): void {
        const type: string | null = args.length === 2 ? null : args[0];

        if (type !== null && !this.alertTypes.includes(type)) {
            return;
        }

        // Check if messages are globally disabled
        if (this.options.globalDisable?.messages === true) {
            return;
        }

        const message: string = args.length === 2 ? args[0] : args[1];
        const exclude: string[] = (args.length === 2 ? (args[1] as SteamID[]) : (args[2] as SteamID[])).map(steamid =>
            steamid.toString()
        );

        this.admins
            .filter(steamID => !exclude.includes(steamID.toString()))
            .forEach(steamID => this.sendMessage(steamID, message));
    }

    getPrefix(steamID?: SteamID): string {
        if (steamID && steamID.redirectAnswerTo) {
            return this.options.miscSettings?.prefixes?.discord ?? '!';
        }
        return this.options.miscSettings?.prefixes?.steam ?? '!';
    }

    set setReady(isReady: boolean) {
        this.ready = isReady;
    }

    get isReady(): boolean {
        return this.ready;
    }

    get isHalted(): boolean {
        return this.halted;
    }

    async halt(): Promise<boolean> {
        this.halted = true;
        this.listings.stopNextCritCheckout();
        clearInterval(this.steamGamePresenceInterval);
        this.steamGamePresenceInterval = null;

        let removeAllListingsFailed = false;

        clearTimeout(this.steamGamePresenceTimeout);
        clearTimeout(this.manncoStoreRetryTimeout);
        this.manncoStoreRetryTimeout = null;
        clearInterval(this.manncoStoreListingsInterval);
        this.manncoStoreListingsInterval = null;
        clearInterval(this.manncoStoreOperationsInterval);
        this.manncoStoreOperationsInterval = null;
        log.debug('Setting status in Steam to "Snooze"');
        this.client.setPersona(EPersonaState.Snooze);

        log.debug('Settings status in Discord to "idle"');
        this.discordBot?.halt();

        clearInterval(this.autoRefreshListingsInterval);

        log.debug('Removing all listings due to halt mode turned on');
        await this.listings.removeAll().catch((err: Error) => {
            log.warn('Failed to remove all listings on enabling halt mode: ', err);
            removeAllListingsFailed = true;
        });

        return removeAllListingsFailed;
    }

    async unhalt(): Promise<boolean> {
        this.halted = false;
        let recreateListingsFailed = false;

        log.debug('Recreating all listings due to halt mode turned off');
        await this.listings.redoListings().catch((err: Error) => {
            log.warn('Failed to recreate all listings on disabling halt mode: ', err);
            recreateListingsFailed = true;
        });

        log.debug('Setting status in Steam to "Online"');
        this.client.setPersona(EPersonaState.Online);

        log.debug('Settings status in Discord to "online"');
        this.discordBot?.unhalt();

        this.startAutoRefreshListings();
        this.listings.startNextCritCheckout();

        return recreateListingsFailed;
    }

    private async reconcileManncoStoreListings(): Promise<void> {
        if (!this.manncoStoreManager?.isReady) return;

        const pricelistItems = Object.keys(this.pricelist.getPrices).reduce(
            (items: ManncoPricelistItem[], sku: string) => {
                const entry = this.pricelist.getPrice({ priceKey: sku, onlyEnabled: false });
                if (entry?.sellUsd !== undefined) items.push({ sku: entry.sku, sellUsd: entry.sellUsd });
                return items;
            },
            []
        );
        const reconciliation = await this.manncoStoreManager.reconcileListings(
            await this.manncoStoreManager.getOnSaleItems(),
            pricelistItems
        );
        const transactions = await this.manncoStoreManager.checkCompletedTransactions();
        for (const transaction of transactions) {
            sendManncoTransaction(transaction, this);
            this.messageAdmins(
                `Mannco.store ${transaction.type === 'sale' ? 'sale' : 'buy order completed'}: ` +
                    `${transaction.quantity}x ${transaction.name} for $${(transaction.price / 100).toFixed(2)}` +
                    (transaction.sku ? ` (${transaction.sku})` : ''),
                []
            );
        }

        for (const sku of reconciliation.importedSkus) {
            const entry = this.pricelist.getPrice({ priceKey: sku, onlyEnabled: false });
            if (entry?.sellUsd === undefined) continue;
            try {
                await this.manncoStoreManager.repriceSku(sku, entry.sellUsd);
            } catch (err) {
                log.warn(`Could not apply the pricelist USD sell price to imported Mannco.store listing ${sku}:`, err);
            }
        }
        if (reconciliation.importedSkus.length > 0) {
            log.info(`Imported ${reconciliation.importedSkus.length} existing Mannco.store listing SKU(s)`);
        }
    }

    private async activateManncoStore(): Promise<void> {
        await this.manncoStoreManager.init();
        try {
            await this.reconcileManncoStoreListings();
        } catch (err) {
            log.warn('Could not reconcile Mannco.store listings at startup:', err);
        }

        if (!this.manncoStoreListingsInterval) {
            this.manncoStoreListingsInterval = setInterval(() => {
                void this.reconcileManncoStoreListings().catch(err => {
                    log.warn('Could not reconcile Mannco.store listings:', err);
                });
            }, 5 * 60 * 1000);
        }
        if (!this.manncoStoreOperationsInterval) {
            this.manncoStoreOperationsInterval = setInterval(() => {
                void this.manncoStoreManager.reconcileOperations().catch(err => {
                    log.warn('Could not reconcile Mannco.store pending operations:', err);
                });
            }, 30 * 1000);
        }
    }

    private scheduleManncoStoreRetry(): void {
        if (this.halted || this.manncoStoreRetryTimeout || this.manncoStoreManager.isReady) return;

        this.manncoStoreRetryTimeout = setTimeout(() => {
            this.manncoStoreRetryTimeout = null;
            void this.activateManncoStore()
                .then(() => log.info('Mannco.store manager recovered after rate limiting.'))
                .catch(err => {
                    log.warn('Mannco.store background initialization failed; retrying in 15 minutes:', err);
                    this.scheduleManncoStoreRetry();
                });
        }, 15 * 60 * 1000);
    }

    private addListener(
        emitter: EventEmitter,
        event: string,
        listener: (...args: any[]) => void | Promise<void>,
        checkCanEmit: boolean
    ): void {
        emitter.on(event, (...args: any[]) => {
            setImmediate(() => {
                if (!checkCanEmit || this.canSendEvents()) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    void listener(...args);
                }
            });
        });
    }

    private addAsyncListener<T extends unknown[]>(
        emitter: EventEmitter,
        event: string,
        listener: (...args: T) => Promise<void>,
        checkCanEmit: boolean
    ): void {
        emitter.on(event, (...args: unknown[]): void => {
            if (!checkCanEmit || this.canSendEvents()) {
                setImmediate(() => {
                    void listener(...(args as T));
                });
            }
        });
    }

    startVersionChecker(): void {
        void this.checkForUpdates;

        setInterval(() => {
            this.checkForUpdates.catch(err => {
                log.error('Failed to check for updates: ', err);
            });
        }, 10 * 60 * 1000);
    }

    get checkForUpdates(): Promise<{
        hasNewVersion: boolean;
        latestVersion: string;
        canUpdateRepo: boolean;
        updateMessage: string;
        newVersionIsMajor: boolean;
    }> {
        return this.getLatestVersion().then(async content => {
            const latestVersion = content.version;
            const canUpdateRepo = semver.compare(process.env.BOT_VERSION, '5.6.0') !== -1 && content.canUpdateRepo;
            const updateMessage = content.updateMessage;

            const hasNewVersion = semver.lt(process.env.BOT_VERSION, latestVersion);
            const newVersionIsMajor = semver.diff(process.env.BOT_VERSION, latestVersion) === 'major';

            if (this.lastNotifiedVersion !== latestVersion && hasNewVersion) {
                this.lastNotifiedVersion = latestVersion;

                this.messageAdmins(
                    'version',
                    `⚠️ Update available! Current: ${process.env.BOT_VERSION_LABEL}, Latest: PDB-${latestVersion}.` +
                        `\n\n📰 Check discord (https://pricedb.io/discord) for release notes` +
                        (updateMessage ? `\n\n💬 Update message: ${updateMessage}` : ''),
                    []
                );

                await timersPromises.setTimeout(1000);

                if (this.isCloned() && process.env.pm_id !== undefined && canUpdateRepo) {
                    this.messageAdmins(
                        'version',
                        newVersionIsMajor
                            ? '⚠️ !updaterepo is not available. Please upgrade the bot manually.'
                            : `✅ Update now with !updaterepo command now!`,
                        []
                    );
                    return { hasNewVersion, latestVersion, canUpdateRepo, updateMessage, newVersionIsMajor };
                }

                if (!this.isCloned()) {
                    this.messageAdmins('version', `⚠️ The bot local repository is not cloned from Github.`, []);
                }

                let messages: string[];

                if (process.platform === 'win32') {
                    messages = [
                        '\n💻 To update run the following command inside your tf2autobot directory using Command Prompt:\n',
                        '/code rmdir /s /q node_modules dist && git reset HEAD --hard && git pull --prune && npm ci --no-audit && npm run build && node dist/app.js'
                    ];
                } else if (['win32', 'linux', 'darwin', 'openbsd', 'freebsd'].includes(process.platform)) {
                    messages = [
                        '\n💻 To update run the following command inside your tf2autobot directory:\n',
                        '/code rm -r node_modules dist && git reset HEAD --hard && git pull --prune && npm ci --no-audit && npm run build && pm2 restart ecosystem.json'
                    ];
                } else {
                    messages = [
                        '❌ Failed to find what OS your server is running! Kindly run the following standard command for most users inside your tf2autobot folder:\n',
                        '/code rm -r node_modules dist && git reset HEAD --hard && git pull --prune && npm ci --no-audit && npm run build && pm2 restart ecosystem.json'
                    ];
                }

                for (const message of messages) {
                    await timersPromises.setTimeout(1000);
                    this.messageAdmins('version', message, []);
                }
            }

            return { hasNewVersion, latestVersion, canUpdateRepo, updateMessage, newVersionIsMajor };
        });
    }

    private getLatestVersion(
        attempt: 'first' | 'retry' = 'first'
    ): Promise<{ version: string; canUpdateRepo: boolean; updateMessage: string }> {
        return new Promise((resolve, reject) => {
            apiRequest<GithubPackageJson>({
                method: 'GET',
                url: 'https://raw.githubusercontent.com/TF2-Price-DB/tf2autobot-pricedb/master/package.json',
                signal: axiosAbortSignal(60000)
            })
                .then(data => {
                    resolve({
                        version: data.version,
                        canUpdateRepo: data.updaterepo,
                        updateMessage: data.updateMessage
                    });
                })
                .catch(err => {
                    if (err instanceof AbortSignal && attempt !== 'retry') {
                        void this.getLatestVersion('retry').then(resolve).catch(reject);
                        return;
                    }
                    reject(err as Error);
                });
        });
    }

    startAutoRefreshListings(): void {
        let pricelistLength = 0;

        this.autoRefreshListingsInterval = setInterval(() => {
            const createListingsEnabled = this.options.miscSettings.createListings.enable;

            if (this.halted) {
                return;
            }

            if (this.alreadyExecutedRefreshlist || !createListingsEnabled) {
                log.debug(
                    `❌ ${
                        this.alreadyExecutedRefreshlist
                            ? 'Just recently executed refreshlist command'
                            : 'miscSettings.createListings.enable is set to false'
                    }, will not run automatic check for missing listings.`
                );

                setTimeout(() => {
                    this.startAutoRefreshListings();
                }, this.executedDelayTime);

                this.setRefreshlistExecutedDelay = 30 * 60 * 1000;
                clearInterval(this.autoRefreshListingsInterval);
                return;
            }

            pricelistLength = 0;
            log.debug('Running automatic check for missing/mismatch listings...');

            const listings: { [sku: string]: Listing[] } = {};
            this.listingManager.getListings(false, (err: AxiosError) => {
                void (async () => {
                    if (err) {
                        log.warn('Error getting listings on auto-refresh listings operation:', filterAxiosError(err));
                        setTimeout(() => {
                            this.startAutoRefreshListings();
                        }, 30 * 60 * 1000);
                        clearInterval(this.autoRefreshListingsInterval);
                        return;
                    }

                    const inventoryManager = this.inventoryManager;
                    const inventory = inventoryManager.getInventory;
                    const isFilterCantAfford = this.options.pricelist.filterCantAfford.enable;

                    this.listingManager.listings.forEach(listing => {
                        let listingSKU = listing.getSKU();
                        if (listing.intent === 1) {
                            if (this.options.normalize.festivized.our && listingSKU.includes(';festive')) {
                                listingSKU = listingSKU.replace(';festive', '');
                            }

                            if (this.options.normalize.strangeAsSecondQuality.our && listingSKU.includes(';strange')) {
                                listingSKU = listingSKU.replace(';strange', '');
                            }
                        }

                        let match: Entry | null;
                        const assetIdPrice = this.pricelist.getPrice({ priceKey: listing.id.slice('440_'.length) });
                        if (null !== assetIdPrice) {
                            match = assetIdPrice;
                        } else {
                            match = this.pricelist.getPrice({ priceKey: listingSKU });

                            if (
                                !match &&
                                listing.intent === 1 &&
                                this.options.normalize.painted.our &&
                                /;p\d+/.test(listingSKU)
                            ) {
                                const baseSKU = listingSKU.replace(/;p\d+/, '');
                                match = this.pricelist.getPrice({ priceKey: baseSKU });
                            }
                        }

                        if (isFilterCantAfford && listing.intent === 0 && match !== null) {
                            const canAffordToBuy = inventoryManager.isCanAffordToBuy(match.buy, inventory);
                            if (!canAffordToBuy) {
                                log.debug(`Intent buy, removed because can't afford: ${match.sku}`);
                                listing.remove();
                            }
                        }

                        if (listing.intent === 1 && match !== null && !match.enabled) {
                            log.debug(`Intent sell, removed because not selling: ${match.sku}`);
                            listing.remove();
                            this.listings.scheduleNextCritSync();
                        }

                        listings[listingSKU] = (listings[listingSKU] ?? []).concat(listing);

                        if (
                            this.options.normalize.painted.our &&
                            /;p\d+/.test(listingSKU) &&
                            match &&
                            match.sku !== listingSKU
                        ) {
                            listings[match.sku] = (listings[match.sku] ?? []).concat(listing);
                        }
                    });

                    const pricelist = Object.assign({}, this.pricelist.getPrices);
                    const keyPrice = this.pricelist.getKeyPrice.metal;

                    for (const priceKey in pricelist) {
                        if (!Object.prototype.hasOwnProperty.call(pricelist, priceKey)) {
                            continue;
                        }

                        const entry = pricelist[priceKey];
                        const _listings = listings[priceKey];

                        const amountCanBuy = inventoryManager.amountCanTrade({ priceKey, tradeIntent: 'buying' });
                        const amountAvailable = inventory.getAmount({
                            priceKey,
                            includeNonNormalized: false,
                            tradableOnly: true
                        });

                        if (_listings) {
                            _listings.forEach(listing => {
                                if (_listings.length === 1 && listing.intent === 0 && amountAvailable > entry.min) {
                                    log.debug(`Missing sell order listings: ${priceKey}`);
                                } else if (
                                    listing.intent === 0 &&
                                    listing.currencies.toValue(keyPrice) !== entry.buy.toValue(keyPrice)
                                ) {
                                    log.debug(`Buying price for ${priceKey} not updated`);
                                } else if (
                                    listing.intent === 1 &&
                                    listing.currencies.toValue(keyPrice) !== entry.sell.toValue(keyPrice)
                                ) {
                                    log.debug(`Selling price for ${priceKey} not updated`);
                                } else {
                                    delete pricelist[priceKey];
                                }
                            });

                            continue;
                        }

                        if (!entry.enabled) {
                            delete pricelist[priceKey];
                            log.debug(`${priceKey} disabled, skipping...`);
                            continue;
                        }

                        if (
                            (amountCanBuy > 0 && inventoryManager.isCanAffordToBuy(entry.buy, inventory)) ||
                            amountAvailable > 0
                        ) {
                            log.debug(
                                `Missing${isFilterCantAfford ? '/Re-adding can afford' : ' listings'}: ${priceKey}`
                            );
                        } else {
                            delete pricelist[priceKey];
                        }
                    }

                    const priceKeysToCheck = Object.keys(pricelist);
                    const pricelistCount = priceKeysToCheck.length;

                    if (pricelistCount > 0) {
                        log.debug(
                            'Checking listings for ' +
                                pluralize('item', pricelistCount, true) +
                                ` [${priceKeysToCheck.join(', ')}]...`
                        );

                        await this.listings.recursiveCheckPricelist(
                            priceKeysToCheck,
                            pricelist,
                            true,
                            pricelistCount > 4000 ? 400 : 200,
                            true
                        );

                        log.debug('✅ Done checking ' + pluralize('item', pricelistCount, true));
                    } else {
                        log.debug('❌ Nothing to refresh.');
                    }

                    pricelistLength = pricelistCount;
                })().catch(error_ => {
                    log.error('Auto-refresh listings task failed:', error_);
                });
            });
        }, (pricelistLength > 4000 ? 60 : 30) * 60 * 1000);
    }

    private get sendStatsEnabled(): boolean {
        return this.options.statistics.sendStats.enable;
    }

    sendStats(): void {
        clearInterval(this.sendStatsInterval);

        if (this.sendStatsEnabled) {
            this.sendStatsInterval = setInterval(() => {
                let times: string[];

                if (this.options.statistics.sendStats.time.length === 0) {
                    times = ['T05:59', 'T11:59', 'T17:59', 'T23:59'];
                } else {
                    times = this.options.statistics.sendStats.time;
                }

                const now = dayjs()
                    .tz(this.options.timezone ? this.options.timezone : 'UTC')
                    .format();

                if (times.some(time => now.includes(time))) {
                    if (
                        this.options.discordWebhook.sendStats.enable &&
                        this.options.discordWebhook.sendStats.url !== ''
                    ) {
                        void sendStats(this);
                    } else {
                        this.getAdmins.forEach(admin => {
                            this.handler.commands.useStatsCommand(admin);
                        });
                    }
                }
            }, 60 * 1000);
        }
    }

    disableSendStats(): void {
        clearInterval(this.sendStatsInterval);
    }

    initializeSchema(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.schemaManager.init(err => {
                if (err) {
                    reject(err);
                    return;
                }

                this.schema = this.schemaManager.schema;
                resolve();
            });
        });
    }

    start(): Promise<void> {
        let data: StartData = {};
        let cookies: string[];

        this.addListener(this.client, 'loggedOn', this.handler.onLoggedOn.bind(this.handler), false);
        this.addListener(this.client, 'refreshToken', this.handler.onRefreshToken.bind(this.handler), false);
        this.addListener(this.client, 'disconnected', this.onDisconnected.bind(this), false);
        this.addListener(this.client, 'loggedOff', this.onLoggedOff.bind(this), false);
        this.addAsyncListener(this.client, 'friendMessage', this.onMessage.bind(this), true);
        this.addListener(this.client, 'friendRelationship', this.handler.onFriendRelationship.bind(this.handler), true);
        this.addListener(this.client, 'groupRelationship', this.handler.onGroupRelationship.bind(this.handler), true);
        this.addListener(this.client, 'newItems', this.onNewItems.bind(this), true);
        this.addListener(this.client, 'webSession', this.onWebSession.bind(this), false);
        this.addListener(this.client, 'steamGuard', this.onSteamGuard.bind(this), false);
        this.addAsyncListener(this.client, 'error', this.onError.bind(this), false);

        this.addListener(this.community, 'sessionExpired', this.onSessionExpired.bind(this), false);
        this.addListener(this.community, 'confKeyNeeded', this.onConfKeyNeeded.bind(this), false);

        this.addListener(this.manager, 'pollData', this.handler.onPollData.bind(this.handler), false);
        this.addListener(this.manager, 'pollSuccess', this.trades.onPollSuccess.bind(this.trades), false);
        this.addListener(this.manager, 'pollFailure', this.trades.onPollFailure.bind(this.trades), false);
        this.addListener(this.manager, 'newOffer', this.trades.onNewOffer.bind(this.trades), true);
        this.addListener(this.manager, 'sentOfferChanged', this.trades.onOfferChanged.bind(this.trades), true);
        this.addListener(this.manager, 'receivedOfferChanged', this.trades.onOfferChanged.bind(this.trades), true);
        this.addListener(this.manager, 'offerList', this.trades.onOfferList.bind(this.trades), true);

        this.addListener(this.tf2, 'systemMessage', this.handler.onSystemMessage.bind(this.handler), true);
        this.addListener(this.tf2, 'displayNotification', this.handler.onDisplayNotification.bind(this.handler), true);
        this.addListener(this.tf2, 'itemBroadcast', this.handler.onItemBroadcast.bind(this.handler), true);

        return new Promise((resolve, reject) => {
            async.eachSeries(
                [
                    (callback: Callback): void => {
                        log.debug('Calling onRun');
                        void this.handler.onRun().asCallback((err: unknown, v: unknown) => {
                            if (err) {
                                callback(err as Error);
                                return;
                            }

                            data = (v as StartData) ?? {};

                            if (data.pollData) {
                                log.debug('Setting poll data');
                                this.manager.pollData = data.pollData;
                            }

                            if (data.loginAttempts) {
                                log.debug('Setting login attempts');
                                this.setLoginAttempts = data.loginAttempts;
                            }

                            if (data.blockedList) {
                                log.debug('Loading blocked list data');
                                this.blockedList = data.blockedList;
                            }

                            void this.inventoryCostBasis
                                .load()
                                .catch(error_ => log.error('Failed to load inventory cost basis:', error_))
                                .finally(() => callback(null));
                        });
                    },
                    (callback: Callback): void => {
                        void handleCallback(
                            (async () => {
                                log.info('Signing in to Steam...');
                                try {
                                    await this.login(await this.getRefreshToken());
                                    log.info('Signed in to Steam!');
                                    if (this.options.IPC) this.ipc.init();
                                } catch (err) {
                                    log.warn('Failed to sign in to Steam: ', err);
                                    throw err;
                                }
                            })(),
                            callback
                        );
                    },
                    (callback: Callback): void => {
                        if (!this.options.discordBotToken) {
                            log.info('Discord api key is not set, ignoring.');
                            callback(null);
                            return;
                        }

                        void handleCallback(
                            (async () => {
                                log.info(`Initializing Discord bot...`);
                                this.discordBot = new DiscordBot(this.options, this);
                                try {
                                    await this.discordBot.start();
                                } catch (err) {
                                    this.discordBot = null;
                                    log.warn('Failed to start Discord bot: ', err);
                                    throw err;
                                }
                            })(),
                            callback
                        );
                    },
                    (callback: Callback): void => {
                        log.debug('Waiting for web session');
                        void this.getWebSession().asCallback((err: unknown, v: unknown) => {
                            if (err) {
                                callback(err as Error);
                                return;
                            }

                            cookies = v as string[];
                            this.bptf.setCookies(cookies);

                            callback(null);
                        });
                    },
                    (callback: Callback): void => {
                        if (this.options.bptfApiKey && this.options.bptfAccessToken) {
                            callback(null);
                            return;
                        }

                        log.warn(
                            'You have not included the backpack.tf API key or access token in the environment variables'
                        );

                        void this.getBptfAPICredentials.asCallback((err: unknown) => {
                            if (err) {
                                callback(err as Error);
                                return;
                            }
                            callback(null);
                        });
                    },
                    (callback: Callback): void => {
                        log.info('Setting cookies...');
                        void this.setCookies(cookies).asCallback((err: unknown) => {
                            if (err) {
                                callback(err as Error);
                                return;
                            }
                            callback(null);
                        });
                    },
                    (callback: Callback): void => {
                        void handleCallback(
                            this.checkAdminBanned().then(banned => {
                                if (banned) {
                                    throw new Error('Not allowed');
                                }
                            }),
                            callback
                        );

                        this.periodicCheck();
                    },
                    (callback: Callback): void => {
                        this.schemaManager = new SchemaManager({
                            updateTime: 1 * 60 * 60 * 1000,
                            lite: true
                        });

                        log.info('Getting TF2 schema...');
                        void this.initializeSchema().asCallback((err: unknown) => {
                            if (err) {
                                callback(err as Error);
                                return;
                            }
                            callback(null);
                        });
                    },
                    (callback: Callback): void => {
                        log.info('Initializing pricelist...');

                        this.pricelist = new Pricelist(this.priceSource, this.schema, this.options, this);
                        this.addListener(
                            this.pricelist,
                            'pricelist',
                            this.handler.onPricelist.bind(this.handler),
                            false
                        );
                        this.addListener(this.pricelist, 'price', this.onKeyPriceChange.bind(this), true);
                        this.addListener(this.pricelist, 'price', this.handler.onPriceChange.bind(this.handler), true);

                        this.pricelist.init();

                        callback(null);
                    },
                    (callback: Callback): void => {
                        log.info('Initializing halt mode, inventory, bptf-listings, and profile settings');
                        if (this.options.miscSettings.startHalted.enable) {
                            void this.halt();
                        }

                        this.setProperties();
                        if (this.options.IPC) {
                            this.ipc.sendPricelist();
                            this.addListener(this.pricelist, 'pricelist', this.ipc.sendPricelist.bind(this.ipc), false);
                        }

                        async.parallel(
                            [
                                (cb: Callback): void => {
                                    log.debug('Initializing inventory...');
                                    this.inventoryManager = new InventoryManager(this.pricelist);
                                    Inventory.setOptions(this.schema.paints, this.strangeParts, this.options.highValue);
                                    this.inventoryManager.setInventory = new Inventory(
                                        this.client.steamID,
                                        this,
                                        'our',
                                        this.boundInventoryGetter
                                    );
                                    void this.inventoryManager.getInventory.fetch().asCallback((err: unknown) => {
                                        if (err) {
                                            cb(err as Error);
                                            return;
                                        }
                                        cb(null);
                                    });
                                },
                                (cb: Callback): void => {
                                    log.debug('Initializing bptf-listings...');
                                    this.userID = this.bptf._getUserID();
                                    this.listingManager = new ListingManager({
                                        token: this.options.bptfAccessToken,
                                        userID: this.userID,
                                        userAgent:
                                            'TF2AutobotPriceDB' +
                                            (this.options.useragentHeaderCustom !== ''
                                                ? ` - ${this.options.useragentHeaderCustom}`
                                                : ' - Run your own bot for free'),
                                        schema: this.schema
                                    });

                                    this.listingManager.token = this.options.bptfAccessToken;
                                    this.listingManager.steamid = this.client.steamID;

                                    this.addListener(
                                        this.listingManager,
                                        'pulse',
                                        this.handler.onUserAgent.bind(this),
                                        true
                                    );
                                    this.addListener(
                                        this.listingManager,
                                        'createListingsSuccessful',
                                        this.handler.onCreateListingsSuccessful.bind(this),
                                        true
                                    );
                                    this.addListener(
                                        this.listingManager,
                                        'updateListingsSuccessful',
                                        this.handler.onUpdateListingsSuccessful.bind(this),
                                        true
                                    );
                                    this.addListener(
                                        this.listingManager,
                                        'deleteListingsSuccessful',
                                        this.handler.onDeleteListingsSuccessful.bind(this),
                                        true
                                    );
                                    this.addListener(
                                        this.listingManager,
                                        'deleteArchivedListingSuccessful',
                                        this.handler.onDeleteArchivedListingSuccessful.bind(this),
                                        true
                                    );
                                    this.addListener(
                                        this.listingManager,
                                        'createListingsError',
                                        this.handler.onCreateListingsError.bind(this),
                                        true
                                    );
                                    this.addListener(
                                        this.listingManager,
                                        'updateListingsError',
                                        this.handler.onUpdateListingsError.bind(this),
                                        true
                                    );
                                    this.addListener(
                                        this.listingManager,
                                        'deleteListingsError',
                                        this.handler.onDeleteListingsError.bind(this),
                                        true
                                    );
                                    this.addListener(
                                        this.listingManager,
                                        'deleteArchivedListingError',
                                        this.handler.onDeleteArchivedListingError.bind(this),
                                        true
                                    );

                                    this.listingManager.init((err: unknown) => {
                                        if (err) {
                                            cb(err as Error);
                                            return;
                                        }
                                        cb(null);
                                    });
                                },
                                (cb: Callback): void => {
                                    if (
                                        !PRICEDB_STORE_ENABLED ||
                                        !this.options.pricedbStoreApiKey ||
                                        !this.options.miscSettings.pricedbStore.enable
                                    ) {
                                        log.debug(
                                            'Skipping PriceDB Store Manager initialization (temporarily disabled, not configured, or disabled)'
                                        );
                                        cb(null);
                                        return;
                                    }

                                    if (!this.client.steamID) {
                                        log.warn('Cannot initialize PriceDB Store Manager: not logged in to Steam');
                                        cb(null);
                                        return;
                                    }

                                    this.pricedbStoreManager = new PriceDBStoreManager(
                                        this.options.pricedbStoreApiKey,
                                        this.client.steamID.getSteamID64()
                                    );

                                    this.pricedbStoreManager.on('listingCreated', (listing: PriceDBListingEvent) => {
                                        log.debug('PriceDB Store listing created:', listing.id);
                                    });

                                    this.pricedbStoreManager.on('listingUpdated', (listing: PriceDBListingEvent) => {
                                        log.debug('PriceDB Store listing updated:', listing.id);
                                    });

                                    this.pricedbStoreManager.on('listingDeleted', (assetId: string) => {
                                        log.debug('PriceDB Store listing deleted:', assetId);
                                    });

                                    this.pricedbStoreManager.on(
                                        'inventoryRefreshed',
                                        (evt: PriceDBInventoryRefreshedEvent) => {
                                            log.info(
                                                `PriceDB Store inventory refreshed: ${evt.itemCount} items (${evt.refreshCount}/25 today)`
                                            );
                                        }
                                    );

                                    this.pricedbStoreManager.on('error', (err: unknown) => {
                                        log.error('PriceDB Store Manager error:', err);
                                    });

                                    void handleCallback(this.pricedbStoreManager.init(), cb);
                                },
                                (cb: Callback): void => {
                                    if (
                                        !this.options.manncoStoreApiKey ||
                                        !this.options.miscSettings.manncoStore.enable
                                    ) {
                                        log.debug(
                                            'Skipping Mannco.store manager initialization (not configured or disabled)'
                                        );
                                        cb(null);
                                        return;
                                    }

                                    this.manncoStoreManager = new ManncoStoreManager(
                                        this.options.manncoStoreApiKey,
                                        this.handler.getPaths.files.manncoData
                                    );
                                    this.manncoStoreManager.on('error', (err: unknown) => {
                                        log.error('Mannco.store manager error:', err);
                                    });

                                    this.manncoStoreManager.on('listingUpdated', (listing: { sku: string }) => {
                                        log.debug('Mannco.store listing updated:', listing.sku);
                                    });

                                    this.manncoStoreManager.on('listingsNoLongerOnSale', (skus: string[]) => {
                                        log.info(
                                            `Mannco.store listings are no longer on sale: ${skus.join(', ')}. ` +
                                                'They may have sold, been withdrawn, or been instantly bought.'
                                        );
                                    });

                                    this.pricelist.on('price', (_priceKey: string, entry: Entry) => {
                                        if (!this.manncoStoreManager.isReady) return;
                                        if (entry.sellUsd !== undefined) {
                                            void this.manncoStoreManager
                                                .repriceSku(entry.sku, entry.sellUsd)
                                                .catch(err => {
                                                    log.error(
                                                        `Failed to update Mannco.store listing for ${entry.sku}:`,
                                                        err
                                                    );
                                                });
                                        }
                                        const buyOrder = this.manncoStoreManager.getBuyOrder(entry.sku);
                                        if (entry.autoprice && entry.buyUsd !== undefined && buyOrder) {
                                            void this.manncoStoreManager
                                                .upsertBuyOrder(
                                                    entry.sku,
                                                    buyOrder.itemId,
                                                    buyOrder.amount,
                                                    entry.buyUsd
                                                )
                                                .catch(err => {
                                                    log.error(
                                                        `Failed to update Mannco.store buy order for ${entry.sku}:`,
                                                        err
                                                    );
                                                });
                                        }
                                    });

                                    let rateLimitAttempts = 0;
                                    const initialiseManncoStore = (): void => {
                                        void handleCallback(this.activateManncoStore(), err => {
                                            if (!err) {
                                                cb(null);
                                                return;
                                            }

                                            if (!(err instanceof ManncoRateLimitError)) {
                                                cb(err);
                                                return;
                                            }

                                            if (rateLimitAttempts++ < 3) {
                                                log.warn(
                                                    `Mannco.store login rate limited; retrying in ${Math.ceil(
                                                        err.retryAfterMs / 1000
                                                    )} seconds (${rateLimitAttempts}/3).`
                                                );
                                                this.manncoStoreRetryTimeout = setTimeout(() => {
                                                    this.manncoStoreRetryTimeout = null;
                                                    initialiseManncoStore();
                                                }, err.retryAfterMs);
                                                return;
                                            }

                                            log.warn(
                                                'Mannco.store remains rate limited after four login attempts; ' +
                                                    'continuing startup and retrying initialization every 15 minutes.'
                                            );
                                            this.scheduleManncoStoreRetry();
                                            cb(null);
                                        });
                                    };
                                    initialiseManncoStore();
                                },
                                (cb: Callback): void => {
                                    if (this.options.skipUpdateProfileSettings) {
                                        cb(null);
                                        return;
                                    }

                                    log.debug('Updating profile settings...');

                                    this.community.profileSettings(
                                        {
                                            profile: 3,
                                            inventory: 3,
                                            inventoryGifts: false
                                        },
                                        (err: unknown) => {
                                            if (err) {
                                                cb(err as Error);
                                                return;
                                            }
                                            cb(null);
                                        }
                                    );
                                }
                            ],
                            (err?: Error | null) => {
                                callback(err ?? null);
                            }
                        );
                    },
                    (callback: Callback): void => {
                        log.info('Setting up pricelist...');

                        const pricelist = Array.isArray(data.pricelist)
                            ? (data.pricelist.reduce((buff: Record<string, unknown>, e: EntryData) => {
                                  buff[e.sku] = e;
                                  return buff;
                              }, {}) as PricesDataObject)
                            : data.pricelist || {};

                        void handleCallback(
                            this.pricelist.setPricelist(pricelist, this).then(() => undefined),
                            callback
                        );
                    },
                    (callback: Callback): void => {
                        log.debug('Getting max friends...');
                        void this.friends.getMaxFriends.asCallback((err: unknown) => {
                            if (err) {
                                callback(err as Error);
                                return;
                            }
                            callback(null);
                        });
                    },
                    (callback: Callback): void => {
                        log.debug('Creating listings...');
                        void this.listings.redoListings().asCallback((err: unknown) => {
                            if (err) {
                                callback(err as Error);
                                return;
                            }
                            callback(null);
                        });
                    },
                    (callback: Callback): void => {
                        log.debug('Getting localization file...');
                        void handleCallback(
                            this.getLocalizationFile().then(() => {
                                setInterval(() => {
                                    void this.getLocalizationFile();
                                }, 24 * 60 * 60 * 1000);
                            }),
                            callback
                        );
                    },
                    (callback: Callback): void => {
                        void handleCallback(this.setupTradeOfferUrl(), callback);
                    }
                ],
                (item: (cb: Callback) => void, callback: Callback): void => {
                    if (this.botManager.isStopping) {
                        resolve();
                        return;
                    }
                    item(callback);
                },
                (err?: Error | null): void => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (this.botManager.isStopping) {
                        resolve();
                        return;
                    }

                    void this.checkTradeProtectionAcknowledged();
                    this.manager.pollInterval = 10 * 1000;
                    this.setReady = true;
                    this.listings.startNextCritCheckout();
                    this.handler.onReady();
                    this.trades.startPollWatchdog();
                    this.manager.doPoll();
                    this.startVersionChecker();
                    this.initResetCacheInterval();

                    if (this.options.discordBotToken && this.discordBot && !this.halted) {
                        this.discordBot?.setPresence('online');
                    }

                    resolve();
                }
            );
        });
    }

    setProperties(): void {
        this.effects = this.schema.getUnusualEffects();
        this.strangeParts = this.schema.getStrangeParts();
        this.craftWeapons = this.schema.getCraftableWeaponsForTrading();
        this.uncraftWeapons = this.schema.getUncraftableWeaponsForTrading();
        this.craftWeaponsByClass = {
            scout: this.schema.getWeaponsForCraftingByClass('Scout'),
            soldier: this.schema.getWeaponsForCraftingByClass('Soldier'),
            pyro: this.schema.getWeaponsForCraftingByClass('Pyro'),
            demoman: this.schema.getWeaponsForCraftingByClass('Demoman'),
            heavy: this.schema.getWeaponsForCraftingByClass('Heavy'),
            engineer: this.schema.getWeaponsForCraftingByClass('Engineer'),
            medic: this.schema.getWeaponsForCraftingByClass('Medic'),
            sniper: this.schema.getWeaponsForCraftingByClass('Sniper'),
            spy: this.schema.getWeaponsForCraftingByClass('Spy')
        };

        clearInterval(this.updateSchemaPropertiesInterval);
        this.refreshSchemaProperties();
    }

    private refreshSchemaProperties(): void {
        this.updateSchemaPropertiesInterval = setInterval(() => {
            this.setProperties();
        }, 24 * 60 * 60 * 1000);
    }

    setCookies(cookies: string[]): Promise<void> {
        this.community.setCookies(cookies);

        if (this.isReady) {
            this.bptf.setCookies(cookies);
            this.userID = this.bptf._getUserID();
            this.listingManager.setUserID(this.userID);
        }

        if (this.options.steamApiKey) {
            this.manager.apiKey = this.options.steamApiKey;
        }

        return new Promise((resolve, reject) => {
            this.manager.setCookies(cookies, (err: unknown) => {
                if (err) {
                    reject(err as Error);
                    return;
                }

                resolve();
            });
        });
    }

    getWebSession(eventOnly = false): Promise<string[]> {
        return new Promise((resolve, reject) => {
            if (!eventOnly) {
                const cookies = this.getCookies;
                if (cookies.length !== 0) {
                    resolve(cookies);
                    return;
                }
            }

            this.client.once('webSession', webSessionEvent);

            const timeout = setTimeout(() => {
                this.client.removeListener('webSession', webSessionEvent);
                reject(new Error('Could not sign in to steamcommunity'));
            }, 10000);

            function webSessionEvent(sessionID: string, cookies: string[]): void {
                clearTimeout(timeout);
                resolve(cookies);
            }
        });
    }

    private get getCookies(): string[] {
        const cookies = this.community._jar
            .getCookiesSync('https://steamcommunity.com')
            .filter(cookie => ['sessionid', 'steamLogin', 'steamLoginSecure'].includes(cookie.key))
            .map(cookie => `${cookie.key}=${cookie.value}`);
        return cookies;
    }

    private get getBptfAPICredentials(): Promise<{
        apiKey: string;
        accessToken: string;
    }> {
        return this.bptfLogin().then(() => {
            log.verbose('Getting API key and access token...');

            return Promise.all([this.getOrCreateBptfAPIKey, this.getBptfAccessToken]).then(([apiKey, accessToken]) => {
                log.verbose('Got backpack.tf API key and access token!');

                this.options.bptfApiKey = apiKey;
                this.options.bptfAccessToken = accessToken;
                this.handler.onBptfAuth({ apiKey, accessToken });

                return { apiKey, accessToken };
            });
        });
    }

    private get getBptfAccessToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.bptf.getAccessToken((err: unknown, accessToken: unknown) => {
                if (err) {
                    reject(err as Error);
                    return;
                }

                resolve(accessToken as string);
            });
        });
    }

    private get getOrCreateBptfAPIKey(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.bptf.getAPIKey((err: unknown, apiKey: unknown) => {
                if (err) {
                    reject(err as Error);
                    return;
                }

                if (apiKey !== null) {
                    resolve(apiKey as string);
                    return;
                }

                log.verbose("You don't have a backpack.tf API key, creating one...");

                this.bptf.generateAPIKey(
                    'http://localhost',
                    'Check if an account is banned on backpack.tf',
                    (err2: unknown, apiKey2: unknown) => {
                        if (err2) {
                            reject(err2 as Error);
                            return;
                        }

                        resolve(apiKey2 as string);
                    }
                );
            });
        });
    }

    private bptfLogin(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.bptf['loggedIn']) {
                resolve();
                return;
            }

            log.verbose('Signing in to backpack.tf...');

            this.bptf.login((err: unknown) => {
                if (err) {
                    reject(err as Error);
                    return;
                }

                log.verbose('Logged in to backpack.tf!');
                this.bptf['loggedIn'] = true;

                resolve();
            });
        });
    }

    private login(refreshToken?: string): Promise<void> {
        log.debug('Starting login attempt');
        this.isLoginAttemptActive = true;

        const wait = this.loginWait();
        if (wait !== 0) {
            this.handler.onLoginThrottle(wait);
        }

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const gotEvent = (): void => undefined;

                const loggedOnEvent = (): void => {
                    gotEvent();

                    this.client.removeListener('error', errorEvent);
                    clearTimeout(timeout);

                    this.isLoginAttemptActive = false;
                    resolve();
                };

                const errorEvent = (err: CustomError): void => {
                    gotEvent();

                    this.client.removeListener('loggedOn', loggedOnEvent);
                    clearTimeout(timeout);
                    this.isLoginAttemptActive = false;

                    log.error('Failed to sign in to Steam: ', err);

                    if (err.eresult === EResult.AccessDenied) {
                        void this.deleteRefreshToken().then(
                            () => reject(err),
                            () => reject(err)
                        );
                    } else {
                        reject(err);
                    }
                };

                const timeout = setTimeout(() => {
                    gotEvent();

                    this.client.removeListener('loggedOn', loggedOnEvent);
                    this.client.removeListener('error', errorEvent);

                    this.isLoginAttemptActive = false;
                    log.debug('Did not get login response from Steam');
                    this.client.logOff();

                    reject(new Error('Did not get login response (Steam might be down)'));
                }, 60 * 1000);

                this.client.once('loggedOn', loggedOnEvent);
                this.client.once('error', errorEvent);

                let loginDetails: { refreshToken: string } | { accountName: string; password: string };

                if (refreshToken) {
                    log.debug('Attempting to login to Steam with refresh token...');
                    loginDetails = { refreshToken };
                } else {
                    log.debug('Attempting to login to Steam...');
                    loginDetails = {
                        accountName: this.options.steamAccountName,
                        password: this.options.steamPassword
                    };
                }

                this.newLoginAttempt();
                this.client.logOn(loginDetails);
            }, wait);
        });
    }

    private calculateBackoff(delay: number, attempts: number): number {
        return delay * Math.pow(2, attempts - 1) + Math.floor(Math.random() * 1000);
    }

    private async getRefreshToken(): Promise<string | null> {
        const tokenPath = this.handler.getPaths.files.refreshToken;

        const refreshToken = (await files.readFile(tokenPath, false).catch(() => null)) as string;

        if (!refreshToken || !isUsableRefreshToken(refreshToken.trim())) {
            if (refreshToken) {
                log.warn('Discarding an invalid or expired Steam refresh token.');
                await this.deleteRefreshToken();
            }
            return null;
        }

        return refreshToken.trim();
    }

    private async deleteRefreshToken(): Promise<void> {
        const tokenPath = this.handler.getPaths.files.refreshToken;

        await files.deleteFile(tokenPath).catch(() => {
            // Ignore error
        });
    }

    private async setupTradeOfferUrl(): Promise<void> {
        const cachedTradeOfferUrl = await this.getCachedTradeOfferUrl();

        if (cachedTradeOfferUrl !== null) {
            this.tradeOfferUrl = cachedTradeOfferUrl;
            return;
        }

        try {
            await this.refreshTradeOfferUrl();
        } catch (err) {
            if (!this.isSteamHttp429(err as Error)) {
                throw err;
            }

            log.warn('Steam returned HTTP 429 while getting trade offer URL; continuing startup and retrying: ', err);
            this.scheduleTradeOfferUrlRetry();
        }
    }

    private async refreshTradeOfferUrl(): Promise<void> {
        const { url } = await this.client.getTradeURL();

        if (!url) {
            throw new Error('Steam did not return a trade offer URL');
        }

        this.tradeOfferUrl = url;
        this.cacheTradeOfferUrl(url);
    }

    private scheduleTradeOfferUrlRetry(attempt = 1): void {
        if (this.tradeOfferUrlRetryTimeout) {
            return;
        }

        const delay = Math.min(attempt * TRADE_OFFER_URL_RETRY_BASE_DELAY, TRADE_OFFER_URL_RETRY_MAX_DELAY);

        this.tradeOfferUrlRetryTimeout = setTimeout(() => {
            this.tradeOfferUrlRetryTimeout = null;

            void this.refreshTradeOfferUrl().catch((err: Error) => {
                log.warn('Failed to refresh trade offer URL, retrying later: ', err);
                this.scheduleTradeOfferUrlRetry(attempt + 1);
            });
        }, delay);
    }

    private isSteamHttp429(err: Error): boolean {
        const httpError = err as HttpError;
        return httpError.code === 429 || httpError.code === '429' || httpError.message === 'HTTP error 429';
    }

    private async getCachedTradeOfferUrl(): Promise<string | null> {
        const tradeOfferUrlPath = this.handler.getPaths.files.tradeOfferUrl;
        const tradeOfferUrl = (await files.readFile(tradeOfferUrlPath, false).catch(() => null)) as unknown;

        if (typeof tradeOfferUrl !== 'string' || tradeOfferUrl.trim() === '') {
            return null;
        }

        return tradeOfferUrl.trim();
    }

    private cacheTradeOfferUrl(tradeOfferUrl: string): void {
        const tradeOfferUrlPath = this.handler.getPaths.files.tradeOfferUrl;

        files.writeFile(tradeOfferUrlPath, tradeOfferUrl, false).catch(() => {
            log.error('Error saving Trade Offer Url.');
        });
    }

    // Reference: https://github.com/tf2-automatic/tf2-automatic/blob/9b98d2e5b6e3b0b9d0b82651debada7d2fd57b99/apps/bot/src/bot/bot.service.ts#L601
    private async checkTradeProtectionAcknowledged(): Promise<void> {
        const path = this.handler.getPaths.files.tradeProtectionAcknowledge;
        const alreadyAcknowledge = (await files.readFile(path, true).catch(() => null)) as boolean;

        if (!alreadyAcknowledge) {
            // This should only be done once
            this.community.acknowledgeTradeProtection(err => {
                if (err) {
                    log.warn('Error on acknowledgeTradeProtection', err);
                    return;
                }

                files.writeFile(path, true, true).catch(err => {
                    log.error('Error saving Trade Protection Acknowlege file', err);
                });
            });
        }
    }

    sendMessage(steamID: SteamID | string, message: string): void {
        if (steamID instanceof SteamID && steamID.redirectAnswerTo) {
            const origMessage = steamID.redirectAnswerTo;
            if (origMessage instanceof DiscordMessage && this.discordBot) {
                this.discordBot.sendAnswer(origMessage, message);
            } else {
                log.error(`Failed to send message, broken redirect:`, origMessage);
            }
            return;
        }

        if (this.options.globalDisable?.messages === true && !this.isAdmin(steamID)) {
            log.debug(`Steam message not sent (globally disabled) to ${steamID.toString()}: ${message}`);
            return;
        }

        const steamID64 = steamID.toString();
        const friend = this.friends.getFriend(steamID64);

        if (!friend) {
            this.client.chatMessage(steamID, message);
            this.getPartnerDetails(steamID64)
                .then(name => {
                    log.info(`Message sent to ${name} (${steamID64} - not friend): ${message}`);
                })
                .catch(err => {
                    log.error(`Error while getting ${steamID64} details`, err);
                });
            return;
        }

        const friendName = friend.player_name;
        this.client.chat.sendFriendMessage(steamID, message, { chatEntryType: 1 }, (err: unknown) => {
            if (err) {
                log.warn(`Failed to send message to ${friendName} (${steamID64}):`, err);
                return;
            }

            log.info(`Message sent to ${friendName} (${steamID64}): ${message}`);
        });
    }

    private getPartnerDetails(steamID: SteamID | string): Promise<string> {
        return new Promise(resolve => {
            this.community.getSteamUser(steamID, (err: unknown, user: unknown) => {
                if (err) {
                    resolve('unknown');
                    return;
                }

                const u = user as { name?: string };
                resolve(u?.name ?? 'unknown');
            });
        });
    }

    private canSendEvents(): boolean {
        return this.ready && !this.botManager.isStopping;
    }

    private async onMessage(steamID: SteamID, message: string): Promise<void> {
        if (message.startsWith('[tradeoffer sender=') && message.endsWith('[/tradeoffer]')) {
            return;
        }

        await this.handler.onMessage(steamID, message);
    }

    private onNewItems(count: number): void {
        if (count !== 0) {
            log.debug(`Received ${count} item notifications, resetting to zero`);
            this.community.resetItemNotifications();
        }
    }

    private onWebSession(sessionID: string, cookies: string[]): void {
        log.debug(`New web session`);
        void this.setCookies(cookies);
    }

    private onSessionExpired(): void {
        log.debug('Web session has expired');
        if (this.client.steamID) this.client.webLogOn();
    }

    private onConfKeyNeeded(tag: string, callback: (err: Error | null, time: number, confKey: string) => void): void {
        log.debug('Conf key needed');

        void this.getTimeOffset
            .then(offset => {
                const time = SteamTotp.time(offset);
                const confKey = SteamTotp.getConfirmationKey(this.options.steamIdentitySecret, time, tag);
                callback(null, time, confKey);
            })
            .catch(() => {
                const time = SteamTotp.time(undefined);
                const confKey = SteamTotp.getConfirmationKey(this.options.steamIdentitySecret, time, tag);
                callback(null, time, confKey);
            });
    }

    private onSteamGuard(domain: string, callback: (authCode: string) => void, lastCodeWrong: boolean): void {
        log.debug(`Steam guard code requested for ${domain}`);

        if (lastCodeWrong === false) {
            this.consecutiveSteamGuardCodesWrong = 0;
        } else {
            this.consecutiveSteamGuardCodesWrong++;
        }

        if (this.consecutiveSteamGuardCodesWrong > 1) {
            throw new Error('Too many wrong Steam Guard codes');
        }

        const wait = this.loginWait();
        if (wait !== 0) {
            this.handler.onLoginThrottle(wait);
        }

        void timersPromises
            .setTimeout(wait)
            .then(this.generateAuthCode.bind(this))
            .then(authCode => {
                this.newLoginAttempt();
                callback(authCode);
            });
    }

    private onDisconnected(eresult: EResult, msg?: string): void {
        log.warn('Disconnected from Steam', { eresult, msg });

        // Notify handler
        this.handler.onDisconnected(eresult, msg);

        // Check if we should attempt to reconnect
        const reconnectConfig = this.options.steamConnection?.autoReconnect;
        if (
            !reconnectConfig?.enable ||
            this.botManager.isStopping ||
            this.isReconnecting ||
            this.isLoginAttemptActive
        ) {
            return;
        }

        this.beginReconnect();
    }

    private onLoggedOff(): void {
        log.info('Logged off from Steam');
        this.handler.onLoggedOff();
        this.beginReconnect();
    }

    private beginReconnect(): void {
        const reconnectConfig = this.options.steamConnection?.autoReconnect;
        if (
            !reconnectConfig?.enable ||
            this.botManager.isStopping ||
            this.isReconnecting ||
            this.isLoginAttemptActive
        ) {
            return;
        }

        if (this.deferReconnectForSteamMaintenance()) {
            return;
        }

        this.attemptReconnect();
    }

    private deferReconnectForSteamMaintenance(resetAttempts = false): boolean {
        const maintenanceDelay = getSteamMaintenanceDelay();
        if (maintenanceDelay === null) {
            return false;
        }

        if (resetAttempts) {
            this.reconnectAttempts = 0;
        }

        this.isReconnecting = true;
        if (this.reconnectTimeout) {
            return true;
        }

        log.warn(
            `Deferring Steam recovery for ${Math.ceil(maintenanceDelay / 60000)} minutes during weekly maintenance.`
        );
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;

            if (this.botManager.isStopping) {
                this.resetReconnectionState();
                return;
            }

            this.attemptReconnect();
        }, maintenanceDelay);

        return true;
    }

    private restartAfterSteamRecoveryFailure(err: Error): void {
        if (this.recoveryRestartRequested) return;
        if (this.deferReconnectForSteamMaintenance(true)) {
            return;
        }

        this.recoveryRestartRequested = true;
        log.error('Steam recovery failed; restarting the bot.', err);
        void this.botManager
            .restartProcess()
            .then(restarted => {
                if (!restarted) this.botManager.stop(err, false, true);
            })
            .catch(restartErr => {
                log.error('Failed to restart after Steam recovery failure:', restartErr);
                this.botManager.stop(err, false, true);
            });
    }

    private attemptReconnect(): void {
        const reconnectConfig = this.options.steamConnection?.autoReconnect;
        if (!reconnectConfig?.enable) {
            return;
        }

        const maxAttempts = reconnectConfig.maxAttempts ?? 5;
        if (this.deferReconnectForSteamMaintenance(this.reconnectAttempts >= maxAttempts)) {
            return;
        }

        if (this.reconnectAttempts >= maxAttempts) {
            this.restartAfterSteamRecoveryFailure(new Error('Max reconnection attempts reached'));
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;

        let delay = (reconnectConfig.delaySeconds ?? 30) * 1000;

        if (reconnectConfig.exponentialBackoff) {
            // Exponential backoff: delay * (2 ^ (attempt - 1))
            delay = delay * Math.pow(2, this.reconnectAttempts - 1);
            // Cap at 5 minutes
            delay = Math.min(delay, 5 * 60 * 1000);
        }

        log.info(`Attempting to reconnect (${this.reconnectAttempts}/${maxAttempts}) in ${delay / 1000} seconds...`);

        this.reconnectTimeout = setTimeout(() => {
            void (async () => {
                this.reconnectTimeout = null;
                try {
                    log.info('Reconnecting to Steam...');
                    await this.login(await this.getRefreshToken());

                    // Reset reconnection state on successful login
                    this.resetReconnectionState();
                    this.recoveryRestartRequested = false;

                    log.info('Successfully reconnected to Steam!');

                    // Restore online status and game
                    if (this.ready) {
                        this.client.setPersona(EPersonaState.Online);
                        this.updateSteamGamePresence(true);
                    }
                } catch (err) {
                    log.error('Failed to reconnect:', err);
                    // Keep the reconnect lock while scheduling the next attempt.
                    // Try again
                    this.attemptReconnect();
                }
            })();
        }, delay);
    }

    private async onError(err: CustomError): Promise<void> {
        if (this.isLoginAttemptActive) {
            return;
        }

        if (err.eresult === EResult.LoggedInElsewhere) {
            log.warn('Signed in elsewhere; restarting the bot...');
            this.restartAfterSteamRecoveryFailure(err);
        } else if (err.eresult === EResult.AccessDenied) {
            await this.deleteRefreshToken();
            this.beginReconnect();
        } else if (err.eresult === EResult.LogonSessionReplaced) {
            this.sessionReplaceCount++;

            if (this.sessionReplaceCount > 1) {
                log.warn('Detected login session replace loop, stopping bot...');
                this.restartAfterSteamRecoveryFailure(err);
                return;
            }

            log.warn('Login session replaced, relogging...');

            await this.deleteRefreshToken();

            this.beginReconnect();
        } else {
            log.error('Unhandled Steam error; attempting recovery:', err);
            this.beginReconnect();
        }
    }

    private async generateAuthCode(): Promise<string> {
        let offset: number | undefined;
        try {
            offset = await this.getTimeOffset;
        } catch {
            // ignore
        }

        return SteamTotp.generateAuthCode(this.options.steamSharedSecret, offset);
    }

    private get getTimeOffset(): Promise<number> {
        return new Promise((resolve, reject) => {
            if (this.timeOffset !== null) {
                resolve(this.timeOffset);
                return;
            }

            SteamTotp.getTimeOffset((err: unknown, offset: unknown) => {
                if (err) {
                    reject(err as Error);
                    return;
                }

                this.timeOffset = offset as number;
                resolve(this.timeOffset);
            });
        });
    }

    private loginWait(): number {
        const attemptsWithinPeriod = this.getLoginAttemptsWithinPeriod;

        let wait = 0;
        if (attemptsWithinPeriod.length >= this.maxLoginAttemptsWithinPeriod) {
            const oldest = attemptsWithinPeriod[0];
            const timeCanAttempt = dayjs().add(this.loginPeriodTime, 'millisecond');
            wait = timeCanAttempt.diff(oldest, 'millisecond');
        }

        if (wait === 0 && this.consecutiveSteamGuardCodesWrong > 1) {
            return 30000 * this.consecutiveSteamGuardCodesWrong;
        }

        return wait;
    }

    private set setLoginAttempts(attempts: number[]) {
        this.loginAttempts = attempts.map(time => dayjs.unix(time));
    }

    private get getLoginAttemptsWithinPeriod(): dayjs.Dayjs[] {
        const now = dayjs();
        return this.loginAttempts.filter(attempt => now.diff(attempt, 'millisecond') < this.loginPeriodTime);
    }

    private newLoginAttempt(): void {
        const now = dayjs();

        this.loginAttempts = this.loginAttempts.filter(
            attempt => now.diff(attempt, 'millisecond') < this.loginPeriodTime
        );

        this.loginAttempts.push(now);

        this.handler.onLoginAttempts(this.loginAttempts.map(attempt => attempt.unix()));
    }

    isCloned(): boolean {
        return fs.existsSync(path.resolve(__dirname, '..', '..', '.git'));
    }
}

interface GithubPackageJson {
    version: string;
    updaterepo: boolean;
    updateMessage: string;
}
