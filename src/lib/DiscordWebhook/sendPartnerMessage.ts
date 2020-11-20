import { XMLHttpRequest } from 'xmlhttprequest-ts';

import { quickLinks } from './utils';

import Bot from '../../classes/Bot';
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
        username: bot.options.discordWebhookUserName ? bot.options.discordWebhookUserName : botInfo.name,
        avatar_url: bot.options.discordWebhookAvatarURL
            ? bot.options.discordWebhookAvatarURL
            : botInfo.avatarURL,
        content: `<@!${bot.options.discordOwnerID}>, new message! - ${steamID}`,
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
                color: bot.options.discordWebhookEmdedColorInDecimalIndex
            }
        ]
    });
    /*eslint-enable */

    const request = new XMLHttpRequest();
    request.open('POST', bot.options.discordWebhookMessageFromPartnerURL);
    request.setRequestHeader('Content-type', 'application/json');
    request.send(discordPartnerMsg);
}
