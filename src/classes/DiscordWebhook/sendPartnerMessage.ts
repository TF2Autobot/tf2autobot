import { quickLinks, sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../../lib/logger';
import Bot from '../Bot';

export default function sendPartnerMessage(
    steamID: string,
    msg: string,
    their: Their,
    links: Links,
    time: string,
    bot: Bot
): void {
    const opt = bot.options.discordWebhook;
    const botInfo = bot.handler.getBotInfo;

    const discordPartnerMsg: Webhook = {
        username: opt.displayName || botInfo.name,
        avatar_url: opt.avatarURL || botInfo.avatarURL,
        content: `${
            opt.messages.isMention && opt.ownerID.length > 0 ? opt.ownerID.map(id => `<@!${id}>`).join(', ') + `, ` : ''
        }new message! - ${steamID}`,
        embeds: [
            {
                author: {
                    name: their ? their.player_name : steamID,
                    url: links.steam,
                    icon_url: their
                        ? their.avatar_url_full
                        : 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/72/72f78b4c8cc1f62323f8a33f6d53e27db57c2252_full.jpg'
                },
                footer: {
                    text: `Partner SteamID: ${steamID} • ${time} • v${process.env.BOT_VERSION}`
                },
                title: '',
                description: `💬 ${msg}${their ? `\n\n${quickLinks(their.player_name, links)}` : ''}`,
                color: opt.embedColor
            }
        ]
    };

    sendWebhook(opt.messages.url, discordPartnerMsg, 'partner-message').catch(err =>
        log.warn(
            `❌ Failed to send partner-message webhook (from ${their ? their.player_name : steamID}) to Discord: `,
            err
        )
    );
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
