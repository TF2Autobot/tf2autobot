import { quickLinks, sendWebhook } from './utils';
import { Webhook } from './interfaces';

import log from '../logger';

import Bot from '../../classes/Bot';

export default function sendPartnerMessage(
    steamID: string,
    msg: string,
    their: Their,
    links: Links,
    time: string,
    bot: Bot
): void {
    const opt = bot.options.discordWebhook;
    const botInfo = bot.handler.getBotInfo();

    const discordPartnerMsg: Webhook = {
        username: opt.displayName ? opt.displayName : botInfo.name,
        avatar_url: opt.avatarURL ? opt.avatarURL : botInfo.avatarURL,
        content: `<@!${opt.ownerID}>, new message! - ${steamID}`,
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
                color: opt.embedColor
            }
        ]
    };

    sendWebhook(opt.messages.url, discordPartnerMsg, 'partner-message')
        .then(() => {
            log.debug(`✅ Sent partner-message webhook (from ${their.player_name}) to Discord.`);
        })
        .catch(err => {
            log.debug(`❌ Failed to send partner-message webhook (from ${their.player_name}) to Discord: `, err);
        });
}

interface Links {
    steam: string;
    bptf: string;
    steamrep: string;
}

interface Their {
    player_name: string;
    avatar_url_full: string;
}
