import InventoryManager from './InventoryManager';
import Pricelist, { EntryData } from './Pricelist';
import Handler from './Handler';
import Friends from './Friends';
import Trades from './Trades';
import Listings from './Listings';
import TF2GC from './TF2GC';
import Inventory from './Inventory';
import BotManager from './BotManager';
import MyHandler from './MyHandler';
import Groups from './Groups';

import SteamID from 'steamid';
import SteamUser from 'steam-user';
import TradeOfferManager from 'steam-tradeoffer-manager';
import SteamCommunity from 'steamcommunity';
import SteamTotp from 'steam-totp';
import ListingManager from 'bptf-listings';
import SchemaManager from 'tf2-schema';
import BptfLogin from 'bptf-login';
import TF2 from 'tf2';
import moment from 'moment';
import async from 'async';
import semver from 'semver';
import request from '@nicklason/request-retry';

import log from '../lib/logger';
import { isBanned } from '../lib/bans';

export = class Bot {
    // Modules and classes
    readonly botManager: BotManager;

    readonly schema: SchemaManager.Schema;

    readonly socket: SocketIOClient.Socket;

    readonly bptf: BptfLogin;

    readonly tf2: TF2;

    readonly client: SteamUser;

    readonly manager: TradeOfferManager;

    readonly community: SteamCommunity;

    readonly listingManager: ListingManager;

    readonly friends: Friends;

    readonly groups: Groups;

    readonly trades: Trades;

    readonly listings: Listings;

    readonly tf2gc: TF2GC;

    readonly handler: Handler;

    readonly inventoryManager: InventoryManager;

    readonly pricelist: Pricelist;

    // Settings
    private readonly maxLoginAttemptsWithinPeriod: number = 3;

    private readonly loginPeriodTime: number = 60 * 1000;

    // Values
    lastNotifiedVersion: string | undefined;

    private sessionReplaceCount = 0;

    private consecutiveSteamGuardCodesWrong = 0;

    private timeOffset: number = null;

    private loginAttempts: moment.Moment[] = [];

    private admins: SteamID[] = [];

    private alertTypes: string[] = [];

    private ready = false;

    constructor(botManager: BotManager) {
        this.botManager = botManager;

        this.schema = this.botManager.getSchema();
        this.socket = this.botManager.getSocket();

        this.client = new SteamUser();
        this.community = new SteamCommunity();
        this.manager = new TradeOfferManager({
            steam: this.client,
            community: this.community,
            language: 'en',
            pollInterval: -1,
            cancelTime: 5 * 60 * 1000,
            pendingCancelTime: 10 * 1000
        });

        this.listingManager = new ListingManager({
            token: process.env.BPTF_ACCESS_TOKEN,
            batchSize: 25,
            waitTime: 100,
            schema: this.schema
        });
        this.bptf = new BptfLogin();
        this.tf2 = new TF2(this.client);

        this.friends = new Friends(this);
        this.groups = new Groups(this);
        this.trades = new Trades(this);
        this.listings = new Listings(this);
        this.tf2gc = new TF2GC(this);

        this.handler = new MyHandler(this);

        this.pricelist = new Pricelist(this.schema, this.socket);
        this.inventoryManager = new InventoryManager(this.pricelist);

        this.admins = (process.env.ADMINS === undefined ? [] : JSON.parse(process.env.ADMINS)).map(
            (steamID: string) => new SteamID(steamID)
        );

        this.admins.forEach(function(steamID) {
            if (!steamID.isValid()) {
                throw new Error('Invalid admin steamID');
            }
        });

        this.alertTypes = process.env.ALERTS === undefined ? [] : JSON.parse(process.env.ALERTS);

        this.addListener(this.client, 'loggedOn', this.handler.onLoggedOn.bind(this.handler), false);
        this.addListener(this.client, 'friendMessage', this.onMessage.bind(this), true);
        this.addListener(this.client, 'friendRelationship', this.handler.onFriendRelationship.bind(this.handler), true);
        this.addListener(this.client, 'groupRelationship', this.handler.onGroupRelationship.bind(this.handler), true);
        this.addListener(this.client, 'webSession', this.onWebSession.bind(this), false);
        this.addListener(this.client, 'steamGuard', this.onSteamGuard.bind(this), false);
        this.addListener(this.client, 'loginKey', this.handler.onLoginKey.bind(this.handler), false);
        this.addListener(this.client, 'error', this.onError.bind(this), false);

        this.addListener(this.community, 'sessionExpired', this.onSessionExpired.bind(this), false);
        this.addListener(this.community, 'confKeyNeeded', this.onConfKeyNeeded.bind(this), false);

        this.addListener(this.manager, 'pollData', this.handler.onPollData.bind(this.handler), false);
        this.addListener(this.manager, 'newOffer', this.trades.onNewOffer.bind(this.trades), true);
        this.addListener(this.manager, 'sentOfferChanged', this.trades.onOfferChanged.bind(this.trades), true);
        this.addListener(this.manager, 'receivedOfferChanged', this.trades.onOfferChanged.bind(this.trades), true);
        this.addListener(this.manager, 'offerList', this.trades.onOfferList.bind(this.trades), true);

        this.addListener(this.listingManager, 'heartbeat', this.handler.onHeartbeat.bind(this), true);

        this.addListener(this.pricelist, 'pricelist', this.handler.onPricelist.bind(this.handler), false);
        this.addListener(this.pricelist, 'price', this.handler.onPriceChange.bind(this.handler), true);
    }

    getHandler(): Handler {
        return this.handler;
    }

    isAdmin(steamID: SteamID | string): boolean {
        const steamID64 = steamID.toString();
        return this.admins.some(adminSteamID => adminSteamID.toString() === steamID64);
    }

    getAdmins(): SteamID[] {
        return this.admins;
    }

    getAlertTypes(): string[] {
        return this.alertTypes;
    }

    checkBanned(steamID: SteamID | string): Promise<boolean> {
        if (process.env.ALLOW_BANNED === 'true') {
            return Promise.resolve(false);
        }

        return Promise.resolve(isBanned(steamID));
    }

    checkEscrow(offer: TradeOfferManager.TradeOffer): Promise<boolean> {
        if (process.env.ALLOW_ESCROW === 'true') {
            return Promise.resolve(false);
        }

        return this.trades.checkEscrow(offer);
    }

    messageAdmins(message: string, exclude: string[] | SteamID[]): void;

    messageAdmins(type: string, message: string, exclude: string[] | SteamID[]);

    messageAdmins(...args): void {
        const type: string | null = args.length === 2 ? null : args[0];

        if (type !== null && !this.alertTypes.includes(type)) {
            return;
        }
        const message: string = args.length === 2 ? args[0] : args[1];
        const exclude: string[] = (args.length === 2 ? args[1] : args[2]).map(steamid => steamid.toString());

        this.admins
            .filter(steamID => !exclude.includes(steamID.toString()))
            .forEach(steamID => {
                this.sendMessage(steamID, message);
            });
    }

    setReady(): void {
        this.ready = true;
    }

    isReady(): boolean {
        return this.ready;
    }

    private addListener(emitter: any, event: string, listener: Function, checkCanEmit: boolean): void {
        emitter.on(event, (...args: any[]) => {
            setImmediate(() => {
                if (!checkCanEmit || this.canSendEvents()) {
                    listener(...args);
                }
            });
        });
    }

    startVersionChecker(): void {
        this.checkForUpdates();

        // Check for updates every 10 minutes
        setInterval(() => {
            this.checkForUpdates().catch(err => {
                log.warn('Failed to check for updates: ', err);
            });
        }, 10 * 60 * 1000);
    }

    checkForUpdates(): Promise<{ hasNewVersion: boolean; latestVersion: string }> {
        return this.getLatestVersion().then(latestVersion => {
            const hasNewVersion = semver.lt(process.env.BOT_VERSION, latestVersion);

            if (this.lastNotifiedVersion !== latestVersion && hasNewVersion) {
                this.lastNotifiedVersion = latestVersion;

                this.messageAdmins(
                    'version',
                    `Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.\nNavigate to your bot folder and run [git stash && git checkout Public && git pull && npm install && npm run build] and then restart your bot.` +
                        '\n Contact IdiNium if you have any other problem. Thank you.',
                    []
                );
            }

            return { hasNewVersion, latestVersion };
        });
    }

    getLatestVersion(): Promise<string> {
        return new Promise((resolve, reject) => {
            request(
                {
                    method: 'GET',
                    url: 'https://raw.githubusercontent.com/idinium96/tf2-automatic/Public/package.json',
                    json: true
                },
                function(err, response, body) {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(body.version);
                }
            );
        });
    }

    start(): Promise<void> {
        let data: {
            loginAttempts?: number[];
            pricelist?: EntryData[];
            loginKey?: string;
            pollData?: TradeOfferManager.PollData;
        };
        let cookies: string[];

        return new Promise((resolve, reject) => {
            async.eachSeries(
                [
                    (callback): void => {
                        log.debug('Calling onRun');
                        this.handler.onRun().asCallback((err, v) => {
                            if (err) {
                                return callback(err);
                            }

                            data = v;

                            if (data.pollData) {
                                log.debug('Setting poll data');
                                this.manager.pollData = data.pollData;
                            }

                            if (data.loginAttempts) {
                                log.debug('Setting login attempts');
                                this.setLoginAttempts(data.loginAttempts);
                            }

                            return callback(null);
                        });
                    },
                    (callback): void => {
                        log.info('Setting up pricelist...');

                        this.pricelist
                            .setPricelist(!Array.isArray(data.pricelist) ? [] : data.pricelist)
                            .asCallback(callback);
                    },
                    (callback): void => {
                        if (process.env.SKIP_ACCOUNT_LIMITATIONS === 'true') {
                            return callback(null);
                        }

                        log.warn(
                            'Checking account limitations - Please disable this in the config by setting `SKIP_ACCOUNT_LIMITATIONS` to true'
                        );

                        this.getAccountLimitations().asCallback(function(err, limitations) {
                            if (err) {
                                return callback(err);
                            }

                            if (limitations.limited) {
                                throw new Error('The account is limited');
                            } else if (limitations.communityBanned) {
                                throw new Error('The account is community banned');
                            } else if (limitations.locked) {
                                throw new Error('The account is locked');
                            }

                            log.verbose('Account limitations check completed!');

                            return callback(null);
                        });
                    },
                    (callback): void => {
                        log.info('Signing in to Steam...');

                        let lastLoginFailed = false;

                        const loginResponse = (err): void => {
                            if (err) {
                                this.handler.onLoginError(err);
                                if (!lastLoginFailed && err.eresult === SteamUser.EResult.InvalidPassword) {
                                    lastLoginFailed = true;
                                    // Try and sign in without login key
                                    log.warn('Failed to sign in to Steam, retrying without login key...');
                                    this.login(null).asCallback(loginResponse);
                                    return;
                                } else {
                                    log.warn('Failed to sign in to Steam: ', err);
                                    return callback(err);
                                }
                            }

                            log.info('Signed in to Steam!');

                            // We now know our SteamID, but we still don't have our Steam API key
                            const inventory = new Inventory(this.client.steamID, this.manager, this.schema);
                            this.inventoryManager.setInventory(inventory);

                            return callback(null);
                        };

                        this.login(data.loginKey || null).asCallback(loginResponse);
                    },
                    (callback): void => {
                        log.debug('Waiting for web session');
                        this.getWebSession().asCallback((err, v) => {
                            if (err) {
                                return callback(err);
                            }

                            cookies = v;

                            this.bptf.setCookies(cookies);

                            return callback(null);
                        });
                    },
                    (callback): void => {
                        if (process.env.BPTF_API_KEY && process.env.BPTF_ACCESS_TOKEN) {
                            return callback(null);
                        }

                        log.warn(
                            'You have not included the backpack.tf API key or access token in the environment variables'
                        );

                        this.getBptfAPICredentials().asCallback(err => {
                            if (err) {
                                return callback(err);
                            }

                            return callback(null);
                        });
                    },
                    (callback): void => {
                        log.info('Initializing bptf-listings...');
                        async.parallel(
                            [
                                (callback): void => {
                                    log.debug('Getting inventory...');
                                    this.inventoryManager
                                        .getInventory()
                                        .fetch()
                                        .asCallback(callback);
                                },
                                (callback): void => {
                                    log.debug('Initializing bptf-listings...');
                                    this.listingManager.token = process.env.BPTF_ACCESS_TOKEN;
                                    this.listingManager.steamid = this.client.steamID;

                                    this.listingManager.init(callback);
                                },
                                (callback): void => {
                                    if (process.env.SKIP_UPDATE_PROFILE_SETTINGS !== 'true') {
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
                            callback
                        );
                    },
                    (callback): void => {
                        log.info('Getting Steam API key...');
                        this.setCookies(cookies).asCallback(callback);
                    },
                    (callback): void => {
                        log.debug('Getting max friends...');
                        this.friends.getMaxFriends().asCallback(callback);
                    },
                    (callback): void => {
                        log.debug('Creating listings...');
                        this.listings.redoListings().asCallback(callback);
                    }
                ],
                (item, callback) => {
                    if (this.botManager.isStopping()) {
                        // Shutdown is requested, break out of the startup process
                        return resolve();
                    }

                    item(callback);
                },
                err => {
                    if (err) {
                        return reject(err);
                    }

                    if (this.botManager.isStopping()) {
                        // Shutdown is requested, break out of the startup process
                        return resolve();
                    }

                    this.manager.pollInterval = 1000;

                    this.setReady();
                    this.handler.onReady();

                    this.manager.doPoll();

                    this.startVersionChecker();

                    return resolve();
                }
            );
        });
    }

    setCookies(cookies: string[]): Promise<void> {
        this.bptf.setCookies(cookies);

        this.community.setCookies(cookies);

        return new Promise((resolve, reject) => {
            this.manager.setCookies(cookies, function(err) {
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
                const cookies = this.getCookies();
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

    getAccountLimitations(): Promise<{
        limited: boolean;
        communityBanned: boolean;
        locked: boolean;
        canInviteFriends: boolean;
    }> {
        return new Promise((resolve, reject) => {
            if (this.client.limitations !== null) {
                return resolve(this.client.limitations);
            }

            this.client.once('accountLimitations', accountLimitationsEvent);

            const timeout = setTimeout(() => {
                this.client.removeListener('accountLimitations', accountLimitationsEvent);
                return reject(new Error('Could not get account limitations'));
            }, 10000);

            function accountLimitationsEvent(
                limited: boolean,
                communityBanned: boolean,
                locked: boolean,
                canInviteFriends: boolean
            ): void {
                clearTimeout(timeout);

                resolve({ limited, communityBanned, locked, canInviteFriends });
            }
        });
    }

    private getCookies(): string[] {
        return this.community._jar
            .getCookies('https://steamcommunity.com')
            .filter(cookie => ['sessionid', 'steamLogin', 'steamLoginSecure'].includes(cookie.key))
            .map(function(cookie) {
                return `${cookie.key}=${cookie.value}`;
            });
    }

    private getBptfAPICredentials(): Promise<{
        apiKey: string;
        accessToken: string;
    }> {
        return this.bptfLogin().then(() => {
            log.verbose('Getting API key and access token...');

            return Promise.all([this.getOrCreateBptfAPIKey(), this.getBptfAccessToken()]).then(
                ([apiKey, accessToken]) => {
                    log.verbose('Got backpack.tf API key and access token!');

                    process.env.BPTF_API_KEY = apiKey;
                    process.env.BPTF_ACCESS_TOKEN = accessToken;

                    this.handler.onBptfAuth({ apiKey, accessToken });

                    return { apiKey, accessToken };
                }
            );
        });
    }

    private getBptfAccessToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.bptf.getAccessToken(function(err, accessToken) {
                if (err) {
                    return reject(err);
                }

                return resolve(accessToken);
            });
        });
    }

    private getOrCreateBptfAPIKey(): Promise<string> {
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
            // @ts-ignore
            if (this.bptf.loggedIn) {
                return resolve();
            }

            log.verbose('Signing in to backpack.tf...');

            this.bptf.login(err => {
                if (err) {
                    return reject(err);
                }

                log.verbose('Logged in to backpack.tf!');

                // @ts-ignore
                this.bptf.loggedIn = true;

                return resolve();
            });
        });
    }

    login(loginKey?: string): Promise<void> {
        log.debug('Starting login attempt', {
            loginKey: loginKey,
            private: true
        });

        const wait = this.loginWait();

        if (wait !== 0) {
            this.handler.onLoginThrottle(wait);
        }

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const listeners = this.client.listeners('error');

                this.client.removeAllListeners('error');

                const details: {
                    accountName: string;
                    logonID: number;
                    rememberPassword: boolean;
                    password?: string;
                    loginKey?: string;
                } = {
                    accountName: process.env.STEAM_ACCOUNT_NAME,
                    logonID: 69420,
                    rememberPassword: true
                };

                if (loginKey) {
                    log.debug('Signing in using login key');
                    details.loginKey = loginKey;
                } else {
                    log.debug('Signing in using password');
                    details.password = process.env.STEAM_PASSWORD;
                }

                this.newLoginAttempt();

                this.client.logOn(details);

                const gotEvent = (): void => {
                    listeners.forEach(listener => {
                        // @ts-ignore
                        this.client.on('error', listener);
                    });
                };

                const loggedOnEvent = (): void => {
                    gotEvent();

                    this.client.removeListener('error', errorEvent);
                    clearTimeout(timeout);

                    resolve(null);
                };

                const errorEvent = (err: Error): void => {
                    gotEvent();

                    this.client.removeListener('loggedOn', loggedOnEvent);
                    clearTimeout(timeout);

                    log.debug('Failed to sign in to Steam: ', err);

                    reject(err);
                };

                const timeout = setTimeout(() => {
                    gotEvent();

                    this.client.removeListener('loggedOn', loggedOnEvent);
                    this.client.removeListener('error', errorEvent);

                    log.debug('Did not get login response from Steam');

                    reject(new Error('Did not get login response (Steam might be down)'));
                }, 60 * 1000);

                this.client.once('loggedOn', loggedOnEvent);
                this.client.once('error', errorEvent);
            }, wait);
        });
    }

    sendMessage(steamID: SteamID | string, message: string): void {
        const steamID64 = steamID.toString();

        const friend = this.friends.getFriend(steamID64);

        this.client.chatMessage(steamID, message);

        if (friend === null) {
            log.info(`Message sent to ${steamID}: ${message}`);
        } else {
            log.info(`Message sent to ${friend.player_name} (${steamID64}): ${message}`);
        }
    }

    private canSendEvents(): boolean {
        return this.ready && !this.botManager.isStopping();
    }

    private onMessage(steamID: SteamID, message: string): void {
        if (message.startsWith('[tradeoffer sender=') && message.endsWith('[/tradeoffer]')) {
            return;
        }

        this.handler.onMessage(steamID, message);
    }

    private onWebSession(sessionID: string, cookies: string[]): void {
        log.debug('New web session');

        this.setCookies(cookies);
    }

    private onSessionExpired(): void {
        log.debug('Web session has expired');

        this.client.webLogOn();
    }

    private onConfKeyNeeded(tag: string, callback: (err: Error | null, time: number, confKey: string) => void): void {
        log.debug('Conf key needed');

        this.getTimeOffset().asCallback(function(err, offset) {
            const time = SteamTotp.time(offset);
            const confKey = SteamTotp.getConfirmationKey(process.env.STEAM_IDENTITY_SECRET, time, tag);

            return callback(null, time, confKey);
        });
    }

    private onSteamGuard(domain: string, callback: (authCode: string) => void, lastCodeWrong: boolean): void {
        log.debug('Steam guard code requested');

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

        Promise.delay(wait)
            .then(this.generateAuthCode.bind(this))
            .then(authCode => {
                this.newLoginAttempt();

                callback(authCode);
            });
    }

    private onError(err: Error): void {
        // @ts-ignore
        if (err.eresult === SteamUser.EResult.LoggedInElsewhere) {
            log.warn('Signed in elsewhere, stopping the bot...');
            this.botManager.stop(err, false, true);
            // @ts-ignore
        } else if (err.eresult === SteamUser.EResult.LogonSessionReplaced) {
            this.sessionReplaceCount++;

            if (this.sessionReplaceCount > 0) {
                log.warn('Detected login session replace loop, stopping bot...');
                this.botManager.stop(err, false, true);
                return;
            }

            log.warn('Login session replaced, relogging...');

            this.login().asCallback(function(err) {
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
            offset = await this.getTimeOffset();
        } catch (err) {
            // ignore error
        }

        return SteamTotp.generateAuthCode(process.env.STEAM_SHARED_SECRET, offset);
    }

    private getTimeOffset(): Promise<number> {
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
        const attemptsWithinPeriod = this.getLoginAttemptsWithinPeriod();

        let wait = 0;

        if (attemptsWithinPeriod.length >= this.maxLoginAttemptsWithinPeriod) {
            const oldest = attemptsWithinPeriod[0];

            // Time when we can make login attempt
            const timeCanAttempt = moment().add(this.loginPeriodTime, 'milliseconds');

            // Get milliseconds till oldest till timeCanAttempt
            wait = timeCanAttempt.diff(oldest, 'milliseconds');
        }

        if (wait === 0 && this.consecutiveSteamGuardCodesWrong > 1) {
            // 30000 ms wait for TwoFactorCodeMismatch is enough to not get ratelimited
            return 30000 * this.consecutiveSteamGuardCodesWrong;
        }

        return wait;
    }

    private setLoginAttempts(attempts: number[]): void {
        this.loginAttempts = attempts.map(time => moment.unix(time));
    }

    private getLoginAttemptsWithinPeriod(): moment.Moment[] {
        const now = moment();

        return this.loginAttempts.filter(attempt => now.diff(attempt, 'milliseconds') < this.loginPeriodTime);
    }

    private newLoginAttempt(): void {
        const now = moment();

        // Clean up old login attempts
        this.loginAttempts = this.loginAttempts.filter(
            attempt => now.diff(attempt, 'milliseconds') < this.loginPeriodTime
        );

        this.loginAttempts.push(now);

        this.handler.onLoginAttempts(this.loginAttempts.map(attempt => attempt.unix()));
    }
};
