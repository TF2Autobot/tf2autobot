import { sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../logger';
import Bot from '../../classes/Bot';
import { timeNow } from '../tools/time';

export default function sendTf2DisplayNotification(bot: Bot, title: string, body: string): void {
    const opt = bot.options.discordWebhook;
    const botInfo = bot.handler.getBotInfo;

    const webhook: Webhook = {
        username: opt.displayName ? opt.displayName : botInfo.name,
        avatar_url: opt.avatarURL ? opt.avatarURL : botInfo.avatarURL,
        content: opt.sendTf2Events.displayNotification.custom.content || '',
        embeds: [
            {
                author: {
                    name: 'Team Fortress 2',
                    url: 'https://www.teamfortress.com/',
                    icon_url: 'https://wiki.teamfortress.com/w/images/4/41/Team_Fortress_2.png'
                },
                title: '__Display Notification__',
                description: `${title ? `**__${title}__**\n\n` : ''}${body}`,
                color: '12936960',
                footer: {
                    text: `${timeNow(bot.options).time}`
                }
            }
        ]
    };

    sendWebhook(opt.sendTf2Events.displayNotification.url, webhook, 'tf2-display-notification').catch(err => {
        log.warn(`❌ Failed to send TF2 Display Notification webhook to Discord: `, err);
    });
}
