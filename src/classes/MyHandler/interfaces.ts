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
    'all features': AllFeatures;
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

interface AllFeatures {
    end: number;
    reason: string;
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

export interface Blocked {
    [steamid: string]: string;
}
