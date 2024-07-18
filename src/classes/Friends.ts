import { EFriendRelationship } from 'steam-user';
import SteamID from 'steamid';
import Bot from './Bot';
import { SteamRequestParams } from '../types/common';
import { apiRequest } from '../lib/apiRequest';

export default class Friends {
    maxFriends: number | undefined;

    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    getFriend(steamID: SteamID | string): Friend | null {
        const steamID64 = steamID.toString();
        const friend = this.bot.client.users[steamID64] as Friend;
        if (friend === undefined) {
            return null;
        }

        return friend;
    }

    isFriend(steamID: SteamID | string): boolean {
        const steamID64 = steamID.toString();
        const relation = this.bot.client.myFriends[steamID64] as number;
        return relation === EFriendRelationship.Friend;
    }

    get getFriends(): string[] {
        const friends: string[] = [];
        for (const steamID64 in this.bot.client.myFriends) {
            if (!Object.prototype.hasOwnProperty.call(this.bot.client.myFriends, steamID64)) {
                continue;
            }

            if (this.isFriend(steamID64)) {
                friends.push(steamID64);
            }
        }
        return friends;
    }

    get getMaxFriends(): Promise<number> {
        return new Promise((resolve, reject) => {
            const params: SteamRequestParams = {
                steamid: (this.bot.client.steamID === null
                    ? this.bot.handler.getBotInfo.steamID
                    : this.bot.client.steamID
                ).getSteamID64()
            };

            if (this.bot.manager.apiKey) params.key = this.bot.manager.apiKey;
            else params.access_token = this.bot.manager.accessToken;

            apiRequest<GetBadges>({
                method: 'GET',
                url: 'https://api.steampowered.com/IPlayerService/GetBadges/v1/',
                params
            })
                .then(body => {
                    const result = body.response;
                    const level = result.player_level;
                    const base = 250;
                    const multiplier = 5;
                    this.maxFriends = base + level * multiplier;
                    resolve(this.maxFriends);
                })
                .catch(err => reject(err));
        });
    }
}

interface Friend {
    rich_presence: any[];
    player_name: string;
    avatar_hash: Buffer;
    last_logoff: Date;
    last_logon: Date;
    last_seen_online: Date;
    avatar_url_icon: string;
    avatar_url_medium: string;
    avatar_url_full: string;
}

interface GetBadges {
    response: ResponseGetBadges;
}

interface ResponseGetBadges {
    badges: BadgesGetBadges[];
    player_xp: number;
    player_level: number;
    player_xp_needed_to_level_up: number;
    player_xp_needed_current_level: number;
}

interface BadgesGetBadges {
    badgeid: number;
    level: number;
    completion_time: number;
    xp: number;
    scarcity: number;
}
