import { EFriendRelationship } from 'steam-user';
import SteamID from 'steamid';
import axios, { AxiosError } from 'axios';
import Bot from './Bot';
import filterAxiosError from '@tf2autobot/filter-axios-error';

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
            const params: {
                steamid: string;
                key?: string;
                access_token?: string;
            } = {
                steamid: (this.bot.client.steamID === null
                    ? this.bot.handler.getBotInfo.steamID
                    : this.bot.client.steamID
                ).getSteamID64()
            };

            if (this.bot.manager.apiKey) {
                params.key = this.bot.manager.apiKey;
            } else {
                params.access_token = this.bot.manager.accessToken;
            }
            void axios({
                url: 'https://api.steampowered.com/IPlayerService/GetBadges/v1/',
                method: 'GET',
                params
            })
                .then(response => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    const result = response.data.response;
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    const level = result.player_level;

                    const base = 250;
                    const multiplier = 5;

                    this.maxFriends = base + level * multiplier;

                    resolve(this.maxFriends);
                })
                .catch((err: AxiosError) => {
                    if (err) {
                        return reject(filterAxiosError(err));
                    }
                });
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
