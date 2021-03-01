import SteamID from 'steamid';
import SteamUser, { EResult } from 'steam-user';
import TradeOfferManager, { CustomError } from '@tf2autobot/tradeoffer-manager';
import SteamCommunity from 'steamcommunity';
import SteamTotp from 'steam-totp';
import ListingManager from 'bptf-listings-2';
import SchemaManager, { Effect, Paints, StrangeParts } from 'tf2-schema-2';
import BptfLogin from 'bptf-login-2';
import TF2 from 'tf2';
import dayjs, { Dayjs } from 'dayjs';
import async from 'async';
import semver from 'semver';
import request from 'request-retry-dayjs';

import InventoryManager from './InventoryManager';
import Pricelist, { Entry, EntryData } from './Pricelist';
import Friends from './Friends';
import Trades from './Trades';
import Listings from './Listings';
import TF2GC from './TF2GC';
import Inventory from './Inventory';
import BotManager from './BotManager';
import MyHandler from './MyHandler/MyHandler';
import Groups from './Groups';

import log from '../lib/logger';
import { isBanned } from '../lib/bans';
import Options from './Options';
import Pricer from './Pricer';

export default class Bot {
    // Modules and classes
    readonly botManager: BotManager;

    readonly schema: SchemaManager.Schema;

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

    readonly handler: MyHandler;

    readonly inventoryManager: InventoryManager;

    readonly pricelist: Pricelist;

    public effects: Effect[];

    public paints: Paints;

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

    private itemStatsWhitelist: SteamID[] = [];

    private ready = false;

    private handleLoggedOn: OmitThisParameter<() => void>;

    private handleMessage: OmitThisParameter<(steamID: SteamID, message: string) => void>;

    private handleFriendRelationship: OmitThisParameter<(steamID: SteamID, relationship: number) => void>;

    private handleGroupRelationship: OmitThisParameter<(steamID: SteamID, relationship: number) => void>;

    private handleWebSession: OmitThisParameter<(sessionID: string, cookies: string[]) => void>;

    private handleSteamGuard: OmitThisParameter<
        (domain: string, callback: (authCode: string) => void, lastCodeWrong: boolean) => void
    >;

    private handleLoginKey: OmitThisParameter<(loginKey: string) => void>;

    private handleError: OmitThisParameter<(err: CustomError) => void>;

    private handleSessionExpired: OmitThisParameter<() => void>;

    private handleConfKeyNeeded: OmitThisParameter<
        (tag: string, callback: (err: Error | null, time: number, confKey: string) => void) => void
    >;

    private handlePollData: OmitThisParameter<(pollData: TradeOfferManager.PollData) => void>;

    private handleNewOffer: OmitThisParameter<(offer: TradeOfferManager.TradeOffer) => void>;

    private handleOfferChanged: OmitThisParameter<(offer: TradeOfferManager.TradeOffer, oldState: number) => void>;

    private handleOfferList: OmitThisParameter<
        (filter: number, sent: TradeOfferManager.TradeOffer[], received: TradeOfferManager.TradeOffer[]) => void
    >;

    private handleHeartbeat: OmitThisParameter<(bumped: number) => void>;

    private handlePricelist: OmitThisParameter<(pricelist: Entry[]) => void>;

    private handlePriceChange: OmitThisParameter<(sku: string, price: Entry | null) => void>;

    private receivedOfferChanged: OmitThisParameter<(offer: TradeOfferManager.TradeOffer, oldState: number) => void>;

