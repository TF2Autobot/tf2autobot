import { snakeCase } from 'change-case';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import jsonlint from 'jsonlint';
import * as path from 'path';
import { deepMerge } from '../lib/tools/deep-merge';

import validator from '../lib/validator';

export const DEFAULTS = {
    showOnlyMetal: true,
    sortInventory: true,
    createListings: true,
    enableMessages: true,
    sendAlert: true,
    enableAddFriends: true,
    enableGroupInvites: true,
    enableOwnerCommand: true,
    autoRemoveIntentSell: false,

    allowEscrow: false,
    allowOverpay: true,
    allowGiftNoMessage: false,
    allowBanned: false,

    sendOfferMessage: '',
    maxPriceAge: 28800,

    autobump: false,

    skipItemsInTrade: true,

    weaponsAsCurrency: {
        enable: true,
        withUncraft: true
    },

    tradeSummary: {
        showStockChanges: false,
        showTimeTakenInMS: true
    },

    highValue: {
        enableHold: true,
        sheens: [],
        killstreakers: [],
        strangeParts: [],
        painted: []
    },
    checkUses: {
        duel: true,
        noiseMaker: true
    },
    game: {
        playOnlyTF2: false,
        customName: ''
    },
    normalize: {
        festivized: false,
        strangeUnusual: false
    },
    details: {
        buy: 'I am buying your %name% for %price%, I have %current_stock% / %max_stock%.',
        sell: 'I am selling my %name% for %price%, I am selling %amount_trade%.',
        highValue: {
            showSpells: true,
            showStrangeParts: false,
            showKillstreaker: true,
            showSheen: true,
            showPainted: true
        }
    },
    customMessage: {
        welcome: '',
        iDontKnowWhatYouMean: '',
        how2trade: '',
        success: '',
        decline: '',
        tradedAway: '',
        clearFriends: ''
    },
    statistics: {
        starter: 0,
        lastTotalTrades: 0,
        startingTimeInUnix: 0,
        lastTotalProfitMadeInRef: 0,
        lastTotalProfitOverpayInRef: 0
    },
    autokeys: {
        enable: false,
        minKeys: 3,
        maxKeys: 15,
        minRefined: 30,
        maxRefined: 150,
        banking: {
            enable: false
        },
        scrapAdjustment: {
            enable: false,
            value: 1
        },
        accept: {
            understock: false
        }
    },
    crafting: {
        weapons: {
            enable: true
        },
        metals: {
            enable: true,
            minScrap: 9,
            minRec: 9,
            threshold: 9
        }
    },
    manualReview: {
        enable: true,
        showOfferSummary: true,
        showReviewOfferNote: true,
        showOwnerCurrentTime: true,
        invalidValue: {
            note: '',
            autoDecline: {
                enable: true,
                note: ''
            },
            exceptionValue: {
                skus: [],
                valueInRef: 0
            }
        },
        invalidItems: {
            note: '',
            givePrice: true,
            autoAcceptOverpay: true
        },
        overstocked: {
            note: '',
            autoAcceptOverpay: false,
            autoDecline: false
        },
        understocked: {
            note: '',
            autoAcceptOverpay: false,
            autoDecline: false
        },
        duped: {
            enable: true,
            declineDuped: false,
            minKeys: 10,
            note: ''
        },
        dupedCheckFailed: {
            note: ''
        },
        additionalNotes: ''
    },
    discordInviteLink: '',
    discordWebhook: {
        ownerID: '',
        displayName: '',
        avatarURL: '',
        embedColor: '9171753',
        tradeSummary: {
            enable: true,
            url: [],
            misc: {
                showQuickLinks: true,
                showKeyRate: true,
                showPureStock: true,
                showInventory: true,
                note: ''
            },
            mentionOwner: {
                enable: true,
                itemSkus: []
            }
        },
        offerReview: {
            enable: true,
            url: '',
            mentionInvalidValue: false,
            misc: {
                showQuickLinks: true,
                showKeyRate: true,
                showPureStock: true,
                showInventory: true
            }
        },
        messages: {
            enable: true,
            url: '',
            showQuickLinks: true
        },
        priceUpdate: {
            enable: true,
            url: '',
            note: ''
        },
        sendAlert: {
            enable: true,
            url: ''
        }
    }
};

