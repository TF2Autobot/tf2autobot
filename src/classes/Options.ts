import { snakeCase } from 'change-case';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { deepMerge } from '../lib/tools/deep-merge';

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
    enableCraftweaponAsCurrency: true,

    allowEscrow: false,
    allowOverpay: true,
    allowGiftNoMessage: false,
    allowBanned: false,

    sendOfferMessage: 'Thank you',

    autobump: false,

    highValue: {
        enableHold: true,
        sheens: ['Team Shine'],
        killstreakers: ['Fire Horns', 'Tornado']
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
        sell: 'I am selling my %name% for %price%, I am selling %amount_trade%.'
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
        startingTimeInUnix: 0
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
                skus: [';5;u', ';11;australium'],
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
            url: [''],
            misc: {
                showQuickLinks: true,
                showKeyRate: true,
                showPureStock: true,
                showInventory: true,
                note: ''
            },
            mentionOwner: {
                enable: true,
                itemSkus: [';5;u', ';11;australium']
            }
        },
        offerReview: {
            enable: true,
            url: '',
            mentionInvalidValue: false,
            misc: {
                showQuickLinks: true,
                showKeyRate: true,
                showPureStock: true
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
    },
    maxPriceAge: 28800
};

export interface HighValue {
    enableHold?: boolean;
    sheens?: string[];
    killstreakers?: string[];
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

export interface TradeSummary {
    enable?: boolean;
    url?: string[];
    misc?: Misc;
    mentionOwner?: MentionOwner;
}

export interface Misc2 {
    showQuickLinks?: boolean;
    showKeyRate?: boolean;
    showPureStock?: boolean;
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
    tradeSummary?: TradeSummary;
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
    enableCraftweaponAsCurrency?: boolean;
    enableGroupInvites?: boolean;
    enableOwnerCommand?: boolean;
    autoRemoveIntentSell?: boolean;
    allowEscrow?: boolean;
    allowOverpay?: boolean;
    allowGiftNoMessage?: boolean;
    allowBanned?: boolean;
    sendOfferMessage?: string;
    autobump?: boolean;
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
    maxPriceAge?: number;
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
        if (options && options[option]) return options[option];
        const envVar = snakeCase(option).toUpperCase();
        // log.debug('envVar: ', envVar);
        // log.debug('value: ', process.env[envVar] ? parseFn(process.env[envVar]) : def);
        return process.env[envVar] ? parseFn(process.env[envVar]) : def;
    } catch {
        return def;
    }
}

function loadJsonOptions(p: string, options?: Options): JsonOptions {
    let fileOptions;
    const incomingOptions = options ? options : DEFAULTS;
    try {
        fileOptions = deepMerge(DEFAULTS, JSON.parse(readFileSync(p, { encoding: 'utf8' })));
    } catch {
        if (!existsSync(path.dirname(p))) mkdirSync(path.dirname(p), { recursive: true });
        writeFileSync(p, JSON.stringify(DEFAULTS, null, 4), { encoding: 'utf8' });
        fileOptions = deepMerge({}, DEFAULTS);
    }
    return deepMerge(fileOptions, incomingOptions);
}

export function loadOptions(options?: Options): Options {
    const incomingOptions = options ? options : {};
    const steamAccountName = getOption('steamAccountName', '', String, incomingOptions);
    const envOptions = {
        steamAccountName: steamAccountName,
        steamPassword: getOption('steamPassword', '', String, incomingOptions),
        steamSharedSecret: getOption('steamSharedSecret', '', String, incomingOptions),
        steamIdentitySecret: getOption('steamIdentitySecret', '', String, incomingOptions),

        bptfAccessToken: getOption('bptfAccessToken', '', String, incomingOptions),
        bptfAPIKey: getOption('bptfAPIKey', '', String, incomingOptions),

        admins: getOption('admins', [], JSON.parse, incomingOptions),
        keep: getOption('keep', [], JSON.parse, incomingOptions),
        groups: getOption('groups', ['103582791464047777', '103582791462300957'], JSON.parse, incomingOptions),
        alerts: getOption('alerts', ['trade'], JSON.parse, incomingOptions),

        pricestfAPIToken: getOption('pricestfAPIToken', '', String, incomingOptions),

        skipBPTFTradeofferURL: getOption('skipBPTFTradeofferURL', true, JSON.parse, incomingOptions),
        skipAccountLimitations: getOption('skipAccountLimitations', true, JSON.parse, incomingOptions),
        skipUpdateProfileSettings: getOption('skipUpdateProfileSettings', true, JSON.parse, incomingOptions),

        timezone: getOption('timezone', '', String, incomingOptions),
        customTimeFormat: getOption('customTimeFormat', '', String, incomingOptions),
        timeAdditionalNotes: getOption('timeAdditionalNotes', '', String, incomingOptions),

        debug: getOption('debug', true, JSON.parse, incomingOptions),
        debugFile: getOption('debugFile', true, JSON.parse, incomingOptions),

        folderName: getOption('folderName', steamAccountName, String, incomingOptions),
        filePrefix: getOption('filePrefix', steamAccountName, String, incomingOptions)
    };
    const jsonOptions = loadJsonOptions(
        path.resolve(__dirname, '..', '..', 'files', envOptions.folderName, 'options.json'),
        incomingOptions
    );
    return deepMerge(jsonOptions, envOptions, incomingOptions);
}
