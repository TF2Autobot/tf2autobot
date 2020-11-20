import { snakeCase } from 'change-case';
// import log from '../lib/logger';

export interface Options {
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

    autobump?: boolean;

    minimumScrap?: number;
    minimumReclaimed?: number;
    metalThreshold?: number;
    disableCraftingMetal?: boolean;
    disableCraftingWeapons?: boolean;
    enableShowOnlyMetal?: boolean;

    enableAutoKeys?: boolean;
    enableAutoKeysBanking?: boolean;
    minimumKeys?: number;
    maximumKeys?: number;
    minimumRefinedToStartSellKeys?: number;
    maximumRefinedToStopSellKeys?: number;
    disableScrapAdjustment?: boolean;
    scrapAdjustmentValue?: number;
    autoKeysAcceptUnderstocked?: boolean;

    disableInventorySort?: boolean;
    disableListings?: boolean;
    disableMessages?: boolean;
    disableSomethingWrongAlert?: boolean;
    disableCraftWeaponAsCurrency?: boolean;
    disableGivePriceToInvalidItems?: boolean;
    disableAddFriends?: boolean;
    disableGroupsInvite?: boolean;
    disableCheckUsesDuelingMiniGame?: boolean;
    disableCheckUsesNoiseMaker?: boolean;
    disableOwnerCommand?: boolean;
    disableAutoRemoveIntentSell?: boolean;

    disableHighValueHold?: boolean;
    highValueSheens?: Array<string>;
    highValueKillstreakers?: Array<string>;

    normalizeFestivizedItems?: boolean;
    normalizeStrangeUnusual?: boolean;

    tradesMadeStarterValue?: number;
    lastTotalTrades?: number;
    tradingStartingTimeUnix?: number;

    enableDupeCheck?: boolean;
    declineDupes?: boolean;
    minimumKeysDupeCheck?: number;

    skipBPTPTradeOfferURL?: boolean;
    skipAccountLimitations?: boolean;
    skipUpdateProfileSettings?: boolean;

    timezone?: string;
    customTimeFormat?: string;
    timeAdditionalNotes?: string;

    allowEscrow?: boolean;
    allowOverpay?: boolean;
    allowGiftWithoutNote?: boolean;
    allowBanned?: boolean;

    maxPriceAge?: number;

    debug?: boolean;
    debugFile?: boolean;

    bptfDetailsBuy?: string;
    bptfDetailsSell?: string;

    offerMessage?: string;

    discordServerInviteLink?: string;

    discordOwnerID?: string;
    discordWebhookUserName?: string;
    discordWebhookAvatarURL?: string;
    discordWebhookEmdedColorInDecimalIndex?: string;

    disableDiscordWebhookSomethingWrongAlert?: boolean;
    discordWebhookSomethingWrongAlertURL?: string;

    disableDiscordWebhookPriceUpdate?: boolean;
    discordWebhookPriceUpdateURL?: string;
    discordWebHookPriceUpdateAdditionalDescriptionNote?: string;

    disableDiscordWebhookTradeSummary?: boolean;
    discordWebhookTradeSummaryURL?: Array<string>;
    discordWebhookTradeSummaryShowQuickLinks?: boolean;
    discordWebhookTradeSummaryShowKeyRate?: boolean;
    discordWebhookTradeSummaryShowPureStock?: boolean;
    discordWebhookTradeSummaryShowInventory?: boolean;
    discordWebhookTradeSummaryAdditionalDescriptionNote?: string;
    discordWebhookTradeSummaryMentionOwner?: boolean;
    discordWebhookTradeSummaryMentionOwnerOnlyItemsSKU?: Array<string>;

    disableDiscordWebHookOfferReview?: boolean;
    discordWebHookReviewOfferURL?: string;
    discordWebhookReviewOfferDisableMentionInvalidValue?: boolean;
    discordWebhookReviewOfferShowQuickLinks?: boolean;
    discordWebhookReviewOfferShowKeyRate?: boolean;
    discordWebhookReviewOfferShowPureStock?: boolean;