export interface WeaponsAsCurrency {
    enable?: boolean;
    withUncraft?: boolean;
}

export interface TradeSummary {
    showStockChanges?: boolean;
    showTimeTakenInMS?: boolean;
}

export interface HighValue {
    enableHold?: boolean;
    sheens?: string[];
    killstreakers?: string[];
    strangeParts?: string[];
    painted?: string[];
}

export interface CheckUses {
    duel?: boolean;
    noiseMaker?: boolean;
}

export interface Game {
    playOnlyTF2?: boolean;
    customName?: string;
}

export interface Normalize {
    festivized?: boolean;
    strangeUnusual?: boolean;
}

export interface Details {
    buy?: string;
    sell?: string;
    highValue?: ShowHighValue;
}

export interface ShowHighValue {
    showSpells: boolean;
    showStrangeParts: boolean;
    showKillstreaker: boolean;
    showSheen: boolean;
    showPainted: boolean;
}

export interface CustomMessage {
    welcome?: string;
    iDontKnowWhatYouMean?: string;
    how2trade?: string;
    success?: string;
    decline?: string;
    tradedAway?: string;
    clearFriends?: string;
}

export interface Statistics {
    starter?: number;
    lastTotalTrades?: number;
    startingTimeInUnix?: number;
    lastTotalProfitMadeInRef?: number;
    lastTotalProfitOverpayInRef?: number;
}

export interface Banking {
    enable?: boolean;
}

export interface ScrapAdjustment {
    enable?: boolean;
    value?: number;
}

export interface Accept {
    understock?: boolean;
}

export interface Autokeys {
    enable?: boolean;
    minKeys?: number;
    maxKeys?: number;
    minRefined?: number;
    maxRefined?: number;
    banking?: Banking;
    scrapAdjustment?: ScrapAdjustment;
    accept?: Accept;
}

export interface Weapons {
    enable?: boolean;
}

export interface Metals {
    enable?: boolean;
    minScrap?: number;
    minRec?: number;
    threshold?: number;
}

export interface Crafting {
    weapons?: Weapons;
    metals?: Metals;
}

export interface AutoDecline {
    enable?: boolean;
    note?: string;
}

export interface ExceptionValue {
    skus?: string[];
    valueInRef?: number;
}

export interface InvalidValue {
    note?: string;
    autoDecline?: AutoDecline;
    exceptionValue?: ExceptionValue;
}

export interface InvalidItems {
    note?: string;
    givePrice?: boolean;
    autoAcceptOverpay?: boolean;
}

export interface Overstocked {
    note?: string;
    autoAcceptOverpay?: boolean;
    autoDecline?: boolean;
}

export interface Understocked {
    note?: string;
    autoAcceptOverpay?: boolean;
    autoDecline?: boolean;
}

export interface Duped {
    enable?: boolean;
    declineDuped?: boolean;
    minKeys?: number;
    note?: string;
}

export interface DupedCheckFailed {
    note?: string;
}

export interface ManualReview {
    enable?: boolean;
    showOfferSummary?: boolean;
    showReviewOfferNote?: boolean;
    showOwnerCurrentTime?: boolean;
    invalidValue?: InvalidValue;
    invalidItems?: InvalidItems;
    overstocked?: Overstocked;
    understocked?: Understocked;
    duped?: Duped;
    dupedCheckFailed?: DupedCheckFailed;
    additionalNotes?: string;
}

export interface Misc {
    showQuickLinks?: boolean;
    showKeyRate?: boolean;
    showPureStock?: boolean;
    showInventory?: boolean;
    note?: string;
}

export interface MentionOwner {
    enable?: boolean;
    itemSkus?: string[];
}

export interface TradeSummaryDW {
    enable?: boolean;
    url?: string[];
    misc?: Misc;
    mentionOwner?: MentionOwner;
}

export interface Misc2 {
    showQuickLinks?: boolean;
    showKeyRate?: boolean;
    showPureStock?: boolean;
    showInventory?: boolean;
}

export interface OfferReview {
    enable?: boolean;
    url?: string;
    mentionInvalidValue?: boolean;
    misc?: Misc2;
}

