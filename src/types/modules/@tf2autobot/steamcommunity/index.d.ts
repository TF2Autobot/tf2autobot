declare module '@tf2autobot/steamcommunity' {
    import { EventEmitter } from 'events';
    import SteamID from 'steamid';
    import { CookieJar } from 'request';
    import { EFriendRelationship } from 'steam-user';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Events {
        sessionExpired: () => void;
        confKeyNeeded: (tag: string, callback: (err?: Error, time?: number, confKey?: string) => void) => void;
    }

    interface Options {
        request?: any; // An instance of request
        timeout?: number;
        userAgent?: string;
        localAddress?: string;
    }

    class SteamCommunity extends EventEmitter {
        constructor(options?: Options);

        steamID: SteamID | null;

        _jar: CookieJar;

        loggedIn(callback: (err: any, loggedIn?: boolean, familyView?: boolean) => void): void;

        getSessionID(): string;

        getWebApiKey(callback: (err?: Error, key?: string) => void);

        createWebApiKey(
            options: { domain: string; identitySecret?: string; requestID?: string },
            callback: (
                err?: Error,
                result?: { confirmationRequired: boolean; apiKey: string; finalizeOptions: Record<string, any> }
            ) => void
        );

        setCookies(cookies: string[]): void;

        editProfile(
            settings: {
                name?: string;
                realName?: string;
                summary?: string;
                country?: string;
                state?: string;
                city?: string;
                customURL?: string;
                featuredBadge?: number;
                primaryGroup?: SteamID | string;
            },
            callback?: (err?: Error) => void
        ): void;

        profileSettings(
            settings: {
                profile?: number;
                comments?: number;
                inventory?: number;
                inventoryGifts?: boolean;
                gameDetails?: number;
                playTime?: boolean;
                friendsList?: number;
            },
            callback?: (err?: Error) => void
        ): void;

        uploadAvatar(
            image: Buffer | string /* , format?: string */,
            callback?: (err?: Error, url?: string) => void
        ): void;

        resetItemNotifications(callback?: (err?: Error) => void): void;

        inviteUserToGroup(userID: SteamID | string, groupID: SteamID | string, callback?: (err?: Error) => void): void;

        getSteamGroup(id: SteamID | string, callback: (err?: Error, group?: SteamCommunity.Group) => void): void;

        getTradeURL(callback: (err?: Error, url?: string, token?: string) => void): void;

        getSteamUser(id: SteamID | string, callback: (err?: Error, user?: SteamCommunity.User) => void): void;

        acceptConfirmationForObject(identitySecret: string, objectID: string, callback: (err?: Error) => void): void;

        getFriendsList(callback: (err?: Error, friendlist?: SteamCommunity.FriendList) => void): void;
    }

    namespace SteamCommunity {
        interface Group {
            steamID: SteamID;
            name: string;
            url: string;
            headline: string;
            summary: string;
            avatarHash: Buffer;
            members: number;
            membersInChat: number;
            membersInGame: number;
            membersOnline: number;

            join: (callback?: (err?: Error) => void) => void;
        }
        interface User {
            steamID: SteamID;
            name: string;
            onlineState: string;
            stateMessage: string;
            privacyState: string;
            visibilityState: string;
            avatarHash: string;
            vacBanned: string;
            tradeBanState: string;
            isLimitedAccount: string;
            customURL: string;
            groups: null;
            primaryGroup: null;
            getAvatarURL: (size: string) => void;
        }
        interface FriendList {
            [steamID64: string]: EFriendRelationship;
        }
    }

    export = SteamCommunity;
}

declare module '@tf2autobot/steamcommunity/classes/CEconItem' {
    import { EconItem } from '@tf2autobot/tradeoffer-manager';
    import { UnknownDictionaryKnownValues } from 'src/types/common';
    export default class CEconItem extends EconItem {
        constructor(asset: UnknownDictionaryKnownValues, description: UnknownDictionaryKnownValues, contextID: string);
    }
}
