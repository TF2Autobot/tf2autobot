export interface OnlyEnable {
    enable?: boolean;
}

// ------------ SortType ------------

export interface SortInventory extends OnlyEnable {
    type?: number;
}

// ------------ SendAlert ------------

export interface SendAlert extends OnlyEnable {
    autokeys?: AutokeysAlert;
    backpackFull?: boolean;
    highValue?: HighValueAlert;
}

export interface AutokeysAlert {
    lowPure?: boolean;
}

export interface HighValueAlert {
    gotDisabled?: boolean;
    notInPricelist?: boolean;
    tryingToTake?: boolean;
}

// ------------ Bypass ------------

export interface Bypass {
    escrow?: OnlyAllow;
    overpay?: OnlyAllow;
    giftWithoutMessage?: OnlyAllow;
    bannedPeople?: OnlyAllow;
}

export interface OnlyAllow {
    allow?: boolean;
}

// ------------ PriceAge ------------

export interface PriceAge {
    maxInSeconds?: number;
}

// ------------ WeaponsAsCurrency ------------

export interface WeaponsAsCurrency extends OnlyEnable {
    withUncraft?: boolean;
}

// ------------ TradeSummary ------------

export interface TradeSummary {
    showStockChanges?: boolean;
    showTimeTakenInMS?: boolean;
    showItemPrices?: boolean;
}

// ------------ HighValue ------------

export interface HighValue {
    enableHold?: boolean;
    sheens?: string[];
    killstreakers?: string[];
    strangeParts?: string[];
    painted?: string[];
}

// ------------ CheckUses ------------

export interface CheckUses {
    duel?: boolean;
    noiseMaker?: boolean;
}

// ------------ Game ------------

export interface Game {
    playOnlyTF2?: boolean;
    customName?: string;
}

// ------------ Normalize ------------

export interface Normalize {
    festivized?: boolean;
    strangeUnusual?: boolean;
}

// ------------ Details ------------

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

// ------------ Statistics ------------

export interface Statistics {
    starter?: number;
    lastTotalTrades?: number;
    startingTimeInUnix?: number;
    lastTotalProfitMadeInRef?: number;
    lastTotalProfitOverpayInRef?: number;
}

// ------------ Autokeys ------------

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

// ------------ Crafting ------------

export interface Crafting {
    weapons?: OnlyEnable;
    metals?: Metals;
}

export interface Metals extends OnlyEnable {
    minScrap?: number;
    minRec?: number;
    threshold?: number;
}

// ------------ Offer Received ------------

export interface OfferReceived {
    invalidValue?: InvalidValue;
    invalidItems?: InvalidItems;
    overstocked?: AutoAcceptOverpayAndAutoDecline;
    understocked?: AutoAcceptOverpayAndAutoDecline;
    duped?: Duped;
}

export interface InvalidValue {
    autoDecline: OnlyEnable & OnlyNote;
    exceptionValue: ExceptionValue;
}

export interface ExceptionValue {
    skus: string[];
    valueInRef: number;
}

export type AutoDecline = OnlyEnable & OnlyNote;

export interface AutoAcceptOverpayAndAutoDecline {
    autoAcceptOverpay?: boolean;
    autoDecline?: AutoDecline;
}

export interface InvalidItems extends AutoAcceptOverpayAndAutoDecline {
    givePrice?: boolean;
}

export interface Duped extends OnlyEnable, AutoDecline {
    minKeys?: number;
}

// ------------ Manual Review ------------

export interface ManualReview extends OnlyEnable {
    showOfferSummary?: boolean;
    showReviewOfferNote?: boolean;
    showOwnerCurrentTime?: boolean;
    showItemPrices?: boolean;
    invalidValue?: OnlyNote;
    invalidItems?: OnlyNote;
    overstocked?: OnlyNote;
    understocked?: OnlyNote;
    duped?: OnlyNote;
    dupedCheckFailed?: OnlyNote;
    escrowCheckFailed?: OnlyNote;
    additionalNotes?: string;
}

// ------------ Discord Webhook ------------

export interface DiscordWebhook {
    ownerID?: string;
    displayName?: string;
    avatarURL?: string;
    embedColor?: string;
    tradeSummary?: TradeSummaryDW;
    offerReview?: OfferReviewDW;
    messages?: MessagesDW;
    priceUpdate?: PriceUpdateDW;
    sendAlert?: SendAlertDW;
}

export interface TradeSummaryDW extends OnlyEnable {
    url?: string[];
    misc?: MiscTradeSummary;
    mentionOwner?: MentionOwner;
}

export interface OnlyNote {
    note?: string;
}

export interface MiscTradeSummary extends OnlyNote {
    showQuickLinks?: boolean;
    showKeyRate?: boolean;
    showPureStock?: boolean;
    showInventory?: boolean;
}

