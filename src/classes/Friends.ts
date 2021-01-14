/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { EFriendRelationship } from 'steam-user';
import SteamID from 'steamid';
import { OptionsWithUri } from 'request';
import request from 'request-retry-dayjs';
import { UnknownDictionary } from '../types/common';

import Bot from './Bot';

export default class Friends {
    private readonly bot: Bot;

    maxFriends: number | undefined;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    getFriend(
        steamID: SteamID | string
    ): {
        rich_presence: any[];
        player_name: string;
        avatar_hash: Buffer;
        last_logoff: Date;
        last_logon: Date;
        last_seen_online: Date;
        avatar_url_icon: string;
        avatar_url_medium: string;
        avatar_url_full: string;
    } | null {
        const steamID64 = steamID.toString();

        const friend = this.bot.client.users[steamID64];

        if (friend === undefined) {
            return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return friend;
    }

    isFriend(steamID: SteamID | string): boolean {
        const steamID64 = steamID.toString();

        const relation = this.bot.client.myFriends[steamID64];

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
        const options: OptionsWithUri = {
            uri: 'https://api.steampowered.com/IPlayerService/GetBadges/v1/',
            method: 'GET',
            json: true,
            gzip: true,
            qs: {
                key: this.bot.manager.apiKey,
                steamid: (this.bot.client.steamID === null
                    ? this.bot.handler.getBotInfo.steamID
                    : this.bot.client.steamID
                ).getSteamID64()
            }
        };

        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            void request(options, (err: Error | null, response, body: UnknownDictionary<any>) => {
                if (err) {
                    return reject(err);
                }

                const result = body.response;
                const level = result.player_level;

                const base = 250;
                const multiplier = 5;

                this.maxFriends = base + level * multiplier;

                resolve(this.maxFriends);
            });
        });
    }
}
