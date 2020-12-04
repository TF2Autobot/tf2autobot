interface Overstocked {
    reason: '🟦_OVERSTOCKED';
    sku: string;
    buying: boolean;
    diff: number;
    amountCanTrade: number;
}

interface Understocked {
    reason: '🟩_UNDERSTOCKED';
    sku: string;
    selling: boolean;
    diff: number;
    amountCanTrade: number;
}

interface InvalidItems {
    reason: '🟨_INVALID_ITEMS';
    sku: string;
    buying: boolean;
    amount: number;
    price: string;
}

interface InvalidValue {
    reason: '🟥_INVALID_VALUE';
    our: number;
    their: number;
}

interface DupeCheckFailed {
    reason: '🟪_DUPE_CHECK_FAILED';
    withError: boolean;
    assetid: string | string[];
    sku: string | string[];
    error?: string;
}

interface DupedItems {
    reason: '🟫_DUPED_ITEMS';
    assetid: string;
    sku: string;
}

interface EscrowCheckFailed {
    reason: '⬜_ESCROW_CHECK_FAILED';
    error?: string;
}

interface BannedCheckFailed {
    reason: '⬜_BANNED_CHECK_FAILED';
    error?: string;
}

export type WrongAboutOffer =
    | Overstocked
    | Understocked
    | InvalidItems
    | InvalidValue
    | DupeCheckFailed
    | DupedItems
    | EscrowCheckFailed
    | BannedCheckFailed;

interface HighValue {
    has: boolean;
    skus: string[];
    names: string[];
    isMention: boolean;
}

export interface HighValueInput {
    our: HighValue;
    their: HighValue;
}

interface HighValueBoolean {
    our: boolean;
    their: boolean;
}

interface HighValueItems {
    skus: string[];
    names: string[];
}

interface HighValueItemsWhich {
    our: HighValueItems;
    their: HighValueItems;
}

export interface HighValueOutput {
    has: HighValueBoolean;
    items: HighValueItemsWhich;
    isMention: HighValueBoolean;
}

export interface ItemsDict {
    our: { [sku: string]: ItemsDictContent };
    their: { [sku: string]: ItemsDictContent };
}

export interface ItemsDictContent {
    amount?: number;
    stock?: number;
    maxStock?: number;
}

export interface BPTFGetUserInfo {
    message?: string;
    users?: { [steamID: string]: UserSteamID };
}

export interface UserSteamID {
    name: string;
    avatar: string;
    last_online: number;
    admin?: number;
    donated?: number;
    premium?: number;
    premium_months_gifted?: number;
    integrations?: Integrations;
    bans?: Bans;
    voting?: Votings;
    inventory?: { [appid: string]: InventoryAppID };
    trust?: BPTFTrust;
}

interface Integrations {
    group_member?: number;
    marketplace_seller?: number;
    automatic?: number;
    steamrep_admin?: number;
}

interface Bans {
    steamrep_scammer?: number;
    all?: AllBans;
}

interface Votings {
    reputation?: number;
    votes?: Votes;
    suggestions?: Suggestions;
}

interface Votes {
    positive?: number;
    negative?: number;
    accepted?: number;
}

interface Suggestions {
    created?: number;
    accepted?: number;
    accepted_unusual?: number;
}

interface AllBans {
    end?: number;
    reason?: string;
}

interface InventoryAppID {
    ranking?: number;
    value?: number;
    updated?: number;
    metal?: number;
    keys?: number;
    slots?: Slots;
}

interface Slots {
    used?: number;
    total?: number;
}

interface BPTFTrust {
    positive?: number;
    negative?: number;
}
