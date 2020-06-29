declare module 'steam-user' {
    import { EventEmitter } from 'events';
    import SteamID from 'steamid';

    interface UnknownDictionary<T> {
        [key: string]: T;
    }

    interface Events {
        loggedOn: () => void;
        webSession: (sessionID: string, cookies: string) => void;
        accountLimitations: (
            limited: boolean,
            communityBanned: boolean,
            locked: boolean,
            canInviteFriends: boolean
        ) => void;
        friendMessage: (senderID: SteamID, message: string) => void;
        friendRelationship: (steamID: SteamID, relationship: number) => void;
        groupRelationship: (groupID: SteamID, relationship: number) => void;
        steamGuard: (domain: string, callback: (authCode: string) => void, lastCodeWrong: boolean) => void;
        loginKey: (loginKey: string) => void;
        error: (err: Error) => void;
    }

    class SteamUser extends EventEmitter {
        static EResult: any;

        static EPersonaState: any;

        static EClanRelationship: any;

        static EFriendRelationship: any;

        steamID: SteamID | null;

        limitations: {
            limited: boolean;
            communityBanned: boolean;
            locked: boolean;
            canInviteFriends: boolean;
        } | null;

        users: UnknownDictionary<{
            rich_precense: any[];
            player_name: string;
            avater_hash: Buffer;
            last_logoff: Date;
            last_logon: Date;
            last_seen_online: Date;
            avatar_url_icon: string;
            avatar_url_medium: string;
            avatar_url_full: string;
        }> | null;

        myGroups: UnknownDictionary<number> | null;

        myFriends: UnknownDictionary<number> | null;

        autoRelogin: boolean;

        _playingAppIds: number[];

        logOn(details: {
            accountName: string;
            password?: string;
            loginKey?: string;
            twoFactorCode?: string;
            rememberPassword?: boolean;
        }): void;

        webLogOn(): void;

        setPersona(state: number, name?: string): void;

        gamesPlayed(apps: any[] | object | string | number, force?: boolean): void;

        chatMessage(recipient: SteamID | string, message: string): void;

        addFriend(steamID: SteamID | string, callback?: (err: Error | null, personaName?: string) => void): void;

        removeFriend(steamID: SteamID | string): void;

        blockUser(steamID: SteamID | string, callback?: (err: Error | null) => void): void;

        unblockUser(steamID: SteamID | string, callback?: (err: Error | null) => void): void;

        respondToGroupInvite(groupSteamID: SteamID | string, accept: boolean): void;

        logOff(): void;
    }

    export = SteamUser;
}