export interface Messages {
    enable?: boolean;
    url?: string;
    showQuickLinks?: boolean;
}

export interface PriceUpdate {
    enable?: boolean;
    url?: string;
    note?: string;
}

export interface SendAlert {
    enable?: boolean;
    url?: string;
}

export interface DiscordWebhook {
    ownerID?: string;
    displayName?: string;
    avatarURL?: string;
    embedColor?: string;
    tradeSummary?: TradeSummaryDW;
    offerReview?: OfferReview;
    messages?: Messages;
    priceUpdate?: PriceUpdate;
    sendAlert?: SendAlert;
}

export interface JsonOptions {
    showOnlyMetal?: boolean;
    sortInventory?: boolean;
    createListings?: boolean;
    enableMessages?: boolean;
    sendAlert?: boolean;
    enableAddFriends?: boolean;
    weaponsAsCurrency?: WeaponsAsCurrency;
    enableGroupInvites?: boolean;
    enableOwnerCommand?: boolean;
    autoRemoveIntentSell?: boolean;
    allowEscrow?: boolean;
    allowOverpay?: boolean;
    allowGiftNoMessage?: boolean;
    allowBanned?: boolean;
    sendOfferMessage?: string;
    maxPriceAge?: number;
    autobump?: boolean;
    skipItemsInTrade?: boolean;
    tradeSummary?: TradeSummary;
    highValue?: HighValue;
    checkUses?: CheckUses;
    game?: Game;
    normalize?: Normalize;
    details?: Details;
    customMessage?: CustomMessage;
    statistics?: Statistics;
    autokeys?: Autokeys;
    crafting?: Crafting;
    manualReview?: ManualReview;
    discordInviteLink?: string;
    discordWebhook?: DiscordWebhook;
}

export default interface Options extends JsonOptions {
    steamAccountName?: string;
    steamPassword?: string;
    steamSharedSecret?: string;
    steamIdentitySecret?: string;

    bptfAccessToken?: string;
    bptfAPIKey?: string;

    admins?: Array<string>;
    keep?: Array<string>;
    groups?: Array<string>;
    alerts?: Array<string>;

    pricestfAPIToken?: string;

    skipBPTFTradeofferURL?: boolean;
    skipAccountLimitations?: boolean;
    skipUpdateProfileSettings?: boolean;

    timezone?: string;
    customTimeFormat?: string;
    timeAdditionalNotes?: string;

    debug?: boolean;
    debugFile?: boolean;

    folderName?: string;
    filePrefix?: string;
}

function getOption<T>(option: string, def: T, parseFn: (target: string) => T, options?: Options): T {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (options && options[option]) return options[option];
        const envVar = snakeCase(option).toUpperCase();
        // log.debug('envVar: ', envVar);
        // log.debug('value: ', process.env[envVar] ? parseFn(process.env[envVar]) : def);
        return process.env[envVar] ? parseFn(process.env[envVar]) : def;
    } catch {
        return def;
    }
}

function throwLintError(filepath: string, e: Error): void {
    if (e instanceof Error && 'message' in e) {
        throw new Error(`${filepath}\n${e.message}`);
    }
    throw e;
}

function lintPath(filepath: string): void {
    const rawOptions = readFileSync(filepath, { encoding: 'utf8' });
    try {
        jsonlint.parse(rawOptions);
    } catch (e) {
        throwLintError(filepath, e);
    }
}

function lintAllTheThings(directory: string): void {
    if (existsSync(directory)) {
        readdirSync(directory, { withFileTypes: true })
            .filter(ent => path.extname(ent.name) === '.json')
            .forEach(ent => lintPath(path.join(directory, ent.name)));
    }
}

