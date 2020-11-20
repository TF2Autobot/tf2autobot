import { snakeCase } from 'change-case';

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

        autobump: getOption('autobump', false, Boolean, rawOptions),

        minimumScrap: getOption('minimumScrap', 9, parseInt, rawOptions),
        minimumReclaimed: getOption('minimumReclaimed', 9, parseInt, rawOptions),
        metalThreshold: getOption('metalThreshold', 9, parseInt, rawOptions),
        disableCraftingMetal: getOption('disableCraftingMetal', false, Boolean, rawOptions),
        disableCraftingWeapons: getOption('disableCraftingWeapons', false, Boolean, rawOptions),
        enableShowOnlyMetal: getOption('enableShowOnlyMetal', true, Boolean, rawOptions),

        enableAutoKeys: getOption('enableAutoKeys', false, Boolean, rawOptions),
        enableAutoKeysBanking: getOption('enableAutoKeysBanking', false, Boolean, rawOptions),
        minimumKeys: getOption('minimumKeys', 3, parseInt, rawOptions),
        maximumKeys: getOption('maximumKeys', 15, parseInt, rawOptions),
        minimumRefinedToStartSellKeys: getOption('minimumRefinedToStartSellKeys', 30, parseInt, rawOptions),
        maximumRefinedToStopSellKeys: getOption('maximumRefinedToStopSellKeys', 150, parseInt, rawOptions),
        disableScrapAdjustment: getOption('disableScrapAdjustment', true, Boolean, rawOptions),
        scrapAdjustmentValue: getOption('scrapAdjustmentValue', 1, parseInt, rawOptions),
        autoKeysAcceptUnderstocked: getOption('autoKeysAcceptUnderstocked', false, Boolean, rawOptions),

        disableInventorySort: getOption('disableInventorySort', false, Boolean, rawOptions),
        disableListings: getOption('disableListings', false, Boolean, rawOptions),
        disableMessages: getOption('disableMessages', false, Boolean, rawOptions),
        disableSomethingWrongAlert: getOption('disableSomethingWrongAlert', false, Boolean, rawOptions),
        disableCraftWeaponAsCurrency: getOption('disableCraftWeaponAsCurrency', false, Boolean, rawOptions),
        disableGivePriceToInvalidItems: getOption('disableGivePriceToInvalidItems', false, Boolean, rawOptions),
        disableAddFriends: getOption('disableAddFriends', false, Boolean, rawOptions),
        disableGroupsInvite: getOption('disableGroupsInvite', false, Boolean, rawOptions),
        disableCheckUsesDuelingMiniGame: getOption('disableCheckUsesDuelingMiniGame', false, Boolean, rawOptions),
        disableCheckUsesNoiseMaker: getOption('disableCheckUsesNoiseMaker', false, Boolean, rawOptions),
        disableOwnerCommand: getOption('disableOwnerCommand', false, Boolean, rawOptions),
        disableAutoRemoveIntentSell: getOption('disableAutoRemoveIntentSell', false, Boolean, rawOptions),

        disableHighValueHold: getOption('disableAutoRemoveIntentSell', false, Boolean, rawOptions),
        highValueSheens: getOption('highValueSheens', ['Team Shine'], JSON.parse, rawOptions),
        highValueKillstreakers: getOption('highValueKillstreakers', ['Fire Horns', 'Tornado'], JSON.parse, rawOptions),

        normalizeFestivizedItems: getOption('normalizeFestivizedItems', false, Boolean, rawOptions),
        normalizeStrangeUnusual: getOption('normalizeStrangeUnusual', false, Boolean, rawOptions),

        tradesMadeStarterValue: getOption('tradesMadeStarterValue', 0, parseInt, rawOptions),
        lastTotalTrades: getOption('lastTotalTrades', 0, parseInt, rawOptions),
        tradingStartingTimeUnix: getOption('tradingStartingTimeUnix', 0, parseInt, rawOptions),

        enableDupeCheck: getOption('enableDupeCheck', true, Boolean, rawOptions),
        declineDupes: getOption('declineDupes', false, Boolean, rawOptions),
        minimumKeysDupeCheck: getOption('minimumKeysDupeCheck', 10, parseInt, rawOptions),

        skipBPTPTradeOfferURL: getOption('skipBPTPTradeOfferURL', true, Boolean, rawOptions),
        skipAccountLimitations: getOption('skipAccountLimitations', true, Boolean, rawOptions),
        skipUpdateProfileSettings: getOption('skipUpdateProfileSettings', true, Boolean, rawOptions),

        timezone: getOption('timezone', '', String, rawOptions),
        customTimeFormat: getOption('customTimeFormat', '', String, rawOptions),
        timeAdditionalNotes: getOption('timeAdditionalNotes', '', String, rawOptions),

        allowEscrow: getOption('allowEscrow', false, Boolean, rawOptions),
        allowOverpay: getOption('allowOverpay', true, Boolean, rawOptions),
        allowGiftWithoutNote: getOption('allowGiftWithoutNote', false, Boolean, rawOptions),
        allowBanned: getOption('allowBanned', false, Boolean, rawOptions),

        maxPriceAge: getOption('maxPriceAge', 28800, parseInt, rawOptions),

        debug: getOption('debug', true, Boolean, rawOptions),
        debugFile: getOption('debugFile', true, Boolean, rawOptions),

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
            Boolean,
            rawOptions
        ),
        discordWebhookSomethingWrongAlertURL: getOption('discordWebhookSomethingWrongAlertURL', '', String, rawOptions),

        disableDiscordWebhookPriceUpdate: getOption('disableDiscordWebhookPriceUpdate', false, Boolean, rawOptions),
        discordWebhookPriceUpdateURL: getOption('discordWebhookPriceUpdateURL', '', String, rawOptions),
        discordWebHookPriceUpdateAdditionalDescriptionNote: getOption(
            'discordWebHookPriceUpdateAdditionalDescriptionNote',
            '',
            String,
            rawOptions
        ),

        disableDiscordWebhookTradeSummary: getOption('disableDiscordWebhookTradeSummary', false, Boolean, rawOptions),
        discordWebhookTradeSummaryURL: getOption('discordWebhookTradeSummaryURL', [''], JSON.parse, rawOptions),
        discordWebhookTradeSummaryShowQuickLinks: getOption(
            'discordWebhookTradeSummaryShowQuickLinks',
            true,
            Boolean,
            rawOptions
        ),
        discordWebhookTradeSummaryShowKeyRate: getOption(
            'discordWebhookTradeSummaryShowKeyRate',
            true,
            Boolean,
            rawOptions
        ),
        discordWebhookTradeSummaryShowPureStock: getOption(
            'discordWebhookTradeSummaryShowPureStock',
            true,
            Boolean,
            rawOptions
        ),
        discordWebhookTradeSummaryShowInventory: getOption(
            'discordWebhookTradeSummaryShowInventory',
            true,
            Boolean,
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
            Boolean,
            rawOptions
        ),
        discordWebhookTradeSummaryMentionOwnerOnlyItemsSKU: getOption(
            'discordWebhookTradeSummaryMentionOwnerOnlyItemsSKU',
            [';'],
            JSON.parse,
            rawOptions
        ),

        disableDiscordWebHookOfferReview: getOption('disableDiscordWebHookOfferReview', false, Boolean, rawOptions),
        discordWebHookReviewOfferURL: getOption('discordWebhookReviewOfferURL', '', String, rawOptions),
        discordWebhookReviewOfferDisableMentionInvalidValue: getOption(
            'discordWebhookReviewOfferDisableMentionInvalidValue',
            false,
            Boolean,
            rawOptions
        ),
        discordWebhookReviewOfferShowQuickLinks: getOption(
            'discordWebhookReviewOfferShowQuickLinks',
            true,
            Boolean,
            rawOptions
        ),
        discordWebhookReviewOfferShowKeyRate: getOption(
            'discordWebhookReviewOfferShowKeyRate',
            true,
            Boolean,
            rawOptions
        ),
        discordWebhookReviewOfferShowPureStock: getOption(
            'discordWebhookReviewOfferShowPureStock',
            true,
            Boolean,
            rawOptions
        ),

        disableDiscordWebhookMessageFromPartner: getOption(
            'disableDiscordWebhookMessageFromPartner',
            false,
            Boolean,
            rawOptions
        ),
        discordWebhookMessageFromPartnerURL: getOption('discordWebhookMessageFromPartnerURL', '', String, rawOptions),
        discordWebhookMessageFromPartnerShowQuickLinks: getOption(
            'discordWebhookMessageFromPartnerShowQuickLinks',
            true,
            Boolean,
            rawOptions
        ),

        enableManualReview: getOption('enableManualReview', true, Boolean, rawOptions),
        disableShowReviewOfferSummary: getOption('disableShowReviewOfferSummary', false, Boolean, rawOptions),
        disableReviewOfferNote: getOption('disableReviewOfferNote', false, Boolean, rawOptions),
        disableShowCurrentTime: getOption('disableShowCurrentTime', false, Boolean, rawOptions),

        disableAcceptInvalidItemsOverpay: getOption('disableAcceptInvalidItemsOverpay', true, Boolean, rawOptions),
        disableAcceptOverstockedOverpay: getOption('disableAcceptOverstockedOverpay', true, Boolean, rawOptions),
        disableAcceptUnderstockedOverpay: getOption('disableAcceptUnderstockedOverpay', false, Boolean, rawOptions),

        disableAutoDeclineOverstocked: getOption('disableAutoDeclineOverstocked', true, Boolean, rawOptions),
        disableAutoDeclineUnderstocked: getOption('disableAutoDeclineUnderstocked', true, Boolean, rawOptions),
        disableAutoDeclineInvalidValue: getOption('disableAutoDeclineInvalidValue', false, Boolean, rawOptions),
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

        enableOnlyPlayTF2: getOption('enableOnlyPlayTF2', false, Boolean, rawOptions),
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
