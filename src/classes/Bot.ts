import SteamID from 'steamid';
import SteamUser from 'steam-user';
import { EResult, EPersonaState } from 'steam-user';
import TradeOfferManager, { CustomError, EconItem } from '@tf2autobot/tradeoffer-manager';
import SteamCommunity from '@tf2autobot/steamcommunity';
import SteamTotp from 'steam-totp';
import ListingManager, { Listing } from '@tf2autobot/bptf-listings';
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

import jwt from 'jsonwebtoken';
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

import log from '../lib/logger';
import Bans, { IsBanned } from '../lib/bans';
import { sendStats } from './DiscordWebhook/export';

import Options from './Options';
import IPricer from './IPricer';
import { EventEmitter } from 'events';
import { Blocked } from './MyHandler/interfaces';
import filterAxiosError from '@tf2autobot/filter-axios-error';
import { axiosAbortSignal } from '../lib/helpers';
import { apiRequest } from '../lib/apiRequest';

export interface SteamTokens {
    refreshToken: string;
    accessToken: string;
}

export default class Bot {
    // Modules and classes
    schema: SchemaManager.Schema;

    readonly bptf: BptfLogin;

    readonly tf2: TF2;

    readonly client: SteamUser;

    readonly manager: TradeOfferManager;

    readonly community: SteamCommunity;

    tradeOfferUrl: string;

    listingManager: ListingManager;

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

    public autoRefreshListingsInterval: NodeJS.Timeout;

    private alreadyExecutedRefreshlist = false;

    set isRecentlyExecuteRefreshlistCommand(setExecuted: boolean) {
        this.alreadyExecutedRefreshlist = setExecuted;
    }

    private executedDelayTime = 30 * 60 * 1000;

    set setRefreshlistExecutedDelay(delay: number) {
        this.executedDelayTime = delay;
    }

    public sendStatsInterval: NodeJS.Timeout;

    public periodicCheckAdmin: NodeJS.Timeout;