    constructor(botManager: BotManager, public options: Options, private priceSource: Pricer) {
        this.botManager = botManager;

        this.schema = this.botManager.getSchema;

        this.client = new SteamUser();
        this.community = new SteamCommunity();
        this.manager = new TradeOfferManager({
            steam: this.client,
            community: this.community,
            language: 'en',
            pollInterval: -1,
            cancelTime: 15 * 60 * 1000,
            pendingCancelTime: 1.5 * 60 * 1000
        });

        this.listingManager = new ListingManager({
            token: this.options.bptfAccessToken,
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

        this.handler = new MyHandler(this, this.priceSource);

        this.pricelist = new Pricelist(
            this.priceSource,
            this.schema,
            this.botManager.getSocketManager,
            this.options,
            this
        );
        this.inventoryManager = new InventoryManager(this.pricelist);

        this.admins = this.options.admins.map(steamID => new SteamID(steamID));

        this.admins.forEach(steamID => {
            if (!steamID.isValid()) {
                throw new Error('Invalid admin steamID');
            }
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

        this.handleLoggedOn = this.handler.onLoggedOn.bind(this.handler);
        this.handleMessage = this.onMessage.bind(this);
        this.handleFriendRelationship = this.handler.onFriendRelationship.bind(this.handler);
        this.handleGroupRelationship = this.handler.onGroupRelationship.bind(this.handler);
        this.handleWebSession = this.onWebSession.bind(this);
        this.handleSteamGuard = this.onSteamGuard.bind(this);
        this.handleLoginKey = this.handler.onLoginKey.bind(this.handler);
        this.handleError = this.onError.bind(this);

        this.handleSessionExpired = this.onSessionExpired.bind(this);
        this.handleConfKeyNeeded = this.onConfKeyNeeded.bind(this);

        this.handlePollData = this.handler.onPollData.bind(this.handler);
        this.handleNewOffer = this.trades.onNewOffer.bind(this.trades);
        this.handleOfferChanged = this.trades.onOfferChanged.bind(this.trades);
        this.receivedOfferChanged = this.trades.onOfferChanged.bind(this.trades);
        this.handleOfferList = this.trades.onOfferList.bind(this.trades);

        this.handleHeartbeat = this.handler.onHeartbeat.bind(this);

        this.handlePricelist = this.handler.onPricelist.bind(this.handler);
        this.handlePriceChange = this.handler.onPriceChange.bind(this.handler);
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

    checkBanned(steamID: SteamID | string): Promise<boolean> {
        if (this.options.bypass.bannedPeople.allow) {
            return Promise.resolve(false);
        }

        return Promise.resolve(isBanned(steamID, this.options.bptfAPIKey));
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

    set setReady(isReady: boolean) {
        this.ready = isReady;
    }

    get isReady(): boolean {
        return this.ready;
    }

    private addListener(emitter: any, event: string, listener: (...args) => void, checkCanEmit: boolean): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        emitter.on(event, (...args: any[]) => {
            setImmediate(() => {
                if (!checkCanEmit || this.canSendEvents()) {
                    listener(...args);
                }
            });
        });
    }

    startVersionChecker(): void {
        void this.checkForUpdates;

        // Check for updates every 10 minutes
        setInterval(() => {
            this.checkForUpdates.catch(err => {
                log.warn('Failed to check for updates: ', err);
            });
        }, 10 * 60 * 1000);
    }

    get checkForUpdates(): Promise<{ hasNewVersion: boolean; latestVersion: string }> {
        return this.getLatestVersion.then(latestVersion => {
            const hasNewVersion = semver.lt(process.env.BOT_VERSION, latestVersion);

            if (this.lastNotifiedVersion !== latestVersion && hasNewVersion) {
                this.lastNotifiedVersion = latestVersion;

                this.messageAdmins(
                    'version',
                    `⚠️ Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.\n\n` +
                        `Release note: https://github.com/TF2Autobot/tf2autobot/releases` +
                        (process.env.pm_id !== undefined
                            ? `\n\nYou're running the bot with PM2! Send "!updaterepo" now!"`
                            : `\n\nNavigate to your bot folder and run ` +
                              `[git reset HEAD --hard && git checkout master && git pull && npm install && npm run build] ` +
                              `and then restart your bot.`) +
                        '\n\nContact IdiNium if you have any other problem. Thank you.',
                    []
                );
            }

            return { hasNewVersion, latestVersion };
        });
    }

    private get getLatestVersion(): Promise<string> {
        return new Promise((resolve, reject) => {
            void request(
                {
                    method: 'GET',
                    url: 'https://raw.githubusercontent.com/TF2Autobot/tf2autobot/master/package.json',
                    json: true
                },
                (err, response, body) => {
                    if (err) {
                        return reject(err);
                    }

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

        this.addListener(this.client, 'loggedOn', this.handleLoggedOn, false);
        this.addListener(this.client, 'friendMessage', this.handleMessage, true);
        this.addListener(this.client, 'friendRelationship', this.handleFriendRelationship, true);
        this.addListener(this.client, 'groupRelationship', this.handleGroupRelationship, true);
        this.addListener(this.client, 'webSession', this.handleWebSession, false);
        this.addListener(this.client, 'steamGuard', this.handleSteamGuard, false);
        this.addListener(this.client, 'loginKey', this.handleLoginKey, false);
        this.addListener(this.client, 'error', this.handleError, false);

        this.addListener(this.community, 'sessionExpired', this.handleSessionExpired, false);
        this.addListener(this.community, 'confKeyNeeded', this.handleConfKeyNeeded, false);

        this.addListener(this.manager, 'pollData', this.handlePollData, false);
        this.addListener(this.manager, 'newOffer', this.handleNewOffer, true);
        this.addListener(this.manager, 'sentOfferChanged', this.handleOfferChanged, true);
        this.addListener(this.manager, 'receivedOfferChanged', this.receivedOfferChanged, true);
        this.addListener(this.manager, 'offerList', this.handleOfferList, true);

        this.addListener(this.listingManager, 'heartbeat', this.handleHeartbeat, true);

        this.addListener(this.pricelist, 'pricelist', this.handlePricelist, false);
        this.addListener(this.pricelist, 'price', this.handlePriceChange, true);

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

                            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                            return callback(null);
                        });
                    },
                    (callback): void => {
                        log.info('Signing in to Steam...');

                        let lastLoginFailed = false;
                        const loginResponse = (err: CustomError): void => {
                            if (err) {
                                this.handler.onLoginError(err);
                                if (!lastLoginFailed && err.eresult === EResult.InvalidPassword) {
                                    lastLoginFailed = true;
                                    // Try and sign in without login key
                                    log.warn('Failed to sign in to Steam, retrying without login key...');
                                    void this.login(null).asCallback(loginResponse);
                                    return;
                                } else {
                                    log.warn('Failed to sign in to Steam: ', err);
                                    /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                                    return callback(err);
                                }
                            }

                            log.info('Signed in to Steam!');

                            this.setProperties();

                            this.inventoryManager.setInventory = new Inventory(
                                this.client.steamID,
                                this.manager,
                                this.schema,
                                this.options,
                                this.effects,
                                this.paints,
                                this.strangeParts,
                                'our'
                            );

                            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                            return callback(null);
                        };

                        void this.login(data.loginKey || null).asCallback(loginResponse);
                    },
                    (callback): void => {
                        if (this.options.enableSocket === false) {
                            log.warn('Disabling socket...');
                            this.botManager.getSocketManager.shutDown();
                        } else {
                            this.pricelist.init();
                        }

                        log.info('Setting up pricelist...');

                        void this.pricelist
                            .setPricelist(!Array.isArray(data.pricelist) ? [] : data.pricelist, this)
                            .asCallback(callback);
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
                        if (this.options.bptfAPIKey && this.options.bptfAccessToken) {
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
                        log.info('Initializing inventory, bptf-listings, and profile settings');
                        async.parallel(
                            [
                                (callback): void => {
                                    log.debug('Getting inventory...');
                                    void this.inventoryManager.getInventory.fetch().asCallback(callback);
                                },
                                (callback): void => {
                                    log.debug('Initializing bptf-listings...');
                                    this.listingManager.token = this.options.bptfAccessToken;
                                    this.listingManager.steamid = this.client.steamID;

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
                            callback
                        );
                    },
                    (callback): void => {
                        log.info('Getting Steam API key...');
                        void this.setCookies(cookies).asCallback(callback);
                    },
                    (callback): void => {
                        log.debug('Getting max friends...');
                        void this.friends.getMaxFriends.asCallback(callback);
                    },
                    (callback): void => {
                        log.debug('Creating listings...');
                        void this.listings.redoListings().asCallback(callback);
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

                    log.debug('Setting Steam API Key to schema');
                    this.botManager.setAPIKeyForSchema = this.manager.apiKey;

                    this.manager.pollInterval = 5 * 1000;
                    this.setReady = true;
                    this.handler.onReady();
                    this.manager.doPoll();
                    this.startVersionChecker();

                    return resolve();
                }
            );
        });
    }

    private setProperties(): void {
        this.effects = this.schema.getUnusualEffects();
        this.paints = this.schema.getPaints();
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
    }

    setCookies(cookies: string[]): Promise<void> {
        this.bptf.setCookies(cookies);
        this.community.setCookies(cookies);

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
        return this.community._jar
            .getCookies('https://steamcommunity.com')
            .filter(cookie => ['sessionid', 'steamLogin', 'steamLoginSecure'].includes(cookie.key))
            .map(cookie => `${cookie.key}=${cookie.value}`);
    }

    private get getBptfAPICredentials(): Promise<{
        apiKey: string;
        accessToken: string;
    }> {
        return this.bptfLogin().then(() => {
            log.verbose('Getting API key and access token...');

            return Promise.all([this.getOrCreateBptfAPIKey, this.getBptfAccessToken]).then(([apiKey, accessToken]) => {
                log.verbose('Got backpack.tf API key and access token!');

                this.options.bptfAPIKey = apiKey;
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

    login(loginKey?: string): Promise<void> {
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

                const details: {
                    accountName: string;
                    logonID: number;
                    rememberPassword: boolean;
                    password?: string;
                    loginKey?: string;
                } = {
                    accountName: this.options.steamAccountName,
                    logonID: 69420,
                    rememberPassword: true
                };

                if (loginKey) {
                    log.debug('Signing in using login key');
                    details.loginKey = loginKey;
                } else {
                    log.debug('Signing in using password');
                    details.password = this.options.steamPassword;
                }

                this.newLoginAttempt();
                this.client.logOn(details);

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

                const errorEvent = (err): void => {
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
        this.client.chatMessage(steamID, message);

        const friend = this.friends.getFriend(steamID64);
        if (friend === null) {
            void this.getPartnerDetails(steamID).then(name => {
                log.info(`Message sent to ${name} (${steamID64}): ${message}`);
            });
        } else {
            log.info(`Message sent to ${friend.player_name} (${steamID64}): ${message}`);
        }
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

    private onMessage(steamID: SteamID, message: string): void {
        if (message.startsWith('[tradeoffer sender=') && message.endsWith('[/tradeoffer]')) {
            return;
        }

        this.handler.onMessage(steamID, message);
    }

    private onWebSession(sessionID: string, cookies: string[]): void {
        log.debug('New web session');

        void this.setCookies(cookies);
    }

    private onSessionExpired(): void {
        log.debug('Web session has expired');

        this.client.webLogOn();
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

        void Promise.delay(wait)
            .then(this.generateAuthCode.bind(this))
            .then(authCode => {
                this.newLoginAttempt();

                callback(authCode);
            });
    }

    private onError(err: CustomError): void {
        if (err.eresult === EResult.LoggedInElsewhere) {
            log.warn('Signed in elsewhere, stopping the bot...');
            this.botManager.stop(err, false, true);
        } else if (err.eresult === EResult.LogonSessionReplaced) {
            this.sessionReplaceCount++;

            if (this.sessionReplaceCount > 0) {
                log.warn('Detected login session replace loop, stopping bot...');
                this.botManager.stop(err, false, true);
                return;
            }

            log.warn('Login session replaced, relogging...');

            void this.login().asCallback(err => {
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

        return this.loginAttempts.filter(attempt => now.diff(attempt, 'millisecond') < this.loginPeriodTime);
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
}
