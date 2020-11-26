import { quickLinks, sendWebhook } from './utils';
import { Webhook } from './interfaces';

import log from '../logger';

import Bot from '../../classes/Bot';
import MyHandler from '../../classes/MyHandler/MyHandler';

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
    const discordPartnerMsg: Webhook = {
        username: bot.options.discordWebhook.displayName ? bot.options.discordWebhook.displayName : botInfo.name,
        avatar_url: bot.options.discordWebhook.avatarURL ? bot.options.discordWebhook.avatarURL : botInfo.avatarURL,
        content: `<@!${bot.options.discordWebhook.ownerID}>, new message! - ${steamID}`,
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
                color: bot.options.discordWebhook.embedColor
            }
        ]
    };
    /*eslint-enable */

    sendWebhook(bot.options.discordWebhook.messages.url, discordPartnerMsg, 'partner-message')
        .then(() => {
            log.debug(`✅ Successfully sent partner-message webhook to Discord!`);
        })
        .catch(err => {
            log.debug(`❌ Failed to send partner-message webhook to Discord: `, err);
        });
}
