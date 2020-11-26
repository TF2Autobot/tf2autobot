import timeNow from '../tools/time';
import { Webhook } from './interfaces';

import Bot from '../../classes/Bot';
import MyHandler from '../../classes/MyHandler/MyHandler';
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
    const time = timeNow(bot.options.timezone, bot.options.customTimeFormat, bot.options.timeAdditionalNotes);

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
    } else if (type === 'failedError') {
        title = 'Automatic restart failed - Error';
        description = `❌ An error occurred while trying to restart: ${err.message}`;
        color = '16711680'; // red
    } else if (type === 'full-backpack') {
        title = 'Full backpack error';
        description = msg;
        color = '16711680'; // red
    } else if (type === 'highValuedDisabled') {
        title = 'Temporarily disabled items with High value attachments';
        description = msg;
        color = '8323327'; // purple
    } else {
        title = 'High Valued Items';
        description = `Someone is trying to take your **${items.join(', ')}** that is not in your pricelist.`;
        color = '8323327'; // purple
    }

    const botInfo = (bot.handler as MyHandler).getBotInfo();

    /*eslint-disable */
    const sendAlertWebhook: Webhook = {
        username: bot.options.discordWebhook.displayName ? bot.options.discordWebhook.displayName : botInfo.name,
        avatar_url: bot.options.discordWebhook.avatarURL ? bot.options.discordWebhook.avatarURL : botInfo.avatarURL,
        content:
            type === 'highValue' || type === 'highValuedDisabled' ? `<@!${bot.options.discordWebhook.ownerID}>` : '',
        embeds: [
            {
                title: title,
                description: description,
                color: color,
                footer: {
                    text: time.time
                }
            }
        ]
    };
    /*eslint-enable */

    sendWebhook(bot.options.discordWebhook.sendAlert.url, sendAlertWebhook, 'alert')
        .then(() => {
            log.debug(`✅ Successfully sent alert webhook to Discord!`);
        })
        .catch(err => {
            log.debug(`❌ Failed to send alert webhook to Discord: `, err);
        });
}
