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
