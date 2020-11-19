import Bot from '../../classes/Bot';

import { XMLHttpRequest } from 'xmlhttprequest-ts';
import { quickLinks } from './utils';
import MyHandler from '../../classes/MyHandler';

export default function sendPartnerMessage(
    steamID: string,
    msg: string,
    their: { player_name: string; avatar_url_full: string },
    links: { steam: string; bptf: string; steamrep: string },
    time: string,
    bot: Bot
): void {
    const botInfo = (bot.handler as MyHandler).getBotInfo();

    /*eslint-disable */
    const discordPartnerMsg = JSON.stringify({
        username: process.env.DISCORD_WEBHOOK_USERNAME ? process.env.DISCORD_WEBHOOK_USERNAME : botInfo.name,
        avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL
            ? process.env.DISCORD_WEBHOOK_AVATAR_URL
            : botInfo.avatarURL,
        content: `<@!${process.env.DISCORD_OWNER_ID}>, new message! - ${steamID}`,
        embeds: [
            {
                author: {
                    name: their.player_name,
                    url: links.steam,
                    icon_url: their.avatar_url_full
                },
                footer: {
                    text: `Partner SteamID: ${steamID} • ${time}`
                },
                title: '',
                description: `💬 ${msg}\n\n${quickLinks(their.player_name, links)}`,
                color: process.env.DISCORD_WEBHOOK_EMBED_COLOR_IN_DECIMAL_INDEX
            }
        ]
    });
    /*eslint-enable */

    const request = new XMLHttpRequest();
    request.open('POST', process.env.DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_URL);
    request.setRequestHeader('Content-type', 'application/json');
    request.send(discordPartnerMsg);
}