    disableDiscordWebhookMessageFromPartner?: boolean;
    discordWebhookMessageFromPartnerURL?: string;
    discordWebhookMessageFromPartnerShowQuickLinks?: boolean;

    enableManualReview?: boolean;
    disableShowReviewOfferSummary?: boolean;
    disableReviewOfferNote?: boolean;
    disableShowCurrentTime?: boolean;

    disableAcceptInvalidItemsOverpay?: boolean;
    disableAcceptOverstockedOverpay?: boolean;
    disableAcceptUnderstockedOverpay?: boolean;

    disableAutoDeclineOverstocked?: boolean;
    disableAutoDeclineUnderstocked?: boolean;
    disableAutoDeclineInvalidValue?: boolean;
    autoDeclineInvalidValueNote?: string;

    invalidValueExceptionSKUs?: Array<string>;
    invalidValueExceptionValueInRef?: number;

    invalidValueNote?: string;
    invalidItemsNote?: string;
    overstockedNote?: string;
    understockedNote?: string;
    dupeItemsNote?: string;
    dupeCheckFailedNote?: string;
    additionalNote?: string;

    enableOnlyPlayTF2?: boolean;
    customPlayingGameName?: string;

    customWelcomeMessage?: string;
    customIDontKnowWhatYouMean?: string;
    customHow2TradeMessage?: string;

