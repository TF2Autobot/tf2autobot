import SteamID from 'steamid';

import Bot from './Bot';

import log from '../lib/logger';

export = class Groups {
    private readonly bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    inviteToGroups(steamID: SteamID | string, groups: string[]): void {
        if (!this.bot.friends.isFriend(steamID)) {
            return;
        }

        log.debug('Inviting user to groups...');

        groups.forEach(groupID64 => {
            this.bot.community.inviteUserToGroup(steamID, groupID64, err => {
                if (err && err.message !== 'HTTP error 400') {
                    log.warn(`Failed to invite ${steamID.toString()} to group ${groupID64}: `, err);
                }
            });
        });
    }
};
