import { sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../../lib/logger';
import Bot from '../Bot';
import { timeNow } from '../../lib/tools/time';

export default function sendTf2ItemBroadcast(
    bot: Bot,
    message: string,
    username: string,
    wasDestruction: boolean,
    defindex: number
): void {
    const opt = bot.options.discordWebhook;
    const botInfo = bot.handler.getBotInfo;

    const webhook: Webhook = {
        username: opt.displayName || botInfo.name,
        avatar_url: opt.avatarURL || botInfo.avatarURL,
        content: opt.sendTf2Events.itemBroadcast.custom.content || '',
        embeds: [
            {
                author: {
                    name: 'Team Fortress 2',
                    url: 'https://www.teamfortress.com/',
                    icon_url: 'https://wiki.teamfortress.com/w/images/4/41/Team_Fortress_2.png'
                },
                title: '__Item Broadcast__',
                description: `\`\`\`${message}\`\`\``,
                fields: [
                    {
                        name: '__Raw data__',
                        value: `\`\`\`${JSON.stringify({ message, username, wasDestruction, defindex }, null, 2)}\`\`\``
                    }
                ],
                color: '12936960',
                footer: {
                    text: `${timeNow(bot.options).time}`
                }
            }
        ]
    };

    sendWebhook(opt.sendTf2Events.itemBroadcast.url, webhook, 'tf2-display-notification').catch(err => {
        log.warn(`❌ Failed to send TF2 Display Notification webhook to Discord: `, err);
    });
}
