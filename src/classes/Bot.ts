import SteamID from 'steamid';
import SteamUser, { EResult } from 'steam-user';
import TradeOfferManager, { CustomError } from '@tf2autobot/tradeoffer-manager';
import SteamCommunity from 'steamcommunity';
import SteamTotp from 'steam-totp';
import ListingManager from '@tf2autobot/bptf-listings';
import SchemaManager, { Effect, Paints, StrangeParts } from '@tf2autobot/tf2-schema';
import BptfLogin from '@tf2autobot/bptf-login';
import TF2 from '@tf2autobot/tf2';
import dayjs, { Dayjs } from 'dayjs';
import async from 'async';
import semver from 'semver';
import request from 'request-retry-dayjs';

import sleepasync from 'sleep-async';

import InventoryManager from './InventoryManager';
import Pricelist, { EntryData, PricesDataObject } from './Pricelist';
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
import IPricer from './IPricer';
import { EventEmitter } from 'events';
import ipcHandler from './IPC';

export default class Bot {
    // Modules and classes
    readonly ipc?: ipcHandler;

    schema: SchemaManager.Schema; // should be readonly

    readonly bptf: BptfLogin;

    readonly tf2: TF2;

    readonly client: SteamUser;

    readonly manager: TradeOfferManager;

    readonly community: SteamCommunity;

    listingManager: ListingManager; // should be readonly

    readonly friends: Friends;

    readonly groups: Groups;

    readonly trades: Trades;

    readonly listings: Listings;

    readonly tf2gc: TF2GC;

    readonly handler: MyHandler;

    inventoryManager: InventoryManager; // should be readonly

    pricelist: Pricelist; // should be readonly

    schemaManager: SchemaManager; // should be readonly

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

    public userID: string;