    customSuccessMessage?: string;
    customDeclinedMessage?: string;
    customTradedAwayMessage?: string;
    customClearingFriendsMessage?: string;
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

export function loadOptions(rawOptions?: Options): Options {
    return {
        steamAccountName: getOption('steamAccountName', '', String, rawOptions),
        steamPassword: getOption('steamPassword', '', String, rawOptions),
        steamSharedSecret: getOption('steamSharedSecret', '', String, rawOptions),
        steamIdentitySecret: getOption('steamIdentitySecret', '', String, rawOptions),

        bptfAccessToken: getOption('bptfAccessToken', '', String, rawOptions),
        bptfAPIKey: getOption('bptfAPIKey', '', String, rawOptions),
        admins: getOption('admins', [''], JSON.parse, rawOptions),
        keep: getOption('keep', [''], JSON.parse, rawOptions),
        groups: getOption('groups', ['103582791464047777', '103582791462300957'], JSON.parse, rawOptions),
        alerts: getOption('alerts', ['trade'], JSON.parse, rawOptions),

        pricestfAPIToken: getOption('pricestfAPIToken', '', String, rawOptions),

        autobump: getOption('autobump', false, JSON.parse, rawOptions),

        minimumScrap: getOption('minimumScrap', 9, parseInt, rawOptions),
        minimumReclaimed: getOption('minimumReclaimed', 9, parseInt, rawOptions),
        metalThreshold: getOption('metalThreshold', 9, parseInt, rawOptions),
        disableCraftingMetal: getOption('disableCraftingMetal', false, JSON.parse, rawOptions),
        disableCraftingWeapons: getOption('disableCraftingWeapons', false, JSON.parse, rawOptions),
        enableShowOnlyMetal: getOption('enableShowOnlyMetal', true, JSON.parse, rawOptions),

        enableAutoKeys: getOption('enableAutoKeys', false, JSON.parse, rawOptions),
        enableAutoKeysBanking: getOption('enableAutoKeysBanking', false, JSON.parse, rawOptions),
        minimumKeys: getOption('minimumKeys', 3, parseInt, rawOptions),
        maximumKeys: getOption('maximumKeys', 15, parseInt, rawOptions),
        minimumRefinedToStartSellKeys: getOption('minimumRefinedToStartSellKeys', 30, parseInt, rawOptions),
        maximumRefinedToStopSellKeys: getOption('maximumRefinedToStopSellKeys', 150, parseInt, rawOptions),
        disableScrapAdjustment: getOption('disableScrapAdjustment', true, JSON.parse, rawOptions),
        scrapAdjustmentValue: getOption('scrapAdjustmentValue', 1, parseInt, rawOptions),
        autoKeysAcceptUnderstocked: getOption('autoKeysAcceptUnderstocked', false, JSON.parse, rawOptions),

        disableInventorySort: getOption('disableInventorySort', false, JSON.parse, rawOptions),
        disableListings: getOption('disableListings', false, JSON.parse, rawOptions),
        disableMessages: getOption('disableMessages', false, JSON.parse, rawOptions),
        disableSomethingWrongAlert: getOption('disableSomethingWrongAlert', false, JSON.parse, rawOptions),
        disableCraftWeaponAsCurrency: getOption('disableCraftWeaponAsCurrency', false, JSON.parse, rawOptions),
        disableGivePriceToInvalidItems: getOption('disableGivePriceToInvalidItems', false, JSON.parse, rawOptions),
        disableAddFriends: getOption('disableAddFriends', false, JSON.parse, rawOptions),
        disableGroupsInvite: getOption('disableGroupsInvite', false, JSON.parse, rawOptions),
        disableCheckUsesDuelingMiniGame: getOption('disableCheckUsesDuelingMiniGame', false, JSON.parse, rawOptions),
        disableCheckUsesNoiseMaker: getOption('disableCheckUsesNoiseMaker', false, JSON.parse, rawOptions),
        disableOwnerCommand: getOption('disableOwnerCommand', false, JSON.parse, rawOptions),
        disableAutoRemoveIntentSell: getOption('disableAutoRemoveIntentSell', false, JSON.parse, rawOptions),

        disableHighValueHold: getOption('disableAutoRemoveIntentSell', false, JSON.parse, rawOptions),
        highValueSheens: getOption('highValueSheens', ['Team Shine'], JSON.parse, rawOptions),
        highValueKillstreakers: getOption('highValueKillstreakers', ['Fire Horns', 'Tornado'], JSON.parse, rawOptions),

        normalizeFestivizedItems: getOption('normalizeFestivizedItems', false, JSON.parse, rawOptions),
        normalizeStrangeUnusual: getOption('normalizeStrangeUnusual', false, JSON.parse, rawOptions),

        tradesMadeStarterValue: getOption('tradesMadeStarterValue', 0, parseInt, rawOptions),
        lastTotalTrades: getOption('lastTotalTrades', 0, parseInt, rawOptions),
        tradingStartingTimeUnix: getOption('tradingStartingTimeUnix', 0, parseInt, rawOptions),

        enableDupeCheck: getOption('enableDupeCheck', true, JSON.parse, rawOptions),
        declineDupes: getOption('declineDupes', false, JSON.parse, rawOptions),
        minimumKeysDupeCheck: getOption('minimumKeysDupeCheck', 10, parseInt, rawOptions),

        skipBPTPTradeOfferURL: getOption('skipBPTPTradeOfferURL', true, JSON.parse, rawOptions),
        skipAccountLimitations: getOption('skipAccountLimitations', true, JSON.parse, rawOptions),
        skipUpdateProfileSettings: getOption('skipUpdateProfileSettings', true, JSON.parse, rawOptions),

        timezone: getOption('timezone', '', String, rawOptions),
        customTimeFormat: getOption('customTimeFormat', '', String, rawOptions),
        timeAdditionalNotes: getOption('timeAdditionalNotes', '', String, rawOptions),

        allowEscrow: getOption('allowEscrow', false, JSON.parse, rawOptions),
        allowOverpay: getOption('allowOverpay', true, JSON.parse, rawOptions),
        allowGiftWithoutNote: getOption('allowGiftWithoutNote', false, JSON.parse, rawOptions),
        allowBanned: getOption('allowBanned', false, JSON.parse, rawOptions),

        maxPriceAge: getOption('maxPriceAge', 28800, parseInt, rawOptions),

        debug: getOption('debug', true, JSON.parse, rawOptions),
        debugFile: getOption('debugFile', true, JSON.parse, rawOptions),

        bptfDetailsBuy: getOption(
            'bptfDetailsBuy',
            'I am buying your %name% for %price%, I have %current_stock% / %max_stock%, so I am buying %amount_trade%.',
            String,
            rawOptions
        ),
        bptfDetailsSell: getOption(
            'bptfDetailsSell',
            'I am selling my %name% for %price%, I am selling %amount_trade%.',
            String,
            rawOptions
        ),

        offerMessage: getOption('offerMessage', '', String, rawOptions),

        discordServerInviteLink: getOption('discordServerInviteLink', '', String, rawOptions),

        discordOwnerID: getOption('discordOwnerID', '', String, rawOptions),
        discordWebhookUserName: getOption('discordWebhookUserName', '', String, rawOptions),
        discordWebhookAvatarURL: getOption('discordWebhookAvatarURL', '', String, rawOptions),
        discordWebhookEmdedColorInDecimalIndex: getOption(
            'discordWebhookEmdedColorInDecimalIndex',
            '9171753',
            String,
            rawOptions
        ),

        disableDiscordWebhookSomethingWrongAlert: getOption(
            'disableDiscordWebhookSomethingWrongAlert',
            false,
            JSON.parse,
            rawOptions
        ),
        discordWebhookSomethingWrongAlertURL: getOption('discordWebhookSomethingWrongAlertURL', '', String, rawOptions),

        disableDiscordWebhookPriceUpdate: getOption('disableDiscordWebhookPriceUpdate', false, JSON.parse, rawOptions),
        discordWebhookPriceUpdateURL: getOption('discordWebhookPriceUpdateURL', '', String, rawOptions),
        discordWebHookPriceUpdateAdditionalDescriptionNote: getOption(
            'discordWebHookPriceUpdateAdditionalDescriptionNote',
            '',
            String,
            rawOptions
        ),

        disableDiscordWebhookTradeSummary: getOption(
            'disableDiscordWebhookTradeSummary',
            false,
            JSON.parse,
            rawOptions
        ),
        discordWebhookTradeSummaryURL: getOption('discordWebhookTradeSummaryURL', [''], JSON.parse, rawOptions),
        discordWebhookTradeSummaryShowQuickLinks: getOption(
            'discordWebhookTradeSummaryShowQuickLinks',
            true,
            JSON.parse,
            rawOptions
        ),
        discordWebhookTradeSummaryShowKeyRate: getOption(
            'discordWebhookTradeSummaryShowKeyRate',
            true,
            JSON.parse,
            rawOptions
        ),
        discordWebhookTradeSummaryShowPureStock: getOption(
            'discordWebhookTradeSummaryShowPureStock',
            true,
            JSON.parse,
            rawOptions
        ),
        discordWebhookTradeSummaryShowInventory: getOption(
            'discordWebhookTradeSummaryShowInventory',
            true,
            JSON.parse,
            rawOptions
        ),
        discordWebhookTradeSummaryAdditionalDescriptionNote: getOption(
            'discordWebhookTradeSummaryAdditionalDescriptionNote',
            '',
            String,
            rawOptions
        ),
        discordWebhookTradeSummaryMentionOwner: getOption(
            'discordWebhookTradeSummaryMentionOwner',
            false,
            JSON.parse,
            rawOptions
        ),
        discordWebhookTradeSummaryMentionOwnerOnlyItemsSKU: getOption(
            'discordWebhookTradeSummaryMentionOwnerOnlyItemsSKU',
            [''],
            JSON.parse,
            rawOptions
        ),

        disableDiscordWebHookOfferReview: getOption('disableDiscordWebHookOfferReview', false, JSON.parse, rawOptions),
        discordWebHookReviewOfferURL: getOption('discordWebhookReviewOfferURL', '', String, rawOptions),
        discordWebhookReviewOfferDisableMentionInvalidValue: getOption(
            'discordWebhookReviewOfferDisableMentionInvalidValue',
            false,
            JSON.parse,
            rawOptions
        ),
        discordWebhookReviewOfferShowQuickLinks: getOption(
            'discordWebhookReviewOfferShowQuickLinks',
            true,
            JSON.parse,
            rawOptions
        ),
        discordWebhookReviewOfferShowKeyRate: getOption(
            'discordWebhookReviewOfferShowKeyRate',
            true,
            JSON.parse,
            rawOptions
        ),
        discordWebhookReviewOfferShowPureStock: getOption(
            'discordWebhookReviewOfferShowPureStock',
            true,
            JSON.parse,
            rawOptions
        ),

        disableDiscordWebhookMessageFromPartner: getOption(
            'disableDiscordWebhookMessageFromPartner',
            false,
            JSON.parse,
            rawOptions
        ),
        discordWebhookMessageFromPartnerURL: getOption('discordWebhookMessageFromPartnerURL', '', String, rawOptions),
        discordWebhookMessageFromPartnerShowQuickLinks: getOption(
            'discordWebhookMessageFromPartnerShowQuickLinks',
            true,
            JSON.parse,
            rawOptions
        ),

        enableManualReview: getOption('enableManualReview', true, JSON.parse, rawOptions),
        disableShowReviewOfferSummary: getOption('disableShowReviewOfferSummary', false, JSON.parse, rawOptions),
        disableReviewOfferNote: getOption('disableReviewOfferNote', false, JSON.parse, rawOptions),
        disableShowCurrentTime: getOption('disableShowCurrentTime', false, JSON.parse, rawOptions),

        disableAcceptInvalidItemsOverpay: getOption('disableAcceptInvalidItemsOverpay', true, JSON.parse, rawOptions),
        disableAcceptOverstockedOverpay: getOption('disableAcceptOverstockedOverpay', true, JSON.parse, rawOptions),
        disableAcceptUnderstockedOverpay: getOption('disableAcceptUnderstockedOverpay', false, JSON.parse, rawOptions),

        disableAutoDeclineOverstocked: getOption('disableAutoDeclineOverstocked', true, JSON.parse, rawOptions),
        disableAutoDeclineUnderstocked: getOption('disableAutoDeclineUnderstocked', true, JSON.parse, rawOptions),
        disableAutoDeclineInvalidValue: getOption('disableAutoDeclineInvalidValue', false, JSON.parse, rawOptions),
        autoDeclineInvalidValueNote: getOption('autoDeclineInvalidValueNote', '', String, rawOptions),

        invalidValueExceptionSKUs: getOption(
            'invalidValueExceptionSKUs',
            [';5;u', ';11;australium'],
            JSON.parse,
            rawOptions
        ),
        invalidValueExceptionValueInRef: getOption('invalidValueExceptionValueInRef', 0, parseInt, rawOptions),

        invalidValueNote: getOption('invalidValueNote', '', String, rawOptions),
        invalidItemsNote: getOption('invalidItemsNote', '', String, rawOptions),
        overstockedNote: getOption('overstockedNote', '', String, rawOptions),
        understockedNote: getOption('understockedNote', '', String, rawOptions),
        dupeItemsNote: getOption('dupeItemsNote', '', String, rawOptions),
        dupeCheckFailedNote: getOption('dupeCheckFailedNote', '', String, rawOptions),
        additionalNote: getOption('additionalNote', '', String, rawOptions),

        enableOnlyPlayTF2: getOption('enableOnlyPlayTF2', false, JSON.parse, rawOptions),
        customPlayingGameName: getOption('customPlayingGameName', 'trading', String, rawOptions),

        customWelcomeMessage: getOption('customWelcomeMessage', '', String, rawOptions),
        customIDontKnowWhatYouMean: getOption('customIDontKnowWhatYouMean', '', String, rawOptions),
        customHow2TradeMessage: getOption('customHow2TradeMessage', '', String, rawOptions),

        customSuccessMessage: getOption('customSuccessMessage', '', String, rawOptions),
        customDeclinedMessage: getOption('customDeclinedMessage', '', String, rawOptions),
        customTradedAwayMessage: getOption('customTradedAwayMessage', '', String, rawOptions),
        customClearingFriendsMessage: getOption('customClearingFriendsMessage', '', String, rawOptions)
    };
}