export interface MentionOwner extends OnlyEnable {
    itemSkus?: string[];
}

export interface OfferReviewDW extends OnlyEnable {
    url?: string;
    mentionInvalidValue?: boolean;
    misc?: MiscOfferReview;
}

export interface MiscOfferReview {
    showQuickLinks?: boolean;
    showKeyRate?: boolean;
    showPureStock?: boolean;
    showInventory?: boolean;
}

export interface MessagesDW extends OnlyEnable {
    url?: string;
    showQuickLinks?: boolean;
}

export interface PriceUpdateDW extends OnlyEnable, OnlyNote {
    url?: string;
}

export interface SendAlertDW extends OnlyEnable {
    url?: string;
}

// ------------ Custom Message ------------

export interface CustomMessage {
    sendOffer?: string;
    welcome?: string;
    iDontKnowWhatYouMean?: string;
    success?: string;
    decline?: string;
    tradedAway?: string;
    clearFriends?: string;
}

// ------------ Commands ------------

export interface OnlyCustomReplyWithDisabled {
    disable?: string;
    reply?: string;
}

export interface OnlyEnableAndDisableForSKU extends OnlyEnable {
    disableForSKU?: string[];
}

export interface Commands extends OnlyEnable {
    how2trade?: How2Trade;
    price?: Price;
    buy?: OnlyEnableAndDisableForSKU;
    sell?: OnlyEnableAndDisableForSKU;
    buycart?: OnlyEnableAndDisableForSKU;
    sellcart?: OnlyEnableAndDisableForSKU;
    cart?: Cart;
    clearcart?: ClearCart;
    checkout?: Checkout;
    cancel?: Cancel;
    queue?: Queue;
    owner?: Owner;
    discord?: Discord;
    more?: OnlyEnable;
    autokeys?: OnlyEnable;
    message?: Message;
    time?: Time;
    uptime?: Uptime;
    pure?: Pure;
    rate?: Rate;
    stock?: Stock;
    craftweapon?: Weapons;
    uncraftweapon?: Weapons;
}

export interface How2Trade extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Price extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Cart extends OnlyEnable {
    customReply?: CartCustom;
}

export interface CartCustom {
    tile?: string;
}

export interface ClearCart extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Checkout {
    customReply?: CheckoutCustom;
}

export interface CheckoutCustom {
    empty?: string;
}

export interface Cancel {
    customReply?: CancelCustom;
}

export interface CancelCustom {
    isBeingSent?: string;
    isCancelling?: string;
    isInQueue?: string;
    noActiveOffer?: string;
    successCancel?: string;
}

export interface Queue {
    customReply?: QueueCustom;
}

export interface QueueCustom {
    noInQueue?: string;
    offerBeingMade?: string;
    hasPosition?: string;
}

export interface Owner extends OnlyEnable {
    customReply?: OwnerOrDiscordCustom;
}

export interface OwnerOrDiscordCustom {
    disabled?: string;
    send?: string;
}

export interface Discord extends OnlyEnable {
    customReply?: OwnerOrDiscordCustom;
    inviteURL?: string;
}

export interface Message extends OnlyEnable {
    customReply?: MessageCustom;
}

export interface MessageCustom {
    disabled?: string;
    wrongSyntax?: string;
    fromOwner?: string;
    success?: string;
}

export interface Time extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Uptime extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Pure extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Rate extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
}

export interface Stock extends OnlyEnable {
    customReply?: OnlyCustomReplyWithDisabled;
    maximumItems?: number;
}

export interface Weapons extends OnlyEnable {
    customReply?: HaveOrNo;
}

export interface HaveOrNo {
    disabled?: string;
    dontHave?: string;
    have?: string;
}

// ------------ JsonOptions ------------

export interface JsonOptions {
    showOnlyMetal?: boolean;
    sortInventory?: SortInventory;
    createListings?: OnlyEnable;
    sendAlert?: SendAlert;
    AddFriends?: OnlyEnable;
    sendGroupInvite?: OnlyEnable;
    autoRemoveIntentSell?: OnlyEnable;
    bypass?: Bypass;
    priceAge?: PriceAge;
    autobump?: OnlyEnable;
    skipItemsInTrade?: OnlyEnable;
    weaponsAsCurrency?: WeaponsAsCurrency;
    tradeSummary?: TradeSummary;
    highValue?: HighValue;
    checkUses?: CheckUses;
    game?: Game;
    normalize?: Normalize;
    details?: Details;
    statistics?: Statistics;
    autokeys?: Autokeys;
    crafting?: Crafting;
    offerReceived?: OfferReceived;
    manualReview?: ManualReview;
    discordWebhook?: DiscordWebhook;
    customMessage?: CustomMessage;
    commands?: Commands;
}