    constructor(public readonly botManager: BotManager, public options: Options, readonly priceSource: IPricer) {
        this.botManager = botManager;

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
        this.bptf = new BptfLogin();
        this.tf2 = new TF2(this.client);

        this.friends = new Friends(this);
        this.groups = new Groups(this);
        this.trades = new Trades(this);
        this.listings = new Listings(this);
        this.tf2gc = new TF2GC(this);

        this.handler = new MyHandler(this, this.priceSource);
        if (this.options.IPC) this.ipc = new ipcHandler(this);

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

        return Promise.resolve(
            isBanned(steamID, this.options.bptfAPIKey, this.userID, this.options.bypass.bannedPeople.checkMptfBanned)
        );
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

    private addListener(
        emitter: EventEmitter,
        event: string,
        listener: (...args) => void,
        checkCanEmit: boolean
    ): void {
        emitter.on(event, (...args: any[]) => {
            setImmediate(() => {
                if (!checkCanEmit || this.canSendEvents()) {
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
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
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

    get checkForUpdates(): Promise<{ hasNewVersion: boolean; latestVersion: string }> {
        return this.getLatestVersion.then(async content => {
            const latestVersion = content.version;

            const hasNewVersion = semver.lt(process.env.BOT_VERSION, latestVersion);

            if (this.lastNotifiedVersion !== latestVersion && hasNewVersion) {
                this.lastNotifiedVersion = latestVersion;

                this.messageAdmins(
                    'version',
                    `⚠️ Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.\n\n` +
                        `Release note: https://github.com/TF2Autobot/tf2autobot/releases`,
                    []
                );

                await sleepasync().Promise.sleep(1000);

                if (process.platform === 'win32') {
                    this.messageAdmins(
                        'version',
                        `\n💻 To update run the following command inside your tf2autobot directory using Command Prompt:\n`,
                        []
                    );
                    this.messageAdmins(
                        'version',
                        `/code rmdir /s /q node_modules dist & git reset HEAD --hard & git pull --prune & npm install & npm run build & node dist/app.js`,
                        []
                    );
                } else if (
                    process.platform === 'linux' ||
                    process.platform === 'darwin' ||
                    process.platform === 'openbsd' ||
                    process.platform === 'freebsd'
                ) {
                    this.messageAdmins(
                        'version',
                        `\n💻 To update run the following command inside your tf2autobot directory:\n`,
                        []
                    );
                    this.messageAdmins(
                        'version',
                        `/code rm -r node_modules dist && git reset HEAD --hard && git pull --prune && npm install && npm run build && pm2 restart ecosystem.json`,
                        []
                    );
                } else {
                    this.messageAdmins(
                        'version',
                        `❌ Failed to find what OS your server is running! Kindly run the following standard command for most users inside your tf2autobot folder:\n`,
                        []
                    );
                    this.messageAdmins(
                        'version',
                        `/code rm -r node_modules dist && git reset HEAD --hard && git pull --prune && npm install && npm run build && pm2 restart ecosystem.json`,
                        []
                    );
                }
            }

            return { hasNewVersion, latestVersion };
        });
    }

    private get getLatestVersion(): Promise<{ version: string }> {
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

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                    return resolve({ version: body.version });
                }
            ).end();
        });
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
            loginKey?: string;
            pollData?: TradeOfferManager.PollData;
        };
        let cookies: string[];

        this.addListener(this.client, 'loggedOn', this.handler.onLoggedOn.bind(this.handler), false);
        this.addAsyncListener(this.client, 'friendMessage', this.onMessage.bind(this), true);
        this.addListener(this.client, 'friendRelationship', this.handler.onFriendRelationship.bind(this.handler), true);
        this.addListener(this.client, 'groupRelationship', this.handler.onGroupRelationship.bind(this.handler), true);
        this.addListener(this.client, 'newItems', this.onNewItems.bind(this), true);
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
                            if (this.options.IPC) this.ipc.init();
                            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
                            return callback(null);
                        };

                        void this.login(data.loginKey || null).asCallback(loginResponse);
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
                        log.info('Getting Steam API key...');
                        void this.setCookies(cookies).asCallback(callback);
                    },
                    (callback): void => {
                        this.schemaManager = new SchemaManager({
                            apiKey: this.manager.apiKey,
                            updateTime: 24 * 60 * 60 * 1000
                        });

                        log.info('Getting TF2 schema...');
                        void this.initializeSchema().asCallback(callback);
                    },
                    (callback): void => {
                        log.info('Setting properties, inventory, etc...');
                        this.pricelist = new Pricelist(this.priceSource, this.schema, this.options, this);
                        this.pricelist.init();
                        if (this.options.IPC) {
                            this.ipc.sendPricelist();
                            this.addListener(this.pricelist, 'pricelist', this.ipc.sendPricelist.bind(this.ipc), false); //TODO adapt
                        }
                        this.inventoryManager = new InventoryManager(this.pricelist);

                        const userID = this.bptf._getUserID();
                        this.userID = userID;

                        this.listingManager = new ListingManager({
                            token: this.options.bptfAccessToken,
                            userID,
                            userAgent: 'TF2Autobot@' + process.env.BOT_VERSION,
                            schema: this.schema
                        });

                        this.addListener(this.listingManager, 'pulse', this.handler.onUserAgent.bind(this), true);
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
                            this.pricelist,
                            'pricelist',
                            // eslint-disable-next-line @typescript-eslint/no-misused-promises
                            this.handler.onPricelist.bind(this.handler),
                            false
                        );
                        this.addListener(this.pricelist, 'price', this.handler.onPriceChange.bind(this.handler), true);

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
                    (callback: (err?) => void): void => {
                        if (this.options.enableSocket === false) {
                            log.warn('Disabling socket...');
                            this.priceSource.shutdown();
                        }

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

                    return resolve();
                }
            );
        });
    }

    setProperties(): void {
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

        clearInterval(this.updateSchemaPropertiesInterval);
        this.refreshSchemaProperties();
    }

    private refreshSchemaProperties(): void {
        this.updateSchemaPropertiesInterval = setInterval(() => {
            this.setProperties();
        }, 24 * 60 * 60 * 1000);
    }

    setCookies(cookies: string[]): Promise<void> {
        this.bptf.setCookies(cookies);
        this.community.setCookies(cookies);

        if (this.listingManager) {
            const userID = this.bptf._getUserID();
            this.userID = userID;
            this.listingManager.setUserID(userID);
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

                    log.error('Failed to sign in to Steam: ', err);

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

        if (!friend) {
            // If not friend, we send message with chatMessage
            this.client.chatMessage(steamID, message);
            void this.getPartnerDetails(steamID).then(name => {
                log.info(`Message sent to ${name} (${steamID64} - not friend): ${message}`);
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
        log.debug('New web session');

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
}
