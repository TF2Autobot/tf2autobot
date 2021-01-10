import { timeNow } from '../tools/time';
import { Webhook } from './interfaces';

import Bot from '../../classes/Bot';
import { sendWebhook } from './utils';

import log from '../logger';

export default function sendAlert(
    type: string,
    bot: Bot,
    msg: string | null = null,
    position: number | null = null,
    err: any | null = null,
    items: string[] | null = null
): void {
    let title: string;
    let description: string;
    let color: string;

    if (type === 'lowPure') {
        title = 'Low Pure Alert';
        description = msg;
        color = '16776960'; // yellow
    } else if (type === 'queue') {
        title = 'Queue Alert';
        description = `[Queue alert] Current position: ${position}, automatic restart initialized...`;
        color = '16711680'; // red
    } else if (type === 'failedPM2') {
        title = 'Automatic restart failed - no PM2';
        description = `❌ Automatic restart on queue problem failed because are not running the bot with PM2! Get a VPS and run your bot with PM2: https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS`;
        color = '16711680'; // red
    } else if (type === 'failedRestartError') {
        title = 'Automatic restart failed - Error';
        description = `❌ An error occurred while trying to restart: ${JSON.stringify(err)}`;
        color = '16711680'; // red
    } else if (type === 'full-backpack') {
        title = 'Full backpack error';
        description = msg;
        color = '16711680'; // red
    } else if (type === 'highValuedDisabled') {
        title = 'Temporarily disabled items with High value attachments';
        description = msg;
        color = '8323327'; // purple
    } else if (type === 'highValuedInvalidItems') {
        title = 'Received High-value invalid item(s)';
        description = msg;
        color = '8323327'; // purple
    } else {
        title = 'High Valued Items';
        description = `Someone is trying to take your **${items.join(', ')}** that is not in your pricelist.`;
        color = '8323327'; // purple
    }

    const botInfo = bot.handler.getBotInfo;
    const optDW = bot.options.discordWebhook;

    const sendAlertWebhook: Webhook = {
        username: optDW.displayName ? optDW.displayName : botInfo.name,
        avatar_url: optDW.avatarURL ? optDW.avatarURL : botInfo.avatarURL,
        content:
            type === 'highValue' ||
            type === 'highValuedDisabled' ||
            type === 'highValuedInvalidItems' ||
            type === 'failedRestartError'
                ? `<@!${optDW.ownerID}>`
                : '',
        embeds: [
            {
                title: title,
                description: description,
                color: color,
                footer: {
                    text: timeNow(bot).time
                }
            }
        ]
    };

    sendWebhook(optDW.sendAlert.url, sendAlertWebhook, 'alert')
        .then(() => {
            log.debug(`✅ Sent alert webhook (${type}) to Discord.`);
        })
        .catch(err => {
            log.debug(`❌ Failed to send alert webhook (${type}) to Discord: `, err);
        });
}
