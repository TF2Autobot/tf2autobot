import Bot from '../Bot';

import timeNow from '../../lib/tools/time';
import MyHandler from '../MyHandler';
import { XMLHttpRequest } from 'xmlhttprequest-ts';

export default function sendAlert(
    type: string,
    msg: string | null,
    position: number | null,
    err: any | null,
    items: string[] | null,
    bot: Bot
): void {
    const time = timeNow();

    let title;
    let description;
    let color;

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
    const webhook = JSON.stringify({
        username: process.env.DISCORD_WEBHOOK_USERNAME ? process.env.DISCORD_WEBHOOK_USERNAME : botInfo.name,
        avatar_url: process.env.DISCORD_WEBHOOK_AVATAR_URL
            ? process.env.DISCORD_WEBHOOK_AVATAR_URL
            : botInfo.avatarURL,
        content: type === 'highValue' || type === 'highValuedDisabled' ? `<@!${process.env.DISCORD_OWNER_ID}>` : '',
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
    });
    /*eslint-enable */

    const request = new XMLHttpRequest();
    request.open('POST', process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL);
    request.setRequestHeader('Content-type', 'application/json');
    request.send(webhook);
}