function loadJsonOptions(optionsPath: string, options?: Options): JsonOptions {
    let fileOptions;
    const workingDefault = deepMerge({}, DEFAULTS);
    const incomingOptions = options ? deepMerge({}, options) : deepMerge({}, DEFAULTS);

    try {
        const rawOptions = readFileSync(optionsPath, { encoding: 'utf8' });
        try {
            fileOptions = deepMerge({}, workingDefault, JSON.parse(rawOptions));
            return deepMerge(fileOptions, incomingOptions);
        } catch (e) {
            if (e instanceof SyntaxError) {
                // lint the rawOptions to give better feedback since it is SyntaxError
                try {
                    jsonlint.parse(rawOptions);
                } catch (e) {
                    throwLintError(optionsPath, e);
                }
            }
            throw e;
        }
    } catch (e) {
        // file or directory is missing or something else is wrong
        if (!existsSync(path.dirname(optionsPath))) {
            // check for dir
            mkdirSync(path.dirname(optionsPath), { recursive: true });
            writeFileSync(optionsPath, JSON.stringify(DEFAULTS, null, 4), { encoding: 'utf8' });
            return deepMerge({}, DEFAULTS);
        } else if (!existsSync(optionsPath)) {
            // directory is present, see if file was missing
            writeFileSync(optionsPath, JSON.stringify(DEFAULTS, null, 4), { encoding: 'utf8' });
            return deepMerge({}, DEFAULTS);
        } else {
            // something else is wrong, throw the error
            throw e;
        }
    }
}

export function removeCliOptions(incomingOptions: Options): void {
    const findNonEnv = validator(incomingOptions, 'options');
    if (findNonEnv) {
        findNonEnv
            .filter(e => e.includes('unknown property'))
            .map(e => e.slice(18, -1))
            .map(e => delete incomingOptions[e]);
    }
}

export function loadOptions(options?: Options): Options {
    const incomingOptions = options ? deepMerge({}, options) : {};
    const steamAccountName = getOption('steamAccountName', '', String, incomingOptions);
    lintAllTheThings(getFilesPath(steamAccountName)); // you shall not pass

    const jsonParseArray = (jsonString: string): string[] => (JSON.parse(jsonString) as unknown) as string[];
    const jsonParseBoolean = (jsonString: string): boolean => (JSON.parse(jsonString) as unknown) as boolean;

    const envOptions = {
        steamAccountName: steamAccountName,
        steamPassword: getOption('steamPassword', '', String, incomingOptions),
        steamSharedSecret: getOption('steamSharedSecret', '', String, incomingOptions),
        steamIdentitySecret: getOption('steamIdentitySecret', '', String, incomingOptions),

        bptfAccessToken: getOption('bptfAccessToken', '', String, incomingOptions),
        bptfAPIKey: getOption('bptfAPIKey', '', String, incomingOptions),

        admins: getOption('admins', [], jsonParseArray, incomingOptions),
        keep: getOption('keep', [], jsonParseArray, incomingOptions),
        groups: getOption('groups', ['103582791464047777', '103582791462300957'], jsonParseArray, incomingOptions),
        alerts: getOption('alerts', ['trade'], jsonParseArray, incomingOptions),

        pricestfAPIToken: getOption('pricestfAPIToken', '', String, incomingOptions),

        skipBPTFTradeofferURL: getOption('skipBPTFTradeofferURL', true, jsonParseBoolean, incomingOptions),
        skipAccountLimitations: getOption('skipAccountLimitations', true, jsonParseBoolean, incomingOptions),
        skipUpdateProfileSettings: getOption('skipUpdateProfileSettings', true, jsonParseBoolean, incomingOptions),

        timezone: getOption('timezone', '', String, incomingOptions),
        customTimeFormat: getOption('customTimeFormat', '', String, incomingOptions),
        timeAdditionalNotes: getOption('timeAdditionalNotes', '', String, incomingOptions),

        debug: getOption('debug', true, jsonParseBoolean, incomingOptions),
        debugFile: getOption('debugFile', true, jsonParseBoolean, incomingOptions)
    };

    if (!envOptions.steamAccountName) {
        throw new Error('STEAM_ACCOUNT_NAME must be set in the environment');
    }

    removeCliOptions(incomingOptions);
    const jsonOptions = loadJsonOptions(getOptionsPath(envOptions.steamAccountName), incomingOptions);

    const errors = validator(jsonOptions, 'options');
    if (errors !== null) {
        throw new Error(errors.join(', '));
    }
    return deepMerge(jsonOptions, envOptions, incomingOptions);
}

export function getFilesPath(accountName: string): string {
    return path.resolve(__dirname, '..', '..', 'files', accountName);
}

export function getOptionsPath(accountName: string): string {
    return path.resolve(getFilesPath(accountName), 'options.json');
}