    constructor(public readonly botManager: BotManager, public options: Options, readonly priceSource: IPricer) {
        this.botManager = botManager;

        this.client = new SteamUser();
        this.community = new SteamCommunity();
        this.manager = new TradeOfferManager({
            steam: this.client,
            community: this.community,
            useAccessToken: !this.options.steamApiKey, // https://github.com/DoctorMcKay/node-steam-tradeoffer-manager/wiki/Access-Tokens
            language: 'en',
            pollInterval: -1,
            cancelTime: 15 * 60 * 1000,
            pendingCancelTime: 1.5 * 60 * 1000,
            globalAssetCache: true,
            assetCacheMaxItems: 50
        });

        this.bptf = new BptfLogin();
        this.tf2 = new TF2(this.client);
        this.friends = new Friends(this);
        this.groups = new Groups(this);
        this.trades = new Trades(this);
        this.listings = new Listings(this);
        this.tf2gc = new TF2GC(this);

        this.handler = new MyHandler(this, this.priceSource);

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
                ? ['76561198013127982'].concat(this.options.itemStatsWhitelist).map(steamID => new SteamID(steamID))
                : ['76561198013127982'].map(steamID => new SteamID(steamID)); // IdiNium

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
        steamids.push(this.client.steamID.getSteamID64());
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
                    return resolve();
                })
                .catch(err => {
                    if (err instanceof AbortSignal && attempt !== 'retry') {
                        return this.getLocalizationFile('retry');
                    }
                    // Just log, do nothing.
                    log.warn('Error getting TF2 Localization file.');
                    return reject(err);
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
        let removeAllListingsFailed = false;

        // If we want to show another game here, probably needed new functions like Bot.useMainGame() and Bot.useHaltGame()
        // (and refactor to use everywhere these functions instead of gamesPlayed)
        log.debug('Setting status in Steam to "Snooze"');
        this.client.setPersona(EPersonaState.Snooze);

        log.debug('Settings status in Discord to "idle"');
        this.discordBot?.halt();

        // disable auto-check for missing/mismatching listings
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
        let recrateListingsFailed = false;

        log.debug('Recreating all listings due to halt mode turned off');
        await this.listings.redoListings().catch((err: Error) => {
            log.warn('Failed to recreate all listings on disabling halt mode: ', err);
            recrateListingsFailed = true;
        });

        log.debug('Setting status in Steam to "Online"');
        this.client.setPersona(EPersonaState.Online);

        log.debug('Settings status in Discord to "online"');
        this.discordBot?.unhalt();

        // Re-initialize auto-check for missing/mismatching listings
        this.startAutoRefreshListings();

        return recrateListingsFailed;
    }

    private addListener(
        emitter: EventEmitter,
        event: string,
        listener: (...args: any[]) => void,
        checkCanEmit: boolean
    ): void {
        emitter.on(event, (...args: any[]) => {
            setImmediate(() => {
                if (!checkCanEmit || this.canSendEvents()) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    listener(...args);
                }
            });
        });
    }

    private addAsyncListener(
        emitter: EventEmitter,
        event: string,
        listener: (...args) => Promise<void>,
        checkCanEmit: boolean
    ): void {
        emitter.on(event, (...args): void => {
            if (!checkCanEmit || this.canSendEvents()) {
                // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-argument
                setImmediate(listener, ...args);
            }
        });
    }

    startVersionChecker(): void {
        void this.checkForUpdates;

        // Check for updates every 10 minutes
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
                    `⚠️ Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.` +
                        `\n\n📰 Release note: https://github.com/TF2Autobot/tf2autobot/releases` +
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
                        '/code rmdir /s /q node_modules dist && git reset HEAD --hard && git pull --prune && npm install --no-audit && npm run build && node dist/app.js'
                    ];
                } else if (['win32', 'linux', 'darwin', 'openbsd', 'freebsd'].includes(process.platform)) {
                    messages = [
                        '\n💻 To update run the following command inside your tf2autobot directory:\n',
                        '/code rm -r node_modules dist && git reset HEAD --hard && git pull --prune && npm install --no-audit && npm run build && pm2 restart ecosystem.json'
                    ];
                } else {
                    messages = [
                        '❌ Failed to find what OS your server is running! Kindly run the following standard command for most users inside your tf2autobot folder:\n',
                        '/code rm -r node_modules dist && git reset HEAD --hard && git pull --prune && npm install --no-audit && npm run build && pm2 restart ecosystem.json'
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
                url: 'https://raw.githubusercontent.com/TF2Autobot/tf2autobot/master/package.json',
                signal: axiosAbortSignal(60000)
            })
                .then(data => {
                    return resolve({
                        version: data.version,
                        canUpdateRepo: data.updaterepo,
                        updateMessage: data.updateMessage
                    });
                })
                .catch(err => {
                    if (err instanceof AbortSignal && attempt !== 'retry') {
                        return this.getLatestVersion('retry');
                    }
                    reject(err);
                });
        });
    }

    startAutoRefreshListings(): void {
        return;
        // Automatically check for missing listings every 30 minutes
        let pricelistLength = 0;

        this.autoRefreshListingsInterval = setInterval(
            () => {
                const createListingsEnabled = this.options.miscSettings.createListings.enable;

                if (this.halted) {
                    // Make sure not to run if halted
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

                    // reset to default
                    this.setRefreshlistExecutedDelay = 30 * 60 * 1000;
                    clearInterval(this.autoRefreshListingsInterval);
                    return;
                }

                pricelistLength = 0;
                log.debug('Running automatic check for missing/mismatch listings...');

                const listings: { [sku: string]: Listing[] } = {};
                this.listingManager.getListings(false, async (err: AxiosError) => {
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
                            if (this.options.normalize.painted.our && /;[p][0-9]+/.test(listingSKU)) {
                                listingSKU = listingSKU.replace(/;[p][0-9]+/, '');
                            }

                            if (this.options.normalize.festivized.our && listingSKU.includes(';festive')) {
                                listingSKU = listingSKU.replace(';festive', '');
                            }

                            if (this.options.normalize.strangeAsSecondQuality.our && listingSKU.includes(';strange')) {
                                listingSKU = listingSKU.replace(';strange', '');
                            }
                        } else {
                            if (/;[p][0-9]+/.test(listingSKU)) {
                                listingSKU = listingSKU.replace(/;[p][0-9]+/, '');
                            }
                        }

                        let match: Entry | null;
                        const assetIdPrice = this.pricelist.getPrice({ priceKey: listing.id.slice('440_'.length) });
                        if (null !== assetIdPrice) {
                            match = assetIdPrice;
                        } else {
                            match = this.pricelist.getPrice({ priceKey: listingSKU });
                        }

                        if (isFilterCantAfford && listing.intent === 0 && match !== null) {
                            const canAffordToBuy = inventoryManager.isCanAffordToBuy(match.buy, inventory);
                            if (!canAffordToBuy) {
                                // Listing for buying exist but we can't afford to buy, remove.
                                log.debug(`Intent buy, removed because can't afford: ${match.sku}`);
                                listing.remove();
                            }
                        }

                        if (listing.intent === 1 && match !== null && !match.enabled) {
                            // Listings for selling exist, but the item is currently disabled, remove it.
                            log.debug(`Intent sell, removed because not selling: ${match.sku}`);
                            listing.remove();
                        }

                        listings[listingSKU] = (listings[listingSKU] ?? []).concat(listing);
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
                                if (
                                    _listings.length === 1 &&
                                    listing.intent === 0 && // We only check if the only listing exist is buy order
                                    entry.max > 1 &&
                                    amountAvailable > 0 &&
                                    amountAvailable > entry.min
                                ) {
                                    // here we only check if the bot already have that item
                                    log.debug(`Missing sell order listings: ${priceKey}`);
                                } else if (
                                    listing.intent === 0 &&
                                    listing.currencies.toValue(keyPrice) !== entry.buy.toValue(keyPrice)
                                ) {
                                    // if intent is buy, we check if the buying price is not same
                                    log.debug(`Buying price for ${priceKey} not updated`);
                                } else if (
                                    listing.intent === 1 &&
                                    listing.currencies.toValue(keyPrice) !== entry.sell.toValue(keyPrice)
                                ) {
                                    // if intent is sell, we check if the selling price is not same
                                    log.debug(`Selling price for ${priceKey} not updated`);
                                } else {
                                    delete pricelist[priceKey];
                                }
                            });

                            continue;
                        }

                        // listing not exist

                        if (!entry.enabled) {
                            delete pricelist[priceKey];
                            log.debug(`${priceKey} disabled, skipping...`);
                            continue;
                        }

                        if (
                            (amountCanBuy > 0 && inventoryManager.isCanAffordToBuy(entry.buy, inventory)) ||
                            amountAvailable > 0
                        ) {
                            // if can amountCanBuy is more than 0 and isCanAffordToBuy is true OR amountAvailable is more than 0
                            // return this entry
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
                });
            },
            // set check every 60 minutes if pricelist to check was more than 4000 items
            (pricelistLength > 4000 ? 60 : 30) * 60 * 1000
        );
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
                    return reject(err);
                }

                this.schema = this.schemaManager.schema;

                return resolve();
            });
        });
    }

    start(): Promise<void> {
        let data: {
            loginAttempts?: number[];
            pricelist?: PricesDataObject;
            pollData?: TradeOfferManager.PollData;
            blockedList?: Blocked;
        };
        let cookies: string[];

        this.addListener(this.client, 'loggedOn', this.handler.onLoggedOn.bind(this.handler), false);
        this.addListener(this.client, 'refreshToken', this.handler.onRefreshToken.bind(this.handler), false);
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
                    (callback): void => {
                        log.debug('Calling onRun');
                        void this.handler.onRun().asCallback((err, v) => {
                            if (err) {
                                /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                return callback(err);
                            }

                            data = v;
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

                            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                            return callback(null);
                        });
                    },
                    async (callback): Promise<void> => {
                        log.info('Signing in to Steam...');

                        this.login(await this.getRefreshToken())
                            .then(() => {
                                log.info('Signed in to Steam!');

                                /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                return callback(null);
                            })
                            .catch(err => {
                                if (err) {
                                    log.warn('Failed to sign in to Steam: ', err);
                                    /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                    return callback(err);
                                }
                            });
                    },
                    async (callback): Promise<void> => {
                        if (this.options.discordBotToken) {
                            log.info(`Initializing Discord bot...`);
                            this.discordBot = new DiscordBot(this.options, this);
                            try {
                                await this.discordBot.start();
                                /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                return callback(null);
                            } catch (err) {
                                this.discordBot = null;
                                log.warn('Failed to start Discord bot: ', err);
                                /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                return callback(err);
                            }
                        } else {
                            log.info('Discord api key is not set, ignoring.');
                            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                            return callback(null);
                        }
                    },
                    (callback): void => {
                        log.debug('Waiting for web session');
                        void this.getWebSession().asCallback((err, v) => {
                            if (err) {
                                /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                return callback(err);
                            }

                            cookies = v;
                            this.bptf.setCookies(cookies);

                            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                            return callback(null);
                        });
                    },
                    (callback): void => {
                        if (this.options.bptfApiKey && this.options.bptfAccessToken) {
                            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                            return callback(null);
                        }

                        log.warn(
                            'You have not included the backpack.tf API key or access token in the environment variables'
                        );
                        void this.getBptfAPICredentials.asCallback(err => {
                            if (err) {
                                /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                return callback(err);
                            }
                            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                            return callback(null);
                        });
                    },
                    (callback): void => {
                        log.info('Setting cookies...');
                        void this.setCookies(cookies).asCallback(callback);
                    },
                    (callback): void => {
                        this.checkAdminBanned()
                            .then(banned => {
                                if (banned) {
                                    /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                    return callback(new Error('Not allowed'));
                                }
                                /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                return callback(null);
                            })
                            .catch(err => {
                                if (err) {
                                    /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                    return callback(err);
                                }
                            });

                        this.periodicCheck();
                    },
                    (callback): void => {
                        this.schemaManager = new SchemaManager({
                            updateTime: 1 * 60 * 60 * 1000,
                            lite: true
                        });

                        log.info('Getting TF2 schema...');
                        void this.initializeSchema().asCallback(callback);
                    },
                    (callback: (err?) => void): void => {
                        log.info('Initializing pricelist...');

                        this.pricelist = new Pricelist(this.priceSource, this.schema, this.options, this);
                        this.addListener(
                            this.pricelist,
                            'pricelist',
                            // eslint-disable-next-line @typescript-eslint/no-misused-promises
                            this.handler.onPricelist.bind(this.handler),
                            false
                        );
                        this.addListener(this.pricelist, 'price', this.handler.onPriceChange.bind(this.handler), true);

                        this.pricelist.init();

                        callback(null);
                    },
                    (callback): void => {
                        log.info('Initializing halt mode, inventory, bptf-listings, and profile settings');
                        if (this.options.miscSettings.startHalted.enable) {
                            void this.halt();
                        }
                        this.setProperties();
                        async.parallel(
                            [
                                (callback): void => {
                                    log.debug('Initializing inventory...');
                                    this.inventoryManager = new InventoryManager(this.pricelist);
                                    // only call this here, and in Commands/Options
                                    Inventory.setOptions(this.schema.paints, this.strangeParts, this.options.highValue);
                                    this.inventoryManager.setInventory = new Inventory(
                                        this.client.steamID,
                                        this,
                                        'our',
                                        this.boundInventoryGetter
                                    );
                                    void this.inventoryManager.getInventory.fetch().asCallback(callback);
                                },
                                (callback): void => {
                                    log.debug('Initializing bptf-listings...');
                                    this.userID = this.bptf._getUserID();
                                    this.listingManager = new ListingManager({
                                        token: this.options.bptfAccessToken,
                                        userID: this.userID,
                                        userAgent:
                                            'TF2Autobot' +
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

                                    this.listingManager.init(callback);
                                },
                                (callback): void => {
                                    if (this.options.skipUpdateProfileSettings) {
                                        return callback(null);
                                    }

                                    log.debug('Updating profile settings...');

                                    this.community.profileSettings(
                                        {
                                            profile: 3,
                                            inventory: 3,
                                            inventoryGifts: false
                                        },
                                        callback
                                    );
                                }
                            ],
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                            callback
                        );
                    },
                    (callback: (err?) => void): void => {
                        log.info('Setting up pricelist...');

                        const pricelist = Array.isArray(data.pricelist)
                            ? (data.pricelist.reduce((buff: Record<string, unknown>, e: EntryData) => {
                                  buff[e.sku] = e;
                                  return buff;
                              }, {}) as PricesDataObject)
                            : data.pricelist || {};

                        this.pricelist
                            .setPricelist(pricelist, this)
                            .then(() => {
                                callback(null);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    },
                    (callback): void => {
                        log.debug('Getting max friends...');
                        void this.friends.getMaxFriends.asCallback(callback);
                    },
                    (callback): void => {
                        log.debug('Creating listings...');
                        void this.listings.redoListings().asCallback(callback);
                    },
                    (callback: (err?) => void): void => {
                        log.debug('Getting localization file...');
                        this.getLocalizationFile()
                            .then(() => {
                                setInterval(() => {
                                    void this.getLocalizationFile();
                                }, 24 * 60 * 60 * 1000);
                                callback(null);
                            })
                            .catch(err => {
                                callback(err);
                            });
                    },
                    (callback): void => {
                        this.community.getTradeURL((err, url) => {
                            if (err) {
                                /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                return callback(err);
                            }

                            this.tradeOfferUrl = url;
                            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                            return callback(null);
                        });
                    }
                ],
                (item, callback) => {
                    if (this.botManager.isStopping) {
                        // Shutdown is requested, break out of the startup process
                        return resolve();
                    }
                    item(callback);
                },
                err => {
                    if (err) {
                        return reject(err);
                    }
                    if (this.botManager.isStopping) {
                        // Shutdown is requested, break out of the startup process
                        return resolve();
                    }

                    this.manager.pollInterval = 5 * 1000;
                    this.setReady = true;
                    this.handler.onReady();
                    this.manager.doPoll();
                    this.startVersionChecker();
                    this.initResetCacheInterval();

                    if (this.options.discordBotToken && this.discordBot && !this.halted) {
                        this.discordBot?.setPresence('online');
                    }

                    return resolve();
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
            this.manager.setCookies(cookies, err => {
                if (err) {
                    return reject(err);
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
                    return resolve(cookies);
                }
            }

            this.client.once('webSession', webSessionEvent);

            const timeout = setTimeout(() => {
                this.client.removeListener('webSession', webSessionEvent);
                return reject(new Error('Could not sign in to steamcommunity'));
            }, 10000);

            function webSessionEvent(sessionID: string, cookies: string[]): void {
                clearTimeout(timeout);

                resolve(cookies);
            }
        });
    }

    private get getCookies(): string[] {
        const cookies = this.community._jar
            .getCookies('https://steamcommunity.com')
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
            this.bptf.getAccessToken((err, accessToken) => {
                if (err) {
                    return reject(err);
                }

                return resolve(accessToken);
            });
        });
    }

    private get getOrCreateBptfAPIKey(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.bptf.getAPIKey((err, apiKey) => {
                if (err) {
                    return reject(err);
                }

                if (apiKey !== null) {
                    return resolve(apiKey);
                }

                log.verbose("You don't have a backpack.tf API key, creating one...");

                this.bptf.generateAPIKey(
                    'http://localhost',
                    'Check if an account is banned on backpack.tf',
                    (err, apiKey) => {
                        if (err) {
                            return reject(err);
                        }

                        return resolve(apiKey);
                    }
                );
            });
        });
    }

    private bptfLogin(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.bptf['loggedIn']) {
                return resolve();
            }

            log.verbose('Signing in to backpack.tf...');

            this.bptf.login(err => {
                if (err) {
                    return reject(err);
                }

                log.verbose('Logged in to backpack.tf!');
                this.bptf['loggedIn'] = true;

                return resolve();
            });
        });
    }

    private async login(refreshToken?: string): Promise<void> {
        log.debug('Starting login attempt');
        // loginKey: loginKey,
        // private: true

        const wait = this.loginWait();
        if (wait !== 0) {
            this.handler.onLoginThrottle(wait);
        }

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const listeners = this.client.listeners('error');

                this.client.removeAllListeners('error');

                const gotEvent = (): void => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    listeners.forEach(listener => this.client.on('error', listener));
                };

                const loggedOnEvent = (): void => {
                    gotEvent();

                    this.client.removeListener('error', errorEvent);
                    clearTimeout(timeout);

                    resolve(null);
                };

                const errorEvent = (err: CustomError): void => {
                    gotEvent();

                    this.client.removeListener('loggedOn', loggedOnEvent);
                    clearTimeout(timeout);

                    log.error('Failed to sign in to Steam: ', err);

                    if (err.eresult === EResult.AccessDenied) {
                        // Access denied during login
                        this.deleteRefreshToken().finally(() => {
                            reject(err);
                        });
                    } else {
                        reject(err);
                    }
                };

                const timeout = setTimeout(() => {
                    gotEvent();

                    this.client.removeListener('loggedOn', loggedOnEvent);
                    this.client.removeListener('error', errorEvent);

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

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const refreshToken = (await files.readFile(tokenPath, false).catch(err => null)) as string;

        if (!refreshToken) {
            return null;
        }

        const decoded = jwt.decode(refreshToken, {
            complete: true
        });

        if (!decoded) {
            // Invalid token
            return null;
        }

        const { exp } = decoded.payload as { exp: number };

        if (exp < Date.now() / 1000) {
            // Refresh token expired
            return null;
        }

        return refreshToken;
    }

    private async deleteRefreshToken(): Promise<void> {
        const tokenPath = this.handler.getPaths.files.refreshToken;

        await files.writeFile(tokenPath, '', false).catch(() => {
            // Ignore error
        });
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

        const steamID64 = steamID.toString();
        const friend = this.friends.getFriend(steamID64);

        if (!friend) {
            // If not friend, we send message with chatMessage
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

        // else, we use the new chat.sendFriendMessage
        const friendName = friend.player_name;
        this.client.chat.sendFriendMessage(steamID, message, { chatEntryType: 1 }, err => {
            if (err) {
                log.warn(`Failed to send message to ${friendName} (${steamID64}):`, err);
                return;
            }

            log.info(`Message sent to ${friendName} (${steamID64}): ${message}`);
        });
    }

    private getPartnerDetails(steamID: SteamID | string): Promise<string> {
        return new Promise(resolve => {
            this.community.getSteamUser(steamID, (err, user) => {
                if (err) {
                    resolve('unknown');
                } else {
                    resolve(user.name);
                }
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

        void this.getTimeOffset.asCallback((err, offset) => {
            const time = SteamTotp.time(offset);
            const confKey = SteamTotp.getConfirmationKey(this.options.steamIdentitySecret, time, tag);

            return callback(null, time, confKey);
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
            // Too many logins will trigger this error because steam returns TwoFactorCodeMismatch
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

    private async onError(err: CustomError): Promise<void> {
        if (err.eresult === EResult.LoggedInElsewhere) {
            log.warn('Signed in elsewhere, stopping the bot...');
            this.botManager.stop(err, false, true);
        } else if (err.eresult === EResult.AccessDenied) {
            // Access denied during login
            await this.deleteRefreshToken();
        } else if (err.eresult === EResult.LogonSessionReplaced) {
            this.sessionReplaceCount++;

            if (this.sessionReplaceCount > 0) {
                log.warn('Detected login session replace loop, stopping bot...');
                this.botManager.stop(err, false, true);
                return;
            }

            log.warn('Login session replaced, relogging...');

            await this.deleteRefreshToken();

            this.login(await this.getRefreshToken()).catch(err => {
                if (err) {
                    throw err;
                }
            });
        } else {
            throw err;
        }
    }

    private async generateAuthCode(): Promise<string> {
        let offset: number;
        try {
            offset = await this.getTimeOffset;
        } catch (err) {
            // ignore error
        }

        return SteamTotp.generateAuthCode(this.options.steamSharedSecret, offset);
    }

    private get getTimeOffset(): Promise<number> {
        return new Promise((resolve, reject) => {
            if (this.timeOffset !== null) {
                return resolve(this.timeOffset);
            }

            SteamTotp.getTimeOffset((err, offset) => {
                if (err) {
                    return reject(err);
                }

                this.timeOffset = offset;

                resolve(offset);
            });
        });
    }

    private loginWait(): number {
        const attemptsWithinPeriod = this.getLoginAttemptsWithinPeriod;

        let wait = 0;
        if (attemptsWithinPeriod.length >= this.maxLoginAttemptsWithinPeriod) {
            const oldest = attemptsWithinPeriod[0];

            // Time when we can make login attempt
            const timeCanAttempt = dayjs().add(this.loginPeriodTime, 'millisecond');

            // Get milliseconds till oldest till timeCanAttempt
            wait = timeCanAttempt.diff(oldest, 'millisecond');
        }

        if (wait === 0 && this.consecutiveSteamGuardCodesWrong > 1) {
            // 30000 ms wait for TwoFactorCodeMismatch is enough to not get ratelimited
            return 30000 * this.consecutiveSteamGuardCodesWrong;
        }

        return wait;
    }

    private set setLoginAttempts(attempts: number[]) {
        this.loginAttempts = attempts.map(time => dayjs.unix(time));
    }

    private get getLoginAttemptsWithinPeriod(): dayjs.Dayjs[] {
        const now = dayjs();

        const filtered = this.loginAttempts.filter(attempt => now.diff(attempt, 'millisecond') < this.loginPeriodTime);
        return filtered;
    }

    private newLoginAttempt(): void {
        const now = dayjs();

        // Clean up old login attempts
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
